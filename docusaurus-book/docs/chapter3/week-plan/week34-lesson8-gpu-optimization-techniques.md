---
sidebar_position: 34
---

# GPU Optimization Techniques for Isaac Applications

## Learning Objectives

By the end of this lesson, you will be able to:
- Implement GPU optimization techniques for Isaac robotics applications
- Configure CUDA and TensorRT for maximum performance in robotics workloads
- Optimize neural networks and perception pipelines for real-time execution
- Profile and debug GPU performance bottlenecks in Isaac systems
- Deploy optimized models on both RTX Workstations and Jetson Orin platforms

## Overview

GPU optimization is crucial for achieving real-time performance in Physical AI and humanoid robotics applications. The NVIDIA Isaac platform provides extensive tools and techniques for leveraging GPU acceleration, from CUDA-optimized kernels to TensorRT inference optimization. This lesson explores advanced optimization strategies for maximizing the computational efficiency of Isaac-based robotics systems.

## GPU Architecture and Robotics Workloads

### Parallel Processing in Robotics

Robotics applications are inherently parallelizable:
- **Sensor Processing**: Multiple sensors can be processed simultaneously
- **Perception Pipelines**: Image processing operations on pixel arrays
- **Control Systems**: Parallel execution of multiple control loops
- **SLAM Algorithms**: Feature extraction and matching operations

### CUDA Architecture for Robotics

CUDA enables robotics algorithms to leverage thousands of GPU cores:
- **Streams**: Parallel execution of multiple kernels
- **Memory Management**: Efficient data transfer between CPU and GPU
- **Shared Memory**: Fast access for collaborative thread work
- **Warp Execution**: Coalesced memory access patterns

## Isaac GPU Optimization Strategies

### TensorRT Integration

TensorRT provides inference optimization for deep learning models:

```python
#!/usr/bin/env python3

import rclpy
from rclpy.node import Node
from sensor_msgs.msg import Image
from std_msgs.msg import Float32
from geometry_msgs.msg import Twist
import numpy as np
import cv2
from cv_bridge import CvBridge
import tensorrt as trt
import pycuda.driver as cuda
import pycuda.autoinit
import threading
import time

class IsaacGPUOptimizer(Node):
    """
    GPU optimization manager for Isaac robotics applications
    """
    def __init__(self):
        super().__init__('isaac_gpu_optimizer')

        # Initialize CV bridge
        self.cv_bridge = CvBridge()

        # Publishers for performance metrics
        self.gpu_util_pub = self.create_publisher(Float32, '/isaac/gpu_utilization', 10)
        self.inference_time_pub = self.create_publisher(Float32, '/isaac/inference_time', 10)
        self.command_pub = self.create_publisher(Twist, '/cmd_vel', 10)

        # Subscribers for sensor data
        self.image_sub = self.create_subscription(
            Image, '/camera/image_raw', self.image_callback, 10)

        # GPU optimization parameters
        self.gpu_params = {
            'tensorrt_precision': 'fp16',  # or 'fp32', 'int8'
            'batch_size': 1,
            'max_workspace_size': 1 << 30,  # 1GB
            'engine_cache': True
        }

        # Initialize TensorRT engine
        self.tensorrt_engine = None
        self.cuda_stream = None
        self.optimized_model = None

        # Performance tracking
        self.inference_times = []
        self.gpu_monitor_timer = self.create_timer(1.0, self.monitor_gpu_performance)

        # Initialize GPU optimization
        self.initialize_gpu_optimization()

        self.get_logger().info('Isaac GPU Optimizer initialized')

    def initialize_gpu_optimization(self):
        """
        Initialize GPU optimization components
        """
        try:
            # Initialize CUDA stream
            self.cuda_stream = cuda.Stream()

            # Load or build TensorRT engine
            self.tensorrt_engine = self.load_tensorrt_engine()

            # Initialize optimized model
            self.optimized_model = self.create_optimized_perception_model()

            self.get_logger().info('GPU optimization initialized successfully')
        except Exception as e:
            self.get_logger().error(f'GPU optimization initialization failed: {e}')

    def load_tensorrt_engine(self):
        """
        Load or build TensorRT engine for optimized inference
        """
        TRT_LOGGER = trt.Logger(trt.Logger.WARNING)

        # Check if optimized engine already exists
        engine_path = '/tmp/isaac_optimized_engine.trt'

        try:
            # Try to load existing engine
            with open(engine_path, 'rb') as f:
                engine = trt.Runtime(TRT_LOGGER).deserialize_cuda_engine(f.read())
                self.get_logger().info('Loaded existing TensorRT engine')
                return engine
        except FileNotFoundError:
            self.get_logger().info('Building new TensorRT engine...')

            # Build new engine
            builder = trt.Builder(TRT_LOGGER)
            network = builder.create_network(1 << int(trt.NetworkDefinitionCreationFlag.EXPLICIT_BATCH))
            config = builder.create_builder_config()

            # Set workspace size
            config.max_workspace_size = self.gpu_params['max_workspace_size']

            # Set precision based on configuration
            if self.gpu_params['tensorrt_precision'] == 'fp16':
                if builder.platform_has_fast_fp16:
                    config.set_flag(trt.BuilderFlag.FP16)
                    self.get_logger().info('Using FP16 precision')
                else:
                    self.get_logger().info('FP16 not supported, using FP32')

            # Create optimization profile
            profile = builder.create_optimization_profile()
            profile.set_shape('input', (1, 3, 224, 224), (self.gpu_params['batch_size'], 3, 224, 224), (4, 3, 224, 224))
            config.add_optimization_profile(profile)

            # Build engine (in a real implementation, you would define the network here)
            # For this example, we'll create a dummy engine
            engine = builder.build_engine(network, config)

            if engine:
                # Save engine for future use
                with open(engine_path, 'wb') as f:
                    f.write(engine.serialize())
                self.get_logger().info('TensorRT engine built and saved')
                return engine
            else:
                self.get_logger().error('Failed to build TensorRT engine')
                return None

    def create_optimized_perception_model(self):
        """
        Create optimized perception model using Isaac GPU acceleration
        """
        # In a real implementation, this would create an optimized model
        # For this example, we'll simulate an optimized perception pipeline
        return {
            'model_type': 'optimized_perception',
            'input_shape': (224, 224, 3),
            'output_shape': (1000,),  # Classification output
            'optimization_level': 'high'
        }

    def image_callback(self, msg):
        """
        Process image using GPU-optimized pipeline
        """
        try:
            # Convert ROS image to OpenCV
            cv_image = self.cv_bridge.imgmsg_to_cv2(msg, "bgr8")

            # Preprocess image for GPU inference
            preprocessed_image = self.preprocess_for_gpu(cv_image)

            # Start timing for performance measurement
            start_time = time.time()

            # Perform GPU-optimized inference
            results = self.gpu_optimized_inference(preprocessed_image)

            # Calculate inference time
            inference_time = time.time() - start_time
            self.inference_times.append(inference_time)

            # Publish inference time
            time_msg = Float32()
            time_msg.data = inference_time
            self.inference_time_pub.publish(time_msg)

            # Process results and generate robot commands
            commands = self.process_inference_results(results)
            self.command_pub.publish(commands)

            self.get_logger().debug(f'GPU inference completed in {inference_time:.4f}s')

        except Exception as e:
            self.get_logger().error(f'Error in GPU-optimized processing: {e}')

    def preprocess_for_gpu(self, image):
        """
        Preprocess image for GPU inference
        """
        # Resize image to model input size
        resized = cv2.resize(image, (224, 224))

        # Normalize image (mean subtraction, std division)
        normalized = (resized.astype(np.float32) - [123.68, 116.78, 103.94]) / [58.40, 57.12, 57.38]

        # Transpose from HWC to CHW format
        transposed = np.transpose(normalized, (2, 0, 1))

        # Add batch dimension
        batched = np.expand_dims(transposed, axis=0)

        return batched.astype(np.float32)

    def gpu_optimized_inference(self, input_data):
        """
        Perform GPU-optimized inference using TensorRT
        """
        if self.tensorrt_engine is None:
            # Fallback to CPU inference if TensorRT engine not available
            self.get_logger().warn('TensorRT engine not available, using CPU inference')
            return self.cpu_inference(input_data)

        try:
            # Get input and output bindings
            inputs, outputs, bindings = self.allocate_buffers(self.tensorrt_engine)

            # Copy input data to GPU memory
            cuda.memcpy_htod(inputs[0].host, input_data)

            # Execute inference
            context = self.tensorrt_engine.create_execution_context()
            context.execute_async_v2(bindings=bindings, stream_handle=self.cuda_stream.handle)

            # Copy output data back to host memory
            cuda.memcpy_dtoh(outputs[0].host, outputs[0].device)

            # Synchronize stream
            self.cuda_stream.synchronize()

            return outputs[0].host
        except Exception as e:
            self.get_logger().error(f'TensorRT inference failed: {e}')
            return self.cpu_inference(input_data)

    def allocate_buffers(self, engine):
        """
        Allocate input and output buffers for TensorRT inference
        """
        inputs = []
        outputs = []
        bindings = []

        for binding in engine:
            size = trt.volume(engine.get_binding_shape(binding)) * engine.max_batch_size
            dtype = trt.nptype(engine.get_binding_dtype(binding))
            host_mem = cuda.pagelocked_empty(size, dtype)
            device_mem = cuda.mem_alloc(host_mem.nbytes)

            bindings.append(int(device_mem))

            if engine.binding_is_input(binding):
                inputs.append({'host': host_mem, 'device': device_mem})
            else:
                outputs.append({'host': host_mem, 'device': device_mem})

        return inputs, outputs, bindings

    def cpu_inference(self, input_data):
        """
        CPU fallback for inference (for comparison)
        """
        # Simulate CPU inference with random results
        # In a real implementation, this would run the model on CPU
        import random
        results = np.random.random((1, 1000)).astype(np.float32)
        results[0, 0] = 0.9  # Simulate confidence in first class
        return results

    def process_inference_results(self, results):
        """
        Process inference results and generate robot commands
        """
        # Extract top prediction
        top_prediction = np.argmax(results[0])
        confidence = results[0][top_prediction]

        # Generate robot command based on prediction
        cmd = Twist()

        if confidence > 0.7:  # High confidence threshold
            if top_prediction < 250:  # Example: move forward
                cmd.linear.x = 0.5
                cmd.angular.z = 0.0
            elif top_prediction < 500:  # Example: turn left
                cmd.linear.x = 0.1
                cmd.angular.z = 0.3
            elif top_prediction < 750:  # Example: turn right
                cmd.linear.x = 0.1
                cmd.angular.z = -0.3
            else:  # Example: stop
                cmd.linear.x = 0.0
                cmd.angular.z = 0.0
        else:
            # Low confidence, stop robot
            cmd.linear.x = 0.0
            cmd.angular.z = 0.0

        return cmd

    def monitor_gpu_performance(self):
        """
        Monitor GPU performance metrics
        """
        # In a real Isaac implementation, this would interface with NVIDIA tools
        # For simulation, we'll publish placeholder values

        # Calculate average inference time
        if self.inference_times:
            avg_time = sum(self.inference_times[-10:]) / min(len(self.inference_times), 10)
            self.get_logger().debug(f'Avg inference time: {avg_time:.4f}s')

        # Simulate GPU utilization (0-100%)
        import random
        gpu_util = Float32()
        gpu_util.data = random.uniform(40.0, 85.0)  # Simulate realistic GPU usage
        self.gpu_util_pub.publish(gpu_util)

        # Keep only recent inference times to avoid memory growth
        if len(self.inference_times) > 100:
            self.inference_times = self.inference_times[-50:]


class IsaacMultiGPUManager(Node):
    """
    Multi-GPU management for Isaac applications
    """
    def __init__(self):
        super().__init__('isaac_multi_gpu_manager')

        # Publishers for multi-GPU metrics
        self.gpu_status_pub = self.create_publisher(Float32, '/isaac/gpu_status', 10)

        # Track multiple GPUs
        self.gpu_devices = []
        self.gpu_usage = {}
        self.gpu_temperatures = {}

        # Initialize multi-GPU setup
        self.initialize_multi_gpu()

        # GPU monitoring timer
        self.gpu_monitor_timer = self.create_timer(2.0, self.monitor_multi_gpu)

        self.get_logger().info('Isaac Multi-GPU Manager initialized')

    def initialize_multi_gpu(self):
        """
        Initialize multi-GPU setup for Isaac applications
        """
        try:
            # Get number of available GPUs
            import pycuda.driver as cuda
            cuda.init()

            gpu_count = cuda.Device.count()
            self.get_logger().info(f'Detected {gpu_count} GPU(s)')

            for i in range(gpu_count):
                device = cuda.Device(i)
                self.gpu_devices.append(device)
                self.gpu_usage[i] = 0.0
                self.gpu_temperatures[i] = 0.0

                self.get_logger().info(f'GPU {i}: {device.name()}')

        except Exception as e:
            self.get_logger().error(f'Multi-GPU initialization failed: {e}')

    def monitor_multi_gpu(self):
        """
        Monitor multi-GPU status and performance
        """
        # In a real implementation, this would use nvidia-ml-py or similar
        # For simulation, we'll publish placeholder values
        import random

        for gpu_id in range(len(self.gpu_devices)):
            # Simulate GPU usage and temperature
            self.gpu_usage[gpu_id] = random.uniform(30.0, 90.0)
            self.gpu_temperatures[gpu_id] = random.uniform(40.0, 70.0)

        # Publish overall status
        status_msg = Float32()
        if self.gpu_devices:
            avg_usage = sum(self.gpu_usage.values()) / len(self.gpu_usage)
            status_msg.data = avg_usage
        else:
            status_msg.data = 0.0

        self.gpu_status_pub.publish(status_msg)

    def distribute_workload(self, task_size):
        """
        Distribute computational workload across available GPUs
        """
        if not self.gpu_devices:
            return 0  # Use first GPU if none detected

        # Simple round-robin distribution
        # In a real implementation, this would consider GPU load and capabilities
        gpu_id = len(self.gpu_devices) % len(self.gpu_devices)
        return gpu_id


def main(args=None):
    rclpy.init(args=args)

    # Create GPU optimization nodes
    gpu_optimizer = IsaacGPUOptimizer()
    multi_gpu_manager = IsaacMultiGPUManager()

    # Create executor
    executor = rclpy.executors.MultiThreadedExecutor()
    executor.add_node(gpu_optimizer)
    executor.add_node(multi_gpu_manager)

    try:
        executor.spin()
    except KeyboardInterrupt:
        pass
    finally:
        gpu_optimizer.destroy_node()
        multi_gpu_manager.destroy_node()
        executor.shutdown()
        rclpy.shutdown()


if __name__ == '__main__':
    main()
```

