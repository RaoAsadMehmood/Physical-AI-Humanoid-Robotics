---
sidebar_position: 11
prev:
  title: Week 22, Lesson 9 - Testing and Validation Techniques in Simulation
  url: /docs/chapter2/13-week-plan/week22-lesson9-testing-validation-techniques
next:
  title: Week 24, Lesson 11 - Hardware-in-the-Loop Simulation
  url: /docs/chapter2/13-week-plan/week24-lesson11-hardware-in-loop-simulation
---

# Sim-to-Real Transfer Principles and Techniques

## Learning Objectives

By the end of this lesson, you will be able to:
- Understand the challenges and principles of sim-to-real transfer
- Apply domain randomization techniques to improve transferability
- Implement system identification methods for model refinement
- Design robust controllers that work in both simulation and reality
- Evaluate and validate sim-to-real transfer performance

## Overview

Sim-to-real transfer is the critical bridge between Digital Twin simulation environments and actual Physical AI and humanoid robotics systems. This lesson covers the theoretical foundations and practical techniques for effectively transferring behaviors, controllers, and learned models from simulation to real-world deployment.

## The Reality Gap Problem

### Definition and Causes

The "reality gap" refers to the discrepancy between simulated and real-world robot behavior. Key causes include:

- **Model Inaccuracies**: Simplified physics, mass properties, friction models
- **Sensor Noise**: Different noise characteristics between simulated and real sensors
- **Actuator Dynamics**: Differences in motor response, delays, and power limitations
- **Environmental Factors**: Unmodeled disturbances, lighting conditions, surface properties
- **Hardware Limitations**: Joint limits, computational delays, calibration errors

### Systematic Approaches to Address Reality Gap

## Domain Randomization Techniques

### Physics Parameter Randomization

```python
#!/usr/bin/env python3

import numpy as np
import random

class DomainRandomizer:
    """
    Implements domain randomization for sim-to-real transfer
    """
    def __init__(self):
        # Define ranges for physics parameters
        self.param_ranges = {
            # Mass variations (±10%)
            'mass_multiplier': (0.9, 1.1),

            # Friction coefficients (wide range)
            'friction_range': (0.1, 1.0),

            # Inertia variations (±20%)
            'inertia_multiplier': (0.8, 1.2),

            # Actuator dynamics (varied response)
            'motor_time_constant_range': (0.01, 0.1),
            'motor_efficiency_range': (0.7, 1.0),

            # Sensor noise (varied characteristics)
            'imu_noise_range': (0.001, 0.01),
            'camera_noise_range': (0.001, 0.05),

            # Environmental factors
            'gravity_range': (9.7, 9.9),  # Variations in gravity
            'ground_friction_range': (0.3, 0.9),
        }

    def randomize_robot_parameters(self):
        """
        Generate randomized robot parameters for domain randomization
        """
        randomized_params = {}

        for param_name, param_range in self.param_ranges.items():
            min_val, max_val = param_range
            randomized_params[param_name] = random.uniform(min_val, max_val)

        return randomized_params

    def apply_randomization_to_model(self, robot_model, randomized_params):
        """
        Apply randomized parameters to robot model
        """
        # Update mass properties
        for link_name in robot_model.links:
            original_mass = robot_model.links[link_name].mass
            robot_model.links[link_name].mass *= randomized_params['mass_multiplier']

            # Update inertia
            original_inertia = robot_model.links[link_name].inertia
            for i in range(3):
                for j in range(3):
                    robot_model.links[link_name].inertia[i][j] *= randomized_params['inertia_multiplier']

        # Update friction coefficients
        robot_model.friction_coefficient = randomized_params['friction_range']

        # Update actuator dynamics
        robot_model.motor_time_constant = randomized_params['motor_time_constant_range']
        robot_model.motor_efficiency = randomized_params['motor_efficiency_range']

        return robot_model
```

### Texture and Visual Randomization

