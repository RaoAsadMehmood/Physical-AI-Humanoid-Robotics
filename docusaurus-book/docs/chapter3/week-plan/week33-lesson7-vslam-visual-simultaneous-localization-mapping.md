---
sidebar_position: 33
---

# VSLAM: Visual Simultaneous Localization and Mapping

## Learning Objectives

By the end of this lesson, you will be able to:
- Understand the fundamental concepts of Visual SLAM (VSLAM) for robotics applications
- Explain how VSLAM integrates with NVIDIA Isaac platform for Physical AI systems
- Implement basic VSLAM algorithms using Isaac ROS components
- Evaluate VSLAM performance in both simulation and real-world scenarios
- Configure VSLAM parameters for optimal performance on RTX and Jetson platforms

## Overview

Visual Simultaneous Localization and Mapping (VSLAM) is a critical capability for autonomous humanoid robots, enabling them to understand their environment and navigate effectively. In the NVIDIA Isaac ecosystem, VSLAM leverages GPU acceleration to process visual data in real-time, creating accurate maps while simultaneously determining the robot's position within those maps. This lesson explores the theoretical foundations and practical implementation of VSLAM in Physical AI applications.

## VSLAM Fundamentals

### Core Concepts

VSLAM combines two interdependent processes:
- **Localization**: Determining the robot's position and orientation in a known or unknown environment
- **Mapping**: Creating a representation of the environment based on sensor data

The "simultaneous" aspect means both processes occur concurrently, with mapping improvements enhancing localization accuracy and vice versa.

### VSLAM Approaches

#### 1. Feature-Based VSLAM
- **Detection**: Identifies distinctive visual features (corners, edges, textures)
- **Tracking**: Follows features across consecutive frames
- **Matching**: Associates features between different views
- **Optimization**: Minimizes errors through bundle adjustment

#### 2. Direct VSLAM
- **Dense Reconstruction**: Uses all available pixel information
- **Photometric Error**: Minimizes differences in image intensity
- **Semi-Direct Methods**: Combines feature and direct approaches

#### 3. Deep Learning-Based VSLAM
- **Feature Learning**: Neural networks learn optimal feature representations
- **End-to-End**: Direct mapping from images to poses/metrics
- **Uncertainty Estimation**: Quantifies confidence in estimates

## Isaac ROS VSLAM Components

### Isaac ROS Visual SLAM Package

The Isaac ROS Visual SLAM package provides GPU-accelerated VSLAM capabilities:

```python
#!/usr/bin/env python3

import rclpy
from rclpy.node import Node
from sensor_msgs.msg import Image, CameraInfo, Imu
from geometry_msgs.msg import PoseStamped, TransformStamped
from nav_msgs.msg import Odometry
from visualization_msgs.msg import MarkerArray
from tf2_ros import TransformBroadcaster
import numpy as np
import cv2
from cv_bridge import CvBridge
import message_filters
from tf2_ros import Buffer, TransformListener
import tf2_geometry_msgs
import tf_transformations
from std_msgs.msg import Header
import time

class IsaacVSLAMNode(Node):
    """
    NVIDIA Isaac Visual SLAM implementation for Physical AI applications
    """
    def __init__(self):
        super().__init__('isaac_vslam_node')

        # Initialize CV bridge for image processing
        self.cv_bridge = CvBridge()

        # TF broadcaster for pose publishing
        self.tf_broadcaster = TransformBroadcaster(self)
        self.tf_buffer = Buffer()
        self.tf_listener = TransformListener(self.tf_buffer, self)

        # Publishers
        self.pose_pub = self.create_publisher(PoseStamped, '/isaac/vslam/pose', 10)
        self.odom_pub = self.create_publisher(Odometry, '/isaac/vslam/odometry', 10)
        self.map_pub = self.create_publisher(MarkerArray, '/isaac/vslam/map', 10)

        # Synchronized subscribers for stereo cameras and IMU
        self.left_image_sub = message_filters.Subscriber(self, Image, '/camera/left/image_rect')
        self.right_image_sub = message_filters.Subscriber(self, Image, '/camera/right/image_rect')
        self.left_info_sub = message_filters.Subscriber(self, CameraInfo, '/camera/left/camera_info')
        self.right_info_sub = message_filters.Subscriber(self, CameraInfo, '/camera/right/camera_info')
        self.imu_sub = message_filters.Subscriber(self, Imu, '/imu/data')

        # Synchronize topics with appropriate queue sizes
        self.sync = message_filters.ApproximateTimeSynchronizer(
            [self.left_image_sub, self.right_image_sub, self.left_info_sub, self.right_info_sub, self.imu_sub],
            queue_size=10,
            slop=0.1
        )
        self.sync.registerCallback(self.vslam_callback)

        # VSLAM state variables
        self.previous_frame = None
        self.current_pose = np.eye(4)  # 4x4 transformation matrix
        self.keyframes = []
        self.map_points = []
        self.vslam_initialized = False

        # Isaac VSLAM parameters
        self.vslam_params = {
            'max_features': 2000,
            'feature_quality': 0.01,
            'matching_threshold': 0.8,
            'reprojection_threshold': 3.0,
            'min_keyframe_distance': 0.5,
            'max_map_points': 5000,
            'gpu_acceleration': True
        }

        # GPU monitoring for Isaac optimization
        self.gpu_monitor_timer = self.create_timer(1.0, self.monitor_gpu_usage)

        self.get_logger().info('Isaac VSLAM Node initialized')

    def vslam_callback(self, left_image, right_image, left_info, right_info, imu_data):
        """
        Process synchronized camera and IMU data for VSLAM
        """
        try:
            # Convert ROS images to OpenCV format
            left_cv = self.cv_bridge.imgmsg_to_cv2(left_image, "bgr8")
            right_cv = self.cv_bridge.imgmsg_to_cv2(right_image, "bgr8")

            # Initialize VSLAM if this is the first frame
            if not self.vslam_initialized:
                self.initialize_vslam(left_cv, right_cv, left_info, right_info)
                return

            # Perform stereo processing for depth estimation
            depth_map = self.compute_stereo_depth(left_cv, right_cv)

            # Extract and track visual features
            current_features = self.extract_features(left_cv)

            # Match features with previous frame
            if self.previous_frame is not None:
                matches = self.match_features(self.previous_features, current_features)

                # Estimate motion using essential matrix
                motion_estimate = self.estimate_motion(matches, self.previous_features, current_features)

                # Update pose with IMU data fusion
                updated_pose = self.fuse_imu_data(motion_estimate, imu_data)

                # Update global pose
                self.current_pose = np.dot(self.current_pose, updated_pose)

                # Add keyframe if sufficient motion detected
                if self.should_add_keyframe():
                    self.add_keyframe(left_cv, self.current_pose)

            # Update previous frame data
            self.previous_frame = left_cv.copy()
            self.previous_features = current_features.copy()

            # Publish current pose and odometry
            self.publish_pose(left_image.header)
            self.publish_odometry(left_image.header)

        except Exception as e:
            self.get_logger().error(f'Error in VSLAM processing: {e}')

    def initialize_vslam(self, left_image, right_image, left_info, right_info):
        """
        Initialize VSLAM with first stereo pair
        """
        # Initialize stereo rectification parameters
        self.stereo_params = {
            'left_info': left_info,
            'right_info': right_info,
            'baseline': 0.1,  # Typical stereo baseline in meters
            'focal_length': left_info.K[0]  # Focal length from camera matrix
        }

        # Extract initial features
        self.initial_features = self.extract_features(left_image)
        self.previous_frame = left_image.copy()
        self.previous_features = self.initial_features.copy()

        # Initialize map
        self.map_points = []
        self.keyframes = []

        self.vslam_initialized = True
        self.get_logger().info('VSLAM initialized successfully')

    def extract_features(self, image):
        """
        Extract visual features using GPU-accelerated methods
        """
        # Use ORB features as a baseline (Isaac provides GPU-accelerated alternatives)
        orb = cv2.ORB_create(nfeatures=self.vslam_params['max_features'])
        keypoints, descriptors = orb.detectAndCompute(image, None)

        # Convert to Isaac-compatible format
        features = []
        for kp, desc in zip(keypoints, descriptors):
            feature = {
                'point': np.array([kp.pt[0], kp.pt[1]]),
                'descriptor': desc,
                'response': kp.response,
                'octave': kp.octave
            }
            features.append(feature)

        return np.array(features, dtype=object)

    def match_features(self, prev_features, curr_features):
        """
        Match features between previous and current frames
        """
        if len(prev_features) == 0 or len(curr_features) == 0:
            return []

        # Use FLANN matcher for efficient feature matching
        matcher = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=False)

        # Extract descriptors
        prev_descriptors = np.array([f['descriptor'] for f in prev_features])
        curr_descriptors = np.array([f['descriptor'] for f in curr_features])

        matches = matcher.knnMatch(prev_descriptors, curr_descriptors, k=2)

        # Apply Lowe's ratio test for robust matching
        good_matches = []
        for match_pair in matches:
            if len(match_pair) == 2:
                m, n = match_pair
                if m.distance < self.vslam_params['matching_threshold'] * n.distance:
                    good_matches.append(m)

        return good_matches

    def estimate_motion(self, matches, prev_features, curr_features):
        """
        Estimate camera motion using matched features
        """
        if len(matches) < 8:  # Minimum for essential matrix estimation
            return np.eye(4)

        # Extract matched points
        prev_points = np.float32([prev_features[m.queryIdx]['point'] for m in matches])
        curr_points = np.float32([curr_features[m.trainIdx]['point'] for m in matches])

        # Estimate essential matrix
        E, mask = cv2.findEssentialMat(
            prev_points,
            curr_points,
            cameraMatrix=np.array([
                [self.stereo_params['focal_length'], 0, self.stereo_params['left_info'].K[2]],
                [0, self.stereo_params['focal_length'], self.stereo_params['left_info'].K[5]],
                [0, 0, 1]
            ]),
            method=cv2.RANSAC,
            threshold=self.vslam_params['reprojection_threshold'],
            prob=0.999
        )

        # Recover relative pose
        if E is not None:
            _, R, t, _ = cv2.recoverPose(E, prev_points, curr_points)

            # Create transformation matrix
            transform = np.eye(4)
            transform[:3, :3] = R
            transform[:3, 3] = t.flatten()

            return transform
        else:
            return np.eye(4)

    def fuse_imu_data(self, motion_estimate, imu_data):
        """
        Fuse visual motion estimate with IMU data
        """
        # Extract IMU orientation
        imu_quat = [imu_data.orientation.x, imu_data.orientation.y,
                   imu_data.orientation.z, imu_data.orientation.w]
        imu_euler = tf_transformations.euler_from_quaternion(imu_quat)

        # Weighted fusion of visual and IMU data
        visual_weight = 0.7
        imu_weight = 0.3

        # Apply IMU correction to visual estimate
        fused_transform = motion_estimate.copy()

        # Adjust rotation based on IMU data
        imu_rotation = tf_transformations.quaternion_matrix(imu_quat)
        fused_transform[:3, :3] = (
            visual_weight * motion_estimate[:3, :3] +
            imu_weight * imu_rotation[:3, :3]
        )

        return fused_transform

    def should_add_keyframe(self):
        """
        Determine if current frame should be added as a keyframe
        """
        if len(self.keyframes) == 0:
            return True

        # Check if sufficient motion has occurred
        latest_keyframe_pose = self.keyframes[-1]['pose']
        motion_distance = np.linalg.norm(
            self.current_pose[:3, 3] - latest_keyframe_pose[:3, 3]
        )

        return motion_distance > self.vslam_params['min_keyframe_distance']

    def add_keyframe(self, image, pose):
        """
        Add current frame as a keyframe to the map
        """
        keyframe = {
            'image': image.copy(),
            'pose': pose.copy(),
            'timestamp': time.time(),
            'features': self.extract_features(image)
        }
        self.keyframes.append(keyframe)

        # Limit number of keyframes to manage memory
        if len(self.keyframes) > 100:  # Maximum 100 keyframes
            self.keyframes = self.keyframes[-50:]  # Keep the most recent 50

    def compute_stereo_depth(self, left_image, right_image):
        """
        Compute depth map using stereo vision
        """
        # Create stereo matcher (GPU-accelerated in Isaac)
        stereo = cv2.StereoBM_create(numDisparities=16, blockSize=15)

        # Convert to grayscale
        left_gray = cv2.cvtColor(left_image, cv2.COLOR_BGR2GRAY)
        right_gray = cv2.cvtColor(right_image, cv2.COLOR_BGR2GRAY)

        # Compute disparity map
        disparity = stereo.compute(left_gray, right_gray).astype(np.float32) / 16.0

        # Convert disparity to depth using camera parameters
        baseline = self.stereo_params['baseline']
        focal_length = self.stereo_params['focal_length']

        # Avoid division by zero
        depth_map = np.zeros_like(disparity)
        valid_mask = disparity > 0
        depth_map[valid_mask] = (baseline * focal_length) / disparity[valid_mask]

        return depth_map

    def publish_pose(self, header):
        """
        Publish current estimated pose
        """
        pose_msg = PoseStamped()
        pose_msg.header = header
        pose_msg.header.frame_id = "map"

        # Extract position and orientation from transformation matrix
        position = self.current_pose[:3, 3]
        rotation_matrix = self.current_pose[:3, :3]
        quaternion = tf_transformations.quaternion_from_matrix(self.current_pose)

        pose_msg.pose.position.x = position[0]
        pose_msg.pose.position.y = position[1]
        pose_msg.pose.position.z = position[2]

        pose_msg.pose.orientation.x = quaternion[0]
        pose_msg.pose.orientation.y = quaternion[1]
        pose_msg.pose.orientation.z = quaternion[2]
        pose_msg.pose.orientation.w = quaternion[3]

        self.pose_pub.publish(pose_msg)

        # Broadcast transform
        t = TransformStamped()
        t.header.stamp = self.get_clock().now().to_msg()
        t.header.frame_id = "map"
        t.child_frame_id = "vslam_frame"

        t.transform.translation.x = position[0]
        t.transform.translation.y = position[1]
        t.transform.translation.z = position[2]

        t.transform.rotation.x = quaternion[0]
        t.transform.rotation.y = quaternion[1]
        t.transform.rotation.z = quaternion[2]
        t.transform.rotation.w = quaternion[3]

        self.tf_broadcaster.sendTransform(t)

    def publish_odometry(self, header):
        """
        Publish odometry information
        """
        odom_msg = Odometry()
        odom_msg.header = header
        odom_msg.header.frame_id = "map"
        odom_msg.child_frame_id = "base_link"

        # Position
        position = self.current_pose[:3, 3]
        odom_msg.pose.pose.position.x = position[0]
        odom_msg.pose.pose.position.y = position[1]
        odom_msg.pose.pose.position.z = position[2]

        # Orientation
        quaternion = tf_transformations.quaternion_from_matrix(self.current_pose)
        odom_msg.pose.pose.orientation.x = quaternion[0]
        odom_msg.pose.pose.orientation.y = quaternion[1]
        odom_msg.pose.pose.orientation.z = quaternion[2]
        odom_msg.pose.pose.orientation.w = quaternion[3]

        # Velocity (approximate from pose differences)
        # In a real implementation, this would use more sophisticated velocity estimation
        odom_msg.twist.twist.linear.x = 0.0  # Placeholder
        odom_msg.twist.twist.linear.y = 0.0
        odom_msg.twist.twist.linear.z = 0.0
        odom_msg.twist.twist.angular.x = 0.0
        odom_msg.twist.twist.angular.y = 0.0
        odom_msg.twist.twist.angular.z = 0.0

        self.odom_pub.publish(odom_msg)

    def monitor_gpu_usage(self):
        """
        Monitor GPU usage for Isaac optimization
        """
        # In a real Isaac implementation, this would interface with GPU monitoring tools
        # For simulation, we'll log placeholder values
        self.get_logger().debug(f'VSLAM GPU usage: Processing stereo images and features')


class IsaacVSLAMMapper(Node):
    """
    Map management component for Isaac VSLAM system
    """
    def __init__(self):
        super().__init__('isaac_vslam_mapper')

        # Publisher for map visualization
        self.map_marker_pub = self.create_publisher(MarkerArray, '/isaac/vslam/map_markers', 10)

        # Subscriber for pose updates
        self.pose_sub = self.create_subscription(
            PoseStamped, '/isaac/vslam/pose', self.pose_callback, 10)

        # Map data
        self.map_points = []
        self.map_keyframes = []

        # Map update timer
        self.map_update_timer = self.create_timer(0.5, self.update_map_visualization)

        self.get_logger().info('Isaac VSLAM Mapper initialized')

    def pose_callback(self, pose_msg):
        """
        Process pose updates for map building
        """
        # In a real implementation, this would update the map based on pose and sensor data
        # For this example, we'll just log the pose update
        self.get_logger().debug(
            f'Pose update received: ({pose_msg.pose.position.x:.2f}, '
            f'{pose_msg.pose.position.y:.2f}, {pose_msg.pose.position.z:.2f})'
        )

    def update_map_visualization(self):
        """
        Update map visualization markers
        """
        # Create marker array for map visualization
        marker_array = MarkerArray()

        # Add keyframe markers
        for i, keyframe in enumerate(self.map_keyframes):
            marker = Marker()
            marker.header.frame_id = "map"
            marker.header.stamp = self.get_clock().now().to_msg()
            marker.ns = "keyframes"
            marker.id = i
            marker.type = Marker.SPHERE
            marker.action = Marker.ADD

            marker.pose.position.x = keyframe['pose'][0, 3]
            marker.pose.position.y = keyframe['pose'][1, 3]
            marker.pose.position.z = keyframe['pose'][2, 3]

            marker.pose.orientation.w = 1.0
            marker.scale.x = 0.1
            marker.scale.y = 0.1
            marker.scale.z = 0.1
            marker.color.r = 1.0
            marker.color.a = 1.0

            marker_array.markers.append(marker)

        self.map_marker_pub.publish(marker_array)


def main(args=None):
    rclpy.init(args=args)

    # Create VSLAM nodes
    vslam_node = IsaacVSLAMNode()
    mapper_node = IsaacVSLAMMapper()

    # Create executor
    executor = rclpy.executors.MultiThreadedExecutor()
    executor.add_node(vslam_node)
    executor.add_node(mapper_node)

    try:
        executor.spin()
    except KeyboardInterrupt:
        pass
    finally:
        vslam_node.destroy_node()
        mapper_node.destroy_node()
        executor.shutdown()
        rclpy.shutdown()


if __name__ == '__main__':
    main()
```

