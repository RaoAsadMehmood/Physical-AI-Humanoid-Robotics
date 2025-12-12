---
sidebar_position: 35
---

# Isaac Navigation (Nav2) Integration

## Learning Objectives

By the end of this lesson, you will be able to:
- Integrate NVIDIA Isaac with ROS 2 Navigation Stack (Nav2) for humanoid robotics
- Configure GPU-accelerated path planning and obstacle avoidance algorithms
- Implement perception-driven navigation using Isaac ROS components
- Optimize navigation performance for real-time humanoid robot operation
- Deploy navigation systems on both RTX Workstations and Jetson Orin platforms

## Overview

Navigation is a critical capability for autonomous humanoid robots, enabling them to move safely and efficiently through complex environments. The integration of NVIDIA Isaac with ROS 2 Navigation (Nav2) provides GPU-accelerated path planning, obstacle detection, and motion control. This lesson explores the architecture, configuration, and implementation of Isaac-enhanced navigation systems for Physical AI applications.

## Isaac-Nav2 Architecture

### Core Navigation Components

The Isaac-Nav2 integration includes several key components:

#### 1. Perception Pipeline
- **Sensor Processing**: GPU-accelerated processing of LIDAR, camera, and depth data
- **Obstacle Detection**: Real-time detection and classification of environmental obstacles
- **Map Building**: Dynamic map updates based on sensor data

#### 2. Global Planner
- **Path Planning**: GPU-accelerated A* and Dijkstra algorithms
- **Trajectory Optimization**: Real-time path optimization using CUDA kernels
- **Multi-goal Navigation**: Sequential and parallel goal planning

#### 3. Local Planner
- **Obstacle Avoidance**: Dynamic obstacle avoidance using Isaac-accelerated algorithms
- **Trajectory Execution**: Real-time path following with collision avoidance
- **Recovery Behaviors**: GPU-accelerated recovery from navigation failures

### Isaac-Nav2 Data Flow