```python
#!/usr/bin/env python3

import cv2
import numpy as np

class VisualDomainRandomizer:
    """
    Randomizes visual appearance for domain randomization
    """
    def __init__(self):
        self.color_ranges = [
            ((0, 0, 0), (180, 255, 30)),    # Dark colors
            ((0, 0, 200), (180, 30, 255)),  # Bright colors
            ((100, 100, 100), (180, 180, 180)),  # Mid-range colors
        ]

    def randomize_texture(self, base_texture):
        """
        Apply random visual modifications to texture
        """
        # Add random noise
        noise = np.random.normal(0, random.uniform(0.01, 0.1), base_texture.shape)
        noised_texture = np.clip(base_texture + noise, 0, 1)

        # Random color adjustments
        hue_shift = random.uniform(-10, 10)
        sat_mult = random.uniform(0.8, 1.2)
        val_mult = random.uniform(0.8, 1.2)

        # Convert to HSV and apply adjustments
        hsv = cv2.cvtColor((noised_texture * 255).astype(np.uint8), cv2.COLOR_RGB2HSV).astype(np.float32)
        hsv[:, :, 0] = (hsv[:, :, 0] + hue_shift) % 180
        hsv[:, :, 1] = np.clip(hsv[:, :, 1] * sat_mult, 0, 255)
        hsv[:, :, 2] = np.clip(hsv[:, :, 2] * val_mult, 0, 255)

        randomized_texture = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2RGB).astype(np.float32) / 255.0

        return randomized_texture

    def randomize_lighting(self, image):
        """
        Apply random lighting conditions to simulate different environments
        """
        # Random brightness and contrast
        brightness = random.uniform(-0.2, 0.2)
        contrast = random.uniform(0.8, 1.2)

        adjusted = np.clip(image * contrast + brightness, 0, 1)

        # Add random shadows/highlights
        shadow_mask = np.random.random(image.shape[:2]) > 0.7
        adjusted[shadow_mask] *= random.uniform(0.3, 0.8)

        highlight_mask = np.random.random(image.shape[:2]) > 0.9
        adjusted[highlight_mask] = np.clip(adjusted[highlight_mask] * random.uniform(1.1, 1.5), 0, 1)

        return adjusted
```

## Python/ROS 2 Code Example - Sim-to-Real Transfer Framework

Here's a comprehensive example of a sim-to-real transfer framework:

```python
#!/usr/bin/env python3

import rclpy
from rclpy.node import Node
from std_msgs.msg import Float64, String, Bool
from sensor_msgs.msg import JointState, Imu, Image, LaserScan
from geometry_msgs.msg import Twist, Pose, Vector3
from nav_msgs.msg import Odometry
from builtin_interfaces.msg import Time
import numpy as np
import math
import pickle
import os
from dataclasses import dataclass
from typing import Dict, List, Tuple, Optional
import threading
import time

@dataclass
class TransferMetrics:
    """
    Metrics for evaluating sim-to-real transfer
    """
    sim_performance: float
    real_performance: float
    transfer_gap: float
    success_rate: float
    adaptation_time: float

class SystemIdentifier(Node):
    """
    System identification for model refinement
    """
    def __init__(self):
        super().__init__('system_identifier')

        # Data collection
        self.excitation_data = []
        self.response_data = []
        self.collection_active = False

        # Publishers/subscribers for data collection
        self.joint_state_sub = self.create_subscription(
            JointState, '/joint_states', self.joint_state_callback, 10)
        self.imu_sub = self.create_subscription(
            Imu, '/imu', self.imu_callback, 10)
        self.cmd_pub = self.create_publisher(
            JointState, '/joint_group_position_controller/commands', 10)

        # Timer for system excitation
        self.excitation_timer = self.create_timer(0.01, self.apply_excitation)

        self.excitation_phase = 0
        self.excitation_duration = 1000  # 10 seconds at 100Hz

        self.get_logger().info('System Identifier initialized')

    def joint_state_callback(self, msg):
        """
        Collect joint state data for system identification
        """
        if self.collection_active:
            self.response_data.append({
                'timestamp': msg.header.stamp,
                'positions': list(msg.position),
                'velocities': list(msg.velocity),
                'efforts': list(msg.effort)
            })

    def imu_callback(self, msg):
        """
        Collect IMU data for system identification
        """
        if self.collection_active:
            self.response_data.append({
                'timestamp': msg.header.stamp,
                'orientation': [msg.orientation.x, msg.orientation.y, msg.orientation.z, msg.orientation.w],
                'angular_velocity': [msg.angular_velocity.x, msg.angular_velocity.y, msg.angular_velocity.z],
                'linear_acceleration': [msg.linear_acceleration.x, msg.linear_acceleration.y, msg.linear_acceleration.z]
            })

    def apply_excitation(self):
        """
        Apply controlled excitation signals to identify system dynamics
        """
        if self.excitation_phase < self.excitation_duration:
            self.collection_active = True

            # Generate excitation signal (PRBS or multi-sine)
            excitation_signal = self.generate_excitation_signal()

            # Publish excitation command
            cmd_msg = JointState()
            cmd_msg.position = excitation_signal
            cmd_msg.header.stamp = self.get_clock().now().to_msg()
            self.cmd_pub.publish(cmd_msg)

            # Store excitation data
            self.excitation_data.append({
                'timestamp': cmd_msg.header.stamp,
                'command': excitation_signal
            })

            self.excitation_phase += 1
        else:
            self.collection_active = False
            self.analyze_system_data()

    def generate_excitation_signal(self):
        """
        Generate system identification excitation signal
        """
        # Multi-sine excitation with random phases
        t = self.excitation_phase * 0.01  # 100Hz timing
        n_joints = 8  # Example for humanoid robot

        signal = []
        for i in range(n_joints):
            # Sum of multiple sine waves at different frequencies
            joint_signal = 0
            for freq in [0.5, 1.0, 2.0, 5.0]:  # Multiple frequencies
                phase = np.random.uniform(0, 2*np.pi)
                amplitude = 0.1  # Small amplitude for safety
                joint_signal += amplitude * np.sin(2*np.pi*freq*t + phase)

            signal.append(joint_signal)

        return signal

    def analyze_system_data(self):
        """
        Analyze collected data to identify system parameters
        """
        self.get_logger().info(f'Analyzing {len(self.excitation_data)} data points')

        # Perform system identification (simplified example)
        # In practice, use advanced methods like subspace identification or neural networks
        identified_params = self.perform_system_identification()

        # Save identified parameters
        self.save_identified_parameters(identified_params)

    def perform_system_identification(self):
        """
        Perform system identification using collected data
        """
        # Simplified example - in practice, use sophisticated methods
        params = {
            'mass_matrix': np.eye(8),  # 8 DOF example
            'damping_matrix': 0.1 * np.eye(8),
            'stiffness_matrix': np.eye(8),
            'sensor_noise_covariance': np.eye(6) * 0.001,
            'actuator_delay': 0.01,  # 10ms delay
        }

        return params

    def save_identified_parameters(self, params):
        """
        Save identified parameters for use in sim-to-real transfer
        """
        save_path = '/tmp/identified_system_params.pkl'
        with open(save_path, 'wb') as f:
            pickle.dump(params, f)

        self.get_logger().info(f'System parameters saved to {save_path}')

class RobustController(Node):
    """
    Robust controller designed for sim-to-real transfer
    """
    def __init__(self):
        super().__init__('robust_controller')

        # Controller parameters
        self.nominal_params = self.load_nominal_parameters()
        self.uncertainty_bounds = self.calculate_uncertainty_bounds()

        # Adaptive components
        self.adaptation_gain = 0.01
        self.parameter_estimates = self.nominal_params.copy()

        # Publishers/subscribers
        self.joint_state_sub = self.create_subscription(
            JointState, '/joint_states', self.joint_state_callback, 10)
        self.cmd_pub = self.create_publisher(
            JointState, '/joint_group_position_controller/commands', 10)

        # Timer for control loop
        self.control_timer = self.create_timer(0.01, self.control_loop)

        # State variables
        self.current_positions = np.zeros(8)
        self.current_velocities = np.zeros(8)
        self.desired_positions = np.zeros(8)
        self.desired_velocities = np.zeros(8)

        self.get_logger().info('Robust Controller initialized')

    def load_nominal_parameters(self):
        """
        Load nominal system parameters (from system identification or CAD model)
        """
        # Try to load from system identification results
        param_file = '/tmp/identified_system_params.pkl'
        if os.path.exists(param_file):
            with open(param_file, 'rb') as f:
                params = pickle.load(f)
        else:
            # Default parameters if no identification data available
            params = {
                'mass_matrix': np.eye(8),
                'damping_matrix': 0.1 * np.eye(8),
                'stiffness_matrix': np.eye(8),
            }

        return params

    def calculate_uncertainty_bounds(self):
        """
        Calculate expected parameter uncertainty bounds
        """
        # Based on domain randomization ranges and system identification confidence
        bounds = {
            'mass_uncertainty': 0.2,  # ±20% mass uncertainty
            'damping_uncertainty': 0.5,  # ±50% damping uncertainty
            'friction_uncertainty': 1.0,  # High friction uncertainty
        }
        return bounds

    def joint_state_callback(self, msg):
        """
        Update current state from joint states
        """
        if len(msg.position) >= 8:
            self.current_positions = np.array(msg.position[:8])
        if len(msg.velocity) >= 8:
            self.current_velocities = np.array(msg.velocity[:8])

    def control_loop(self):
        """
        Main robust control loop
        """
        # Update parameter estimates adaptively
        self.update_parameter_estimates()

        # Compute control command using robust control law
        control_cmd = self.compute_robust_control()

        # Publish command
        cmd_msg = JointState()
        cmd_msg.position = control_cmd.tolist()
        cmd_msg.header.stamp = self.get_clock().now().to_msg()
        self.cmd_pub.publish(cmd_msg)

    def update_parameter_estimates(self):
        """
        Update parameter estimates using adaptive control law
        """
        # Simplified parameter adaptation
        # In practice, use more sophisticated adaptation laws
        position_error = self.desired_positions - self.current_positions
        velocity_error = self.desired_velocities - self.current_velocities

        # Update mass estimates based on acceleration error
        if hasattr(self, 'last_acceleration'):
            acceleration_error = (velocity_error - self.last_velocity_error) / 0.01  # dt = 0.01s
            # Parameter update law (simplified)
            mass_correction = self.adaptation_gain * acceleration_error
            self.parameter_estimates['mass_matrix'] += np.diag(mass_correction)

        self.last_velocity_error = velocity_error

    def compute_robust_control(self):
        """
        Compute robust control command
        """
        # Desired acceleration based on PD control
        position_error = self.desired_positions - self.current_positions
        velocity_error = self.desired_velocities - self.current_velocities

        kp = 100.0  # Position gain
        kd = 20.0   # Velocity gain

        desired_acceleration = kp * position_error + kd * velocity_error

        # Compute control using estimated dynamics model
        # tau = M(q) * desired_acc + C(q, q_dot) * q_dot + g(q)
        # Simplified: tau = M_est * desired_acc + D_est * velocity + K_est * position
        control_torque = (
            self.parameter_estimates['mass_matrix'] @ desired_acceleration +
            self.parameter_estimates['damping_matrix'] @ self.current_velocities +
            self.parameter_estimates['stiffness_matrix'] @ self.current_positions
        )

        # Add robustness term to handle uncertainties
        robustness_term = self.compute_robustness_term(position_error, velocity_error)
        control_torque += robustness_term

        return control_torque

    def compute_robustness_term(self, pos_error, vel_error):
        """
        Compute robustness term to handle model uncertainties
        """
        # Boundary layer approach to reduce chattering
        boundary_thickness = 0.05
        sat_error = np.tanh(pos_error / boundary_thickness) * boundary_thickness

        # Robust control term
        robust_gain = 50.0
        robust_term = robust_gain * sat_error

        return robust_term

class TransferEvaluator(Node):
    """
    Evaluate sim-to-real transfer performance
    """
    def __init__(self):
        super().__init__('transfer_evaluator')

        # Publishers/subscribers for performance data
        self.sim_performance_sub = self.create_subscription(
            Float64, '/simulation_performance', self.sim_performance_callback, 10)
        self.real_performance_sub = self.create_subscription(
            Float64, '/real_performance', self.real_performance_callback, 10)

        # Publisher for transfer metrics
        self.metrics_pub = self.create_publisher(
            String, '/transfer_metrics', 10)

        # Timer for evaluation
        self.evaluation_timer = self.create_timer(5.0, self.evaluate_transfer)

        # Performance tracking
        self.sim_performance_history = []
        self.real_performance_history = []

        self.get_logger().info('Transfer Evaluator initialized')

    def sim_performance_callback(self, msg):
        """
        Record simulation performance
        """
        self.sim_performance_history.append({
            'timestamp': self.get_clock().now(),
            'performance': msg.data
        })

    def real_performance_callback(self, msg):
        """
        Record real-world performance
        """
        self.real_performance_history.append({
            'timestamp': self.get_clock().now(),
            'performance': msg.data
        })

    def evaluate_transfer(self):
        """
        Evaluate sim-to-real transfer metrics
        """
        if not self.sim_performance_history or not self.real_performance_history:
            return

        # Calculate recent performance metrics
        recent_sim = [p['performance'] for p in self.sim_performance_history[-10:]]
        recent_real = [p['performance'] for p in self.real_performance_history[-10:]]

        if not recent_sim or not recent_real:
            return

        avg_sim_performance = sum(recent_sim) / len(recent_sim)
        avg_real_performance = sum(recent_real) / len(recent_real)

        # Calculate transfer gap
        transfer_gap = abs(avg_sim_performance - avg_real_performance)

        # Success rate based on performance similarity
        performance_ratio = avg_real_performance / avg_sim_performance if avg_sim_performance != 0 else 0
        success_rate = max(0, min(1, 2 - abs(1 - performance_ratio)))  # 1.0 if perfect match, 0 if 2x different

        # Create transfer metrics
        metrics = TransferMetrics(
            sim_performance=avg_sim_performance,
            real_performance=avg_real_performance,
            transfer_gap=transfer_gap,
            success_rate=success_rate,
            adaptation_time=0.0  # Would track actual adaptation time in real implementation
        )

        # Publish metrics
        metrics_msg = String()
        metrics_msg.data = f"Transfer Success Rate: {metrics.success_rate:.2f}, Gap: {metrics.transfer_gap:.3f}"
        self.metrics_pub.publish(metrics_msg)

        # Log evaluation
        self.get_logger().info(
            f'Transfer Evaluation - Sim: {avg_sim_performance:.3f}, '
            f'Real: {avg_real_performance:.3f}, Gap: {transfer_gap:.3f}, '
            f'Success: {success_rate:.2f}'
        )

def main(args=None):
    rclpy.init(args=args)

    # Create nodes for sim-to-real transfer system
    system_identifier = SystemIdentifier()
    robust_controller = RobustController()
    transfer_evaluator = TransferEvaluator()

    # Create executor to handle all nodes
    executor = rclpy.executors.MultiThreadedExecutor()
    executor.add_node(system_identifier)
    executor.add_node(robust_controller)
    executor.add_node(transfer_evaluator)

    try:
        executor.spin()
    except KeyboardInterrupt:
        pass
    finally:
        system_identifier.destroy_node()
        robust_controller.destroy_node()
        transfer_evaluator.destroy_node()
        executor.shutdown()
        rclpy.shutdown()

if __name__ == '__main__':
    main()
```

