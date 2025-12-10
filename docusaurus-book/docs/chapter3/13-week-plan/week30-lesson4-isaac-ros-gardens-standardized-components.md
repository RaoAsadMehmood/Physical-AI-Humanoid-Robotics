---
sidebar_position: 30
---

# Isaac ROS Gardens for Standardized Components

## Learning Objectives

By the end of this lesson, you will be able to:
- Understand the Isaac ROS Gardens ecosystem and standardized components
- Implement standardized perception and control components from Isaac Gardens
- Integrate Garden components into custom Physical AI applications
- Leverage pre-optimized components for faster development
- Evaluate and select appropriate Garden components for specific robotics tasks

## Overview

Isaac ROS Gardens represents NVIDIA's curated collection of standardized, production-ready robotics components that have been optimized for GPU acceleration and seamless integration with the Isaac ecosystem. These components serve as the building blocks for advanced Physical AI and humanoid robotics applications, providing tested, validated, and performance-optimized solutions for common robotics challenges. This lesson explores how to effectively leverage these standardized components to accelerate development while maintaining high performance.

## Isaac ROS Gardens Architecture

### Core Garden Components

#### 1. Perception Gardens
- **DetectNet**: GPU-accelerated object detection with TensorRT optimization
- **SegmentNet**: Semantic segmentation for scene understanding
- **Depth Prediction**: Monocular depth estimation networks
- **Pose Estimation**: 6D pose estimation for objects and markers

#### 2. Navigation Gardens
- **Visual SLAM**: GPU-accelerated simultaneous localization and mapping
- **Path Planning**: GPU-optimized path planning algorithms
- **Obstacle Avoidance**: Real-time obstacle detection and avoidance
- **Localization**: Advanced localization using visual and sensor fusion

#### 3. Manipulation Gardens
- **Grasp Planning**: GPU-accelerated grasp planning algorithms
- **Motion Planning**: GPU-optimized trajectory planning
- **Force Control**: Advanced force and torque control components
- **Hand-Eye Calibration**: Automated calibration procedures

#### 4. Utility Gardens
- **Image Transport**: GPU-accelerated image transport and conversion
- **Transform Management**: Optimized TF tree management
- **Sensor Fusion**: Multi-sensor data fusion components
- **Data Logging**: High-performance data recording and playback

### Component Integration Patterns

#### 1. Pipeline Pattern
- **Sequential Processing**: Components connected in processing sequence
- **Modular Design**: Replaceable components with standardized interfaces
- **Performance Optimization**: GPU-accelerated data flow between components

#### 2. Plugin Pattern
- **Runtime Loading**: Dynamic loading of optimized components
- **Configuration Driven**: Component behavior configured through parameters
- **Hardware Adaptation**: Automatic optimization based on available hardware

## Python/ROS 2 Code Example - Isaac Gardens Integration

Here's a comprehensive example of integrating Isaac ROS Gardens components:

