---
sidebar_position: 6
prev:
  title: Week 17, Lesson 4 - Physics Engines and Simulation Accuracy in Gazebo
  url: /docs/chapter2/13-week-plan/week17-lesson4-physics-engines-gazebo
next:
  title: Week 19, Lesson 6 - Control Systems for Gazebo Simulation with Python
  url: /docs/chapter2/13-week-plan/week19-lesson6-control-systems-gazebo-python
---

# Sensor Integration in Gazebo Simulation Environment

## Learning Objectives

By the end of this lesson, you will be able to:
- Integrate various sensor types into Gazebo robot models
- Configure sensor properties for realistic simulation
- Process sensor data in ROS 2 nodes for Physical AI applications
- Calibrate and validate sensor models in simulation
- Optimize sensor performance for real-time humanoid robotics

## Overview

Sensor integration is fundamental to creating effective Digital Twin environments for Physical AI and humanoid robotics. This lesson covers the integration of various sensor types into Gazebo simulation, including cameras, LIDAR, IMU, force/torque sensors, and other sensors critical for humanoid robot perception and control.

## Types of Sensors in Gazebo

### Camera Sensors
- **RGB Cameras**: Visual perception and object recognition
- **Depth Cameras**: 3D scene understanding and navigation
- **Stereo Cameras**: Depth estimation and 3D reconstruction
- **Fish-eye Cameras**: Wide-angle perception for spatial awareness

### Range Sensors
- **LIDAR**: 2D/3D mapping and obstacle detection
- **Sonar**: Short-range obstacle detection
- **Infrared**: Specific material detection and proximity sensing

### Inertial Sensors
- **IMU**: Orientation, acceleration, and angular velocity
- **Accelerometer**: Linear acceleration measurement
- **Gyroscope**: Angular velocity measurement

### Force and Torque Sensors
- **Force/Torque Sensors**: Joint force measurement
- **Contact Sensors**: Collision detection and force measurement
- **Pressure Sensors**: Surface interaction measurement

## Camera Sensor Integration

### URDF Configuration for Camera

```xml
<!-- Camera sensor integrated into robot model -->
<joint name="camera_joint" type="fixed">
  <parent link="head_link"/>
  <child link="camera_link"/>
  <origin xyz="0.05 0 0" rpy="0 0 0"/>
</joint>

<link name="camera_link">
  <visual>
    <geometry>
      <box size="0.02 0.05 0.03"/>
    </geometry>
  </visual>
  <collision>
    <geometry>
      <box size="0.02 0.05 0.03"/>
    </geometry>
  </collision>
  <inertial>
    <mass value="0.01"/>
    <origin xyz="0 0 0" rpy="0 0 0"/>
    <inertia ixx="0.001" ixy="0" ixz="0" iyy="0.001" iyz="0" izz="0.001"/>
  </inertial>
</link>

<!-- Gazebo plugin for camera -->
<gazebo reference="camera_link">
  <sensor type="camera" name="head_camera">
    <update_rate>30</update_rate>
    <camera name="head_camera">
      <horizontal_fov>1.047</horizontal_fov> <!-- 60 degrees -->
      <image>
        <width>640</width>
        <height>480</height>
        <format>R8G8B8</format>
      </image>
      <clip>
        <near>0.1</near>
        <far>300</far>
      </clip>
      <noise>
        <type>gaussian</type>
        <mean>0.0</mean>
        <stddev>0.007</stddev>
      </noise>
    </camera>
    <plugin name="camera_controller" filename="libgazebo_ros_camera.so">
      <frame_name>camera_link</frame_name>
      <min_depth>0.1</min_depth>
      <max_depth>300</max_depth>
    </plugin>
  </sensor>
</gazebo>
```

### LIDAR Sensor Integration

