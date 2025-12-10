---
sidebar_position: 16
---

# Creating Robot Models for Simulation in Gazebo

## Learning Objectives

By the end of this lesson, you will be able to:
- Create URDF (Unified Robot Description Format) files for robot models
- Configure joints, links, and physical properties for Gazebo simulation
- Add visual and collision properties to robot models
- Integrate sensors into robot models for Gazebo simulation
- Test robot models in Gazebo environment

## Overview

Creating accurate and properly configured robot models is fundamental to effective Gazebo simulation in Physical AI and humanoid robotics. This lesson covers the complete process of designing robot models using URDF, including links, joints, inertial properties, and sensor integration, with a focus on humanoid robotics applications.

## URDF Fundamentals

### What is URDF?

URDF (Unified Robot Description Format) is an XML format used to describe robot models in ROS. It defines the physical and visual properties of a robot, including:

- **Links**: Rigid bodies with visual, collision, and inertial properties
- **Joints**: Connections between links with specific degrees of freedom
- **Materials**: Visual appearance and properties
- **Transmission**: How actuators are connected to joints
- **Gazebo plugins**: Simulation-specific extensions

### Basic URDF Structure

```xml
<?xml version="1.0"?>
<robot name="simple_robot">
  <!-- Base link definition -->
  <link name="base_link">
    <visual>
      <geometry>
        <cylinder length="0.6" radius="0.2"/>
      </geometry>
      <material name="blue">
        <color rgba="0 0 0.8 1"/>
      </material>
    </visual>
    <collision>
      <geometry>
        <cylinder length="0.6" radius="0.2"/>
      </geometry>
    </collision>
    <inertial>
      <mass value="10"/>
      <inertia ixx="1.0" ixy="0.0" ixz="0.0" iyy="1.0" iyz="0.0" izz="1.0"/>
    </inertial>
  </link>
</robot>
```

## Creating a Humanoid Robot Model

### Robot Model Structure

For a humanoid robot simulation, we'll create a model with:
- Base/torso
- Head with camera
- Two arms with grippers
- Two legs
- Appropriate joints for humanoid movement

### Complete URDF Example

