---
sidebar_position: 3
prev:
  title: Week 14, Lesson 1 - Introduction to Gazebo and Simulation Concepts
  url: /docs/chapter2/week-plan/week14-lesson1-introduction-gazebo-simulation
next:
  title: Week 16, Lesson 3 - Creating Robot Models in Gazebo
  url: /docs/chapter2/week-plan/week16-lesson3-creating-robot-models-gazebo
---

# Setting up Gazebo Environment with ROS 2 Integration

## Learning Objectives

By the end of this lesson, you will be able to:
- Install and configure Gazebo with ROS 2 integration
- Launch Gazebo worlds with ROS 2 communication bridges
- Configure robot models for simulation in Gazebo
- Test basic communication between ROS 2 nodes and Gazebo

## Overview

Setting up a properly configured Gazebo environment with ROS 2 integration is crucial for effective simulation-driven development of Physical AI and humanoid robotics applications. This lesson guides you through the installation, configuration, and initial testing of the Gazebo-ROS 2 ecosystem, establishing the foundation for all subsequent simulation work.

## Prerequisites

Before setting up Gazebo with ROS 2 integration, ensure you have:

- ROS 2 Humble Hawksbill (or latest LTS version) installed
- Gazebo Garden (or compatible version for your ROS 2 distribution)
- Basic understanding of ROS 2 concepts (topics, services, nodes)
- Appropriate hardware (RTX Workstation recommended for complex simulations)

## Installation Process

### Installing Gazebo with ROS 2

On Ubuntu with ROS 2 Humble:

```bash
# Update package lists
sudo apt update

# Install Gazebo Garden
sudo apt install gazebo-garden

# Install ROS 2 Gazebo packages
sudo apt install ros-humble-gazebo-ros ros-humble-gazebo-ros-pkgs ros-humble-gazebo-plugins ros-humble-gazebo-dev

# Install additional useful packages
sudo apt install ros-humble-joint-state-publisher ros-humble-robot-state-publisher ros-humble-xacro
```

### Verifying Installation

Test that Gazebo launches correctly:

```bash
# Launch Gazebo standalone
gazebo

# Launch Gazebo with ROS 2 bridge
ros2 launch gazebo_ros empty_world.launch.py
```

## ROS 2 Integration Components

### Gazebo ROS Packages

The key components for ROS 2 integration include:

- **gazebo_ros**: Core ROS 2 plugins and launch files
- **gazebo_plugins**: Specific plugins for ROS 2 communication
- **gazebo_dev**: Development headers and libraries
- **gazebo_msgs**: ROS 2 message definitions for Gazebo

### Communication Bridge

The Gazebo-ROS 2 bridge enables:
- Publishing sensor data to ROS 2 topics
- Subscribing to ROS 2 topics for actuator control
- Service calls for simulation control
- TF (Transform) broadcasting for robot state

## Python/ROS 2 Code Example

Here's a complete example of setting up a Gazebo environment with ROS 2 integration:

```python
#!/usr/bin/env python3

import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist
from sensor_msgs.msg import LaserScan
from nav_msgs.msg import Odometry
from tf2_ros import TransformBroadcaster
import math

class GazeboROS2Controller(Node):
    """
    Advanced Gazebo controller demonstrating ROS 2 integration
    Includes obstacle avoidance and odometry publishing
    """

    def __init__(self):
        super().__init__('gazebo_ros2_controller')

        # Publishers
        self.cmd_vel_pub = self.create_publisher(Twist, '/cmd_vel', 10)
        self.odom_pub = self.create_publisher(Odometry, '/odom', 10)

        # Subscribers
        self.laser_sub = self.create_subscription(
            LaserScan, '/scan', self.laser_callback, 10)
        self.odom_sub = self.create_subscription(
            Odometry, '/odom', self.odom_callback, 10)

        # Transform broadcaster for robot state
        self.tf_broadcaster = TransformBroadcaster(self)

        # Robot state variables
        self.x = 0.0
        self.y = 0.0
        self.theta = 0.0
        self.linear_velocity = 0.0
        self.angular_velocity = 0.0

        # Timer for control loop
        self.timer = self.create_timer(0.1, self.control_loop)

        self.get_logger().info('Gazebo ROS 2 Controller initialized')

    def laser_callback(self, msg):
        """
        Process laser scan data from Gazebo simulation
        """
        # Find minimum distance in front of robot (±30 degrees)
        front_ranges = msg.ranges[330:30] + msg.ranges[330:360]  # Wrap around
        min_front_dist = min(front_ranges) if front_ranges else float('inf')

        # Simple obstacle avoidance
        if min_front_dist < 1.0:
            self.get_logger().info(f'Obstacle ahead at {min_front_dist:.2f}m')
            # Implement obstacle avoidance logic
            self.avoid_obstacle(min_front_dist)
        else:
            # Move forward if path is clear
            self.linear_velocity = 0.5
            self.angular_velocity = 0.0

    def odom_callback(self, msg):
        """
        Update robot pose from Gazebo odometry
        """
        self.x = msg.pose.pose.position.x
        self.y = msg.pose.pose.position.y

        # Extract orientation from quaternion
        quat = msg.pose.pose.orientation
        self.theta = math.atan2(2.0 * (quat.w * quat.z + quat.x * quat.y),
                               1.0 - 2.0 * (quat.y * quat.y + quat.z * quat.z))

    def avoid_obstacle(self, distance):
        """
        Simple obstacle avoidance behavior
        """
        if distance < 0.5:
            # Stop and turn
            self.linear_velocity = 0.0
            self.angular_velocity = 0.8  # Turn right
        elif distance < 1.0:
            # Slow down and prepare to turn
            self.linear_velocity = 0.2
            self.angular_velocity = 0.3

    def control_loop(self):
        """
        Main control loop - publishes velocity commands
        """
        # Create and publish velocity command
        twist_msg = Twist()
        twist_msg.linear.x = self.linear_velocity
        twist_msg.angular.z = self.angular_velocity

        self.cmd_vel_pub.publish(twist_msg)

        # Publish odometry (for systems that don't get it from Gazebo)
        odom_msg = Odometry()
        odom_msg.header.stamp = self.get_clock().now().to_msg()
        odom_msg.header.frame_id = 'odom'
        odom_msg.child_frame_id = 'base_link'

        odom_msg.pose.pose.position.x = self.x
        odom_msg.pose.pose.position.y = self.y
        odom_msg.pose.pose.position.z = 0.0

        # Convert theta to quaternion
        from geometry_msgs.msg import Quaternion
        odom_quat = Quaternion()
        odom_quat.x = 0.0
        odom_quat.y = 0.0
        odom_quat.z = math.sin(self.theta / 2.0)
        odom_quat.w = math.cos(self.theta / 2.0)

        odom_msg.pose.pose.orientation = odom_quat
        odom_msg.twist.twist.linear.x = self.linear_velocity
        odom_msg.twist.twist.angular.z = self.angular_velocity

        self.odom_pub.publish(odom_msg)

def main(args=None):
    rclpy.init(args=args)

    controller = GazeboROS2Controller()

    try:
        rclpy.spin(controller)
    except KeyboardInterrupt:
        pass
    finally:
        controller.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()
```

