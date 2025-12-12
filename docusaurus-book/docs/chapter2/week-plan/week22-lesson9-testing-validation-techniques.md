---
sidebar_position: 10
prev:
  title: Week 21, Lesson 8 - Multi-Robot Simulation in Gazebo
  url: /docs/chapter2/13-week-plan/week21-lesson8-multi-robot-simulation-gazebo
next:
  title: Week 23, Lesson 10 - Sim-to-Real Transfer Techniques
  url: /docs/chapter2/13-week-plan/week23-lesson10-sim-to-real-transfer
---

# Simulation Testing and Validation Techniques

## Learning Objectives

By the end of this lesson, you will be able to:
- Design comprehensive test suites for simulation environments
- Implement automated validation frameworks for Physical AI systems
- Validate simulation accuracy against real-world benchmarks
- Create performance and stress tests for simulation systems
- Establish confidence metrics for simulation fidelity

## Overview

Simulation testing and validation is critical for ensuring that Gazebo-based Digital Twin environments accurately represent real-world Physical AI and humanoid robotics systems. This lesson covers systematic approaches to validate simulation accuracy, performance, and reliability before deployment.

## Types of Simulation Validation

### Verification vs. Validation vs. Accreditation (VV&A)
- **Verification**: "Are we building the model right?" - Does the simulation match its specification?
- **Validation**: "Are we building the right model?" - Does the simulation represent the real system?
- **Accreditation**: "Are we confident enough to use the model?" - Formal acceptance of the model for specific purposes

### Model Validation Approaches

#### 1. Face Validity
- Expert review of simulation behavior
- Qualitative assessment of realism
- Intuitive correctness evaluation

#### 2. Construct Validity
- Verification that the simulation captures the right concepts
- Assessment of underlying theories and assumptions
- Comparison with established models

#### 3. Predictive Validity
- Ability to predict real-world outcomes
- Historical validation using past data
- Future prediction accuracy assessment

## Python/ROS 2 Code Example - Simulation Validation Framework

Here's a comprehensive example of a simulation validation framework:

```python
#!/usr/bin/env python3

import rclpy
from rclpy.node import Node
from std_msgs.msg import Float64, Bool, String
from geometry_msgs.msg import Pose, Twist, Vector3
from sensor_msgs.msg import LaserScan, Imu, JointState
from nav_msgs.msg import Odometry
from visualization_msgs.msg import Marker, MarkerArray
from builtin_interfaces.msg import Time
import numpy as np
import math
import time
import statistics
from dataclasses import dataclass
from typing import Dict, List, Tuple
import json
import os

@dataclass
class ValidationMetric:
    """
    Data structure for validation metrics
    """
    name: str
    value: float
    expected_range: Tuple[float, float]
    timestamp: Time
    passed: bool = False

class SimulationValidator(Node):
    """
    Comprehensive simulation validation framework
    """
    def __init__(self):
        super().__init__('simulation_validator')

        # Validation parameters
        self.validation_metrics = {}
        self.test_results = {}
        self.baseline_data = {}
        self.confidence_threshold = 0.95

        # Publishers for validation results
        self.validation_status_pub = self.create_publisher(Bool, '/validation_status', 10)
        self.validation_metrics_pub = self.create_publisher(String, '/validation_metrics', 10)
        self.validation_report_pub = self.create_publisher(MarkerArray, '/validation_report', 10)

        # Subscribers for simulation data
        self.odom_sub = self.create_subscription(Odometry, '/odom', self.odom_callback, 10)
        self.joint_state_sub = self.create_subscription(JointState, '/joint_states', self.joint_state_callback, 10)
        self.imu_sub = self.create_subscription(Imu, '/imu', self.imu_callback, 10)
        self.scan_sub = self.create_subscription(LaserScan, '/scan', self.scan_callback, 10)

        # Timer for validation checks
        self.validation_timer = self.create_timer(1.0, self.run_validation_checks)
        self.reporting_timer = self.create_timer(5.0, self.publish_validation_report)

        # Performance tracking
        self.performance_metrics = {
            'real_time_factor': [],
            'update_rate': [],
            'cpu_usage': [],
            'memory_usage': []
        }

        # Validation state
        self.current_data = {
            'pose': None,
            'twist': None,
            'joint_states': None,
            'imu_data': None,
            'scan_data': None
        }

        # Test cases
        self.test_cases = [
            self.test_kinematic_accuracy,
            self.test_dynamic_response,
            self.test_sensor_fidelity,
            self.test_stability,
            self.test_performance
        ]

        self.get_logger().info('Simulation Validator initialized')

    def odom_callback(self, msg):
        """
        Update pose and twist data for validation
        """
        self.current_data['pose'] = msg.pose.pose
        self.current_data['twist'] = msg.twist.twist

    def joint_state_callback(self, msg):
        """
        Update joint state data for validation
        """
        self.current_data['joint_states'] = msg

    def imu_callback(self, msg):
        """
        Update IMU data for validation
        """
        self.current_data['imu_data'] = msg

    def scan_callback(self, msg):
        """
        Update scan data for validation
        """
        self.current_data['scan_data'] = msg

    def run_validation_checks(self):
        """
        Run all validation tests
        """
        results = {}

        for test_func in self.test_cases:
            try:
                test_name = test_func.__name__
                result = test_func()
                results[test_name] = result
            except Exception as e:
                self.get_logger().error(f'Validation test {test_func.__name__} failed: {e}')
                results[test_func.__name__] = {'passed': False, 'error': str(e)}

        self.test_results = results
        self.evaluate_overall_validation()

    def test_kinematic_accuracy(self):
        """
        Test kinematic accuracy by comparing expected vs actual positions
        """
        if not self.current_data['pose']:
            return {'passed': False, 'reason': 'No pose data available'}

        # For this example, we'll check if the robot is moving as expected
        # In a real scenario, we'd compare with expected trajectories
        position = self.current_data['pose'].position
        expected_position = self.get_expected_position()

        distance_error = math.sqrt(
            (position.x - expected_position[0])**2 +
            (position.y - expected_position[1])**2 +
            (position.z - expected_position[2])**2
        )

        # Define acceptable error threshold (0.1m)
        max_error = 0.1
        passed = distance_error <= max_error

        return {
            'passed': passed,
            'metric': distance_error,
            'threshold': max_error,
            'description': f'Kinematic accuracy: {distance_error:.3f}m error'
        }

    def get_expected_position(self):
        """
        Calculate expected position based on control inputs
        This is a simplified example - in reality, this would be more complex
        """
        # For demonstration, assume a simple motion model
        # In practice, this would come from the control system or trajectory planner
        current_time = time.time()
        # Simple circular motion for testing
        radius = 2.0
        angular_freq = 0.1  # rad/s
        phase = angular_freq * current_time

        expected_x = radius * math.cos(phase)
        expected_y = radius * math.sin(phase)
        expected_z = 0.0

        return (expected_x, expected_y, expected_z)

    def test_dynamic_response(self):
        """
        Test dynamic response by analyzing acceleration and force data
        """
        if not self.current_data['imu_data']:
            return {'passed': False, 'reason': 'No IMU data available'}

        imu = self.current_data['imu_data']
        linear_acc = imu.linear_acceleration

        # Calculate magnitude of acceleration
        acc_magnitude = math.sqrt(
            linear_acc.x**2 + linear_acc.y**2 + linear_acc.z**2
        )

        # For a static robot, acceleration should be close to gravity (9.8 m/s²)
        # For a moving robot, check if acceleration is within expected bounds
        expected_static = 9.8
        tolerance = 2.0  # Allow for some movement

        if self.is_robot_static():
            expected_acc = expected_static
        else:
            # If robot is moving, allow higher acceleration
            expected_acc = expected_static + 5.0

        passed = abs(acc_magnitude - expected_static) <= tolerance

        return {
            'passed': passed,
            'metric': acc_magnitude,
            'threshold': expected_acc,
            'description': f'Dynamic response: {acc_magnitude:.3f} m/s²'
        }

    def is_robot_static(self):
        """
        Determine if robot is currently static based on velocity
        """
        if not self.current_data['twist']:
            return True

        twist = self.current_data['twist']
        velocity_magnitude = math.sqrt(
            twist.linear.x**2 + twist.linear.y**2 + twist.linear.z**2 +
            twist.angular.x**2 + twist.angular.y**2 + twist.angular.z**2
        )

        return velocity_magnitude < 0.01  # Threshold for static

    def test_sensor_fidelity(self):
        """
        Test sensor fidelity by checking sensor data ranges and characteristics
        """
        if not self.current_data['scan_data']:
            return {'passed': False, 'reason': 'No scan data available'}

        scan = self.current_data['scan_data']
        ranges = [r for r in scan.ranges if not (math.isnan(r) or math.isinf(r))]

        if not ranges:
            return {'passed': False, 'reason': 'No valid range data'}

        # Check if ranges are within expected sensor limits
        min_range = scan.range_min
        max_range = scan.range_max

        valid_ranges = [r for r in ranges if min_range <= r <= max_range]
        fidelity_ratio = len(valid_ranges) / len(ranges) if ranges else 0

        # Check for expected number of valid readings (should be high in empty space)
        expected_valid_ratio = 0.8  # 80% of readings should be valid in empty space
        passed = fidelity_ratio >= expected_valid_ratio

        return {
            'passed': passed,
            'metric': fidelity_ratio,
            'threshold': expected_valid_ratio,
            'description': f'Sensor fidelity: {fidelity_ratio:.2f} valid ratio'
        }

    def test_stability(self):
        """
        Test simulation stability by monitoring for oscillations or divergence
        """
        if not self.current_data['pose'] or not self.current_data['twist']:
            return {'passed': False, 'reason': 'Insufficient data for stability test'}

        pose = self.current_data['pose']
        twist = self.current_data['twist']

        # Check for excessive velocities (sign of instability)
        velocity_magnitude = math.sqrt(
            twist.linear.x**2 + twist.linear.y**2 + twist.linear.z**2
        )

        # Check for reasonable position bounds
        position_magnitude = math.sqrt(
            pose.position.x**2 + pose.position.y**2 + pose.position.z**2
        )

        # Define stability thresholds
        max_velocity = 10.0  # m/s
        max_position = 100.0  # m (reasonable simulation bounds)

        velocity_stable = velocity_magnitude <= max_velocity
        position_stable = position_magnitude <= max_position

        passed = velocity_stable and position_stable

        return {
            'passed': passed,
            'metric': {'velocity': velocity_magnitude, 'position': position_magnitude},
            'threshold': {'velocity': max_velocity, 'position': max_position},
            'description': f'Stability: vel={velocity_magnitude:.2f}, pos={position_magnitude:.2f}'
        }

    def test_performance(self):
        """
        Test simulation performance metrics
        """
        # In a real system, we'd measure actual performance
        # For this example, we'll use placeholder values
        # In practice, this would interface with system monitoring tools

        # Calculate real-time factor (simulated seconds / real seconds)
        rtf = self.get_current_rtf()  # Placeholder function

        # Define performance thresholds
        min_rtf = 0.8  # Should run at least at 80% real-time speed
        max_cpu = 90.0  # Max CPU usage percent

        passed = rtf >= min_rtf

        return {
            'passed': passed,
            'metric': rtf,
            'threshold': min_rtf,
            'description': f'Performance: RTF={rtf:.2f}'
        }

    def get_current_rtf(self):
        """
        Get current real-time factor from Gazebo
        This would typically use Gazebo services to get actual RTF
        """
        # Placeholder implementation
        return 1.0  # Assume perfect real-time performance for example

    def evaluate_overall_validation(self):
        """
        Evaluate overall validation status based on all test results
        """
        if not self.test_results:
            overall_passed = False
        else:
            passed_tests = sum(1 for result in self.test_results.values()
                             if result.get('passed', False))
            total_tests = len(self.test_results)

            # Require at least 80% of tests to pass
            overall_passed = passed_tests / total_tests >= 0.8 if total_tests > 0 else False

        # Publish validation status
        status_msg = Bool()
        status_msg.data = overall_passed
        self.validation_status_pub.publish(status_msg)

        # Log validation summary
        if overall_passed:
            self.get_logger().info(f'VALIDATION PASSED: {passed_tests}/{total_tests} tests passed')
        else:
            self.get_logger().warn(f'VALIDATION FAILED: {passed_tests}/{total_tests} tests passed')

    def publish_validation_report(self):
        """
        Publish detailed validation report as visualization markers
        """
        marker_array = MarkerArray()

        # Create summary marker
        summary_marker = Marker()
        summary_marker.header.frame_id = "map"
        summary_marker.header.stamp = self.get_clock().now().to_msg()
        summary_marker.ns = "validation_summary"
        summary_marker.id = 0
        summary_marker.type = Marker.TEXT_VIEW_FACING
        summary_marker.action = Marker.ADD

        summary_marker.pose.position.x = 0.0
        summary_marker.pose.position.y = 0.0
        summary_marker.pose.position.z = 2.0
        summary_marker.pose.orientation.w = 1.0

        summary_marker.scale.z = 0.3  # Text scale
        summary_marker.color.r = 1.0 if self.test_results else 0.5
        summary_marker.color.g = 1.0 if self.test_results else 0.5
        summary_marker.color.b = 1.0 if self.test_results else 0.5
        summary_marker.color.a = 1.0

        if self.test_results:
            passed_count = sum(1 for result in self.test_results.values()
                             if result.get('passed', False))
            total_count = len(self.test_results)
            summary_text = f"Validation: {passed_count}/{total_count} Tests Passed"
        else:
            summary_text = "Validation: No tests run"

        summary_marker.text = summary_text
        marker_array.markers.append(summary_marker)

        # Create individual test result markers
        for i, (test_name, result) in enumerate(self.test_results.items()):
            test_marker = Marker()
            test_marker.header.frame_id = "map"
            test_marker.header.stamp = self.get_clock().now().to_msg()
            test_marker.ns = "validation_tests"
            test_marker.id = i + 1
            test_marker.type = Marker.TEXT_VIEW_FACING
            test_marker.action = Marker.ADD

            test_marker.pose.position.x = 0.0
            test_marker.pose.position.y = -0.5 * (i + 1)  # Stack vertically
            test_marker.pose.position.z = 2.0
            test_marker.pose.orientation.w = 1.0

            test_marker.scale.z = 0.2
            test_marker.color.r = 0.0 if result.get('passed', False) else 1.0
            test_marker.color.g = 1.0 if result.get('passed', False) else 0.0
            test_marker.color.b = 0.0
            test_marker.color.a = 1.0

            test_marker.text = f"{test_name}: {'PASS' if result.get('passed', False) else 'FAIL'}"
            marker_array.markers.append(test_marker)

        self.validation_report_pub.publish(marker_array)

        # Publish detailed metrics as JSON string
        metrics_msg = String()
        metrics_msg.data = json.dumps(self.test_results, indent=2)
        self.validation_metrics_pub.publish(metrics_msg)

class RegressionTester(Node):
    """
    Regression testing framework for simulation changes
    """
    def __init__(self):
        super().__init__('regression_tester')

        # Load baseline data for regression testing
        self.baseline_data_path = '/tmp/simulation_baseline.json'
        self.baseline_data = self.load_baseline_data()

        # Publishers and subscribers
        self.test_result_pub = self.create_publisher(String, '/regression_test_results', 10)

        # Timer for regression tests
        self.regression_timer = self.create_timer(10.0, self.run_regression_tests)

        self.get_logger().info('Regression Tester initialized')

    def load_baseline_data(self):
        """
        Load baseline simulation data for comparison
        """
        if os.path.exists(self.baseline_data_path):
            with open(self.baseline_data_path, 'r') as f:
                return json.load(f)
        else:
            self.get_logger().warn(f'Baseline data not found at {self.baseline_data_path}')
            return {}

    def run_regression_tests(self):
        """
        Run regression tests comparing current simulation to baseline
        """
        current_data = self.collect_current_simulation_data()

        if not self.baseline_data:
            self.get_logger().warn('No baseline data available for regression testing')
            return

        # Compare current data to baseline
        regression_results = self.compare_to_baseline(current_data, self.baseline_data)

        # Publish results
        results_msg = String()
        results_msg.data = json.dumps(regression_results, indent=2)
        self.test_result_pub.publish(results_msg)

        # Log summary
        if regression_results['passed']:
            self.get_logger().info('REGRESSION TESTS PASSED')
        else:
            self.get_logger().error('REGRESSION TESTS FAILED')
            for issue in regression_results.get('issues', []):
                self.get_logger().error(f'  - {issue}')

    def collect_current_simulation_data(self):
        """
        Collect current simulation data for regression testing
        """
        # This would collect relevant simulation metrics
        # For this example, we'll return placeholder data
        return {
            'timestamp': time.time(),
            'metrics': {
                'average_position_error': 0.05,
                'average_velocity_error': 0.02,
                'simulation_stability': 0.98,
                'sensor_accuracy': 0.95
            }
        }

    def compare_to_baseline(self, current, baseline):
        """
        Compare current simulation data to baseline
        """
        issues = []
        tolerance = 0.1  # 10% tolerance for regression

        for metric, current_value in current['metrics'].items():
            if metric in baseline['metrics']:
                baseline_value = baseline['metrics'][metric]
                difference = abs(current_value - baseline_value)

                if difference > baseline_value * tolerance:
                    issues.append(
                        f'{metric}: baseline={baseline_value:.3f}, '
                        f'current={current_value:.3f}, diff={difference:.3f}'
                    )

        return {
            'passed': len(issues) == 0,
            'issues': issues,
            'baseline_timestamp': baseline.get('timestamp', 'unknown'),
            'current_timestamp': current['timestamp']
        }

def main(args=None):
    rclpy.init(args=args)

    # Create validator and regression tester
    validator = SimulationValidator()
    regression_tester = RegressionTester()

    # Create executor to handle both nodes
    executor = rclpy.executors.MultiThreadedExecutor()
    executor.add_node(validator)
    executor.add_node(regression_tester)

    try:
        executor.spin()
    except KeyboardInterrupt:
        pass
    finally:
        validator.destroy_node()
        regression_tester.destroy_node()
        executor.shutdown()
        rclpy.shutdown()

if __name__ == '__main__':
    main()
```

