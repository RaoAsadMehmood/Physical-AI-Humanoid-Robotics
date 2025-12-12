---
sidebar_position: 43
---

# Advanced Control Systems with VLA Integration

## Learning Objectives

By the end of this lesson, you will be able to:
- Implement advanced control systems that leverage VLA model predictions
- Design feedback control loops with VLA-based reference generation
- Integrate VLA models with traditional control architectures
- Optimize control performance using VLA-enhanced perception
- Configure VLA control systems for real-time Physical AI applications

## Overview

Advanced control systems with VLA (Vision-Language-Action) integration represent a sophisticated approach to robotic control that combines the interpretability of traditional control methods with the adaptability of neural networks. This lesson explores how VLA models can enhance traditional control architectures by providing intelligent reference signals, adaptive control parameters, and context-aware control strategies. We'll examine feedback control loops that utilize VLA predictions for more responsive and intelligent robotic behavior.

## VLA-Enhanced Control Architecture

### Hybrid Control System Design

The VLA-enhanced control system combines traditional control methods with neural network predictions:

#### 1. Reference Generation Layer
- **VLA-Based Trajectory Planning**: Generate reference trajectories from natural language commands
- **Context-Aware Setpoints**: Dynamic setpoints based on visual context
- **Adaptive Reference Updates**: Real-time reference adjustments

#### 2. Control Law Layer
- **Traditional Controllers**: PID, MPC, and other classical control methods
- **VLA-Enhanced Gains**: Adaptive control parameters from VLA models
- **Safety Constraints**: Hard limits and safety boundaries

#### 3. Feedback Integration Layer
- **State Estimation**: Enhanced state estimation using VLA perception
- **Error Correction**: VLA-based error prediction and correction
- **Performance Monitoring**: Real-time control performance assessment

### VLA Control System Components

