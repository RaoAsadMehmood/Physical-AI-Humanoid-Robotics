---
sidebar_position: 21
---

# Multi-Robot Simulation in Gazebo Environment

## Learning Objectives

By the end of this lesson, you will be able to:
- Deploy multiple robots in a shared Gazebo simulation environment
- Implement inter-robot communication and coordination
- Design distributed control architectures for multi-robot systems
- Handle resource management and collision avoidance in multi-robot scenarios
- Evaluate multi-robot system performance and scalability

## Overview

Multi-robot simulation is essential for developing coordinated Physical AI and humanoid robotics systems. This lesson covers the deployment, communication, and coordination of multiple robots in Gazebo, focusing on scalable architectures that can handle complex multi-agent scenarios.

## Multi-Robot Architecture Patterns

### Centralized Coordination
- **Single Coordinator**: One entity manages all robots
- **Pros**: Simplified coordination, global optimization
- **Cons**: Single point of failure, communication bottleneck
- **Use Case**: Small teams with tight coordination requirements

### Distributed Coordination
- **Peer-to-Peer**: Robots coordinate directly with each other
- **Pros**: Scalable, fault-tolerant, decentralized
- **Cons**: Complex coordination algorithms, potential conflicts
- **Use Case**: Large teams, autonomous operation

### Hybrid Architecture
- **Combination**: Mix of centralized and distributed elements
- **Pros**: Balance between coordination and scalability
- **Cons**: Complex system design and maintenance
- **Use Case**: Medium to large teams with varying coordination needs

## Python/ROS 2 Code Example - Multi-Robot Coordinator

Here's a comprehensive example of a multi-robot system with coordination:

```python
#!/usr/bin/env python3

import rclpy
from rclpy.node import Node
from std_msgs.msg import String, Float64
from geometry_msgs.msg import Twist, Pose, Point
from sensor_msgs.msg import LaserScan
from nav_msgs.msg import Odometry
from visualization_msgs.msg import Marker, MarkerArray
from tf2_ros import TransformListener, Buffer
import math
import numpy as np
from collections import defaultdict
import threading
import time

class RobotAgent:
    """
    Represents a single robot in the multi-robot system
    """
    def __init__(self, robot_id, namespace):
        self.robot_id = robot_id
        self.namespace = namespace
        self.pose = Pose()
        self.velocity = Twist()
        self.scan_data = None
        self.last_update = time.time()
        self.status = 'idle'  # idle, moving, exploring, following, etc.
        self.target = None
        self.neighbors = {}  # Other robots in communication range

class MultiRobotCoordinator(Node):
    """
    Coordinates multiple robots in Gazebo simulation
    Implements distributed coordination with centralized monitoring
    """
    def __init__(self):
        super().__init__('multi_robot_coordinator')

        # Robot management
        self.robots = {}
        self.robot_namespaces = [
            '/robot1', '/robot2', '/robot3', '/robot4'
        ]

        # Initialize robot agents
        for i, namespace in enumerate(self.robot_namespaces):
            self.robots[f'robot{i+1}'] = RobotAgent(f'robot{i+1}', namespace)

        # Communication range for neighbor detection
        self.communication_range = 10.0  # meters

        # Publishers and subscribers
        self.cmd_vel_pubs = {}
        self.odom_subs = {}
        self.scan_subs = {}

        # Set up communication with each robot
        for robot_id, robot in self.robots.items():
            # Command publishers
            self.cmd_vel_pubs[robot_id] = self.create_publisher(
                Twist, f'{robot.namespace}/cmd_vel', 10)

            # Data subscribers
            self.odom_subs[robot_id] = self.create_subscription(
                Odometry, f'{robot.namespace}/odom',
                lambda msg, r=robot_id: self.odom_callback(msg, r), 10)

            self.scan_subs[robot_id] = self.create_subscription(
                LaserScan, f'{robot.namespace}/scan',
                lambda msg, r=robot_id: self.scan_callback(msg, r), 10)

        # Visualization publisher
        self.viz_pub = self.create_publisher(MarkerArray, '/multi_robot_viz', 10)

        # Task assignment publisher
        self.task_pub = self.create_publisher(String, '/task_assignments', 10)

        # Timers
        self.coordination_timer = self.create_timer(0.5, self.coordination_loop)
        self.visualization_timer = self.create_timer(0.1, self.publish_visualization)

        # Task management
        self.tasks = []
        self.assigned_tasks = {}  # robot_id -> task_id

        # Coordination strategy
        self.coordination_strategy = 'formation'  # 'formation', 'exploration', 'task_allocation'

        self.get_logger().info('Multi-Robot Coordinator initialized')

    def odom_callback(self, msg, robot_id):
        """
        Update robot pose from odometry
        """
        if robot_id in self.robots:
            robot = self.robots[robot_id]
            robot.pose = msg.pose.pose
            robot.velocity = msg.twist.twist
            robot.last_update = time.time()

            # Update neighbor relationships based on positions
            self.update_neighbors(robot_id)

    def scan_callback(self, msg, robot_id):
        """
        Process laser scan data from robot
        """
        if robot_id in self.robots:
            self.robots[robot_id].scan_data = msg

    def update_neighbors(self, robot_id):
        """
        Update neighbor list for a robot based on communication range
        """
        robot = self.robots[robot_id]
        robot_pos = np.array([robot.pose.position.x, robot.pose.position.y])

        neighbors = {}
        for other_id, other_robot in self.robots.items():
            if other_id != robot_id:
                other_pos = np.array([other_robot.pose.position.x, other_robot.pose.position.y])
                distance = np.linalg.norm(robot_pos - other_pos)

                if distance <= self.communication_range:
                    neighbors[other_id] = {
                        'distance': distance,
                        'position': other_pos,
                        'status': other_robot.status
                    }

        self.robots[robot_id].neighbors = neighbors

    def coordination_loop(self):
        """
        Main coordination loop
        """
        if self.coordination_strategy == 'formation':
            self.maintain_formation()
        elif self.coordination_strategy == 'exploration':
            self.coordinate_exploration()
        elif self.coordination_strategy == 'task_allocation':
            self.allocate_tasks()

        # Monitor robot health and status
        self.monitor_robot_status()

    def maintain_formation(self):
        """
        Maintain geometric formation among robots
        """
        # Define formation pattern (e.g., square formation)
        formation_positions = [
            np.array([-1.0, 1.0]),   # robot1
            np.array([1.0, 1.0]),    # robot2
            np.array([1.0, -1.0]),   # robot3
            np.array([-1.0, -1.0])   # robot4
        ]

        # Get leader robot (first robot)
        leader_id = list(self.robots.keys())[0]
        leader_pos = np.array([
            self.robots[leader_id].pose.position.x,
            self.robots[leader_id].pose.position.y
        ])

        # Calculate desired positions for each robot
        for i, robot_id in enumerate(self.robots.keys()):
            if robot_id == leader_id:
                continue  # Leader doesn't follow formation

            desired_pos = leader_pos + formation_positions[i]
            current_pos = np.array([
                self.robots[robot_id].pose.position.x,
                self.robots[robot_id].pose.position.y
            ])

            # Calculate movement vector
            move_vector = desired_pos - current_pos
            distance = np.linalg.norm(move_vector)

            if distance > 0.5:  # Only move if significantly off target
                # Normalize and scale to reasonable speed
                direction = move_vector / distance
                speed = min(0.5, distance)  # Slower when closer to target

                cmd_vel = Twist()
                cmd_vel.linear.x = speed * direction[0]
                cmd_vel.linear.y = speed * direction[1]
                cmd_vel.angular.z = 0.0  # No rotation for this simple example

                self.cmd_vel_pubs[robot_id].publish(cmd_vel)

    def coordinate_exploration(self):
        """
        Coordinate exploration among multiple robots
        """
        # Simple exploration: assign different quadrants to different robots
        world_center = np.array([0.0, 0.0])

        for i, robot_id in enumerate(self.robots.keys()):
            robot = self.robots[robot_id]
            current_pos = np.array([
                robot.pose.position.x,
                robot.pose.position.y
            ])

            # Assign exploration quadrant based on robot index
            angle_offset = (2 * math.pi * i) / len(self.robots)
            exploration_direction = np.array([
                math.cos(angle_offset),
                math.sin(angle_offset)
            ])

            # Move in assigned direction
            cmd_vel = Twist()
            cmd_vel.linear.x = 0.3 * exploration_direction[0]
            cmd_vel.linear.y = 0.3 * exploration_direction[1]
            cmd_vel.angular.z = 0.1  # Gentle rotation for sensor coverage

            self.cmd_vel_pubs[robot_id].publish(cmd_vel)

    def allocate_tasks(self):
        """
        Allocate tasks among robots based on capabilities and proximity
        """
        # Simple task allocation based on distance
        available_tasks = [task for task in self.tasks if task['assigned_to'] is None]

        for robot_id in self.robots.keys():
            if robot_id in self.assigned_tasks:
                continue  # Already has a task

            # Find closest available task
            robot_pos = np.array([
                self.robots[robot_id].pose.position.x,
                self.robots[robot_id].pose.position.y
            ])

            closest_task = None
            min_distance = float('inf')

            for task in available_tasks:
                task_pos = np.array([task['x'], task['y']])
                distance = np.linalg.norm(robot_pos - task_pos)

                if distance < min_distance:
                    min_distance = distance
                    closest_task = task

            if closest_task:
                # Assign task to robot
                closest_task['assigned_to'] = robot_id
                self.assigned_tasks[robot_id] = closest_task['id']

                # Send task command to robot
                task_msg = String()
                task_msg.data = f"task_to_{closest_task['x']}_{closest_task['y']}"
                self.task_pub.publish(task_msg)

    def monitor_robot_status(self):
        """
        Monitor robot health and status
        """
        for robot_id, robot in self.robots.items():
            # Check for communication timeout
            if time.time() - robot.last_update > 5.0:  # 5 seconds
                self.get_logger().warn(f'Robot {robot_id} communication timeout')

            # Check for stuck robots
            if robot.velocity.linear.x < 0.01 and robot.velocity.linear.y < 0.01:
                # Robot might be stuck - implement recovery
                pass

    def publish_visualization(self):
        """
        Publish visualization markers for multi-robot system
        """
        marker_array = MarkerArray()

        # Create markers for each robot
        for i, (robot_id, robot) in enumerate(self.robots.items()):
            # Robot marker
            robot_marker = Marker()
            robot_marker.header.frame_id = "map"
            robot_marker.header.stamp = self.get_clock().now().to_msg()
            robot_marker.ns = "robots"
            robot_marker.id = i
            robot_marker.type = Marker.SPHERE
            robot_marker.action = Marker.ADD

            robot_marker.pose.position = robot.pose.position
            robot_marker.pose.orientation = robot.pose.orientation
            robot_marker.scale.x = 0.3
            robot_marker.scale.y = 0.3
            robot_marker.scale.z = 0.3

            # Color based on status
            if robot.status == 'moving':
                robot_marker.color.r = 0.0
                robot_marker.color.g = 1.0
                robot_marker.color.b = 0.0
            elif robot.status == 'idle':
                robot_marker.color.r = 1.0
                robot_marker.color.g = 1.0
                robot_marker.color.b = 0.0
            else:
                robot_marker.color.r = 1.0
                robot_marker.color.g = 0.0
                robot_marker.color.b = 0.0

            robot_marker.color.a = 1.0
            marker_array.markers.append(robot_marker)

            # Communication links
            for neighbor_id, neighbor_info in robot.neighbors.items():
                link_marker = Marker()
                link_marker.header.frame_id = "map"
                link_marker.header.stamp = self.get_clock().now().to_msg()
                link_marker.ns = "communication_links"
                link_marker.id = len(marker_array.markers)
                link_marker.type = Marker.LINE_STRIP
                link_marker.action = Marker.ADD

                # Line from current robot to neighbor
                p1 = Point()
                p1.x = robot.pose.position.x
                p1.y = robot.pose.position.y
                p1.z = 0.1

                p2 = Point()
                p2.x = neighbor_info['position'][0]
                p2.y = neighbor_info['position'][1]
                p2.z = 0.1

                link_marker.points = [p1, p2]
                link_marker.scale.x = 0.05
                link_marker.color.r = 0.5
                link_marker.color.g = 0.5
                link_marker.color.b = 1.0
                link_marker.color.a = 0.5

                marker_array.markers.append(link_marker)

        self.viz_pub.publish(marker_array)

class MultiRobotAgent(Node):
    """
    Individual robot agent that participates in multi-robot coordination
    """
    def __init__(self, robot_namespace):
        super().__init__(f'{robot_namespace}_agent')

        self.namespace = robot_namespace
        self.pose = Pose()
        self.scan_data = None
        self.status = 'idle'
        self.target = None

        # Subscribers
        self.odom_sub = self.create_subscription(
            Odometry, f'{robot_namespace}/odom', self.odom_callback, 10)

        self.scan_sub = self.create_subscription(
            LaserScan, f'{robot_namespace}/scan', self.scan_callback, 10)

        self.task_sub = self.create_subscription(
            String, '/task_assignments', self.task_callback, 10)

        # Publishers
        self.cmd_vel_pub = self.create_publisher(Twist, f'{robot_namespace}/cmd_vel', 10)

        # Timer for local decision making
        self.local_control_timer = self.create_timer(0.1, self.local_control_loop)

        self.get_logger().info(f'Multi-Robot Agent {robot_namespace} initialized')

    def odom_callback(self, msg):
        """
        Update robot pose
        """
        self.pose = msg.pose.pose

    def scan_callback(self, msg):
        """
        Process laser scan data
        """
        self.scan_data = msg

    def task_callback(self, msg):
        """
        Handle task assignments
        """
        task_data = msg.data
        if task_data.startswith('task_to_'):
            # Parse task coordinates
            parts = task_data.split('_')
            if len(parts) >= 4:
                try:
                    target_x = float(parts[2])
                    target_y = float(parts[3])
                    self.target = np.array([target_x, target_y])
                    self.status = 'moving'
                except ValueError:
                    pass

    def local_control_loop(self):
        """
        Local control decisions for individual robot
        """
        if self.status == 'moving' and self.target is not None:
            self.navigate_to_target()
        elif self.scan_data is not None:
            self.avoid_obstacles()

    def navigate_to_target(self):
        """
        Navigate to assigned target with obstacle avoidance
        """
        current_pos = np.array([self.pose.position.x, self.pose.position.y])
        direction_to_target = self.target - current_pos
        distance_to_target = np.linalg.norm(direction_to_target)

        if distance_to_target < 0.5:  # Reached target
            self.status = 'idle'
            self.target = None
            cmd_vel = Twist()
            cmd_vel.linear.x = 0.0
            cmd_vel.angular.z = 0.0
        else:
            # Normalize direction and set speed
            direction = direction_to_target / distance_to_target
            speed = min(0.5, distance_to_target)  # Slower when closer

            cmd_vel = Twist()
            cmd_vel.linear.x = speed * direction[0]
            cmd_vel.linear.y = speed * direction[1]

            # Add obstacle avoidance
            if self.scan_data:
                min_distance = min(self.scan_data.ranges) if self.scan_data.ranges else float('inf')
                if min_distance < 1.0:
                    # Emergency obstacle avoidance
                    cmd_vel.linear.x *= 0.3  # Slow down
                    cmd_vel.angular.z = 0.5  # Turn away from obstacle

        self.cmd_vel_pub.publish(cmd_vel)

    def avoid_obstacles(self):
        """
        Local obstacle avoidance behavior
        """
        if not self.scan_data or len(self.scan_data.ranges) == 0:
            return

        # Simple obstacle avoidance using laser scan
        front_ranges = self.scan_data.ranges[330:30] + self.scan_data.ranges[330:360]  # Wrap around
        min_front_dist = min(front_ranges) if front_ranges else float('inf')

        cmd_vel = Twist()

        if min_front_dist < 1.0:
            # Turn to avoid obstacle
            cmd_vel.linear.x = 0.1  # Move slowly
            cmd_vel.angular.z = 0.5  # Turn right
        else:
            # Move forward
            cmd_vel.linear.x = 0.3
            cmd_vel.angular.z = 0.0

        self.cmd_vel_pub.publish(cmd_vel)

def main(args=None):
    rclpy.init(args=args)

    # Create nodes
    coordinator = MultiRobotCoordinator()

    # Create agents for each robot
    agents = []
    for namespace in ['/robot1', '/robot2', '/robot3', '/robot4']:
        agent = MultiRobotAgent(namespace)
        agents.append(agent)

    # Create executor to handle all nodes
    executor = rclpy.executors.MultiThreadedExecutor()
    executor.add_node(coordinator)
    for agent in agents:
        executor.add_node(agent)

    try:
        executor.spin()
    except KeyboardInterrupt:
        pass
    finally:
        coordinator.destroy_node()
        for agent in agents:
            agent.destroy_node()
        executor.shutdown()
        rclpy.shutdown()

if __name__ == '__main__':
    main()
```