```xml
<!-- Hokuyo LIDAR sensor -->
<joint name="lidar_joint" type="fixed">
  <parent link="base_link"/>
  <child link="lidar_link"/>
  <origin xyz="0 0 0.2" rpy="0 0 0"/>
</joint>

<link name="lidar_link">
  <visual>
    <geometry>
      <cylinder radius="0.05" length="0.08"/>
    </geometry>
  </visual>
  <collision>
    <geometry>
      <cylinder radius="0.05" length="0.08"/>
    </geometry>
  </collision>
  <inertial>
    <mass value="0.1"/>
    <origin xyz="0 0 0" rpy="0 0 0"/>
    <inertia ixx="0.001" ixy="0" ixz="0" iyy="0.001" iyz="0" izz="0.001"/>
  </inertial>
</link>

<!-- Gazebo plugin for LIDAR -->
<gazebo reference="lidar_link">
  <sensor type="ray" name="head_hokuyo_sensor">
    <pose>0 0 0 0 0 0</pose>
    <visualize>false</visualize>
    <update_rate>40</update_rate>
    <ray>
      <scan>
        <horizontal>
          <samples>720</samples>
          <resolution>1</resolution>
          <min_angle>-1.570796</min_angle> <!-- -90 degrees -->
          <max_angle>1.570796</max_angle>   <!-- 90 degrees -->
        </horizontal>
      </scan>
      <range>
        <min>0.10</min>
        <max>30.0</max>
        <resolution>0.01</resolution>
      </range>
      <noise>
        <type>gaussian</type>
        <mean>0.0</mean>
        <stddev>0.01</stddev>
      </noise>
    </ray>
    <plugin name="gazebo_ros_laser" filename="libgazebo_ros_ray_sensor.so">
      <ros>
        <namespace>/humanoid_robot</namespace>
        <remapping>~/out:=scan</remapping>
      </ros>
      <output_type>sensor_msgs/LaserScan</output_type>
    </plugin>
  </sensor>
</gazebo>
```

### IMU Sensor Integration

```xml
<!-- IMU sensor -->
<joint name="imu_joint" type="fixed">
  <parent link="base_link"/>
  <child link="imu_link"/>
  <origin xyz="0 0 0" rpy="0 0 0"/>
</joint>

<link name="imu_link">
  <inertial>
    <mass value="0.01"/>
    <origin xyz="0 0 0" rpy="0 0 0"/>
    <inertia ixx="0.0001" ixy="0" ixz="0" iyy="0.0001" iyz="0" izz="0.0001"/>
  </inertial>
</link>

<!-- Gazebo plugin for IMU -->
<gazebo reference="imu_link">
  <sensor name="imu_sensor" type="imu">
    <always_on>true</always_on>
    <update_rate>100</update_rate>
    <visualize>false</visualize>
    <imu>
      <angular_velocity>
        <x>
          <noise type="gaussian">
            <mean>0.0</mean>
            <stddev>0.02</stddev>
            <bias_mean>0.0000075</bias_mean>
            <bias_stddev>0.0000008</bias_stddev>
          </noise>
        </x>
        <y>
          <noise type="gaussian">
            <mean>0.0</mean>
            <stddev>0.02</stddev>
            <bias_mean>0.0000075</bias_mean>
            <bias_stddev>0.0000008</bias_stddev>
          </noise>
        </y>
        <z>
          <noise type="gaussian">
            <mean>0.0</mean>
            <stddev>0.02</stddev>
            <bias_mean>0.0000075</bias_mean>
            <bias_stddev>0.0000008</bias_stddev>
          </noise>
        </z>
      </angular_velocity>
      <linear_acceleration>
        <x>
          <noise type="gaussian">
            <mean>0.0</mean>
            <stddev>0.017</stddev>
            <bias_mean>0.1</bias_mean>
            <bias_stddev>0.001</bias_stddev>
          </noise>
        </x>
        <y>
          <noise type="gaussian">
            <mean>0.0</mean>
            <stddev>0.017</stddev>
            <bias_mean>0.1</bias_mean>
            <bias_stddev>0.001</bias_stddev>
          </noise>
        </y>
        <z>
          <noise type="gaussian">
            <mean>0.0</mean>
            <stddev>0.017</stddev>
            <bias_mean>0.1</bias_mean>
            <bias_stddev>0.001</bias_stddev>
          </noise>
        </z>
      </linear_acceleration>
    </imu>
    <plugin name="gazebo_ros_imu" filename="libgazebo_ros_imu.so">
      <ros>
        <namespace>/humanoid_robot</namespace>
        <remapping>~/out:=imu</remapping>
      </ros>
      <initial_orientation_as_reference>false</initial_orientation_as_reference>
    </plugin>
  </sensor>
</gazebo>
```

## Python/ROS 2 Code Example - Sensor Fusion Node

Here's a comprehensive example that processes data from multiple sensors:

