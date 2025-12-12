---
sidebar_position: 51
---

# Capstone Project: Comprehensive VLA-Physical AI Solution

## Learning Objectives

By the end of this lesson, you will be able to:
- Design and implement a comprehensive VLA-Physical AI solution
- Integrate all learned concepts into a cohesive system
- Deploy and validate a complete Physical AI application
- Demonstrate advanced VLA capabilities in real-world scenarios
- Document and present the complete VLA-Physical AI solution

## Overview

The capstone project represents the culmination of all VLA (Vision-Language-Action) learning modules, bringing together perception, reasoning, action, and safety components into a comprehensive Physical AI solution. This lesson guides you through the complete implementation of an end-to-end VLA-Physical AI system capable of understanding natural language commands, perceiving environmental context, and executing appropriate robotic behaviors safely and reliably. We'll explore the integration of all previously learned concepts into a production-ready Physical AI application.

## Capstone VLA-Physical AI Architecture

### Comprehensive System Architecture

The capstone VLA-Physical AI system integrates all components learned throughout the course:

#### 1. Multi-Modal Perception Layer
- **Vision Processing**: Advanced vision-language understanding with CLIP-based models
- **Sensor Fusion**: Integration of RGB-D, LIDAR, IMU, and other sensors
- **Environmental Context**: Scene understanding and object recognition
- **Real-time Processing**: Low-latency perception for responsive behavior

#### 2. Cognitive Reasoning Layer
- **Natural Language Understanding**: Command interpretation and goal decomposition
- **Hierarchical Planning**: Multi-step planning with temporal consistency
- **Context-Aware Reasoning**: Decision making based on environmental context
- **Learning Systems**: Adaptive behavior learning from interaction

#### 3. Action Execution Layer
- **Reference Generation**: VLA-based trajectory and motion planning
- **Feedback Control**: Adaptive control with VLA-enhanced gains
- **Safety Systems**: Multi-level safety monitoring and intervention
- **Execution Monitoring**: Real-time progress tracking and adaptation

#### 4. System Integration Layer
- **Message Brokering**: Efficient communication between components
- **Resource Management**: GPU and memory allocation optimization
- **Performance Monitoring**: Comprehensive system performance tracking
- **Fault Tolerance**: Graceful degradation and recovery mechanisms

### Capstone System Components