```python
#!/usr/bin/env python3

import rclpy
from rclpy.node import Node
from sensor_msgs.msg import Image, JointState, Imu
from geometry_msgs.msg import Twist, Pose, Point
from std_msgs.msg import String, Float32, Bool
from control_msgs.msg import JointTrajectoryControllerState
from trajectory_msgs.msg import JointTrajectory, JointTrajectoryPoint
from builtin_interfaces.msg import Time
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from transformers import CLIPProcessor, CLIPModel
import cv2
from cv_bridge import CvBridge
import time
from collections import deque
import threading

class VLAControlSystem(Node):
    """
    Advanced VLA-enhanced control system for Physical AI applications
    """
    def __init__(self):
        super().__init__('vla_control_system')

        # Initialize CV bridge
        self.cv_bridge = CvBridge()

        # Publishers for control commands
        self.joint_cmd_pub = self.create_publisher(JointTrajectory, '/joint_trajectory_controller/joint_trajectory', 10)
        self.cmd_vel_pub = self.create_publisher(Twist, '/cmd_vel', 10)
        self.control_status_pub = self.create_publisher(String, '/vla/control_status', 10)
        self.feedback_pub = self.create_publisher(Float32, '/vla/control_feedback', 10)

        # Subscribers for control inputs
        self.image_sub = self.create_subscription(
            Image, '/camera/rgb/image_raw', self.image_callback, 10)
        self.joint_state_sub = self.create_subscription(
            JointState, '/joint_states', self.joint_state_callback, 10)
        self.imu_sub = self.create_subscription(
            Imu, '/imu/data', self.imu_callback, 10)
        self.vla_command_sub = self.create_subscription(
            String, '/vla/command', self.vla_command_callback, 10)

        # VLA control parameters
        self.control_params = {
            'control_frequency': 100.0,  # Hz
            'prediction_horizon': 10,    # control steps ahead
            'device': 'cuda' if torch.cuda.is_available() else 'cpu',
            'feedback_gain': 0.1,
            'safety_limits': True,
            'adaptive_control': True
        }

        # Initialize VLA control components
        self.vla_model = None
        self.clip_model = None
        self.clip_processor = None
        self.pid_controllers = {}
        self.initialize_control_components()

        # Control state variables
        self.current_image = None
        self.current_joints = {}
        self.current_imu = None
        self.vla_command = None
        self.control_reference = {}
        self.control_error = {}
        self.control_output = {}

        # Control history for adaptation
        self.control_history = deque(maxlen=100)

        # Control timer
        self.control_timer = self.create_timer(
            1.0/self.control_params['control_frequency'], self.control_loop)

        self.get_logger().info('VLA Control System initialized')

    def initialize_control_components(self):
        """
        Initialize VLA control system components
        """
        try:
            # Initialize CLIP model for visual understanding
            self.clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
            self.clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")

            # Initialize VLA control model
            self.vla_model = self.create_vla_control_model()

            # Initialize PID controllers for joints
            self.initialize_pid_controllers()

            self.get_logger().info('VLA control components initialized successfully')

        except Exception as e:
            self.get_logger().error(f'Failed to initialize control components: {e}')

    def create_vla_control_model(self):
        """
        Create VLA-specific control model
        """
        class VLAControlModel(nn.Module):
            def __init__(self, vision_dim=512, text_dim=512, control_dim=6, hidden_dim=256):
                super().__init__()

                # Vision-text fusion for control reference
                self.fusion_layer = nn.Sequential(
                    nn.Linear(vision_dim + text_dim, hidden_dim),
                    nn.ReLU(),
                    nn.Dropout(0.1)
                )

                # Control reference generator
                self.reference_generator = nn.Sequential(
                    nn.Linear(hidden_dim, hidden_dim),
                    nn.ReLU(),
                    nn.Linear(hidden_dim, control_dim),
                    nn.Tanh()
                )

                # Adaptive gain generator
                self.gain_generator = nn.Sequential(
                    nn.Linear(hidden_dim, 64),
                    nn.ReLU(),
                    nn.Linear(64, 3),  # [kp, ki, kd]
                    nn.Sigmoid()
                )

            def forward(self, vision_features, text_features):
                # Fuse vision and text features
                fused_features = torch.cat([vision_features, text_features], dim=-1)
                fused_features = self.fusion_layer(fused_features)

                # Generate control reference
                reference = self.reference_generator(fused_features)

                # Generate adaptive gains
                gains = self.gain_generator(fused_features)

                return reference, gains

        return VLAControlModel()

    def initialize_pid_controllers(self):
        """
        Initialize PID controllers for each joint
        """
        # Example joint names - in practice, these would come from robot description
        joint_names = [
            'left_hip_joint', 'left_knee_joint', 'left_ankle_joint',
            'right_hip_joint', 'right_knee_joint', 'right_ankle_joint',
            'left_shoulder_joint', 'left_elbow_joint',
            'right_shoulder_joint', 'right_elbow_joint'
        ]

        for joint_name in joint_names:
            # Initialize with VLA-adaptive parameters
            self.pid_controllers[joint_name] = {
                'kp': 100.0,
                'ki': 10.0,
                'kd': 5.0,
                'error_integral': 0.0,
                'prev_error': 0.0,
                'command_limit': 100.0,  # N*m or rad/s
                'adaptive': True
            }

    def image_callback(self, msg):
        """
        Process visual input for control reference generation
        """
        try:
            self.current_image = self.cv_bridge.imgmsg_to_cv2(msg, "bgr8")
        except Exception as e:
            self.get_logger().error(f'Error processing image: {e}')

    def joint_state_callback(self, msg):
        """
        Process joint state for feedback control
        """
        for i, name in enumerate(msg.name):
            if i < len(msg.position):
                self.current_joints[name] = {
                    'position': msg.position[i],
                    'velocity': msg.velocity[i] if i < len(msg.velocity) else 0.0,
                    'effort': msg.effort[i] if i < len(msg.effort) else 0.0
                }

    def imu_callback(self, msg):
        """
        Process IMU data for balance and orientation control
        """
        self.current_imu = msg

    def vla_command_callback(self, msg):
        """
        Process VLA commands for control reference
        """
        try:
            self.vla_command = msg.data
            self.get_logger().info(f'Received VLA control command: {msg.data}')
        except Exception as e:
            self.get_logger().error(f'Error processing VLA command: {e}')

    def control_loop(self):
        """
        Main VLA-enhanced control loop
        """
        if not all([self.current_image, self.vla_command]):
            return

        try:
            # Generate VLA-based control reference
            control_reference, adaptive_gains = self.generate_vla_reference()

            # Update PID controllers with adaptive gains if available
            if adaptive_gains is not None and self.control_params['adaptive_control']:
                self.update_adaptive_gains(adaptive_gains)

            # Compute control commands using PID
            control_commands = self.compute_pid_control(control_reference)

            # Apply safety limits
            if self.control_params['safety_limits']:
                control_commands = self.apply_safety_limits(control_commands)

            # Publish control commands
            self.publish_control_commands(control_commands)

            # Monitor control performance
            self.monitor_control_performance(control_commands)

        except Exception as e:
            self.get_logger().error(f'Error in control loop: {e}')

    def generate_vla_reference(self):
        """
        Generate control reference using VLA model
        """
        try:
            # Preprocess visual input
            vision_input = self.preprocess_visual_data(self.current_image)

            # Process command with CLIP
            text_inputs = self.clip_processor(
                text=[self.vla_command],
                return_tensors="pt",
                padding=True,
                truncation=True,
                max_length=77
            )

            # Extract features
            with torch.no_grad():
                vision_features = self.clip_model.get_image_features(vision_input)
                vision_features = F.normalize(vision_features, dim=-1)

                text_features = self.clip_model.get_text_features(**text_inputs)
                text_features = F.normalize(text_features, dim=-1)

                # Generate reference and adaptive gains
                reference, gains = self.vla_model(vision_features, text_features)

            return reference.cpu().numpy().flatten(), gains.cpu().numpy().flatten()

        except Exception as e:
            self.get_logger().error(f'Error generating VLA reference: {e}')
            return None, None

    def preprocess_visual_data(self, image):
        """
        Preprocess visual data for VLA model
        """
        # Resize image to model input size
        resized = cv2.resize(image, (224, 224))

        # Convert to tensor format expected by CLIP
        image_tensor = self.clip_processor.image_processor(
            images=resized,
            return_tensors="pt"
        )['pixel_values']

        return image_tensor.to(self.control_params['device'])

    def update_adaptive_gains(self, gains):
        """
        Update PID controller gains based on VLA predictions
        """
        if len(gains) >= 3:
            kp_factor = gains[0]
            ki_factor = gains[1]
            kd_factor = gains[2]

            # Apply gain factors to all controllers
            for joint_name, controller in self.pid_controllers.items():
                if controller['adaptive']:
                    controller['kp'] = 100.0 * kp_factor  # Base gain * factor
                    controller['ki'] = 10.0 * ki_factor
                    controller['kd'] = 5.0 * kd_factor

    def compute_pid_control(self, reference):
        """
        Compute PID control commands
        """
        commands = {}

        if reference is not None and len(reference) >= len(self.pid_controllers):
            joint_names = list(self.pid_controllers.keys())

            for i, joint_name in enumerate(joint_names):
                if i < len(reference) and joint_name in self.current_joints:
                    controller = self.pid_controllers[joint_name]
                    current_pos = self.current_joints[joint_name]['position']
                    desired_pos = reference[i]

                    # Calculate error
                    error = desired_pos - current_pos

                    # Update integral and derivative terms
                    dt = 1.0 / self.control_params['control_frequency']
                    controller['error_integral'] += error * dt
                    derivative = (error - controller['prev_error']) / dt

                    # Calculate PID output
                    command = (
                        controller['kp'] * error +
                        controller['ki'] * controller['error_integral'] +
                        controller['kd'] * derivative
                    )

                    # Apply command limits
                    command = max(-controller['command_limit'], min(controller['command_limit'], command))

                    # Store for history
                    self.control_error[joint_name] = error
                    self.control_output[joint_name] = command

                    commands[joint_name] = command

                    # Update previous error
                    controller['prev_error'] = error

        return commands

    def apply_safety_limits(self, commands):
        """
        Apply safety limits to control commands
        """
        limited_commands = {}

        for joint_name, command in commands.items():
            # Get joint-specific limits (in practice, from URDF)
            max_effort = 100.0  # N*m
            max_velocity = 5.0  # rad/s

            # Apply effort limits
            limited_command = max(-max_effort, min(max_effort, command))
            limited_commands[joint_name] = limited_command

        return limited_commands

    def publish_control_commands(self, commands):
        """
        Publish control commands to robot
        """
        if not commands:
            return

        # Create joint trajectory message
        traj_msg = JointTrajectory()
        traj_msg.header.stamp = self.get_clock().now().to_msg()
        traj_msg.header.frame_id = 'base_link'

        # Set joint names
        traj_msg.joint_names = list(commands.keys())

        # Create trajectory point
        point = JointTrajectoryPoint()
        point.positions = [0.0] * len(commands)  # Will be computed
        point.velocities = list(commands.values())  # Use commands as velocities
        point.effort = [abs(cmd) for cmd in commands.values()]  # Effort magnitudes
        point.time_from_start.sec = 0
        point.time_from_start.nanosec = int(1e7)  # 10ms

        # Compute positions based on current positions and velocities
        for i, joint_name in enumerate(traj_msg.joint_names):
            if joint_name in self.current_joints:
                current_pos = self.current_joints[joint_name]['position']
                velocity = point.velocities[i]
                # Simple integration: pos = pos + vel * dt
                new_pos = current_pos + velocity * 0.01  # 10ms integration
                point.positions[i] = new_pos

        traj_msg.points = [point]
        self.joint_cmd_pub.publish(traj_msg)

    def monitor_control_performance(self, commands):
        """
        Monitor control system performance
        """
        # Calculate performance metrics
        if self.control_error:
            avg_error = np.mean([abs(e) for e in self.control_error.values()])
            max_error = max([abs(e) for e in self.control_error.values()])

            # Publish feedback
            feedback_msg = Float32()
            feedback_msg.data = avg_error  # Use average error as feedback metric
            self.feedback_pub.publish(feedback_msg)

            # Publish control status
            status_msg = String()
            status_msg.data = f"Control Active - Avg Error: {avg_error:.3f}, Max Error: {max_error:.3f}"
            self.control_status_pub.publish(status_msg)

        # Store control history for adaptation
        history_entry = {
            'timestamp': time.time(),
            'errors': dict(self.control_error),
            'outputs': dict(self.control_output),
            'commands': commands
        }
        self.control_history.append(history_entry)


class VLAReferenceGenerator(Node):
    """
    Node for generating VLA-based control references
    """
    def __init__(self):
        super().__init__('vla_reference_generator')

        # Publishers and subscribers
        self.reference_pub = self.create_publisher(Float32, '/vla/control_reference', 10)
        self.image_sub = self.create_subscription(
            Image, '/camera/rgb/image_raw', self.image_callback, 10)
        self.command_sub = self.create_subscription(
            String, '/vla/command', self.command_callback, 10)

        # Reference generation parameters
        self.ref_params = {
            'generation_frequency': 10.0,  # Hz
            'smoothing_factor': 0.1,
            'context_aware': True
        }

        # State variables
        self.current_image = None
        self.current_command = None
        self.previous_reference = None

        # Reference generation timer
        self.ref_timer = self.create_timer(
            1.0/self.ref_params['generation_frequency'], self.generate_reference)

        self.get_logger().info('VLA Reference Generator initialized')

    def image_callback(self, msg):
        """
        Process image for reference generation
        """
        try:
            self.current_image = CvBridge().imgmsg_to_cv2(msg, "bgr8")
        except Exception as e:
            self.get_logger().error(f'Error processing image: {e}')

    def command_callback(self, msg):
        """
        Process command for reference generation
        """
        self.current_command = msg.data

    def generate_reference(self):
        """
        Generate VLA-based control reference
        """
        if not all([self.current_image, self.current_command]):
            return

        try:
            # In a real implementation, this would use a VLA model
            # For this example, we'll simulate reference generation based on command

            # Simple command interpretation
            if 'forward' in self.current_command.lower():
                reference_value = 0.5  # Move forward
            elif 'backward' in self.current_command.lower():
                reference_value = -0.5  # Move backward
            elif 'left' in self.current_command.lower():
                reference_value = 0.3  # Turn left
            elif 'right' in self.current_command.lower():
                reference_value = -0.3  # Turn right
            else:
                reference_value = 0.0  # Stop

            # Apply smoothing if previous reference exists
            if self.previous_reference is not None:
                reference_value = (
                    self.ref_params['smoothing_factor'] * reference_value +
                    (1 - self.ref_params['smoothing_factor']) * self.previous_reference
                )

            self.previous_reference = reference_value

            # Publish reference
            ref_msg = Float32()
            ref_msg.data = reference_value
            self.reference_pub.publish(ref_msg)

            self.get_logger().debug(f'Generated reference: {reference_value}')

        except Exception as e:
            self.get_logger().error(f'Error generating reference: {e}')


class VLAControlMonitor(Node):
    """
    Monitor for VLA control system performance
    """
    def __init__(self):
        super().__init__('vla_control_monitor')

        # Subscribers for monitoring
        self.status_sub = self.create_subscription(
            String, '/vla/control_status', self.status_callback, 10)
        self.feedback_sub = self.create_subscription(
            Float32, '/vla/control_feedback', self.feedback_callback, 10)

        # Monitor parameters
        self.monitor_params = {
            'report_frequency': 1.0,  # Hz
            'performance_window': 100  # samples for averaging
        }

        # Performance tracking
        self.status_history = deque(maxlen=self.monitor_params['performance_window'])
        self.feedback_history = deque(maxlen=self.monitor_params['performance_window'])

        # Monitor timer
        self.monitor_timer = self.create_timer(
            1.0/self.monitor_params['report_frequency'], self.performance_report)

        self.get_logger().info('VLA Control Monitor initialized')

    def status_callback(self, msg):
        """
        Track control status
        """
        self.status_history.append({
            'timestamp': time.time(),
            'status': msg.data
        })

    def feedback_callback(self, msg):
        """
        Track control feedback
        """
        self.feedback_history.append({
            'timestamp': time.time(),
            'feedback': msg.data
        })

    def performance_report(self):
        """
        Generate control performance report
        """
        if not self.feedback_history:
            return

        # Calculate average feedback (error)
        feedback_values = [item['feedback'] for item in self.feedback_history]
        avg_feedback = sum(feedback_values) / len(feedback_values)

        # Calculate control stability
        if len(feedback_values) > 1:
            feedback_std = np.std(feedback_values)
            stability = 1.0 / (1.0 + feedback_std)  # Higher is more stable
        else:
            stability = 1.0

        self.get_logger().info(
            f'VLA Control Performance - '
            f'Avg Feedback: {avg_feedback:.3f}, '
            f'Stability: {stability:.3f}, '
            f'Sample Count: {len(feedback_values)}'
        )


def main(args=None):
    rclpy.init(args=args)

    # Create VLA control nodes
    control_system = VLAControlSystem()
    reference_generator = VLAReferenceGenerator()
    control_monitor = VLAControlMonitor()

    # Create executor
    executor = rclpy.executors.MultiThreadedExecutor()
    executor.add_node(control_system)
    executor.add_node(reference_generator)
    executor.add_node(control_monitor)

    try:
        executor.spin()
    except KeyboardInterrupt:
        pass
    finally:
        control_system.destroy_node()
        reference_generator.destroy_node()
        control_monitor.destroy_node()
        executor.shutdown()
        rclpy.shutdown()


if __name__ == '__main__':
    main()
```

