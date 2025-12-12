---
sidebar_position: 9
prev:
  title: Week 7, Lesson 7 - ROS 2 Launch Systems and Complex Node Management
  url: /docs/chapter1/week-plan/week7-lesson7-ros2-launch-systems
next:
  title: Week 9, Lesson 9 - ROS 2 Security and Communication Protocols
  url: /docs/chapter1/week-plan/week9-lesson9-ros2-security-communication
---

# Week 8: ROS 2 Testing and Debugging

## Learning Objectives
By the end of this lesson, you will understand:
- Unit testing for ROS 2 nodes and components
- Integration testing for robot systems
- Debugging techniques and tools
- Performance profiling and optimization
- Logging and monitoring best practices

## Introduction to ROS 2 Testing

Testing is critical for humanoid robotics applications where safety and reliability are paramount. ROS 2 provides comprehensive testing frameworks for different levels of validation.

### Testing Hierarchy in Robotics

1. **Unit Testing**: Test individual functions and classes
2. **Integration Testing**: Test node interactions
3. **System Testing**: Test complete robot behaviors
4. **Acceptance Testing**: Validate against requirements

## Unit Testing with pytest

ROS 2 uses pytest for unit testing. Here's how to create effective tests:

```python
import pytest
import rclpy
from rclpy.node import Node
from std_msgs.msg import String
from sensor_msgs.msg import JointState
import threading
import time

class TestRobotController:
    @classmethod
    def setup_class(cls):
        """Set up for the entire test class."""
        rclpy.init()

    @classmethod
    def teardown_class(cls):
        """Tear down for the entire test class."""
        rclpy.shutdown()

    def setup_method(self):
        """Set up for each test method."""
        self.node = rclpy.create_node('test_robot_controller')
        self.executor = rclpy.executors.SingleThreadedExecutor()
        self.executor.add_node(self.node)

    def teardown_method(self):
        """Tear down for each test method."""
        self.node.destroy_node()

    def test_joint_state_publisher(self):
        """Test joint state publishing functionality."""
        received_messages = []

        def callback(msg):
            received_messages.append(msg)

        # Create subscriber
        sub = self.node.create_subscription(
            JointState,
            'joint_states',
            callback,
            10
        )

        # Create publisher and send test data
        pub = self.node.create_publisher(JointState, 'joint_states', 10)

        # Create test joint state
        joint_state = JointState()
        joint_state.name = ['joint1', 'joint2', 'joint3']
        joint_state.position = [0.0, 1.57, -0.5]
        joint_state.velocity = [0.0, 0.1, -0.05]
        joint_state.effort = [0.0, 10.0, -5.0]

        # Publish message
        pub.publish(joint_state)

        # Spin to process messages
        self.executor.spin_once(timeout_sec=1.0)

        # Verify received message
        assert len(received_messages) == 1
        assert received_messages[0].name == joint_state.name
        assert received_messages[0].position == joint_state.position

    def test_parameter_validation(self):
        """Test parameter validation logic."""
        # Test with valid parameters
        valid_params = {
            'max_velocity': 1.0,
            'min_position': -1.0,
            'max_position': 1.0
        }

        # Validate parameters (implement your validation logic)
        assert valid_params['max_velocity'] > 0
        assert valid_params['min_position'] < valid_params['max_position']

class MockRobotHardware:
    """Mock hardware for testing without real robot."""

    def __init__(self):
        self.joint_positions = [0.0, 0.0, 0.0]
        self.is_connected = False

    def connect(self):
        self.is_connected = True
        return True

    def get_joint_positions(self):
        return self.joint_positions

    def set_joint_positions(self, positions):
        self.joint_positions = positions
        return True

def test_with_mock_hardware():
    """Test using mock hardware."""
    mock_hw = MockRobotHardware()
    assert mock_hw.connect()
    assert mock_hw.is_connected

    # Test joint operations
    mock_hw.set_joint_positions([1.0, 2.0, 3.0])
    positions = mock_hw.get_joint_positions()
    assert positions == [1.0, 2.0, 3.0]
```

## Integration Testing

Integration tests verify that multiple nodes work together correctly:

```python
import unittest
from launch import LaunchDescription
from launch.actions import ExecuteProcess
from launch_testing.actions import ReadyToTest
from launch_testing_ros import LaunchTestService
import rclpy
from rclpy.executors import SingleThreadedExecutor
from std_msgs.msg import String
import pytest
import time

class TestRobotIntegration:
    def test_navigation_to_waypoint(self):
        """Integration test for navigation system."""
        rclpy.init()

        try:
            node = rclpy.create_node('integration_tester')
            executor = SingleThreadedExecutor()
            executor.add_node(node)

            # Create publishers and subscribers for testing
            goal_pub = node.create_publisher(String, 'navigation/goal', 10)
            status_sub = node.create_subscription(
                String, 'navigation/status', lambda msg: None, 10
            )

            # Send navigation goal
            goal_msg = String()
            goal_msg.data = "waypoint_1"
            goal_pub.publish(goal_msg)

            # Wait for response
            start_time = time.time()
            timeout = 10.0  # 10 second timeout

            while time.time() - start_time < timeout:
                executor.spin_once(timeout_sec=0.1)
                # Add logic to verify navigation completion
                # This would depend on your specific navigation system
                break  # Simplified for example

            # Cleanup
            node.destroy_node()
        finally:
            rclpy.shutdown()
```

## ROS 2 Debugging Tools

### 1. rqt Tools

```bash
# Various debugging tools available in rqt
ros2 run rqt_plot rqt_plot
ros2 run rqt_graph rqt_graph
ros2 run rqt_console rqt_console
ros2 run rqt_bag rqt_bag
```

### 2. Command Line Debugging

```bash
# Check node status
ros2 node list
ros2 node info <node_name>

# Check topic status
ros2 topic list
ros2 topic echo <topic_name>
ros2 topic info <topic_name>

# Check service status
ros2 service list
ros2 service call <service_name> <service_type> <request_data>
```

### 3. Python Debugging with Breakpoints

```python
import pdb
import rclpy
from rclpy.node import Node

class DebuggableRobotNode(Node):
    def __init__(self):
        super().__init__('debuggable_robot_node')
        self.subscription = self.create_subscription(
            String,
            'topic_name',
            self.listener_callback,
            10
        )

    def listener_callback(self, msg):
        # Set a breakpoint for debugging
        pdb.set_trace()  # This will pause execution

        # Process the message
        self.get_logger().info(f'Received: {msg.data}')

        # More processing logic here
        result = self.process_data(msg.data)
        self.publish_result(result)

    def process_data(self, data):
        # Complex processing logic
        return f"processed_{data}"

    def publish_result(self, result):
        # Publish result logic
        pass
```

## Performance Profiling

Monitor and optimize your ROS 2 nodes:

```python
import time
import functools
from rclpy.node import Node
import psutil
import os

def profile_function(func):
    """Decorator to profile function performance."""
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.perf_counter()
        start_memory = psutil.Process(os.getpid()).memory_info().rss / 1024 / 1024  # MB

        result = func(*args, **kwargs)

        end_time = time.perf_counter()
        end_memory = psutil.Process(os.getpid()).memory_info().rss / 1024 / 1024  # MB

        execution_time = end_time - start_time
        memory_used = end_memory - start_memory

        print(f"Function {func.__name__}:")
        print(f"  Execution time: {execution_time:.4f} seconds")
        print(f"  Memory used: {memory_used:.2f} MB")

        return result
    return wrapper

class PerformanceMonitoredNode(Node):
    def __init__(self):
        super().__init__('performance_monitored_node')

        # Monitor specific functions
        self.process_sensor_data = profile_function(self._process_sensor_data)

    @profile_function
    def _process_sensor_data(self, sensor_msg):
        """Process sensor data with performance monitoring."""
        # Simulate processing
        time.sleep(0.01)  # Simulated processing time
        return f"processed_{len(str(sensor_msg))}"

    def monitor_node_performance(self):
        """Monitor overall node performance."""
        process = psutil.Process(os.getpid())

        cpu_percent = process.cpu_percent()
        memory_mb = process.memory_info().rss / 1024 / 1024
        num_threads = process.num_threads()

        self.get_logger().info(
            f"Node Performance - CPU: {cpu_percent}%, "
            f"Memory: {memory_mb:.2f}MB, Threads: {num_threads}"
        )
```

## Logging Best Practices

Implement comprehensive logging for debugging:

```python
import rclpy
from rclpy.node import Node
from rclpy.logging import LoggingSeverity

class WellLoggedNode(Node):
    def __init__(self):
        super().__init__('well_logged_node')

        # Set up different logging levels
        self.get_logger().set_level(LoggingSeverity.INFO)

        # Log initialization
        self.get_logger().info("Node initialized successfully")
        self.get_logger().debug("Detailed initialization info")

        # Create publisher/subscriber
        self.publisher = self.create_publisher(String, 'output_topic', 10)
        self.subscription = self.create_subscription(
            String, 'input_topic', self.process_message, 10
        )

        # Log configuration
        self.declare_parameter('log_level', 'info')
        log_level = self.get_parameter('log_level').value
        self.get_logger().info(f"Configured with log level: {log_level}")

    def process_message(self, msg):
        """Process incoming message with proper logging."""
        try:
            self.get_logger().debug(f"Processing message: {msg.data}")

            # Validate input
            if not msg.data:
                self.get_logger().warn("Received empty message")
                return

            # Process the message
            result = self._internal_process(msg.data)

            # Publish result
            output_msg = String()
            output_msg.data = result
            self.publisher.publish(output_msg)

            self.get_logger().info(f"Processed message: {msg.data[:20]}...")

        except Exception as e:
            self.get_logger().error(f"Error processing message: {str(e)}")
            # Additional error handling logic

    def _internal_process(self, data):
        """Internal processing with detailed logging."""
        self.get_logger().debug(f"Internal processing: {data}")

        # Simulate processing
        result = data.upper()

        self.get_logger().debug(f"Internal processing result: {result}")
        return result
```

## Hardware Context: RTX Workstation & Jetson Orin

### Performance Monitoring for Different Platforms

```python
import subprocess
import json

def get_gpu_status():
    """Get GPU status for RTX Workstation or Jetson Orin."""
    try:
        # For RTX Workstation (NVIDIA GPU)
        result = subprocess.run(['nvidia-smi', '--query-gpu=memory.used,memory.total,utilization.gpu',
                                '--format=csv,noheader,nounits'],
                               capture_output=True, text=True)
        if result.returncode == 0:
            gpu_info = result.stdout.strip().split(', ')
            memory_used = int(gpu_info[0])
            memory_total = int(gpu_info[1])
            gpu_util = int(gpu_info[2])

            return {
                'type': 'RTX',
                'memory_used': memory_used,
                'memory_total': memory_total,
                'gpu_utilization': gpu_util
            }
    except FileNotFoundError:
        pass  # nvidia-smi not available

    try:
        # For Jetson Orin
        result = subprocess.run(['nvpmodel', '-q'], capture_output=True, text=True)
        if result.returncode == 0:
            return {
                'type': 'Jetson',
                'status': result.stdout.strip()
            }
    except FileNotFoundError:
        pass

    return {'type': 'Unknown', 'status': 'GPU monitoring not available'}

class HardwareAwareNode(Node):
    def __init__(self):
        super().__init__('hardware_aware_node')

        # Get hardware information
        self.gpu_info = get_gpu_status()
        self.get_logger().info(f"Detected hardware: {self.gpu_info['type']}")

        # Set parameters based on hardware
        if self.gpu_info['type'] == 'RTX':
            self.processing_threads = 8
            self.gpu_enabled = True
        elif self.gpu_info['type'] == 'Jetson':
            self.processing_threads = 4
            self.gpu_enabled = True
        else:
            self.processing_threads = 2
            self.gpu_enabled = False

    def log_hardware_status(self):
        """Log current hardware status."""
        gpu_status = get_gpu_status()
        self.get_logger().info(f"GPU Status: {gpu_status}")

        # Log system resources
        cpu_percent = psutil.cpu_percent()
        memory_percent = psutil.virtual_memory().percent
        self.get_logger().info(f"CPU: {cpu_percent}%, Memory: {memory_percent}%")
```

## Summary

Testing and debugging are essential for reliable humanoid robotics systems. The ROS 2 ecosystem provides comprehensive tools for unit testing, integration testing, performance profiling, and debugging to ensure your robot systems work correctly.

## Exercises

1. Write unit tests for a joint controller node
2. Create an integration test for a complete navigation pipeline
3. Implement performance monitoring for a perception node
4. Add comprehensive logging to your existing nodes
5. Use rqt tools to debug a multi-node system