## Advanced Transfer Techniques

### Curriculum Learning for Transfer

```python
#!/usr/bin/env python3

class CurriculumTransfer:
    """
    Curriculum learning approach for sim-to-real transfer
    """
    def __init__(self):
        self.curriculum_levels = [
            {'complexity': 0.1, 'tasks': ['basic_balance']},
            {'complexity': 0.3, 'tasks': ['simple_maneuvers']},
            {'complexity': 0.6, 'tasks': ['complex_maneuvers']},
            {'complexity': 0.9, 'tasks': ['realistic_scenarios']},
        ]
        self.current_level = 0
        self.performance_threshold = 0.85

    def advance_curriculum(self, performance):
        """
        Advance curriculum level based on performance
        """
        if performance >= self.performance_threshold and self.current_level < len(self.curriculum_levels) - 1:
            self.current_level += 1
            self.get_logger().info(f'Advanced to curriculum level {self.current_level + 1}')
            return True
        return False
```

### Meta-Learning for Rapid Adaptation

```python
#!/usr/bin/env python3

class MetaLearningTransfer:
    """
    Meta-learning approach for rapid sim-to-real adaptation
    """
    def __init__(self):
        self.meta_model = None
        self.task_distributions = {}
        self.adaptation_buffer = []

    def meta_train(self, task_distributions):
        """
        Meta-train on distribution of simulation tasks
        """
        # Train meta-learning model to adapt quickly to new tasks
        # This would typically involve training a neural network to learn fast adaptation
        pass

    def adapt_to_real(self, real_task_data):
        """
        Rapidly adapt meta-model to real-world task
        """
        # Use meta-learning to quickly adapt to real-world conditions
        # with minimal real-world training data
        pass
```

