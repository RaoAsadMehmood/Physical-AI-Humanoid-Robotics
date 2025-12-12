---
sidebar_position: 42
---

# Cognitive Planning with VLA Models

## Learning Objectives

By the end of this lesson, you will be able to:
- Implement cognitive planning systems using VLA models for Physical AI
- Design hierarchical planning architectures that leverage VLA capabilities
- Integrate high-level reasoning with low-level VLA action execution
- Configure VLA-based planning for complex multi-step tasks
- Optimize cognitive planning performance for real-time Physical AI applications

## Overview

Cognitive planning with VLA (Vision-Language-Action) models represents a paradigm shift in robotic intelligence, where high-level reasoning and low-level action execution are unified within a single neural architecture. This lesson explores how VLA models can perform cognitive planning by understanding natural language goals, perceiving environmental context, and generating appropriate sequences of actions. We'll examine hierarchical planning approaches that combine symbolic reasoning with neural execution for complex Physical AI tasks.

## VLA Cognitive Planning Architecture

### Hierarchical Planning Structure

The VLA cognitive planning system implements multiple levels of abstraction:

#### 1. Goal Interpretation Layer
- **Language Understanding**: Natural language goal parsing and semantic interpretation
- **Context Extraction**: Environmental context identification from visual input
- **Goal Decomposition**: High-level goal breakdown into sub-tasks

#### 2. Plan Synthesis Layer
- **Action Sequence Generation**: VLA-based action sequence planning
- **Temporal Reasoning**: Sequencing of actions over time
- **Resource Management**: Allocation of computational and physical resources

#### 3. Execution Monitoring Layer
- **Action Validation**: Real-time validation of planned actions
- **Progress Tracking**: Monitoring execution progress toward goals
- **Plan Adaptation**: Dynamic plan adjustment based on feedback

### VLA Cognitive Planning Components