```xml
<?xml version="1.0"?>
<robot name="humanoid_robot" xmlns:xacro="http://www.ros.org/wiki/xacro">

  <!-- Include common definitions -->
  <xacro:include filename="$(find gazebo_simulation_examples)/urdf/materials.urdf.xacro" />
  <xacro:include filename="$(find gazebo_simulation_examples)/urdf/transmission.urdf.xacro" />

  <!-- Base Properties -->
  <xacro:property name="M_PI" value="3.1415926535897931" />
  <xacro:property name="base_width" value="0.3" />
  <xacro:property name="base_length" value="0.4" />
  <xacro:property name="base_height" value="0.2" />

  <!-- Base Link -->
  <link name="base_link">
    <visual>
      <geometry>
        <box size="${base_width} ${base_length} ${base_height}"/>
      </geometry>
      <material name="light_grey">
        <color rgba="0.7 0.7 0.7 1.0"/>
      </material>
    </visual>
    <collision>
      <geometry>
        <box size="${base_width} ${base_length} ${base_height}"/>
      </geometry>
    </collision>
    <inertial>
      <mass value="10.0"/>
      <origin xyz="0 0 0" rpy="0 0 0"/>
      <inertia ixx="0.1" ixy="0.0" ixz="0.0" iyy="0.1" iyz="0.0" izz="0.1"/>
    </inertial>
  </link>

  <!-- Head -->
  <joint name="head_joint" type="fixed">
    <parent link="base_link"/>
    <child link="head_link"/>
    <origin xyz="0 0 ${base_height/2 + 0.1}" rpy="0 0 0"/>
  </joint>

  <link name="head_link">
    <visual>
      <geometry>
        <sphere radius="0.1"/>
      </geometry>
      <material name="white">
        <color rgba="1.0 1.0 1.0 1.0"/>
      </material>
    </visual>
    <collision>
      <geometry>
        <sphere radius="0.1"/>
      </geometry>
    </collision>
    <inertial>
      <mass value="1.0"/>
      <origin xyz="0 0 0" rpy="0 0 0"/>
      <inertia ixx="0.001" ixy="0.0" ixz="0.0" iyy="0.001" iyz="0.0" izz="0.001"/>
    </inertial>
  </link>

  <!-- Camera in Head -->
  <joint name="camera_joint" type="fixed">
    <parent link="head_link"/>
    <child link="camera_link"/>
    <origin xyz="0.05 0 0" rpy="0 0 0"/>
  </joint>

  <link name="camera_link">
    <visual>
      <geometry>
        <box size="0.05 0.05 0.05"/>
      </geometry>
    </visual>
    <collision>
      <geometry>
        <box size="0.05 0.05 0.05"/>
      </geometry>
    </collision>
    <inertial>
      <mass value="0.1"/>
      <origin xyz="0 0 0" rpy="0 0 0"/>
      <inertia ixx="0.0001" ixy="0.0" ixz="0.0" iyy="0.0001" iyz="0.0" izz="0.0001"/>
    </inertial>
  </link>

  <!-- Gazebo plugin for camera -->
  <gazebo reference="camera_link">
    <sensor type="camera" name="camera1">
      <update_rate>30.0</update_rate>
      <camera name="head_camera">
        <horizontal_fov>1.3962634</horizontal_fov>
        <image>
          <width>800</width>
          <height>600</height>
          <format>R8G8B8</format>
        </image>
        <clip>
          <near>0.02</near>
          <far>300</far>
        </clip>
      </camera>
      <plugin name="camera_controller" filename="libgazebo_ros_camera.so">
        <frame_name>camera_link</frame_name>
      </plugin>
    </sensor>
  </gazebo>

  <!-- Left Arm -->
  <joint name="left_shoulder_joint" type="revolute">
    <parent link="base_link"/>
    <child link="left_upper_arm_link"/>
    <origin xyz="${base_width/2} 0 0" rpy="0 0 0"/>
    <axis xyz="0 1 0"/>
    <limit lower="${-M_PI/2}" upper="${M_PI/2}" effort="1000.0" velocity="0.5"/>
  </joint>

  <link name="left_upper_arm_link">
    <visual>
      <geometry>
        <cylinder length="0.3" radius="0.05"/>
      </geometry>
      <material name="red">
        <color rgba="0.8 0.2 0.2 1.0"/>
      </material>
    </visual>
    <collision>
      <geometry>
        <cylinder length="0.3" radius="0.05"/>
      </geometry>
    </collision>
    <inertial>
      <mass value="2.0"/>
      <origin xyz="0 -0.15 0" rpy="0 0 0"/>
      <inertia ixx="0.01" ixy="0.0" ixz="0.0" iyy="0.01" iyz="0.0" izz="0.01"/>
    </inertial>
  </link>

  <joint name="left_elbow_joint" type="revolute">
    <parent link="left_upper_arm_link"/>
    <child link="left_lower_arm_link"/>
    <origin xyz="0 -0.3 0" rpy="0 0 0"/>
    <axis xyz="0 1 0"/>
    <limit lower="${-M_PI/2}" upper="${M_PI/2}" effort="1000.0" velocity="0.5"/>
  </joint>

  <link name="left_lower_arm_link">
    <visual>
      <geometry>
        <cylinder length="0.25" radius="0.04"/>
      </geometry>
      <material name="red">
        <color rgba="0.8 0.2 0.2 1.0"/>
      </material>
    </visual>
    <collision>
      <geometry>
        <cylinder length="0.25" radius="0.04"/>
      </geometry>
    </collision>
    <inertial>
      <mass value="1.5"/>
      <origin xyz="0 -0.125 0" rpy="0 0 0"/>
      <inertia ixx="0.005" ixy="0.0" ixz="0.0" iyy="0.005" iyz="0.0" izz="0.005"/>
    </inertial>
  </link>

  <!-- Right Arm (symmetrical to left) -->
  <joint name="right_shoulder_joint" type="revolute">
    <parent link="base_link"/>
    <child link="right_upper_arm_link"/>
    <origin xyz="${-base_width/2} 0 0" rpy="0 0 0"/>
    <axis xyz="0 1 0"/>
    <limit lower="${-M_PI/2}" upper="${M_PI/2}" effort="1000.0" velocity="0.5"/>
  </joint>

  <link name="right_upper_arm_link">
    <visual>
      <geometry>
        <cylinder length="0.3" radius="0.05"/>
      </geometry>
      <material name="red">
        <color rgba="0.8 0.2 0.2 1.0"/>
      </material>
    </visual>
    <collision>
      <geometry>
        <cylinder length="0.3" radius="0.05"/>
      </geometry>
    </collision>
    <inertial>
      <mass value="2.0"/>
      <origin xyz="0 -0.15 0" rpy="0 0 0"/>
      <inertia ixx="0.01" ixy="0.0" ixz="0.0" iyy="0.01" iyz="0.0" izz="0.01"/>
    </inertial>
  </link>

  <joint name="right_elbow_joint" type="revolute">
    <parent link="right_upper_arm_link"/>
    <child link="right_lower_arm_link"/>
    <origin xyz="0 -0.3 0" rpy="0 0 0"/>
    <axis xyz="0 1 0"/>
    <limit lower="${-M_PI/2}" upper="${M_PI/2}" effort="1000.0" velocity="0.5"/>
  </joint>

  <link name="right_lower_arm_link">
    <visual>
      <geometry>
        <cylinder length="0.25" radius="0.04"/>
      </geometry>
      <material name="red">
        <color rgba="0.8 0.2 0.2 1.0"/>
      </material>
    </visual>
    <collision>
      <geometry>
        <cylinder length="0.25" radius="0.04"/>
      </geometry>
    </collision>
    <inertial>
      <mass value="1.5"/>
      <origin xyz="0 -0.125 0" rpy="0 0 0"/>
      <inertia ixx="0.005" ixy="0.0" ixz="0.0" iyy="0.005" iyz="0.0" izz="0.005"/>
    </inertial>
  </link>

  <!-- Left Leg -->
  <joint name="left_hip_joint" type="revolute">
    <parent link="base_link"/>
    <child link="left_upper_leg_link"/>
    <origin xyz="0.1 0 ${-base_height/2}" rpy="0 0 0"/>
    <axis xyz="0 1 0"/>
    <limit lower="${-M_PI/4}" upper="${M_PI/4}" effort="1000.0" velocity="0.5"/>
  </joint>

  <link name="left_upper_leg_link">
    <visual>
      <geometry>
        <cylinder length="0.4" radius="0.06"/>
      </geometry>
      <material name="blue">
        <color rgba="0.2 0.2 0.8 1.0"/>
      </material>
    </visual>
    <collision>
      <geometry>
        <cylinder length="0.4" radius="0.06"/>
      </geometry>
    </collision>
    <inertial>
      <mass value="3.0"/>
      <origin xyz="0 0 -0.2" rpy="0 0 0"/>
      <inertia ixx="0.02" ixy="0.0" ixz="0.0" iyy="0.02" iyz="0.0" izz="0.02"/>
    </inertial>
  </link>

  <joint name="left_knee_joint" type="revolute">
    <parent link="left_upper_leg_link"/>
    <child link="left_lower_leg_link"/>
    <origin xyz="0 0 -0.4" rpy="0 0 0"/>
    <axis xyz="0 1 0"/>
    <limit lower="${-M_PI/2}" upper="0" effort="1000.0" velocity="0.5"/>
  </joint>

  <link name="left_lower_leg_link">
    <visual>
      <geometry>
        <cylinder length="0.35" radius="0.05"/>
      </geometry>
      <material name="blue">
        <color rgba="0.2 0.2 0.8 1.0"/>
      </material>
    </visual>
    <collision>
      <geometry>
        <cylinder length="0.35" radius="0.05"/>
      </geometry>
    </collision>
    <inertial>
      <mass value="2.5"/>
      <origin xyz="0 0 -0.175" rpy="0 0 0"/>
      <inertia ixx="0.015" ixy="0.0" ixz="0.0" iyy="0.015" iyz="0.0" izz="0.015"/>
    </inertial>
  </link>

  <!-- Right Leg -->
  <joint name="right_hip_joint" type="revolute">
    <parent link="base_link"/>
    <child link="right_upper_leg_link"/>
    <origin xyz="-0.1 0 ${-base_height/2}" rpy="0 0 0"/>
    <axis xyz="0 1 0"/>
    <limit lower="${-M_PI/4}" upper="${M_PI/4}" effort="1000.0" velocity="0.5"/>
  </joint>

  <link name="right_upper_leg_link">
    <visual>
      <geometry>
        <cylinder length="0.4" radius="0.06"/>
      </geometry>
      <material name="blue">
        <color rgba="0.2 0.2 0.8 1.0"/>
      </material>
    </visual>
    <collision>
      <geometry>
        <cylinder length="0.4" radius="0.06"/>
      </geometry>
    </collision>
    <inertial>
      <mass value="3.0"/>
      <origin xyz="0 0 -0.2" rpy="0 0 0"/>
      <inertia ixx="0.02" ixy="0.0" ixz="0.0" iyy="0.02" iyz="0.0" izz="0.02"/>
    </inertial>
  </link>

  <joint name="right_knee_joint" type="revolute">
    <parent link="right_upper_leg_link"/>
    <child link="right_lower_leg_link"/>
    <origin xyz="0 0 -0.4" rpy="0 0 0"/>
    <axis xyz="0 1 0"/>
    <limit lower="${-M_PI/2}" upper="0" effort="1000.0" velocity="0.5"/>
  </joint>

  <link name="right_lower_leg_link">
    <visual>
      <geometry>
        <cylinder length="0.35" radius="0.05"/>
      </geometry>
      <material name="blue">
        <color rgba="0.2 0.2 0.8 1.0"/>
      </material>
    </visual>
    <collision>
      <geometry>
        <cylinder length="0.35" radius="0.05"/>
      </geometry>
    </collision>
    <inertial>
      <mass value="2.5"/>
      <origin xyz="0 0 -0.175" rpy="0 0 0"/>
      <inertia ixx="0.015" ixy="0.0" ixz="0.0" iyy="0.015" iyz="0.0" izz="0.015"/>
    </inertial>
  </link>

  <!-- Gazebo plugins for ROS control -->
  <gazebo>
    <plugin name="gazebo_ros_control" filename="libgazebo_ros_control.so">
      <robotNamespace>/humanoid_robot</robotNamespace>
    </plugin>
  </gazebo>

</robot>
```