## Hardware Context

### RTX Workstation Considerations

For sim-to-real transfer on RTX Workstations:

- **High-Fidelity Simulation**: Use detailed models that capture real hardware characteristics
- **Extensive Domain Randomization**: Leverage computational power for comprehensive randomization
- **System Identification**: Perform detailed system identification with rich data collection
- **Controller Synthesis**: Design sophisticated robust controllers using advanced optimization

### Jetson Orin Kit Considerations

For edge-based transfer applications:

- **Lightweight Controllers**: Implement efficient controllers suitable for embedded deployment
- **Adaptive Control**: Focus on adaptation mechanisms that work with limited computational resources
- **Real-time Performance**: Ensure controllers meet real-time constraints during transfer
- **Model Compression**: Use compressed models that maintain transfer performance while reducing complexity

## Implementation Exercise

1. Create a transfer evaluation script:
   ```bash
   mkdir -p ~/ros2_ws/src/gazebo_simulation_examples/scripts
   ```

2. Create a domain randomization launch file:
   ```python
   # Save as ~/ros2_ws/src/gazebo_simulation_examples/launch/domain_randomization.launch.py
   from launch import LaunchDescription
   from launch.actions import IncludeLaunchDescription, DeclareLaunchArgument
   from launch.launch_description_sources import PythonLaunchDescriptionSource
   from launch.substitutions import PathJoinSubstitution, LaunchConfiguration
   from launch_ros.actions import Node
   from launch_ros.substitutions import FindPackageShare

   def generate_launch_description():
       # Declare launch arguments
       randomization_enabled = DeclareLaunchArgument(
           'randomization_enabled',
           default_value='true',
           description='Enable domain randomization'
       )

       # Launch Gazebo
       gazebo = IncludeLaunchDescription(
           PythonLaunchDescriptionSource([
               PathJoinSubstitution([
                   FindPackageShare('gazebo_ros'),
                   'launch',
                   'empty_world.launch.py'
               ])
           ])
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

       # Launch domain randomizer
       domain_randomizer = Node(
           package='gazebo_simulation_examples',
           executable='domain_randomizer',
           name='domain_randomizer',
           parameters=[{
               'randomization_enabled': LaunchConfiguration('randomization_enabled')
           }],
           output='screen'
       )

       # Launch robust controller
       robust_controller = Node(
           package='gazebo_simulation_examples',
           executable='robust_controller',
           name='robust_controller',
           output='screen'
       )

       # Launch transfer evaluator
       transfer_evaluator = Node(
           package='gazebo_simulation_examples',
           executable='transfer_evaluator',
           name='transfer_evaluator',
           output='screen'
       )

       return LaunchDescription([
           randomization_enabled,
           gazebo,
           robot_state_publisher,
           domain_randomizer,
           robust_controller,
           transfer_evaluator
       ])
   ```