## VLA Control System Configuration

### Control System Parameters

```yaml
# config/vla_control_config.yaml
vla_control_system:
  control:
    frequency: 100.0  # Hz
    prediction_horizon: 10
    feedback_gain: 0.1
    device: "cuda"
    safety_limits: true
    adaptive_control: true

  pid_controllers:
    default_gains:
      kp: 100.0
      ki: 10.0
      kd: 5.0
    joint_specific:
      left_hip_joint:
        kp: 150.0
        ki: 15.0
        kd: 8.0
      right_hip_joint:
        kp: 150.0
        ki: 15.0
        kd: 8.0
      left_knee_joint:
        kp: 200.0
        ki: 20.0
        kd: 10.0
      right_knee_joint:
        kp: 200.0
        ki: 20.0
        kd: 10.0

  reference_generation:
    smoothing_factor: 0.1
    generation_frequency: 10.0  # Hz
    context_aware: true

  safety:
    position_limits:
      all_joints: [-3.14, 3.14]  # radians
    effort_limits:
      all_joints: 100.0  # N*m
    velocity_limits:
      all_joints: 5.0  # rad/s

  performance:
    target_latency: 0.01  # seconds (10ms)
    memory_limit: 0.8
    batch_size: 1

  monitoring:
    enabled: true
    report_frequency: 1.0  # Hz
    performance_window: 100
    metrics:
      - control_error
      - stability
      - response_time
      - tracking_accuracy
```

