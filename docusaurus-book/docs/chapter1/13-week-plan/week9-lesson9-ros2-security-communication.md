---
sidebar_position: 9
---

# Week 9: ROS 2 Security and Communication Patterns

## Learning Objectives
By the end of this lesson, you will understand:
- ROS 2 security mechanisms and best practices
- Secure communication patterns for robotics
- Authentication, authorization, and encryption
- Network security for distributed robotics systems
- Safety considerations in ROS 2 deployments

## Introduction to ROS 2 Security

Security is critical in humanoid robotics applications, especially when robots interact with humans and sensitive environments. ROS 2 provides built-in security features based on DDS Security specification.

### Why Security Matters in Robotics

- **Safety**: Unauthorized access could cause physical harm
- **Privacy**: Robots may collect sensitive data
- **Reliability**: Security breaches can cause system failures
- **Compliance**: Many applications require security standards

## DDS Security in ROS 2

ROS 2 security is built on DDS (Data Distribution Service) Security specification:

### 1. Identity Authentication
```python
# Example of configuring security in a ROS 2 node
import rclpy
from rclpy.node import Node

class SecureRobotNode(Node):
    def __init__(self):
        # Security is configured through environment variables and files
        # This node will use security settings from the environment
        super().__init__('secure_robot_node')

        self.publisher = self.create_publisher(String, 'secure_topic', 10)
        self.subscription = self.create_subscription(
            String, 'secure_input', self.listener_callback, 10
        )

        self.get_logger().info("Secure node initialized")

    def listener_callback(self, msg):
        self.get_logger().info(f"Received secure message: {msg.data}")
```

### 2. Security Configuration Files

Create security configuration files in your robot package:

**permissions.xml** (for access control):
```xml
<?xml version="1.0" encoding="UTF-8"?>
<dds xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
     xsi:noNamespaceSchemaLocation="http://www.omg.org/spec/DDS-SECURITY/20170901/omg_shared_ca_permissions.xsd">
    <permissions>
        <grant name="robot_admin">
            <subject_name>CN=robot_admin,O=Robotics,C=US</subject_name>
            <validity>
                <not_before>2023-01-01T00:00:00</not_before>
                <not_after>2030-01-01T00:00:00</not_after>
            </validity>
            <allow_rule>
                <domains>
                    <id_range>
                        <min>0</min>
                        <max>233</max>
                    </id_range>
                </domains>
                <publish>
                    <topics>
                        <topic>.*</topic>
                    </topics>
                </publish>
                <subscribe>
                    <topics>
                        <topic>.*</topic>
                    </topics>
                </subscribe>
            </allow_rule>
            <enable_join_access_control>true</enable_join_access_control>
            <enable_publish_access_control>true</enable_publish_access_control>
            <enable_subscribe_access_control>true</enable_subscribe_access_control>
        </grant>
    </permissions>
</dds>
```

**identity_ca.cert.pem** and **permissions_ca.cert.pem** are certificate files that need to be generated using tools like OpenSSL.

## Secure Communication Patterns

### 1. Encrypted Communication

```python
# Example of secure publisher with encryption considerations
import rclpy
from rclpy.node import Node
from std_msgs.msg import String
import json
import base64
from cryptography.fernet import Fernet

class EncryptedRobotNode(Node):
    def __init__(self):
        super().__init__('encrypted_robot_node')

        # Generate or load encryption key (in practice, this should be securely managed)
        self.cipher_suite = Fernet(Fernet.generate_key())

        self.publisher = self.create_publisher(String, 'encrypted_topic', 10)
        self.subscription = self.create_subscription(
            String, 'encrypted_input', self.encrypted_callback, 10
        )

    def encrypt_message(self, data):
        """Encrypt sensitive data before publishing."""
        if isinstance(data, str):
            data = data.encode()
        encrypted_data = self.cipher_suite.encrypt(data)
        return base64.b64encode(encrypted_data).decode()

    def decrypt_message(self, encrypted_data):
        """Decrypt received data."""
        try:
            encrypted_bytes = base64.b64decode(encrypted_data.encode())
            decrypted_data = self.cipher_suite.decrypt(encrypted_bytes)
            return decrypted_data.decode()
        except Exception as e:
            self.get_logger().error(f"Decryption failed: {e}")
            return None

    def encrypted_callback(self, msg):
        """Handle encrypted messages."""
        decrypted = self.decrypt_message(msg.data)
        if decrypted:
            self.get_logger().info(f"Decrypted message: {decrypted}")
        else:
            self.get_logger().error("Failed to decrypt message")
```

### 2. Topic-Based Access Control