```python
#!/usr/bin/env python3

import rclpy
from rclpy.node import Node
from sensor_msgs.msg import LaserScan, Image, PointCloud2
from nav_msgs.msg import Odometry, OccupancyGrid, Path
from geometry_msgs.msg import PoseStamped, Twist
from std_msgs.msg import Float32
import numpy as np
import cv2
from cv_bridge import CvBridge
import tf2_ros
from tf2_ros import TransformException
from geometry_msgs.msg import TransformStamped
import time

class IsaacNavigationManager(Node):
    """
    NVIDIA Isaac-enhanced Navigation Manager for Physical AI applications
    """
    def __init__(self):
        super().__init__('isaac_navigation_manager')

        # Initialize CV bridge
        self.cv_bridge = CvBridge()

        # TF buffer and listener for coordinate transforms
        self.tf_buffer = tf2_ros.Buffer()
        self.tf_listener = tf2_ros.TransformListener(self.tf_buffer, self)

        # Publishers for navigation components
        self.cmd_vel_pub = self.create_publisher(Twist, '/cmd_vel', 10)
        self.global_path_pub = self.create_publisher(Path, '/isaac/global_plan', 10)
        self.local_path_pub = self.create_publisher(Path, '/isaac/local_plan', 10)
        self.obstacle_map_pub = self.create_publisher(OccupancyGrid, '/isaac/obstacle_map', 10)

        # Subscribers for sensor data
        self.laser_sub = self.create_subscription(
            LaserScan, '/scan', self.laser_callback, 10)
        self.odom_sub = self.create_subscription(
            Odometry, '/odom', self.odom_callback, 10)
        self.goal_sub = self.create_subscription(
            PoseStamped, '/move_base_simple/goal', self.goal_callback, 10)

        # Isaac-Nav2 state variables
        self.current_pose = None
        self.current_velocity = None
        self.laser_data = None
        self.goal_pose = None
        self.global_path = None
        self.local_path = None
        self.obstacle_map = None

        # Navigation parameters
        self.nav_params = {
            'planner_frequency': 5.0,  # Hz
            'controller_frequency': 20.0,  # Hz
            'max_linear_speed': 1.0,  # m/s
            'max_angular_speed': 1.5,  # rad/s
            'min_obstacle_distance': 0.5,  # meters
            'inflation_radius': 0.3,  # meters
            'gpu_acceleration': True
        }

        # Isaac-specific navigation parameters
        self.isaac_nav_params = {
            'gpu_path_planning': True,
            'cuda_streams': 2,
            'tensorrt_obstacle_detection': True,
            'prediction_horizon': 3.0  # seconds
        }

        # Navigation timers
        self.planner_timer = self.create_timer(
            1.0/self.nav_params['planner_frequency'], self.plan_path)
        self.controller_timer = self.create_timer(
            1.0/self.nav_params['controller_frequency'], self.execute_path)

        # Isaac GPU acceleration initialization
        self.initialize_gpu_acceleration()

        self.get_logger().info('Isaac Navigation Manager initialized')

    def initialize_gpu_acceleration(self):
        """
        Initialize GPU acceleration for navigation algorithms
        """
        try:
            # Import CUDA components if available
            import pycuda.driver as cuda
            import pycuda.autoinit
            from pycuda.compiler import SourceModule

            # Initialize CUDA context
            cuda.init()
            device_count = cuda.Device.count()

            self.get_logger().info(f'Initialized CUDA with {device_count} device(s)')

            # Create CUDA streams for navigation operations
            self.cuda_streams = []
            for i in range(self.isaac_nav_params['cuda_streams']):
                stream = cuda.Stream()
                self.cuda_streams.append(stream)

            # Initialize GPU-accelerated path planning kernels
            self.initialize_path_planning_kernels()

            self.get_logger().info('GPU acceleration initialized successfully')
        except ImportError:
            self.get_logger().warn('CUDA not available, using CPU navigation')
            self.nav_params['gpu_acceleration'] = False
        except Exception as e:
            self.get_logger().error(f'GPU acceleration initialization failed: {e}')
            self.nav_params['gpu_acceleration'] = False

    def initialize_path_planning_kernels(self):
        """
        Initialize CUDA kernels for path planning
        """
        # Define CUDA kernel for path planning (simplified example)
        path_planning_kernel = """
        __global__ void compute_path_kernel(
            float* cost_map,
            int width,
            int height,
            float start_x,
            float start_y,
            float goal_x,
            float goal_y,
            float* path_x,
            float* path_y,
            int* path_length
        ) {
            // Simplified path planning kernel
            // In a real implementation, this would implement A* or other path planning algorithms
            int idx = blockIdx.x * blockDim.x + threadIdx.x;

            if (idx == 0) {
                // Set start position
                path_x[0] = start_x;
                path_y[0] = start_y;
                *path_length = 1;
            }
        }
        """

        try:
            # Compile and load the kernel
            mod = SourceModule(path_planning_kernel)
            self.path_planning_func = mod.get_function("compute_path_kernel")
            self.get_logger().info('Path planning kernel loaded')
        except Exception as e:
            self.get_logger().warn(f'Could not load path planning kernel: {e}')

    def laser_callback(self, msg):
        """
        Process laser scan data for obstacle detection
        """
        self.laser_data = msg
        self.process_obstacles_with_isaac()

    def odom_callback(self, msg):
        """
        Process odometry data for current pose estimation
        """
        self.current_pose = msg.pose.pose
        self.current_velocity = msg.twist.twist

    def goal_callback(self, msg):
        """
        Process navigation goal
        """
        self.goal_pose = msg.pose
        self.get_logger().info(f'New navigation goal received: ({msg.pose.position.x:.2f}, {msg.pose.position.y:.2f})')

    def process_obstacles_with_isaac(self):
        """
        Process obstacles using Isaac-accelerated methods
        """
        if self.laser_data is None:
            return

        # Convert laser data to obstacle map using Isaac methods
        ranges = np.array(self.laser_data.ranges)
        angles = np.linspace(
            self.laser_data.angle_min,
            self.laser_data.angle_max,
            len(ranges)
        )

        # Filter out invalid ranges
        valid_mask = (ranges > self.laser_data.range_min) & (ranges < self.laser_data.range_max)
        valid_ranges = ranges[valid_mask]
        valid_angles = angles[valid_mask]

        # Convert to Cartesian coordinates
        x_coords = valid_ranges * np.cos(valid_angles)
        y_coords = valid_ranges * np.sin(valid_angles)

        # Create obstacle points array
        obstacle_points = np.column_stack((x_coords, y_coords))

        # Use Isaac's GPU-accelerated obstacle processing
        processed_obstacles = self.isaac_obstacle_processing(obstacle_points)

        # Update obstacle map
        self.update_obstacle_map(processed_obstacles)

    def isaac_obstacle_processing(self, obstacle_points):
        """
        Process obstacles using Isaac's GPU-accelerated methods
        """
        if not self.nav_params['gpu_acceleration'] or len(obstacle_points) == 0:
            return obstacle_points

        try:
            # Simulate GPU-accelerated obstacle processing
            # In a real Isaac implementation, this would use CUDA kernels
            processed_points = obstacle_points.copy()

            # Apply Isaac-specific obstacle classification and filtering
            # This could include:
            # - Dynamic obstacle tracking
            # - Obstacle classification (static/dynamic)
            # - Noise filtering
            # - Multi-sensor fusion

            # Example: Apply Gaussian filter for noise reduction
            if len(processed_points) > 10:
                # Apply simple smoothing (GPU-accelerated in real implementation)
                processed_points = self.apply_gpu_smoothing(processed_points)

            return processed_points

        except Exception as e:
            self.get_logger().warn(f'GPU obstacle processing failed, using CPU: {e}')
            return obstacle_points

    def apply_gpu_smoothing(self, points):
        """
        Apply GPU-accelerated smoothing to obstacle points
        """
        # In a real implementation, this would use CUDA kernels
        # For simulation, we'll apply simple smoothing
        if len(points) < 3:
            return points

        # Apply moving average smoothing
        smoothed_points = np.zeros_like(points)
        for i in range(len(points)):
            start_idx = max(0, i - 1)
            end_idx = min(len(points), i + 2)
            smoothed_points[i] = np.mean(points[start_idx:end_idx], axis=0)

        return smoothed_points

    def update_obstacle_map(self, obstacle_points):
        """
        Update the obstacle map with processed obstacle data
        """
        if len(obstacle_points) == 0:
            return

        # Create or update occupancy grid
        resolution = 0.1  # meters per cell
        width = 100  # cells (10m x 10m area)
        height = 100  # cells

        # Initialize occupancy grid
        if self.obstacle_map is None:
            self.obstacle_map = np.zeros((height, width), dtype=np.int8)

        # Convert obstacle points to grid coordinates
        grid_points = (obstacle_points / resolution + np.array([width/2, height/2])).astype(int)

        # Mark obstacle cells
        for point in grid_points:
            x, y = point
            if 0 <= x < width and 0 <= y < height:
                self.obstacle_map[y, x] = 100  # Occupied

        # Publish updated obstacle map
        self.publish_obstacle_map()

    def publish_obstacle_map(self):
        """
        Publish the updated obstacle map
        """
        if self.obstacle_map is None:
            return

        msg = OccupancyGrid()
        msg.header.stamp = self.get_clock().now().to_msg()
        msg.header.frame_id = 'map'

        # Set map metadata
        msg.info.resolution = 0.1
        msg.info.width = self.obstacle_map.shape[1]
        msg.info.height = self.obstacle_map.shape[0]
        msg.info.origin.position.x = -5.0  # Center the map
        msg.info.origin.position.y = -5.0

        # Flatten the map data
        msg.data = self.obstacle_map.flatten().tolist()

        self.obstacle_map_pub.publish(msg)

    def plan_path(self):
        """
        Plan global path using Isaac-accelerated algorithms
        """
        if self.current_pose is None or self.goal_pose is None:
            return

        try:
            # Use Isaac's GPU-accelerated path planning
            path = self.isaac_path_planning(
                self.current_pose,
                self.goal_pose,
                self.obstacle_map
            )

            if path is not None:
                self.global_path = path
                self.publish_global_path()
                self.get_logger().debug('Global path planned successfully')

        except Exception as e:
            self.get_logger().error(f'Path planning failed: {e}')

    def isaac_path_planning(self, start_pose, goal_pose, obstacle_map):
        """
        GPU-accelerated path planning using Isaac methods
        """
        if obstacle_map is None:
            # Create a simple straight-line path if no obstacle map available
            path = Path()
            path.header.stamp = self.get_clock().now().to_msg()
            path.header.frame_id = 'map'

            # Add start and goal poses to path
            start_point = PoseStamped()
            start_point.pose.position.x = start_pose.position.x
            start_point.pose.position.y = start_pose.position.y
            start_point.pose.orientation = start_pose.orientation

            goal_point = PoseStamped()
            goal_point.pose.position.x = goal_pose.position.x
            goal_point.pose.position.y = goal_pose.position.y
            goal_point.pose.orientation = goal_pose.orientation

            path.poses = [start_point, goal_point]
            return path

        # In a real Isaac implementation, this would use GPU-accelerated path planning
        # algorithms like A*, Dijkstra, or more advanced methods
        # For this example, we'll simulate the process

        path = Path()
        path.header.stamp = self.get_clock().now().to_msg()
        path.header.frame_id = 'map'

        # Simulate path planning with intermediate waypoints
        start_pos = np.array([start_pose.position.x, start_pose.position.y])
        goal_pos = np.array([goal_pose.position.x, goal_pose.position.y])

        # Calculate intermediate points
        distance = np.linalg.norm(goal_pos - start_pos)
        num_waypoints = max(2, int(distance / 0.5))  # 0.5m spacing

        for i in range(num_waypoints + 1):
            ratio = i / num_waypoints if num_waypoints > 0 else 0
            pos = start_pos + ratio * (goal_pos - start_pos)

            waypoint = PoseStamped()
            waypoint.pose.position.x = float(pos[0])
            waypoint.pose.position.y = float(pos[1])
            waypoint.pose.position.z = 0.0

            # Set orientation towards goal (simplified)
            angle = np.arctan2(goal_pos[1] - pos[1], goal_pos[0] - pos[0])
            from geometry_msgs.msg import Quaternion
            quat = self.euler_to_quaternion(0, 0, angle)
            waypoint.pose.orientation = quat

            path.poses.append(waypoint)

        return path

    def euler_to_quaternion(self, roll, pitch, yaw):
        """
        Convert Euler angles to quaternion
        """
        from math import sin, cos
        qx = sin(roll/2) * cos(pitch/2) * cos(yaw/2) - cos(roll/2) * sin(pitch/2) * sin(yaw/2)
        qy = cos(roll/2) * sin(pitch/2) * cos(yaw/2) + sin(roll/2) * cos(pitch/2) * sin(yaw/2)
        qz = cos(roll/2) * cos(pitch/2) * sin(yaw/2) - sin(roll/2) * sin(pitch/2) * cos(yaw/2)
        qw = cos(roll/2) * cos(pitch/2) * cos(yaw/2) + sin(roll/2) * sin(pitch/2) * sin(yaw/2)

        quat = Quaternion()
        quat.x = qx
        quat.y = qy
        quat.z = qz
        quat.w = qw
        return quat

    def publish_global_path(self):
        """
        Publish the global path
        """
        if self.global_path is not None:
            self.global_path_pub.publish(self.global_path)

    def execute_path(self):
        """
        Execute local path following with obstacle avoidance
        """
        if self.current_pose is None or self.global_path is None:
            return

        try:
            # Generate local path based on global path and current obstacles
            local_path = self.generate_local_path()
            self.local_path = local_path

            # Calculate velocity command for path following
            cmd_vel = self.calculate_path_following_command()

            # Apply obstacle avoidance
            cmd_vel = self.apply_obstacle_avoidance(cmd_vel)

            # Publish velocity command
            self.cmd_vel_pub.publish(cmd_vel)

            # Publish local path for visualization
            self.publish_local_path()

        except Exception as e:
            self.get_logger().error(f'Path execution failed: {e}')

    def generate_local_path(self):
        """
        Generate local path based on global path and current position
        """
        if self.global_path is None or self.current_pose is None:
            return None

        # Find closest point on global path
        current_pos = np.array([self.current_pose.position.x, self.current_pose.position.y])

        min_distance = float('inf')
        closest_idx = 0

        for i, pose_stamped in enumerate(self.global_path.poses):
            pose_pos = np.array([pose_stamped.pose.position.x, pose_stamped.pose.position.y])
            distance = np.linalg.norm(current_pos - pose_pos)
            if distance < min_distance:
                min_distance = distance
                closest_idx = i

        # Create local path from closest point onwards
        local_path = Path()
        local_path.header = self.global_path.header

        # Include next N waypoints in local path
        max_waypoints = 10
        start_idx = closest_idx
        end_idx = min(start_idx + max_waypoints, len(self.global_path.poses))

        local_path.poses = self.global_path.poses[start_idx:end_idx]

        return local_path

    def calculate_path_following_command(self):
        """
        Calculate velocity command for path following
        """
        cmd_vel = Twist()

        if self.local_path is None or self.current_pose is None:
            return cmd_vel

        if len(self.local_path.poses) == 0:
            return cmd_vel

        # Get the next waypoint to follow
        target_pose = self.local_path.poses[0].pose
        current_pos = np.array([self.current_pose.position.x, self.current_pose.position.y])
        target_pos = np.array([target_pose.position.x, target_pose.position.y])

        # Calculate direction to target
        direction = target_pos - current_pos
        distance = np.linalg.norm(direction)

        if distance > 0.1:  # If not close to target
            # Normalize direction
            direction = direction / distance

            # Calculate target angle
            target_angle = np.arctan2(direction[1], direction[0])

            # Get current orientation
            current_quat = self.current_pose.orientation
            current_euler = self.quaternion_to_euler(current_quat)
            current_angle = current_euler[2]  # Yaw

            # Calculate angle difference
            angle_diff = target_angle - current_angle
            # Normalize angle to [-pi, pi]
            while angle_diff > np.pi:
                angle_diff -= 2 * np.pi
            while angle_diff < -np.pi:
                angle_diff += 2 * np.pi

            # Set velocity based on distance and angle
            linear_speed = min(self.nav_params['max_linear_speed'], distance * 0.5)
            angular_speed = angle_diff * 1.0  # Proportional controller

            # Limit angular speed
            angular_speed = max(-self.nav_params['max_angular_speed'],
                              min(self.nav_params['max_angular_speed'], angular_speed))

            cmd_vel.linear.x = linear_speed
            cmd_vel.angular.z = angular_speed

        return cmd_vel

    def quaternion_to_euler(self, quat):
        """
        Convert quaternion to Euler angles
        """
        import math
        # Convert quaternion to Euler angles (roll, pitch, yaw)
        sinr_cosp = 2 * (quat.w * quat.x + quat.y * quat.z)
        cosr_cosp = 1 - 2 * (quat.x * quat.x + quat.y * quat.y)
        roll = math.atan2(sinr_cosp, cosr_cosp)

        sinp = 2 * (quat.w * quat.y - quat.z * quat.x)
        pitch = math.asin(sinp)

        siny_cosp = 2 * (quat.w * quat.z + quat.x * quat.y)
        cosy_cosp = 1 - 2 * (quat.y * quat.y + quat.z * quat.z)
        yaw = math.atan2(siny_cosp, cosy_cosp)

        return (roll, pitch, yaw)

    def apply_obstacle_avoidance(self, cmd_vel):
        """
        Apply obstacle avoidance to velocity command
        """
        if self.laser_data is None:
            return cmd_vel

        # Check for obstacles in the robot's path
        ranges = np.array(self.laser_data.ranges)
        angles = np.linspace(
            self.laser_data.angle_min,
            self.laser_data.angle_max,
            len(ranges)
        )

        # Check forward direction (within 30 degrees)
        forward_mask = (angles >= -np.pi/6) & (angles <= np.pi/6)
        forward_ranges = ranges[forward_mask]

        if len(forward_ranges) > 0:
            min_forward_distance = np.min(forward_ranges[forward_ranges > 0])

            if min_forward_distance < self.nav_params['min_obstacle_distance']:
                # Stop or slow down based on proximity
                cmd_vel.linear.x = 0.0
                # Turn away from obstacle
                cmd_vel.angular.z = 0.5 if min_forward_distance < 0.3 else 0.3

        return cmd_vel

    def publish_local_path(self):
        """
        Publish the local path for visualization
        """
        if self.local_path is not None:
            self.local_path_pub.publish(self.local_path)


class IsaacNavigationController(Node):
    """
    Isaac-enhanced navigation controller with advanced features
    """
    def __init__(self):
        super().__init__('isaac_navigation_controller')

        # Publishers and subscribers
        self.cmd_vel_pub = self.create_publisher(Twist, '/cmd_vel', 10)
        self.feedback_pub = self.create_publisher(Float32, '/isaac/nav_feedback', 10)

        # Navigation state
        self.navigation_active = False
        self.navigation_progress = 0.0

        # Control timer
        self.control_timer = self.create_timer(0.05, self.navigation_control_loop)

        self.get_logger().info('Isaac Navigation Controller initialized')

    def navigation_control_loop(self):
        """
        Main navigation control loop with Isaac enhancements
        """
        if not self.navigation_active:
            return

        # In a real implementation, this would:
        # - Monitor navigation progress
        # - Adjust parameters based on environment
        # - Apply Isaac-specific optimizations
        # - Handle navigation recovery behaviors

        # Simulate navigation progress
        self.navigation_progress += 0.01
        if self.navigation_progress > 1.0:
            self.navigation_progress = 0.0

        # Publish feedback
        feedback_msg = Float32()
        feedback_msg.data = self.navigation_progress
        self.feedback_pub.publish(feedback_msg)


def main(args=None):
    rclpy.init(args=args)

    # Create navigation nodes
    nav_manager = IsaacNavigationManager()
    nav_controller = IsaacNavigationController()

    # Create executor
    executor = rclpy.executors.MultiThreadedExecutor()
    executor.add_node(nav_manager)
    executor.add_node(nav_controller)

    try:
        executor.spin()
    except KeyboardInterrupt:
        pass
    finally:
        nav_manager.destroy_node()
        nav_controller.destroy_node()
        executor.shutdown()
        rclpy.shutdown()


if __name__ == '__main__':
    main()
```