## Launch File Configuration

Create a launch file to bring up your simulation environment:

```xml
<!-- gazebo_simulation_examples/launch/gazebo_ros2_setup.launch.py -->
from launch import LaunchDescription
from launch.actions import IncludeLaunchDescription
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch.substitutions import PathJoinSubstitution
from launch_ros.actions import Node
from launch_ros.substitutions import FindPackageShare

def generate_launch_description():
    # Launch Gazebo with empty world
    gazebo = IncludeLaunchDescription(
        PythonLaunchDescriptionSource([
            PathJoinSubstitution([
                FindPackageShare('gazebo_ros'),
                'launch',
                'empty_world.launch.py'
            ])
        ]),
        launch_arguments={
            'world': PathJoinSubstitution([
                FindPackageShare('gazebo_simulation_examples'),
                'worlds',
                'simple_room.world'
            ])
        }.items()
    )

    # Launch your robot controller node
    robot_controller = Node(
        package='gazebo_simulation_examples',
        executable='gazebo_ros2_controller',
        name='gazebo_ros2_controller',
        output='screen'
    )

    # Launch robot state publisher for TF
    robot_state_publisher = Node(
        package='robot_state_publisher',
        executable='robot_state_publisher',
        name='robot_state_publisher',
        parameters=[{'use_sim_time': True}]
    )

    return LaunchDescription([
        gazebo,
        robot_state_publisher,
        robot_controller
    ])
```

## Hardware Context

### RTX Workstation Setup

For optimal Gazebo simulation with ROS 2 integration:

- **GPU Acceleration**: Ensure NVIDIA drivers are properly installed with CUDA support
- **Physics Engine**: Configure ODE or Bullet physics for optimal performance
- **Rendering**: Enable GPU-accelerated rendering for complex environments
- **Memory Management**: Allocate sufficient RAM for complex robot models and environments

### Jetson Orin Kit Considerations

For edge-based simulation testing:

- Use simplified robot models and environments
- Reduce physics update rates
- Limit sensor complexity and update frequencies
- Monitor thermal management during extended simulation runs

## Implementation Exercise

1. Create the launch file in your package:
   ```bash
   mkdir -p ~/ros2_ws/src/gazebo_simulation_examples/launch
   # Create the launch file content above in ~/ros2_ws/src/gazebo_simulation_examples/launch/gazebo_ros2_setup.launch.py
   ```

2. Create a simple world file:
   ```bash
   mkdir -p ~/ros2_ws/src/gazebo_simulation_examples/worlds
   # Create a simple world file in ~/ros2_ws/src/gazebo_simulation_examples/worlds/simple_room.world
   ```

3. Build and test the setup:
   ```bash
   cd ~/ros2_ws
   colcon build --packages-select gazebo_simulation_examples
   source install/setup.bash

   # Launch the complete simulation environment
   ros2 launch gazebo_simulation_examples gazebo_ros2_setup.launch.py
   ```

## Troubleshooting

- **Connection issues**: Ensure GAZEBO_MASTER_URI and ROS_DOMAIN_ID are properly set
- **Performance problems**: Check GPU drivers and consider reducing physics complexity
- **TF errors**: Verify robot model URDF and joint configurations
- **Topic mismatches**: Confirm topic names match between Gazebo plugins and ROS 2 nodes

## Summary

This lesson established a complete Gazebo-ROS 2 integration environment, including installation, configuration, and basic communication patterns. The foundation is now set for more advanced simulation tasks with Physical AI and humanoid robotics.

## Next Steps

In the next lesson, we'll explore creating robot models for simulation in Gazebo, including URDF design and configuration for humanoid robots.