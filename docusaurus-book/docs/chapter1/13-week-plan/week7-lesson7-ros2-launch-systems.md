---
sidebar_position: 7
---

# Week 7: ROS 2 Launch Systems and System Management

## Learning Objectives
By the end of this lesson, you will understand:
- ROS 2 launch system for managing complex robot systems
- Launch file creation in Python and XML
- Parameter management and configuration
- Process monitoring and system orchestration
- Best practices for production robotics systems

## Introduction to ROS 2 Launch System

The ROS 2 launch system provides a powerful framework for starting and managing multiple nodes simultaneously. This is crucial for humanoid robotics where multiple subsystems need to be coordinated.

### Why Use Launch Files?

- **System Management**: Start multiple nodes with a single command
- **Parameter Configuration**: Set parameters for all nodes in one place
- **Process Monitoring**: Monitor and restart nodes if they fail
- **Conditional Execution**: Start nodes based on conditions
- **Cross-Platform**: Works on different operating systems

## Python Launch Files

Python launch files provide the most flexibility and power for complex system management:

```python
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, IncludeLaunchDescription
from launch.actions import RegisterEventHandler, TimerAction
from launch.conditions import IfCondition
from launch.event_handlers import OnProcessExit, OnProcessStart
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch.substitutions import LaunchConfiguration, PathJoinSubstitution
from launch_ros.actions import Node, ComposableNodeContainer
from launch_ros.descriptions import ComposableNode
from launch_ros.substitutions import FindPackageShare

def generate_launch_description():
    # Declare launch arguments
    use_sim_time = LaunchConfiguration('use_sim_time')
    robot_namespace = LaunchConfiguration('robot_namespace')

    declare_use_sim_time_arg = DeclareLaunchArgument(
        'use_sim_time',
        default_value='false',
        description='Use simulation (Gazebo) clock if true'
    )

    declare_robot_namespace_arg = DeclareLaunchArgument(
        'robot_namespace',
        default_value='',
        description='Namespace for robot nodes'
    )

    # Create a navigation node
    nav_node = Node(
        package='nav2_bringup',
        executable='nav2',
        name='navigator',
        namespace=robot_namespace,
        parameters=[
            PathJoinSubstitution([
                FindPackageShare('my_robot_bringup'),
                'params',
                'nav2_params.yaml'
            ]),
            {'use_sim_time': use_sim_time}
        ],
        output='screen'
    )

    # Create a sensor processing node
    sensor_node = Node(
        package='my_robot_perception',
        executable='sensor_processor',
        name='sensor_processor',
        namespace=robot_namespace,
        parameters=[
            {'use_sim_time': use_sim_time},
            {'sensor_topic': '/camera/rgb/image_raw'}
        ],
        output='screen'
    )

    # Event handler for process monitoring
    def on_process_exit(event):
        print(f"Process {event.process_name} exited with code {event.return_code}")

    # Register event handlers
    sensor_exit_handler = RegisterEventHandler(
        OnProcessExit(
            target_action=sensor_node,
            on_exit=on_process_exit
        )
    )

    # Create the launch description
    ld = LaunchDescription()

    # Add launch arguments
    ld.add_action(declare_use_sim_time_arg)
    ld.add_action(declare_robot_namespace_arg)

    # Add nodes
    ld.add_action(nav_node)
    ld.add_action(sensor_node)

    # Add event handlers
    ld.add_action(sensor_exit_handler)

    return ld
```

## Launch File Parameters

Parameters can be managed in several ways:

```python
# In your launch file
from launch.actions import SetEnvironmentVariable
from launch.substitutions import TextSubstitution

# Set environment variables
set_env_var = SetEnvironmentVariable(
    name='ROS_DOMAIN_ID',
    value=TextSubstitution(text='1')
)

# Use parameter files
param_file = PathJoinSubstitution([
    FindPackageShare('my_robot_config'),
    'config',
    'robot_params.yaml'
])

# Node with parameter file
robot_controller = Node(
    package='my_robot_control',
    executable='controller',
    name='robot_controller',
    parameters=[param_file, {'use_sim_time': use_sim_time}],
    output='screen'
)
```

