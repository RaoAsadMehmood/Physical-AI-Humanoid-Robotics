---
sidebar_position: 25
---

# Optimizing Simulation Performance on RTX Workstation

## Learning Objectives

By the end of this lesson, you will be able to:
- Configure RTX Workstation hardware for optimal simulation performance
- Optimize Gazebo simulation parameters for RTX architecture
- Leverage GPU acceleration for physics and rendering
- Monitor and profile simulation performance
- Apply advanced optimization techniques for complex scenarios

## Overview

The RTX Workstation represents the pinnacle of hardware for Digital Twin simulation in Physical AI and humanoid robotics applications. This lesson explores comprehensive optimization strategies to fully leverage RTX capabilities for high-fidelity, real-time simulation environments, maximizing both physics computation and rendering performance.

## RTX Workstation Hardware Optimization

### GPU Architecture Considerations

#### CUDA Cores and Tensor Cores
- **CUDA Cores**: Primary compute units for physics simulation, sensor processing, and general computation
- **Tensor Cores**: Specialized for AI/ML workloads, can accelerate certain simulation aspects
- **RT Cores**: Dedicated ray tracing cores for advanced rendering and sensor simulation

#### Memory Architecture
- **VRAM**: Critical for storing simulation models, textures, and real-time data
- **Memory Bandwidth**: Determines how quickly data can be accessed by GPU
- **Memory Hierarchy**: Understanding cache and memory access patterns for optimization

### CPU-GPU Communication Optimization

```bash
# Optimize CPU affinity for simulation processes
export GAZEBO_CPU_AFFINITY="0-7"  # Assign to specific CPU cores

# Enable GPU direct memory access
export GAZEBO_GPU_DIRECT_ACCESS=1

# Optimize memory allocation
export GAZEBO_MEMORY_POOL_SIZE=4294967296  # 4GB memory pool
```

## Python/ROS 2 Code Example - Performance Optimization Framework

Here's a comprehensive example of a simulation performance optimization framework:

```python
#!/usr/bin/env python3

import rclpy
from rclpy.node import Node
from std_msgs.msg import Float64, String, Int32
from sensor_msgs.msg import JointState, Image
from geometry_msgs.msg import Twist
from gazebo_msgs.srv import SetPhysicsProperties, GetPhysicsProperties
from gazebo_msgs.msg import PerformanceMetrics
import time
import threading
import subprocess
import psutil
import GPUtil
import numpy as np
from dataclasses import dataclass
from typing import Dict, List, Tuple, Optional
import json
import os

@dataclass
class PerformanceMetrics:
    """
    Data structure for performance metrics
    """
    timestamp: float
    cpu_usage: float
    gpu_usage: float
    gpu_memory: float
    ram_usage: float
    real_time_factor: float
    update_rate: float
    simulation_objects: int
    network_latency: float

class PerformanceOptimizer(Node):
    """
    Performance optimization framework for RTX Workstation simulation
    """
    def __init__(self):
        super().__init__('performance_optimizer')

        # Performance monitoring
        self.metrics = PerformanceMetrics(
            timestamp=0.0,
            cpu_usage=0.0,
            gpu_usage=0.0,
            gpu_memory=0.0,
            ram_usage=0.0,
            real_time_factor=1.0,
            update_rate=1000.0,
            simulation_objects=0,
            network_latency=0.0
        )

        # Publishers for performance data
        self.performance_pub = self.create_publisher(String, '/performance_metrics', 10)
        self.optimization_cmd_pub = self.create_publisher(String, '/optimization_commands', 10)

        # Services for physics optimization
        self.get_physics_client = self.create_client(
            GetPhysicsProperties, '/gazebo/get_physics_properties')
        self.set_physics_client = self.create_client(
            SetPhysicsProperties, '/gazebo/set_physics_properties')

        # Timers for monitoring and optimization
        self.monitoring_timer = self.create_timer(1.0, self.monitor_performance)
        self.optimization_timer = self.create_timer(5.0, self.optimize_performance)

        # Performance history for trend analysis
        self.performance_history = []
        self.optimization_history = []

        # Current optimization parameters
        self.current_params = {
            'time_step': 0.001,
            'max_update_rate': 1000.0,
            'solver_iterations': 100,
            'thread_count': 8
        }

        # Optimization state
        self.optimization_enabled = True
        self.target_rtf = 1.0  # Target real-time factor

        self.get_logger().info('Performance Optimizer initialized')

    def monitor_performance(self):
        """
        Monitor system and simulation performance
        """
        # Collect system metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        ram_percent = psutil.virtual_memory().percent

        # Get GPU metrics
        gpus = GPUtil.getGPUs()
        if gpus:
            gpu = gpus[0]  # Primary GPU
            gpu_usage = gpu.load * 100
            gpu_memory = gpu.memoryUtil * 100
        else:
            gpu_usage = 0.0
            gpu_memory = 0.0

        # Get current physics properties
        rtf = self.get_current_rtf()
        update_rate = self.get_current_update_rate()

        # Update metrics
        self.metrics = PerformanceMetrics(
            timestamp=time.time(),
            cpu_usage=cpu_percent,
            gpu_usage=gpu_usage,
            gpu_memory=gpu_memory,
            ram_usage=ram_percent,
            real_time_factor=rtf,
            update_rate=update_rate,
            simulation_objects=self.estimate_simulation_complexity(),
            network_latency=self.measure_network_latency()
        )

        # Store in history
        self.performance_history.append(self.metrics)
        if len(self.performance_history) > 100:  # Keep last 100 samples
            self.performance_history.pop(0)

        # Publish metrics
        metrics_msg = String()
        metrics_msg.data = json.dumps({
            'timestamp': self.metrics.timestamp,
            'cpu_usage': self.metrics.cpu_usage,
            'gpu_usage': self.metrics.gpu_usage,
            'gpu_memory': self.metrics.gpu_memory,
            'ram_usage': self.metrics.ram_usage,
            'real_time_factor': self.metrics.real_time_factor,
            'update_rate': self.metrics.update_rate,
            'simulation_objects': self.metrics.simulation_objects
        })
        self.performance_pub.publish(metrics_msg)

    def get_current_rtf(self):
        """
        Get current real-time factor from Gazebo
        """
        # In a real implementation, this would call Gazebo services
        # For this example, return a placeholder value
        return 1.0

    def get_current_update_rate(self):
        """
        Get current simulation update rate
        """
        # Placeholder implementation
        return 1000.0

    def estimate_simulation_complexity(self):
        """
        Estimate simulation complexity based on objects and interactions
        """
        # Placeholder - in reality, this would interface with Gazebo
        # to count models, joints, sensors, etc.
        return 50  # Example complexity measure

    def measure_network_latency(self):
        """
        Measure network latency for distributed simulation
        """
        # Placeholder implementation
        return 0.001  # 1ms latency

    def optimize_performance(self):
        """
        Apply optimization based on current performance metrics
        """
        if not self.optimization_enabled:
            return

        # Analyze performance trends
        trend_analysis = self.analyze_performance_trends()

        # Apply optimizations based on analysis
        optimization_needed = self.determine_optimization_needed(trend_analysis)

        if optimization_needed:
            optimization_params = self.calculate_optimization_params(trend_analysis)
            self.apply_optimization(optimization_params)

    def analyze_performance_trends(self):
        """
        Analyze performance trends from history
        """
        if len(self.performance_history) < 10:
            return {'trend': 'stable', 'issues': []}

        recent_metrics = self.performance_history[-10:]

        # Calculate trends
        avg_cpu = sum(m.cpu_usage for m in recent_metrics) / len(recent_metrics)
        avg_gpu = sum(m.gpu_usage for m in recent_metrics) / len(recent_metrics)
        avg_rtf = sum(m.real_time_factor for m in recent_metrics) / len(recent_metrics)

        # Identify issues
        issues = []
        if avg_cpu > 80:
            issues.append('high_cpu_usage')
        if avg_gpu > 85:
            issues.append('high_gpu_usage')
        if avg_rtf < 0.8:
            issues.append('low_real_time_factor')

        return {
            'trend': 'degrading' if issues else 'stable',
            'avg_cpu': avg_cpu,
            'avg_gpu': avg_gpu,
            'avg_rtf': avg_rtf,
            'issues': issues
        }

    def determine_optimization_needed(self, trend_analysis):
        """
        Determine if optimization is needed based on trends
        """
        return len(trend_analysis['issues']) > 0

    def calculate_optimization_params(self, trend_analysis):
        """
        Calculate optimal parameters based on current performance
        """
        params = self.current_params.copy()

        if 'high_cpu_usage' in trend_analysis['issues']:
            # Reduce solver iterations to decrease CPU load
            params['solver_iterations'] = max(20, int(params['solver_iterations'] * 0.8))

        if 'high_gpu_usage' in trend_analysis['issues']:
            # Reduce rendering quality or sensor complexity
            pass  # GPU optimization handled separately

        if 'low_real_time_factor' in trend_analysis['issues']:
            # Increase time step to reduce computational load
            params['time_step'] = min(0.01, params['time_step'] * 1.1)

        return params

    def apply_optimization(self, params):
        """
        Apply optimization parameters to simulation
        """
        # Apply physics optimization
        self.adjust_physics_parameters(
            params['time_step'],
            params['max_update_rate'],
            params['solver_iterations']
        )

        # Apply system optimization
        self.adjust_system_parameters(params['thread_count'])

        # Store applied parameters
        self.current_params = params
        self.optimization_history.append({
            'timestamp': time.time(),
            'params': params,
            'reason': 'automatic_optimization'
        })

        self.get_logger().info(f'Applied optimization: RTF={self.metrics.real_time_factor:.2f}')

    def adjust_physics_parameters(self, time_step, max_update_rate, solver_iterations):
        """
        Adjust Gazebo physics parameters for optimization
        """
        while not self.set_physics_client.wait_for_service(timeout_sec=1.0):
            self.get_logger().info('Physics service not available, waiting...')

        request = SetPhysicsProperties.Request()
        request.time_step = time_step
        request.max_update_rate = max_update_rate
        request.gravity = [0.0, 0.0, -9.8]

        # ODE-specific parameters optimized for RTX
        request.ode_config.sor_pgs_precon_iters = 0
        request.ode_config.sor_pgs_iters = solver_iterations
        request.ode_config.sor_pgs_w = 1.3
        request.ode_config.ode_surface_layer = 0.001
        request.ode_config.ode_friction_model = 0
        request.ode_config.contact_surface_layer = 0.001
        request.ode_config.contact_max_correcting_vel = 100.0

        future = self.set_physics_client.call_async(request)
        future.add_done_callback(self.physics_set_callback)

    def adjust_system_parameters(self, thread_count):
        """
        Adjust system-level parameters for optimization
        """
        # In a real system, this might adjust thread affinity, memory allocation, etc.
        # For this example, we'll just log the adjustment
        self.get_logger().info(f'Adjusted system parameters: threads={thread_count}')

    def physics_set_callback(self, future):
        """
        Handle physics parameter adjustment response
        """
        try:
            response = future.result()
            if response.success:
                self.get_logger().info('Physics parameters updated successfully')
            else:
                self.get_logger().error(f'Failed to update physics parameters: {response.status_message}')
        except Exception as e:
            self.get_logger().error(f'Service call failed: {e}')

class RTXOptimizer(Node):
    """
    RTX-specific optimization for simulation performance
    """
    def __init__(self):
        super().__init__('rtx_optimizer')

        # Publishers
        self.gpu_config_pub = self.create_publisher(String, '/gpu_configuration', 10)
        self.render_config_pub = self.create_publisher(String, '/render_configuration', 10)

        # Timer for RTX-specific optimization
        self.rtx_optimization_timer = self.create_timer(10.0, self.optimize_rtx_performance)

        # RTX-specific parameters
        self.rtx_features = {
            'ray_tracing': True,
            'tensor_cores': True,
            'cuda_optimization': True,
            'memory_pool': True
        }

        self.get_logger().info('RTX Optimizer initialized')

    def optimize_rtx_performance(self):
        """
        Apply RTX-specific optimizations
        """
        # Optimize CUDA memory management
        self.optimize_cuda_memory()

        # Configure ray tracing for sensors
        self.configure_ray_tracing_sensors()

        # Optimize rendering settings for RTX
        self.optimize_rendering_pipeline()

        # Monitor RTX-specific performance
        self.monitor_rtx_performance()

    def optimize_cuda_memory(self):
        """
        Optimize CUDA memory allocation for RTX
        """
        try:
            # Set CUDA memory fraction (example - would use actual CUDA API in practice)
            cmd = [
                'nvidia-smi',
                '--query-gpu=memory.used,memory.total',
                '--format=csv,noheader,nounits'
            ]
            result = subprocess.run(cmd, capture_output=True, text=True)

            if result.returncode == 0:
                memory_info = result.stdout.strip().split(', ')
                used_memory = int(memory_info[0])
                total_memory = int(memory_info[1])
                memory_utilization = used_memory / total_memory if total_memory > 0 else 0

                # Adjust memory allocation based on utilization
                if memory_utilization > 0.8:
                    self.get_logger().warn(f'High GPU memory usage: {memory_utilization:.2f}')
                    # In practice, reduce simulation complexity or increase memory pool

        except Exception as e:
            self.get_logger().error(f'CUDA memory optimization error: {e}')

    def configure_ray_tracing_sensors(self):
        """
        Configure ray tracing for sensor simulation (LIDAR, camera, etc.)
        """
        # Example configuration for ray tracing sensors
        ray_tracing_config = {
            'lidar_ray_count': 2048,  # Higher for RTX accuracy
            'camera_ray_depth': 8,    # Ray depth for reflections
            'light_sampling': 'importance',  # RTX-optimized sampling
            'denoising': 'optix'      # OptiX denoising for RTX
        }

        config_msg = String()
        config_msg.data = json.dumps(ray_tracing_config)
        self.render_config_pub.publish(config_msg)

    def optimize_rendering_pipeline(self):
        """
        Optimize rendering pipeline for RTX architecture
        """
        # Configure RTX-specific rendering features
        rendering_config = {
            'enable_ray_tracing': True,
            'use_tensor_cores': True,
            'adaptive_sampling': True,
            'global_illumination': True,
            'anti_aliasing': 'smaa',  # RTX-optimized anti-aliasing
            'post_processing': 'optimized'
        }

        config_msg = String()
        config_msg.data = json.dumps(rendering_config)
        self.render_config_pub.publish(config_msg)

    def monitor_rtx_performance(self):
        """
        Monitor RTX-specific performance metrics
        """
        try:
            # Get RTX-specific performance data
            cmd = [
                'nvidia-smi',
                '--query-gpu=name,utilization.gpu,utilization.memory,temperature.gpu,power.draw',
                '--format=csv,noheader,nounits'
            ]
            result = subprocess.run(cmd, capture_output=True, text=True)

            if result.returncode == 0:
                gpu_data = result.stdout.strip().split(', ')
                if len(gpu_data) >= 5:
                    gpu_name = gpu_data[0].strip()
                    gpu_util = float(gpu_data[1])
                    mem_util = float(gpu_data[2])
                    temp = float(gpu_data[3])
                    power = float(gpu_data[4])

                    # Log RTX performance
                    self.get_logger().info(
                        f'RTX Performance - GPU: {gpu_util:.1f}%, '
                        f'Mem: {mem_util:.1f}%, Temp: {temp:.1f}C, '
                        f'Power: {power:.1f}W'
                    )

                    # Check for thermal throttling
                    if temp > 80:
                        self.get_logger().warn(f'RTX thermal warning: {temp}C')

        except Exception as e:
            self.get_logger().error(f'RTX performance monitoring error: {e}')

class LoadBalancer(Node):
    """
    Dynamic load balancing for simulation performance
    """
    def __init__(self):
        super().__init__('load_balancer')

        # Publishers for load balancing commands
        self.load_balance_pub = self.create_publisher(String, '/load_balance_commands', 10)

        # Timer for load balancing
        self.balance_timer = self.create_timer(2.0, self.balance_load)

        # Load balancing state
        self.computation_load = 0.0
        self.memory_load = 0.0
        self.network_load = 0.0

        self.get_logger().info('Load Balancer initialized')

    def balance_load(self):
        """
        Balance computational load across available resources
        """
        # Assess current load distribution
        current_loads = self.assess_current_loads()

        # Determine load balancing strategy
        balance_strategy = self.determine_balance_strategy(current_loads)

        # Apply load balancing
        if balance_strategy:
            self.apply_load_balance(balance_strategy)

    def assess_current_loads(self):
        """
        Assess current computational, memory, and network loads
        """
        # Get system load information
        cpu_percent = psutil.cpu_percent(interval=0.1)
        memory_percent = psutil.virtual_memory().percent
        network_stats = psutil.net_io_counters()

        # Estimate simulation-specific loads
        self.computation_load = cpu_percent / 100.0
        self.memory_load = memory_percent / 100.0
        self.network_load = min(1.0, network_stats.bytes_sent / 1e9)  # Normalize

        return {
            'computation': self.computation_load,
            'memory': self.memory_load,
            'network': self.network_load
        }

    def determine_balance_strategy(self, current_loads):
        """
        Determine optimal load balancing strategy
        """
        strategy = {}

        # If computation is overloaded, reduce complexity
        if current_loads['computation'] > 0.8:
            strategy['reduce_complexity'] = True
            strategy['complexity_factor'] = max(0.5, 1.0 - (current_loads['computation'] - 0.8) * 2)

        # If memory is overloaded, reduce model detail
        if current_loads['memory'] > 0.85:
            strategy['reduce_memory_usage'] = True
            strategy['memory_factor'] = max(0.6, 1.0 - (current_loads['memory'] - 0.85) * 3)

        # If network is overloaded, reduce communication
        if current_loads['network'] > 0.7:
            strategy['reduce_communication'] = True
            strategy['update_rate_factor'] = max(0.5, 1.0 - (current_loads['network'] - 0.7) * 2)

        return strategy if strategy else None

    def apply_load_balance(self, strategy):
        """
        Apply load balancing strategy to simulation
        """
        commands = []

        if strategy.get('reduce_complexity'):
            factor = strategy['complexity_factor']
            commands.append(f'set_complexity {factor}')

        if strategy.get('reduce_memory_usage'):
            factor = strategy['memory_factor']
            commands.append(f'set_memory_factor {factor}')

        if strategy.get('reduce_communication'):
            factor = strategy['update_rate_factor']
            commands.append(f'set_update_rate_factor {factor}')

        if commands:
            cmd_msg = String()
            cmd_msg.data = json.dumps(commands)
            self.load_balance_pub.publish(cmd_msg)

def main(args=None):
    rclpy.init(args=args)

    # Create optimization system nodes
    performance_optimizer = PerformanceOptimizer()
    rtx_optimizer = RTXOptimizer()
    load_balancer = LoadBalancer()

    # Create executor to handle all nodes
    executor = rclpy.executors.MultiThreadedExecutor()
    executor.add_node(performance_optimizer)
    executor.add_node(rtx_optimizer)
    executor.add_node(load_balancer)

    try:
        executor.spin()
    except KeyboardInterrupt:
        pass
    finally:
        performance_optimizer.destroy_node()
        rtx_optimizer.destroy_node()
        load_balancer.destroy_node()
        executor.shutdown()
        rclpy.shutdown()

if __name__ == '__main__':
    main()
```

