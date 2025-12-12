---
sidebar_position: 11
prev:
  title: Week 9, Lesson 9 - ROS 2 Security and Communication Protocols
  url: /docs/chapter1/week-plan/week9-lesson9-ros2-security-communication
next:
  title: Chapter 2 - Gazebo - The Digital Twin
  url: /docs/chapter2/
---

# Week 10: ROS 2 Real-Time Performance and Optimization

## Learning Objectives
By the end of this lesson, you will understand:
- Real-time systems concepts in robotics
- ROS 2 performance optimization techniques
- CPU and memory management for robotics
- Real-time scheduling and priorities
- Performance monitoring and profiling
- Hardware-specific optimization strategies

## Introduction to Real-Time Systems in Robotics

Real-time performance is crucial for humanoid robotics where timing constraints can affect safety, stability, and user experience. Understanding real-time concepts helps ensure your robot systems respond predictably.

### Hard vs Soft Real-Time Systems

- **Hard Real-Time**: Missing deadlines causes system failure (e.g., safety-critical control loops)
- **Soft Real-Time**: Missing deadlines degrades performance but doesn't cause failure (e.g., perception processing)

## Real-Time Scheduling in ROS 2

### 1. Linux Real-Time Configuration

```python
import os
import subprocess
import rclpy
from rclpy.node import Node
from rclpy.qos import QoSProfile
import threading
import time

class RealTimeNode(Node):
    def __init__(self):
        super().__init__('real_time_node')

        # Set up QoS for real-time communication
        self.rt_qos = QoSProfile(depth=1, reliability=1)  # RELIABLE

        # Publishers for different priority levels
        self.critical_pub = self.create_publisher(Float64, 'critical_control', self.rt_qos)
        self.normal_pub = self.create_publisher(Float64, 'normal_data', 10)

        # Configure real-time thread
        self.setup_realtime_thread()

    def setup_realtime_thread(self):
        """Set up a real-time thread for critical operations."""
        # Create a thread for critical operations
        self.rt_thread = threading.Thread(target=self.critical_loop, daemon=True)
        self.rt_thread.start()

    def critical_loop(self):
        """Critical real-time loop with high priority."""
        # Set thread to real-time priority (requires proper system setup)
        try:
            import os
            import ctypes
            from ctypes import c_int, c_ulong, POINTER

            # This is a simplified example - real implementation would use proper RT setup
            self.get_logger().info("Starting critical real-time loop")

            loop_rate = self.create_rate(100)  # 100 Hz for critical control
            while rclpy.ok():
                # Critical real-time operations
                self.perform_critical_control()
                loop_rate.sleep()

        except Exception as e:
            self.get_logger().error(f"Real-time loop error: {e}")

    def perform_critical_control(self):
        """Perform critical control operations."""
        # Example: Joint position control with strict timing
        current_time = self.get_clock().now()
        control_signal = self.calculate_control_signal()

        msg = Float64()
        msg.data = control_signal
        self.critical_pub.publish(msg)

def set_realtime_priority():
    """Helper function to set real-time priority (Linux)."""
    try:
        # Requires proper system setup and permissions
        import ctypes
        import ctypes.util

        # Load libc
        libc = ctypes.CDLL(ctypes.util.find_library("c"))

        # Set scheduling policy to SCHED_FIFO with high priority
        SCHED_FIFO = 1
        param = ctypes.c_int(80)  # Priority 80 (0-99 for real-time)

        result = libc.sched_setscheduler(0, SCHED_FIFO, ctypes.byref(param))
        if result == 0:
            print("Real-time priority set successfully")
        else:
            print("Failed to set real-time priority")

    except Exception as e:
        print(f"Error setting real-time priority: {e}")
```

### 2. Real-Time Capable Nodes