## Composable Nodes (Components)

For better performance, use composable nodes that run in the same process:

```python
# Composable node container
composable_container = ComposableNodeContainer(
    name='robot_perception_container',
    namespace=robot_namespace,
    package='rclcpp_components',
    executable='component_container_mt',  # Multi-threaded container
    composable_node_descriptions=[
        ComposableNode(
            package='image_proc',
            plugin='image_proc::RectifyNode',
            name='rectify_node',
            parameters=[{'use_sim_time': use_sim_time}]
        ),
        ComposableNode(
            package='vision_opencv',
            plugin='cv_bridge::CvBridgeNode',
            name='cv_bridge_node',
            parameters=[{'use_sim_time': use_sim_time}]
        )
    ],
    output='screen'
)
```

## Conditional Launch

Launch nodes based on conditions:

```python
from launch.conditions import IfCondition, UnlessCondition

# Launch file with conditional nodes
def generate_launch_description():
    use_camera = LaunchConfiguration('use_camera')

    camera_node = Node(
        package='usb_cam',
        executable='usb_cam_node_exe',
        name='camera',
        condition=IfCondition(use_camera)
    )

    dummy_camera_node = Node(
        package='v4l2_camera',
        executable='v4l2_camera_node',
        name='dummy_camera',
        condition=UnlessCondition(use_camera)
    )

    ld = LaunchDescription()
    ld.add_action(DeclareLaunchArgument(
        'use_camera',
        default_value='true',
        description='Use real camera or dummy'
    ))
    ld.add_action(camera_node)
    ld.add_action(dummy_camera_node)

    return ld
```

## Hardware Context: RTX Workstation & Jetson Orin

For the RTX Workstation and Jetson Orin platforms:

### RTX Workstation Launch Configuration
```python
# High-performance configuration for RTX Workstation
rtx_launch_config = Node(
    package='my_robot_ai',
    executable='ai_processor',
    name='ai_processor',
    parameters=[
        {'gpu_enabled': True},
        {'max_workers': 8},
        {'use_gpu_inference': True}
    ],
    respawn=True,  # Restart if it crashes
    respawn_delay=5.0
)
```

### Jetson Orin Launch Configuration
```python
# Optimized for Jetson Orin's capabilities
jetson_launch_config = Node(
    package='my_robot_control',
    executable='jetson_controller',
    name='jetson_controller',
    parameters=[
        {'cpu_affinity': [2, 3]},  # Pin to specific CPU cores
        {'gpu_memory_fraction': 0.7},
        {'realtime_priority': 80}
    ],
    respawn=True
)
```

## Launch File Best Practices

1. **Modularity**: Break large launch files into smaller, reusable components
2. **Parameters**: Use launch arguments for configurable parameters
3. **Namespacing**: Use namespaces to organize multiple robots
4. **Error Handling**: Implement proper error handling and logging
5. **Documentation**: Document all launch arguments and their purposes

## System Monitoring with Launch

Monitor system health and restart components as needed:

```python
from launch.actions import LogInfo
from launch_ros.actions import LifecycleNode

# Lifecycle node with monitoring
lifecycle_node = LifecycleNode(
    name='lifecycle_node',
    namespace=robot_namespace,
    package='my_robot_lifecycle',
    executable='lifecycle_node_exe',
    parameters=[{'use_sim_time': use_sim_time}],
    output='screen'
)

# Log system status
status_logger = LogInfo(
    msg=['System started with namespace: ', robot_namespace]
)
```

## Summary

The ROS 2 launch system is essential for managing complex humanoid robotics systems. It provides the infrastructure needed to start, configure, and monitor multiple nodes simultaneously while maintaining system reliability.

## Exercises

1. Create a launch file for a humanoid robot with navigation, perception, and control nodes
2. Implement conditional launching based on robot type (simulated vs real)
3. Add system monitoring and auto-restart functionality to your launch file
4. Create separate launch files for different operational modes (calibration, normal operation, etc.)