## Advanced Optimization Techniques

### GPU Memory Management

```python
#!/usr/bin/env python3

class GPUMemoryManager:
    """
    Advanced GPU memory management for RTX optimization
    """
    def __init__(self, max_memory_fraction=0.8):
        self.max_memory_fraction = max_memory_fraction
        self.memory_pools = {}
        self.allocation_history = []

    def optimize_memory_allocation(self, simulation_objects):
        """
        Optimize GPU memory allocation for simulation objects
        """
        import torch  # Example using PyTorch for CUDA management

        # Calculate required memory
        total_required = self.calculate_memory_requirements(simulation_objects)

        # Check available memory
        if torch.cuda.is_available():
            total_memory = torch.cuda.get_device_properties(0).total_memory
            available_memory = total_memory * self.max_memory_fraction

            if total_required > available_memory:
                # Reduce quality/settings to fit memory constraints
                reduction_factor = available_memory / total_required
                self.apply_memory_optimization(simulation_objects, reduction_factor)

    def calculate_memory_requirements(self, objects):
        """
        Calculate memory requirements for simulation objects
        """
        total_memory = 0

        for obj in objects:
            # Example calculations for different object types
            if obj.type == 'mesh':
                total_memory += obj.vertices * 3 * 4  # 3 floats per vertex, 4 bytes each
            elif obj.type == 'texture':
                total_memory += obj.width * obj.height * 4  # RGBA texture
            elif obj.type == 'sensor':
                total_memory += obj.resolution * 4  # Sensor data buffer

        return total_memory

    def apply_memory_optimization(self, objects, reduction_factor):
        """
        Apply memory optimization based on available memory
        """
        for obj in objects:
            if reduction_factor < 0.7:
                # Significant reduction needed
                obj.level_of_detail = 'low'
                obj.texture_resolution = max(64, int(obj.texture_resolution * reduction_factor))
            elif reduction_factor < 0.9:
                # Moderate reduction
                obj.level_of_detail = 'medium'
                obj.texture_resolution = max(128, int(obj.texture_resolution * reduction_factor))
            else:
                # Minimal reduction
                obj.level_of_detail = 'high'
```