```python
#!/usr/bin/env python3

import rclpy
from rclpy.node import Node
from sensor_msgs.msg import LaserScan, Image, Imu, CameraInfo
from cv_bridge import CvBridge
import cv2
import numpy as np
from geometry_msgs.msg import Vector3
from tf2_ros import TransformListener, Buffer
import tf2_geometry_msgs
from visualization_msgs.msg import Marker, MarkerArray
import math

class SensorFusionNode(Node):
    """
    Sensor fusion node that integrates data from multiple sensors
    Demonstrates processing of camera, LIDAR, and IMU data for Physical AI applications
    """

    def __init__(self):
        super().__init__('sensor_fusion_node')

        # Initialize CV bridge for image processing
        self.cv_bridge = CvBridge()

        # Create subscribers for all sensor types
        self.lidar_sub = self.create_subscription(
            LaserScan, '/scan', self.lidar_callback, 10)

        self.camera_sub = self.create_subscription(
            Image, '/camera/image_raw', self.camera_callback, 10)

        self.imu_sub = self.create_subscription(
            Imu, '/imu', self.imu_callback, 10)

        # Publishers for processed data
        self.obstacle_pub = self.create_publisher(
            MarkerArray, '/obstacles', 10)

        self.visualization_pub = self.create_publisher(
            Marker, '/sensor_fusion_viz', 10)

        # Timer for fusion processing
        self.fusion_timer = self.create_timer(0.1, self.sensor_fusion_callback)

        # Sensor data storage
        self.lidar_data = None
        self.camera_data = None
        self.imu_data = None

        # Processing state
        self.last_fusion_time = self.get_clock().now()

        self.get_logger().info('Sensor Fusion Node initialized')

    def lidar_callback(self, msg):
        """
        Process LIDAR scan data
        """
        self.lidar_data = msg
        self.process_lidar_data(msg)

    def camera_callback(self, msg):
        """
        Process camera image data
        """
        try:
            cv_image = self.cv_bridge.imgmsg_to_cv2(msg, "bgr8")
            self.camera_data = cv_image
            self.process_camera_data(cv_image)
        except Exception as e:
            self.get_logger().error(f'Error processing camera image: {e}')

    def imu_callback(self, msg):
        """
        Process IMU data
        """
        self.imu_data = msg
        self.process_imu_data(msg)

    def process_lidar_data(self, scan_msg):
        """
        Process LIDAR data to detect obstacles
        """
        # Convert scan to points in robot frame
        points = []
        for i, range_val in enumerate(scan_msg.ranges):
            if not (math.isnan(range_val) or math.isinf(range_val)):
                angle = scan_msg.angle_min + i * scan_msg.angle_increment
                x = range_val * math.cos(angle)
                y = range_val * math.sin(angle)
                points.append((x, y))

        # Simple clustering to identify obstacles
        obstacles = self.cluster_obstacles(points)

        # Publish visualization markers for obstacles
        self.publish_obstacle_markers(obstacles)

    def cluster_obstacles(self, points):
        """
        Simple clustering algorithm to group nearby points into obstacles
        """
        if len(points) < 2:
            return []

        obstacles = []
        used = [False] * len(points)

        for i, point in enumerate(points):
            if used[i]:
                continue

            cluster = [point]
            used[i] = True

            # Find nearby points
            for j in range(i + 1, len(points)):
                if used[j]:
                    continue

                dist = math.sqrt((point[0] - points[j][0])**2 + (point[1] - points[j][1])**2)
                if dist < 0.5:  # 50cm threshold
                    cluster.append(points[j])
                    used[j] = True

            # Calculate obstacle center and size
            if len(cluster) > 2:  # Only consider clusters with multiple points
                center_x = sum(p[0] for p in cluster) / len(cluster)
                center_y = sum(p[1] for p in cluster) / len(cluster)
                size = len(cluster)
                obstacles.append((center_x, center_y, size))

        return obstacles

    def process_camera_data(self, image):
        """
        Process camera image for object detection
        """
        # Convert to grayscale for processing
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # Simple edge detection
        edges = cv2.Canny(gray, 50, 150)

        # Find contours (potential objects)
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        # Filter contours by size (remove noise)
        valid_contours = [c for c in contours if cv2.contourArea(c) > 100]

        # Draw contours on image for visualization
        result = image.copy()
        cv2.drawContours(result, valid_contours, -1, (0, 255, 0), 2)

        # Publish processed image or relevant information
        # For now, just log the number of detected objects
        self.get_logger().info(f'Detected {len(valid_contours)} objects in camera image')

    def process_imu_data(self, imu_msg):
        """
        Process IMU data for orientation and motion
        """
        # Extract orientation from quaternion
        orientation = imu_msg.orientation
        roll, pitch, yaw = self.quaternion_to_euler(
            orientation.x, orientation.y, orientation.z, orientation.w)

        # Extract angular velocity
        angular_vel = imu_msg.angular_velocity
        linear_acc = imu_msg.linear_acceleration

        # Check for unusual motion (possible fall detection)
        total_angular_vel = math.sqrt(angular_vel.x**2 + angular_vel.y**2 + angular_vel.z**2)
        total_linear_acc = math.sqrt(linear_acc.x**2 + linear_acc.y**2 + linear_acc.z**2)

        if total_angular_vel > 2.0:  # High rotation rate
            self.get_logger().warn(f'High angular velocity detected: {total_angular_vel}')

        if abs(total_linear_acc - 9.8) > 5.0:  # Significant deviation from gravity
            self.get_logger().warn(f'Unusual linear acceleration: {total_linear_acc}')

        # Log orientation for monitoring
        self.get_logger().info(f'Orientation - Roll: {roll:.2f}, Pitch: {pitch:.2f}, Yaw: {yaw:.2f}')

    def quaternion_to_euler(self, x, y, z, w):
        """
        Convert quaternion to Euler angles (roll, pitch, yaw)
        """
        # Roll (x-axis rotation)
        sinr_cosp = 2 * (w * x + y * z)
        cosr_cosp = 1 - 2 * (x * x + y * y)
        roll = math.atan2(sinr_cosp, cosr_cosp)

        # Pitch (y-axis rotation)
        sinp = 2 * (w * y - z * x)
        if abs(sinp) >= 1:
            pitch = math.copysign(math.pi / 2, sinp)  # Use 90 degrees if out of range
        else:
            pitch = math.asin(sinp)

        # Yaw (z-axis rotation)
        siny_cosp = 2 * (w * z + x * y)
        cosy_cosp = 1 - 2 * (y * y + z * z)
        yaw = math.atan2(siny_cosp, cosy_cosp)

        return roll, pitch, yaw

    def sensor_fusion_callback(self):
        """
        Main fusion callback that combines data from all sensors
        """
        current_time = self.get_clock().now()

        if self.lidar_data is not None and self.imu_data is not None:
            # Perform sensor fusion - example: combine LIDAR obstacle detection with IMU orientation
            self.perform_sensor_fusion()

        self.last_fusion_time = current_time

    def perform_sensor_fusion(self):
        """
        Perform actual sensor fusion to create unified perception
        """
        # Example fusion: combine LIDAR obstacle positions with robot orientation
        if self.lidar_data and self.imu_data:
            # Get robot orientation from IMU
            orientation = self.imu_data.orientation
            _, _, robot_yaw = self.quaternion_to_euler(
                orientation.x, orientation.y, orientation.z, orientation.w)

            # Process LIDAR data relative to robot orientation
            obstacle_count = sum(1 for r in self.lidar_data.ranges
                               if not (math.isnan(r) or math.isinf(r)) and r < 2.0)

            self.get_logger().info(f'Fusion result: {obstacle_count} obstacles within 2m, robot yaw: {robot_yaw:.2f}')

    def publish_obstacle_markers(self, obstacles):
        """
        Publish visualization markers for detected obstacles
        """
        marker_array = MarkerArray()

        for i, (x, y, size) in enumerate(obstacles):
            marker = Marker()
            marker.header.frame_id = "base_link"
            marker.header.stamp = self.get_clock().now().to_msg()
            marker.ns = "obstacles"
            marker.id = i
            marker.type = Marker.SPHERE
            marker.action = Marker.ADD

            # Position
            marker.pose.position.x = x
            marker.pose.position.y = y
            marker.pose.position.z = 0.0
            marker.pose.orientation.w = 1.0

            # Scale (size based on cluster size)
            scale_factor = min(0.5, size * 0.05)  # Scale with cluster size, max 0.5m
            marker.scale.x = scale_factor
            marker.scale.y = scale_factor
            marker.scale.z = 0.2

            # Color (red for obstacles)
            marker.color.r = 1.0
            marker.color.g = 0.0
            marker.color.b = 0.0
            marker.color.a = 0.8

            marker_array.markers.append(marker)

        self.obstacle_pub.publish(marker_array)

def main(args=None):
    rclpy.init(args=args)

    sensor_fusion_node = SensorFusionNode()

    try:
        rclpy.spin(sensor_fusion_node)
    except KeyboardInterrupt:
        pass
    finally:
        sensor_fusion_node.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()
```

