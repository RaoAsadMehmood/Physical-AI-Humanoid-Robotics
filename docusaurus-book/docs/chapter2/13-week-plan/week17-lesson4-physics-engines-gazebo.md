---
sidebar_position: 17
---

# Physics Engines and Accuracy in Gazebo Simulation

## Learning Objectives

By the end of this lesson, you will be able to:
- Understand different physics engines available in Gazebo
- Configure physics parameters for accurate humanoid robot simulation
- Tune collision detection and response parameters
- Optimize physics performance for real-time simulation
- Evaluate simulation accuracy versus computational cost trade-offs

## Overview

Physics simulation accuracy is crucial for effective Digital Twin functionality in Physical AI and humanoid robotics. This lesson explores the physics engines available in Gazebo, their characteristics, and how to configure them for optimal balance between accuracy and performance in humanoid robot simulation scenarios.

## Physics Engine Options in Gazebo

### Open Dynamics Engine (ODE)
- **Pros**: Fast, stable, well-tested in robotics applications
- **Cons**: Less accurate for complex contact scenarios
- **Best for**: Real-time simulation, basic contact scenarios
- **Use case**: Initial development and testing of humanoid locomotion

### Bullet Physics
- **Pros**: More accurate contact simulation, better for complex interactions
- **Cons**: Slower than ODE, potential stability issues with complex models
- **Best for**: Detailed contact simulation, grasping scenarios
- **Use case**: Manipulation tasks and complex interaction scenarios

### DART (Dynamic Animation and Robotics Toolkit)
- **Pros**: Advanced contact modeling, stable, supports complex constraints
- **Cons**: Higher computational overhead
- **Best for**: High-fidelity simulation, complex robotic systems
- **Use case**: Validation of complex humanoid behaviors

## Physics Configuration Parameters

### Global Physics Settings

Gazebo physics parameters are typically configured in world files or simulation launch parameters. Here's an example configuration:

```xml
<!-- Example world file with physics configuration -->
<sdf version="1.7">
  <world name="humanoid_world">
    <!-- Physics engine configuration -->
    <physics type="ode">
      <max_step_size>0.001</max_step_size>
      <real_time_factor>1.0</real_time_factor>
      <real_time_update_rate>1000.0</real_time_update_rate>
      <gravity>0 0 -9.8</gravity>

      <!-- ODE-specific parameters -->
      <ode>
        <solver>
          <type>quick</type>
          <iters>10</iters>
          <sor>1.3</sor>
        </solver>
        <constraints>
          <cfm>0.0</cfm>
          <erp>0.2</erp>
          <contact_max_correcting_vel>100.0</contact_max_correcting_vel>
          <contact_surface_layer>0.001</contact_surface_layer>
        </constraints>
      </ode>
    </physics>

    <!-- World entities (models, lights, etc.) go here -->
  </world>
</sdf>
```

### Key Parameters Explained

- **max_step_size**: Simulation time step size (smaller = more accurate but slower)
- **real_time_factor**: Target simulation speed relative to real time (1.0 = real-time)
- **real_time_update_rate**: Updates per second (1/dt where dt is time step)
- **solver iterations**: Number of iterations for constraint solving (more = stable but slower)
- **CFM (Constraint Force Mixing)**: Softness of constraints (0 = hard, higher = softer)
- **ERP (Error Reduction Parameter)**: How quickly constraint errors are corrected

## Python/ROS 2 Code Example - Physics Parameter Tuning

Here's a Python example that demonstrates how to monitor and adjust physics parameters during simulation:

```python
#!/usr/bin/env python3

import rclpy
from rclpy.node import Node
from std_msgs.msg import Float64
from sensor_msgs.msg import JointState
from gazebo_msgs.srv import SetPhysicsProperties, GetPhysicsProperties
from gazebo_msgs.msg import LinkStates
import time
import math

class PhysicsTuner(Node):
    """
    Physics parameter tuning and monitoring for Gazebo simulation
    Demonstrates how to adjust physics parameters for optimal humanoid simulation
    """

    def __init__(self):
        super().__init__('physics_tuner')

        # Publishers for joint commands
        self.joint_cmd_publishers = {}
        for joint_name in ['left_hip_joint', 'right_hip_joint', 'left_knee_joint', 'right_knee_joint']:
            self.joint_cmd_publishers[joint_name] = self.create_publisher(
                Float64, f'/cmd_{joint_name}', 10)

        # Subscribers
        self.joint_state_sub = self.create_subscription(
            JointState, '/joint_states', self.joint_state_callback, 10)

        self.link_states_sub = self.create_subscription(
            LinkStates, '/gazebo/link_states', self.link_states_callback, 10)

        # Services for physics control
        self.get_physics_client = self.create_client(
            GetPhysicsProperties, '/gazebo/get_physics_properties')
        self.set_physics_client = self.create_client(
            SetPhysicsProperties, '/gazebo/set_physics_properties')

        # Timers
        self.physics_monitor_timer = self.create_timer(5.0, self.monitor_physics_performance)
        self.walking_controller_timer = self.create_timer(0.02, self.walking_controller)

        # Physics performance metrics
        self.performance_data = {
            'real_time_factor': 1.0,
            'sim_time': 0.0,
            'real_time': 0.0,
            'last_update': self.get_clock().now()
        }

        # Walking controller state
        self.walking_phase = 0.0
        self.walking_frequency = 0.5  # Hz

        self.get_logger().info('Physics Tuner initialized')

    def joint_state_callback(self, msg):
        """
        Monitor joint states for physics stability
        """
        # Check for unusual joint velocities (indicating instability)
        for i, name in enumerate(msg.name):
            if 'hip' in name or 'knee' in name:
                velocity = msg.velocity[i]
                if abs(velocity) > 10.0:  # Unusually high velocity
                    self.get_logger().warn(f'High velocity detected on {name}: {velocity}')

    def link_states_callback(self, msg):
        """
        Monitor link states for physics accuracy
        """
        # Monitor base link for stability
        try:
            base_idx = msg.name.index('humanoid_robot::base_link')
            base_pos = msg.pose[base_idx].position
            base_vel = msg.twist[base_idx].linear

            # Check for unrealistic positions or velocities
            if abs(base_pos.z) < 0.1:  # Robot fell through ground
                self.get_logger().warn(f'Robot may have fallen through ground: z={base_pos.z}')

            if math.sqrt(base_vel.x**2 + base_vel.y**2 + base_vel.z**2) > 5.0:
                self.get_logger().warn(f'High base velocity detected: {math.sqrt(base_vel.x**2 + base_vel.y**2 + base_vel.z**2)}')
        except ValueError:
            pass  # Robot not found in link states

    def monitor_physics_performance(self):
        """
        Monitor physics performance and adjust parameters if needed
        """
        # Call get physics properties service
        while not self.get_physics_client.wait_for_service(timeout_sec=1.0):
            self.get_logger().info('Physics service not available, waiting again...')

        future = self.get_physics_client.call_async(GetPhysicsProperties.Request())
        future.add_done_callback(self.physics_properties_callback)

    def physics_properties_callback(self, future):
        """
        Process physics properties response
        """
        try:
            response = future.result()
            current_rtf = response.time_step.data / (1.0 / response.max_update_rate.data)

            self.get_logger().info(f'Current RTF: {response.time_step.data * response.max_update_rate.data:.2f}')
            self.get_logger().info(f'Time step: {response.time_step.data:.4f}s')
            self.get_logger().info(f'Max update rate: {response.max_update_rate.data:.1f}Hz')

            # If RTF is too low, consider adjusting parameters
            if response.time_step.data * response.max_update_rate.data < 0.5:
                self.get_logger().warn('Physics performance below threshold, consider tuning parameters')

        except Exception as e:
            self.get_logger().error(f'Service call failed: {e}')

    def walking_controller(self):
        """
        Simple walking controller to test physics parameters
        """
        self.walking_phase += 2 * math.pi * self.walking_frequency * 0.02  # 0.02s timer period

        # Generate walking pattern commands
        left_hip_cmd = Float64()
        left_hip_cmd.data = 0.2 * math.sin(self.walking_phase)

        right_hip_cmd = Float64()
        right_hip_cmd.data = 0.2 * math.sin(self.walking_phase + math.pi)  # Opposite phase

        left_knee_cmd = Float64()
        left_knee_cmd.data = 0.1 * math.sin(self.walking_phase * 2)

        right_knee_cmd = Float64()
        right_knee_cmd.data = 0.1 * math.sin(self.walking_phase * 2 + math.pi)

        # Publish commands
        self.joint_cmd_publishers['left_hip_joint'].publish(left_hip_cmd)
        self.joint_cmd_publishers['right_hip_joint'].publish(right_hip_cmd)
        self.joint_cmd_publishers['left_knee_joint'].publish(left_knee_cmd)
        self.joint_cmd_publishers['right_knee_joint'].publish(right_knee_cmd)

    def adjust_physics_parameters(self, time_step, max_update_rate, solver_iterations):
        """
        Adjust physics parameters for optimal performance
        """
        while not self.set_physics_client.wait_for_service(timeout_sec=1.0):
            self.get_logger().info('Set physics service not available, waiting again...')

        request = SetPhysicsProperties.Request()
        request.time_step = time_step
        request.max_update_rate = max_update_rate
        request.gravity = [0.0, 0.0, -9.8]

        # ODE-specific parameters
        request.ode_config.sor_pgs_precon_iters = 0
        request.ode_config.sor_pgs_iters = solver_iterations
        request.ode_config.sor_pgs_w = 1.3
        request.ode_config.ode_surface_layer = 0.001
        request.ode_config.ode_friction_model = 0  # pyramid model
        request.ode_config.contact_surface_layer = 0.001
        request.ode_config.contact_max_correcting_vel = 100.0

        future = self.set_physics_client.call_async(request)
        future.add_done_callback(self.physics_set_callback)

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

def main(args=None):
    rclpy.init(args=args)

    physics_tuner = PhysicsTuner()

    # Initial physics parameter adjustment
    time_step = Float64()
    time_step.data = 0.001  # 1ms time step for accuracy
    physics_tuner.adjust_physics_parameters(time_step, 1000.0, 50)

    try:
        rclpy.spin(physics_tuner)
    except KeyboardInterrupt:
        pass
    finally:
        physics_tuner.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()
```