```python
# Implementation of topic-based security
class SecureTopicManager:
    def __init__(self, node):
        self.node = node
        self.allowed_topics = {
            'admin': ['/*'],  # All topics for admin
            'operator': ['/cmd_vel', '/joint_states', '/robot_status'],
            'guest': ['/robot_status', '/tf']
        }
        self.user_role = 'guest'  # Default role

    def can_publish(self, topic_name):
        """Check if current user can publish to topic."""
        allowed = self.allowed_topics.get(self.user_role, [])
        return topic_name in allowed or '/*' in allowed

    def can_subscribe(self, topic_name):
        """Check if current user can subscribe to topic."""
        allowed = self.allowed_topics.get(self.user_role, [])
        return topic_name in allowed or '/*' in allowed

class RoleBasedRobotNode(Node):
    def __init__(self):
        super().__init__('role_based_node')
        self.security_manager = SecureTopicManager(self)

        # Check permissions before creating publisher
        if self.security_manager.can_publish('/cmd_vel'):
            self.cmd_vel_pub = self.create_publisher(Twist, '/cmd_vel', 10)
        else:
            self.get_logger().warn("No permission to publish to /cmd_vel")
```

## Network Security for Distributed Systems

### 1. ROS 2 Domain Isolation

```python
import os
import rclpy
from rclpy.node import Node

class NetworkSecureNode(Node):
    def __init__(self):
        # Use environment variable to set domain ID for isolation
        domain_id = int(os.getenv('ROS_DOMAIN_ID', '0'))
        self.get_logger().info(f"Using domain ID: {domain_id}")

        super().__init__('network_secure_node')

        # Create publishers/subscribers
        self.status_pub = self.create_publisher(String, 'robot_status', 10)

        # Domain-specific operations
        self.setup_domain_specific_behavior(domain_id)

    def setup_domain_specific_behavior(self, domain_id):
        """Configure behavior based on domain ID."""
        if domain_id == 0:
            # Development domain
            self.get_logger().info("Running in development mode")
            self.max_velocity = 0.5  # Limit for safety
        elif domain_id == 1:
            # Production domain
            self.get_logger().info("Running in production mode")
            self.max_velocity = 1.0
        else:
            # Other domains
            self.get_logger().info(f"Running in domain {domain_id}")
            self.max_velocity = 0.7
```

### 2. Firewall and Network Configuration

```python
import socket
import subprocess
from rclpy.node import Node

class NetworkConfigurationNode(Node):
    def __init__(self):
        super().__init__('network_config_node')

        # Check network interfaces
        self.check_network_security()

        # Configure firewall rules (example for Linux)
        self.configure_firewall()

    def check_network_security(self):
        """Check network security status."""
        try:
            # Get local IP address
            hostname = socket.gethostname()
            local_ip = socket.gethostbyname(hostname)

            self.get_logger().info(f"Node running on: {local_ip}")

            # Check for localhost usage in development
            if local_ip.startswith('127.') or local_ip == 'localhost':
                self.get_logger().warn("Running on localhost - not suitable for distributed systems")

        except Exception as e:
            self.get_logger().error(f"Network check failed: {e}")

    def configure_firewall(self):
        """Configure firewall for ROS 2 ports (example for Linux)."""
        # ROS 2 typically uses ports in range 11000-11999
        try:
            # Example: Allow ROS 2 domain 0 ports
            result = subprocess.run([
                'iptables', '-A', 'INPUT', '-p', 'tcp', '--dport', '11000:11999', '-j', 'ACCEPT'
            ], capture_output=True, text=True)

            if result.returncode == 0:
                self.get_logger().info("Firewall configured for ROS 2")
            else:
                self.get_logger().warn(f"Firewall configuration failed: {result.stderr}")

        except FileNotFoundError:
            self.get_logger().info("iptables not available, skipping firewall configuration")
```

## Security Best Practices

### 1. Parameter Security

```python
class SecureParameterNode(Node):
    def __init__(self):
        super().__init__('secure_parameter_node')

        # Declare sensitive parameters
        self.declare_parameter('robot_password', '',
                             descriptor=ParameterDescriptor(
                                 type=ParameterType.PARAMETER_STRING,
                                 description="Robot authentication password",
                                 additional_constraints="Should be set via secure means",
                                 read_only=True  # Only set at startup
                             ))

        # Avoid logging sensitive parameters
        self.declare_parameter('api_key', '')
        self.declare_parameter('database_password', '')

        # Initialize with secure parameters
        self.setup_secure_initialization()

    def setup_secure_initialization(self):
        """Initialize with secure parameters."""
        # Get parameters without logging their values
        password_param = self.get_parameter('robot_password')
        if not password_param.value:
            self.get_logger().error("No password provided - authentication will fail")
        else:
            self.get_logger().info("Password parameter set (value not logged for security)")
```

### 2. Authentication and Authorization