### Multi-GPU Optimization

```python
#!/usr/bin/env python3

class MultiGPUOptimizer:
    """
    Multi-GPU optimization for RTX workstation clusters
    """
    def __init__(self):
        self.gpus = self.detect_available_gpus()
        self.load_balancer = GPULoadBalancer(self.gpus)

    def detect_available_gpus(self):
        """
        Detect and configure available GPUs
        """
        import GPUtil
        gpus = GPUtil.getGPUs()

        gpu_configs = []
        for i, gpu in enumerate(gpus):
            config = {
                'id': i,
                'name': gpu.name,
                'memory': gpu.memoryTotal,
                'compute_capability': self.get_compute_capability(i),
                'status': 'available'
            }
            gpu_configs.append(config)

        return gpu_configs

    def distribute_simulation_workload(self, simulation_tasks):
        """
        Distribute simulation tasks across available GPUs
        """
        # Assign tasks based on GPU capabilities and current load
        task_distribution = {}

        for task in simulation_tasks:
            assigned_gpu = self.load_balancer.select_optimal_gpu(task)
            task_distribution[task.id] = assigned_gpu

        return task_distribution

    def get_compute_capability(self, gpu_id):
        """
        Get compute capability of specific GPU
        """
        # This would interface with CUDA to get compute capability
        # For RTX 4090: typically 8.9
        # For RTX A6000: typically 8.6
        return 8.9  # Placeholder for RTX 4090
```