## Physics Accuracy Considerations for Humanoid Robots

### Mass and Inertia Properties
For accurate humanoid simulation:
- Ensure all links have realistic mass properties
- Verify center of mass is correctly positioned
- Use accurate inertia tensors (diagonal values should follow I = m*r² relationships)

### Contact Parameters
For stable humanoid locomotion:
- Set appropriate ERP and CFM values
- Configure contact layers for different surface types
- Adjust friction coefficients for realistic walking

### Joint Limit Parameters
For realistic humanoid movement:
- Set appropriate position, velocity, and effort limits
- Configure soft limits to prevent harsh impacts
- Tune damping and stiffness for natural movement

## Hardware Context

### RTX Workstation Optimization

For physics-intensive humanoid simulation on RTX Workstations:

- **Time Step**: Use smaller time steps (0.5-1ms) for higher accuracy
- **Solver Iterations**: Increase to 50-100 for stable contact simulation
- **Parallel Processing**: Utilize multi-core CPUs effectively
- **GPU Acceleration**: Some physics computations can leverage GPU acceleration

### Jetson Orin Kit Considerations

For edge-based physics simulation:

- **Time Step**: Use larger time steps (2-5ms) to maintain performance
- **Solver Iterations**: Reduce to 10-20 to maintain real-time performance
- **Model Simplification**: Use simplified collision geometry
- **Performance Monitoring**: Continuously monitor CPU usage and thermal conditions