```python
import jwt
import datetime
from rclpy.node import Node

class AuthenticationNode(Node):
    def __init__(self):
        super().__init__('authentication_node')

        # Secret key for JWT (in production, this should be securely stored)
        self.jwt_secret = "your-super-secret-key-change-in-production"

        # Token expiration time
        self.token_expiry_hours = 24

    def generate_token(self, user_id, permissions):
        """Generate JWT token for user authentication."""
        payload = {
            'user_id': user_id,
            'permissions': permissions,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=self.token_expiry_hours),
            'iat': datetime.datetime.utcnow()
        }

        token = jwt.encode(payload, self.jwt_secret, algorithm='HS256')
        return token

    def verify_token(self, token):
        """Verify JWT token."""
        try:
            payload = jwt.decode(token, self.jwt_secret, algorithms=['HS256'])
            return payload
        except jwt.ExpiredSignatureError:
            self.get_logger().error("Token has expired")
            return None
        except jwt.InvalidTokenError:
            self.get_logger().error("Invalid token")
            return None

    def authenticate_request(self, auth_header):
        """Authenticate incoming request."""
        if not auth_header or not auth_header.startswith('Bearer '):
            return False, "Invalid authorization header"

        token = auth_header.split(' ')[1]
        payload = self.verify_token(token)

        if not payload:
            return False, "Authentication failed"

        return True, payload
```

## Hardware Context: RTX Workstation & Jetson Orin

### Security Considerations for Different Platforms

```python
import platform
import subprocess

class HardwareSecurityNode(Node):
    def __init__(self):
        super().__init__('hardware_security_node')

        # Detect hardware platform
        self.hardware_type = self.detect_hardware()
        self.get_logger().info(f"Running on hardware: {self.hardware_type}")

        # Apply platform-specific security measures
        self.apply_platform_security()

    def detect_hardware(self):
        """Detect the hardware platform."""
        try:
            # Check for NVIDIA hardware
            result = subprocess.run(['nvidia-smi', '--query-gpu=name', '--format=csv,noheader,nounits'],
                                  capture_output=True, text=True)
            if result.returncode == 0:
                gpu_name = result.stdout.strip()
                if 'RTX' in gpu_name.upper():
                    return 'RTX_Workstation'
                elif 'XAVIER' in gpu_name.upper() or 'ORIN' in gpu_name.upper():
                    return 'Jetson_Orin'
        except FileNotFoundError:
            pass

        # Fallback detection
        machine = platform.machine()
        if 'aarch64' in machine or 'arm64' in machine:
            return 'ARM_Platform'  # Likely Jetson
        else:
            return 'x86_64_Platform'  # Likely RTX Workstation

    def apply_platform_security(self):
        """Apply security measures based on hardware platform."""
        if self.hardware_type == 'RTX_Workstation':
            # RTX workstation security configuration
            self.get_logger().info("Applying RTX Workstation security measures")
            self.configure_desktop_security()

        elif self.hardware_type == 'Jetson_Orin':
            # Jetson Orin security configuration
            self.get_logger().info("Applying Jetson Orin security measures")
            self.configure_embedded_security()

        else:
            self.get_logger().info("Applying generic security measures")

    def configure_desktop_security(self):
        """Security configuration for RTX Workstation."""
        # Desktop-specific security measures
        self.get_logger().info("Configuring desktop security...")
        # This might include file permissions, user access controls, etc.

    def configure_embedded_security(self):
        """Security configuration for Jetson Orin."""
        # Embedded system security measures
        self.get_logger().info("Configuring embedded security...")
        # This might include minimal services, secure boot, etc.
```

## Safety Considerations

### 1. Safe Communication Patterns

```python
from rclpy.qos import QoSProfile, ReliabilityPolicy, DurabilityPolicy

class SafeCommunicationNode(Node):
    def __init__(self):
        super().__init__('safe_communication_node')

        # Create QoS profiles for different safety levels
        self.critical_qos = QoSProfile(
            depth=10,
            reliability=ReliabilityPolicy.RELIABLE,
            durability=DurabilityPolicy.TRANSIENT_LOCAL
        )

        self.best_effort_qos = QoSProfile(
            depth=5,
            reliability=ReliabilityPolicy.BEST_EFFORT,
            durability=DurabilityPolicy.VOLATILE
        )

        # Critical safety topics
        self.emergency_stop_pub = self.create_publisher(
            Bool, 'emergency_stop', self.critical_qos
        )

        # Less critical topics
        self.diagnostics_pub = self.create_publisher(
            DiagnosticArray, 'diagnostics', self.best_effort_qos
        )

    def publish_emergency_stop(self):
        """Safely publish emergency stop command."""
        msg = Bool()
        msg.data = True
        self.emergency_stop_pub.publish(msg)
        self.get_logger().warn("EMERGENCY STOP PUBLISHED - ALL MOTORS STOPPED")
```

## Summary

Security in ROS 2 is essential for protecting humanoid robotics systems. This includes authentication, authorization, encryption, and safe communication patterns. The security measures should be appropriate for the hardware platform and use case.

## Exercises

1. Implement authentication for your robot nodes
2. Create a secure communication pattern for sensitive data
3. Configure domain isolation for different robot subsystems
4. Implement emergency stop with proper security measures
5. Add logging and monitoring for security events