## Hardware Context

### RTX Workstation Optimization

For maximum performance on RTX Workstations:

- **GPU Selection**: RTX 4080/4090 or A6000 for maximum simulation performance
- **Memory Configuration**: 32GB+ system RAM with fast memory modules
- **Storage Optimization**: NVMe SSDs for fast model loading and data access
- **Cooling System**: Adequate cooling for sustained high-performance operation
- **Power Supply**: Sufficient wattage for multiple high-end GPUs

### Performance Tuning Parameters

#### Physics Optimization
- **Time Step**: Balance between accuracy (smaller) and performance (larger)
- **Solver Iterations**: Trade-off between stability and speed
- **Contact Parameters**: Optimize for specific simulation requirements

#### Rendering Optimization
- **Resolution Scaling**: Adjust for performance vs. visual quality
- **Ray Count**: Balance sensor accuracy with computational cost
- **Post-Processing**: Enable RTX-specific effects when beneficial

## Implementation Exercise

1. Create an optimization configuration file:
   ```bash
   mkdir -p ~/ros2_ws/src/gazebo_simulation_examples/config
   ```

2. Create an optimization launch file:
   ```python
   # Save as ~/ros2_ws/src/gazebo_simulation_examples/launch/performance_optimization.launch.py
   from launch import LaunchDescription
   from launch.actions import IncludeLaunchDescription, DeclareLaunchArgument, SetEnvironmentVariable
   from launch.launch_description_sources import PythonLaunchDescriptionSource
   from launch.substitutions import PathJoinSubstitution, LaunchConfiguration
   from launch_ros.actions import Node
   from launch_ros.substitutions import FindPackageShare

   def generate_launch_description():
       # Declare launch arguments
       enable_optimization = DeclareLaunchArgument(
           'enable_optimization',
           default_value='true',
           description='Enable performance optimization'
       )

       target_rtf = DeclareLaunchArgument(
           'target_rtf',
           default_value='1.0',
           description='Target real-time factor'
       )

       # Set environment variables for RTX optimization
       set_render_engine = SetEnvironmentVariable(
           name='GAZEBO_RENDER_ENGINE',
           value='ogre2'
       )

       set_cuda_device = SetEnvironmentVariable(
           name='CUDA_VISIBLE_DEVICES',
           value='0'  # Use first GPU
       )

       # Launch Gazebo with optimized settings
       gazebo = IncludeLaunchDescription(
           PythonLaunchDescriptionSource([
               PathJoinSubstitution([
                   FindPackageShare('gazebo_ros'),
                   'launch',
                   'empty_world.launch.py'
               ])
           ]),
           launch_arguments={
               'verbose': 'true'
           }.items()
       )

       # Launch robot state publisher
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

       # Launch performance optimizer
       performance_optimizer = Node(
           package='gazebo_simulation_examples',
           executable='performance_optimizer',
           name='performance_optimizer',
           parameters=[{
               'enable_optimization': LaunchConfiguration('enable_optimization'),
               'target_rtf': LaunchConfiguration('target_rtf')
           }],
           output='screen'
       )

       # Launch RTX optimizer
       rtx_optimizer = Node(
           package='gazebo_simulation_examples',
           executable='rtx_optimizer',
           name='rtx_optimizer',
           output='screen'
       )

       # Launch load balancer
       load_balancer = Node(
           package='gazebo_simulation_examples',
           executable='load_balancer',
           name='load_balancer',
           output='screen'
       )

       return LaunchDescription([
           enable_optimization,
           target_rtf,
           set_render_engine,
           set_cuda_device,
           gazebo,
           robot_state_publisher,
           performance_optimizer,
           rtx_optimizer,
           load_balancer
       ])
   ```