```python
#!/usr/bin/env python3

import rclpy
from rclpy.node import Node
from sensor_msgs.msg import Image, CameraInfo, Imu, LaserScan, PointCloud2
from geometry_msgs.msg import Twist, Pose, PoseStamped
from nav_msgs.msg import Odometry, OccupancyGrid
from std_msgs.msg import String, Float32, Bool
from builtin_interfaces.msg import Time
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from transformers import CLIPProcessor, CLIPModel, GPT2LMHeadModel, GPT2Tokenizer
import cv2
from cv_bridge import CvBridge
import time
from collections import deque
import threading
import json
import subprocess
import psutil
from dataclasses import dataclass
from typing import Dict, List, Optional, Any, Tuple
import logging

@dataclass
class CapstoneConfig:
    """
    Configuration for capstone VLA-Physical AI system
    """
    # System-wide configuration
    system_frequency: float = 10.0  # Hz
    device: str = 'cuda' if torch.cuda.is_available() else 'cpu'
    deployment_environment: str = 'production'  # 'development', 'testing', 'production'

    # Model configurations
    vision_model: str = 'clip-vit-large-patch14'
    language_model: str = 'gpt2-medium'
    action_space_dim: int = 6

    # Performance targets
    latency_target: float = 0.1  # seconds
    throughput_target: int = 10  # inferences/second
    accuracy_target: float = 0.85

    # Safety constraints
    safety_threshold: float = 0.7
    emergency_stop: bool = True
    collision_avoidance: bool = True

    # Resource management
    memory_limit: float = 0.8  # fraction of available memory
    gpu_memory_fraction: float = 0.85

class CapstoneVLAPhysicalAISystem(Node):
    """
    Capstone VLA-Physical AI system integrating all learned concepts
    """
    def __init__(self):
        super().__init__('capstone_vla_physical_ai_system')

        # Initialize CV bridge
        self.cv_bridge = CvBridge()

        # Publishers for capstone system
        self.robot_cmd_pub = self.create_publisher(Twist, '/cmd_vel', 10)
        self.system_status_pub = self.create_publisher(String, '/vla/capstone/status', 10)
        self.performance_metrics_pub = self.create_publisher(String, '/vla/capstone/metrics', 10)
        self.emergency_stop_pub = self.create_publisher(Bool, '/emergency_stop', 10)
        self.action_feedback_pub = self.create_publisher(String, '/vla/capstone/action_feedback', 10)
        self.system_health_pub = self.create_publisher(Float32, '/vla/capstone/health', 10)

        # Subscribers for capstone system
        self.rgb_sub = self.create_subscription(
            Image, '/camera/rgb/image_raw', self.rgb_callback, 10)
        self.depth_sub = self.create_subscription(
            Image, '/camera/depth/image_raw', self.depth_callback, 10)
        self.laser_sub = self.create_subscription(
            LaserScan, '/scan', self.laser_callback, 10)
        self.imu_sub = self.create_subscription(
            Imu, '/imu/data', self.imu_callback, 10)
        self.odom_sub = self.create_subscription(
            Odometry, '/odom', self.odom_callback, 10)
        self.goal_sub = self.create_subscription(
            String, '/vla/goal', self.goal_callback, 10)
        self.command_sub = self.create_subscription(
            String, '/vla/command', self.command_callback, 10)

        # Initialize system configuration
        self.capstone_config = CapstoneConfig()

        # Initialize all system components
        self.initialize_capstone_components()

        # System state tracking
        self.system_state = {
            'perception_ready': False,
            'reasoning_ready': False,
            'action_ready': False,
            'communication_ready': True,
            'safety_monitoring': True,
            'integration_ready': True
        }

        # Data buffers
        self.current_rgb = None
        self.current_depth = None
        self.current_laser = None
        self.current_imu = None
        self.current_odom = None
        self.current_goal = None
        self.current_command = None

        # Performance tracking
        self.performance_history = deque(maxlen=1000)
        self.system_log = deque(maxlen=1000)
        self.emergency_active = False
        self.system_health = 1.0

        # System timer
        self.system_timer = self.create_timer(
            1.0/self.capstone_config.system_frequency, self.capstone_processing_loop)

        self.get_logger().info('Capstone VLA-Physical AI System initialized')

    def initialize_capstone_components(self):
        """
        Initialize all capstone system components
        """
        try:
            # Initialize perception components
            self.clip_model = CLIPModel.from_pretrained("openai/clip-vit-large-patch14")
            self.clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-large-patch14")
            self.system_state['perception_ready'] = True
            self.get_logger().info('Perception components initialized')

            # Initialize reasoning components
            self.gpt_model = GPT2LMHeadModel.from_pretrained('gpt2-medium')
            self.gpt_tokenizer = GPT2Tokenizer.from_pretrained('gpt2-medium')
            self.gpt_tokenizer.pad_token = self.gpt_tokenizer.eos_token
            self.system_state['reasoning_ready'] = True
            self.get_logger().info('Reasoning components initialized')

            # Initialize capstone VLA model
            self.capstone_vla_model = self.create_capstone_vla_model()
            self.system_state['action_ready'] = True
            self.get_logger().info('Action components initialized')

            # Initialize safety systems
            self.safety_monitor = self.initialize_safety_systems()
            self.get_logger().info('Safety systems initialized')

            # Initialize resource monitoring
            self.resource_monitor = self.initialize_resource_monitoring()
            self.get_logger().info('Resource monitoring initialized')

            # Initialize integration components
            self.integration_manager = self.initialize_integration_manager()
            self.system_state['integration_ready'] = True
            self.get_logger().info('Integration components initialized')

        except Exception as e:
            self.get_logger().error(f'Failed to initialize capstone components: {e}')
            raise

    def create_capstone_vla_model(self):
        """
        Create capstone VLA model with advanced features
        """
        class CapstoneVLAModel(nn.Module):
            def __init__(self, vision_dim=1024, text_dim=768, action_dim=6, hidden_dim=1024):
                super().__init__()

                # Vision encoder (CLIP-based with advanced features)
                self.vision_encoder = nn.Sequential(
                    nn.Linear(vision_dim, hidden_dim),
                    nn.ReLU(),
                    nn.Dropout(0.1),
                    nn.Linear(hidden_dim, hidden_dim),
                    nn.ReLU(),
                    nn.Dropout(0.1)
                )

                # Language encoder (GPT-based with context awareness)
                self.language_encoder = nn.Sequential(
                    nn.Linear(text_dim, hidden_dim),
                    nn.ReLU(),
                    nn.Dropout(0.1),
                    nn.Linear(hidden_dim, hidden_dim),
                    nn.ReLU(),
                    nn.Dropout(0.1)
                )

                # Advanced multi-modal fusion with attention
                self.fusion_attention = nn.MultiheadAttention(
                    embed_dim=hidden_dim,
                    num_heads=8,
                    dropout=0.1,
                    batch_first=True
                )

                # Hierarchical reasoning module
                self.hierarchical_reasoner = nn.TransformerEncoder(
                    nn.TransformerEncoderLayer(
                        d_model=hidden_dim * 2,  # Combined features
                        nhead=8,
                        dim_feedforward=hidden_dim * 2,
                        dropout=0.1,
                        batch_first=True
                    ),
                    num_layers=6
                )

                # Temporal reasoning with LSTM
                self.temporal_reasoner = nn.LSTM(
                    input_size=hidden_dim * 2,  # Fused features
                    hidden_size=hidden_dim // 2,
                    num_layers=3,
                    batch_first=True,
                    dropout=0.1
                )

                # Action generation head
                self.action_generator = nn.Sequential(
                    nn.Linear(hidden_dim // 2, hidden_dim // 2),
                    nn.ReLU(),
                    nn.Dropout(0.1),
                    nn.Linear(hidden_dim // 2, hidden_dim // 4),
                    nn.ReLU(),
                    nn.Dropout(0.05),
                    nn.Linear(hidden_dim // 4, action_dim),
                    nn.Tanh()  # Normalize to [-1, 1]
                )

                # Safety assessment head
                self.safety_assessor = nn.Sequential(
                    nn.Linear(hidden_dim * 2, 256),
                    nn.ReLU(),
                    nn.Dropout(0.1),
                    nn.Linear(256, 128),
                    nn.ReLU(),
                    nn.Dropout(0.05),
                    nn.Linear(128, 1),
                    nn.Sigmoid()  # Safety score in [0, 1]
                )

                # Uncertainty quantification
                self.uncertainty_estimator = nn.Sequential(
                    nn.Linear(hidden_dim * 2, 128),
                    nn.ReLU(),
                    nn.Dropout(0.1),
                    nn.Linear(128, 64),
                    nn.ReLU(),
                    nn.Linear(64, 1),
                    nn.Sigmoid()
                )

                # Context awareness module
                self.context_awareness = nn.Sequential(
                    nn.Linear(hidden_dim * 2, 256),
                    nn.ReLU(),
                    nn.Dropout(0.1),
                    nn.Linear(256, 128),
                    nn.ReLU(),
                    nn.Linear(128, 64),
                    nn.Sigmoid()
                )

            def forward(self, vision_features, text_features, temporal_context=None):
                # Encode vision and language separately
                vision_encoded = self.vision_encoder(vision_features)
                language_encoded = self.language_encoder(text_features)

                # Combine features for fusion
                combined_features = torch.cat([vision_encoded, language_encoded], dim=-1)

                # Apply attention-based fusion
                fused_features, attn_weights = self.fusion_attention(
                    combined_features.unsqueeze(1),
                    combined_features.unsqueeze(1),
                    combined_features.unsqueeze(1)
                )

                fused_features = fused_features.squeeze(1)

                # Apply hierarchical reasoning
                hierarchical_features = self.hierarchical_reasoner(fused_features.unsqueeze(1))
                hierarchical_features = hierarchical_features.squeeze(1)

                # Apply temporal reasoning if context provided
                if temporal_context is not None:
                    context_seq = torch.cat([hierarchical_features.unsqueeze(1), temporal_context], dim=1)
                    temporal_output, _ = self.temporal_reasoner(context_seq)
                    final_features = temporal_output[:, -1, :]
                else:
                    temporal_output, _ = self.temporal_reasoner(hierarchical_features.unsqueeze(1))
                    final_features = temporal_output[:, -1, :]

                # Generate action
                action = self.action_generator(final_features)

                # Assess safety
                safety_score = self.safety_assessor(fused_features)

                # Estimate uncertainty
                uncertainty = self.uncertainty_estimator(fused_features)

                # Assess context awareness
                context_score = self.context_awareness(fused_features)

                return action, safety_score, uncertainty, context_score, attn_weights

        return CapstoneVLAModel()

    def initialize_safety_systems(self):
        """
        Initialize comprehensive safety monitoring systems
        """
        class CapstoneSafetyMonitor:
            def __init__(self, parent_node):
                self.parent = parent_node
                self.safety_threshold = 0.7
                self.collision_threshold = 0.5  # meters
                self.velocity_limits = {
                    'linear': 1.0,  # m/s
                    'angular': 1.5  # rad/s
                }
                self.violation_history = deque(maxlen=100)
                self.emergency_procedures = {
                    'stop': self.stop_robot,
                    'pause': self.pause_robot,
                    'return_home': self.return_home
                }

            def assess_safety(self, action, laser_data=None, imu_data=None, safety_score=None):
                """
                Assess safety of proposed action with comprehensive checks
                """
                violations = []
                severity_level = 'normal'

                # Check velocity limits
                if len(action) >= 6:
                    linear_speed = np.linalg.norm(action[:3])
                    angular_speed = np.linalg.norm(action[3:6])

                    if linear_speed > self.velocity_limits['linear']:
                        violations.append({
                            'type': 'velocity_limit',
                            'severity': 'high',
                            'value': linear_speed,
                            'limit': self.velocity_limits['linear']
                        })
                        severity_level = max(severity_level, 'high')

                    if angular_speed > self.velocity_limits['angular']:
                        violations.append({
                            'type': 'angular_velocity_limit',
                            'severity': 'high',
                            'value': angular_speed,
                            'limit': self.velocity_limits['angular']
                        })
                        severity_level = max(severity_level, 'high')

                # Check collision risk based on laser data
                if laser_data is not None:
                    min_distance = min(laser_data.ranges) if laser_data.ranges else float('inf')
                    if min_distance < self.collision_threshold:
                        violations.append({
                            'type': 'collision_risk',
                            'severity': 'critical',
                            'distance': min_distance,
                            'threshold': self.collision_threshold
                        })
                        severity_level = max(severity_level, 'critical')

                # Check safety score from VLA model
                if safety_score is not None and isinstance(safety_score, torch.Tensor):
                    safety_val = safety_score.item()
                    if safety_val < self.parent.capstone_config.safety_threshold:
                        violations.append({
                            'type': 'low_safety_score',
                            'severity': 'medium',
                            'score': safety_val,
                            'threshold': self.parent.capstone_config.safety_threshold
                        })
                        severity_level = max(severity_level, 'medium')

                # Determine if action is safe
                is_safe = len(violations) == 0 and (safety_score is None or safety_score.item() > self.parent.capstone_config.safety_threshold)

                # Store violations
                if violations:
                    self.violation_history.extend(violations)

                return is_safe, violations, severity_level

            def stop_robot(self):
                """Emergency stop procedure"""
                stop_cmd = Twist()
                self.parent.robot_cmd_pub.publish(stop_cmd)
                self.parent.get_logger().warn('Robot emergency stopped')

            def pause_robot(self):
                """Pause robot movement"""
                pause_cmd = Twist()
                self.parent.robot_cmd_pub.publish(pause_cmd)
                self.parent.get_logger().info('Robot paused')

            def return_home(self):
                """Return robot to home position"""
                # In a real implementation, this would navigate to a safe home position
                home_cmd = Twist()
                home_cmd.linear.x = -0.5  # Move backward to home
                self.parent.robot_cmd_pub.publish(home_cmd)
                self.parent.get_logger().info('Robot returning to home')

        return CapstoneSafetyMonitor(self)

    def initialize_resource_monitoring(self):
        """
        Initialize comprehensive system resource monitoring
        """
        class CapstoneResourceMonitor:
            def __init__(self, parent_node):
                self.parent = parent_node
                self.metrics = {
                    'cpu_usage': deque(maxlen=100),
                    'memory_usage': deque(maxlen=100),
                    'gpu_usage': deque(maxlen=100),
                    'gpu_memory_usage': deque(maxlen=100),
                    'processing_time': deque(maxlen=100),
                    'network_latency': deque(maxlen=100)
                }

            def get_current_metrics(self):
                """
                Get current system resource metrics
                """
                try:
                    import psutil
                    metrics = {
                        'cpu_usage': psutil.cpu_percent(),
                        'memory_usage': psutil.virtual_memory().percent,
                        'disk_usage': psutil.disk_usage('/').percent,
                        'timestamp': time.time()
                    }

                    # Try to get GPU metrics if available
                    try:
                        result = subprocess.run(['nvidia-smi', '--query-gpu=utilization.gpu,memory.used,memory.total', '--format=csv,noheader,nounits'],
                                              capture_output=True, text=True, timeout=5)
                        if result.returncode == 0:
                            gpu_data = result.stdout.strip().split(', ')
                            if len(gpu_data) >= 3:
                                gpu_util = float(gpu_data[0])
                                gpu_memory_used = float(gpu_data[1])
                                gpu_memory_total = float(gpu_data[2])
                                gpu_memory_usage = (gpu_memory_used / gpu_memory_total) * 100 if gpu_memory_total > 0 else 0

                                metrics['gpu_usage'] = gpu_util
                                metrics['gpu_memory_usage'] = gpu_memory_usage
                            else:
                                metrics['gpu_usage'] = 0
                                metrics['gpu_memory_usage'] = 0
                    except:
                        metrics['gpu_usage'] = 0
                        metrics['gpu_memory_usage'] = 0

                    return metrics
                except ImportError:
                    return {
                        'cpu_usage': 50,
                        'memory_usage': 50,
                        'gpu_usage': 0,
                        'gpu_memory_usage': 0,
                        'timestamp': time.time()
                    }

        return CapstoneResourceMonitor(self)

    def initialize_integration_manager(self):
        """
        Initialize system integration manager
        """
        class IntegrationManager:
            def __init__(self, parent_node):
                self.parent = parent_node
                self.components = {}
                self.health_scores = {}
                self.integration_status = 'initializing'

            def register_component(self, name, component):
                """Register a system component"""
                self.components[name] = component
                self.health_scores[name] = 1.0  # Start with perfect health

            def assess_system_health(self):
                """Assess overall system health"""
                if not self.health_scores:
                    return 1.0

                avg_health = sum(self.health_scores.values()) / len(self.health_scores)
                return avg_health

            def update_component_health(self, name, health_score):
                """Update health score for a component"""
                self.health_scores[name] = health_score

        manager = IntegrationManager(self)

        # Register all components
        manager.register_component('perception', self.clip_model)
        manager.register_component('reasoning', self.gpt_model)
        manager.register_component('action', self.capstone_vla_model)
        manager.register_component('safety', self.safety_monitor)

        return manager

    def rgb_callback(self, msg):
        """
        Process RGB camera data
        """
        try:
            self.current_rgb = self.cv_bridge.imgmsg_to_cv2(msg, "bgr8")
        except Exception as e:
            self.get_logger().error(f'Error processing RGB image: {e}')

    def depth_callback(self, msg):
        """
        Process depth camera data
        """
        try:
            self.current_depth = self.cv_bridge.imgmsg_to_cv2(msg, desired_encoding='32FC1')
        except Exception as e:
            self.get_logger().error(f'Error processing depth image: {e}')

    def laser_callback(self, msg):
        """
        Process laser scan data
        """
        try:
            self.current_laser = msg
        except Exception as e:
            self.get_logger().error(f'Error processing laser scan: {e}')

    def imu_callback(self, msg):
        """
        Process IMU data
        """
        try:
            self.current_imu = msg
        except Exception as e:
            self.get_logger().error(f'Error processing IMU: {e}')

    def odom_callback(self, msg):
        """
        Process odometry data
        """
        try:
            self.current_odom = msg
        except Exception as e:
            self.get_logger().error(f'Error processing odometry: {e}')

    def goal_callback(self, msg):
        """
        Process high-level goals
        """
        try:
            self.current_goal = msg.data
            self.log_system_event('goal_received', msg.data)
        except Exception as e:
            self.get_logger().error(f'Error processing goal: {e}')

    def command_callback(self, msg):
        """
        Process VLA commands
        """
        try:
            self.current_command = msg.data
            self.log_system_event('command_received', msg.data)
        except Exception as e:
            self.get_logger().error(f'Error processing command: {e}')

    def capstone_processing_loop(self):
        """
        Main capstone system processing loop
        """
        if not all([self.current_rgb, self.current_command, self.system_ready()]):
            return

        try:
            start_time = time.time()

            # Process through complete capstone VLA pipeline
            action, safety_score, uncertainty, context_score, attention_weights = self.process_capstone_pipeline()

            if action is not None:
                # Assess safety comprehensively
                is_safe, violations, severity = self.safety_monitor.assess_safety(
                    action.detach().cpu().numpy() if isinstance(action, torch.Tensor) else action,
                    self.current_laser,
                    self.current_imu,
                    safety_score
                )

                if is_safe and (safety_score is None or safety_score.item() > self.capstone_config.safety_threshold):
                    # Execute action
                    self.execute_action(action)

                    # Log successful execution
                    self.log_system_event('action_executed', {
                        'action': action.detach().cpu().numpy().tolist() if isinstance(action, torch.Tensor) else action,
                        'safety_score': safety_score.item() if safety_score is not None else 0.0,
                        'uncertainty': uncertainty.item() if uncertainty is not None else 1.0,
                        'context_score': context_score.item() if context_score is not None else 0.5
                    })
                else:
                    # Safety violation - emergency stop based on severity
                    self.handle_safety_violation(violations, severity)
                    self.log_system_event('safety_violation', {
                        'violations': violations,
                        'severity': severity,
                        'safety_score': safety_score.item() if safety_score is not None else 0.0,
                        'uncertainty': uncertainty.item() if uncertainty is not None else 1.0
                    })

            # Calculate processing time
            processing_time = time.time() - start_time

            # Monitor performance
            self.monitor_performance(processing_time)

            # Calculate system health
            self.system_health = self.integration_manager.assess_system_health()

            # Update component health scores
            self.integration_manager.update_component_health('processing', 1.0 - min(processing_time / 0.1, 1.0))
            self.integration_manager.update_component_health('safety', 1.0 if is_safe else 0.0)

            # Publish system status
            self.publish_system_status(processing_time, safety_score, uncertainty)

        except Exception as e:
            self.get_logger().error(f'Error in capstone processing: {e}')
            self.log_system_event('system_error', str(e))

    def process_capstone_pipeline(self):
        """
        Process complete capstone VLA pipeline: perception -> reasoning -> action
        """
        try:
            # Preprocess visual data
            vision_input = self.preprocess_visual_data(self.current_rgb)

            # Process command with language model
            text_inputs = self.gpt_tokenizer(
                self.current_command,
                return_tensors="pt",
                padding=True,
                truncation=True,
                max_length=128
            )

            # Extract features
            with torch.no_grad():
                vision_features = self.clip_model.get_image_features(vision_input)
                vision_features = F.normalize(vision_features, dim=-1)

                # Use GPT model to get text embeddings
                text_embeddings = self.gpt_model.get_input_embeddings()(
                    text_inputs['input_ids'].to(self.capstone_config.device)
                )
                # Take mean across sequence length
                text_features = text_embeddings.mean(dim=1)

                # Generate action, safety, and uncertainty from capstone model
                action, safety_score, uncertainty, context_score, attention_weights = self.capstone_vla_model(
                    vision_features, text_features
                )

            return action, safety_score, uncertainty, context_score, attention_weights

        except Exception as e:
            self.get_logger().error(f'Error in capstone pipeline: {e}')
            # Return safe default values
            return (
                torch.zeros((1, 6)),  # Zero action
                torch.tensor([[1.0]]),  # High safety score
                torch.tensor([[0.0]]),  # Low uncertainty
                torch.tensor([[0.5]]),  # Medium context awareness
                None  # No attention weights
            )

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

        return image_tensor.to(self.capstone_config.device)

    def execute_action(self, action_tensor):
        """
        Execute capstone VLA-generated action
        """
        try:
            # Convert tensor to command
            action_values = action_tensor.cpu().numpy().flatten()

            # Create Twist message for robot command
            cmd = Twist()
            if len(action_values) >= 6:
                cmd.linear.x = float(action_values[0])
                cmd.linear.y = float(action_values[1])
                cmd.linear.z = float(action_values[2])
                cmd.angular.x = float(action_values[3])
                cmd.angular.y = float(action_values[4])
                cmd.angular.z = float(action_values[5])

            # Publish command
            self.robot_cmd_pub.publish(cmd)

            # Publish action feedback
            feedback_msg = String()
            feedback_msg.data = json.dumps({
                'action_executed': True,
                'values': action_values.tolist(),
                'timestamp': time.time()
            })
            self.action_feedback_pub.publish(feedback_msg)

            self.get_logger().info(f'Capstone action executed: {action_values[:3]}')

        except Exception as e:
            self.get_logger().error(f'Error executing action: {e}')

    def handle_safety_violation(self, violations, severity):
        """
        Handle safety violations based on severity
        """
        if severity == 'critical':
            self.emergency_stop()
        elif severity == 'high':
            self.safety_monitor.pause_robot()
        elif severity == 'medium':
            self.safety_monitor.stop_robot()
        else:
            # Low severity - just log
            self.get_logger().warn(f'Low severity safety issues: {[v["type"] for v in violations]}')

    def emergency_stop(self):
        """
        Execute emergency stop procedures
        """
        if not self.emergency_active:
            self.emergency_active = True
            self.get_logger().error('CAPSTONE EMERGENCY STOP ACTIVATED')

            # Publish emergency stop command
            stop_cmd = Bool()
            stop_cmd.data = True
            self.emergency_stop_pub.publish(stop_cmd)

            # Stop robot movement
            stop_twist = Twist()
            self.robot_cmd_pub.publish(stop_twist)

            self.log_system_event('emergency_stop', 'Critical safety violation detected')

    def monitor_performance(self, processing_time):
        """
        Monitor system performance metrics
        """
        try:
            # Get current resource metrics
            current_metrics = self.resource_monitor.get_current_metrics()

            # Store performance data
            performance_data = {
                'processing_time': processing_time,
                'cpu_usage': current_metrics.get('cpu_usage', 0),
                'memory_usage': current_metrics.get('memory_usage', 0),
                'gpu_usage': current_metrics.get('gpu_usage', 0),
                'gpu_memory_usage': current_metrics.get('gpu_memory_usage', 0),
                'timestamp': time.time()
            }

            self.performance_history.append(performance_data)

            # Check for performance issues
            if processing_time > self.capstone_config.latency_target:
                self.get_logger().warn(f'Latency exceeded target: {processing_time:.3f}s')

        except Exception as e:
            self.get_logger().error(f'Error monitoring performance: {e}')

    def publish_system_status(self, processing_time, safety_score, uncertainty):
        """
        Publish comprehensive system status
        """
        try:
            status_data = {
                'timestamp': time.time(),
                'system_state': self.system_state.copy(),
                'processing_time': processing_time,
                'safety_score': safety_score.item() if safety_score is not None else 0,
                'uncertainty': uncertainty.item() if uncertainty is not None else 0,
                'system_health': self.system_health,
                'emergency_active': self.emergency_active,
                'component_status': {
                    'perception': self.system_state['perception_ready'],
                    'reasoning': self.system_state['reasoning_ready'],
                    'action': self.system_state['action_ready'],
                    'communication': self.system_state['communication_ready'],
                    'integration': self.system_state['integration_ready']
                },
                'performance_metrics': {
                    'avg_processing_time': self.get_average_processing_time(),
                    'current_cpu_usage': self.get_current_cpu_usage(),
                    'current_memory_usage': self.get_current_memory_usage(),
                    'current_gpu_usage': self.get_current_gpu_usage()
                }
            }

            status_msg = String()
            status_msg.data = json.dumps(status_data)
            self.system_status_pub.publish(status_msg)

            # Publish system health
            health_msg = Float32()
            health_msg.data = self.system_health
            self.system_health_pub.publish(health_msg)

        except Exception as e:
            self.get_logger().error(f'Error publishing system status: {e}')

    def get_average_processing_time(self):
        """
        Get average processing time from history
        """
        if self.performance_history:
            times = [p['processing_time'] for p in self.performance_history]
            return sum(times) / len(times)
        return 0.0

    def get_current_cpu_usage(self):
        """
        Get current CPU usage
        """
        try:
            import psutil
            return psutil.cpu_percent()
        except ImportError:
            return 0.0

    def get_current_memory_usage(self):
        """
        Get current memory usage
        """
        try:
            import psutil
            return psutil.virtual_memory().percent
        except ImportError:
            return 0.0

    def get_current_gpu_usage(self):
        """
        Get current GPU usage
        """
        try:
            result = subprocess.run(['nvidia-smi', '--query-gpu=utilization.gpu', '--format=csv,noheader,nounits'],
                                  capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                return float(result.stdout.strip())
        except:
            pass
        return 0.0

    def system_ready(self):
        """
        Check if system is ready for processing
        """
        return all(self.system_state.values())

    def log_system_event(self, event_type, details):
        """
        Log system events for monitoring and debugging
        """
        log_entry = {
            'timestamp': time.time(),
            'event_type': event_type,
            'details': details,
            'system_state': self.system_state.copy()
        }
        self.system_log.append(log_entry)

    def get_system_summary(self):
        """
        Get comprehensive system summary for diagnostics
        """
        summary = {
            'system_readiness': self.system_ready(),
            'component_status': self.system_state,
            'performance_summary': {
                'total_samples': len(self.performance_history),
                'avg_processing_time': self.get_average_processing_time(),
                'current_cpu_usage': self.get_current_cpu_usage(),
                'current_memory_usage': self.get_current_memory_usage(),
                'current_gpu_usage': self.get_current_gpu_usage(),
                'system_health': self.system_health
            },
            'safety_status': {
                'emergency_active': self.emergency_active,
                'recent_violations': len(list(self.system_log)[-10:]) if self.system_log else 0,
                'safety_score': self.get_latest_safety_score()
            },
            'execution_summary': {
                'total_actions': len([entry for entry in self.system_log if entry['event_type'] == 'action_executed']),
                'safety_violations': len([entry for entry in self.system_log if entry['event_type'] == 'safety_violation']),
                'system_errors': len([entry for entry in self.system_log if entry['event_type'] == 'system_error'])
            }
        }
        return summary

    def get_latest_safety_score(self):
        """
        Get the latest safety score from history
        """
        for entry in reversed(self.system_log):
            if 'safety_score' in entry.get('details', {}):
                return entry['details']['safety_score']
        return 0.0


class CapstoneSystemMonitor(Node):
    """
    Monitor for capstone VLA-Physical AI system
    """
    def __init__(self):
        super().__init__('capstone_system_monitor')

        # Subscribers for system monitoring
        self.status_sub = self.create_subscription(
            String, '/vla/capstone/status', self.status_callback, 10)
        self.health_sub = self.create_subscription(
            Float32, '/vla/capstone/health', self.health_callback, 10)
        self.metrics_sub = self.create_subscription(
            String, '/vla/capstone/metrics', self.metrics_callback, 10)

        # Monitor parameters
        self.monitor_params = {
            'report_frequency': 1.0,  # Hz
            'alert_thresholds': {
                'high_latency': 0.2,  # seconds
                'low_safety_score': 0.5,
                'low_health_score': 0.6,
                'high_cpu_usage': 80.0,  # percentage
                'high_memory_usage': 85.0,  # percentage
                'high_gpu_usage': 90.0  # percentage
            },
            'performance_window': 100  # samples for averaging
        }

        # Performance tracking
        self.status_history = deque(maxlen=self.monitor_params['performance_window'])
        self.health_history = deque(maxlen=self.monitor_params['performance_window'])
        self.metrics_history = deque(maxlen=self.monitor_params['performance_window'])

        # Alert tracking
        self.alert_history = deque(maxlen=50)

        # Monitor timer
        self.monitor_timer = self.create_timer(
            1.0/self.monitor_params['report_frequency'], self.performance_report)

        self.get_logger().info('Capstone System Monitor initialized')

    def status_callback(self, msg):
        """
        Process system status updates
        """
        try:
            status_data = json.loads(msg.data)
            self.status_history.append(status_data)
        except Exception as e:
            self.get_logger().error(f'Error parsing status: {e}')

    def health_callback(self, msg):
        """
        Process system health updates
        """
        self.health_history.append({
            'timestamp': time.time(),
            'health': msg.data
        })

    def metrics_callback(self, msg):
        """
        Process performance metrics
        """
        try:
            metrics_data = json.loads(msg.data)
            metrics_data['timestamp'] = time.time()
            self.metrics_history.append(metrics_data)
        except Exception as e:
            self.get_logger().error(f'Error parsing metrics: {e}')

    def performance_report(self):
        """
        Generate performance and health report
        """
        if not self.status_history:
            return

        # Calculate performance metrics
        recent_status = list(self.status_history)[-self.monitor_params['performance_window']:]
        if not recent_status:
            return

        # Extract metrics
        processing_times = [s.get('processing_time', 0) for s in recent_status]
        safety_scores = [s.get('safety_score', 0) for s in recent_status]
        health_scores = [s.get('system_health', 1.0) for s in recent_status]
        cpu_usage = [s.get('performance_metrics', {}).get('current_cpu_usage', 0) for s in recent_status]
        memory_usage = [s.get('performance_metrics', {}).get('current_memory_usage', 0) for s in recent_status]
        gpu_usage = [s.get('performance_metrics', {}).get('current_gpu_usage', 0) for s in recent_status]

        # Calculate averages
        avg_processing_time = sum(processing_times) / len(processing_times) if processing_times else 0
        avg_safety_score = sum(safety_scores) / len(safety_scores) if safety_scores else 0
        avg_health_score = sum(health_scores) / len(health_scores) if health_scores else 0
        avg_cpu_usage = sum(cpu_usage) / len(cpu_usage) if cpu_usage else 0
        avg_memory_usage = sum(memory_usage) / len(memory_usage) if memory_usage else 0
        avg_gpu_usage = sum(gpu_usage) / len(gpu_usage) if gpu_usage else 0

        # Check for alerts
        alerts = []
        if avg_processing_time > self.monitor_params['alert_thresholds']['high_latency']:
            alerts.append(f'High latency: {avg_processing_time:.3f}s')
        if avg_safety_score < self.monitor_params['alert_thresholds']['low_safety_score']:
            alerts.append(f'Low safety score: {avg_safety_score:.3f}')
        if avg_health_score < self.monitor_params['alert_thresholds']['low_health_score']:
            alerts.append(f'Low health score: {avg_health_score:.3f}')
        if avg_cpu_usage > self.monitor_params['alert_thresholds']['high_cpu_usage']:
            alerts.append(f'High CPU usage: {avg_cpu_usage:.1f}%')
        if avg_memory_usage > self.monitor_params['alert_thresholds']['high_memory_usage']:
            alerts.append(f'High memory usage: {avg_memory_usage:.1f}%')
        if avg_gpu_usage > self.monitor_params['alert_thresholds']['high_gpu_usage']:
            alerts.append(f'High GPU usage: {avg_gpu_usage:.1f}%')

        # Store alerts
        if alerts:
            self.alert_history.append({
                'timestamp': time.time(),
                'alerts': alerts,
                'metrics': {
                    'processing_time': avg_processing_time,
                    'safety_score': avg_safety_score,
                    'health_score': avg_health_score,
                    'cpu_usage': avg_cpu_usage,
                    'memory_usage': avg_memory_usage,
                    'gpu_usage': avg_gpu_usage
                }
            })

        # Log performance report
        alert_msg = f' - ALERTS: {", ".join(alerts)}' if alerts else ''
        self.get_logger().info(
            f'Capstone System Performance - '
            f'Latency: {avg_processing_time:.3f}s, '
            f'Safety: {avg_safety_score:.3f}, '
            f'Health: {avg_health_score:.3f}, '
            f'CPU: {avg_cpu_usage:.1f}%, '
            f'Memory: {avg_memory_usage:.1f}%, '
            f'GPU: {avg_gpu_usage:.1f}%{alert_msg}'
        )

        # Log health status
        self.get_logger().info(f'Capstone System Health: {avg_health_score:.3f}')


def main(args=None):
    rclpy.init(args=args)

    # Create capstone system nodes
    capstone_system = CapstoneVLAPhysicalAISystem()
    system_monitor = CapstoneSystemMonitor()

    # Create executor
    executor = rclpy.executors.MultiThreadedExecutor()
    executor.add_node(capstone_system)
    executor.add_node(system_monitor)

    try:
        executor.spin()
    except KeyboardInterrupt:
        # Generate comprehensive system summary before shutdown
        summary = capstone_system.get_system_summary()
        print(f"\nCapstone VLA-Physical AI System Summary at Shutdown:")
        print(json.dumps(summary, indent=2))
    finally:
        capstone_system.destroy_node()
        system_monitor.destroy_node()
        executor.shutdown()
        rclpy.shutdown()


if __name__ == '__main__':
    main()
```