## Isaac-Nav2 Configuration and Optimization

### Navigation Configuration File

```yaml
# config/isaac_nav2_config.yaml
isaac_navigation:
  global_costmap:
    global_costmap:
      ros__parameters:
        update_frequency: 5.0
        publish_frequency: 2.0
        width: 20
        height: 20
        resolution: 0.05
        origin_x: -10.0
        origin_y: -10.0
        robot_base_frame: base_link
        transform_tolerance: 0.3
        footprint: "[[-0.3, -0.25], [-0.3, 0.25], [0.3, 0.25], [0.3, -0.25]]"
        plugins: ["obstacle_layer", "inflation_layer"]
        obstacle_layer:
          plugin: "nav2_costmap_2d::ObstacleLayer"
          enabled: True
          observation_sources: scan
          scan:
            topic: /scan
            max_obstacle_height: 2.0
            clearing: True
            marking: True
            data_type: "LaserScan"
            raytrace_max_range: 3.0
            raytrace_min_range: 0.0
            obstacle_max_range: 2.5
            obstacle_min_range: 0.0
        inflation_layer:
          plugin: "nav2_costmap_2d::InflationLayer"
          enabled: True
          inflation_radius: 0.5
          cost_scaling_factor: 3.0
    local_costmap:
      ros__parameters:
        update_frequency: 10.0
        publish_frequency: 5.0
        width: 5
        height: 5
        resolution: 0.05
        robot_base_frame: base_link
        transform_tolerance: 0.3
        footprint: "[[-0.3, -0.25], [-0.3, 0.25], [0.3, 0.25], [0.3, -0.25]]"
        plugins: ["obstacle_layer", "inflation_layer"]
        obstacle_layer:
          plugin: "nav2_costmap_2d::ObstacleLayer"
          enabled: True
          observation_sources: scan
          scan:
            topic: /scan
            max_obstacle_height: 2.0
            clearing: True
            marking: True
            data_type: "LaserScan"
            raytrace_max_range: 3.0
            raytrace_min_range: 0.0
            obstacle_max_range: 2.5
            obstacle_min_range: 0.0
        inflation_layer:
          plugin: "nav2_costmap_2d::InflationLayer"
          enabled: True
          inflation_radius: 0.3
          cost_scaling_factor: 3.0

  global_planner:
    ros__parameters:
      plugin: "nav2_navfn_planner/NavfnPlanner"
      tolerance: 0.5
      use_astar: false
      allow_unknown: true
      isaac_gpu_acceleration: true
      isaac_tensorrt_optimization: true

  local_planner:
    ros__parameters:
      plugin: "nav2_regulated_pure_pursuit_controller/RegulatedPurePursuitController"
      odom_topic: /odom
      max_speed: 1.0
      min_speed: 0.0
      lookahead_dist: 0.6
      speed_scaling_dist: 0.6
      control_freq: 20.0
      isaac_gpu_obstacle_avoidance: true
      isaac_prediction_horizon: 2.0

  behavior_server:
    ros__parameters:
      local_costmap_topic: local_costmap/costmap_raw
      global_costmap_topic: global_costmap/costmap_raw
      bt_loop_duration: 10
      max_loop_duration: 10
      enable_groot_monitoring: True
      groot_zmq_publisher_port: 1666
      groot_zmq_server_port: 1667
      default_server_timeout: 20
      recovery_plugins: ["spin", "backup", "wait"]
      spin:
        plugin: "nav2_recoveries/Spin"
        sim_frequency: 10
        angle_thresh: 0.785
        time_allowance: 10
      backup:
        plugin: "nav2_recoveries/BackUp"
        sim_frequency: 10
        backup_dist: 0.15
        backup_speed: 0.025
        time_allowance: 10
      wait:
        plugin: "nav2_recoveries/Wait"
        sim_frequency: 10
        wait_duration: 1.0
```