## Statistical Validation Techniques

### Monte Carlo Simulation Validation

```python
#!/usr/bin/env python3

import numpy as np
import matplotlib.pyplot as plt
from scipy import stats

class MonteCarloValidator:
    """
    Monte Carlo validation for simulation uncertainty quantification
    """
    def __init__(self, simulation_model, num_samples=1000):
        self.simulation_model = simulation_model
        self.num_samples = num_samples
        self.results = []

    def run_monte_carlo_validation(self, input_parameters):
        """
        Run Monte Carlo simulation to validate model under uncertainty
        """
        for i in range(self.num_samples):
            # Sample input parameters with uncertainty
            sampled_params = self.add_uncertainty(input_parameters)

            # Run simulation with sampled parameters
            result = self.simulation_model.run(sampled_params)
            self.results.append(result)

        # Analyze results
        mean_result = np.mean(self.results)
        std_result = np.std(self.results)
        confidence_interval = stats.t.interval(
            0.95, len(self.results)-1,
            loc=mean_result, scale=std_result/np.sqrt(len(self.results))
        )

        return {
            'mean': mean_result,
            'std': std_result,
            'confidence_interval': confidence_interval,
            'percentiles': {
                '5th': np.percentile(self.results, 5),
                '50th': np.percentile(self.results, 50),
                '95th': np.percentile(self.results, 95)
            }
        }

    def add_uncertainty(self, params):
        """
        Add uncertainty to input parameters
        """
        sampled_params = {}
        for key, value in params.items():
            if isinstance(value, (int, float)):
                # Add Gaussian noise with 5% coefficient of variation
                noise = np.random.normal(0, 0.05 * abs(value))
                sampled_params[key] = value + noise
            else:
                sampled_params[key] = value
        return sampled_params
```

