---
sidebar_position: 5
prev:
  title: Week 3, Lesson 3 - Bridging Python Agents to ROS controllers using `rclpy`
  url: /docs/chapter1/week-plan/week3-lesson3-python-agents-rclpy
next:
  title: Week 5, Lesson 5 - Practical ROS 2 Package Building with Python
  url: /docs/chapter1/week-plan/week5-lesson5-ros2-package-building
---

# Week 4, Lesson 4: Understanding URDF (Unified Robot Description Format) for humanoids

## Objective

Master the Unified Robot Description Format (URDF) for describing humanoid robot structures. Learn to create accurate 3D models of humanoid robots that can be used in simulation and control applications.

## Theory

### What is URDF?

URDF (Unified Robot Description Format) is an XML-based format used in ROS to describe robot models. It defines:
- Physical structure (links and joints)
- Kinematic properties
- Visual and collision properties
- Inertial properties

### URDF Components for Humanoids

For humanoid robots, URDF must define:
1. **Links**: Rigid bodies (head, torso, arms, legs, feet)
2. **Joints**: Connections between links (hinges, prismatic, fixed)
3. **Materials**: Visual appearance properties
4. **Inertial properties**: Mass, center of mass, and inertia tensors

### Humanoid-Specific Considerations

Humanoid robots require special attention to:
- Anthropomorphic proportions
- Multiple degrees of freedom per limb
- Balance and center of mass considerations
- Collision avoidance between limbs

## Hardware Context

This lesson applies to both:
- **Jetson Orin Kit**: For edge computing with humanoid robot models
- **RTX Workstation**: For simulation and visualization of humanoid models

## Practical Example

Here's a Python example for working with URDF files and a sample URDF for a simple humanoid:

```xml
<?xml version="1.0"?>
<robot name="simple_humanoid">
  <!-- Materials -->
  <material name="blue">
    <color rgba="0.0 0.0 0.8 1.0"/>
  </material>
  <material name="red">
    <color rgba="0.8 0.0 0.0 1.0"/>
  </material>
  <material name="white">
    <color rgba="1.0 1.0 1.0 1.0"/>
  </material>

  <!-- Base link -->
  <link name="base_link">
    <visual>
      <geometry>
        <box size="0.1 0.1 0.1"/>
      </geometry>
      <material name="white"/>
    </visual>
    <collision>
      <geometry>
        <box size="0.1 0.1 0.1"/>
      </geometry>
    </collision>
    <inertial>
      <mass value="1.0"/>
      <inertia ixx="0.01" ixy="0.0" ixz="0.0" iyy="0.01" iyz="0.0" izz="0.01"/>
    </inertial>
  </link>

  <!-- Torso -->
  <link name="torso">
    <visual>
      <geometry>
        <box size="0.2 0.1 0.4"/>
      </geometry>
      <material name="white"/>
    </visual>
    <collision>
      <geometry>
        <box size="0.2 0.1 0.4"/>
      </geometry>
    </collision>
    <inertial>
      <mass value="5.0"/>
      <inertia ixx="0.1" ixy="0.0" ixz="0.0" iyy="0.1" iyz="0.0" izz="0.1"/>
    </inertial>
  </link>

  <joint name="base_to_torso" type="fixed">
    <parent link="base_link"/>
    <child link="torso"/>
    <origin xyz="0 0 0.25"/>
  </joint>

  <!-- Head -->
  <link name="head">
    <visual>
      <geometry>
        <sphere radius="0.1"/>
      </geometry>
      <material name="white"/>
    </visual>
    <collision>
      <geometry>
        <sphere radius="0.1"/>
      </geometry>
    </collision>
    <inertial>
      <mass value="1.0"/>
      <inertia ixx="0.004" ixy="0.0" ixz="0.0" iyy="0.004" iyz="0.0" izz="0.004"/>
    </inertial>
  </link>

  <joint name="torso_to_head" type="fixed">
    <parent link="torso"/>
    <child link="head"/>
    <origin xyz="0 0 0.3"/>
  </joint>

  <!-- Left Arm -->
  <link name="left_upper_arm">
    <visual>
      <geometry>
        <cylinder length="0.3" radius="0.05"/>
      </geometry>
      <material name="blue"/>
    </visual>
    <collision>
      <geometry>
        <cylinder length="0.3" radius="0.05"/>
      </geometry>
    </collision>
    <inertial>
      <mass value="1.0"/>
      <inertia ixx="0.01" ixy="0.0" ixz="0.0" iyy="0.01" iyz="0.0" izz="0.001"/>
    </inertial>
  </link>

  <joint name="left_shoulder" type="revolute">
    <parent link="torso"/>
    <child link="left_upper_arm"/>
    <origin xyz="0.15 0 0.1" rpy="0 0 0"/>
    <axis xyz="0 1 0"/>
    <limit lower="-1.57" upper="1.57" effort="100" velocity="1"/>
  </joint>

  <link name="left_lower_arm">
    <visual>
      <geometry>
        <cylinder length="0.3" radius="0.04"/>
      </geometry>
      <material name="blue"/>
    </visual>
    <collision>
      <geometry>
        <cylinder length="0.3" radius="0.04"/>
      </geometry>
    </collision>
    <inertial>
      <mass value="0.8"/>
      <inertia ixx="0.008" ixy="0.0" ixz="0.0" iyy="0.008" iyz="0.0" izz="0.0008"/>
    </inertial>
  </link>

  <joint name="left_elbow" type="revolute">
    <parent link="left_upper_arm"/>
    <child link="left_lower_arm"/>
    <origin xyz="0 0 -0.3" rpy="0 0 0"/>
    <axis xyz="0 1 0"/>
    <limit lower="-1.57" upper="1.57" effort="100" velocity="1"/>
  </joint>

  <!-- Right Arm -->
  <link name="right_upper_arm">
    <visual>
      <geometry>
        <cylinder length="0.3" radius="0.05"/>
      </geometry>
      <material name="red"/>
    </visual>
    <collision>
      <geometry>
        <cylinder length="0.3" radius="0.05"/>
      </geometry>
    </collision>
    <inertial>
      <mass value="1.0"/>
      <inertia ixx="0.01" ixy="0.0" ixz="0.0" iyy="0.01" iyz="0.0" izz="0.001"/>
    </inertial>
  </link>

  <joint name="right_shoulder" type="revolute">
    <parent link="torso"/>
    <child link="right_upper_arm"/>
    <origin xyz="-0.15 0 0.1" rpy="0 0 0"/>
    <axis xyz="0 1 0"/>
    <limit lower="-1.57" upper="1.57" effort="100" velocity="1"/>
  </joint>

  <link name="right_lower_arm">
    <visual>
      <geometry>
        <cylinder length="0.3" radius="0.04"/>
      </geometry>
      <material name="red"/>
    </visual>
    <collision>
      <geometry>
        <cylinder length="0.3" radius="0.04"/>
      </geometry>
    </collision>
    <inertial>
      <mass value="0.8"/>
      <inertia ixx="0.008" ixy="0.0" ixz="0.0" iyy="0.008" iyz="0.0" izz="0.0008"/>
    </inertial>
  </link>

  <joint name="right_elbow" type="revolute">
    <parent link="right_upper_arm"/>
    <child link="right_lower_arm"/>
    <origin xyz="0 0 -0.3" rpy="0 0 0"/>
    <axis xyz="0 1 0"/>
    <limit lower="-1.57" upper="1.57" effort="100" velocity="1"/>
  </joint>

  <!-- Left Leg -->
  <link name="left_upper_leg">
    <visual>
      <geometry>
        <cylinder length="0.4" radius="0.06"/>
      </geometry>
      <material name="blue"/>
    </visual>
    <collision>
      <geometry>
        <cylinder length="0.4" radius="0.06"/>
      </geometry>
    </collision>
    <inertial>
      <mass value="2.0"/>
      <inertia ixx="0.02" ixy="0.0" ixz="0.0" iyy="0.02" iyz="0.0" izz="0.002"/>
    </inertial>
  </link>

  <joint name="left_hip" type="revolute">
    <parent link="torso"/>
    <child link="left_upper_leg"/>
    <origin xyz="0.05 0 -0.3" rpy="0 0 0"/>
    <axis xyz="0 1 0"/>
    <limit lower="-1.57" upper="1.57" effort="100" velocity="1"/>
  </joint>

  <link name="left_lower_leg">
    <visual>
      <geometry>
        <cylinder length="0.4" radius="0.05"/>
      </geometry>
      <material name="blue"/>
    </visual>
    <collision>
      <geometry>
        <cylinder length="0.4" radius="0.05"/>
      </geometry>
    </collision>
    <inertial>
      <mass value="1.5"/>
      <inertia ixx="0.015" ixy="0.0" ixz="0.0" iyy="0.015" iyz="0.0" izz="0.0015"/>
    </inertial>
  </link>

  <joint name="left_knee" type="revolute">
    <parent link="left_upper_leg"/>
    <child link="left_lower_leg"/>
    <origin xyz="0 0 -0.4" rpy="0 0 0"/>
    <axis xyz="0 1 0"/>
    <limit lower="-1.57" upper="1.57" effort="100" velocity="1"/>
  </joint>

  <!-- Right Leg -->
  <link name="right_upper_leg">
    <visual>
      <geometry>
        <cylinder length="0.4" radius="0.06"/>
      </geometry>
      <material name="red"/>
    </visual>
    <collision>
      <geometry>
        <cylinder length="0.4" radius="0.06"/>
      </geometry>
    </collision>
    <inertial>
      <mass value="2.0"/>
      <inertia ixx="0.02" ixy="0.0" ixz="0.0" iyy="0.02" iyz="0.0" izz="0.002"/>
    </inertial>
  </link>

  <joint name="right_hip" type="revolute">
    <parent link="torso"/>
    <child link="right_upper_leg"/>
    <origin xyz="-0.05 0 -0.3" rpy="0 0 0"/>
    <axis xyz="0 1 0"/>
    <limit lower="-1.57" upper="1.57" effort="100" velocity="1"/>
  </joint>

  <link name="right_lower_leg">
    <visual>
      <geometry>
        <cylinder length="0.4" radius="0.05"/>
      </geometry>
      <material name="red"/>
    </visual>
    <collision>
      <geometry>
        <cylinder length="0.4" radius="0.05"/>
      </geometry>
    </collision>
    <inertial>
      <mass value="1.5"/>
      <inertia ixx="0.015" ixy="0.0" ixz="0.0" iyy="0.015" iyz="0.0" izz="0.0015"/>
    </inertial>
  </link>

  <joint name="right_knee" type="revolute">
    <parent link="right_upper_leg"/>
    <child link="right_lower_leg"/>
    <origin xyz="0 0 -0.4" rpy="0 0 0"/>
    <axis xyz="0 1 0"/>
    <limit lower="-1.57" upper="1.57" effort="100" velocity="1"/>
  </joint>
</robot>
```