## Isaac Navigation Launch Files

### Isaac-Enhanced Navigation Launch

```python
# launch/isaac_nav2.launch.py
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, SetEnvironmentVariable
from launch.substitutions import LaunchConfiguration, PathJoinSubstitution
from launch_ros.actions import Node
from launch_ros.substitutions import FindPackageShare
import os

def generate_launch_description():
    # Declare launch arguments
    use_sim_time = DeclareLaunchArgument(
        'use_sim_time',
        default_value='false',
        description='Use simulation time if true'
    )

    params_file = DeclareLaunchArgument(
        'params_file',
        default_value=PathJoinSubstitution([
            FindPackageShare('isaac_navigation_examples'),
            'config',
            'isaac_nav2_config.yaml'
        ]),
        description='Full path to params file for navigation nodes'
    )

    # Set Isaac-specific environment variables
    SetEnvironmentVariable(
        name='CUDA_VISIBLE_DEVICES',
        value='0'
    )

    SetEnvironmentVariable(
        name='ISAAC_NAV_GPU_ACCELERATION',
        value='true'
    )

    # Navigation Manager node
    nav_manager = Node(
        package='isaac_navigation_examples',
        executable='isaac_navigation_manager',
        name='isaac_navigation_manager',
        parameters=[
            LaunchConfiguration('params_file'),
            {'use_sim_time': LaunchConfiguration('use_sim_time')}
        ],
        remappings=[
            ('/scan', '/laser_scan'),
            ('/odom', '/odometry'),
            ('/cmd_vel', '/robot_velocity_controller/cmd_vel_unstamped')
        ],
        output='screen'
    )

    # Navigation Controller node
    nav_controller = Node(
        package='isaac_navigation_examples',
        executable='isaac_navigation_controller',
        name='isaac_navigation_controller',
        parameters=[
            LaunchConfiguration('params_file'),
            {'use_sim_time': LaunchConfiguration('use_sim_time')}
        ],
        output='screen'
    )

    # Isaac Perception Pipeline (for enhanced obstacle detection)
    perception_pipeline = Node(
        package='isaac_ros_perceptor',
        executable='perceptor_node',
        name='isaac_perceptor',
        parameters=[
            LaunchConfiguration('params_file'),
            {'use_sim_time': LaunchConfiguration('use_sim_time')}
        ],
        remappings=[
            ('/input/rgb', '/camera/image_raw'),
            ('/input/depth', '/camera/depth/image_raw'),
        ],
        output='screen'
    )

    # Isaac SLAM node (for dynamic map updates)
    vslam_node = Node(
        package='isaac_ros_visual_slam',
        executable='visual_slam_node',
        name='isaac_visual_slam',
        parameters=[
            {'use_sim_time': LaunchConfiguration('use_sim_time')}
        ],
        remappings=[
            ('/camera/left/image_rect', '/zed/left/image_rect_color'),
            ('/camera/right/image_rect', '/zed/right/image_rect_color'),
        ],
        output='screen'
    )

    return LaunchDescription([
        use_sim_time,
        params_file,
        nav_manager,
        nav_controller,
        perception_pipeline,
        vslam_node
    ])
```