### Sensitivity Analysis

```python
#!/usr/bin/env python3

class SensitivityAnalyzer:
    """
    Sensitivity analysis for simulation parameters
    """
    def __init__(self, simulation_model):
        self.simulation_model = simulation_model
        self.parameters = {}
        self.outputs = []

    def analyze_sensitivity(self, baseline_params, parameter_ranges):
        """
        Analyze sensitivity of outputs to parameter variations
        """
        sensitivities = {}

        for param_name, (min_val, max_val) in parameter_ranges.items():
            # Vary one parameter at a time
            param_values = np.linspace(min_val, max_val, 10)
            outputs = []

            for val in param_values:
                test_params = baseline_params.copy()
                test_params[param_name] = val

                result = self.simulation_model.run(test_params)
                outputs.append(result)

            # Calculate sensitivity as output range / parameter range
            output_range = max(outputs) - min(outputs)
            param_range = max_val - min_val
            sensitivity = output_range / param_range if param_range != 0 else 0

            sensitivities[param_name] = {
                'sensitivity': sensitivity,
                'outputs': outputs,
                'param_values': param_values.tolist()
            }

        return sensitivities
```

## Hardware Context

### RTX Workstation Validation

For comprehensive validation on RTX Workstations:

- **High-Fidelity Testing**: Run detailed validation with full physics and rendering
- **Performance Validation**: Test simulation performance under maximum load
- **Multi-Scenario Testing**: Validate across diverse scenarios and environments
- **Long-Running Tests**: Execute extended validation runs to check for drift or degradation