## Advanced GPU Optimization Techniques

### CUDA Streams and Asynchronous Processing

For maximum GPU utilization, use CUDA streams for asynchronous processing:

```bash
# 1. CUDA environment optimization
export CUDA_VISIBLE_DEVICES=0,1  # Use multiple GPUs if available
export CUDA_LAUNCH_BLOCKING=0    # Non-blocking kernel launches
export CUDA_DEVICE_MAX_CONNECTIONS=1

# 2. Memory optimization
export CUDA_MANAGED_FORCE_DEVICE_ALLOC=1
export CUDA_DEVICE_MAX_THREADS_PER_CU=1
```

### TensorRT Configuration for Robotics

Optimize TensorRT for robotics-specific workloads:

```yaml
# config/tensorrt_optimization.yaml
tensorrt_config:
  precision_mode: fp16  # or int8 for edge deployment
  max_batch_size: 1
  max_workspace_size: 2147483648  # 2GB
  min_timing_iterations: 2
  avg_timing_iterations: 2
  calibration:
    dataset_size: 1000
    batch_size: 16
    algorithm: entropy  # or quantile, mse, etc.

gpu_config:
  memory_pool_size: 1024  # MB
  streams: 2
  concurrent_batches: 2
  precision_fallback: true
```

## Isaac GPU Optimization Tools