```python
import rclpy
from rclpy.node import Node
from rclpy.callback_groups import MutuallyExclusiveCallbackGroup
from rclpy.executors import MultiThreadedExecutor
import threading
import time
from collections import deque

class RealTimeControllerNode(Node):
    def __init__(self):
        super().__init__('real_time_controller')

        # Create separate callback groups for different priorities
        self.critical_group = MutuallyExclusiveCallbackGroup()
        self.normal_group = MutuallyExclusiveCallbackGroup()

        # Critical control publisher (high frequency)
        self.control_pub = self.create_publisher(Float64MultiArray, 'joint_control', 1)

        # Sensor subscriber with high priority callback
        self.sensor_sub = self.create_subscription(
            JointState, 'joint_states', self.sensor_callback,
            10, callback_group=self.critical_group
        )

        # Performance monitoring
        self.control_timing = deque(maxlen=100)
        self.last_control_time = time.time()

        # Create timers for different control loops
        self.critical_timer = self.create_timer(
            0.01,  # 100 Hz - critical control
            self.critical_control_loop,
            callback_group=self.critical_group
        )

        self.normal_timer = self.create_timer(
            0.1,   # 10 Hz - normal operations
            self.normal_control_loop,
            callback_group=self.normal_group
        )

    def sensor_callback(self, msg):
        """High-priority sensor callback."""
        # Process sensor data immediately
        self.last_sensor_data = msg
        self.process_sensor_data(msg)

    def critical_control_loop(self):
        """Critical control loop running at high frequency."""
        start_time = time.time()

        # Perform critical control calculations
        control_commands = self.compute_control_commands()

        # Publish control commands
        control_msg = Float64MultiArray()
        control_msg.data = control_commands
        self.control_pub.publish(control_msg)

        # Monitor timing
        end_time = time.time()
        execution_time = end_time - start_time
        self.control_timing.append(execution_time)

        # Log timing if exceeding threshold
        if execution_time > 0.008:  # 8ms threshold for 100Hz loop
            self.get_logger().warn(f"Control loop exceeded timing: {execution_time:.4f}s")

    def normal_control_loop(self):
        """Normal control loop for less time-critical operations."""
        # Perform non-critical operations
        self.log_performance_metrics()
        self.check_system_health()

    def compute_control_commands(self):
        """Compute control commands with minimal latency."""
        # Simplified control algorithm
        # In practice, this would be your PID controller or other control logic
        commands = [0.0] * 10  # Example: 10 joints

        # Add your control algorithm here
        # Keep this function as fast as possible

        return commands

    def log_performance_metrics(self):
        """Log performance metrics."""
        if self.control_timing:
            avg_time = sum(self.control_timing) / len(self.control_timing)
            max_time = max(self.control_timing)
            self.get_logger().info(
                f"Control timing - Avg: {avg_time:.4f}s, Max: {max_time:.4f}s, "
                f"Target: 0.01s"
            )
```

## Memory Management and Optimization

### 1. Efficient Message Handling

```python
import rclpy
from rclpy.node import Node
from sensor_msgs.msg import Image
import numpy as np
from collections import deque
import weakref

class OptimizedMemoryNode(Node):
    def __init__(self):
        super().__init__('optimized_memory_node')

        # Pre-allocate message objects to reduce memory allocation
        self.preallocated_images = deque(maxlen=10)
        for _ in range(10):
            self.preallocated_images.append(Image())

        # Use memory pools for frequently created objects
        self.image_sub = self.create_subscription(
            Image, 'camera/image_raw', self.optimized_image_callback, 10
        )

        # Shared memory for large data
        self.shared_buffer = np.zeros((480, 640, 3), dtype=np.uint8)

    def optimized_image_callback(self, msg):
        """Optimized callback that minimizes memory allocation."""
        # Instead of creating new arrays, reuse existing ones
        try:
            # Convert image data efficiently
            image_array = np.frombuffer(msg.data, dtype=np.uint8)
            image_array = image_array.reshape((msg.height, msg.width, 3))

            # Process using shared buffer
            np.copyto(self.shared_buffer[:msg.height, :msg.width, :], image_array)

            # Process the image
            processed_image = self.process_image(self.shared_buffer)

            # Publish result using pre-allocated message if possible
            self.publish_processed_image(processed_image)

        except Exception as e:
            self.get_logger().error(f"Image processing error: {e}")

    def process_image(self, image_data):
        """Process image with efficient memory usage."""
        # Use in-place operations when possible
        processed = image_data.copy()  # or use views when possible

        # Efficient image processing operations
        # Avoid creating temporary arrays when possible
        return processed

    def reuse_message_object(self):
        """Example of reusing message objects."""
        if self.preallocated_images:
            msg = self.preallocated_images.popleft()
            # Reset message fields
            msg.data = []
            return msg
        else:
            return Image()  # Fallback to new allocation
```

