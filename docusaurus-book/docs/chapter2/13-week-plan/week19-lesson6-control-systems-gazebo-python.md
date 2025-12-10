---
sidebar_position: 19
---

# Implementing Control Systems in Gazebo with Python

## Learning Objectives

By the end of this lesson, you will be able to:
- Implement various control systems for humanoid robots in Gazebo
- Design PID controllers for joint position and velocity control
- Create high-level motion planning and control architectures
- Integrate sensor feedback into control systems
- Validate control system performance in simulation

## Overview

Control systems are the brain of Physical AI and humanoid robotics, translating high-level goals into precise actuator commands. This lesson covers the implementation of various control strategies in Python, from basic PID controllers to advanced humanoid control architectures, specifically designed for Gazebo simulation environments.

## Control System Architecture

### Hierarchical Control Structure

For humanoid robots, we typically implement a hierarchical control structure:

1. **Trajectory Planning Level**: Generate desired trajectories for different body parts
2. **High-Level Control**: Convert goals into reference trajectories
3. **Low-Level Control**: Execute precise joint control to follow trajectories
4. **Actuator Level**: Interface with physical or simulated actuators

### Control Types for Humanoid Robots

- **Joint Space Control**: Direct control of individual joint positions/velocities
- **Operational Space Control**: Control of end-effector positions and orientations
- **Whole-Body Control**: Coordinated control of all degrees of freedom
- **Balance Control**: Center of mass and zero moment point (ZMP) control

## Python/ROS 2 Code Example - PID Joint Controller

Here's a comprehensive example of a PID-based joint controller:

```python
#!/usr/bin/env python3

import rclpy
from rclpy.node import Node
from sensor_msgs.msg import JointState
from std_msgs.msg import Float64MultiArray
from geometry_msgs.msg import Twist
from builtin_interfaces.msg import Time
import numpy as np
import math
from collections import deque

class PIDController:
    """
    Generic PID Controller for joint control
    """
    def __init__(self, kp=1.0, ki=0.0, kd=0.0, output_limits=(-float('inf'), float('inf'))):
        self.kp = kp
        self.ki = ki
        self.kd = kd
        self.output_limits = output_limits

        self._proportional = 0.0
        self._integral = 0.0
        self._derivative = 0.0

        self._last_error = 0.0
        self._last_time = None

    def compute(self, setpoint, measurement, dt=None):
        """
        Compute PID output
        """
        current_time = Time()

        if dt is None:
            if self._last_time is None:
                return 0.0  # First call, return 0
            dt = (current_time.sec - self._last_time.sec) + \
                 (current_time.nanosec - self._last_time.nanosec) / 1e9
        else:
            if dt <= 0:
                return 0.0

        error = setpoint - measurement

        # Proportional term
        self._proportional = self.kp * error

        # Integral term
        self._integral += self.ki * error * dt
        # Clamp integral to prevent windup
        self._integral = np.clip(self._integral,
                                self.output_limits[0],
                                self.output_limits[1])

        # Derivative term
        if dt > 0:
            self._derivative = self.kd * (error - self._last_error) / dt
        else:
            self._derivative = 0.0

        # Compute output
        output = self._proportional + self._integral + self._derivative

        # Clamp output
        output = np.clip(output, self.output_limits[0], self.output_limits[1])

        # Store values for next iteration
        self._last_error = error
        self._last_time = current_time

        return output

class HumanoidController(Node):
    """
    Humanoid robot controller with multiple control strategies
    """
    def __init__(self):
        super().__init__('humanoid_controller')

        # Joint names for our humanoid model
        self.joint_names = [
            'left_shoulder_joint', 'left_elbow_joint',
            'right_shoulder_joint', 'right_elbow_joint',
            'left_hip_joint', 'left_knee_joint',
            'right_hip_joint', 'right_knee_joint'
        ]

        # Initialize PID controllers for each joint
        self.pid_controllers = {}
        for joint_name in self.joint_names:
            # Different PID parameters for different joint types
            if 'hip' in joint_name or 'knee' in joint_name:
                # Leg joints need more aggressive control
                self.pid_controllers[joint_name] = PIDController(
                    kp=100.0, ki=10.0, kd=5.0, output_limits=(-100.0, 100.0)
                )
            else:
                # Arm joints can be more gentle
                self.pid_controllers[joint_name] = PIDController(
                    kp=50.0, ki=5.0, kd=2.0, output_limits=(-50.0, 50.0)
                )

        # Current joint states
        self.current_positions = {name: 0.0 for name in self.joint_names}
        self.current_velocities = {name: 0.0 for name in self.joint_names}
        self.current_efforts = {name: 0.0 for name in self.joint_names}

        # Desired positions (trajectory)
        self.desired_positions = {name: 0.0 for name in self.joint_names}
        self.desired_velocities = {name: 0.0 for name in self.joint_names}

        # Publishers for joint commands
        self.joint_cmd_publishers = {}
        for joint_name in self.joint_names:
            self.joint_cmd_publishers[joint_name] = self.create_publisher(
                Float64MultiArray, f'/joint_group_position_controller/commands', 10)

        # Subscriber for joint states
        self.joint_state_sub = self.create_subscription(
            JointState, '/joint_states', self.joint_state_callback, 10)

        # Subscriber for high-level commands
        self.cmd_vel_sub = self.create_subscription(
            Twist, '/cmd_vel', self.cmd_vel_callback, 10)

        # Timer for control loop
        self.control_timer = self.create_timer(0.01, self.control_loop)  # 100Hz

        # Walking state machine
        self.walking_state = 'stand'  # stand, walk, turn
        self.walk_phase = 0.0
        self.walk_frequency = 1.0  # Hz

        # Balance controller
        self.balance_controller = BalanceController()

        self.get_logger().info('Humanoid Controller initialized')

    def joint_state_callback(self, msg):
        """
        Update current joint states
        """
        for i, name in enumerate(msg.name):
            if name in self.current_positions:
                if i < len(msg.position):
                    self.current_positions[name] = msg.position[i]
                if i < len(msg.velocity):
                    self.current_velocities[name] = msg.velocity[i]
                if i < len(msg.effort):
                    self.current_efforts[name] = msg.effort[i]

    def cmd_vel_callback(self, msg):
        """
        Handle high-level velocity commands
        """
        linear_x = msg.linear.x
        angular_z = msg.angular.z

        if abs(linear_x) > 0.01 or abs(angular_z) > 0.01:
            self.walking_state = 'walk'
        else:
            self.walking_state = 'stand'

    def control_loop(self):
        """
        Main control loop
        """
        # Update walking pattern based on state
        self.update_walking_pattern()

        # Compute balance corrections
        balance_corrections = self.balance_controller.compute_balance_correction(
            self.current_positions, self.current_velocities)

        # Compute PID control for each joint
        joint_commands = []
        for joint_name in self.joint_names:
            current_pos = self.current_positions[joint_name]
            desired_pos = self.desired_positions[joint_name]

            # Add balance correction
            if joint_name in balance_corrections:
                desired_pos += balance_corrections[joint_name]

            # Compute PID output
            dt = 0.01  # 100Hz control loop
            effort = self.pid_controllers[joint_name].compute(
                desired_pos, current_pos, dt)

            joint_commands.append(effort)

        # Publish joint commands
        cmd_msg = Float64MultiArray()
        cmd_msg.data = joint_commands
        for publisher in self.joint_cmd_publishers.values():
            publisher.publish(cmd_msg)

    def update_walking_pattern(self):
        """
        Update desired joint positions based on walking pattern
        """
        self.walk_phase += 2 * math.pi * self.walk_frequency * 0.01  # 0.01s dt

        if self.walking_state == 'walk':
            # Walking gait pattern
            left_swing = math.sin(self.walk_phase)
            right_swing = math.sin(self.walk_phase + math.pi)

            # Hip joints - alternating swing motion
            self.desired_positions['left_hip_joint'] = 0.2 * left_swing
            self.desired_positions['right_hip_joint'] = 0.2 * right_swing

            # Knee joints - phase with hip for natural walking
            self.desired_positions['left_knee_joint'] = -0.4 * abs(left_swing)
            self.desired_positions['right_knee_joint'] = -0.4 * abs(right_swing)

            # Arm joints - counterbalance to walking motion
            self.desired_positions['left_shoulder_joint'] = 0.1 * right_swing
            self.desired_positions['right_shoulder_joint'] = 0.1 * left_swing
            self.desired_positions['left_elbow_joint'] = 0.3 + 0.1 * left_swing
            self.desired_positions['right_elbow_joint'] = 0.3 + 0.1 * right_swing
        else:
            # Standing position
            for joint_name in self.desired_positions:
                self.desired_positions[joint_name] = 0.0

class BalanceController:
    """
    Simple balance controller to maintain humanoid stability
    """
    def __init__(self):
        self.ankle_kp = 50.0
        self.ankle_kd = 10.0
        self.hip_kp = 30.0
        self.hip_kd = 5.0

    def compute_balance_correction(self, current_positions, current_velocities):
        """
        Compute balance corrections based on joint positions
        This is a simplified approach - real balance control is much more complex
        """
        corrections = {}

        # Simple balance - adjust hip joints if leaning
        # In a real system, we'd use IMU data and more sophisticated models
        left_hip_pos = current_positions.get('left_hip_joint', 0.0)
        right_hip_pos = current_positions.get('right_hip_joint', 0.0)

        # If robot is tilting to one side, adjust opposite hip
        tilt_diff = left_hip_pos - right_hip_pos
        if abs(tilt_diff) > 0.1:  # Threshold for balance correction
            corrections['left_hip_joint'] = -self.hip_kp * tilt_diff * 0.1
            corrections['right_hip_joint'] = self.hip_kp * tilt_diff * 0.1

        return corrections

def main(args=None):
    rclpy.init(args=args)

    controller = HumanoidController()

    try:
        rclpy.spin(controller)
    except KeyboardInterrupt:
        pass
    finally:
        controller.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()
```