And here's a Python script to work with URDF files:

```python
#!/usr/bin/env python3
"""
Python script to work with URDF files for humanoid robots
"""

import xml.etree.ElementTree as ET
from math import pi
import os

class URDFAnalyzer:
    def __init__(self, urdf_file_path):
        self.urdf_file_path = urdf_file_path
        self.tree = ET.parse(urdf_file_path)
        self.root = self.tree.getroot()
        self.robot_name = self.root.get('name')

    def get_links(self):
        """Get all links in the URDF"""
        links = []
        for link in self.root.findall('link'):
            links.append({
                'name': link.get('name'),
                'visual': link.find('visual'),
                'collision': link.find('collision'),
                'inertial': link.find('inertial')
            })
        return links

    def get_joints(self):
        """Get all joints in the URDF"""
        joints = []
        for joint in self.root.findall('joint'):
            joint_type = joint.get('type')
            joints.append({
                'name': joint.get('name'),
                'type': joint_type,
                'parent': joint.find('parent').get('link') if joint.find('parent') is not None else None,
                'child': joint.find('child').get('link') if joint.find('child') is not None else None,
                'limit': joint.find('limit'),
                'axis': joint.find('axis')
            })
        return joints

    def print_summary(self):
        """Print a summary of the URDF structure"""
        links = self.get_links()
        joints = self.get_joints()

        print(f"Robot: {self.robot_name}")
        print(f"Number of links: {len(links)}")
        print(f"Number of joints: {len(joints)}")

        print("\nLinks:")
        for link in links:
            print(f"  - {link['name']}")

        print("\nJoints:")
        for joint in joints:
            print(f"  - {joint['name']} ({joint['type']}): {joint['parent']} -> {joint['child']}")

def main():
    # Example usage
    # Note: This would typically work with an actual URDF file
    print("URDF Analyzer for Humanoid Robots")
    print("This script demonstrates how to parse and analyze URDF files")
    print("In practice, you would load an actual URDF file like:")
    print("# analyzer = URDFAnalyzer('humanoid.urdf')")
    print("# analyzer.print_summary()")

if __name__ == '__main__':
    main()
```

## Summary

This lesson covered the fundamentals of URDF (Unified Robot Description Format) for humanoid robots. Understanding URDF is crucial for creating accurate robot models that can be used in simulation, visualization, and control applications. Properly defined URDF files enable realistic physics simulation and accurate robot behavior in Physical AI and Humanoid Robotics systems.