## Formation Control Strategies

### Leader-Follower Formation

```python
#!/usr/bin/env python3

import numpy as np

class LeaderFollowerFormation:
    """
    Implements leader-follower formation control
    """
    def __init__(self, leader_id, follower_ids, formation_pattern):
        self.leader_id = leader_id
        self.follower_ids = follower_ids
        self.formation_pattern = formation_pattern  # Desired relative positions
        self.kp = 2.0  # Proportional gain
        self.kd = 1.0  # Derivative gain

    def compute_follower_commands(self, robot_states):
        """
        Compute commands for all followers to maintain formation
        """
        commands = {}

        leader_state = robot_states[self.leader_id]
        leader_pos = np.array([leader_state['x'], leader_state['y']])
        leader_vel = np.array([leader_state['vx'], leader_state['vy']])

        for i, follower_id in enumerate(self.follower_ids):
            if follower_id in robot_states:
                follower_state = robot_states[follower_id]
                follower_pos = np.array([follower_state['x'], follower_state['y']])
                follower_vel = np.array([follower_state['vx'], follower_state['vy']])

                # Desired position relative to leader
                desired_rel_pos = self.formation_pattern[i]
                desired_pos = leader_pos + desired_rel_pos

                # Formation error
                pos_error = desired_pos - follower_pos
                vel_error = -follower_vel  # Want to match leader's velocity

                # Control law
                cmd_vel = self.kp * pos_error + self.kd * vel_error

                commands[follower_id] = {
                    'linear_x': cmd_vel[0],
                    'linear_y': cmd_vel[1],
                    'angular_z': 0.0
                }

        return commands
```