## VLA Control System Launch Files

### Control System Launch

```python
# launch/vla_control_system.launch.py
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, SetEnvironmentVariable
from launch.substitutions import LaunchConfiguration, PathJoinSubstitution
from launch_ros.actions import Node
from launch_ros.substitutions import FindPackageShare
import os

def generate_launch_description():
    # Declare launch arguments
    use_sim_time = DeclareLaunchArgument(
        'use_sim_time',
        default_value='false',
        description='Use simulation time if true'
    )

    config_file = DeclareLaunchArgument(
        'config_file',
        default_value=PathJoinSubstitution([
            FindPackageShare('vla_control_examples'),
            'config',
            'vla_control_config.yaml'
        ]),
        description='Path to VLA control configuration file'
    )

    # Set environment variables for VLA control
    SetEnvironmentVariable(
        name='CUDA_VISIBLE_DEVICES',
        value='0'
    )

    SetEnvironmentVariable(
        name='TORCH_CUDNN_V8_API_ENABLED',
        value='1'
    )

    # VLA Control System node
    vla_control_system = Node(
        package='vla_control_examples',
        executable='vla_control_system',
        name='vla_control_system',
        parameters=[
            LaunchConfiguration('config_file'),
            {'use_sim_time': LaunchConfiguration('use_sim_time')}
        ],
        remappings=[
            ('/camera/rgb/image_raw', '/zed/left/image_rect_color'),
            ('/joint_states', '/robot/joint_states'),
            ('/imu/data', '/imu/data'),
        ],
        output='screen'
    )

    # VLA Reference Generator node
    vla_reference_generator = Node(
        package='vla_control_examples',
        executable='vla_reference_generator',
        name='vla_reference_generator',
        parameters=[LaunchConfiguration('config_file')],
        remappings=[
            ('/camera/rgb/image_raw', '/zed/left/image_rect_color'),
        ],
        output='screen'
    )

    # VLA Control Monitor node
    vla_control_monitor = Node(
        package='vla_control_examples',
        executable='vla_control_monitor',
        name='vla_control_monitor',
        parameters=[LaunchConfiguration('config_file')],
        output='screen'
    )

    # Isaac Control System (for enhanced control)
    isaac_control = Node(
        package='isaac_ros_control',
        executable='control_system',
        name='isaac_vla_control',
        parameters=[{'use_sim_time': LaunchConfiguration('use_sim_time')}],
        output='screen'
    )

    return LaunchDescription([
        use_sim_time,
        config_file,
        vla_control_system,
        vla_reference_generator,
        vla_control_monitor,
        isaac_control
    ])
```

