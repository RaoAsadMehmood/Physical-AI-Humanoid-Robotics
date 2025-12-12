---
sidebar_position: 7
prev:
  title: Week 5, Lesson 5 - Practical ROS 2 Package Building with Python
  url: /docs/chapter1/week-plan/week5-lesson5-ros2-package-building
next:
  title: Week 7, Lesson 7 - ROS 2 Launch Systems and Complex Node Management
  url: /docs/chapter1/week-plan/week7-lesson7-ros2-launch-systems
---

# Week 6: ROS 2 Actions and Advanced Services

## Learning Objectives
By the end of this lesson, you will understand:
- Advanced ROS 2 service concepts and implementation
- ROS 2 actions for long-running tasks
- When to use actions vs services vs topics
- Implementation patterns for robust communication

## Introduction to ROS 2 Actions

ROS 2 actions provide a more robust communication pattern for long-running tasks that may take significant time to complete. Unlike services which provide a simple request-response pattern, actions include feedback and goal preemption capabilities.

### Key Differences Between Topics, Services, and Actions

- **Topics**: Asynchronous, continuous data flow for streaming data
- **Services**: Synchronous request-response for quick operations
- **Actions**: Asynchronous with feedback for long-running tasks with progress updates

### Action Structure

An action consists of three message types:
1. **Goal**: Request sent to the action server
2. **Feedback**: Progress updates sent during execution
3. **Result**: Final outcome of the action

## Python Implementation Example

Let's implement an action server for a humanoid robot navigation task:

```python
import rclpy
from rclpy.action import ActionServer, GoalResponse, CancelResponse
from rclpy.node import Node
from rclpy.executors import MultiThreadedExecutor
import time

# Assuming we have the NavigateToPose action from nav2_msgs
# In practice, you'd generate this from .action files
class NavigateToPoseActionServer(Node):
    def __init__(self):
        super().__init__('navigate_to_pose_action_server')
        self._action_server = ActionServer(
            self,
            NavigateToPose,
            'navigate_to_pose',
            execute_callback=self.execute_callback,
            goal_callback=self.goal_callback,
            cancel_callback=self.cancel_callback
        )

    def goal_callback(self, goal_request):
        """Accept or reject a goal."""
        self.get_logger().info('Received goal request')
        # Validate goal parameters
        if goal_request.pose.position.x < -100.0 or goal_request.pose.position.x > 100.0:
            return GoalResponse.REJECT
        return GoalResponse.ACCEPT

    def cancel_callback(self, goal_handle):
        """Accept or reject a cancel request."""
        self.get_logger().info('Received cancel request')
        return CancelResponse.ACCEPT

    def execute_callback(self, goal_handle):
        """Execute the goal."""
        self.get_logger().info('Executing goal...')

        # Get goal parameters
        target_pose = goal_handle.request.pose
        tolerance = goal_handle.request.tolerance

        # Simulate navigation progress
        feedback_msg = NavigateToPose.Feedback()
        result = NavigateToPose.Result()

        # Simulate movement with feedback
        for i in range(10):
            if goal_handle.is_cancel_requested:
                goal_handle.canceled()
                self.get_logger().info('Goal canceled')
                result.error_code = -1
                return result

            # Simulate progress
            feedback_msg.current_pose = target_pose  # Simplified
            feedback_msg.distance_remaining = 10.0 - i
            goal_handle.publish_feedback(feedback_msg)

            time.sleep(1)  # Simulate work

        # Check if goal was successful
        if not goal_handle.is_cancel_requested:
            goal_handle.succeed()
            result.result = True
            self.get_logger().info('Goal succeeded!')
        else:
            result.error_code = -1

        return result

def main(args=None):
    rclpy.init(args=args)
    action_server = NavigateToPoseActionServer()

    executor = MultiThreadedExecutor()
    executor.add_node(action_server)

    try:
        executor.spin()
    except KeyboardInterrupt:
        pass
    finally:
        action_server.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()
```

## Action Client Example

Here's how to create an action client to interact with the action server:

```python
import rclpy
from rclpy.action import ActionClient
from rclpy.node import Node
import time

class NavigateToPoseActionClient(Node):
    def __init__(self):
        super().__init__('navigate_to_pose_action_client')
        self._action_client = ActionClient(
            self,
            NavigateToPose,
            'navigate_to_pose'
        )

    def send_goal(self, pose, tolerance=0.5):
        """Send a navigation goal to the action server."""
        # Wait for the action server to be available
        self._action_client.wait_for_server()

        # Create the goal
        goal_msg = NavigateToPose.Goal()
        goal_msg.pose = pose
        goal_msg.tolerance = tolerance

        # Send the goal
        self._send_goal_future = self._action_client.send_goal_async(
            goal_msg,
            feedback_callback=self.feedback_callback
        )

        self._send_goal_future.add_done_callback(self.goal_response_callback)

    def goal_response_callback(self, future):
        """Handle the goal response."""
        goal_handle = future.result()
        if not goal_handle.accepted:
            self.get_logger().info('Goal rejected')
            return

        self.get_logger().info('Goal accepted')
        self._get_result_future = goal_handle.get_result_async()
        self._get_result_future.add_done_callback(self.get_result_callback)

    def feedback_callback(self, feedback_msg):
        """Handle feedback from the action server."""
        feedback = feedback_msg.feedback
        self.get_logger().info(
            f'Feedback: Distance remaining: {feedback.distance_remaining}'
        )

    def get_result_callback(self, future):
        """Handle the final result."""
        result = future.result().result
        self.get_logger().info(f'Result: {result.result}')

def main(args=None):
    rclpy.init(args=args)
    action_client = NavigateToPoseActionClient()

    # Create a target pose
    target_pose = PoseStamped()
    target_pose.header.frame_id = 'map'
    target_pose.pose.position.x = 1.0
    target_pose.pose.position.y = 1.0
    target_pose.pose.orientation.w = 1.0

    # Send the goal
    action_client.send_goal(target_pose.pose)

    # Spin to process callbacks
    rclpy.spin(action_client)
    action_client.destroy_node()
    rclpy.shutdown()

if __name__ == '__main__':
    main()
```

## Best Practices for Action Implementation

1. **Goal Validation**: Always validate goal parameters in the goal callback
2. **Feedback Frequency**: Provide regular feedback without overwhelming the system
3. **Cancellation Handling**: Properly handle cancellation requests
4. **Error Handling**: Return appropriate error codes in results
5. **Resource Management**: Clean up resources when goals are cancelled

## Hardware Context: RTX Workstation & Jetson Orin

For the RTX Workstation and Jetson Orin platforms:
- The RTX Workstation can handle complex path planning algorithms for navigation actions
- The Jetson Orin can run lightweight navigation actions for edge robotics applications
- Use GPU acceleration for sensor data processing in action feedback loops

## Summary

Actions provide a robust communication pattern for long-running tasks with progress feedback. They're essential for tasks like navigation, manipulation, and calibration in humanoid robotics systems.

## Exercises

1. Implement a manipulation action for a humanoid robot arm
2. Create a calibration action with progress feedback
3. Add timeout handling to your action server