### Isaac GPU Profiling

```python
#!/usr/bin/env python3

import subprocess
import json
import time
from datetime import datetime

class IsaacGPUProfiler:
    """
    GPU profiling for Isaac applications
    """
    def __init__(self):
        self.profiles = []
        self.metrics = {
            'utilization': [],
            'memory': [],
            'temperature': [],
            'power': []
        }

    def collect_gpu_metrics(self):
        """
        Collect GPU metrics using nvidia-smi
        """
        try:
            # Run nvidia-smi to get GPU metrics
            result = subprocess.run([
                'nvidia-smi',
                '--query-gpu=utilization.gpu,memory.used,memory.total,temperature.gpu,power.draw',
                '--format=csv,noheader,nounits'
            ], capture_output=True, text=True, timeout=10)

            if result.returncode == 0:
                # Parse the output
                gpu_data = result.stdout.strip().split(', ')

                if len(gpu_data) >= 5:
                    metrics = {
                        'timestamp': datetime.now().isoformat(),
                        'gpu_utilization': float(gpu_data[0]),
                        'memory_used': float(gpu_data[1]),
                        'memory_total': float(gpu_data[2]),
                        'memory_utilization': (float(gpu_data[1]) / float(gpu_data[2])) * 100 if float(gpu_data[2]) > 0 else 0,
                        'temperature': float(gpu_data[3]),
                        'power_draw': float(gpu_data[4])
                    }

                    # Store metrics
                    self.metrics['utilization'].append(metrics['gpu_utilization'])
                    self.metrics['memory'].append(metrics['memory_utilization'])
                    self.metrics['temperature'].append(metrics['temperature'])
                    self.metrics['power'].append(metrics['power_draw'])

                    return metrics
        except Exception as e:
            print(f"Error collecting GPU metrics: {e}")

        return None

    def profile_application(self, duration=60):
        """
        Profile GPU usage over time
        """
        print(f"Starting GPU profiling for {duration} seconds...")

        start_time = time.time()
        while time.time() - start_time < duration:
            metrics = self.collect_gpu_metrics()
            if metrics:
                self.profiles.append(metrics)
                print(f"GPU Util: {metrics['gpu_utilization']:.1f}%, "
                      f"Mem: {metrics['memory_utilization']:.1f}%, "
                      f"Temp: {metrics['temperature']:.1f}C, "
                      f"Power: {metrics['power_draw']:.1f}W")

            time.sleep(1)  # Sample every second

        return self.generate_report()

    def generate_report(self):
        """
        Generate profiling report
        """
        if not self.metrics['utilization']:
            return "No profiling data collected"

        report = {
            'summary': {
                'total_samples': len(self.metrics['utilization']),
                'avg_gpu_utilization': sum(self.metrics['utilization']) / len(self.metrics['utilization']),
                'max_gpu_utilization': max(self.metrics['utilization']),
                'avg_memory_utilization': sum(self.metrics['memory']) / len(self.metrics['memory']),
                'avg_temperature': sum(self.metrics['temperature']) / len(self.metrics['temperature']),
                'avg_power_draw': sum(self.metrics['power']) / len(self.metrics['power'])
            },
            'recommendations': self.generate_recommendations()
        }

        return report

    def generate_recommendations(self):
        """
        Generate optimization recommendations based on profiling data
        """
        avg_util = report['summary']['avg_gpu_utilization'] if 'report' in locals() else 0
        avg_temp = report['summary']['avg_temperature'] if 'report' in locals() else 0

        recommendations = []

        if avg_util < 50:
            recommendations.append("GPU utilization is low - consider increasing workload or optimizing CPU bottlenecks")
        elif avg_util > 90:
            recommendations.append("GPU utilization is high - consider model optimization or workload distribution")

        if avg_temp > 75:
            recommendations.append("GPU temperature is high - check cooling or reduce workload intensity")

        return recommendations

# Example usage
if __name__ == "__main__":
    profiler = IsaacGPUProfiler()
    report = profiler.profile_application(duration=30)  # Profile for 30 seconds
    print(json.dumps(report, indent=2))
```