## Python/ROS 2 Code Example - Robot State Publisher

Here's a Python example to work with your robot model:

```python
#!/usr/bin/env python3

import rclpy
from rclpy.node import Node
from sensor_msgs.msg import JointState
from geometry_msgs.msg import TransformStamped
from tf2_ros import TransformBroadcaster
import math
import numpy as np

class HumanoidRobotModel(Node):
    """
    Robot model controller for the humanoid robot in Gazebo
    Demonstrates joint state publishing and forward kinematics
    """

    def __init__(self):
        super().__init__('humanoid_robot_model')

        # Publisher for joint states
        self.joint_state_publisher = self.create_publisher(
            JointState, 'joint_states', 10)

        # Transform broadcaster for robot state
        self.tf_broadcaster = TransformBroadcaster(self)

        # Timer for publishing joint states
        self.timer = self.create_timer(0.05, self.publish_joint_states)

        # Initialize joint positions for demonstration
        self.joint_positions = {
            'left_shoulder_joint': 0.0,
            'left_elbow_joint': 0.0,
            'right_shoulder_joint': 0.0,
            'right_elbow_joint': 0.0,
            'left_hip_joint': 0.0,
            'left_knee_joint': 0.0,
            'right_hip_joint': 0.0,
            'right_knee_joint': 0.0
        }

        # Counter for animation
        self.animation_counter = 0.0

        self.get_logger().info('Humanoid Robot Model controller initialized')

    def publish_joint_states(self):
        """
        Publish joint states for the robot model
        """
        # Create joint state message
        msg = JointState()
        msg.name = list(self.joint_positions.keys())
        msg.position = list(self.joint_positions.values())
        msg.header.stamp = self.get_clock().now().to_msg()
        msg.header.frame_id = 'base_link'

        # Animate joints for demonstration
        self.animate_joints()

        # Publish joint states
        self.joint_state_publisher.publish(msg)

        # Broadcast transforms
        self.broadcast_transforms()

    def animate_joints(self):
        """
        Animate joints with a simple pattern for demonstration
        """
        self.animation_counter += 0.1

        # Simple oscillating pattern for each joint
        self.joint_positions['left_shoulder_joint'] = 0.5 * math.sin(self.animation_counter)
        self.joint_positions['right_shoulder_joint'] = 0.5 * math.sin(self.animation_counter + math.pi)
        self.joint_positions['left_elbow_joint'] = 0.3 * math.sin(self.animation_counter * 1.5)
        self.joint_positions['right_elbow_joint'] = 0.3 * math.sin(self.animation_counter * 1.5 + math.pi)
        self.joint_positions['left_hip_joint'] = 0.2 * math.sin(self.animation_counter * 0.7)
        self.joint_positions['right_hip_joint'] = 0.2 * math.sin(self.animation_counter * 0.7 + math.pi)
        self.joint_positions['left_knee_joint'] = 0.4 * math.sin(self.animation_counter * 0.9)
        self.joint_positions['right_knee_joint'] = 0.4 * math.sin(self.animation_counter * 0.9 + math.pi)

    def broadcast_transforms(self):
        """
        Broadcast transforms for visualization
        """
        # Publish static transforms (base to camera, etc.) are handled by robot_state_publisher
        # Publish dynamic transforms for animated joints
        t = TransformStamped()

        # Header
        t.header.stamp = self.get_clock().now().to_msg()
        t.header.frame_id = 'base_link'
        t.child_frame_id = 'animated_frame'

        # Transform (example - move a frame based on joint animation)
        t.transform.translation.x = 0.5 * math.sin(self.animation_counter)
        t.transform.translation.y = 0.0
        t.transform.translation.z = 0.3 + 0.2 * math.cos(self.animation_counter)
        t.transform.rotation.x = 0.0
        t.transform.rotation.y = 0.0
        t.transform.rotation.z = 0.0
        t.transform.rotation.w = 1.0

        self.tf_broadcaster.sendTransform(t)

def main(args=None):
    rclpy.init(args=args)

    robot_model = HumanoidRobotModel()

    try:
        rclpy.spin(robot_model)
    except KeyboardInterrupt:
        pass
    finally:
        robot_model.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()
```