## Capstone System Configuration

### Complete Capstone Configuration

```yaml
# config/capstone_vla_system_config.yaml
capstone_vla_physical_ai_system:
  system:
    frequency: 10.0  # Hz
    device: "cuda"
    deployment_environment: "production"
    safety_threshold: 0.7
    emergency_stop: true
    collision_avoidance: true

  perception:
    vision_model: "clip-vit-large-patch14"
    input_resolution: [224, 224]
    processing_frequency: 10.0  # Hz
    normalization:
      mean: [0.485, 0.456, 0.406]
      std: [0.229, 0.224, 0.225]

  reasoning:
    language_model: "gpt2-medium"
    max_context_length: 128
    reasoning_frequency: 5.0  # Hz
    confidence_threshold: 0.8

  action:
    action_space_dim: 6
    control_frequency: 100.0  # Hz
    safety_validation: true
    adaptive_control: true

  safety:
    collision_threshold: 0.5  # meters
    velocity_limits:
      linear: 1.0  # m/s
      angular: 1.5  # rad/s
    emergency_procedures: true
    recovery_modes: true

  performance:
    target_latency: 0.1  # seconds
    target_throughput: 10  # inferences/second
    memory_limit: 0.85  # fraction of available memory
    processing_timeout: 5.0  # seconds

  monitoring:
    enabled: true
    report_frequency: 1.0  # Hz
    performance_window: 100
    metrics:
      - processing_time
      - safety_score
      - uncertainty
      - system_health
      - cpu_usage
      - memory_usage
      - gpu_usage
    alert_thresholds:
      high_latency: 0.2
      low_safety_score: 0.5
      low_health_score: 0.6
      high_cpu_usage: 80.0
      high_memory_usage: 85.0
      high_gpu_usage: 90.0

  integration:
    enabled: true
    component_monitoring: true
    health_assessment: true
    fault_tolerance: true

  networking:
    communication_protocol: "reliable"
    message_compression: true
    qos_settings: "deterministic"
    network_monitoring: true

  hardware_specific:
    jetson_orin:
      optimization_strategy: "power_efficient"
      max_gpu_memory_fraction: 0.7
      processing_frequency: 5.0  # Lower for power efficiency
      safety_frequency: 20.0
      model_quantization: "int8"
    rtx_workstation:
      optimization_strategy: "performance"
      max_gpu_memory_fraction: 0.9
      processing_frequency: 20.0  # Higher for performance
      multi_gpu_distribution: true
      gradient_checkpointing: true
      mixed_precision_training: true
```

