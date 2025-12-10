# Quickstart Guide: Phase 3 - Infrastructure Integration & VLA Models

## Overview
This guide provides step-by-step instructions to set up and run the Phase 3 features: RAG Chatbot, Better-Auth/Personalization, Urdu Translation, and Vision-Language-Action (VLA) Models for Physical AI systems.

## Prerequisites
- Python 3.9+
- Node.js 16+
- Docker (for local development)
- Access to Qdrant Cloud (free tier)
- Access to Neon Serverless Postgres
- OpenAI API key or equivalent LLM service
- NVIDIA GPU with CUDA support (for VLA models)
- RTX Workstation or Jetson Orin for VLA deployment

## Backend Setup

### 1. Clone and Navigate to Backend
```bash
cd backend
```

### 2. Set up Python Environment
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Configure Environment Variables
Create a `.env` file in the backend directory:
```env
DATABASE_URL=your_neon_postgres_connection_string
QDRANT_URL=your_qdrant_cloud_url
QDRANT_API_KEY=your_qdrant_api_key
LLM_API_KEY=your_openai_api_key
AUTH_SECRET=your_auth_secret
FRONTEND_URL=http://localhost:3000
CUDA_VISIBLE_DEVICES=0
TORCH_CUDNN_V8_API_ENABLED=1
```

### 4. Run Database Migrations
```bash
# Run this command to set up the database tables
python -m src.database.migrate
```

### 5. Start the Backend Server
```bash
python -m src.main
```
The backend will start on `http://localhost:8000`

## Frontend Setup (Docusaurus)

### 1. Navigate to Docusaurus Directory
```bash
cd docusaurus-book
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the docusaurus-book directory:
```env
REACT_APP_API_URL=http://localhost:8000
REACT_APP_AUTH_URL=http://localhost:8000
REACT_APP_VLA_ENABLED=true
REACT_APP_CUDA_AVAILABLE=true
```

### 4. Start the Development Server
```bash
npm start
```
The site will start on `http://localhost:3000`

## VLA Integration Setup

### 1. Install VLA Dependencies
```bash
# Activate backend environment
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install VLA-specific dependencies
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
pip install transformers accelerate diffusers
pip install opencv-python numpy scipy matplotlib
pip install rclpy sensor-msgs geometry-msgs std-msgs cv-bridge
pip install openai-whisper clip-anytorch sentence-transformers
```

### 2. Download Pre-trained VLA Models
```bash
mkdir -p ~/vla_models

# Download CLIP model for vision-language processing
python3 -c "
from transformers import CLIPProcessor, CLIPModel
clip_model = CLIPModel.from_pretrained('openai/clip-vit-base-patch32')
clip_processor = CLIPProcessor.from_pretrained('openai/clip-vit-base-patch32')
clip_model.save_pretrained('~/vla_models/clip-vit-base-patch32')
clip_processor.save_pretrained('~/vla_models/clip-vit-base-patch32')
"

# Download language model
python3 -c "
from transformers import GPT2LMHeadModel, GPT2Tokenizer
gpt_model = GPT2LMHeadModel.from_pretrained('gpt2-medium')
gpt_tokenizer = GPT2Tokenizer.from_pretrained('gpt2-medium')
gpt_model.save_pretrained('~/vla_models/gpt2-medium')
gpt_tokenizer.save_pretrained('~/vla_models/gpt2-medium')
"
```

### 3. VLA Configuration
Create VLA configuration file at `backend/config/vla_config.yaml`:
```yaml
vla_integration:
  model:
    vision_model_path: "/home/user/vla_models/clip-vit-base-patch32"
    language_model_path: "/home/user/vla_models/gpt2-medium"
    action_space_dim: 6
    device: "cuda"
    max_sequence_length: 77

  integration:
    frequency: 10.0  # Hz
    confidence_threshold: 0.7
    safety_validation: true
    gpu_acceleration: true

  perception:
    camera_topic: "/camera/rgb/image_raw"
    depth_topic: "/camera/depth/image_raw"
    image_resolution: [224, 224]
    preprocessing:
      normalize_mean: [0.485, 0.456, 0.406]
      normalize_std: [0.229, 0.224, 0.225]

  control:
    command_topic: "/vla/command"
    action_topic: "/cmd_vel"
    max_linear_velocity: 1.0
    max_angular_velocity: 1.5
    safety_limits:
      collision_distance: 0.5  # meters
      velocity_limits: true

  performance:
    target_latency: 0.1  # seconds
    memory_limit: 0.85  # fraction of available memory
    processing_timeout: 5.0  # seconds
```