### 2. CPU Affinity and Threading

```python
import rclpy
from rclpy.node import Node
import os
import psutil
import threading

class CpuOptimizedNode(Node):
    def __init__(self):
        super().__init__('cpu_optimized_node')

        # Get system information
        self.cpu_count = os.cpu_count()
        self.get_logger().info(f"System has {self.cpu_count} CPU cores")

        # Set CPU affinity for different threads
        self.setup_cpu_affinity()

        # Create specialized threads for different tasks
        self.create_specialized_threads()

    def setup_cpu_affinity(self):
        """Set up CPU affinity for optimal performance."""
        # Get current process
        process = psutil.Process(os.getpid())

        try:
            # Set CPU affinity for this process (example: use cores 2-3 for this node)
            if self.cpu_count >= 4:
                # Use specific CPU cores for this node
                cpu_affinity = [2, 3]  # Reserve these cores for critical tasks
                process.cpu_affinity(cpu_affinity)
                self.get_logger().info(f"Set CPU affinity to cores: {cpu_affinity}")
        except psutil.AccessDenied:
            self.get_logger().warn("Access denied when setting CPU affinity")

    def create_specialized_threads(self):
        """Create threads pinned to specific CPU cores."""
        # Thread for perception (can use multiple cores)
        self.perception_thread = threading.Thread(
            target=self.perception_loop,
            daemon=True
        )

        # Thread for control (should be on dedicated core if possible)
        self.control_thread = threading.Thread(
            target=self.control_loop,
            daemon=True
        )

        # Start threads
        self.perception_thread.start()
        self.control_thread.start()

    def perception_loop(self):
        """Perception thread with appropriate CPU usage."""
        # This thread can use multiple cores for parallel processing
        current_thread = threading.current_thread()

        # Try to set thread affinity (platform dependent)
        try:
            # On Linux, you could use sched_setaffinity
            pass
        except:
            pass

        while True:
            # Perform perception tasks
            self.process_perception_data()
            # Allow other threads to run
            time.sleep(0.001)

    def control_loop(self):
        """Control thread for time-critical operations."""
        # This thread should have minimal interference
        while True:
            # Perform control tasks
            self.perform_control()
            # Precise timing for control loop
            time.sleep(0.002)  # 500 Hz control loop
```

## Performance Profiling and Monitoring

### 1. Built-in Performance Tools

```python
import rclpy
from rclpy.node import Node
import time
import psutil
import threading
from collections import defaultdict, deque
import json

class PerformanceMonitoringNode(Node):
    def __init__(self):
        super().__init__('performance_monitoring_node')

        # Performance metrics storage
        self.metrics = defaultdict(lambda: deque(maxlen=100))

        # Monitor different aspects
        self.start_system_monitoring()
        self.start_node_monitoring()

    def start_system_monitoring(self):
        """Start system-level performance monitoring."""
        self.system_monitor_thread = threading.Thread(
            target=self.system_monitor_loop,
            daemon=True
        )
        self.system_monitor_thread.start()

    def start_node_monitoring(self):
        """Start node-level performance monitoring."""
        self.node_monitor_timer = self.create_timer(1.0, self.log_node_metrics)

    def system_monitor_loop(self):
        """Monitor system resources."""
        process = psutil.Process(os.getpid())

        while True:
            try:
                # CPU usage
                cpu_percent = process.cpu_percent()
                self.metrics['cpu_percent'].append(cpu_percent)

                # Memory usage
                memory_info = process.memory_info()
                memory_mb = memory_info.rss / 1024 / 1024
                self.metrics['memory_mb'].append(memory_mb)

                # Thread count
                thread_count = process.num_threads()
                self.metrics['thread_count'].append(thread_count)

                # Sleep to avoid overwhelming the system
                time.sleep(0.1)

            except Exception as e:
                self.get_logger().error(f"System monitoring error: {e}")
                break

    def log_node_metrics(self):
        """Log current node performance metrics."""
        if not self.metrics['cpu_percent']:
            return

        # Calculate averages
        avg_cpu = sum(self.metrics['cpu_percent']) / len(self.metrics['cpu_percent'])
        avg_memory = sum(self.metrics['memory_mb']) / len(self.metrics['memory_mb'])
        max_memory = max(self.metrics['memory_mb']) if self.metrics['memory_mb'] else 0

        self.get_logger().info(
            f"Performance - CPU: {avg_cpu:.2f}%, "
            f"Memory: avg {avg_memory:.2f}MB, max {max_memory:.2f}MB, "
            f"Threads: {self.metrics['thread_count'][-1] if self.metrics['thread_count'] else 0}"
        )

    def profile_function(self, func_name):
        """Context manager for profiling specific functions."""
        class Profiler:
            def __enter__(profiler_self):
                self.metrics[f'{func_name}_start'].append(time.time())
                return profiler_self

            def __exit__(profiler_self, exc_type, exc_val, exc_tb):
                start_time = self.metrics[f'{func_name}_start'][-1] if self.metrics[f'{func_name}_start'] else time.time()
                elapsed = time.time() - start_time
                self.metrics[f'{func_name}_duration'].append(elapsed)

                # Log if function took too long
                if elapsed > 0.01:  # 10ms threshold
                    self.get_logger().warn(f"{func_name} took {elapsed:.4f}s")

        return Profiler()

    def example_profiled_function(self):
        """Example of using the profiler."""
        with self.profile_function('critical_calculation'):
            # Simulate some computation
            result = sum(i * i for i in range(1000))
            return result
```