## Advanced Control Strategies

### Operational Space Control

Operational space control allows direct control of end-effector positions and orientations:

```python
#!/usr/bin/env python3

import numpy as np
from scipy.spatial.transform import Rotation as R

class OperationalSpaceController:
    """
    Operational Space Controller for end-effector control
    """
    def __init__(self, robot_model):
        self.robot_model = robot_model
        self.kp_pos = 10.0  # Position gain
        self.kd_pos = 2.0   # Position damping
        self.kp_rot = 5.0   # Orientation gain
        self.kd_rot = 1.0   # Orientation damping

    def compute_task_space_control(self, target_pose, current_pose,
                                 target_twist, current_twist):
        """
        Compute operational space control
        """
        # Position error
        pos_error = target_pose[:3] - current_pose[:3]

        # Orientation error (using rotation vector representation)
        current_rot = R.from_matrix(current_pose[3:].reshape(3,3))
        target_rot = R.from_matrix(target_pose[3:].reshape(3,3))
        rot_error = (target_rot * current_rot.inv()).as_rotvec()

        # Compute desired accelerations
        pos_acc_des = self.kp_pos * pos_error - self.kd_pos * (current_twist[:3] - target_twist[:3])
        rot_acc_des = self.kp_rot * rot_error - self.kd_rot * (current_twist[3:] - target_twist[3:])

        # Compute Jacobian inverse to map task space to joint space
        jacobian = self.robot_model.compute_jacobian()
        jacobian_pinv = np.linalg.pinv(jacobian)

        # Combine position and orientation accelerations
        task_acc = np.hstack([pos_acc_des, rot_acc_des])

        # Convert to joint space
        joint_acc_des = jacobian_pinv @ task_acc

        return joint_acc_des
```

### Whole-Body Control Framework

For complex humanoid control, we can implement a whole-body control framework:

```python
#!/usr/bin/env python3

class WholeBodyController:
    """
    Whole-body controller that coordinates all robot joints
    """
    def __init__(self):
        self.tasks = {}  # Dictionary of control tasks
        self.weights = {}  # Task weights for prioritization

    def add_task(self, task_name, task_function, weight=1.0):
        """
        Add a control task (e.g., balance, manipulation, locomotion)
        """
        self.tasks[task_name] = task_function
        self.weights[task_name] = weight

    def compute_control(self, robot_state):
        """
        Compute whole-body control by combining all tasks
        """
        # Initialize joint accelerations
        joint_acc = np.zeros(robot_state.n_joints)

        # Compute each task
        for task_name, task_func in self.tasks.items():
            task_acc = task_func(robot_state)
            weight = self.weights[task_name]

            # Weighted combination of tasks
            joint_acc += weight * task_acc

        return joint_acc
```