## Implementation Exercise

1. Create a physics configuration file:
   ```bash
   mkdir -p ~/ros2_ws/src/gazebo_simulation_examples/worlds
   ```

2. Create a world file with different physics configurations:
   ```xml
   <!-- Save as ~/ros2_ws/src/gazebo_simulation_examples/worlds/physics_comparison.world -->
   <?xml version="1.0" ?>
   <sdf version="1.7">
     <world name="physics_comparison">
       <!-- Physics engine configuration -->
       <physics type="ode">
         <max_step_size>0.001</max_step_size>
         <real_time_factor>1.0</real_time_factor>
         <real_time_update_rate>1000.0</real_time_update_rate>
         <gravity>0 0 -9.8</gravity>

         <ode>
           <solver>
             <type>quick</type>
             <iters>50</iters>
             <sor>1.3</sor>
           </solver>
           <constraints>
             <cfm>0.0</cfm>
             <erp>0.2</erp>
             <contact_max_correcting_vel>100.0</contact_max_correcting_vel>
             <contact_surface_layer>0.001</contact_surface_layer>
           </constraints>
         </ode>
       </physics>

       <!-- Ground plane -->
       <include>
         <uri>model://ground_plane</uri>
       </include>

       <!-- Lighting -->
       <include>
         <uri>model://sun</uri>
       </include>
     </world>
   </sdf>
   ```

3. Create a launch file for physics testing:
   ```python
   # Save as ~/ros2_ws/src/gazebo_simulation_examples/launch/physics_test.launch.py
   from launch import LaunchDescription
   from launch.actions import IncludeLaunchDescription
   from launch.launch_description_sources import PythonLaunchDescriptionSource
   from launch.substitutions import PathJoinSubstitution
   from launch_ros.actions import Node
   from launch_ros.substitutions import FindPackageShare

   def generate_launch_description():
       # Launch Gazebo with physics test world
       gazebo = IncludeLaunchDescription(
           PythonLaunchDescriptionSource([
               PathJoinSubstitution([
                   FindPackageShare('gazebo_ros'),
                   'launch',
                   'empty_world.launch.py'
               ])
           ]),
           launch_arguments={
               'world': PathJoinSubstitution([
                   FindPackageShare('gazebo_simulation_examples'),
                   'worlds',
                   'physics_comparison.world'
               ])
           }.items()
       )

       # Launch physics tuner node
       physics_tuner = Node(
           package='gazebo_simulation_examples',
           executable='physics_tuner',
           name='physics_tuner',
           output='screen'
       )

       # Launch robot state publisher
       robot_state_publisher = Node(
           package='robot_state_publisher',
           executable='robot_state_publisher',
           name='robot_state_publisher',
           parameters=[{'use_sim_time': True}]
       )

       return LaunchDescription([
           gazebo,
           robot_state_publisher,
           physics_tuner
       ])
   ```

4. Build and test the physics configuration:
   ```bash
   cd ~/ros2_ws
   colcon build --packages-select gazebo_simulation_examples
   source install/setup.bash

   # Launch the physics test environment
   ros2 launch gazebo_simulation_examples physics_test.launch.py
   ```

## Troubleshooting

- **Simulation Instability**: Increase solver iterations or reduce time step
- **Low Performance**: Decrease solver iterations or increase time step
- **Penetration Issues**: Adjust ERP and CFM values
- **Oscillation**: Reduce controller gains or adjust contact parameters

## Summary

This lesson covered the critical aspects of physics engine configuration for accurate Gazebo simulation of humanoid robots. Proper physics parameters are essential for realistic behavior and reliable sim-to-real transfer.

## Next Steps

In the next lesson, we'll explore sensor integration in Gazebo simulation environments, including camera, LIDAR, IMU, and other sensors crucial for Physical AI and humanoid robotics applications.