## Hardware Context: RTX Workstation & Jetson Orin Optimization

### Platform-Specific Optimization

```python
import rclpy
from rclpy.node import Node
import subprocess
import json

class HardwareOptimizedNode(Node):
    def __init__(self):
        super().__init__('hardware_optimized_node')

        # Detect and configure for specific hardware
        self.hardware_config = self.detect_hardware_and_configure()
        self.get_logger().info(f"Hardware config: {self.hardware_config}")

    def detect_hardware_and_configure(self):
        """Detect hardware and apply appropriate optimizations."""
        config = {
            'platform': 'unknown',
            'cpu_cores': os.cpu_count(),
            'gpu_available': False,
            'gpu_memory_mb': 0,
            'optimization_level': 'standard'
        }

        # Detect NVIDIA hardware
        try:
            # Check for RTX GPU
            result = subprocess.run([
                'nvidia-smi',
                '--query-gpu=name,memory.total',
                '--format=csv,noheader,nounits'
            ], capture_output=True, text=True)

            if result.returncode == 0:
                gpu_info = result.stdout.strip().split(', ')
                gpu_name = gpu_info[0].strip()
                gpu_memory = int(gpu_info[1].strip())

                if 'RTX' in gpu_name.upper():
                    config.update({
                        'platform': 'RTX_Workstation',
                        'gpu_available': True,
                        'gpu_memory_mb': gpu_memory,
                        'optimization_level': 'high_performance'
                    })
                    self.configure_rtx_optimizations()

                elif 'XAVIER' in gpu_name.upper() or 'ORIN' in gpu_name.upper():
                    config.update({
                        'platform': 'Jetson_Orin',
                        'gpu_available': True,
                        'gpu_memory_mb': gpu_memory,
                        'optimization_level': 'power_efficient'
                    })
                    self.configure_jetson_optimizations()

        except FileNotFoundError:
            # nvidia-smi not available, check for other hardware
            pass

        return config

    def configure_rtx_optimizations(self):
        """Optimizations specific to RTX Workstation."""
        self.get_logger().info("Applying RTX Workstation optimizations")

        # RTX optimizations
        self.max_threads = 16  # Use more threads for RTX workstation
        self.gpu_processing_enabled = True
        self.large_buffer_size = 1024 * 1024 * 100  # 100MB buffers

        # Set up GPU-accelerated processing
        try:
            import cupy as cp  # NVIDIA GPU arrays
            self.gpu_available = True
            self.get_logger().info("CuPy GPU acceleration available")
        except ImportError:
            self.gpu_available = False
            self.get_logger().info("CuPy not available, using CPU only")

    def configure_jetson_optimizations(self):
        """Optimizations specific to Jetson Orin."""
        self.get_logger().info("Applying Jetson Orin optimizations")

        # Jetson optimizations (power and thermal aware)
        self.max_threads = 6  # Use fewer threads to manage heat
        self.gpu_processing_enabled = True
        self.large_buffer_size = 1024 * 1024 * 20  # 20MB buffers (more conservative)

        # Configure for power efficiency
        self.power_mode = 'MAXN'  # or '5W' for thermal management
        self.configure_jetson_power_settings()

    def configure_jetson_power_settings(self):
        """Configure Jetson-specific power settings."""
        try:
            # Set Jetson to appropriate power mode
            result = subprocess.run(['nvpmodel', '-q'], capture_output=True, text=True)
            if result.returncode == 0:
                self.get_logger().info(f"Current Jetson power mode: {result.stdout.strip()}")
        except FileNotFoundError:
            self.get_logger().info("nvpmodel not available")

    def adaptive_processing(self, data_size):
        """Adapt processing based on hardware capabilities and current load."""
        if self.hardware_config['platform'] == 'RTX_Workstation':
            # RTX: Use full processing power
            return self.process_with_rtx_optimizations(data_size)
        elif self.hardware_config['platform'] == 'Jetson_Orin':
            # Jetson: Balance performance with power/thermal constraints
            return self.process_with_jetson_optimizations(data_size)
        else:
            # Fallback: Standard processing
            return self.process_standard(data_size)

    def process_with_rtx_optimizations(self, data_size):
        """Process using RTX-specific optimizations."""
        if self.gpu_available and data_size > 1000:
            # Use GPU for large data processing
            import cupy as cp
            # GPU processing logic here
            self.get_logger().debug("Processing on GPU (RTX)")
        else:
            # CPU processing
            self.get_logger().debug("Processing on CPU (RTX)")

    def process_with_jetson_optimizations(self, data_size):
        """Process using Jetson-specific optimizations."""
        # Monitor thermal conditions and adjust processing
        thermal_limit = self.check_thermal_conditions()

        if thermal_limit and data_size > 5000:
            # Reduce processing intensity if thermal limits reached
            self.get_logger().warn("Thermal limit detected, reducing processing intensity")
            # Use less intensive processing
        else:
            # Normal processing
            self.get_logger().debug("Processing under thermal limits (Jetson)")

    def check_thermal_conditions(self):
        """Check thermal conditions on Jetson (simplified)."""
        try:
            # Check thermal zones
            import glob
            thermal_files = glob.glob('/sys/class/thermal/thermal_zone*/temp')
            for temp_file in thermal_files:
                with open(temp_file, 'r') as f:
                    temp = int(f.read().strip()) / 1000.0  # Convert to Celsius
                    if temp > 80.0:  # Thermal warning threshold
                        return True
        except:
            pass
        return False
```