## VLA Integration with ROS 2

### 1. Create VLA Integration Package
```bash
cd ~/ros2_ws/src
ros2 pkg create --dependencies rclpy sensor_msgs geometry_msgs std_msgs cv_bridge message_filters -- python vla_integration_examples
```

### 2. VLA Integration Node Implementation
Create the VLA integration node:

```python
#!/usr/bin/env python3

import rclpy
from rclpy.node import Node
from sensor_msgs.msg import Image, CameraInfo
from geometry_msgs.msg import Twist
from std_msgs.msg import String, Float32
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

class VLAIntegrationNode(Node):
    """
    VLA (Vision-Language-Action) integration node for Physical AI systems
    """
    def __init__(self):
        super().__init__('vla_integration_node')

        # Initialize CV bridge
        self.cv_bridge = CvBridge()

        # Publishers for VLA system
        self.robot_cmd_pub = self.create_publisher(Twist, '/cmd_vel', 10)
        self.vla_status_pub = self.create_publisher(String, '/vla/status', 10)
        self.action_confidence_pub = self.create_publisher(Float32, '/vla/action_confidence', 10)

        # Subscribers for multi-modal input
        self.image_sub = self.create_subscription(
            Image, '/camera/rgb/image_raw', self.image_callback, 10)
        self.command_sub = self.create_subscription(
            String, '/vla/command', self.command_callback, 10)

        # VLA integration parameters
        self.vla_params = {
            'action_space_dim': 6,
            'confidence_threshold': 0.7,
            'device': 'cuda' if torch.cuda.is_available() else 'cpu',
            'gpu_acceleration': torch.cuda.is_available(),
            'processing_frequency': 10.0  # Hz
        }

        # Initialize VLA model components
        self.clip_model = None
        self.clip_processor = None
        self.gpt_model = None
        self.gpt_tokenizer = None
        self.initialize_vla_components()

        # Data storage
        self.current_image = None
        self.current_command = None
        self.temporal_context = deque(maxlen=10)

        # Processing timer
        self.processing_timer = self.create_timer(
            1.0/self.vla_params['processing_frequency'], self.vla_processing_loop)

        self.get_logger().info('VLA Integration Node initialized')

    def initialize_vla_components(self):
        """
        Initialize VLA model components
        """
        try:
            # Load CLIP model for vision-language processing
            self.clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
            self.clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")

            # Load GPT model for language understanding
            self.gpt_model = GPT2LMHeadModel.from_pretrained('gpt2-medium')
            self.gpt_tokenizer = GPT2Tokenizer.from_pretrained('gpt2-medium')
            self.gpt_tokenizer.pad_token = self.gpt_tokenizer.eos_token

            # Move models to device
            self.clip_model.to(self.vla_params['device'])
            self.gpt_model.to(self.vla_params['device'])

            self.get_logger().info('VLA components initialized successfully')

        except Exception as e:
            self.get_logger().error(f'Failed to initialize VLA components: {e}')
            raise

    def image_callback(self, msg):
        """
        Process incoming RGB image data
        """
        try:
            cv_image = self.cv_bridge.imgmsg_to_cv2(msg, "bgr8")
            self.current_image = cv_image
        except Exception as e:
            self.get_logger().error(f'Error processing image: {e}')

    def command_callback(self, msg):
        """
        Process incoming natural language command
        """
        try:
            self.current_command = msg.data
            self.get_logger().info(f'Received VLA command: {msg.data}')
        except Exception as e:
            self.get_logger().error(f'Error processing command: {e}')

    def vla_processing_loop(self):
        """
        Main VLA processing loop
        """
        if not all([self.current_image, self.current_command]):
            return

        try:
            # Process through VLA pipeline
            action, confidence = self.process_vla_pipeline()

            if action is not None and confidence > self.vla_params['confidence_threshold']:
                # Execute action
                self.execute_action(action)

                # Publish status
                status_msg = String()
                status_msg.data = f'Action executed: {action[:3]}, Confidence: {confidence:.3f}'
                self.vla_status_pub.publish(status_msg)

                self.get_logger().info(f'VLA action executed: {action[:3]}, Confidence: {confidence:.3f}')
            else:
                # Low confidence - don't execute
                status_msg = String()
                status_msg.data = f'Action rejected - low confidence: {confidence:.3f}'
                self.vla_status_pub.publish(status_msg)

                self.get_logger().warn(f'VLA action rejected - confidence: {confidence:.3f}')

        except Exception as e:
            self.get_logger().error(f'Error in VLA processing: {e}')

    def process_vla_pipeline(self):
        """
        Process through complete VLA pipeline: vision + language -> action
        """
        try:
            # Preprocess visual data
            inputs = self.clip_processor(
                images=self.current_image,
                text=self.current_command,
                return_tensors="pt",
                padding=True,
                truncation=True,
                max_length=77
            )

            # Move to device
            pixel_values = inputs['pixel_values'].to(self.vla_params['device'])
            input_ids = inputs['input_ids'].to(self.vla_params['device'])

            # Extract features
            with torch.no_grad():
                vision_features = self.clip_model.get_image_features(pixel_values)
                vision_features = F.normalize(vision_features, dim=-1)

                text_features = self.clip_model.get_text_features(input_ids)
                text_features = F.normalize(text_features, dim=-1)

                # Combine vision and text features
                combined_features = torch.cat([vision_features, text_features], dim=-1)

                # Simple action generation (in practice, this would be a more complex network)
                action_weights = torch.randn(combined_features.shape[0], self.vla_params['action_space_dim']).to(combined_features.device)
                action = torch.tanh(F.linear(combined_features, action_weights))

                # Calculate confidence based on feature similarity
                similarity = F.cosine_similarity(vision_features, text_features).item()
                confidence = max(0.0, min(1.0, similarity))

            return action.cpu().numpy().flatten(), confidence

        except Exception as e:
            self.get_logger().error(f'Error in VLA pipeline: {e}')
            return None, 0.0

    def execute_action(self, action_values):
        """
        Execute VLA-generated action
        """
        try:
            # Create Twist message for robot command
            cmd = Twist()

            # Map action values to robot velocities
            if len(action_values) >= 6:
                cmd.linear.x = float(action_values[0])
                cmd.linear.y = float(action_values[1])
                cmd.linear.z = float(action_values[2])
                cmd.angular.x = float(action_values[3])
                cmd.angular.y = float(action_values[4])
                cmd.angular.z = float(action_values[5])

            # Apply safety limits
            cmd.linear.x = max(-1.0, min(1.0, cmd.linear.x))
            cmd.angular.z = max(-1.5, min(1.5, cmd.angular.z))

            # Publish command
            self.robot_cmd_pub.publish(cmd)

        except Exception as e:
            self.get_logger().error(f'Error executing action: {e}')

def main(args=None):
    rclpy.init(args=args)
    vla_integration_node = VLAIntegrationNode()

    try:
        rclpy.spin(vla_integration_node)
    except KeyboardInterrupt:
        pass
    finally:
        vla_integration_node.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()
```