## Hardware Context

### RTX Workstation GPU Optimization

For maximum performance on RTX Workstations:

- **Multi-GPU Setup**: Use SLI or multi-GPU configuration for intensive workloads
- **Memory Pooling**: Configure large memory pools for batch processing
- **NVLink**: Enable NVLink for high-bandwidth GPU-to-GPU communication
- **Thermal Management**: Ensure adequate cooling for sustained high-performance operation
- **Power Supply**: Use high-wattage PSU to support multiple high-end GPUs

### Jetson Orin Kit Optimization

For efficient GPU utilization on Jetson Orin:

- **Power Modes**: Configure appropriate power modes (MAXN, 15W, 10W) based on requirements
- **Thermal Throttling**: Monitor and prevent thermal throttling during operation
- **INT8 Quantization**: Use INT8 precision for neural networks to maximize efficiency
- **Memory Management**: Optimize memory usage to fit within Jetson's constraints
- **Real-time Constraints**: Ensure GPU operations meet real-time deadlines

## Implementation Exercise

1. Create GPU optimization package:
   ```bash
   cd ~/ros2_ws/src
   ros2 pkg create --dependencies rclpy sensor_msgs std_msgs geometry_msgs -- python isaac_gpu_optimization
   ```

2. Create GPU monitoring launch file:
   ```python
   # Save as ~/ros2_ws/src/isaac_gpu_optimization/launch/gpu_optimization.launch.py
   from launch import LaunchDescription
   from launch.actions import DeclareLaunchArgument, SetEnvironmentVariable, TimerAction
   from launch.substitutions import LaunchConfiguration
   from launch_ros.actions import Node
   import os

   def generate_launch_description():
       # Declare launch arguments
       config_file = DeclareLaunchArgument(
           'config_file',
           default_value=os.path.join(
               os.path.dirname(__file__),
               '..', 'config', 'gpu_config.yaml'
           ),
           description='Path to GPU optimization configuration file'
       )

       tensorrt_precision = DeclareLaunchArgument(
           'tensorrt_precision',
           default_value='fp16',
           description='TensorRT precision mode (fp16, fp32, int8)'
       )

       # Set Isaac GPU environment variables
       SetEnvironmentVariable(
           name='CUDA_VISIBLE_DEVICES',
           value='0'
       )

       SetEnvironmentVariable(
           name='CUDA_LAUNCH_BLOCKING',
           value='0'
       )

       # GPU optimization node
       gpu_optimizer = Node(
           package='isaac_gpu_optimization',
           executable='isaac_gpu_optimizer',
           name='isaac_gpu_optimizer',
           parameters=[
               LaunchConfiguration('config_file'),
               {
                   'tensorrt_precision': LaunchConfiguration('tensorrt_precision'),
                   'batch_size': 1,
                   'max_workspace_size': 1073741824  # 1GB
               }
           ],
           remappings=[
               ('/camera/image_raw', '/zed/left/image_rect_color'),
           ],
           output='screen'
       )

       # Multi-GPU manager (if multiple GPUs available)
       multi_gpu_manager = Node(
           package='isaac_gpu_optimization',
           executable='isaac_multi_gpu_manager',
           name='isaac_multi_gpu_manager',
           parameters=[LaunchConfiguration('config_file')],
           output='screen'
       )

       # GPU profiler node
       gpu_profiler = Node(
           package='isaac_gpu_optimization',
           executable='isaac_gpu_profiler',
           name='isaac_gpu_profiler',
           parameters=[LaunchConfiguration('config_file')],
           output='screen'
       )

       return LaunchDescription([
           config_file,
           tensorrt_precision,
           gpu_optimizer,
           multi_gpu_manager,
           gpu_profiler
       ])
   ```