```python
#!/usr/bin/env python3

import rclpy
from rclpy.node import Node
from sensor_msgs.msg import Image, CameraInfo
from geometry_msgs.msg import Twist, PoseStamped
from std_msgs.msg import String, Float32, Bool
from actionlib_msgs.msg import GoalStatus
from builtin_interfaces.msg import Time
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from transformers import GPT2LMHeadModel, GPT2Tokenizer, CLIPProcessor, CLIPModel
import cv2
from cv_bridge import CvBridge
import time
from collections import deque, defaultdict
import threading
import json

class VLACognitivePlanner(Node):
    """
    VLA-based cognitive planning system for Physical AI applications
    """
    def __init__(self):
        super().__init__('vla_cognitive_planner')

        # Initialize CV bridge
        self.cv_bridge = CvBridge()

        # Publishers for cognitive planning
        self.plan_pub = self.create_publisher(String, '/vla/cognitive_plan', 10)
        self.action_pub = self.create_publisher(Twist, '/cmd_vel', 10)
        self.planning_status_pub = self.create_publisher(String, '/vla/planning_status', 10)
        self.goal_status_pub = self.create_publisher(GoalStatus, '/vla/goal_status', 10)

        # Subscribers for planning inputs
        self.goal_sub = self.create_subscription(
            String, '/vla/goal', self.goal_callback, 10)
        self.image_sub = self.create_subscription(
            Image, '/camera/rgb/image_raw', self.image_callback, 10)
        self.current_pose_sub = self.create_subscription(
            PoseStamped, '/current_pose', self.pose_callback, 10)

        # VLA cognitive planning parameters
        self.planning_params = {
            'planning_frequency': 5.0,  # Hz
            'reasoning_depth': 5,       # planning horizon
            'confidence_threshold': 0.7,
            'device': 'cuda' if torch.cuda.is_available() else 'cpu',
            'hierarchical_planning': True,
            'temporal_consistency': True,
            'goal_decomposition': True
        }

        # Initialize VLA planning components
        self.vla_model = None
        self.language_model = None
        self.clip_model = None
        self.clip_processor = None
        self.initialize_planning_components()

        # Planning state
        self.current_goal = None
        self.current_image = None
        self.current_pose = None
        self.planning_context = {}
        self.execution_history = deque(maxlen=100)
        self.plan_queue = deque()
        self.active_plan = None

        # Planning timer
        self.planning_timer = self.create_timer(
            1.0/self.planning_params['planning_frequency'], self.cognitive_planning_loop)

        self.get_logger().info('VLA Cognitive Planner initialized')

    def initialize_planning_components(self):
        """
        Initialize VLA cognitive planning components
        """
        try:
            # Initialize language model for goal interpretation
            self.language_model = GPT2LMHeadModel.from_pretrained('gpt2')
            self.tokenizer = GPT2Tokenizer.from_pretrained('gpt2')
            self.tokenizer.pad_token = self.tokenizer.eos_token

            # Initialize CLIP for visual understanding
            self.clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
            self.clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")

            # Initialize VLA action generation model
            self.vla_model = self.create_vla_action_model()

            self.get_logger().info('VLA cognitive planning components initialized')

        except Exception as e:
            self.get_logger().error(f'Failed to initialize planning components: {e}')

    def create_vla_action_model(self):
        """
        Create VLA-specific action generation model
        """
        class VLAActionPlanner(nn.Module):
            def __init__(self, vision_dim=512, text_dim=768, action_dim=6, hidden_dim=512):
                super().__init__()

                # Vision-text fusion
                self.fusion_layer = nn.Sequential(
                    nn.Linear(vision_dim + text_dim, hidden_dim),
                    nn.ReLU(),
                    nn.Dropout(0.1)
                )

                # Temporal reasoning
                self.temporal_encoder = nn.LSTM(
                    input_size=hidden_dim,
                    hidden_size=hidden_dim // 2,
                    num_layers=2,
                    batch_first=True,
                    dropout=0.1
                )

                # Action sequence generator
                self.action_generator = nn.Sequential(
                    nn.Linear(hidden_dim, hidden_dim),
                    nn.ReLU(),
                    nn.Linear(hidden_dim, hidden_dim // 2),
                    nn.ReLU(),
                    nn.Linear(hidden_dim // 2, action_dim),
                    nn.Tanh()
                )

                # Plan probability predictor
                self.plan_validity = nn.Sequential(
                    nn.Linear(hidden_dim, 128),
                    nn.ReLU(),
                    nn.Linear(128, 1),
                    nn.Sigmoid()
                )

            def forward(self, vision_features, text_features, temporal_context=None):
                # Fuse vision and text features
                fused_features = torch.cat([vision_features, text_features], dim=-1)
                fused_features = self.fusion_layer(fused_features)

                # Apply temporal reasoning if context provided
                if temporal_context is not None:
                    # Concatenate with temporal context
                    context_seq = torch.cat([fused_features.unsqueeze(1), temporal_context], dim=1)
                    temporal_output, _ = self.temporal_encoder(context_seq)
                    # Use the last time step
                    final_features = temporal_output[:, -1, :]
                else:
                    final_features = fused_features

                # Generate action
                action = self.action_generator(final_features)

                # Predict plan validity
                validity = self.plan_validity(final_features)

                return action, validity

        return VLAActionPlanner()

    def goal_callback(self, msg):
        """
        Process cognitive planning goals
        """
        try:
            self.current_goal = msg.data
            self.get_logger().info(f'Received cognitive planning goal: {msg.data}')

            # Trigger immediate replanning
            self.trigger_replanning()

        except Exception as e:
            self.get_logger().error(f'Error processing goal: {e}')

    def image_callback(self, msg):
        """
        Process visual input for planning context
        """
        try:
            self.current_image = self.cv_bridge.imgmsg_to_cv2(msg, "bgr8")
        except Exception as e:
            self.get_logger().error(f'Error processing image: {e}')

    def pose_callback(self, msg):
        """
        Process current pose for spatial planning
        """
        try:
            self.current_pose = msg.pose
        except Exception as e:
            self.get_logger().error(f'Error processing pose: {e}')

    def trigger_replanning(self):
        """
        Trigger immediate cognitive planning
        """
        # For now, we'll just set a flag to indicate replanning is needed
        # The actual planning happens in the timer callback
        pass

    def cognitive_planning_loop(self):
        """
        Main cognitive planning loop
        """
        if not self.current_goal or not self.current_image:
            return

        try:
            # Update planning context
            self.update_planning_context()

            # Generate cognitive plan
            plan = self.generate_cognitive_plan()

            if plan:
                # Validate plan
                if self.validate_plan(plan):
                    # Execute plan or add to queue
                    self.execute_plan(plan)

                    # Publish plan
                    plan_msg = String()
                    plan_msg.data = json.dumps(plan)
                    self.plan_pub.publish(plan_msg)

                    # Update planning status
                    status_msg = String()
                    status_msg.data = f"Plan executed: {len(plan['actions'])} actions"
                    self.planning_status_pub.publish(status_msg)

                else:
                    status_msg = String()
                    status_msg.data = "Plan validation failed"
                    self.planning_status_pub.publish(status_msg)

        except Exception as e:
            self.get_logger().error(f'Error in cognitive planning: {e}')

    def update_planning_context(self):
        """
        Update planning context with current state
        """
        self.planning_context = {
            'current_goal': self.current_goal,
            'current_image': self.current_image,
            'current_pose': self.current_pose,
            'execution_history': list(self.execution_history),
            'plan_queue': list(self.plan_queue)
        }

    def generate_cognitive_plan(self):
        """
        Generate cognitive plan using VLA model
        """
        try:
            # Preprocess visual input
            vision_input = self.preprocess_visual_data(self.current_image)

            # Process goal with language model
            goal_tokens = self.tokenizer(
                self.current_goal,
                return_tensors="pt",
                padding=True,
                truncation=True,
                max_length=128
            )

            # Extract vision features
            with torch.no_grad():
                vision_features = self.clip_model.get_image_features(vision_input)
                vision_features = F.normalize(vision_features, dim=-1)

                # Extract goal features (using a simple approach)
                # In practice, you'd use a more sophisticated method
                goal_text = goal_tokens['input_ids'].to(self.planning_params['device'])
                # Use CLIP text encoder or a separate language model
                goal_features = self.clip_model.get_text_features(**goal_tokens)
                goal_features = F.normalize(goal_features, dim=-1)

            # Generate action sequence using VLA model
            with torch.no_grad():
                action_sequence, plan_validity = self.vla_model(
                    vision_features,
                    goal_features
                )

            # Convert to plan format
            plan = {
                'goal': self.current_goal,
                'actions': self.convert_actions_to_plan(action_sequence),
                'confidence': plan_validity.item(),
                'timestamp': time.time(),
                'execution_context': self.planning_context.copy()
            }

            return plan

        except Exception as e:
            self.get_logger().error(f'Error generating cognitive plan: {e}')
            return None

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

        return image_tensor.to(self.planning_params['device'])

    def convert_actions_to_plan(self, action_tensor):
        """
        Convert VLA action tensor to executable plan
        """
        # Convert tensor to numpy
        action_values = action_tensor.cpu().numpy().flatten()

        # Create action sequence
        actions = []

        # Example: convert to movement commands
        for i in range(0, len(action_values), 6):  # Assuming 6D actions
            if i + 5 < len(action_values):
                action_cmd = {
                    'linear_x': float(action_values[i]),
                    'linear_y': float(action_values[i+1]),
                    'linear_z': float(action_values[i+2]),
                    'angular_x': float(action_values[i+3]),
                    'angular_y': float(action_values[i+4]),
                    'angular_z': float(action_values[i+5])
                }
                actions.append(action_cmd)

        return actions

    def validate_plan(self, plan):
        """
        Validate cognitive plan for safety and feasibility
        """
        if not plan or 'actions' not in plan or not plan['actions']:
            return False

        # Check plan confidence
        confidence = plan.get('confidence', 0.0)
        if confidence < self.planning_params['confidence_threshold']:
            self.get_logger().warn(f'Plan confidence too low: {confidence}')
            return False

        # Check for safe action values
        for action in plan['actions']:
            for key, value in action.items():
                if abs(value) > 2.0:  # Safety limit
                    self.get_logger().warn(f'Unsafe action value in {key}: {value}')
                    return False

        return True

    def execute_plan(self, plan):
        """
        Execute cognitive plan
        """
        self.active_plan = plan

        # For now, execute the first action
        # In a real implementation, you'd have a more sophisticated execution manager
        if plan['actions']:
            first_action = plan['actions'][0]

            # Convert to Twist message
            cmd = Twist()
            cmd.linear.x = first_action.get('linear_x', 0.0)
            cmd.linear.y = first_action.get('linear_y', 0.0)
            cmd.linear.z = first_action.get('linear_z', 0.0)
            cmd.angular.x = first_action.get('angular_x', 0.0)
            cmd.angular.y = first_action.get('angular_y', 0.0)
            cmd.angular.z = first_action.get('angular_z', 0.0)

            # Publish action
            self.action_pub.publish(cmd)

            # Log execution
            self.execution_history.append({
                'timestamp': time.time(),
                'action': first_action,
                'plan_id': id(plan)
            })

    def quaternion_to_euler(self, quat):
        """
        Convert quaternion to Euler angles for orientation planning
        """
        import math
        x, y, z, w = quat.x, quat.y, quat.z, quat.w

        sinr_cosp = 2 * (w * x + y * z)
        cosr_cosp = 1 - 2 * (x * x + y * y)
        roll = math.atan2(sinr_cosp, cosr_cosp)

        sinp = 2 * (w * y - z * x)
        pitch = math.asin(sinp)

        siny_cosp = 2 * (w * z + x * y)
        cosy_cosp = 1 - 2 * (y * y + z * z)
        yaw = math.atan2(siny_cosp, cosy_cosp)

        return roll, pitch, yaw


class VLAGoalDecomposer(Node):
    """
    Node for decomposing complex goals into sub-tasks using VLA models
    """
    def __init__(self):
        super().__init__('vla_goal_decomposer')

        # Publishers and subscribers
        self.decomposed_goals_pub = self.create_publisher(String, '/vla/decomposed_goals', 10)
        self.goal_sub = self.create_subscription(
            String, '/vla/goal', self.goal_callback, 10)

        # Goal decomposition parameters
        self.decomposition_params = {
            'max_subtasks': 10,
            'decomposition_method': 'hierarchical',  # or 'sequential', 'parallel'
            'language_model': 'gpt2'
        }

        # Initialize language model for goal decomposition
        try:
            self.tokenizer = GPT2Tokenizer.from_pretrained('gpt2')
            self.language_model = GPT2LMHeadModel.from_pretrained('gpt2')
            self.language_model.eval()
            self.model_ready = True
            self.get_logger().info('Goal decomposition model initialized')
        except Exception as e:
            self.get_logger().error(f'Failed to initialize goal decomposition model: {e}')
            self.model_ready = False

        self.get_logger().info('VLA Goal Decomposer initialized')

    def goal_callback(self, msg):
        """
        Process complex goals for decomposition
        """
        if not self.model_ready:
            return

        try:
            complex_goal = msg.data
            self.get_logger().info(f'Decomposing goal: {complex_goal}')

            # Decompose goal into sub-tasks
            subtasks = self.decompose_goal(complex_goal)

            if subtasks:
                # Publish decomposed sub-tasks
                decomposed_msg = String()
                decomposed_msg.data = json.dumps({
                    'original_goal': complex_goal,
                    'subtasks': subtasks,
                    'timestamp': time.time()
                })
                self.decomposed_goals_pub.publish(decomposed_msg)

                self.get_logger().info(f'Decomposed into {len(subtasks)} subtasks')

        except Exception as e:
            self.get_logger().error(f'Error decomposing goal: {e}')

    def decompose_goal(self, goal):
        """
        Decompose complex goal into sub-tasks using language model
        """
        if not self.model_ready:
            return []

        try:
            # Create prompt for goal decomposition
            prompt = f"""
            Decompose the following goal into specific, actionable sub-tasks:
            Goal: "{goal}"

            Sub-tasks:
            1.
            """

            # Tokenize input
            inputs = self.tokenizer.encode(prompt, return_tensors='pt')

            # Generate decomposition
            with torch.no_grad():
                outputs = self.language_model.generate(
                    inputs,
                    max_length=200,
                    num_return_sequences=1,
                    temperature=0.7,
                    do_sample=True,
                    pad_token_id=self.tokenizer.eos_token_id
                )

            # Decode output
            generated_text = self.tokenizer.decode(outputs[0], skip_special_tokens=True)

            # Extract sub-tasks from generated text
            subtasks = self.extract_subtasks(generated_text, goal)

            return subtasks

        except Exception as e:
            self.get_logger().error(f'Error in goal decomposition: {e}')
            # Return simple decomposition as fallback
            return [f"Understand goal: {goal}", f"Plan actions for: {goal}", f"Execute: {goal}"]

    def extract_subtasks(self, generated_text, original_goal):
        """
        Extract sub-tasks from generated text
        """
        # Simple extraction based on numbered list
        lines = generated_text.split('\n')
        subtasks = []

        for line in lines:
            # Look for numbered sub-tasks
            if line.strip().startswith(('1.', '2.', '3.', '4.', '5.', '6.', '7.', '8.', '9.')):
                task_text = line.split('.', 1)[1].strip()
                if task_text and task_text != original_goal:
                    subtasks.append(task_text)

        # Limit to max subtasks
        return subtasks[:self.decomposition_params['max_subtasks']]


class VLAPlanValidator(Node):
    """
    Node for validating VLA cognitive plans
    """
    def __init__(self):
        super().__init__('vla_plan_validator')

        # Publishers and subscribers
        self.validation_result_pub = self.create_publisher(Bool, '/vla/plan_valid', 10)
        self.plan_sub = self.create_subscription(
            String, '/vla/cognitive_plan', self.plan_callback, 10)

        # Validation parameters
        self.validation_params = {
            'confidence_threshold': 0.7,
            'action_limits': {
                'linear': 1.0,
                'angular': 1.5
            },
            'temporal_consistency': True
        }

        self.get_logger().info('VLA Plan Validator initialized')

    def plan_callback(self, msg):
        """
        Validate received cognitive plans
        """
        try:
            plan_data = json.loads(msg.data)

            # Perform validation checks
            is_valid = self.validate_plan(plan_data)

            # Publish validation result
            result_msg = Bool()
            result_msg.data = is_valid
            self.validation_result_pub.publish(result_msg)

            self.get_logger().debug(f'Plan validation result: {is_valid}')

        except Exception as e:
            self.get_logger().error(f'Error validating plan: {e}')

    def validate_plan(self, plan_data):
        """
        Validate cognitive plan based on multiple criteria
        """
        # Check confidence
        confidence = plan_data.get('confidence', 0.0)
        if confidence < self.validation_params['confidence_threshold']:
            self.get_logger().warn(f'Plan confidence too low: {confidence}')
            return False

        # Check action validity
        actions = plan_data.get('actions', [])
        for action in actions:
            for key, value in action.items():
                if 'linear' in key and abs(value) > self.validation_params['action_limits']['linear']:
                    self.get_logger().warn(f'Linear action exceeds limit: {value}')
                    return False
                elif 'angular' in key and abs(value) > self.validation_params['action_limits']['angular']:
                    self.get_logger().warn(f'Angular action exceeds limit: {value}')
                    return False

        return True


def main(args=None):
    rclpy.init(args=args)

    # Create cognitive planning nodes
    cognitive_planner = VLACognitivePlanner()
    goal_decomposer = VLAGoalDecomposer()
    plan_validator = VLAPlanValidator()

    # Create executor
    executor = rclpy.executors.MultiThreadedExecutor()
    executor.add_node(cognitive_planner)
    executor.add_node(goal_decomposer)
    executor.add_node(plan_validator)

    try:
        executor.spin()
    except KeyboardInterrupt:
        pass
    finally:
        cognitive_planner.destroy_node()
        goal_decomposer.destroy_node()
        plan_validator.destroy_node()
        executor.shutdown()
        rclpy.shutdown()


if __name__ == '__main__':
    main()
```

