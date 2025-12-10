---
sidebar_position: 32
---

# Isaac Navigation and Path Planning

## Learning Objectives

By the end of this lesson, you will be able to:
- Implement GPU-accelerated navigation and path planning using Isaac tools
- Configure Isaac Navigation for complex humanoid robotics environments
- Design and optimize path planning algorithms for real-time performance
- Integrate perception data with navigation for dynamic obstacle avoidance
- Evaluate navigation performance and optimize for Physical AI applications

## Overview

Isaac Navigation represents NVIDIA's comprehensive solution for autonomous navigation and path planning in robotics applications. Leveraging GPU acceleration, Isaac Navigation provides real-time SLAM, path planning, and obstacle avoidance capabilities that are essential for Physical AI and humanoid robotics. This lesson explores the architecture, configuration, and implementation of Isaac Navigation for complex navigation scenarios with emphasis on performance optimization and real-world deployment considerations.

## Isaac Navigation Architecture

### Core Navigation Components

#### 1. Visual SLAM (Simultaneous Localization and Mapping)
- **GPU-Accelerated Feature Extraction**: CUDA-optimized feature detection and matching
- **Real-time Mapping**: Continuous map building and updating with GPU acceleration
- **Loop Closure Detection**: GPU-accelerated place recognition and map optimization
- **Multi-camera Support**: Synchronized processing of multiple camera streams

#### 2. Path Planning Engine
- **GPU-Accelerated Search Algorithms**: A*, Dijkstra, RRT variants optimized for GPU
- **Dynamic Programming**: Real-time replanning for obstacle avoidance
- **Trajectory Optimization**: GPU-accelerated trajectory smoothing and optimization
- **Multi-objective Optimization**: Balancing safety, efficiency, and comfort

#### 3. Local Navigation
- **Costmap Generation**: GPU-accelerated 2D/3D costmap creation and updates
- **Obstacle Avoidance**: Real-time collision avoidance with dynamic obstacles
- **Velocity Smoothing**: GPU-accelerated velocity profile generation
- **Recovery Behaviors**: Predefined strategies for navigation recovery

#### 4. Motion Control Integration
- **Trajectory Following**: Precise trajectory tracking with feedback control
- **Dynamic Window Approach**: Real-time velocity commands for collision avoidance
- **Footstep Planning**: Specialized for humanoid robots with bipedal locomotion
- **Stability Control**: Integration with balance control for humanoid navigation

### Navigation System Integration

#### Sensor Fusion
- **LIDAR Integration**: GPU-accelerated point cloud processing
- **Camera Integration**: Visual SLAM and semantic mapping
- **IMU Integration**: Inertial navigation and drift correction
- **Wheel Odometry**: Precise motion tracking and localization

#### Control Loop Architecture
- **Global Planner**: Long-term path planning with map-based optimization
- **Local Planner**: Short-term obstacle avoidance and trajectory generation
- **Controller**: Low-level velocity commands and feedback control
- **Monitor**: Continuous performance and safety monitoring

## Python/ROS 2 Code Example - Isaac Navigation System

Here's a comprehensive example of an Isaac Navigation implementation:

```python
#!/usr/bin/env python3

import rclpy
from rclpy.node import Node
from std_msgs.msg import String, Float64, Bool
from sensor_msgs.msg import Image, PointCloud2, LaserScan, Imu, CameraInfo
from geometry_msgs.msg import Twist, Pose, PoseStamped, PointStamped
from nav_msgs.msg import Odometry, Path, OccupancyGrid
from visualization_msgs.msg import Marker, MarkerArray
from builtin_interfaces.msg import Time
from cv_bridge import CvBridge
import numpy as np
import cv2
import math
import time
import heapq
from dataclasses import dataclass
from typing import Dict, List, Tuple, Optional, Any
import json

try:
    import cupy as cp
    CUDA_AVAILABLE = True
except ImportError:
    CUDA_AVAILABLE = False

@dataclass
class NavigationMetrics:
    """
    Metrics for navigation system performance
    """
    path_length: float
    execution_time: float
    success_rate: float
    obstacle_avoidance_rate: float
    localization_accuracy: float
    computational_efficiency: float

class IsaacNavigationManager(Node):
    """
    Isaac Navigation system manager with GPU acceleration
    """
    def __init__(self):
        super().__init__('isaac_navigation_manager')

        # Initialize CV bridge
        self.cv_bridge = CvBridge()

        # Publishers for navigation system
        self.path_pub = self.create_publisher(Path, '/isaac/navigation/path', 10)
        self.velocity_pub = self.create_publisher(Twist, '/isaac/navigation/cmd_vel', 10)
        self.goal_pub = self.create_publisher(PoseStamped, '/isaac/navigation/goal', 10)
        self.navigation_status_pub = self.create_publisher(String, '/isaac/navigation/status', 10)
        self.navigation_metrics_pub = self.create_publisher(String, '/isaac/navigation/metrics', 10)

        # Subscribers for navigation input
        self.odom_sub = self.create_subscription(
            Odometry, '/odom', self.odom_callback, 10)
        self.scan_sub = self.create_subscription(
            LaserScan, '/scan', self.scan_callback, 10)
        self.imu_sub = self.create_subscription(
            Imu, '/imu', self.imu_callback, 10)
        self.camera_sub = self.create_subscription(
            Image, '/rgb/image_raw', self.camera_callback, 10)

        # Timer for navigation system
        self.navigation_timer = self.create_timer(0.1, self.navigation_pipeline)  # 10Hz

        # Navigation state
        self.current_pose = None
        self.scan_data = None
        self.imu_data = None
        self.camera_image = None
        self.goal_pose = None
        self.navigation_active = False
        self.global_path = Path()
        self.local_plan = []

        # Isaac Navigation components
        self.visual_slam = VisualSLAM()
        self.path_planner = PathPlanner()
        self.local_navigator = LocalNavigator()
        self.motion_controller = MotionController()

        # Navigation configuration
        self.nav_config = {
            'global_planner': 'astar_gpu',
            'local_planner': 'dwa_gpu',
            'map_resolution': 0.05,  # meters per cell
            'inflation_radius': 0.5,  # meters
            'planning_frequency': 5.0,  # Hz
            'execution_frequency': 10.0,  # Hz
            'max_velocity': 1.0,  # m/s
            'min_velocity': 0.1,  # m/s
            'acceleration_limit': 2.0,  # m/s^2
            'angular_velocity_limit': 1.0  # rad/s
        }

        # Performance tracking
        self.navigation_metrics = NavigationMetrics(
            path_length=0.0,
            execution_time=0.0,
            success_rate=0.0,
            obstacle_avoidance_rate=0.0,
            localization_accuracy=0.0,
            computational_efficiency=0.0
        )

        self.get_logger().info('Isaac Navigation Manager initialized')

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

    def imu_callback(self, msg):
        """
        Update IMU data for navigation
        """
        self.imu_data = msg

    def camera_callback(self, msg):
        """
        Update camera data for visual navigation
        """
        try:
            self.camera_image = self.cv_bridge.imgmsg_to_cv2(msg, "bgr8")
        except Exception as e:
            self.get_logger().error(f'Error processing camera image: {e}')

    def navigation_pipeline(self):
        """
        Main navigation pipeline with Isaac components
        """
        if not self.navigation_active or self.current_pose is None:
            return

        start_time = time.time()

        # Update map with visual SLAM
        if self.camera_image is not None:
            self.visual_slam.update_map(self.camera_image)

        # Update costmap with sensor data
        self.update_costmap()

        # Plan global path if needed
        if self.goal_pose and self.should_replan_global_path():
            self.global_path = self.path_planner.plan_global_path(
                self.current_pose, self.goal_pose, self.get_costmap()
            )
            self.publish_path(self.global_path)

        # Plan local trajectory
        local_cmd = self.local_navigator.plan_local_trajectory(
            self.current_pose, self.global_path, self.get_sensor_data()
        )

        # Execute motion
        self.motion_controller.execute_trajectory(local_cmd)

        # Calculate metrics
        execution_time = time.time() - start_time
        self.update_navigation_metrics(execution_time)

    def update_costmap(self):
        """
        Update costmap with sensor data using GPU acceleration
        """
        if self.scan_data:
            # Process laser scan data to update costmap
            self.process_scan_for_costmap(self.scan_data)

    def get_costmap(self):
        """
        Get current costmap for path planning
        """
        # In a real implementation, this would return the actual costmap
        # For this example, we'll return a placeholder
        return np.zeros((100, 100), dtype=np.float32)

    def get_sensor_data(self):
        """
        Get current sensor data for local navigation
        """
        return {
            'scan': self.scan_data,
            'imu': self.imu_data,
            'camera': self.camera_image,
            'odom': self.current_pose
        }

    def should_replan_global_path(self) -> bool:
        """
        Determine if global path needs replanning
        """
        if not self.global_path.poses:
            return True

        # Replan if goal has changed significantly
        if self.goal_pose:
            current_goal = self.global_path.poses[-1].pose if self.global_path.poses else None
            if current_goal:
                goal_distance = math.sqrt(
                    (self.goal_pose.pose.position.x - current_goal.position.x)**2 +
                    (self.goal_pose.pose.position.y - current_goal.position.y)**2
                )
                return goal_distance > 0.5  # Replan if goal moved more than 0.5m

        # Replan if path is too old
        current_time = time.time()
        if hasattr(self, 'last_global_plan_time'):
            return (current_time - self.last_global_plan_time) > (1.0 / self.nav_config['planning_frequency'])
        else:
            return True

    def publish_path(self, path: Path):
        """
        Publish navigation path
        """
        path.header.stamp = self.get_clock().now().to_msg()
        path.header.frame_id = "map"
        self.path_pub.publish(path)
        self.last_global_plan_time = time.time()

    def update_navigation_metrics(self, execution_time: float):
        """
        Update navigation performance metrics
        """
        # Calculate metrics based on current navigation state
        self.navigation_metrics.execution_time = execution_time
        self.navigation_metrics.computational_efficiency = min(1.0, 0.1 / execution_time) if execution_time > 0 else 0.0

        # Publish metrics
        metrics_msg = String()
        metrics_msg.data = json.dumps({
            'execution_time': self.navigation_metrics.execution_time,
            'computational_efficiency': self.navigation_metrics.computational_efficiency,
            'path_length': self.navigation_metrics.path_length,
            'success_rate': self.navigation_metrics.success_rate
        })
        self.navigation_metrics_pub.publish(metrics_msg)

    def set_navigation_goal(self, goal: PoseStamped):
        """
        Set navigation goal
        """
        self.goal_pose = goal
        self.navigation_active = True
        self.get_logger().info(f'Navigation goal set: ({goal.pose.position.x:.2f}, {goal.pose.position.y:.2f})')

    def cancel_navigation(self):
        """
        Cancel current navigation
        """
        self.navigation_active = False
        self.goal_pose = None
        self.global_path = Path()
        self.local_plan = []

        # Stop robot
        stop_cmd = Twist()
        self.velocity_pub.publish(stop_cmd)

        self.get_logger().info('Navigation cancelled')

class VisualSLAM:
    """
    Visual SLAM component for Isaac Navigation
    """
    def __init__(self):
        self.map = None
        self.pose_graph = {}
        self.keyframes = []
        self.feature_extractor = self.initialize_feature_extractor()
        self.tracker = self.initialize_tracker()

    def initialize_feature_extractor(self):
        """
        Initialize GPU-accelerated feature extractor
        """
        if CUDA_AVAILABLE:
            # Use GPU-accelerated feature extraction
            return {
                'detector': 'orb_gpu',
                'descriptor': 'brief_gpu',
                'matcher': 'flann_gpu',
                'initialized': True
            }
        else:
            # CPU fallback
            return {
                'detector': 'orb_cpu',
                'descriptor': 'brief_cpu',
                'matcher': 'flann_cpu',
                'initialized': True
            }

    def initialize_tracker(self):
        """
        Initialize visual tracker
        """
        return {
            'tracking': False,
            'last_pose': None,
            'confidence': 0.0
        }

    def update_map(self, image):
        """
        Update map using visual SLAM
        """
        # Extract features from image
        keypoints, descriptors = self.extract_features(image)

        # Match with previous keyframes
        matches = self.match_features(descriptors)

        # Update pose estimate
        new_pose = self.estimate_pose(matches)

        # Add keyframe if significant movement occurred
        if self.should_add_keyframe(new_pose):
            self.add_keyframe(image, keypoints, descriptors, new_pose)

        # Optimize map if needed
        self.optimize_map()

    def extract_features(self, image):
        """
        Extract features from image using GPU acceleration
        """
        if self.feature_extractor['detector'] == 'orb_gpu' and CUDA_AVAILABLE:
            # GPU-accelerated feature extraction (simulated)
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) > 2 else image
            orb = cv2.ORB_create(nfeatures=2000)  # High feature count for good matching
            keypoints, descriptors = orb.detectAndCompute(gray, None)
            return keypoints, descriptors
        else:
            # CPU fallback
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) > 2 else image
            orb = cv2.ORB_create(nfeatures=1000)  # Lower count for CPU
            keypoints, descriptors = orb.detectAndCompute(gray, None)
            return keypoints, descriptors

    def match_features(self, descriptors):
        """
        Match features with previous keyframes
        """
        # Simulate feature matching
        return []

    def estimate_pose(self, matches):
        """
        Estimate camera pose from feature matches
        """
        # Simulate pose estimation
        return Pose()

    def should_add_keyframe(self, new_pose):
        """
        Determine if new keyframe should be added
        """
        if not self.keyframes:
            return True

        # Add keyframe if significant movement occurred
        last_pose = self.keyframes[-1]['pose']
        movement = math.sqrt(
            (new_pose.position.x - last_pose.position.x)**2 +
            (new_pose.position.y - last_pose.position.y)**2 +
            (new_pose.position.z - last_pose.position.z)**2
        )

        return movement > 0.5  # Add keyframe every 0.5m

    def add_keyframe(self, image, keypoints, descriptors, pose):
        """
        Add new keyframe to map
        """
        keyframe = {
            'image': image,
            'keypoints': keypoints,
            'descriptors': descriptors,
            'pose': pose,
            'timestamp': time.time()
        }
        self.keyframes.append(keyframe)

    def optimize_map(self):
        """
        Optimize map using pose graph optimization
        """
        # Simulate map optimization
        pass

class PathPlanner:
    """
    GPU-accelerated path planning component
    """
    def __init__(self):
        self.planning_algorithm = 'astar_gpu'  # Options: astar_gpu, dijkstra_gpu, rrt_gpu
        self.planning_cache = {}
        self.gpu_accelerated = CUDA_AVAILABLE

    def plan_global_path(self, start_pose: Pose, goal_pose: PoseStamped, costmap: np.ndarray) -> Path:
        """
        Plan global path using GPU-accelerated algorithm
        """
        if self.gpu_accelerated:
            if self.planning_algorithm == 'astar_gpu':
                return self.astar_gpu_planning(start_pose, goal_pose, costmap)
            elif self.planning_algorithm == 'dijkstra_gpu':
                return self.dijkstra_gpu_planning(start_pose, goal_pose, costmap)
            elif self.planning_algorithm == 'rrt_gpu':
                return self.rrt_gpu_planning(start_pose, goal_pose, costmap)
        else:
            # CPU fallback
            return self.astar_cpu_planning(start_pose, goal_pose, costmap)

    def astar_gpu_planning(self, start_pose: Pose, goal_pose: PoseStamped, costmap: np.ndarray) -> Path:
        """
        GPU-accelerated A* path planning
        """
        if not CUDA_AVAILABLE:
            return self.astar_cpu_planning(start_pose, goal_pose, costmap)

        # Convert poses to grid coordinates
        start_grid = self.pose_to_grid(start_pose, costmap)
        goal_grid = self.pose_to_grid(goal_pose.pose, costmap)

        # Convert costmap to GPU array
        gpu_costmap = cp.asarray(costmap)

        # Run GPU-accelerated A* algorithm
        path_grid = self.run_gpu_astar(gpu_costmap, start_grid, goal_grid)

        # Convert grid path back to world coordinates
        path = self.grid_path_to_world_path(path_grid, costmap)

        return path

    def run_gpu_astar(self, gpu_costmap, start, goal):
        """
        Run A* algorithm on GPU (simulated implementation)
        """
        # In a real implementation, this would use CUDA kernels for A*
        # For this example, we'll simulate the process
        import random

        # Simulate GPU-accelerated path finding
        path = [start]
        current = start

        while current != goal and len(path) < 1000:  # Prevent infinite loops
            # Find next step toward goal
            dx = goal[0] - current[0]
            dy = goal[1] - current[1]

            # Choose direction based on gradient toward goal
            next_x = current[0] + (1 if dx > 0 else -1 if dx < 0 else 0)
            next_y = current[1] + (1 if dy > 0 else -1 if dy < 0 else 0)

            next_pos = (next_x, next_y)

            # Check if position is valid (within bounds and not occupied)
            if (0 <= next_pos[0] < gpu_costmap.shape[0] and
                0 <= next_pos[1] < gpu_costmap.shape[1] and
                gpu_costmap[next_pos] < 50):  # Cost threshold for passable areas

                if next_pos not in path:
                    path.append(next_pos)
                    current = next_pos

                    if current == goal:
                        break
            else:
                # If direct path blocked, try random walk
                directions = [(0, 1), (1, 0), (0, -1), (-1, 0)]
                random.shuffle(directions)

                found_next = False
                for dx, dy in directions:
                    next_pos = (current[0] + dx, current[1] + dy)

                    if (0 <= next_pos[0] < gpu_costmap.shape[0] and
                        0 <= next_pos[1] < gpu_costmap.shape[1] and
                        gpu_costmap[next_pos] < 50 and
                        next_pos not in path):

                        path.append(next_pos)
                        current = next_pos
                        found_next = True
                        break

                if not found_next:
                    break  # No valid moves available

        return path

    def astar_cpu_planning(self, start_pose: Pose, goal_pose: PoseStamped, costmap: np.ndarray) -> Path:
        """
        CPU-based A* path planning (fallback)
        """
        start_grid = self.pose_to_grid(start_pose, costmap)
        goal_grid = self.pose_to_grid(goal_pose.pose, costmap)

        # A* algorithm implementation
        def heuristic(a, b):
            return abs(a[0] - b[0]) + abs(a[1] - b[1])  # Manhattan distance

        heap = [(0, start_grid)]
        came_from = {start_grid: None}
        cost_so_far = {start_grid: 0}

        while heap:
            current_cost, current = heapq.heappop(heap)

            if current == goal_grid:
                break

            # Check 4-connected neighbors
            for dx, dy in [(0, 1), (1, 0), (0, -1), (-1, 0)]:
                next_pos = (current[0] + dx, current[1] + dy)

                if (0 <= next_pos[0] < costmap.shape[0] and
                    0 <= next_pos[1] < costmap.shape[1] and
                    costmap[next_pos] < 50):  # Not occupied

                    new_cost = cost_so_far[current] + 1 + costmap[next_pos] / 100.0

                    if next_pos not in cost_so_far or new_cost < cost_so_far[next_pos]:
                        cost_so_far[next_pos] = new_cost
                        priority = new_cost + heuristic(goal_grid, next_pos)
                        heapq.heappush(heap, (priority, next_pos))
                        came_from[next_pos] = current

        # Reconstruct path
        path = []
        current = goal_grid
        while current != start_grid:
            path.append(current)
            current = came_from.get(current)
            if current is None:
                break
        path.reverse()

        return self.grid_path_to_world_path(path, costmap)

    def pose_to_grid(self, pose: Pose, costmap: np.ndarray) -> Tuple[int, int]:
        """
        Convert world pose to grid coordinates
        """
        # Assuming costmap origin is at (0, 0) world coordinates
        resolution = 0.05  # Same as nav_config
        grid_x = int(pose.position.x / resolution)
        grid_y = int(pose.position.y / resolution)

        # Clamp to map bounds
        grid_x = max(0, min(costmap.shape[0] - 1, grid_x))
        grid_y = max(0, min(costmap.shape[1] - 1, grid_y))

        return (grid_x, grid_y)

    def grid_path_to_world_path(self, grid_path: List[Tuple[int, int]], costmap: np.ndarray) -> Path:
        """
        Convert grid path to world coordinate path
        """
        path = Path()
        resolution = 0.05  # Same as nav_config

        for grid_x, grid_y in grid_path:
            pose_stamped = PoseStamped()
            pose_stamped.pose.position.x = grid_x * resolution
            pose_stamped.pose.position.y = grid_y * resolution
            pose_stamped.pose.position.z = 0.0  # Assuming flat terrain

            # Set orientation to face toward next point
            if grid_path.index((grid_x, grid_y)) < len(grid_path) - 1:
                next_x, next_y = grid_path[grid_path.index((grid_x, grid_y)) + 1]
                dx = next_x - grid_x
                dy = next_y - grid_y
                yaw = math.atan2(dy, dx)

                # Convert yaw to quaternion
                pose_stamped.pose.orientation.z = math.sin(yaw / 2.0)
                pose_stamped.pose.orientation.w = math.cos(yaw / 2.0)

            path.poses.append(pose_stamped)

        return path

class LocalNavigator:
    """
    Local navigation and obstacle avoidance component
    """
    def __init__(self):
        self.local_planner = 'dwa_gpu'  # Dynamic Window Approach
        self.obstacle_threshold = 0.5  # meters
        self.trajectory_generator = TrajectoryGenerator()

    def plan_local_trajectory(self, current_pose: Pose, global_path: Path, sensor_data: Dict) -> Twist:
        """
        Plan local trajectory with obstacle avoidance
        """
        if not global_path.poses:
            return Twist()  # Stop if no global path

        # Get local goal from global path
        local_goal = self.get_local_goal(current_pose, global_path)

        # Generate candidate trajectories
        candidate_trajectories = self.trajectory_generator.generate_trajectories(
            current_pose, local_goal
        )

        # Evaluate trajectories based on sensor data
        best_trajectory = self.evaluate_trajectories(
            candidate_trajectories, sensor_data
        )

        # Convert best trajectory to velocity command
        cmd_vel = self.trajectory_to_velocity(best_trajectory)

        return cmd_vel

    def get_local_goal(self, current_pose: Pose, global_path: Path) -> Pose:
        """
        Get local goal from global path
        """
        if not global_path.poses:
            return current_pose

        # Find the point on the global path that is closest but ahead of the robot
        current_pos = np.array([current_pose.position.x, current_pose.position.y])

        closest_idx = 0
        min_dist = float('inf')

        for i, pose_stamped in enumerate(global_path.poses):
            path_pos = np.array([pose_stamped.pose.position.x, pose_stamped.pose.position.y])
            dist = np.linalg.norm(current_pos - path_pos)

            if dist < min_dist:
                min_dist = dist
                closest_idx = i

        # Look ahead on the path to set local goal
        look_ahead = min(closest_idx + 5, len(global_path.poses) - 1)
        local_goal = global_path.poses[look_ahead].pose

        return local_goal

    def evaluate_trajectories(self, trajectories: List[List[Pose]], sensor_data: Dict) -> List[Pose]:
        """
        Evaluate trajectories based on obstacles and goals
        """
        if not trajectories:
            return []

        best_trajectory = trajectories[0]
        best_score = float('-inf')

        for trajectory in trajectories:
            score = self.score_trajectory(trajectory, sensor_data)
            if score > best_score:
                best_score = score
                best_trajectory = trajectory

        return best_trajectory

    def score_trajectory(self, trajectory: List[Pose], sensor_data: Dict) -> float:
        """
        Score trajectory based on multiple factors
        """
        if not trajectory:
            return float('-inf')

        # Calculate distance to goal
        goal_pose = trajectory[-1]  # Last pose in trajectory
        goal_dist = math.sqrt(
            (goal_pose.position.x - trajectory[0].position.x)**2 +
            (goal_pose.position.y - trajectory[0].position.y)**2
        )

        # Calculate obstacle clearance
        obstacle_penalty = 0
        scan_data = sensor_data.get('scan')
        if scan_data:
            for pose in trajectory:
                obstacle_dist = self.get_closest_obstacle_distance(pose, scan_data)
                if obstacle_dist < 0.3:  # Very close to obstacle
                    obstacle_penalty += 1000 / (obstacle_dist + 0.01)  # High penalty for close obstacles

        # Calculate path smoothness
        smoothness_penalty = 0
        if len(trajectory) > 2:
            for i in range(1, len(trajectory) - 1):
                p0 = trajectory[i-1]
                p1 = trajectory[i]
                p2 = trajectory[i+1]

                # Calculate curvature (simplified)
                v1 = np.array([p1.position.x - p0.position.x, p1.position.y - p0.position.y])
                v2 = np.array([p2.position.x - p1.position.x, p2.position.y - p1.position.y])

                if np.linalg.norm(v1) > 0 and np.linalg.norm(v2) > 0:
                    cos_angle = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))
                    curvature = 1 - abs(cos_angle)  # Higher curvature = worse
                    smoothness_penalty += curvature * 10

        # Calculate velocity (prefer higher velocities)
        velocity_bonus = 10  # Base bonus

        # Combined score
        score = -goal_dist * 10 - obstacle_penalty - smoothness_penalty + velocity_bonus

        return score

    def get_closest_obstacle_distance(self, pose: Pose, scan_data: LaserScan) -> float:
        """
        Get distance to closest obstacle from pose using scan data
        """
        if not scan_data.ranges:
            return float('inf')

        # For simplicity, we'll use a basic approach
        # In practice, this would involve transforming scan data to global coordinates
        # and checking distances to the robot's predicted position
        min_range = min([r for r in scan_data.ranges if not (math.isnan(r) or math.isinf(r))])
        return min_range if min_range else float('inf')

    def trajectory_to_velocity(self, trajectory: List[Pose]) -> Twist:
        """
        Convert trajectory to velocity command
        """
        if len(trajectory) < 2:
            return Twist()

        # Calculate velocity based on first segment of trajectory
        start_pose = trajectory[0]
        next_pose = trajectory[1]

        dx = next_pose.position.x - start_pose.position.x
        dy = next_pose.position.y - start_pose.position.y
        dt = 0.1  # 10Hz control loop

        linear_vel = math.sqrt(dx**2 + dy**2) / dt
        angular_vel = math.atan2(dy, dx) / dt  # Simplified angular velocity

        # Limit velocities
        max_linear = 1.0  # m/s
        max_angular = 1.0  # rad/s

        cmd_vel = Twist()
        cmd_vel.linear.x = max(-max_linear, min(max_linear, linear_vel))
        cmd_vel.angular.z = max(-max_angular, min(max_angular, angular_vel))

        return cmd_vel

class TrajectoryGenerator:
    """
    Generate candidate trajectories for local navigation
    """
    def __init__(self):
        self.lookahead_time = 1.0  # seconds
        self.num_trajectories = 20

    def generate_trajectories(self, current_pose: Pose, local_goal: Pose) -> List[List[Pose]]:
        """
        Generate candidate trajectories with different velocity profiles
        """
        trajectories = []

        # Base velocity toward goal
        dx = local_goal.position.x - current_pose.position.x
        dy = local_goal.position.y - current_pose.position.y
        distance_to_goal = math.sqrt(dx**2 + dy**2)

        if distance_to_goal == 0:
            return []

        base_linear_vel = min(1.0, distance_to_goal / 2.0)  # Scale velocity with distance
        base_angular_vel = math.atan2(dy, dx)  # Direction toward goal

        # Generate trajectories with slight variations
        for i in range(self.num_trajectories):
            trajectory = self.generate_trajectory_with_variation(
                current_pose, base_linear_vel, base_angular_vel, i
            )
            trajectories.append(trajectory)

        return trajectories

    def generate_trajectory_with_variation(self, start_pose: Pose, base_linear: float, base_angular: float, variation_idx: int) -> List[Pose]:
        """
        Generate trajectory with specific velocity variation
        """
        trajectory = [start_pose]
        current_pose = start_pose

        # Add variation based on index
        linear_var = (variation_idx - self.num_trajectories//2) * 0.1  # -0.5 to +0.5 variation
        angular_var = (variation_idx - self.num_trajectories//2) * 0.05  # Angular variation

        linear_vel = max(0.1, min(1.5, base_linear + linear_var))
        angular_vel = base_angular + angular_var

        # Simulate trajectory over lookahead time
        dt = 0.1  # 100ms time steps
        steps = int(self.lookahead_time / dt)

        for step in range(steps):
            # Calculate next pose
            next_pose = Pose()
            next_pose.position.x = current_pose.position.x + linear_vel * dt * math.cos(angular_vel * dt)
            next_pose.position.y = current_pose.position.y + linear_vel * dt * math.sin(angular_vel * dt)
            next_pose.position.z = current_pose.position.z   # Keep same height

            # Update orientation
            next_yaw = math.atan2(
                next_pose.position.y - current_pose.position.y,
                next_pose.position.x - current_pose.position.x
            )
            next_pose.orientation.z = math.sin(next_yaw / 2.0)
            next_pose.orientation.w = math.cos(next_yaw / 2.0)

            trajectory.append(next_pose)
            current_pose = next_pose

        return trajectory

class MotionController:
    """
    Motion control for navigation execution
    """
    def __init__(self):
        self.max_linear_vel = 1.0
        self.max_angular_vel = 1.0
        self.linear_acc_limit = 2.0
        self.angular_acc_limit = 2.0
        self.last_cmd_time = time.time()
        self.current_linear_vel = 0.0
        self.current_angular_vel = 0.0

    def execute_trajectory(self, cmd_vel: Twist):
        """
        Execute trajectory with acceleration limits
        """
        current_time = time.time()
        dt = current_time - self.last_cmd_time
        self.last_cmd_time = current_time

        # Apply acceleration limits
        target_linear = max(-self.max_linear_vel, min(self.max_linear_vel, cmd_vel.linear.x))
        target_angular = max(-self.max_angular_vel, min(self.max_angular_vel, cmd_vel.angular.z))

        # Calculate maximum allowed change based on acceleration limits
        max_linear_change = self.linear_acc_limit * dt
        max_angular_change = self.angular_acc_limit * dt

        # Limit acceleration
        new_linear = self.current_linear_vel + max(
            -max_linear_change,
            min(max_linear_change, target_linear - self.current_linear_vel)
        )

        new_angular = self.current_angular_vel + max(
            -max_angular_change,
            min(max_angular_change, target_angular - self.current_angular_vel)
        )

        # Apply limits
        new_linear = max(-self.max_linear_vel, min(self.max_linear_vel, new_linear))
        new_angular = max(-self.max_angular_vel, min(self.max_angular_vel, new_angular))

        # Update current velocities
        self.current_linear_vel = new_linear
        self.current_angular_vel = new_angular

        # Create final command
        final_cmd = Twist()
        final_cmd.linear.x = new_linear
        final_cmd.angular.z = new_angular

        # Publish command
        # Note: In a real system, this would be published to a velocity command topic
        # For this example, we'll just log the command
        # self.velocity_pub.publish(final_cmd)  # This would be called from the main navigation node

class NavigationOptimizer(Node):
    """
    Optimizer for Isaac Navigation performance
    """
    def __init__(self):
        super().__init__('navigation_optimizer')

        # Publishers for optimization commands
        self.optimization_cmd_pub = self.create_publisher(String, '/isaac/navigation/optimization_commands', 10)

        # Subscribers for navigation metrics
        self.nav_metrics_sub = self.create_subscription(
            String, '/isaac/navigation/metrics', self.nav_metrics_callback, 10)

        # Timer for optimization
        self.optimization_timer = self.create_timer(5.0, self.optimize_navigation)

        # Performance tracking
        self.performance_history = []
        self.current_config = {
            'planning_frequency': 5.0,
            'execution_frequency': 10.0,
            'costmap_resolution': 0.05,
            'inflation_radius': 0.5,
            'max_velocity': 1.0
        }

        self.get_logger().info('Navigation Optimizer initialized')

    def nav_metrics_callback(self, msg):
        """
        Track navigation performance metrics
        """
        try:
            metrics = json.loads(msg.data)
            self.performance_history.append({
                'timestamp': time.time(),
                'metrics': metrics,
                'config': self.current_config.copy()
            })

            # Keep only recent history
            if len(self.performance_history) > 50:
                self.performance_history.pop(0)

        except json.JSONDecodeError:
            self.get_logger().error('Invalid JSON in navigation metrics')

    def optimize_navigation(self):
        """
        Optimize navigation parameters based on performance
        """
        if len(self.performance_history) < 10:
            return

        # Calculate recent performance averages
        recent_metrics = self.performance_history[-10:]
        avg_exec_time = np.mean([m['metrics'].get('execution_time', 0) for m in recent_metrics])
        avg_efficiency = np.mean([m['metrics'].get('computational_efficiency', 0) for m in recent_metrics])

        # Determine optimization strategy
        if avg_exec_time > 0.100:  # 100ms is too slow
            self.optimize_for_performance()
        elif avg_exec_time < 0.020 and avg_efficiency > 0.9:  # Very efficient, can increase quality
            self.optimize_for_accuracy()

    def optimize_for_performance(self):
        """
        Optimize for better performance (faster execution)
        """
        new_config = self.current_config.copy()

        # Reduce planning frequency to improve performance
        new_config['planning_frequency'] = max(2.0, new_config['planning_frequency'] * 0.8)

        # Reduce costmap resolution for faster processing
        new_config['costmap_resolution'] = min(0.1, new_config['costmap_resolution'] * 1.2)

        # Reduce inflation radius to speed up costmap updates
        new_config['inflation_radius'] = max(0.3, new_config['inflation_radius'] * 0.9)

        self.apply_optimization(new_config)

    def optimize_for_accuracy(self):
        """
        Optimize for better accuracy (higher quality planning)
        """
        new_config = self.current_config.copy()

        # Increase planning frequency for more responsive navigation
        new_config['planning_frequency'] = min(10.0, new_config['planning_frequency'] * 1.2)

        # Increase costmap resolution for more precise planning
        new_config['costmap_resolution'] = max(0.02, new_config['costmap_resolution'] * 0.8)

        # Increase inflation radius for safer navigation
        new_config['inflation_radius'] = min(0.8, new_config['inflation_radius'] * 1.1)

        self.apply_optimization(new_config)

    def apply_optimization(self, new_config):
        """
        Apply optimization configuration
        """
        if new_config != self.current_config:
            self.get_logger().info(f'Applying navigation optimization: {new_config}')

            # Publish optimization command
            cmd_msg = String()
            cmd_msg.data = json.dumps({
                'command': 'reconfigure_navigation',
                'new_config': new_config
            })
            self.optimization_cmd_pub.publish(cmd_msg)

            self.current_config = new_config

def main(args=None):
    rclpy.init(args=args)

    # Create Isaac Navigation system nodes
    nav_manager = IsaacNavigationManager()
    nav_optimizer = NavigationOptimizer()

    # Create executor to handle all nodes
    executor = rclpy.executors.MultiThreadedExecutor()
    executor.add_node(nav_manager)
    executor.add_node(nav_optimizer)

    try:
        executor.spin()
    except KeyboardInterrupt:
        pass
    finally:
        nav_manager.destroy_node()
        nav_optimizer.destroy_node()
        executor.shutdown()
        rclpy.shutdown()

if __name__ == '__main__':
    main()