### 3. VLA Launch Configuration
Create launch file at `~/ros2_ws/src/vla_integration_examples/launch/vla_integration.launch.py`:

```python
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, SetEnvironmentVariable
from launch.substitutions import LaunchConfiguration, PathJoinSubstitution
from launch_ros.actions import Node
from launch_ros.substitutions import FindPackageShare

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
            FindPackageShare('vla_integration_examples'),
            'config',
            'vla_config.yaml'
        ]),
        description='Path to VLA configuration file'
    )

    # Set environment variables for VLA
    SetEnvironmentVariable(
        name='CUDA_VISIBLE_DEVICES',
        value='0'
    )

    SetEnvironmentVariable(
        name='TORCH_CUDNN_V8_API_ENABLED',
        value='1'
    )

    # VLA Integration node
    vla_integration = Node(
        package='vla_integration_examples',
        executable='vla_integration_node',
        name='vla_integration_node',
        parameters=[
            LaunchConfiguration('config_file'),
            {'use_sim_time': LaunchConfiguration('use_sim_time')}
        ],
        remappings=[
            ('/camera/rgb/image_raw', '/zed/left/image_rect_color'),
            ('/cmd_vel', '/robot_velocity_controller/cmd_vel_unstamped'),
        ],
        output='screen'
    )

    # Isaac VLA Integration
    isaac_vla = Node(
        package='isaac_ros_vla',
        executable='vla_perception',
        name='isaac_vla_perception',
        parameters=[{'use_sim_time': LaunchConfiguration('use_sim_time')}],
        output='screen'
    )

    return LaunchDescription([
        use_sim_time,
        config_file,
        vla_integration,
        isaac_vla
    ])
```