## Hardware Context

### RTX Workstation Navigation Setup

For optimal navigation performance on RTX Workstations:

- **GPU**: RTX 4080 or higher for complex path planning and obstacle detection
- **Memory**: 32GB+ RAM for handling large occupancy grids and path planning
- **Storage**: NVMe SSD for fast map loading and saving
- **Network**: Low-latency network for multi-robot coordination
- **Thermal**: Adequate cooling for sustained GPU-intensive navigation

### Jetson Orin Kit Navigation Configuration

For navigation on Jetson Orin:

- **Compute Optimization**: Use INT8 quantization for neural networks
- **Power Management**: Configure power modes for sustained operation
- **Memory Efficiency**: Optimize map resolution and planning frequency
- **Real-time Operation**: Ensure navigation meets real-time deadlines
- **Edge Deployment**: Configure for autonomous operation without cloud connectivity

## Implementation Exercise

1. Create Isaac navigation package:
   ```bash
   cd ~/ros2_ws/src
   ros2 pkg create --dependencies rclpy sensor_msgs nav_msgs geometry_msgs std_msgs tf2_ros -- python isaac_navigation_examples
   ```

2. Create navigation evaluation script:
   ```python
   # Save as ~/ros2_ws/src/isaac_navigation_examples/scripts/evaluate_navigation.py
   #!/usr/bin/env python3

   import rclpy
   from rclpy.node import Node
   from geometry_msgs.msg import PoseStamped, Twist
   from nav_msgs.msg import Path, Odometry
   from std_msgs.msg import Float32
   import numpy as np
   import time

   class NavigationEvaluator(Node):
       """
       Evaluate Isaac navigation performance
       """
       def __init__(self):
           super().__init__('navigation_evaluator')

           # Publishers for navigation goals
           self.goal_pub = self.create_publisher(PoseStamped, '/move_base_simple/goal', 10)

           # Subscribers for navigation data
           self.odom_sub = self.create_subscription(
               Odometry, '/odom', self.odom_callback, 10)
           self.path_sub = self.create_subscription(
               Path, '/isaac/global_plan', self.path_callback, 10)
           self.cmd_vel_sub = self.create_subscription(
               Twist, '/cmd_vel', self.cmd_vel_callback, 10)
           self.feedback_sub = self.create_subscription(
               Float32, '/isaac/nav_feedback', self.feedback_callback, 10)

           # Navigation evaluation data
           self.current_position = None
           self.start_position = None
           self.goal_position = None
           self.path_length = 0
           self.traveled_distance = 0
           self.navigation_time = 0
           self.success_count = 0
           self.failure_count = 0

           # Evaluation timer
           self.eval_timer = self.create_timer(1.0, self.evaluate_navigation)

           # Goal generation timer
           self.goal_timer = self.create_timer(30.0, self.generate_new_goal)

           self.get_logger().info('Navigation Evaluator initialized')

       def odom_callback(self, msg):
           """
           Store current robot position
           """
           self.current_position = np.array([
               msg.pose.pose.position.x,
               msg.pose.pose.position.y
           ])

           if self.start_position is None:
               self.start_position = self.current_position.copy()

       def path_callback(self, msg):
           """
           Calculate planned path length
           """
           if len(msg.poses) > 1:
               total_length = 0
               for i in range(len(msg.poses) - 1):
                   p1 = np.array([msg.poses[i].pose.position.x, msg.poses[i].pose.position.y])
                   p2 = np.array([msg.poses[i+1].pose.position.x, msg.poses[i+1].pose.position.y])
                   total_length += np.linalg.norm(p2 - p1)
               self.path_length = total_length

       def cmd_vel_callback(self, msg):
           """
           Monitor command velocity for performance
           """
           # In a real implementation, this would track velocity profiles
           pass

       def feedback_callback(self, msg):
           """
           Monitor navigation progress
           """
           self.navigation_progress = msg.data

       def evaluate_navigation(self):
           """
           Evaluate navigation performance metrics
           """
           if self.current_position is not None and self.start_position is not None:
               # Calculate distance traveled
               self.traveled_distance = np.linalg.norm(self.current_position - self.start_position)

               self.get_logger().info(
                   f'Navigation Status - Traveled: {self.traveled_distance:.2f}m, '
                   f'Planned Path: {self.path_length:.2f}m, '
                   f'Progress: {self.navigation_progress:.2f}'
               )

       def generate_new_goal(self):
           """
           Generate a new navigation goal
           """
           goal_msg = PoseStamped()
           goal_msg.header.stamp = self.get_clock().now().to_msg()
           goal_msg.header.frame_id = 'map'

           # Generate random goal in a 10x10m area around current position
           if self.current_position is not None:
               offset = np.random.uniform(-5, 5, 2)
               goal_msg.pose.position.x = float(self.current_position[0] + offset[0])
               goal_msg.pose.position.y = float(self.current_position[1] + offset[1])
           else:
               # Default to some position if no current position available
               goal_msg.pose.position.x = 5.0
               goal_msg.pose.position.y = 5.0

           # Set orientation to face towards goal
           goal_msg.pose.orientation.w = 1.0

           self.goal_pub.publish(goal_msg)
           self.goal_position = np.array([goal_msg.pose.position.x, goal_msg.pose.position.y])

           self.get_logger().info(f'New goal generated: ({goal_msg.pose.position.x:.2f}, {goal_msg.pose.position.y:.2f})')

       def calculate_metrics(self):
           """
           Calculate comprehensive navigation metrics
           """
           metrics = {
               'success_rate': self.success_count / (self.success_count + self.failure_count) if (self.success_count + self.failure_count) > 0 else 0,
               'avg_path_efficiency': self.path_length / self.traveled_distance if self.traveled_distance > 0 else 0,
               'avg_navigation_time': self.navigation_time / self.success_count if self.success_count > 0 else 0
           }
           return metrics

   def main():
       rclpy.init()
       evaluator = NavigationEvaluator()

       try:
           rclpy.spin(evaluator)
       except KeyboardInterrupt:
           metrics = evaluator.calculate_metrics()
           print(f"\nNavigation Evaluation Results:")
           print(f"Success Rate: {metrics['success_rate']:.2f}")
           print(f"Path Efficiency: {metrics['avg_path_efficiency']:.2f}")
           print(f"Avg Navigation Time: {metrics['avg_navigation_time']:.2f}s")
       finally:
           evaluator.destroy_node()
           rclpy.shutdown()

   if __name__ == '__main__':
       main()
   ```

3. Make the script executable and test navigation:
   ```bash
   chmod +x ~/ros2_ws/src/isaac_navigation_examples/scripts/evaluate_navigation.py

   cd ~/ros2_ws
   colcon build --packages-select isaac_navigation_examples
   source install/setup.bash

   # Run navigation evaluation (in simulation environment)
   ros2 run isaac_navigation_examples evaluate_navigation.py
   ```

## Troubleshooting

- **Path Planning Failures**: Check costmap configuration and obstacle detection
- **Performance Issues**: Verify GPU acceleration and optimize parameters
- **Oscillation**: Adjust controller parameters and lookahead distances
- **Collision**: Increase inflation radius and obstacle detection sensitivity

## Summary

This lesson covered the integration of NVIDIA Isaac with ROS 2 Navigation, demonstrating how GPU acceleration enhances path planning, obstacle detection, and navigation execution for Physical AI applications. The combination of Isaac's perception capabilities with Nav2's navigation framework enables robust autonomous navigation.

## Next Steps

In the next lesson, we'll explore advanced control systems for humanoid robots, focusing on GPU-accelerated control algorithms and Isaac's contribution to real-time robot control.