## Isaac VSLAM Configuration and Optimization

### GPU Acceleration Setup

For optimal VSLAM performance on Isaac platforms:

```bash
# 1. Configure CUDA for VSLAM
export CUDA_VISIBLE_DEVICES=0
export CUDA_DEVICE_ORDER=PCI_BUS_ID

# 2. Isaac-specific VSLAM parameters
export ISAAC_VSLAM_FEATURE_DETECTOR=GPU_ORB
export ISAAC_VSLAM_MATCHER_TYPE=GPU_BF
export ISAAC_VSLAM_DEPTH_ESTIMATOR=STEREO_CENSUS

# 3. Performance optimization
export ISAAC_VSLAM_MAX_FEATURES=3000
export ISAAC_VSLAM_PYRAMID_LEVELS=4
export ISAAC_VSLAM_PROCESSING_RATE=30  # Hz
```

### RTX Workstation Optimization

For RTX Workstations, optimize VSLAM performance:

```yaml
# config/vslam_optimization.yaml
vslam_config:
  gpu_settings:
    use_tensor_cores: true
    memory_pool_size: 2048  # MB
    processing_precision: float16

  feature_detection:
    max_features: 5000
    quality_level: 0.005
    min_distance: 10
    block_size: 15

  stereo_processing:
    num_disparities: 128
    window_size: 21
    uniqueness_ratio: 15
    speckle_window_size: 200
    speckle_range: 2

  tracking:
    max_level: 3  # Pyramid levels
    criteria_eps: 0.001
    criteria_max_count: 30

  optimization:
    bundle_adjustment_iterations: 10
    keyframe_selection_threshold: 0.1
    map_point_triangulation_threshold: 10
```