## Hardware Context

### RTX Workstation Considerations

When creating complex humanoid robot models:

- **Model Complexity**: Balance detail with performance - more complex models require more computational resources
- **Inertial Properties**: Accurate inertial tensors are crucial for realistic physics simulation
- **Collision Geometry**: Use simplified collision meshes for better performance
- **GPU Acceleration**: Complex visual models benefit from GPU rendering acceleration

### Jetson Orin Kit Considerations

For edge-based simulation testing:

- Simplified robot models with fewer polygons
- Reduced joint complexity and actuator simulation
- Lower precision physics calculations
- Focus on essential kinematic properties rather than full dynamic simulation

## Implementation Exercise

1. Create the URDF directory structure:
   ```bash
   mkdir -p ~/ros2_ws/src/gazebo_simulation_examples/urdf
   ```

2. Create the materials file:
   ```xml
   <!-- Save as ~/ros2_ws/src/gazebo_simulation_examples/urdf/materials.urdf.xacro -->
   <?xml version="1.0"?>
   <robot xmlns:xacro="http://www.ros.org/wiki/xacro">
     <xacro:macro name="material_colors">
       <material name="blue">
         <color rgba="0.2 0.2 0.8 1.0"/>
       </material>
       <material name="red">
         <color rgba="0.8 0.2 0.2 1.0"/>
       </material>
       <material name="green">
         <color rgba="0.2 0.8 0.2 1.0"/>
       </material>
       <material name="yellow">
         <color rgba="0.8 0.8 0.2 1.0"/>
       </material>
       <material name="white">
         <color rgba="1.0 1.0 1.0 1.0"/>
       </material>
       <material name="black">
         <color rgba="0.0 0.0 0.0 1.0"/>
       </material>
       <material name="light_grey">
         <color rgba="0.7 0.7 0.7 1.0"/>
       </material>
     </xacro:macro>
   </robot>
   ```