### Behavior-Based Coordination

```python
#!/usr/bin/env python3

class BehaviorBasedCoordinator:
    """
    Implements behavior-based multi-robot coordination
    """
    def __init__(self):
        self.behaviors = {
            'avoid_collisions': self.avoid_collisions,
            'follow_leader': self.follow_leader,
            'maintain_distance': self.maintain_distance,
            'explore_area': self.explore_area
        }

    def coordinate_robots(self, robot_states, environment_info):
        """
        Coordinate robots using behavior-based approach
        """
        commands = {}

        for robot_id, state in robot_states.items():
            # Evaluate each behavior
            behavior_weights = {}
            for behavior_name, behavior_func in self.behaviors.items():
                behavior_weights[behavior_name] = behavior_func(robot_id, state, robot_states, environment_info)

            # Select behavior with highest weight
            selected_behavior = max(behavior_weights, key=behavior_weights.get)
            command = self.execute_behavior(selected_behavior, robot_id, state, environment_info)
            commands[robot_id] = command

        return commands

    def avoid_collisions(self, robot_id, state, all_states, env_info):
        """
        Collision avoidance behavior
        """
        # Higher weight if collision is imminent
        min_distance = float('inf')
        for other_id, other_state in all_states.items():
            if other_id != robot_id:
                distance = np.linalg.norm(
                    np.array([state['x'], state['y']]) -
                    np.array([other_state['x'], other_state['y']])
                )
                min_distance = min(min_distance, distance)

        if min_distance < 2.0:  # Collision threshold
            return 10.0  # High priority
        else:
            return 0.1  # Low priority

    def follow_leader(self, robot_id, state, all_states, env_info):
        """
        Follow leader behavior
        """
        # Implementation would follow designated leader
        return 5.0  # Medium priority
```