3. Create a performance monitoring script:
   ```python
   # Save as ~/ros2_ws/src/gazebo_simulation_examples/scripts/rtx_performance_monitor.py
   #!/usr/bin/env python3

   import subprocess
   import time
   import json
   import matplotlib.pyplot as plt
   from collections import deque
   import numpy as np
   import os

   class RTXPerformanceMonitor:
       """
       Monitor and analyze RTX workstation performance for simulation
       """
       def __init__(self):
           self.metrics_history = deque(maxlen=1000)  # Keep last 1000 samples
           self.monitoring = False
           self.data_dir = '/tmp/rtx_performance_data'
           os.makedirs(self.data_dir, exist_ok=True)

       def get_system_metrics(self):
           """
           Get comprehensive system performance metrics
           """
           metrics = {}

           # CPU metrics
           try:
               import psutil
               metrics['cpu_percent'] = psutil.cpu_percent(interval=0.1)
               metrics['memory_percent'] = psutil.virtual_memory().percent
               metrics['memory_available_gb'] = psutil.virtual_memory().available / (1024**3)
           except ImportError:
               print("psutil not available, skipping CPU metrics")

           # GPU metrics
           try:
               gpu_result = subprocess.run(
                   ['nvidia-smi',
                    '--query-gpu=utilization.gpu,utilization.memory,memory.used,memory.total,temperature.gpu,power.draw,clocks.current.graphics,clocks.current.sm',
                    '--format=csv,noheader,nounits'],
                   capture_output=True, text=True, timeout=5)

               if gpu_result.returncode == 0:
                   gpu_data = gpu_result.stdout.strip().split(', ')
                   if len(gpu_data) >= 8:
                       metrics['gpu_util'] = float(gpu_data[0])
                       metrics['gpu_mem_util'] = float(gpu_data[1])
                       metrics['gpu_mem_used'] = float(gpu_data[2])
                       metrics['gpu_mem_total'] = float(gpu_data[3])
                       metrics['gpu_temp'] = float(gpu_data[4])
                       metrics['gpu_power'] = float(gpu_data[5])
                       metrics['gpu_clock_graphics'] = float(gpu_data[6].split()[0])  # Extract number from "1800 MHz"
                       metrics['gpu_clock_sm'] = float(gpu_data[7].split()[0])  # Extract number from "1800 MHz"
           except subprocess.TimeoutExpired:
               print("nvidia-smi timed out")
           except Exception as e:
               print(f"GPU metrics error: {e}")

           # Additional system metrics
           metrics['timestamp'] = time.time()

           return metrics

       def monitor_performance(self, duration=60):
           """
           Monitor performance for specified duration
           """
           print(f"Starting RTX performance monitoring for {duration} seconds...")

           start_time = time.time()
           self.monitoring = True

           while time.time() - start_time < duration and self.monitoring:
               metrics = self.get_system_metrics()
               self.metrics_history.append(metrics)

               # Print current status
               if 'gpu_util' in metrics:
                   print(f"GPU: {metrics['gpu_util']:.1f}% | "
                         f"Mem: {metrics['gpu_mem_util']:.1f}% | "
                         f"Temp: {metrics['gpu_temp']:.1f}C | "
                         f"Power: {metrics['gpu_power']:.1f}W")

               time.sleep(1)  # 1 second sampling rate

           print("Performance monitoring completed.")

       def generate_report(self):
           """
           Generate performance analysis report
           """
           if not self.metrics_history:
               print("No performance data available.")
               return

           # Convert metrics to arrays for analysis
           timestamps = [m['timestamp'] for m in self.metrics_history if 'timestamp' in m]

           gpu_utils = [m['gpu_util'] for m in self.metrics_history if 'gpu_util' in m]
           gpu_mems = [m['gpu_mem_util'] for m in self.metrics_history if 'gpu_mem_util' in m]
           gpu_temps = [m['gpu_temp'] for m in self.metrics_history if 'gpu_temp' in m]
           cpu_utils = [m['cpu_percent'] for m in self.metrics_history if 'cpu_percent' in m]

           # Calculate statistics
           stats = {
               'gpu': {
                   'avg_util': np.mean(gpu_utils) if gpu_utils else 0,
                   'max_util': np.max(gpu_utils) if gpu_utils else 0,
                   'min_util': np.min(gpu_utils) if gpu_utils else 0,
                   'std_util': np.std(gpu_utils) if gpu_utils else 0
               },
               'gpu_memory': {
                   'avg_util': np.mean(gpu_mems) if gpu_mems else 0,
                   'max_util': np.max(gpu_mems) if gpu_mems else 0,
                   'min_util': np.min(gpu_mems) if gpu_mems else 0,
               },
               'temperature': {
                   'avg_temp': np.mean(gpu_temps) if gpu_temps else 0,
                   'max_temp': np.max(gpu_temps) if gpu_temps else 0,
                   'thermal_throttling_risk': 'HIGH' if np.max(gpu_temps) > 80 else 'LOW' if gpu_temps else 'N/A'
               },
               'cpu': {
                   'avg_util': np.mean(cpu_utils) if cpu_utils else 0,
                   'max_util': np.max(cpu_utils) if cpu_utils else 0,
               }
           }

           # Save detailed metrics
           detailed_metrics = {
               'timestamps': timestamps,
               'gpu_utils': gpu_utils,
               'gpu_mems': gpu_mems,
               'gpu_temps': gpu_temps,
               'cpu_utils': cpu_utils,
               'statistics': stats
           }

           metrics_path = os.path.join(self.data_dir, f'rtx_metrics_{int(time.time())}.json')
           with open(metrics_path, 'w') as f:
               json.dump(detailed_metrics, f, indent=2)

           # Generate plots
           self.generate_plots(detailed_metrics)

           print(f"Performance report saved to: {metrics_path}")
           return stats

       def generate_plots(self, metrics_data):
           """
           Generate performance visualization plots
           """
           fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(15, 10))

           # GPU Utilization
           ax1.plot(metrics_data['gpu_utils'])
           ax1.set_title('GPU Utilization Over Time')
           ax1.set_ylabel('Utilization (%)')
           ax1.grid(True)

           # GPU Memory
           ax2.plot(metrics_data['gpu_mems'])
           ax2.set_title('GPU Memory Utilization Over Time')
           ax2.set_ylabel('Memory Utilization (%)')
           ax2.grid(True)

           # GPU Temperature
           ax3.plot(metrics_data['gpu_temps'])
           ax3.set_title('GPU Temperature Over Time')
           ax3.set_ylabel('Temperature (°C)')
           ax3.grid(True)

           # CPU Utilization
           ax4.plot(metrics_data['cpu_utils'])
           ax4.set_title('CPU Utilization Over Time')
           ax4.set_ylabel('Utilization (%)')
           ax4.grid(True)

           plt.tight_layout()

           plot_path = os.path.join(self.data_dir, f'rtx_performance_plot_{int(time.time())}.png')
           plt.savefig(plot_path)
           plt.show()

           print(f"Performance plots saved to: {plot_path}")

       def optimize_settings_based_on_metrics(self, stats):
           """
           Suggest optimization settings based on performance metrics
           """
           suggestions = []

           # GPU utilization suggestions
           if stats['gpu']['avg_util'] > 90:
               suggestions.append("GPU heavily utilized - consider reducing simulation complexity")
           elif stats['gpu']['avg_util'] < 30:
               suggestions.append("GPU underutilized - consider increasing simulation complexity")

           # Memory suggestions
           if stats['gpu_memory']['avg_util'] > 85:
               suggestions.append("High GPU memory usage - reduce model complexity or enable memory optimization")
           elif stats['gpu_memory']['avg_util'] < 40:
               suggestions.append("GPU memory underutilized - can increase model detail")

           # Temperature suggestions
           if stats['temperature']['max_temp'] > 80:
               suggestions.append("High GPU temperature - check cooling or reduce load")
           elif stats['temperature']['max_temp'] < 60:
               suggestions.append("GPU temperature good - safe for sustained operation")

           # Performance suggestions
           if stats['gpu']['std_util'] > 30:  # High variance
               suggestions.append("High GPU utilization variance - consider load balancing")

           return suggestions

   def main():
       monitor = RTXPerformanceMonitor()

       print("RTX Workstation Performance Monitor")
       print("===================================")

       duration = int(input("Enter monitoring duration in seconds (default 60): ") or "60")

       # Start monitoring
       monitor.monitor_performance(duration)

       # Generate analysis
       stats = monitor.generate_report()

       if stats:
           print("\nPerformance Analysis:")
           print(f"GPU Average Utilization: {stats['gpu']['avg_util']:.1f}%")
           print(f"GPU Memory Average Utilization: {stats['gpu_memory']['avg_util']:.1f}%")
           print(f"GPU Average Temperature: {stats['temperature']['avg_temp']:.1f}°C")
           print(f"CPU Average Utilization: {stats['cpu']['avg_util']:.1f}%")

           # Get optimization suggestions
           suggestions = monitor.optimize_settings_based_on_metrics(stats)
           print("\nOptimization Suggestions:")
           for suggestion in suggestions:
               print(f"  - {suggestion}")

   if __name__ == "__main__":
       main()
   ```