## Hardware Context

### RTX Workstation Considerations

For complex control system simulation on RTX Workstations:

- **High-Frequency Control**: Support for 1kHz+ control loops for precise actuation
- **Complex Dynamics**: Accurate simulation of whole-body dynamics
- **Real-time Performance**: Ensure control loops meet timing requirements
- **Multi-threading**: Parallel execution of different control components

### Jetson Orin Kit Considerations

For edge-based control implementation:

- **Control Rate Optimization**: Balance control frequency with computational load
- **Simplified Models**: Reduced complexity for real-time performance
- **Robust Control**: Focus on stability over optimality
- **Thermal Management**: Monitor CPU/GPU temperature during control execution

## Implementation Exercise

1. Create a controller configuration file:
   ```bash
   mkdir -p ~/ros2_ws/src/gazebo_simulation_examples/config
   ```

2. Create a PID configuration file:
   ```yaml
   # Save as ~/ros2_ws/src/gazebo_simulation_examples/config/humanoid_controllers.yaml
   controller_manager:
     ros__parameters:
       update_rate: 100  # Hz

   joint_group_position_controller:
     ros__parameters:
       type: position_controllers/JointGroupPositionController
       joints:
         - left_shoulder_joint
         - left_elbow_joint
         - right_shoulder_joint
         - right_elbow_joint
         - left_hip_joint
         - left_knee_joint
         - right_hip_joint
         - right_knee_joint
   ```

3. Create a launch file for the controller:
   ```python
   # Save as ~/ros2_ws/src/gazebo_simulation_examples/launch/control_system.launch.py
   from launch import LaunchDescription
   from launch.actions import IncludeLaunchDescription, RegisterEventHandler
   from launch.launch_description_sources import PythonLaunchDescriptionSource
   from launch.substitutions import PathJoinSubstitution
   from launch_ros.actions import Node, ComposableNodeContainer
   from launch_ros.descriptions import ComposableNode
   from launch_ros.substitutions import FindPackageShare
   from launch.event_handlers import OnProcessExit
   from launch.actions import ExecuteProcess

   def generate_launch_description():
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

       # Launch controller manager
       controller_manager = Node(
           package='controller_manager',
           executable='ros2_control_node',
           parameters=[
               PathJoinSubstitution([
                   FindPackageShare('gazebo_simulation_examples'),
                   'config',
                   'humanoid_controllers.yaml'
               ])
           ],
           remappings=[
               ('~/robot_description', '/robot_description')
           ]
       )

       # Launch the humanoid controller node
       humanoid_controller = Node(
           package='gazebo_simulation_examples',
           executable='humanoid_controller',
           name='humanoid_controller',
           output='screen'
       )

       return LaunchDescription([
           gazebo,
           robot_state_publisher,
           controller_manager,
           humanoid_controller
       ])
   ```

4. Build and test the control system:
   ```bash
   cd ~/ros2_ws
   colcon build --packages-select gazebo_simulation_examples
   source install/setup.bash

   # Launch the control system
   ros2 launch gazebo_simulation_examples control_system.launch.py
   ```

5. Test the control system by sending commands:
   ```bash
   # Send a velocity command to make the robot walk
   ros2 topic pub /cmd_vel geometry_msgs/Twist '{linear: {x: 0.5, y: 0.0, z: 0.0}, angular: {x: 0.0, y: 0.0, z: 0.1}}'
   ```

## Troubleshooting

- **Instability**: Reduce PID gains or check for sensor noise
- **Oscillation**: Increase damping or reduce control frequency
- **Poor Tracking**: Increase gains or check mechanical constraints
- **High CPU Usage**: Optimize control algorithms or reduce update rates

## Summary

This lesson covered the implementation of control systems for humanoid robots in Gazebo simulation, from basic PID control to advanced whole-body control strategies. Proper control system design is crucial for effective Physical AI and humanoid robotics applications.

## Next Steps

In the next lesson, we'll explore advanced physics simulation with GPU acceleration, focusing on how to leverage GPU computing for more complex and realistic simulation scenarios.