## Hardware Context

### RTX Workstation Considerations

For multi-robot simulation on RTX Workstations:

- **Physics Scaling**: Physics performance degrades with more robots; optimize per-robot complexity
- **Memory Requirements**: Each robot requires memory for models, sensors, and state
- **CPU Core Utilization**: Multi-threaded simulation benefits from more CPU cores
- **GPU Acceleration**: Ray tracing and rendering benefit from GPU acceleration

### Jetson Orin Kit Considerations

For edge-based multi-robot simulation:

- **Robot Count**: Limit number of simultaneous robots based on computational capacity
- **Simplified Models**: Use simplified robot models and physics
- **Reduced Update Rates**: Lower sensor and control update rates
- **Distributed Simulation**: Consider distributing simulation across multiple devices

## Implementation Exercise

1. Create a multi-robot world file:
   ```bash
   mkdir -p ~/ros2_ws/src/gazebo_simulation_examples/worlds
   ```

2. Create a multi-robot world:
   ```xml
   <!-- Save as ~/ros2_ws/src/gazebo_simulation_examples/worlds/multi_robot_world.world -->
   <?xml version="1.0" ?>
   <sdf version="1.7">
     <world name="multi_robot_world">
       <!-- Physics engine -->
       <physics type="ode">
         <max_step_size>0.001</max_step_size>
         <real_time_factor>1.0</real_time_factor>
         <real_time_update_rate>1000.0</real_time_update_rate>
         <gravity>0 0 -9.8</gravity>
       </physics>

       <!-- Ground plane -->
       <include>
         <uri>model://ground_plane</uri>
       </include>

       <!-- Lighting -->
       <include>
         <uri>model://sun</uri>
       </include>

       <!-- Add obstacles for realistic environment -->
       <model name="obstacle1">
         <pose>5 0 0 0 0 0</pose>
         <link name="link">
           <collision name="collision">
             <geometry>
               <box>
                 <size>1 1 2</size>
               </box>
             </geometry>
           </collision>
           <visual name="visual">
             <geometry>
               <box>
                 <size>1 1 2</size>
               </box>
             </geometry>
             <material>
               <ambient>0.5 0.5 0.5 1</ambient>
               <diffuse>0.5 0.5 0.5 1</diffuse>
             </material>
           </visual>
           <inertial>
             <mass>1.0</mass>
             <inertia>
               <ixx>1</ixx>
               <ixy>0</ixy>
               <ixz>0</ixz>
               <iyy>1</iyy>
               <iyz>0</iyz>
               <izz>1</izz>
             </inertia>
           </inertial>
         </link>
       </model>

       <model name="obstacle2">
         <pose>-5 3 0 0 0 0</pose>
         <link name="link">
           <collision name="collision">
             <geometry>
               <cylinder>
                 <radius>1</radius>
                 <length>2</length>
               </cylinder>
             </geometry>
           </collision>
           <visual name="visual">
             <geometry>
               <cylinder>
                 <radius>1</radius>
                 <length>2</length>
               </cylinder>
             </geometry>
             <material>
               <ambient>0.8 0.3 0.3 1</ambient>
               <diffuse>0.8 0.3 0.3 1</diffuse>
             </material>
           </visual>
           <inertial>
             <mass>1.0</mass>
             <inertia>
               <ixx>1</ixx>
               <ixy>0</ixy>
               <ixz>0</ixz>
               <iyy>1</iyy>
               <iyz>0</iyz>
               <izz>1</izz>
             </inertia>
           </inertial>
         </link>
       </model>
     </world>
   </sdf>
   ```