3. Create a system identification test script:
   ```python
   # Save as ~/ros2_ws/src/gazebo_simulation_examples/scripts/run_system_identification.py
   #!/usr/bin/env python3

   import numpy as np
   import matplotlib.pyplot as plt
   from scipy import signal
   import pickle
   import os

   class SystemIdentificationTest:
       """
       Test script for system identification in simulation
       """
       def __init__(self):
           self.sample_rate = 100  # Hz
           self.duration = 30  # seconds
           self.data_dir = '/tmp/sysid_data'

           os.makedirs(self.data_dir, exist_ok=True)

       def generate_excitation_signal(self, duration, sample_rate):
           """
           Generate multi-sine excitation signal
           """
           t = np.linspace(0, duration, int(duration * sample_rate))

           # Multi-sine signal with multiple frequencies
           frequencies = [0.1, 0.2, 0.5, 1.0, 2.0, 5.0]  # Hz
           signal_components = []

           for freq in frequencies:
               # Random phase for each frequency component
               phase = np.random.uniform(0, 2*np.pi)
               component = 0.1 * np.sin(2*np.pi*freq*t + phase)
               signal_components.append(component)

           # Sum all components
           excitation_signal = np.sum(signal_components, axis=0)

           # Apply windowing to reduce transients
           window = signal.windows.hann(len(excitation_signal))
           excitation_signal = excitation_signal * window

           return excitation_signal, t

       def simulate_system_response(self, input_signal):
           """
           Simulate system response to input (with some realistic dynamics)
           """
           # Create a simple second-order system as example
           # In reality, this would interface with the actual simulation
           system_tf = signal.lti([1], [1, 1.4, 1])  # Underdamped second-order system

           # Add some noise and delay
           dt = 0.01  # 100Hz
           t = np.arange(0, len(input_signal)) * dt

           # Simulate response
           _, response, _ = signal.lsim(system_tf, input_signal, t)

           # Add measurement noise
           noise_level = 0.01
           noisy_response = response + np.random.normal(0, noise_level, len(response))

           return noisy_response

       def perform_system_identification(self, input_signal, output_signal):
           """
           Perform basic system identification
           """
           from scipy.signal import correlate

           # Estimate impulse response using cross-correlation
           input_output_corr = correlate(output_signal, input_signal, mode='full')
           output_auto_corr = correlate(output_signal, output_signal, mode='full')

           # Estimate system parameters (simplified approach)
           # In practice, use more sophisticated methods like subspace identification
           estimated_params = {
               'order': 2,  # Estimated system order
               'natural_frequency': 1.0,  # Estimated natural frequency (rad/s)
               'damping_ratio': 0.7,      # Estimated damping ratio
               'static_gain': 1.0         # Estimated static gain
           }

           return estimated_params

       def run_identification_test(self):
           """
           Run complete system identification test
           """
           print("Generating excitation signal...")
           input_signal, time_vector = self.generate_excitation_signal(self.duration, self.sample_rate)

           print("Simulating system response...")
           output_signal = self.simulate_system_response(input_signal)

           print("Performing system identification...")
           estimated_params = self.perform_system_identification(input_signal, output_signal)

           # Save results
           results = {
               'time': time_vector,
               'input': input_signal,
               'output': output_signal,
               'estimated_params': estimated_params
           }

           results_path = os.path.join(self.data_dir, 'sysid_results.pkl')
           with open(results_path, 'wb') as f:
               pickle.dump(results, f)

           print(f"System identification completed. Results saved to {results_path}")
           print(f"Estimated parameters: {estimated_params}")

           # Plot results
           self.plot_results(results)

           return results

       def plot_results(self, results):
           """
           Plot system identification results
           """
           fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 8))

           # Plot input and output
           ax1.plot(results['time'], results['input'], label='Input Signal', alpha=0.7)
           ax1.plot(results['time'], results['output'], label='Output Signal', alpha=0.7)
           ax1.set_xlabel('Time (s)')
           ax1.set_ylabel('Amplitude')
           ax1.set_title('System Identification - Input/Output Signals')
           ax1.legend()
           ax1.grid(True)

           # Plot frequency response (estimated)
           sampling_freq = 1 / (results['time'][1] - results['time'][0])
           f, Pxx = signal.welch(results['input'], fs=sampling_freq)
           f, Pyy = signal.welch(results['output'], fs=sampling_freq)

           # Calculate estimated frequency response
           H_est = np.sqrt(Pyy / Pxx) if len(Pxx) > 0 else np.ones_like(f)

           ax2.semilogy(f, H_est, label='Estimated Frequency Response', alpha=0.7)
           ax2.set_xlabel('Frequency (Hz)')
           ax2.set_ylabel('Magnitude')
           ax2.set_title('Estimated Frequency Response')
           ax2.legend()
           ax2.grid(True)

           plt.tight_layout()
           plt.savefig(os.path.join(self.data_dir, 'sysid_analysis.png'))
           plt.show()

   def main():
       test = SystemIdentificationTest()
       results = test.run_identification_test()
       print("System identification test completed successfully!")

   if __name__ == "__main__":
       main()
   ```

