---
sidebar_position: 3
---

# Week 2, Lesson 2: ROS 2 Architecture and Core Concepts (Nodes, Topics, Services)

## Objective

Understand the fundamental architectural components of ROS 2 including nodes, topics, services, and actions. Learn how these components enable communication and coordination in Physical AI and Humanoid Robotics applications.

## Theory

### ROS 2 Architecture Overview

ROS 2 (Robot Operating System 2) is built on a distributed architecture that allows multiple processes (nodes) to communicate with each other through a publish-subscribe model and request-response patterns. This architecture is essential for Physical AI systems where multiple sensors, controllers, and AI modules need to coordinate in real-time.

### Core Components

1. **Nodes**:
   - Processes that perform computation
   - The basic unit of computation in ROS 2
   - Each node runs independently and communicates with other nodes

2. **Topics**:
   - Named buses over which nodes exchange messages
   - Unidirectional, asynchronous communication
   - Multiple publishers can publish to the same topic
   - Multiple subscribers can subscribe to the same topic

3. **Services**:
   - Synchronous request/response communication
   - Bidirectional communication pattern
   - Request-response model where client sends request, server responds

4. **Actions**:
   - Asynchronous, goal-oriented communication
   - Similar to services but with feedback and status updates
   - Used for long-running tasks

### Communication Patterns in Physical AI

In Physical AI and Humanoid Robotics, these communication patterns enable:
- Sensor data distribution (topics)
- Control command execution (services/actions)
- Coordinated multi-robot behavior
- Real-time perception-action loops

## Hardware Context

This lesson applies to both:
- **Jetson Orin Kit**: For edge computing and real-time control
- **RTX Workstation**: For simulation, training, and complex AI processing

## Practical Example

Here's a Python example demonstrating nodes, topics, and services in ROS 2:

```python
# Publisher Node Example
import rclpy
from rclpy.node import Node
from std_msgs.msg import String

class SensorPublisher(Node):
    def __init__(self):
        super().__init__('sensor_publisher')
        self.publisher = self.create_publisher(String, 'sensor_data', 10)
        timer_period = 0.5  # seconds
        self.timer = self.create_timer(timer_period, self.timer_callback)
        self.i = 0

    def timer_callback(self):
        msg = String()
        msg.data = f'Sensor reading: {self.i}'
        self.publisher.publish(msg)
        self.get_logger().info(f'Publishing: "{msg.data}"')
        self.i += 1

# Subscriber Node Example
class DataSubscriber(Node):
    def __init__(self):
        super().__init__('data_subscriber')
        self.subscription = self.create_subscription(
            String,
            'sensor_data',
            self.listener_callback,
            10)
        self.subscription  # prevent unused variable warning

    def listener_callback(self, msg):
        self.get_logger().info(f'I heard: "{msg.data}"')

def main(args=None):
    rclpy.init(args=args)
    sensor_publisher = SensorPublisher()
    data_subscriber = DataSubscriber()

    try:
        # This would normally run in separate threads
        rclpy.spin(sensor_publisher)
    except KeyboardInterrupt:
        pass
    finally:
        sensor_publisher.destroy_node()
        data_subscriber.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()
```

## Summary

This lesson covered the fundamental architectural components of ROS 2 that enable communication in Physical AI and Humanoid Robotics systems. Understanding nodes, topics, and services is crucial for building distributed robotic applications that can coordinate multiple sensors, controllers, and AI modules.