## Capstone System Launch Files

### Capstone System Launch

```python
# launch/capstone_vla_system.launch.py
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, SetEnvironmentVariable, TimerAction
from launch.substitutions import LaunchConfiguration, PathJoinSubstitution
from launch_ros.actions import Node
from launch_ros.substitutions import FindPackageShare
from launch.actions import GroupAction, RegisterEventHandler
from launch.event_handlers import OnProcessStart, OnProcessExit
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
            FindPackageShare('capstone_vla_examples'),
            'config',
            'capstone_vla_system_config.yaml'
        ]),
        description='Path to capstone VLA system configuration file'
    )

    # Set environment variables for capstone system
    SetEnvironmentVariable(
        name='CUDA_VISIBLE_DEVICES',
        value='0'
    )

    SetEnvironmentVariable(
        name='TORCH_CUDNN_V8_API_ENABLED',
        value='1'
    )

    SetEnvironmentVariable(
        name='TOKENIZERS_PARALLELISM',
        value='false'
    )

    SetEnvironmentVariable(
        name='TRANSFORMERS_OFFLINE',
        value='1'
    )

    # Capstone VLA-Physical AI System node
    capstone_system = Node(
        package='capstone_vla_examples',
        executable='capstone_vla_physical_ai_system',
        name='capstone_vla_physical_ai_system',
        parameters=[
            LaunchConfiguration('config_file'),
            {'use_sim_time': LaunchConfiguration('use_sim_time')}
        ],
        remappings=[
            ('/camera/rgb/image_raw', '/zed/left/image_rect_color'),
            ('/camera/depth/image_raw', '/zed/depth/depth_registered'),
            ('/scan', '/laser_scan'),
            ('/imu/data', '/imu/data'),
            ('/odom', '/odometry'),
        ],
        output='screen',
        respawn=True,
        respawn_delay=5.0
    )

    # Capstone System Monitor node
    system_monitor = Node(
        package='capstone_vla_examples',
        executable='capstone_system_monitor',
        name='capstone_system_monitor',
        parameters=[LaunchConfiguration('config_file')],
        output='screen',
        respawn=True,
        respawn_delay=5.0
    )

    # Isaac Capstone Integration
    isaac_integration = Node(
        package='isaac_ros_capstone',
        executable='capstone_integration',
        name='isaac_capstone_vla_physical_ai',
        parameters=[{'use_sim_time': LaunchConfiguration('use_sim_time')}],
        output='screen'
    )

    # Isaac Perception Pipeline
    isaac_perception = Node(
        package='isaac_ros_perceptor',
        executable='perception_pipeline',
        name='isaac_capstone_perception',
        parameters=[{'use_sim_time': LaunchConfiguration('use_sim_time')}],
        output='screen'
    )

    # Isaac Control System
    isaac_control = Node(
        package='isaac_ros_control',
        executable='control_system',
        name='isaac_capstone_control',
        parameters=[{'use_sim_time': LaunchConfiguration('use_sim_time')}],
        output='screen'
    )

    # Isaac Navigation System
    isaac_navigation = Node(
        package='isaac_ros_navigation',
        executable='navigation_system',
        name='isaac_capstone_navigation',
        parameters=[{'use_sim_time': LaunchConfiguration('use_sim_time')}],
        output='screen'
    )

    # Isaac Cognitive Planner
    isaac_cognitive = Node(
        package='isaac_ros_reasoner',
        executable='cognitive_planner',
        name='isaac_capstone_cognitive',
        parameters=[{'use_sim_time': LaunchConfiguration('use_sim_time')}],
        output='screen'
    )

    return LaunchDescription([
        use_sim_time,
        config_file,
        capstone_system,
        system_monitor,
        isaac_integration,
        isaac_perception,
        isaac_control,
        isaac_navigation,
        isaac_cognitive
    ])
```