## VLA Cognitive Planning Configuration

### Cognitive Planning Parameters

```yaml
# config/vla_cognitive_planning_config.yaml
vla_cognitive_planning:
  planning:
    frequency: 5.0  # Hz
    horizon: 10  # planning steps ahead
    confidence_threshold: 0.7
    reasoning_depth: 5
    device: "cuda"

  goal_decomposition:
    max_subtasks: 10
    decomposition_method: "hierarchical"
    language_model: "gpt2"
    enable_temporal_reasoning: true

  action_generation:
    action_space_dim: 6
    max_action_magnitude: 1.0
    temporal_context_length: 5
    safety_constraints: true

  validation:
    confidence_threshold: 0.7
    action_limits:
      linear: 1.0  # m/s
      angular: 1.5  # rad/s
    safety_validation: true
    temporal_consistency: true

  performance:
    target_latency: 0.2  # seconds
    memory_limit: 0.8
    batch_size: 1

  monitoring:
    enabled: true
    metrics:
      - plan_confidence
      - execution_success_rate
      - goal_completion_time
      - subtask_efficiency
```

## VLA Cognitive Planning Launch Files

### Cognitive Planning Launch

```python
# launch/vla_cognitive_planning.launch.py
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
            FindPackageShare('vla_cognitive_examples'),
            'config',
            'vla_cognitive_planning_config.yaml'
        ]),
        description='Path to VLA cognitive planning configuration file'
    )

    # Set environment variables for cognitive planning
    SetEnvironmentVariable(
        name='CUDA_VISIBLE_DEVICES',
        value='0'
    )

    SetEnvironmentVariable(
        name='TOKENIZERS_PARALLELISM',
        value='false'
    )

    # VLA Cognitive Planner node
    cognitive_planner = Node(
        package='vla_cognitive_examples',
        executable='vla_cognitive_planner',
        name='vla_cognitive_planner',
        parameters=[
            LaunchConfiguration('config_file'),
            {'use_sim_time': LaunchConfiguration('use_sim_time')}
        ],
        remappings=[
            ('/camera/rgb/image_raw', '/zed/left/image_rect_color'),
            ('/current_pose', '/robot_pose'),
        ],
        output='screen'
    )

    # VLA Goal Decomposer node
    goal_decomposer = Node(
        package='vla_cognitive_examples',
        executable='vla_goal_decomposer',
        name='vla_goal_decomposer',
        parameters=[LaunchConfiguration('config_file')],
        output='screen'
    )

    # VLA Plan Validator node
    plan_validator = Node(
        package='vla_cognitive_examples',
        executable='vla_plan_validator',
        name='vla_plan_validator',
        parameters=[LaunchConfiguration('config_file')],
        output='screen'
    )

    # Isaac Cognitive Planner (for enhanced reasoning)
    isaac_cognitive = Node(
        package='isaac_ros_reasoner',
        executable='cognitive_planner',
        name='isaac_vla_cognitive_planner',
        parameters=[{'use_sim_time': LaunchConfiguration('use_sim_time')}],
        output='screen'
    )

    return LaunchDescription([
        use_sim_time,
        config_file,
        cognitive_planner,
        goal_decomposer,
        plan_validator,
        isaac_cognitive
    ])
```