## Hardware Context

### RTX Workstation VLA Control Setup

For optimal VLA control performance on RTX Workstations:

- **GPU**: RTX 4090 or A6000 for real-time control reference generation (24GB+ VRAM recommended)
- **Memory**: 64GB+ RAM for handling control history and state estimation
- **Storage**: Low-latency NVMe SSD for fast model loading and state access
- **Network**: Deterministic network for multi-robot coordination
- **Timing**: Real-time kernel for deterministic control timing

### Jetson Orin Kit VLA Control Configuration

For VLA control on Jetson Orin:

- **Model Optimization**: Use TensorRT for control reference models
- **Quantization**: Implement INT8 quantization for edge deployment
- **Control Simplification**: Reduce prediction horizon for real-time operation
- **Memory Efficiency**: Optimize for efficient memory usage
- **Real-time Constraints**: Ensure control loops meet timing requirements

## Implementation Exercise

1. Create VLA control package:
   ```bash
   cd ~/ros2_ws/src
   ros2 pkg create --dependencies rclpy sensor_msgs control_msgs geometry_msgs std_msgs trajectory_msgs cv_bridge -- python vla_control_examples
   ```

2. Create VLA control analyzer:
   ```python
   # Save as ~/ros2_ws/src/vla_control_examples/scripts/analyze_vla_control.py
   #!/usr/bin/env python3

   import rclpy
   from rclpy.node import Node
   from std_msgs.msg import String, Float32
   from geometry_msgs.msg import Twist
   import numpy as np
   import matplotlib.pyplot as plt
   import time
   import json
   from collections import defaultdict, deque

   class VLAControlAnalyzer(Node):
       """
       Analyze VLA control system performance
       """
       def __init__(self):
           super().__init__('vla_control_analyzer')

           # Subscribers for control monitoring
           self.status_sub = self.create_subscription(
               String, '/vla/control_status', self.status_callback, 10)
           self.feedback_sub = self.create_subscription(
               Float32, '/vla/control_feedback', self.feedback_callback, 10)

           # Data storage
           self.status_history = deque(maxlen=1000)
           self.feedback_history = deque(maxlen=1000)
           self.performance_metrics = defaultdict(list)

           # Analysis parameters
           self.analysis_window = 100  # samples for rolling analysis

           # Analysis timer
           self.analysis_timer = self.create_timer(2.0, self.perform_analysis)

           self.get_logger().info('VLA Control Analyzer initialized')

       def status_callback(self, msg):
           """
           Collect control status messages
           """
           self.status_history.append({
               'timestamp': time.time(),
               'status': msg.data
           })

       def feedback_callback(self, msg):
           """
           Collect control feedback (error) data
           """
           self.feedback_history.append({
               'timestamp': time.time(),
               'feedback': msg.data
           })

       def perform_analysis(self):
           """
           Perform VLA control analysis
           """
           if not self.feedback_history:
               return

           # Get recent data for analysis
           recent_feedback = [f['feedback'] for f in list(self.feedback_history)[-self.analysis_window:]]
           if not recent_feedback:
               return

           # Calculate control metrics
           avg_error = sum(recent_feedback) / len(recent_feedback)
           std_error = np.std(recent_feedback)
           max_error = max(recent_feedback) if recent_feedback else 0
           min_error = min(recent_feedback) if recent_feedback else 0

           # Calculate stability metric
           stability = 1.0 / (1.0 + std_error) if std_error > 0 else 1.0

           self.get_logger().info(
               f'VLA Control Analysis - '
               f'Avg Error: {avg_error:.3f}, '
               f'Std Error: {std_error:.3f}, '
               f'Stability: {stability:.3f}, '
               f'Sample Count: {len(recent_feedback)}'
           )

           # Store metrics
           self.performance_metrics['avg_error'].append(avg_error)
           self.performance_metrics['std_error'].append(std_error)
           self.performance_metrics['stability'].append(stability)

       def generate_analysis_report(self):
           """
           Generate comprehensive control analysis report
           """
           if not self.feedback_history:
               return "No control data available"

           all_feedback = [f['feedback'] for f in self.feedback_history]

           report = {
               'total_samples': len(all_feedback),
               'error_statistics': {
                   'mean': float(np.mean(all_feedback)) if all_feedback else 0,
                   'std': float(np.std(all_feedback)) if all_feedback else 0,
                   'min': float(np.min(all_feedback)) if all_feedback else 0,
                   'max': float(np.max(all_feedback)) if all_feedback else 0,
                   'median': float(np.median(all_feedback)) if all_feedback else 0
               },
               'stability_metrics': {
                   'average_stability': float(np.mean([1.0 / (1.0 + err) for err in all_feedback if err > 0]) if all_feedback else 0),
                   'oscillation_count': sum(1 for i in range(1, len(all_feedback)) if (all_feedback[i] - all_feedback[i-1]) * (all_feedback[i-1] - all_feedback[i-2]) < 0) if len(all_feedback) > 2 else 0
               },
               'performance_summary': {
                   'tracking_accuracy': float(1.0 - np.mean(np.abs(all_feedback)) if all_feedback else 0),
                   'consistency': float(1.0 - np.std(all_feedback) if all_feedback else 0)
               }
           }

           return report

       def plot_control_analysis(self):
           """
           Plot VLA control analysis results
           """
           if not self.performance_metrics['avg_error']:
               self.get_logger().warn('No analysis data for plotting')
               return

           fig, axes = plt.subplots(2, 2, figsize=(15, 10))

           # Plot average error over time
           avg_error_values = self.performance_metrics['avg_error']
           axes[0, 0].plot(avg_error_values, 'b-', linewidth=1)
           axes[0, 0].set_title('Average Control Error Over Time')
           axes[0, 0].set_xlabel('Analysis Interval')
           axes[0, 0].set_ylabel('Average Error')
           axes[0, 0].grid(True)

           # Plot stability over time
           stability_values = self.performance_metrics['stability']
           axes[0, 1].plot(stability_values, 'g-', linewidth=1)
           axes[0, 1].set_title('Control Stability Over Time')
           axes[0, 1].set_xlabel('Analysis Interval')
           axes[0, 1].set_ylabel('Stability')
           axes[0, 1].grid(True)

           # Plot error distribution
           if self.feedback_history:
               all_feedback = [f['feedback'] for f in self.feedback_history]
               axes[1, 0].hist(all_feedback, bins=20, alpha=0.7, color='blue', edgecolor='black')
               axes[1, 0].set_title('Control Error Distribution')
               axes[1, 0].set_xlabel('Error')
               axes[1, 0].set_ylabel('Frequency')
               axes[1, 0].grid(True)

           # Plot standard error over time
           std_error_values = self.performance_metrics['std_error']
           axes[1, 1].plot(std_error_values, 'r-', linewidth=1)
           axes[1, 1].set_title('Control Error Standard Deviation Over Time')
           axes[1, 1].set_xlabel('Analysis Interval')
           axes[1, 1].set_ylabel('Std Deviation')
           axes[1, 1].grid(True)

           plt.tight_layout()
           plt.savefig('/tmp/vla_control_analysis.png')
           self.get_logger().info('VLA control analysis saved to /tmp/vla_control_analysis.png')

   def main():
       rclpy.init()
       analyzer = VLAControlAnalyzer()

       try:
           rclpy.spin(analyzer)
       except KeyboardInterrupt:
           # Generate final analysis
           report = analyzer.generate_analysis_report()
           print("\nVLA Control Analysis Report:")
           print(json.dumps(report, indent=2))

           # Generate plot
           analyzer.plot_control_analysis()
       finally:
           analyzer.destroy_node()
           rclpy.shutdown()

   if __name__ == '__main__':
       main()
   ```

3. Make the script executable and run analysis:
   ```bash
   chmod +x ~/ros2_ws/src/vla_control_examples/scripts/analyze_vla_control.py

   cd ~/ros2_ws
   colcon build --packages-select vla_control_examples
   source install/setup.bash

   # Run VLA control analysis
   ros2 run vla_control_examples analyze_vla_control.py
   ```

## Troubleshooting

- **Control Instability**: Check PID gain tuning and VLA reference generation
- **Performance Issues**: Monitor GPU memory usage and adjust control frequency
- **Integration Problems**: Verify message formats and timing constraints
- **Safety Violations**: Review safety limits and control bounds

## Summary

This lesson covered advanced control systems with VLA integration, demonstrating how to combine traditional control methods with neural network predictions for more intelligent and adaptive robotic control. The integration of VLA models with control systems enables context-aware, language-guided robotic behavior.

## Next Steps

In the next lesson, we'll explore the capstone project architecture that brings together all VLA capabilities for comprehensive Physical AI applications.