---
sidebar_position: 4
prev:
  title: Week 2, Lesson 2 - ROS 2 Architecture and Core Concepts
  url: /docs/chapter1/week-plan/week2-lesson2-ros2-architecture
next:
  title: Week 4, Lesson 4 - Understanding URDF
  url: /docs/chapter1/week-plan/week4-lesson4-understanding-urdf
---

# Week 3, Lesson 3: Bridging Python Agents to ROS controllers using `rclpy`

## Objective

Learn how to bridge Python-based AI agents with ROS controllers using the `rclpy` library. Understand the integration patterns that enable intelligent decision-making in Physical AI and Humanoid Robotics applications.

## Theory

### Python AI Agents in Robotics

Python AI agents are essential components in modern robotics, providing capabilities such as:
- Machine learning inference
- Path planning and navigation
- Decision making and control logic
- Sensor fusion and perception

### rclpy Library

`rclpy` is the Python client library for ROS 2, providing:
- Node creation and management
- Publisher and subscriber functionality
- Service and action clients/servers
- Parameter management
- Time and duration utilities

### Bridging Architecture

The bridge between Python AI agents and ROS controllers involves:
1. **Data Ingestion**: Receiving sensor data from ROS topics
2. **AI Processing**: Running inference or decision-making algorithms
3. **Control Output**: Publishing commands to ROS controllers
4. **Feedback Loop**: Implementing closed-loop control systems

## Hardware Context

This lesson applies to both:
- **Jetson Orin Kit**: For edge computing and real-time AI processing
- **RTX Workstation**: For complex AI model inference and training

## Practical Example

Here's a Python example demonstrating how to bridge an AI agent with ROS controllers:

```python
import rclpy
from rclpy.node import Node
from sensor_msgs.msg import LaserScan
from geometry_msgs.msg import Twist
from nav_msgs.msg import Odometry
import numpy as np
import tensorflow as tf  # Example AI framework

class AIAgentBridge(Node):
    def __init__(self):
        super().__init__('ai_agent_bridge')

        # Subscribe to sensor data
        self.scan_subscription = self.create_subscription(
            LaserScan,
            'scan',
            self.scan_callback,
            10)

        self.odom_subscription = self.create_subscription(
            Odometry,
            'odom',
            self.odom_callback,
            10)

        # Publisher for velocity commands
        self.cmd_vel_publisher = self.create_publisher(Twist, 'cmd_vel', 10)

        # Initialize AI model (example placeholder)
        self.ai_model = self.initialize_ai_model()

        # State variables
        self.current_scan = None
        self.current_odom = None
        self.ai_control_timer = self.create_timer(0.1, self.ai_control_callback)

    def initialize_ai_model(self):
        """Initialize the AI model for decision making"""
        # This would load a trained model in practice
        # For example: a neural network for navigation decisions
        self.get_logger().info('AI model initialized')
        return "dummy_model"

    def scan_callback(self, msg):
        """Process laser scan data"""
        self.current_scan = msg.ranges
        self.get_logger().debug(f'Received scan with {len(msg.ranges)} ranges')

    def odom_callback(self, msg):
        """Process odometry data"""
        self.current_odom = {
            'x': msg.pose.pose.position.x,
            'y': msg.pose.pose.position.y,
            'theta': self.quaternion_to_yaw(msg.pose.pose.orientation)
        }
        self.get_logger().debug(f'Received odometry: {self.current_odom}')

    def quaternion_to_yaw(self, orientation):
        """Convert quaternion to yaw angle"""
        import math
        siny_cosp = 2 * (orientation.w * orientation.z + orientation.x * orientation.y)
        cosy_cosp = 1 - 2 * (orientation.y * orientation.y + orientation.z * orientation.z)
        return math.atan2(siny_cosp, cosy_cosp)

    def ai_control_callback(self):
        """Main AI control loop"""
        if self.current_scan is None or self.current_odom is None:
            return

        # Prepare input for AI model
        ai_input = self.prepare_ai_input()

        # Get AI decision (in practice, this would call your model)
        control_output = self.make_ai_decision(ai_input)

        # Publish control command
        cmd_msg = Twist()
        cmd_msg.linear.x = control_output['linear_vel']
        cmd_msg.angular.z = control_output['angular_vel']
        self.cmd_vel_publisher.publish(cmd_msg)

        self.get_logger().info(f'AI Command: linear={cmd_msg.linear.x}, angular={cmd_msg.angular.z}')

    def prepare_ai_input(self):
        """Prepare sensor data for AI processing"""
        # Combine scan and odometry data
        scan_data = list(self.current_scan[:360:10]) if len(self.current_scan) > 360 else list(self.current_scan)
        odom_data = [self.current_odom['x'], self.current_odom['y'], self.current_odom['theta']]

        return {
            'scan': scan_data,
            'odom': odom_data
        }

    def make_ai_decision(self, ai_input):
        """Make decision using AI model (placeholder implementation)"""
        # In a real implementation, this would call your AI model
        # For this example, we'll implement a simple obstacle avoidance
        min_scan = min(ai_input['scan']) if ai_input['scan'] else float('inf')

        if min_scan < 0.5:  # Obstacle detected within 0.5m
            # Turn away from obstacle
            return {'linear_vel': 0.0, 'angular_vel': 0.5}
        else:
            # Move forward
            return {'linear_vel': 0.2, 'angular_vel': 0.0}

def main(args=None):
    rclpy.init(args=args)
    ai_agent_bridge = AIAgentBridge()

    try:
        rclpy.spin(ai_agent_bridge)
    except KeyboardInterrupt:
        pass
    finally:
        ai_agent_bridge.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()
```

## Summary

This lesson demonstrated how to bridge Python AI agents with ROS controllers using `rclpy`. The integration enables intelligent decision-making in Physical AI and Humanoid Robotics by combining AI capabilities with ROS's distributed architecture. This pattern is fundamental for creating autonomous robotic systems.