### Jetson Orin Kit Considerations

For edge-based validation:

- **Performance-Constrained Testing**: Validate behavior under computational limitations
- **Resource Monitoring**: Continuously monitor CPU, GPU, and memory usage
- **Thermal Validation**: Test thermal behavior during intensive simulation
- **Power Consumption**: Validate power efficiency of simulation workloads

## Implementation Exercise

1. Create a validation configuration file:
   ```bash
   mkdir -p ~/ros2_ws/src/gazebo_simulation_examples/config
   ```

2. Create a validation launch file:
   ```python
   # Save as ~/ros2_ws/src/gazebo_simulation_examples/launch/validation_tests.launch.py
   from launch import LaunchDescription
   from launch.actions import IncludeLaunchDescription, TimerAction
   from launch.launch_description_sources import PythonLaunchDescriptionSource
   from launch.substitutions import PathJoinSubstitution
   from launch_ros.actions import Node
   from launch_ros.substitutions import FindPackageShare

   def generate_launch_description():
       # Launch Gazebo with a test world
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

       # Launch the simulation validator
       validator = Node(
           package='gazebo_simulation_examples',
           executable='simulation_validator',
           name='simulation_validator',
           output='screen'
       )

       # Launch regression tester
       regression_tester = Node(
           package='gazebo_simulation_examples',
           executable='regression_tester',
           name='regression_tester',
           output='screen'
       )

       # Launch a test robot controller to generate data for validation
       test_controller = Node(
           package='gazebo_simulation_examples',
           executable='test_controller',
           name='test_controller',
           output='screen'
       )

       return LaunchDescription([
           gazebo,
           robot_state_publisher,
           test_controller,
           validator,
           regression_tester
       ])
   ```