3. Create GPU optimization test script:
   ```python
   # Save as ~/ros2_ws/src/isaac_gpu_optimization/scripts/test_gpu_optimization.py
   #!/usr/bin/env python3

   import rclpy
   from rclpy.node import Node
   from std_msgs.msg import Float32
   import matplotlib.pyplot as plt
   import numpy as np
   import time

   class GPUOptimizationTester(Node):
       """
       Test GPU optimization effectiveness
       """
       def __init__(self):
           super().__init__('gpu_optimization_tester')

           # Subscribers for GPU metrics
           self.gpu_util_sub = self.create_subscription(
               Float32, '/isaac/gpu_utilization', self.gpu_util_callback, 10)
           self.inference_time_sub = self.create_subscription(
               Float32, '/isaac/inference_time', self.inference_time_callback, 10)

           # Storage for metrics
           self.gpu_utils = []
           self.inference_times = []
           self.timestamps = []

           # Test control
           self.test_start_time = time.time()
           self.test_duration = 60  # seconds

           # Test timer
           self.test_timer = self.create_timer(0.1, self.run_test)

           self.get_logger().info('GPU Optimization Tester initialized')

       def gpu_util_callback(self, msg):
           """
           Store GPU utilization data
           """
           self.gpu_utils.append(msg.data)

       def inference_time_callback(self, msg):
           """
           Store inference time data
           """
           self.inference_times.append(msg.data)

       def run_test(self):
           """
           Run GPU optimization test
           """
           current_time = time.time()
           elapsed = current_time - self.test_start_time

           if elapsed > self.test_duration:
               self.finish_test()
               return

           # Log current status
           if len(self.gpu_utils) > 0:
               current_util = self.gpu_utils[-1]
               self.get_logger().info(f'Test progress: {elapsed:.1f}s, GPU Util: {current_util:.1f}%')

       def finish_test(self):
           """
           Complete test and generate report
           """
           self.get_logger().info('GPU optimization test completed')

           # Calculate statistics
           if self.gpu_utils:
               avg_util = sum(self.gpu_utils) / len(self.gpu_utils)
               max_util = max(self.gpu_utils) if self.gpu_utils else 0
           else:
               avg_util = max_util = 0

           if self.inference_times:
               avg_time = sum(self.inference_times) / len(self.inference_times)
               min_time = min(self.inference_times) if self.inference_times else 0
               max_time = max(self.inference_times) if self.inference_times else 0
           else:
               avg_time = min_time = max_time = 0

           # Log results
           self.get_logger().info(
               f'GPU Optimization Test Results:\n'
               f'  Average GPU Utilization: {avg_util:.2f}%\n'
               f'  Max GPU Utilization: {max_util:.2f}%\n'
               f'  Average Inference Time: {avg_time:.4f}s\n'
               f'  Min Inference Time: {min_time:.4f}s\n'
               f'  Max Inference Time: {max_time:.4f}s\n'
           )

           # Create performance visualization
           self.plot_results()

           # Shutdown
           rclpy.shutdown()

       def plot_results(self):
           """
           Plot GPU optimization test results
           """
           if not self.gpu_utils or not self.inference_times:
               self.get_logger().warn('No data to plot')
               return

           # Create subplots
           fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 8))

           # Plot GPU utilization
           ax1.plot(self.gpu_utils, 'b-', linewidth=1)
           ax1.set_title('GPU Utilization Over Time')
           ax1.set_xlabel('Sample')
           ax1.set_ylabel('Utilization (%)')
           ax1.grid(True)

           # Plot inference times
           ax2.plot(self.inference_times, 'r-', linewidth=1)
           ax2.set_title('Inference Time Over Time')
           ax2.set_xlabel('Sample')
           ax2.set_ylabel('Time (s)')
           ax2.grid(True)

           plt.tight_layout()
           plt.savefig('/tmp/gpu_optimization_test.png')
           self.get_logger().info('Test results saved to /tmp/gpu_optimization_test.png')

   def main():
       rclpy.init()
       tester = GPUOptimizationTester()

       try:
           rclpy.spin(tester)
       except KeyboardInterrupt:
           tester.finish_test()
       finally:
           tester.destroy_node()

   if __name__ == '__main__':
       main()
   ```

4. Make the script executable and run tests:
   ```bash
   chmod +x ~/ros2_ws/src/isaac_gpu_optimization/scripts/test_gpu_optimization.py

   cd ~/ros2_ws
   colcon build --packages-select isaac_gpu_optimization
   source install/setup.bash

   # Run GPU optimization test
   ros2 run isaac_gpu_optimization test_gpu_optimization.py
   ```

## Troubleshooting

- **GPU Memory Issues**: Reduce batch size or use model quantization
- **Performance Bottlenecks**: Profile and optimize CPU-GPU data transfer
- **Driver Compatibility**: Ensure CUDA and driver versions match
- **Thermal Throttling**: Monitor temperatures and adjust workloads

## Summary

This lesson covered advanced GPU optimization techniques for Isaac robotics applications, including TensorRT integration, CUDA optimization, and multi-GPU management. Proper GPU optimization is essential for achieving real-time performance in Physical AI systems.

## Next Steps

In the next lesson, we'll explore the Isaac Navigation system (Nav2) integration, focusing on how GPU-optimized perception feeds into navigation planning and execution.