4. Make the script executable and run the transfer system:
   ```bash
   chmod +x ~/ros2_ws/src/gazebo_simulation_examples/scripts/run_system_identification.py

   cd ~/ros2_ws
   colcon build --packages-select gazebo_simulation_examples
   source install/setup.bash

   # Run domain randomization with sim-to-real transfer
   ros2 launch gazebo_simulation_examples domain_randomization.launch.py randomization_enabled:=true

   # In another terminal, run system identification
   python3 ~/ros2_ws/src/gazebo_simulation_examples/scripts/run_system_identification.py
   ```

## Troubleshooting

- **Poor Transfer Performance**: Increase domain randomization range or improve system identification
- **Adaptation Failures**: Implement safety checks and fallback controllers
- **Computational Bottlenecks**: Optimize algorithms for real-time performance
- **Parameter Drift**: Implement parameter resetting mechanisms

## Summary

This lesson covered sim-to-real transfer principles and techniques, including domain randomization, system identification, robust control design, and performance evaluation. Effective sim-to-real transfer is crucial for deploying simulation-learned behaviors to real Physical AI and humanoid robotics systems.

## Next Steps

In the next lesson, we'll explore hardware-in-the-loop simulation concepts, focusing on how to integrate real hardware components with simulation environments for more accurate validation and testing.