## Hardware Context

### RTX Workstation Capstone Deployment

For optimal capstone VLA-Physical AI system performance on RTX Workstations:

- **GPU Configuration**: Multi-GPU setup with model parallelism for large models
- **Memory Management**: Large memory pools with efficient allocation strategies
- **Thermal Management**: Advanced cooling for sustained high-performance operation
- **Power Management**: Sufficient power supply for multi-GPU configurations
- **Network Configuration**: Low-latency networking for multi-modal data synchronization
- **Storage**: High-speed NVMe SSD for fast model loading and data access

### Jetson Orin Kit Capstone Configuration

For capstone VLA-Physical AI system deployment on Jetson Orin:

- **Model Optimization**: Use TensorRT for all neural network components
- **Quantization**: Implement INT8 quantization for edge deployment
- **Power Efficiency**: Configure for sustained operation within power constraints
- **Memory Optimization**: Efficient memory usage for real-time processing
- **Real-time Operation**: Ensure all components meet timing requirements
- **Thermal Management**: Monitor and control temperature during operation

## Implementation Exercise

1. Create capstone VLA system package:
   ```bash
   cd ~/ros2_ws/src
   ros2 pkg create --dependencies rclpy sensor_msgs geometry_msgs std_msgs nav_msgs cv_bridge message_filters -- python capstone_vla_examples
   ```