## Hardware Context

### RTX Workstation Cognitive Planning Setup

For optimal VLA cognitive planning on RTX Workstations:

- **GPU**: RTX 4090 or A6000 for complex reasoning and planning (24GB+ VRAM recommended)
- **Memory**: 64GB+ RAM for handling large planning contexts and histories
- **Storage**: Fast NVMe SSD for model loading and plan caching
- **Network**: Low-latency for multi-modal data synchronization
- **Cooling**: Enhanced cooling for sustained cognitive processing

### Jetson Orin Kit Cognitive Planning Configuration

For VLA cognitive planning on Jetson Orin:

- **Model Optimization**: Use TensorRT for language and vision models
- **Quantization**: Implement INT8 quantization for edge deployment
- **Planning Simplification**: Reduce reasoning depth for real-time operation
- **Memory Management**: Optimize for efficient memory usage
- **Power Efficiency**: Configure for sustained operation within power limits

## Implementation Exercise

1. Create VLA cognitive planning package:
   ```bash
   cd ~/ros2_ws/src
   ros2 pkg create --dependencies rclpy sensor_msgs geometry_msgs std_msgs actionlib_msgs cv_bridge -- python vla_cognitive_examples
   ```

2. Create cognitive planning analyzer:
   ```python
   # Save as ~/ros2_ws/src/vla_cognitive_examples/scripts/analyze_cognitive_planning.py
   #!/usr/bin/env python3

   import rclpy
   from rclpy.node import Node
   from std_msgs.msg import String, Float32, Bool
   from geometry_msgs.msg import Twist
   import numpy as np
   import matplotlib.pyplot as plt
   import time
   import json
   from collections import defaultdict, deque

   class VLACognitivePlanningAnalyzer(Node):
       """
       Analyze VLA cognitive planning performance
       """
       def __init__(self):
           super().__init__('vla_cognitive_planning_analyzer')

           # Subscribers for cognitive planning data
           self.plan_sub = self.create_subscription(
               String, '/vla/cognitive_plan', self.plan_callback, 10)
           self.status_sub = self.create_subscription(
               String, '/vla/planning_status', self.status_callback, 10)
           self.validation_sub = self.create_subscription(
               Bool, '/vla/plan_valid', self.validation_callback, 10)

           # Data storage
           self.plans = deque(maxlen=100)
           self.status_history = deque(maxlen=100)
           self.validation_history = deque(maxlen=100)
           self.performance_metrics = defaultdict(list)

           # Analysis parameters
           self.analysis_window = 50  # samples for rolling analysis

           # Analysis timer
           self.analysis_timer = self.create_timer(2.0, self.perform_analysis)

           self.get_logger().info('VLA Cognitive Planning Analyzer initialized')

       def plan_callback(self, msg):
           """
           Collect cognitive plans
           """
           try:
               plan_data = json.loads(msg.data)
               plan_data['timestamp'] = time.time()
               self.plans.append(plan_data)
           except Exception as e:
               self.get_logger().error(f'Error parsing plan: {e}')

       def status_callback(self, msg):
           """
           Collect planning status
           """
           self.status_history.append({
               'timestamp': time.time(),
               'status': msg.data
           })

       def validation_callback(self, msg):
           """
           Collect plan validation results
           """
           self.validation_history.append({
               'timestamp': time.time(),
               'valid': msg.data
           })

       def perform_analysis(self):
           """
           Perform cognitive planning analysis
           """
           if not self.plans:
               return

           # Analyze recent plans
           recent_plans = list(self.plans)[-self.analysis_window:]
           if not recent_plans:
               return

           # Calculate confidence statistics
           confidences = [p.get('confidence', 0.0) for p in recent_plans]
           avg_confidence = sum(confidences) / len(confidences) if confidences else 0

           # Calculate plan validity rate
           if self.validation_history:
               recent_validations = list(self.validation_history)[-self.analysis_window:]
               valid_count = sum(1 for v in recent_validations if v['valid'])
               validity_rate = valid_count / len(recent_validations) if recent_validations else 0
           else:
               validity_rate = 0

           # Calculate action statistics
           total_actions = sum(len(p.get('actions', [])) for p in recent_plans)

           self.get_logger().info(
               f'VLA Cognitive Planning - '
               f'Avg Confidence: {avg_confidence:.3f}, '
               f'Validity Rate: {validity_rate:.2f}, '
               f'Total Actions: {total_actions}, '
               f'Plan Count: {len(recent_plans)}'
           )

           # Store metrics
           self.performance_metrics['avg_confidence'].append(avg_confidence)
           self.performance_metrics['validity_rate'].append(validity_rate)
           self.performance_metrics['action_count'].append(total_actions)

       def generate_analysis_report(self):
           """
           Generate comprehensive analysis report
           """
           if not self.plans:
               return "No planning data available"

           all_plans = list(self.plans)
           all_confidences = [p.get('confidence', 0.0) for p in all_plans]

           report = {
               'total_plans': len(all_plans),
               'confidence_statistics': {
                   'mean': float(np.mean(all_confidences)) if all_confidences else 0,
                   'std': float(np.std(all_confidences)) if all_confidences else 0,
                   'min': float(np.min(all_confidences)) if all_confidences else 0,
                   'max': float(np.max(all_confidences)) if all_confidences else 0,
                   'median': float(np.median(all_confidences)) if all_confidences else 0
               },
               'action_analysis': {
                   'total_actions': sum(len(p.get('actions', [])) for p in all_plans),
                   'avg_actions_per_plan': float(np.mean([len(p.get('actions', [])) for p in all_plans])) if all_plans else 0,
                   'max_actions_per_plan': max([len(p.get('actions', [])) for p in all_plans], default=0)
               },
               'validation_analysis': {
                   'total_validations': len(self.validation_history),
                   'success_rate': float(sum(1 for v in self.validation_history if v['valid']) / len(self.validation_history)) if self.validation_history else 0
               }
           }

           return report

       def plot_analysis_results(self):
           """
           Plot cognitive planning analysis results
           """
           if not self.performance_metrics['avg_confidence']:
               self.get_logger().warn('No analysis data for plotting')
               return

           fig, axes = plt.subplots(2, 2, figsize=(15, 10))

           # Plot average confidence over time
           conf_values = self.performance_metrics['avg_confidence']
           axes[0, 0].plot(conf_values, 'b-', linewidth=1)
           axes[0, 0].set_title('Average Plan Confidence Over Time')
           axes[0, 0].set_xlabel('Analysis Interval')
           axes[0, 0].set_ylabel('Average Confidence')
           axes[0, 0].grid(True)

           # Plot validity rate over time
           validity_values = self.performance_metrics['validity_rate']
           axes[0, 1].plot(validity_values, 'g-', linewidth=1)
           axes[0, 1].set_title('Plan Validity Rate Over Time')
           axes[0, 1].set_xlabel('Analysis Interval')
           axes[0, 1].set_ylabel('Validity Rate')
           axes[0, 1].grid(True)

           # Plot action count over time
           action_counts = self.performance_metrics['action_count']
           axes[1, 0].plot(action_counts, 'r-', linewidth=1)
           axes[1, 0].set_title('Actions per Analysis Interval')
           axes[1, 0].set_xlabel('Analysis Interval')
           axes[1, 0].set_ylabel('Total Actions')
           axes[1, 0].grid(True)

           # Plot confidence distribution
           if self.plans:
               all_confidences = [p.get('confidence', 0.0) for p in list(self.plans)]
               axes[1, 1].hist(all_confidences, bins=20, alpha=0.7, color='blue', edgecolor='black')
               axes[1, 1].set_title('Plan Confidence Distribution')
               axes[1, 1].set_xlabel('Confidence')
               axes[1, 1].set_ylabel('Frequency')
               axes[1, 1].grid(True)

           plt.tight_layout()
           plt.savefig('/tmp/vla_cognitive_planning_analysis.png')
           self.get_logger().info('Cognitive planning analysis saved to /tmp/vla_cognitive_planning_analysis.png')

   def main():
       rclpy.init()
       analyzer = VLACognitivePlanningAnalyzer()

       try:
           rclpy.spin(analyzer)
       except KeyboardInterrupt:
           # Generate final analysis
           report = analyzer.generate_analysis_report()
           print("\nVLA Cognitive Planning Analysis Report:")
           print(json.dumps(report, indent=2))

           # Generate plot
           analyzer.plot_analysis_results()
       finally:
           analyzer.destroy_node()
           rclpy.shutdown()

   if __name__ == '__main__':
       main()
   ```

3. Make the script executable and run analysis:
   ```bash
   chmod +x ~/ros2_ws/src/vla_cognitive_examples/scripts/analyze_cognitive_planning.py

   cd ~/ros2_ws
   colcon build --packages-select vla_cognitive_examples
   source install/setup.bash

   # Run cognitive planning analysis
   ros2 run vla_cognitive_examples analyze_cognitive_planning.py
   ```

## Troubleshooting

- **Planning Failures**: Check model initialization and input data quality
- **Performance Issues**: Monitor GPU memory and adjust planning frequency
- **Goal Decomposition Problems**: Verify language model and prompt engineering
- **Validation Failures**: Review safety constraints and confidence thresholds

## Summary

This lesson covered cognitive planning with VLA models, demonstrating how to implement hierarchical planning architectures that combine high-level reasoning with low-level action execution. The integration of language understanding, visual perception, and action generation creates sophisticated cognitive planning capabilities for Physical AI applications.

## Next Steps

In the next lesson, we'll explore advanced control systems that leverage VLA models for more sophisticated robotic behaviors and interactions.