## Hardware Context

### RTX Workstation Considerations

For sensor-rich humanoid robot simulation on RTX Workstations:

- **Camera Processing**: GPU acceleration for image processing and computer vision
- **LIDAR Simulation**: High-resolution scanning with realistic noise models
- **Multi-sensor Fusion**: Parallel processing of multiple sensor streams
- **Real-time Performance**: Balance sensor update rates with computational load

### Jetson Orin Kit Considerations

For edge-based sensor simulation:

- **Sensor Simplification**: Reduced resolution and update rates
- **Selective Simulation**: Focus on critical sensors for specific tasks
- **Efficient Processing**: Optimized algorithms for embedded deployment
- **Thermal Management**: Monitor temperature during intensive sensor processing

## Implementation Exercise

1. Update the humanoid robot URDF to include sensors:
   ```xml
   <!-- Add to ~/ros2_ws/src/gazebo_simulation_examples/urdf/humanoid_robot.urdf.xacro -->

   <!-- Already included in previous lesson's URDF -->
   <!-- The camera sensor was already added in the previous lesson -->
   ```

2. Create a sensor processing launch file:
   ```python
   # Save as ~/ros2_ws/src/gazebo_simulation_examples/launch/sensor_integration.launch.py
   from launch import LaunchDescription
   from launch.actions import IncludeLaunchDescription
   from launch.launch_description_sources import PythonLaunchDescriptionSource
   from launch.substitutions import PathJoinSubstitution
   from launch_ros.actions import Node
   from launch_ros.substitutions import FindPackageShare

   def generate_launch_description():
       # Launch Gazebo with a world that has some obstacles for sensor testing
       gazebo = IncludeLaunchDescription(
           PythonLaunchDescriptionSource([
               PathJoinSubstitution([
                   FindPackageShare('gazebo_ros'),
                   'launch',
                   'empty_world.launch.py'
               ])
           ])
       )

       # Launch robot state publisher with the sensor-equipped robot
       robot_state_publisher = Node(
           package='robot_state_publisher',
           executable='robot_state_publisher',
           name='robot_state_publisher',
           parameters=[{
               'robot_description':
                   f'$(find gazebo_simulation_examples)/urdf/humanoid_robot.urdf.xacro',
               'use_sim_time': True
           }]
       )

       # Launch the sensor fusion node
       sensor_fusion = Node(
           package='gazebo_simulation_examples',
           executable='sensor_fusion_node',
           name='sensor_fusion_node',
           output='screen'
       )

       return LaunchDescription([
           gazebo,
           robot_state_publisher,
           sensor_fusion
       ])
   ```

