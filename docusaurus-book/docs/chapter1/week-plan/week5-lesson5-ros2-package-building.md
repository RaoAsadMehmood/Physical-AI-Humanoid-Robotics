---
sidebar_position: 6
prev:
  title: Week 4, Lesson 4 - Understanding URDF (Unified Robot Description Format) for humanoids
  url: /docs/chapter1/week-plan/week4-lesson4-understanding-urdf
next:
  title: Week 6, Lesson 6 - Advanced ROS 2 Actions, Services and Communication Patterns
  url: /docs/chapter1/week-plan/week6-lesson6-ros2-actions-services-advanced
---

# Week 5, Lesson 5: Practical ROS 2 Package Building with Python

## Objective

Learn to create, structure, and build ROS 2 packages using Python. Understand the package ecosystem, build system, and best practices for developing modular and reusable robotics software components.

## Theory

### ROS 2 Package Structure

A ROS 2 package typically contains:
- **package.xml**: Package manifest with metadata and dependencies
- **setup.py**: Python package setup configuration
- **setup.cfg**: Installation configuration
- **CMakeLists.txt**: Build configuration for C++ packages (optional for Python-only)
- **src/**: Source code directory
- **launch/**: Launch files for starting nodes
- **config/**: Configuration files
- **test/**: Unit and integration tests

### Python Package Integration

ROS 2 packages can include Python modules that:
- Implement ROS nodes
- Provide utility functions
- Define custom message types
- Contain shared algorithms and data structures

### Build System (Colcon)

Colcon is the build system used in ROS 2:
- Builds packages in dependency order
- Supports multiple build systems (ament_cmake, ament_python, etc.)
- Handles both C++ and Python packages
- Creates install spaces for runtime execution

## Hardware Context

This lesson applies to both:
- **Jetson Orin Kit**: For building and deploying packages on edge hardware
- **RTX Workstation**: For development and testing of packages

## Practical Example

Here's a complete example of creating a ROS 2 Python package for Physical AI applications:

### 1. package.xml
```xml
<?xml version="1.0"?>
<?xml-model href="http://download.ros.org/schema/package_format3.xsd" schematypens="http://www.w3.org/2001/XMLSchema"?>
<package format="3">
  <name>physical_ai_examples</name>
  <version>0.0.0</version>
  <description>Examples for Physical AI & Humanoid Robotics</description>
  <maintainer email="user@example.com">User</maintainer>
  <license>Apache-2.0</license>

  <test_depend>ament_copyright</test_depend>
  <test_depend>ament_flake8</test_depend>
  <test_depend>ament_pep257</test_depend>
  <test_depend>python3-pytest</test_depend>

  <depend>rclpy</depend>
  <depend>std_msgs</depend>
  <depend>sensor_msgs</depend>
  <depend>geometry_msgs</depend>

  <export>
    <build_type>ament_python</build_type>
  </export>
</package>
```

### 2. setup.py
```python
from setuptools import setup
import os
from glob import glob

package_name = 'physical_ai_examples'

setup(
    name=package_name,
    version='0.0.0',
    packages=[package_name],
    data_files=[
        ('share/ament_index/resource_index/packages',
            ['resource/' + package_name]),
        ('share/' + package_name, ['package.xml']),
        # Include all launch files
        (os.path.join('share', package_name, 'launch'), glob('launch/*launch.[pxy][yma]*')),
    ],
    install_requires=['setuptools'],
    zip_safe=True,
    maintainer='User',
    maintainer_email='user@example.com',
    description='Examples for Physical AI & Humanoid Robotics',
    license='Apache-2.0',
    tests_require=['pytest'],
    entry_points={
        'console_scripts': [
            'sensor_publisher = physical_ai_examples.sensor_publisher:main',
            'ai_controller = physical_ai_examples.ai_controller:main',
            'data_processor = physical_ai_examples.data_processor:main',
        ],
    },
)
```

### 3. Main Python Package Structure
```python
# physical_ai_examples/__init__.py
"""
Physical AI & Humanoid Robotics Examples Package
"""
__version__ = "0.0.0"

from .sensor_publisher import SensorPublisher
from .ai_controller import AIController
from .data_processor import DataProcessor

__all__ = [
    'SensorPublisher',
    'AIController',
    'DataProcessor'
]
```

### 4. Sensor Publisher Node
```python
# physical_ai_examples/sensor_publisher.py
import rclpy
from rclpy.node import Node
from sensor_msgs.msg import LaserScan
from std_msgs.msg import Float32
import random
import math

class SensorPublisher(Node):
    def __init__(self):
        super().__init__('sensor_publisher')

        # Create publishers
        self.scan_publisher = self.create_publisher(LaserScan, 'scan', 10)
        self.distance_publisher = self.create_publisher(Float32, 'distance_to_obstacle', 10)

        # Timer for publishing data
        self.timer = self.create_timer(0.1, self.publish_sensor_data)

        # Initialize sensor parameters
        self.angle_min = -math.pi / 2
        self.angle_max = math.pi / 2
        self.angle_increment = math.pi / 180  # 1 degree increments
        self.scan_time = 0.1
        self.range_min = 0.1
        self.range_max = 10.0

        self.get_logger().info('Sensor Publisher Node Started')

    def publish_sensor_data(self):
        # Create and populate LaserScan message
        scan_msg = LaserScan()
        scan_msg.header.stamp = self.get_clock().now().to_msg()
        scan_msg.header.frame_id = 'laser_frame'
        scan_msg.angle_min = self.angle_min
        scan_msg.angle_max = self.angle_max
        scan_msg.angle_increment = self.angle_increment
        scan_msg.scan_time = self.scan_time
        scan_msg.range_min = self.range_min
        scan_msg.range_max = self.range_max

        # Generate simulated sensor data
        num_readings = int((self.angle_max - self.angle_min) / self.angle_increment) + 1
        scan_msg.ranges = []

        for i in range(num_readings):
            # Simulate distance with some noise
            distance = 2.0 + random.uniform(-0.5, 0.5)  # 2m average with noise
            scan_msg.ranges.append(distance)

        # Publish the scan
        self.scan_publisher.publish(scan_msg)

        # Find minimum distance for obstacle detection
        min_distance = min(scan_msg.ranges) if scan_msg.ranges else float('inf')
        distance_msg = Float32()
        distance_msg.data = min_distance
        self.distance_publisher.publish(distance_msg)

        self.get_logger().debug(f'Published scan with {len(scan_msg.ranges)} readings, min distance: {min_distance:.2f}m')

def main(args=None):
    rclpy.init(args=args)
    sensor_publisher = SensorPublisher()

    try:
        rclpy.spin(sensor_publisher)
    except KeyboardInterrupt:
        pass
    finally:
        sensor_publisher.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()
```

### 5. AI Controller Node
```python
# physical_ai_examples/ai_controller.py
import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist
from std_msgs.msg import Float32
import math

class AIController(Node):
    def __init__(self):
        super().__init__('ai_controller')

        # Create subscribers
        self.distance_subscriber = self.create_subscription(
            Float32,
            'distance_to_obstacle',
            self.distance_callback,
            10
        )

        # Create publisher for velocity commands
        self.cmd_vel_publisher = self.create_publisher(Twist, 'cmd_vel', 10)

        # Timer for control loop
        self.control_timer = self.create_timer(0.05, self.control_loop)

        # State variables
        self.distance_to_obstacle = float('inf')
        self.linear_velocity = 0.0
        self.angular_velocity = 0.0

        self.get_logger().info('AI Controller Node Started')

    def distance_callback(self, msg):
        self.distance_to_obstacle = msg.data

    def control_loop(self):
        # Simple AI control logic
        if self.distance_to_obstacle < 0.5:  # Too close to obstacle
            # Stop and turn
            self.linear_velocity = 0.0
            self.angular_velocity = 0.5  # Turn right
        elif self.distance_to_obstacle < 1.0:  # Getting close
            # Slow down and turn slightly
            self.linear_velocity = 0.1
            self.angular_velocity = 0.2
        else:  # Safe distance
            # Move forward
            self.linear_velocity = 0.3
            self.angular_velocity = 0.0

        # Publish velocity command
        cmd_msg = Twist()
        cmd_msg.linear.x = self.linear_velocity
        cmd_msg.angular.z = self.angular_velocity
        self.cmd_vel_publisher.publish(cmd_msg)

        self.get_logger().info(f'AI Command: v={self.linear_velocity:.2f}, w={self.angular_velocity:.2f}')

def main(args=None):
    rclpy.init(args=args)
    ai_controller = AIController()

    try:
        rclpy.spin(ai_controller)
    except KeyboardInterrupt:
        pass
    finally:
        ai_controller.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()
```

### 6. Launch File
```xml
<!-- launch/physical_ai_demo.launch.py -->
from launch import LaunchDescription
from launch_ros.actions import Node

def generate_launch_description():
    return LaunchDescription([
        Node(
            package='physical_ai_examples',
            executable='sensor_publisher',
            name='sensor_publisher',
            output='screen',
        ),
        Node(
            package='physical_ai_examples',
            executable='ai_controller',
            name='ai_controller',
            output='screen',
        ),
    ])
```

### 7. Build and Install Commands

```bash
# Build the package
colcon build --packages-select physical_ai_examples

# Source the workspace
source install/setup.bash

# Run the nodes
ros2 run physical_ai_examples sensor_publisher
ros2 run physical_ai_examples ai_controller

# Or launch with launch file
ros2 launch physical_ai_examples physical_ai_demo.launch.py
```

## Summary

This lesson covered the practical aspects of building ROS 2 packages with Python. Understanding package structure, build systems, and best practices is essential for creating modular, maintainable, and reusable robotics software. Properly structured packages enable effective development workflows in Physical AI and Humanoid Robotics projects.