2. Create capstone system analyzer:
   ```python
   # Save as ~/ros2_ws/src/capstone_vla_examples/scripts/analyze_capstone_system.py
   #!/usr/bin/env python3

   import rclpy
   from rclpy.node import Node
   from std_msgs.msg import String, Float32, Bool
   import numpy as np
   import matplotlib.pyplot as plt
   import time
   import json
   from collections import defaultdict, deque

   class CapstoneSystemAnalyzer(Node):
       """
       Analyze capstone VLA-Physical AI system performance and behavior
       """
       def __init__(self):
           super().__init__('capstone_system_analyzer')

           # Subscribers for capstone system monitoring
           self.status_sub = self.create_subscription(
               String, '/vla/capstone/status', self.status_callback, 10)
           self.health_sub = self.create_subscription(
               Float32, '/vla/capstone/health', self.health_callback, 10)
           self.metrics_sub = self.create_subscription(
               String, '/vla/capstone/metrics', self.metrics_callback, 10)
           self.feedback_sub = self.create_subscription(
               String, '/vla/capstone/action_feedback', self.feedback_callback, 10)

           # Data storage
           self.status_history = deque(maxlen=1000)
           self.health_history = deque(maxlen=1000)
           self.metrics_history = deque(maxlen=1000)
           self.feedback_history = deque(maxlen=1000)
           self.capstone_metrics = defaultdict(list)

           # Analysis parameters
           self.analysis_window = 100  # samples for rolling analysis

           # Analysis timer
           self.analysis_timer = self.create_timer(5.0, self.perform_analysis)

           self.get_logger().info('Capstone System Analyzer initialized')

       def status_callback(self, msg):
           """
           Collect system status messages
           """
           try:
               status_data = json.loads(msg.data)
               status_data['timestamp'] = time.time()
               self.status_history.append(status_data)
           except Exception as e:
               self.get_logger().error(f'Error parsing status: {e}')

       def health_callback(self, msg):
           """
           Collect system health updates
           """
           self.health_history.append({
               'timestamp': time.time(),
               'health': msg.data
           })

       def metrics_callback(self, msg):
           """
           Collect performance metrics
           """
           try:
               metrics_data = json.loads(msg.data)
               metrics_data['timestamp'] = time.time()
               self.metrics_history.append(metrics_data)
           except Exception as e:
               self.get_logger().error(f'Error parsing metrics: {e}')

       def feedback_callback(self, msg):
           """
           Collect action feedback
           """
           try:
               feedback_data = json.loads(msg.data)
               feedback_data['timestamp'] = time.time()
               self.feedback_history.append(feedback_data)
           except Exception as e:
               self.get_logger().error(f'Error parsing feedback: {e}')

       def perform_analysis(self):
           """
           Perform capstone system analysis
           """
           if not self.status_history:
               return

           # Analyze recent status
           recent_status = list(self.status_history)[-self.analysis_window:]
           if not recent_status:
               return

           # Calculate performance metrics
           processing_times = [s.get('processing_time', 0) for s in recent_status]
           safety_scores = [s.get('safety_score', 0) for s in recent_status]
           health_scores = [s.get('system_health', 1.0) for s in recent_status]
           uncertainties = [s.get('uncertainty', 0) for s in recent_status]

           # Calculate averages
           avg_processing_time = sum(processing_times) / len(processing_times) if processing_times else 0
           avg_safety_score = sum(safety_scores) / len(safety_scores) if safety_scores else 0
           avg_health_score = sum(health_scores) / len(health_scores) if health_scores else 0
           avg_uncertainty = sum(uncertainties) / len(uncertainties) if uncertainties else 0

           # Count executed actions
           executed_actions = sum(1 for f in self.feedback_history if f.get('action_executed', False))

           # Calculate success rate
           success_rate = executed_actions / len(self.feedback_history) if self.feedback_history else 0

           self.get_logger().info(
               f'Capstone System Analysis - '
               f'Avg Processing Time: {avg_processing_time:.3f}s, '
               f'Avg Safety Score: {avg_safety_score:.3f}, '
               f'Avg Health Score: {avg_health_score:.3f}, '
               f'Avg Uncertainty: {avg_uncertainty:.3f}, '
               f'Success Rate: {success_rate:.2f}, '
               f'Sample Count: {len(recent_status)}'
           )

           # Store metrics
           self.capstone_metrics['avg_processing_time'].append(avg_processing_time)
           self.capstone_metrics['avg_safety_score'].append(avg_safety_score)
           self.capstone_metrics['avg_health_score'].append(avg_health_score)
           self.capstone_metrics['avg_uncertainty'].append(avg_uncertainty)
           self.capstone_metrics['success_rate'].append(success_rate)

       def generate_analysis_report(self):
           """
           Generate comprehensive capstone system analysis report
           """
           if not self.status_history:
               return "No capstone system data available"

           # Performance analysis
           processing_times = [s.get('processing_time', 0) for s in self.status_history]
           safety_scores = [s.get('safety_score', 0) for s in self.status_history]
           health_scores = [s.get('system_health', 1.0) for s in self.status_history]
           uncertainties = [s.get('uncertainty', 0) for s in self.status_history]

           performance_stats = {
               'processing_time': {
                   'mean': float(np.mean(processing_times)) if processing_times else 0,
                   'std': float(np.std(processing_times)) if processing_times else 0,
                   'min': float(np.min(processing_times)) if processing_times else 0,
                   'max': float(np.max(processing_times)) if processing_times else 0,
                   'median': float(np.median(processing_times)) if processing_times else 0
               },
               'safety_score': {
                   'mean': float(np.mean(safety_scores)) if safety_scores else 0,
                   'std': float(np.std(safety_scores)) if safety_scores else 0,
                   'min': float(np.min(safety_scores)) if safety_scores else 0,
                   'max': float(np.max(safety_scores)) if safety_scores else 0,
                   'median': float(np.median(safety_scores)) if safety_scores else 0
               },
               'health_score': {
                   'mean': float(np.mean(health_scores)) if health_scores else 0,
                   'std': float(np.std(health_scores)) if health_scores else 0,
                   'min': float(np.min(health_scores)) if health_scores else 0,
                   'max': float(np.max(health_scores)) if health_scores else 0,
                   'median': float(np.median(health_scores)) if health_scores else 0
               },
               'uncertainty': {
                   'mean': float(np.mean(uncertainties)) if uncertainties else 0,
                   'std': float(np.std(uncertainties)) if uncertainties else 0,
                   'min': float(np.min(uncertainties)) if uncertainties else 0,
                   'max': float(np.max(uncertainties)) if uncertainties else 0,
                   'median': float(np.median(uncertainties)) if uncertainties else 0
               }
           }

           # Action execution analysis
           executed_actions = [f for f in self.feedback_history if f.get('action_executed', False)]
           success_rate = len(executed_actions) / len(self.feedback_history) if self.feedback_history else 0

           # Component readiness analysis
           component_readiness = defaultdict(list)
           for status in self.status_history:
               component_status = status.get('component_status', {})
               for component, ready in component_status.items():
                   component_readiness[component].append(ready)

           readiness_rates = {}
           for component, status_list in component_readiness.items():
               if status_list:
                   readiness_rates[component] = sum(status_list) / len(status_list)

           report = {
               'system_duration': len(self.status_history),
               'performance_analysis': performance_stats,
               'execution_analysis': {
                   'total_feedback': len(self.feedback_history),
                   'executed_actions': len(executed_actions),
                   'success_rate': success_rate,
                   'success_percentage': success_rate * 100
               },
               'component_readiness': readiness_rates,
               'system_health_overview': {
                   'overall_health': performance_stats['health_score']['mean'],
                   'health_stability': 1.0 - performance_stats['health_score']['std'],
                   'safety_reliability': performance_stats['safety_score']['mean'],
                   'uncertainty_management': 1.0 - performance_stats['uncertainty']['mean']
               },
               'capstone_achievement': {
                   'integrated_components': len(readiness_rates),
                   'performance_target_met': performance_stats['processing_time']['mean'] < 0.1,
                   'safety_target_met': performance_stats['safety_score']['mean'] > 0.8,
                   'health_target_met': performance_stats['health_score']['mean'] > 0.8
               }
           }

           return report

       def plot_capstone_analysis(self):
           """
           Plot capstone system analysis results
           """
           if not self.capstone_metrics['avg_processing_time']:
               self.get_logger().warn('No analysis data for plotting')
               return

           fig, axes = plt.subplots(2, 2, figsize=(15, 10))

           # Plot average processing time over time
           processing_times = self.capstone_metrics['avg_processing_time']
           axes[0, 0].plot(processing_times, 'b-', linewidth=1)
           axes[0, 0].set_title('Average Processing Time Over Time')
           axes[0, 0].set_xlabel('Analysis Interval')
           axes[0, 0].set_ylabel('Processing Time (s)')
           axes[0, 0].grid(True)

           # Plot health score over time
           health_scores = self.capstone_metrics['avg_health_score']
           axes[0, 1].plot(health_scores, 'g-', linewidth=1)
           axes[0, 1].set_title('Average Health Score Over Time')
           axes[0, 1].set_xlabel('Analysis Interval')
           axes[0, 1].set_ylabel('Health Score')
           axes[0, 1].grid(True)
           axes[0, 1].set_ylim(0, 1)

           # Plot safety score over time
           safety_scores = self.capstone_metrics['avg_safety_score']
           axes[1, 0].plot(safety_scores, 'r-', linewidth=1)
           axes[1, 0].set_title('Average Safety Score Over Time')
           axes[1, 0].set_xlabel('Analysis Interval')
           axes[1, 0].set_ylabel('Safety Score')
           axes[1, 0].grid(True)
           axes[1, 0].set_ylim(0, 1)

           # Plot success rate over time
           success_rates = self.capstone_metrics['success_rate']
           axes[1, 1].plot(success_rates, 'm-', linewidth=1)
           axes[1, 1].set_title('Action Success Rate Over Time')
           axes[1, 1].set_xlabel('Analysis Interval')
           axes[1, 1].set_ylabel('Success Rate')
           axes[1, 1].grid(True)
           axes[1, 1].set_ylim(0, 1)

           plt.tight_layout()
           plt.savefig('/tmp/capstone_vla_system_analysis.png')
           self.get_logger().info('Capstone system analysis saved to /tmp/capstone_vla_system_analysis.png')

   def main():
       rclpy.init()
       analyzer = CapstoneSystemAnalyzer()

       try:
           rclpy.spin(analyzer)
       except KeyboardInterrupt:
           # Generate final analysis
           report = analyzer.generate_analysis_report()
           print("\nCapstone VLA-Physical AI System Analysis Report:")
           print(json.dumps(report, indent=2))

           # Generate plot
           analyzer.plot_capstone_analysis()
       finally:
           analyzer.destroy_node()
           rclpy.shutdown()

   if __name__ == '__main__':
       main()
   ```