3. Create a multi-robot launch file:
   ```python
   # Save as ~/ros2_ws/src/gazebo_simulation_examples/launch/multi_robot.launch.py
   from launch import LaunchDescription
   from launch.actions import IncludeLaunchDescription, GroupAction
   from launch.launch_description_sources import PythonLaunchDescriptionSource
   from launch.substitutions import PathJoinSubstitution
   from launch_ros.actions import Node, PushRosNamespace
   from launch_ros.substitutions import FindPackageShare

   def generate_launch_description():
       # Launch Gazebo with multi-robot world
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
                   'multi_robot_world.world'
               ])
           }.items()
       )

       # Launch multi-robot coordinator
       coordinator = Node(
           package='gazebo_simulation_examples',
           executable='multi_robot_coordinator',
           name='multi_robot_coordinator',
           output='screen'
       )

       # Launch individual robot agents
       robot_groups = []
       for i in range(1, 5):  # 4 robots
           robot_group = GroupAction(
               actions=[
                   PushRosNamespace(f'robot{i}'),
                   Node(
                       package='gazebo_simulation_examples',
                       executable='multi_robot_agent',
                       name=f'robot{i}_agent',
                       parameters=[{'robot_namespace': f'/robot{i}'}],
                       output='screen'
                   )
               ]
           )
           robot_groups.append(robot_group)

       return LaunchDescription([
           gazebo,
           coordinator
       ] + robot_groups)
   ```

4. Build and test the multi-robot system:
   ```bash
   cd ~/ros2_ws
   colcon build --packages-select gazebo_simulation_examples
   source install/setup.bash

   # Launch the multi-robot simulation
   ros2 launch gazebo_simulation_examples multi_robot.launch.py
   ```

## Troubleshooting

- **Performance Degradation**: Reduce robot count or simplify models when adding more robots
- **Communication Issues**: Verify namespace separation and topic remapping
- **Collision Problems**: Increase communication range or adjust coordination algorithms
- **Synchronization Issues**: Ensure proper timing and state consistency across robots

## Summary

This lesson covered multi-robot simulation in Gazebo, including coordination strategies, communication patterns, and implementation of distributed control systems. Multi-robot systems are crucial for advanced Physical AI and humanoid robotics applications where collaboration is required.

## Next Steps

In the next lesson, we'll explore simulation testing and validation techniques, focusing on how to verify and validate the behavior of Physical AI and humanoid robotics systems in simulation before deployment.