3. Create a validation report script:
   ```python
   # Save as ~/ros2_ws/src/gazebo_simulation_examples/scripts/generate_validation_report.py
   #!/usr/bin/env python3

   import json
   import matplotlib.pyplot as plt
   import numpy as np
   from datetime import datetime
   import os

   class ValidationReportGenerator:
       """
       Generate comprehensive validation reports
       """
       def __init__(self):
           self.reports_dir = '/tmp/validation_reports'
           os.makedirs(self.reports_dir, exist_ok=True)

       def generate_report(self, validation_data):
           """
           Generate a comprehensive validation report
           """
           timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
           report_path = os.path.join(self.reports_dir, f'validation_report_{timestamp}.html')

           # Create HTML report
           html_content = self.create_html_report(validation_data)

           with open(report_path, 'w') as f:
               f.write(html_content)

           print(f"Validation report generated: {report_path}")
           return report_path

       def create_html_report(self, validation_data):
           """
           Create HTML validation report
           """
           html = f"""
           <!DOCTYPE html>
           <html>
           <head>
               <title>Simulation Validation Report</title>
               <style>
                   body {{ font-family: Arial, sans-serif; margin: 20px; }}
                   .header {{ background-color: #f0f0f0; padding: 10px; border-radius: 5px; }}
                   .section {{ margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }}
                   .test-result {{ margin: 10px 0; padding: 5px; }}
                   .pass {{ background-color: #d4edda; color: #155724; }}
                   .fail {{ background-color: #f8d7da; color: #721c24; }}
                   table {{ border-collapse: collapse; width: 100%; }}
                   th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
                   th {{ background-color: #f2f2f2; }}
               </style>
           </head>
           <body>
               <div class="header">
                   <h1>Simulation Validation Report</h1>
                   <p>Generated on: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}</p>
               </div>

               <div class="section">
                   <h2>Validation Summary</h2>
                   <p>Total Tests: {len(validation_data) if validation_data else 0}</p>
                   <p>Passed: {sum(1 for v in validation_data.values() if v.get('passed', False)) if validation_data else 0}</p>
                   <p>Failed: {sum(1 for v in validation_data.values() if not v.get('passed', True)) if validation_data else 0}</p>
               </div>

               <div class="section">
                   <h2>Detailed Results</h2>
                   <table>
                       <tr><th>Test</th><th>Status</th><th>Metric</th><th>Threshold</th><th>Description</th></tr>
           """

           for test_name, result in validation_data.items():
               status_class = "pass" if result.get('passed', False) else "fail"
               status_text = "PASS" if result.get('passed', False) else "FAIL"

               metric = result.get('metric', 'N/A')
               threshold = result.get('threshold', 'N/A')
               description = result.get('description', 'No description')

               html += f"""
                       <tr>
                           <td>{test_name}</td>
                           <td class="{status_class}">{status_text}</td>
                           <td>{metric}</td>
                           <td>{threshold}</td>
                           <td>{description}</td>
                       </tr>
               """

           html += """
                   </table>
               </div>
           </body>
           </html>
           """

           return html

   def main():
       # Example usage
       sample_validation_data = {
           "test_kinematic_accuracy": {
               "passed": True,
               "metric": 0.045,
               "threshold": 0.1,
               "description": "Kinematic accuracy: 0.045m error"
           },
           "test_dynamic_response": {
               "passed": True,
               "metric": 9.78,
               "threshold": 11.8,
               "description": "Dynamic response: 9.78 m/s²"
           },
           "test_sensor_fidelity": {
               "passed": False,
               "metric": 0.65,
               "threshold": 0.8,
               "description": "Sensor fidelity: 0.65 valid ratio"
           }
       }

       generator = ValidationReportGenerator()
       report_path = generator.generate_report(sample_validation_data)
       print(f"Report saved to: {report_path}")

   if __name__ == "__main__":
       main()
   ```

4. Make the script executable and run validation:
   ```bash
   chmod +x ~/ros2_ws/src/gazebo_simulation_examples/scripts/generate_validation_report.py

   cd ~/ros2_ws
   colcon build --packages-select gazebo_simulation_examples
   source install/setup.bash

   # Run the validation tests
   ros2 launch gazebo_simulation_examples validation_tests.launch.py

   # Generate a validation report (run in another terminal)
   python3 ~/ros2_ws/src/gazebo_simulation_examples/scripts/generate_validation_report.py
   ```

## Troubleshooting

- **False Positives**: Adjust validation thresholds based on simulation noise characteristics
- **Performance Impact**: Run validation in parallel to avoid slowing down simulation
- **Data Drift**: Regularly update baseline data to account for model improvements
- **Resource Usage**: Monitor validation system resource consumption

## Summary

This lesson covered comprehensive simulation testing and validation techniques, including automated validation frameworks, statistical validation methods, and performance monitoring. Proper validation is essential for building confidence in Digital Twin environments for Physical AI and humanoid robotics applications.

## Next Steps

In the next lesson, we'll explore sim-to-real transfer principles and techniques, focusing on how to effectively transfer behaviors and models developed in simulation to real-world Physical AI and humanoid robotics systems.