3. Make the script executable and run analysis:
   ```bash
   chmod +x ~/ros2_ws/src/capstone_vla_examples/scripts/analyze_capstone_system.py

   cd ~/ros2_ws
   colcon build --packages-select capstone_vla_examples
   source install/setup.bash

   # Run capstone system analysis
   ros2 run capstone_vla_examples analyze_capstone_system.py
   ```

## Troubleshooting

- **System Integration Issues**: Verify all component connections and message formats
- **Performance Problems**: Monitor resource usage and adjust configurations
- **Safety Violations**: Review safety thresholds and validation procedures
- **Component Failures**: Check individual component logs and dependencies
- **Deployment Issues**: Validate hardware compatibility and resource availability

## Summary

This lesson completed the capstone project for VLA-Physical AI systems, integrating all learned concepts into a comprehensive, production-ready solution. The capstone system demonstrates advanced capabilities in vision-language-action integration, safety monitoring, and real-world Physical AI applications. The complete implementation showcases the integration of perception, reasoning, action, and safety components working together to create an intelligent Physical AI system.

## Next Steps

This concludes Module 4: Vision-Language-Action (VLA) Models. The capstone project represents the culmination of all VLA learning objectives, demonstrating a complete Physical AI solution capable of understanding natural language commands, perceiving environmental context, and executing appropriate robotic behaviors safely and reliably.