3. Create the transmission file:
   ```xml
   <!-- Save as ~/ros2_ws/src/gazebo_simulation_examples/urdf/transmission.urdf.xacro -->
   <?xml version="1.0"?>
   <robot xmlns:xacro="http://www.ros.org/wiki/xacro">
     <xacro:macro name="simple_transmission" params="joint_name">
       <transmission name="${joint_name}_trans">
         <type>transmission_interface/SimpleTransmission</type>
         <joint name="${joint_name}">
           <hardwareInterface>hardware_interface/EffortJointInterface</hardwareInterface>
         </joint>
         <actuator name="${joint_name}_motor">
           <hardwareInterface>hardware_interface/EffortJointInterface</hardwareInterface>
           <mechanicalReduction>1</mechanicalReduction>
         </actuator>
       </transmission>
     </xacro:macro>
   </robot>
   ```

4. Create the main robot URDF file:
   ```bash
   # Save the complete URDF example above as ~/ros2_ws/src/gazebo_simulation_examples/urdf/humanoid_robot.urdf.xacro
   ```

5. Test the robot model:
   ```bash
   cd ~/ros2_ws
   colcon build --packages-select gazebo_simulation_examples
   source install/setup.bash

   # Test the URDF with robot_state_publisher
   ros2 run robot_state_publisher robot_state_publisher --ros-args -p robot_description:=$(python3 -c "import xacro; print(xacro.process_file('$(ros2 pkg prefix gazebo_simulation_examples)/share/gazebo_simulation_examples/urdf/humanoid_robot.urdf.xacro').toxml())")
   ```

## Troubleshooting

- **URDF Errors**: Use `check_urdf` tool to validate your robot model
- **Inertial Issues**: Ensure all links have properly defined inertial properties
- **Joint Limits**: Set appropriate limits to prevent simulation instability
- **Visual Issues**: Verify material definitions and geometry specifications

## Summary

This lesson covered the complete process of creating robot models for Gazebo simulation, including URDF design, joint configuration, and sensor integration. The humanoid robot model created serves as a foundation for more advanced simulation and control tasks.

## Next Steps

In the next lesson, we'll explore physics engines and accuracy in Gazebo simulation, focusing on how to tune physics parameters for realistic humanoid robot behavior.