## Initial Content Indexing

### 1. Process Documentation for RAG
After starting both servers, run the indexing script:
```bash
cd backend
python -m src.scripts.index_documentation
```

This will:
- Parse all Docusaurus markdown content
- Create vector embeddings using the configured LLM
- Store embeddings in Qdrant
- Create metadata records in Neon Postgres

### 2. Index VLA Documentation
```bash
cd backend
python -m src.scripts.index_vla_documentation
```

## Testing the Features

### RAG Chatbot
1. Visit the documentation site (http://localhost:3000)
2. Use the chatbot interface to ask questions about robotics content
3. Verify that responses include source citations

### Better-Auth Integration
1. Click on the "Sign In" button
2. Register a new account or sign in with existing credentials
3. Verify that user progress tracking works

### Urdu Translation
1. Use the language switcher to change to Urdu
2. Verify that content is properly translated
3. Check that technical terminology is accurately translated

### VLA Integration Testing
1. Start the VLA integration system:
   ```bash
   # Terminal 1: Start ROS 2 VLA system
   ros2 launch vla_integration_examples vla_integration.launch.py

   # Terminal 2: Send test commands
   ros2 topic pub /vla/command std_msgs/String "data: 'Move forward slowly'"
   ```

2. Monitor VLA status:
   ```bash
   ros2 topic echo /vla/status
   ```

3. Verify robot responds to natural language commands

## Production Deployment

### Backend Deployment
1. Deploy the FastAPI application to your preferred cloud platform
2. Ensure environment variables are properly configured
3. Set up monitoring and logging
4. Configure GPU resources for VLA model inference

### Frontend Deployment
1. Build the Docusaurus site: `npm run build`
2. Deploy the static files to your preferred hosting platform
3. Ensure API endpoints are correctly configured
4. Enable VLA integration in production environment

### VLA Model Deployment
1. Optimize models for production using TensorRT or ONNX
2. Configure GPU resources appropriately
3. Set up model serving infrastructure
4. Implement monitoring for VLA system performance

## Troubleshooting

### Common Issues
- **Qdrant Connection**: Verify your Qdrant Cloud credentials and network access
- **Database Connection**: Check your Neon Postgres connection string
- **Authentication**: Ensure the auth secret is properly configured on both backend and frontend
- **VLA Model Loading**: Verify CUDA availability and PyTorch installation
- **GPU Memory Issues**: Reduce batch sizes or use model quantization

### Performance Tips
- Use CDN for static assets
- Implement caching for frequently accessed content
- Monitor vector database performance for large document sets
- Optimize VLA models with TensorRT for production
- Use INT8 quantization for edge deployment

### VLA-Specific Troubleshooting
- **Model Loading Errors**: Check CUDA availability and model file paths
- **Processing Latency**: Monitor GPU utilization and memory usage
- **Action Generation**: Verify confidence thresholds and safety limits
- **Integration Issues**: Check topic names and message formats