3. Build and test the sensor integration:
   ```bash
   cd ~/ros2_ws
   colcon build --packages-select gazebo_simulation_examples
   source install/setup.bash

   # Launch the sensor integration test
   ros2 launch gazebo_simulation_examples sensor_integration.launch.py
   ```

4. Monitor sensor topics:
   ```bash
   # Check available sensor topics
   ros2 topic list | grep -E "(scan|camera|imu|image)"

   # Echo sensor data
   ros2 topic echo /scan
   ros2 topic echo /imu
   ros2 topic echo /camera/image_raw --field data --field header.stamp
   ```

## Troubleshooting

- **Sensor Data Issues**: Verify plugin names and topic remappings
- **High CPU Usage**: Reduce sensor update rates or simplify models
- **Synchronization Problems**: Ensure proper timestamping and TF frames
- **Noise Calibration**: Adjust noise parameters to match real sensor characteristics

## Summary

This lesson covered the integration of various sensor types into Gazebo simulation for Physical AI and humanoid robotics applications. Proper sensor integration is essential for creating realistic Digital Twin environments that accurately reflect the capabilities and limitations of real-world sensors.

## Next Steps

In the next lesson, we'll explore implementing control systems in Gazebo with Python, focusing on how to develop and test control algorithms for humanoid robots in simulation.