4. Make the script executable and run performance optimization:
   ```bash
   chmod +x ~/ros2_ws/src/gazebo_simulation_examples/scripts/rtx_performance_monitor.py

   cd ~/ros2_ws
   colcon build --packages-select gazebo_simulation_examples
   source install/setup.bash

   # Launch performance optimization system
   ros2 launch gazebo_simulation_examples performance_optimization.launch.py enable_optimization:=true target_rtf:=1.0

   # In another terminal, run RTX performance monitoring
   python3 ~/ros2_ws/src/gazebo_simulation_examples/scripts/rtx_performance_monitor.py
   ```

## Troubleshooting

- **Thermal Throttling**: Monitor GPU temperatures and adjust cooling or reduce load
- **Memory Exhaustion**: Implement memory pooling and reduce model complexity
- **Performance Degradation**: Profile and optimize bottlenecks in physics or rendering
- **Driver Issues**: Ensure latest NVIDIA drivers are installed for RTX cards

## Summary

This lesson covered comprehensive optimization strategies for RTX Workstation simulation environments, including GPU-specific optimizations, performance monitoring, and dynamic load balancing. Proper optimization of RTX hardware is essential for achieving high-fidelity, real-time Digital Twin simulation for Physical AI and humanoid robotics applications.

## Next Steps

In the final lesson for Module 2, we'll explore best practices for Digital Twin implementation, synthesizing all the concepts learned throughout this module into practical implementation guidelines.