## Real-Time Performance Best Practices

### 1. Deterministic Timing

```python
import rclpy
from rclpy.node import Node
import time
from rclpy.time import Time
from rclpy.duration import Duration

class DeterministicTimingNode(Node):
    def __init__(self):
        super().__init__('deterministic_timing_node')

        # Use ROS time for deterministic timing
        self.target_control_rate = 0.01  # 100 Hz
        self.last_control_time = self.get_clock().now()

        self.control_timer = self.create_timer(
            self.target_control_rate,
            self.deterministic_control_loop
        )

    def deterministic_control_loop(self):
        """Control loop with deterministic timing."""
        current_time = self.get_clock().now()
        time_since_last = (current_time - self.last_control_time).nanoseconds / 1e9

        # Ensure deterministic time step
        if time_since_last >= self.target_control_rate:
            # Perform control calculations
            self.perform_deterministic_control()
            self.last_control_time = current_time
        else:
            # Timing is too early, this shouldn't happen with ROS timers
            self.get_logger().warn(f"Control loop triggered too early: {time_since_last}s")

    def perform_deterministic_control(self):
        """Perform control with deterministic behavior."""
        # Your deterministic control algorithm here
        # Use fixed time steps and predictable algorithms
        pass
```

## Summary

Real-time performance in ROS 2 requires careful attention to scheduling, memory management, and hardware-specific optimizations. For humanoid robotics, meeting timing constraints is crucial for safety and performance. The optimizations should be tailored to the specific hardware platform (RTX Workstation vs Jetson Orin) to achieve the best balance of performance and power efficiency.

## Exercises

1. Implement a real-time control loop for a robot joint
2. Create a performance monitoring system for your robot nodes
3. Optimize memory usage in a perception node
4. Configure CPU affinity for critical robot processes
5. Implement adaptive processing based on thermal conditions (for Jetson)