```python
#!/usr/bin/env python3

import rclpy
from rclpy.node import Node
from sensor_msgs.msg import Image, CameraInfo, PointCloud2, LaserScan
from geometry_msgs.msg import Twist, PoseStamped, PointStamped
from nav_msgs.msg import Odometry, Path
from std_msgs.msg import String, Float64, Bool
from visualization_msgs.msg import Marker, MarkerArray
from cv_bridge import CvBridge
import numpy as np
import cv2
import time
import json
from dataclasses import dataclass
from typing import Dict, List, Tuple, Optional, Any

@dataclass
class GardenComponentInfo:
    """
    Information about a Garden component
    """
    name: str
    version: str
    gpu_accelerated: bool
    performance_rating: float  # 0.0 to 1.0
    resource_usage: Dict[str, float]  # CPU, GPU, Memory usage

class IsaacGardensManager(Node):
    """
    Manager for Isaac ROS Gardens components
    """
    def __init__(self):
        super().__init__('isaac_gardens_manager')

        # Initialize CV bridge
        self.cv_bridge = CvBridge()

        # Publishers for Garden component status
        self.garden_status_pub = self.create_publisher(String, '/isaac_gardens/status', 10)
        self.garden_metrics_pub = self.create_publisher(String, '/isaac_gardens/metrics', 10)

        # Subscribers for component control
        self.garden_control_sub = self.create_subscription(
            String, '/isaac_gardens/control', self.garden_control_callback, 10)

        # Timer for Garden component monitoring
        self.monitor_timer = self.create_timer(2.0, self.monitor_garden_components)

        # Available Garden components registry
        self.garden_components = self.initialize_garden_registry()

        # Active component instances
        self.active_components = {}

        # Garden configuration
        self.garden_config = {
            'auto_optimization': True,
            'resource_sharing': True,
            'fallback_enabled': True,
            'monitoring_enabled': True
        }

        self.get_logger().info('Isaac Gardens Manager initialized')

    def initialize_garden_registry(self) -> Dict[str, GardenComponentInfo]:
        """
        Initialize the registry of available Garden components
        """
        return {
            'isaac_ros_detectnet': GardenComponentInfo(
                name='Isaac ROS DetectNet',
                version='3.0.0',
                gpu_accelerated=True,
                performance_rating=0.95,
                resource_usage={'cpu': 0.1, 'gpu': 0.7, 'memory': 0.3}
            ),
            'isaac_ros_segmentnet': GardenComponentInfo(
                name='Isaac ROS SegmentNet',
                version='2.5.0',
                gpu_accelerated=True,
                performance_rating=0.92,
                resource_usage={'cpu': 0.1, 'gpu': 0.8, 'memory': 0.4}
            ),
            'isaac_ros_visual_slam': GardenComponentInfo(
                name='Isaac ROS Visual SLAM',
                version='1.2.0',
                gpu_accelerated=True,
                performance_rating=0.88,
                resource_usage={'cpu': 0.3, 'gpu': 0.6, 'memory': 0.5}
            ),
            'isaac_ros_path_planner': GardenComponentInfo(
                name='Isaac ROS Path Planner',
                version='1.1.0',
                gpu_accelerated=True,
                performance_rating=0.85,
                resource_usage={'cpu': 0.2, 'gpu': 0.5, 'memory': 0.3}
            ),
            'isaac_ros_grasp_planner': GardenComponentInfo(
                name='Isaac ROS Grasp Planner',
                version='1.0.0',
                gpu_accelerated=True,
                performance_rating=0.82,
                resource_usage={'cpu': 0.2, 'gpu': 0.7, 'memory': 0.4}
            )
        }

    def garden_control_callback(self, msg):
        """
        Handle Garden component control commands
        """
        try:
            command = json.loads(msg.data)
            command_type = command.get('type', '')
            component_name = command.get('component', '')
            params = command.get('params', {})

            if command_type == 'activate_component':
                self.activate_garden_component(component_name, params)
            elif command_type == 'deactivate_component':
                self.deactivate_garden_component(component_name)
            elif command_type == 'reconfigure_component':
                self.reconfigure_garden_component(component_name, params)
            elif command_type == 'get_component_info':
                self.get_component_info(component_name)
            elif command_type == 'list_components':
                self.list_garden_components()

        except json.JSONDecodeError:
            self.get_logger().error('Invalid JSON command received')

    def activate_garden_component(self, component_name: str, params: Dict[str, Any]):
        """
        Activate a Garden component with specified parameters
        """
        if component_name not in self.garden_components:
            self.get_logger().error(f'Component {component_name} not found in Gardens')
            return

        # Simulate component activation
        component_info = self.garden_components[component_name]
        activation_params = {
            'name': component_name,
            'parameters': params,
            'timestamp': time.time(),
            'gpu_accelerated': component_info.gpu_accelerated
        }

        self.active_components[component_name] = activation_params
        self.get_logger().info(f'Activated Garden component: {component_name} with params: {params}')

        # Apply auto-optimization if enabled
        if self.garden_config['auto_optimization']:
            self.optimize_component_for_hardware(component_name, params)

    def deactivate_garden_component(self, component_name: str):
        """
        Deactivate a Garden component
        """
        if component_name in self.active_components:
            del self.active_components[component_name]
            self.get_logger().info(f'Deactivated Garden component: {component_name}')
        else:
            self.get_logger().warn(f'Component {component_name} not active')

    def reconfigure_garden_component(self, component_name: str, params: Dict[str, Any]):
        """
        Reconfigure an active Garden component
        """
        if component_name in self.active_components:
            self.active_components[component_name]['parameters'].update(params)
            self.get_logger().info(f'Reconfigured component {component_name} with: {params}')
        else:
            self.get_logger().warn(f'Component {component_name} not active for reconfiguration')

    def get_component_info(self, component_name: str):
        """
        Get information about a specific Garden component
        """
        if component_name in self.garden_components:
            info = self.garden_components[component_name]
            info_msg = String()
            info_msg.data = json.dumps({
                'name': info.name,
                'version': info.version,
                'gpu_accelerated': info.gpu_accelerated,
                'performance_rating': info.performance_rating,
                'resource_usage': info.resource_usage
            })
            self.garden_status_pub.publish(info_msg)
        else:
            self.get_logger().warn(f'Component {component_name} not found')

    def list_garden_components(self):
        """
        List all available Garden components
        """
        available_components = list(self.garden_components.keys())
        active_components = list(self.active_components.keys())

        status_msg = String()
        status_msg.data = json.dumps({
            'available': available_components,
            'active': active_components,
            'total_available': len(available_components),
            'total_active': len(active_components)
        })
        self.garden_status_pub.publish(status_msg)

    def optimize_component_for_hardware(self, component_name: str, params: Dict[str, Any]):
        """
        Optimize component configuration based on available hardware
        """
        try:
            import GPUtil
            gpus = GPUtil.getGPUs()
            if gpus:
                gpu = gpus[0]  # Primary GPU
                gpu_memory = gpu.memoryTotal / 1024  # Convert to GB

                # Adjust component parameters based on available GPU memory
                if gpu_memory < 8:
                    # Reduce model complexity for lower memory GPUs
                    params['model_type'] = 'lightweight'
                    params['batch_size'] = max(1, params.get('batch_size', 1) // 2)
                elif gpu_memory > 24:
                    # Increase performance for high-memory GPUs
                    params['model_type'] = 'high_performance'
                    params['batch_size'] = min(16, params.get('batch_size', 1) * 2)

                self.get_logger().info(f'Optimized {component_name} for GPU with {gpu_memory}GB memory')

        except ImportError:
            self.get_logger().warn('GPUtil not available for hardware optimization')

    def monitor_garden_components(self):
        """
        Monitor active Garden components and publish metrics
        """
        metrics = {
            'timestamp': time.time(),
            'active_components': list(self.active_components.keys()),
            'total_components': len(self.active_components),
            'gpu_usage_estimate': self.estimate_gpu_usage(),
            'memory_usage_estimate': self.estimate_memory_usage(),
            'performance_score': self.calculate_performance_score()
        }

        metrics_msg = String()
        metrics_msg.data = json.dumps(metrics)
        self.garden_metrics_pub.publish(metrics_msg)

        self.get_logger().debug(f'Garden metrics: {metrics}')

    def estimate_gpu_usage(self) -> float:
        """
        Estimate total GPU usage based on active components
        """
        total_gpu_usage = 0.0
        for comp_name in self.active_components:
            if comp_name in self.garden_components:
                total_gpu_usage += self.garden_components[comp_name].resource_usage['gpu']
        return min(1.0, total_gpu_usage)  # Clamp between 0 and 1

    def estimate_memory_usage(self) -> float:
        """
        Estimate total memory usage based on active components
        """
        total_memory_usage = 0.0
        for comp_name in self.active_components:
            if comp_name in self.garden_components:
                total_memory_usage += self.garden_components[comp_name].resource_usage['memory']
        return min(1.0, total_memory_usage)  # Clamp between 0 and 1

    def calculate_performance_score(self) -> float:
        """
        Calculate overall performance score based on active components
        """
        if not self.active_components:
            return 0.0

        total_rating = 0.0
        for comp_name in self.active_components:
            if comp_name in self.garden_components:
                total_rating += self.garden_components[comp_name].performance_rating

        return total_rating / len(self.active_components)

class GardenPerceptionPipeline(Node):
    """
    Example perception pipeline using Isaac Gardens components
    """
    def __init__(self):
        super().__init__('garden_perception_pipeline')

        # Initialize CV bridge
        self.cv_bridge = CvBridge()

        # Publishers for perception results
        self.detection_pub = self.create_publisher(String, '/garden/detections', 10)
        self.segmentation_pub = self.create_publisher(Image, '/garden/segmentation', 10)
        self.depth_pub = self.create_publisher(Image, '/garden/depth', 10)

        # Subscribers for sensor input
        self.rgb_sub = self.create_subscription(
            Image, '/rgb/image_raw', self.rgb_callback, 10)
        self.camera_info_sub = self.create_subscription(
            CameraInfo, '/rgb/camera_info', self.camera_info_callback, 10)

        # Timer for perception pipeline
        self.pipeline_timer = self.create_timer(0.033, self.perception_pipeline)  # ~30Hz

        # Pipeline state
        self.current_image = None
        self.camera_info = None
        self.pipeline_active = True

        # Simulated Garden components
        self.detectnet_component = self.initialize_detectnet_component()
        self.segmentnet_component = self.initialize_segmentnet_component()

        self.get_logger().info('Garden Perception Pipeline initialized')

    def initialize_detectnet_component(self):
        """
        Initialize DetectNet component (simulated)
        """
        return {
            'name': 'isaac_ros_detectnet',
            'model': 'resnet18',
            'confidence_threshold': 0.7,
            'max_objects': 50,
            'gpu_accelerated': True,
            'initialized': True
        }

    def initialize_segmentnet_component(self):
        """
        Initialize SegmentNet component (simulated)
        """
        return {
            'name': 'isaac_ros_segmentnet',
            'model': 'fcn-resnet',
            'classes': 1000,  # ImageNet classes
            'gpu_accelerated': True,
            'initialized': True
        }

    def rgb_callback(self, msg):
        """
        Handle RGB image input
        """
        try:
            self.current_image = self.cv_bridge.imgmsg_to_cv2(msg, "bgr8")
        except Exception as e:
            self.get_logger().error(f'Error processing RGB image: {e}')

    def camera_info_callback(self, msg):
        """
        Handle camera calibration information
        """
        self.camera_info = msg

    def perception_pipeline(self):
        """
        Main perception pipeline using Garden components
        """
        if not self.pipeline_active or self.current_image is None:
            return

        start_time = time.time()

        # Run DetectNet component (simulated)
        detections = self.run_detectnet_component(self.current_image)

        # Run SegmentNet component (simulated)
        segmentation = self.run_segmentnet_component(self.current_image)

        # Calculate processing time
        processing_time = time.time() - start_time

        # Publish results
        self.publish_perception_results(detections, segmentation, processing_time)

    def run_detectnet_component(self, image):
        """
        Simulate running DetectNet component from Gardens
        In practice, this would call the actual Isaac ROS DetectNet
        """
        if not self.detectnet_component['initialized']:
            return []

        height, width = image.shape[:2]

        # Simulate GPU-accelerated object detection
        import random
        detections = []
        num_detections = random.randint(1, 8)  # Random number of detections

        for _ in range(num_detections):
            class_id = random.randint(0, 999)  # COCO dataset range
            confidence = random.uniform(0.7, 0.99)

            # Random bounding box
            x = random.randint(0, width - 50)
            y = random.randint(0, height - 50)
            w = random.randint(30, 200)
            h = random.randint(30, 200)

            # Ensure bounds
            x = min(x, width - w)
            y = min(y, height - h)

            if confidence > self.detectnet_component['confidence_threshold']:
                detections.append({
                    'class_id': class_id,
                    'class_name': f'object_{class_id}',
                    'confidence': confidence,
                    'bbox': [x, y, x + w, y + h],
                    'center': [x + w//2, y + h//2]
                })

        return {
            'detections': detections,
            'processing_time': 0.015,  # Simulated GPU time
            'component': 'isaac_ros_detectnet'
        }

    def run_segmentnet_component(self, image):
        """
        Simulate running SegmentNet component from Gardens
        In practice, this would call the actual Isaac ROS SegmentNet
        """
        if not self.segmentnet_component['initialized']:
            return None

        height, width = image.shape[:2]

        # Create a segmented image (simulated GPU output)
        segmented = np.zeros((height, width), dtype=np.uint8)

        # Simulate segmentation of different regions
        for i in range(5):  # 5 different segments
            center_x = random.randint(width//4, 3*width//4)
            center_y = random.randint(height//4, 3*height//4)
            radius = random.randint(20, 100)

            y, x = np.ogrid[:height, :width]
            mask = (x - center_x)**2 + (y - center_y)**2 <= radius**2
            segmented[mask] = i + 1  # Different class for each segment

        # Convert to ROS Image message
        segmented_msg = self.cv_bridge.cv2_to_imgmsg(segmented, encoding="mono8")
        segmented_msg.header.stamp = self.get_clock().now().to_msg()
        segmented_msg.header.frame_id = "camera_frame"

        return {
            'segmented_image': segmented_msg,
            'classes': list(range(1, 6)),
            'processing_time': 0.025,  # Simulated GPU time
            'component': 'isaac_ros_segmentnet'
        }

    def publish_perception_results(self, detections, segmentation, processing_time):
        """
        Publish perception results from Garden components
        """
        # Publish detection results
        if detections and detections['detections']:
            detection_msg = String()
            detection_msg.data = json.dumps({
                'detections': detections['detections'],
                'component': detections['component'],
                'processing_time': detections['processing_time'],
                'total_detections': len(detections['detections'])
            })
            self.detection_pub.publish(detection_msg)

        # Publish segmentation result
        if segmentation and segmentation['segmented_image']:
            self.segmentation_pub.publish(segmentation['segmented_image'])

        # Log performance
        self.get_logger().debug(
            f'Garden Perception - DetectNet: {detections["processing_time"]*1000:.1f}ms, '
            f'SegmentNet: {segmentation["processing_time"]*1000 if segmentation else 0:.1f}ms, '
            f'Total: {processing_time*1000:.1f}ms'
        )

class GardenNavigationSystem(Node):
    """
    Navigation system using Isaac Gardens components
    """
    def __init__(self):
        super().__init__('garden_navigation_system')

        # Publishers for navigation
        self.path_pub = self.create_publisher(Path, '/garden/path', 10)
        self.cmd_vel_pub = self.create_publisher(Twist, '/garden/cmd_vel', 10)
        self.goal_pub = self.create_publisher(PoseStamped, '/garden/goal', 10)

        # Subscribers for navigation input
        self.odom_sub = self.create_subscription(
            Odometry, '/odom', self.odom_callback, 10)
        self.scan_sub = self.create_subscription(
            LaserScan, '/scan', self.scan_callback, 10)

        # Timer for navigation pipeline
        self.nav_timer = self.create_timer(0.1, self.navigation_pipeline)

        # Navigation state
        self.current_pose = None
        self.scan_data = None
        self.goal_pose = None
        self.navigation_active = False

        # Simulated Garden navigation components
        self.visual_slam_component = self.initialize_visual_slam_component()
        self.path_planner_component = self.initialize_path_planner_component()

        self.get_logger().info('Garden Navigation System initialized')

    def initialize_visual_slam_component(self):
        """
        Initialize Visual SLAM component (simulated)
        """
        return {
            'name': 'isaac_ros_visual_slam',
            'algorithm': 'orb_slam',
            'gpu_accelerated': True,
            'initialized': True,
            'map_quality': 0.85
        }

    def initialize_path_planner_component(self):
        """
        Initialize Path Planner component (simulated)
        """
        return {
            'name': 'isaac_ros_path_planner',
            'algorithm': 'dijkstra_gpu',
            'gpu_accelerated': True,
            'initialized': True,
            'planning_rate': 10.0  # Hz
        }

    def odom_callback(self, msg):
        """
        Update current pose from odometry
        """
        self.current_pose = msg.pose.pose

    def scan_callback(self, msg):
        """
        Update laser scan data
        """
        self.scan_data = msg

    def navigation_pipeline(self):
        """
        Main navigation pipeline using Garden components
        """
        if not self.navigation_active or self.current_pose is None:
            return

        # Plan path using Garden path planner
        path = self.plan_path_with_garden_planner()

        if path:
            # Follow the planned path
            cmd_vel = self.follow_path(path)
            self.cmd_vel_pub.publish(cmd_vel)

    def plan_path_with_garden_planner(self):
        """
        Plan path using Isaac Gardens path planner
        """
        if not self.path_planner_component['initialized']:
            return None

        # Simulate GPU-accelerated path planning
        # In practice, this would call the actual Isaac ROS Path Planner
        if self.current_pose and self.goal_pose:
            # Create a simple path (in practice, would be planned by Garden component)
            path = Path()
            path.header.stamp = self.get_clock().now().to_msg()
            path.header.frame_id = "map"

            # Simulate path planning result
            start_pos = self.current_pose.position
            goal_pos = self.goal_pose.pose.position

            # Generate intermediate points
            steps = 10
            for i in range(steps + 1):
                ratio = i / steps
                point = PoseStamped()
                point.pose.position.x = start_pos.x + (goal_pos.x - start_pos.x) * ratio
                point.pose.position.y = start_pos.y + (goal_pos.y - start_pos.y) * ratio
                point.pose.position.z = start_pos.z + (goal_pos.z - start_pos.z) * ratio
                path.poses.append(point)

            self.path_pub.publish(path)
            return path

        return None

    def follow_path(self, path):
        """
        Follow a planned path using Garden components
        """
        if not path.poses:
            return Twist()  # Stop if no path

        # Simple path following (in practice, would use Garden navigation components)
        cmd_vel = Twist()

        # Calculate direction to next waypoint
        if self.current_pose:
            next_waypoint = path.poses[0].pose.position
            dx = next_waypoint.x - self.current_pose.position.x
            dy = next_waypoint.y - self.current_pose.position.y

            # Simple proportional control
            cmd_vel.linear.x = min(0.5, max(-0.5, 2.0 * math.sqrt(dx*dx + dy*dy)))
            cmd_vel.angular.z = min(1.0, max(-1.0, math.atan2(dy, dx) * 2.0))

        return cmd_vel

def main(args=None):
    rclpy.init(args=args)

    # Create Isaac Gardens integration nodes
    gardens_manager = IsaacGardensManager()
    perception_pipeline = GardenPerceptionPipeline()
    navigation_system = GardenNavigationSystem()

    # Create executor to handle all nodes
    executor = rclpy.executors.MultiThreadedExecutor()
    executor.add_node(gardens_manager)
    executor.add_node(perception_pipeline)
    executor.add_node(navigation_system)

    try:
        executor.spin()
    except KeyboardInterrupt:
        pass
    finally:
        gardens_manager.destroy_node()
        perception_pipeline.destroy_node()
        navigation_system.destroy_node()
        executor.shutdown()
        rclpy.shutdown()

if __name__ == '__main__':
    main()