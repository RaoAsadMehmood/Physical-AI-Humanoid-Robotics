// @ts-check

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Creating a sidebar enables you to:
 * - create an ordered group of docs
 * - render a sidebar for each doc of that group
 * - provide next/previous navigation
 *
 * The sidebars can be generated from the filesystem, or explicitly defined here.
 *
 * Create as many sidebars as you want.
 *
 * @type {import('@docusaurus/plugin-content-docs').SidebarsConfig}
 */
const sidebars = {
  // Manual sidebar configuration for Physical AI & Humanoid Robotics Book
  tutorialSidebar: [
    {
      type: 'category',
      label: 'Introduction',
      link: {
        type: 'doc',
        id: 'intro',
      },
      items: [],
    },
    {
      type: 'category',
      label: 'Chapter 1: ROS 2 - The Nervous System',
      items: [
        'chapter1/week-plan/week1-lesson1-introduction-ros2-physical-ai',
        'chapter1/week-plan/week2-lesson2-ros2-architecture',
        'chapter1/week-plan/week3-lesson3-python-agents-rclpy',
        'chapter1/week-plan/week4-lesson4-understanding-urdf',
        'chapter1/week-plan/week5-lesson5-ros2-package-building',
        'chapter1/week-plan/week6-lesson6-ros2-actions-services-advanced',
        'chapter1/week-plan/week7-lesson7-ros2-launch-systems',
        'chapter1/week-plan/week8-lesson8-ros2-testing-debugging',
        'chapter1/week-plan/week9-lesson9-ros2-security-communication',
        'chapter1/week-plan/week10-lesson10-ros2-realtime-performance',
      ],
      link: {
        type: 'doc',
        id: 'chapter1/index',
      },
    },
    {
      type: 'category',
      label: 'Chapter 2: Gazebo - The Digital Twin',
      items: [
        'chapter2/index',
        'chapter2/week-plan/week14-lesson1-introduction-gazebo-simulation',
        'chapter2/week-plan/week15-lesson2-setting-up-gazebo-ros2',
        'chapter2/week-plan/week16-lesson3-creating-robot-models-gazebo',
        'chapter2/week-plan/week17-lesson4-physics-engines-gazebo',
        'chapter2/week-plan/week18-lesson5-sensor-integration-gazebo',
        'chapter2/week-plan/week19-lesson6-control-systems-gazebo-python',
        'chapter2/week-plan/week20-lesson7-advanced-physics-gpu-acceleration',
        'chapter2/week-plan/week21-lesson8-multi-robot-simulation-gazebo',
        'chapter2/week-plan/week22-lesson9-testing-validation-techniques',
        'chapter2/week-plan/week23-lesson10-sim-to-real-transfer',
        'chapter2/week-plan/week24-lesson11-hardware-in-loop-simulation',
        'chapter2/week-plan/week25-lesson12-optimizing-simulation-performance',
        'chapter2/week-plan/week26-lesson13-best-practices-digital-twin',
      ],
      link: {
        type: 'doc',
        id: 'chapter2/index',
      },
    },
    {
      type: 'category',
      label: 'Chapter 3: Isaac - The AI-Robot Brain',
      items: [
        'chapter3/index',
        'chapter3/week-plan/week27-lesson1-introduction-nvidia-isaac-platform',
        'chapter3/week-plan/week28-lesson2-isaac-ros-gpu-accelerated-perception',
        'chapter3/week-plan/week29-lesson3-isaac-sim-advanced-physics-simulation',
        'chapter3/week-plan/week30-lesson4-isaac-ros-gardens-standardized-components',
        'chapter3/week-plan/week31-lesson5-gpu-optimization-techniques',
        'chapter3/week-plan/week32-lesson6-isaac-navigation-path-planning',
        'chapter3/week-plan/week33-lesson7-vslam-visual-simultaneous-localization-mapping',
        'chapter3/week-plan/week34-lesson8-gpu-optimization-techniques',
        'chapter3/week-plan/week35-lesson9-isaac-navigation-nav2-integration',
        'chapter3/week-plan/week36-lesson10-advanced-control-systems-isaac',
        'chapter3/week-plan/week37-lesson11-multirobot-coordination-isaac',
        'chapter3/week-plan/week38-lesson12-cognitive-planning-isaac',
        'chapter3/week-plan/week39-lesson13-isaac-system-integration-best-practices',
      ],
      link: {
        type: 'doc',
        id: 'chapter3/index',
      },
    },
    {
      type: 'category',
      label: 'Chapter 4: VLA - Vision-Language-Action Models',
      items: [
        'chapter4/index',
        'chapter4/week-plan/week40-lesson1-introduction-vla-models',
        'chapter4/week-plan/week41-lesson2-vla-integration-physical-ai',
        'chapter4/week-plan/week42-lesson3-cognitive-planning-vla-models',
        'chapter4/week-plan/week43-lesson4-advanced-control-vla-integration',
        'chapter4/week-plan/week44-lesson5-capstone-project-architecture',
        'chapter4/week-plan/week45-lesson6-deployment-strategies-vla-systems',
        'chapter4/week-plan/week46-lesson7-performance-optimization-vla',
        'chapter4/week-plan/week47-lesson8-testing-validation-vla-systems',
        'chapter4/week-plan/week48-lesson9-vla-physical-ai-integration',
        'chapter4/week-plan/week49-lesson10-advanced-vla-topics',
        'chapter4/week-plan/week50-lesson11-final-implementation-project',
        'chapter4/week-plan/week51-lesson12-capstone-project',
        'chapter4/week-plan/week52-lesson13-course-conclusion-vla',
      ],
      link: {
        type: 'doc',
        id: 'chapter4/index',
      },
    },
  ],
};

module.exports = sidebars;