## Hardware Context

### RTX Workstation Configuration for VSLAM

For optimal VSLAM performance on RTX Workstations:

- **GPU**: RTX 4090 or A6000 for maximum feature processing and stereo depth computation
- **Memory**: 32GB+ system RAM to handle large map data structures
- **Storage**: NVMe SSD for fast map loading and saving operations
- **Thermal**: Adequate cooling for sustained GPU-intensive VSLAM operations
- **Power**: 850W+ PSU for high-end GPU operation during intensive processing

### Jetson Orin Kit Considerations

For VSLAM deployment on Jetson Orin:

- **Compute Optimization**: Use TensorRT optimization for VSLAM algorithms
- **Memory Management**: Implement efficient memory pooling to avoid allocation overhead
- **Power Constraints**: Configure VSLAM to operate within Jetson's power limits
- **Thermal Management**: Monitor temperatures and adjust processing rates accordingly
- **Edge Deployment**: Optimize for autonomous operation with limited connectivity

## Implementation Exercise

1. Create VSLAM configuration package:
   ```bash
   cd ~/ros2_ws/src
   ros2 pkg create --dependencies rclpy sensor_msgs geometry_msgs visualization_msgs tf2_ros -- python isaac_vslam_examples
   ```

2. Create the VSLAM launch file:
   ```python
   # Save as ~/ros2_ws/src/isaac_vslam_examples/launch/vslam_isaac.launch.py
   from launch import LaunchDescription
   from launch.actions import DeclareLaunchArgument, SetEnvironmentVariable
   from launch.substitutions import LaunchConfiguration
   from launch_ros.actions import Node
   import os

   def generate_launch_description():
       # Declare launch arguments
       config_file = DeclareLaunchArgument(
           'config_file',
           default_value=os.path.join(
               os.path.dirname(__file__),
               '..', 'config', 'vslam_config.yaml'
           ),
           description='Path to VSLAM configuration file'
       )

       processing_rate = DeclareLaunchArgument(
           'processing_rate',
           default_value='30',
           description='VSLAM processing rate in Hz'
       )

       # Set Isaac VSLAM environment variables
       SetEnvironmentVariable(
           name='ISAAC_VSLAM_FEATURE_DETECTOR',
           value='GPU_ORB'
       )

       # Isaac VSLAM node
       vslam_node = Node(
           package='isaac_vslam_examples',
           executable='isaac_vslam_node',
           name='isaac_vslam',
           parameters=[
               LaunchConfiguration('config_file'),
               {
                   'processing_rate': LaunchConfiguration('processing_rate'),
                   'max_features': 3000,
                   'gpu_acceleration': True
               }
           ],
           remappings=[
               ('/camera/left/image_rect', '/zed/left/image_rect_color'),
               ('/camera/right/image_rect', '/zed/right/image_rect_color'),
               ('/imu/data', '/zed/imu/data')
           ],
           output='screen'
       )

       # VSLAM mapper node
       mapper_node = Node(
           package='isaac_vslam_examples',
           executable='isaac_vslam_mapper',
           name='isaac_vslam_mapper',
           parameters=[LaunchConfiguration('config_file')],
           output='screen'
       )

       # Map server for persistent map storage
       map_server = Node(
           package='nav2_map_server',
           executable='map_server',
           name='vslam_map_server',
           parameters=[
               {
                   'yaml_filename': os.path.join(
                       os.path.dirname(__file__),
                       '..', 'maps', 'vslam_map.yaml'
                   )
               }
           ]
       )

       return LaunchDescription([
           config_file,
           processing_rate,
           vslam_node,
           mapper_node,
           map_server
       ])
   ```

3. Create VSLAM evaluation script:
   ```python
   # Save as ~/ros2_ws/src/isaac_vslam_examples/scripts/evaluate_vslam.py
   #!/usr/bin/env python3

   import rclpy
   from rclpy.node import Node
   from geometry_msgs.msg import PoseStamped
   from nav_msgs.msg import Odometry
   import numpy as np
   import matplotlib.pyplot as plt
   from scipy.spatial.transform import Rotation as R
   import time

   class VSLAMEvaluator(Node):
       """
       Evaluate VSLAM performance metrics
       """
       def __init__(self):
           super().__init__('vslam_evaluator')

           # Subscribers for pose and ground truth
           self.vslam_pose_sub = self.create_subscription(
               PoseStamped, '/isaac/vslam/pose', self.vslam_pose_callback, 10)
           self.ground_truth_sub = self.create_subscription(
               Odometry, '/ground_truth/odometry', self.ground_truth_callback, 10)

           # Storage for trajectory evaluation
           self.vslam_trajectory = []
           self.ground_truth_trajectory = []
           self.timestamps = []

           # Evaluation metrics
           self.position_errors = []
           self.orientation_errors = []

           # Evaluation timer
           self.eval_timer = self.create_timer(1.0, self.evaluate_performance)

           self.get_logger().info('VSLAM Evaluator initialized')

       def vslam_pose_callback(self, msg):
           """
           Store VSLAM estimated pose
           """
           pose = np.array([
               msg.pose.position.x,
               msg.pose.position.y,
               msg.pose.position.z
           ])
           self.vslam_trajectory.append(pose)
           self.timestamps.append(msg.header.stamp.sec + msg.header.stamp.nanosec * 1e-9)

       def ground_truth_callback(self, msg):
           """
           Store ground truth pose
           """
           pose = np.array([
               msg.pose.pose.position.x,
               msg.pose.pose.position.y,
               msg.pose.pose.position.z
           ])
           self.ground_truth_trajectory.append(pose)

       def evaluate_performance(self):
           """
           Calculate VSLAM performance metrics
           """
           if len(self.vslam_trajectory) < 2 or len(self.ground_truth_trajectory) < 2:
               return

           # Calculate trajectory alignment
           min_len = min(len(self.vslam_trajectory), len(self.ground_truth_trajectory))

           # Calculate position errors
           position_errors = []
           for i in range(min_len):
               vslam_pos = self.vslam_trajectory[i]
               gt_pos = self.ground_truth_trajectory[i]
               error = np.linalg.norm(vslam_pos - gt_pos)
               position_errors.append(error)

           # Calculate average error
           avg_position_error = np.mean(position_errors) if position_errors else 0
           max_position_error = np.max(position_errors) if position_errors else 0

           # Calculate trajectory length
           total_vslam_distance = sum(
               np.linalg.norm(self.vslam_trajectory[i+1] - self.vslam_trajectory[i])
               for i in range(len(self.vslam_trajectory)-1)
           )

           total_gt_distance = sum(
               np.linalg.norm(self.ground_truth_trajectory[i+1] - self.ground_truth_trajectory[i])
               for i in range(len(self.ground_truth_trajectory)-1)
           )

           # Log evaluation results
           self.get_logger().info(
               f'VSLAM Evaluation - Avg Error: {avg_position_error:.3f}m, '
               f'Max Error: {max_position_error:.3f}m, '
               f'Trajectory Accuracy: {abs(total_vslam_distance - total_gt_distance):.3f}m'
           )

       def plot_results(self):
           """
           Plot VSLAM evaluation results
           """
           if len(self.vslam_trajectory) < 2 or len(self.ground_truth_trajectory) < 2:
               self.get_logger().warn('Insufficient trajectory data for plotting')
               return

           min_len = min(len(self.vslam_trajectory), len(self.ground_truth_trajectory))

           # Extract x, y coordinates
           vslam_x = [p[0] for p in self.vslam_trajectory[:min_len]]
           vslam_y = [p[1] for p in self.vslam_trajectory[:min_len]]
           gt_x = [p[0] for p in self.ground_truth_trajectory[:min_len]]
           gt_y = [p[1] for p in self.ground_truth_trajectory[:min_len]]

           # Create plot
           plt.figure(figsize=(12, 5))

           plt.subplot(1, 2, 1)
           plt.plot(gt_x, gt_y, 'g-', label='Ground Truth', linewidth=2)
           plt.plot(vslam_x, vslam_y, 'r-', label='VSLAM Estimate', linewidth=2)
           plt.xlabel('X (m)')
           plt.ylabel('Y (m)')
           plt.title('VSLAM Trajectory vs Ground Truth')
           plt.legend()
           plt.grid(True)

           plt.subplot(1, 2, 2)
           position_errors = []
           for i in range(min_len):
               error = np.linalg.norm(
                   np.array([vslam_x[i], vslam_y[i]]) -
                   np.array([gt_x[i], gt_y[i]])
               )
               position_errors.append(error)

           plt.plot(position_errors, 'b-', linewidth=1)
           plt.xlabel('Pose Index')
           plt.ylabel('Position Error (m)')
           plt.title('VSLAM Position Error Over Time')
           plt.grid(True)

           plt.tight_layout()
           plt.savefig('/tmp/vslam_evaluation.png')
           self.get_logger().info('VSLAM evaluation plot saved to /tmp/vslam_evaluation.png')

   def main():
       rclpy.init()

       evaluator = VSLAMEvaluator()

       try:
           rclpy.spin(evaluator)
       except KeyboardInterrupt:
           evaluator.plot_results()
       finally:
           evaluator.destroy_node()
           rclpy.shutdown()

   if __name__ == '__main__':
       main()
   ```

4. Make the script executable and test:
   ```bash
   chmod +x ~/ros2_ws/src/isaac_vslam_examples/scripts/evaluate_vslam.py

   cd ~/ros2_ws
   colcon build --packages-select isaac_vslam_examples
   source install/setup.bash

   # Run evaluation (with simulated ground truth)
   ros2 run isaac_vslam_examples evaluate_vslam.py
   ```

## Troubleshooting

- **Feature Loss**: Increase feature detection parameters or improve lighting conditions
- **Drift**: Implement loop closure detection and pose graph optimization
- **GPU Memory**: Reduce feature count or implement memory pooling
- **Real-time Performance**: Adjust processing rate based on available compute

## Summary

This lesson introduced Visual SLAM concepts within the NVIDIA Isaac framework, demonstrating how to implement GPU-accelerated VSLAM for Physical AI applications. The integration of stereo vision, IMU data fusion, and GPU acceleration enables robust localization and mapping for humanoid robots.

## Next Steps

In the next lesson, we'll explore GPU optimization techniques for Isaac-based robotics applications, focusing on performance optimization for real-time operation.