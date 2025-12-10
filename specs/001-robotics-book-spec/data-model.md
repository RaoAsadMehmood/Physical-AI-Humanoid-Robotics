# Data Model: Physical AI & Humanoid Robotics Book

This document defines the key entities and their relationships for the Physical AI & Humanoid Robotics book, based on the `spec.md` requirements. It also outlines the integration points for the RAG Chatbot, Personalization, and Urdu Translation features.

## Entities

### 1. Chapter
*   **Description**: A major division of the book, corresponding to a module. It encapsulates a specific theme or area within Physical AI and Humanoid Robotics.
*   **Fields**:
    *   `id`: Unique identifier (string)
    *   `title`: Title of the chapter (string)
    *   `description`: Overview of the chapter's content (string)
    *   `module_mapping`: Corresponding module name (string, e.g., "ROS 2: The Nervous System")
*   **Relationships**:
    *   Contains multiple `Lesson` entities.

### 2. Lesson
*   **Description**: A weekly breakdown of topics within a chapter, with specific learning objectives and content. Each lesson adheres to the "Code-First" guideline.
*   **Fields**:
    *   `id`: Unique identifier (string)
    *   `chapter_id`: Foreign key linking to `Chapter` (string)
    *   `week_number`: Week number within the 13-week plan (integer)
    *   `title`: Title of the lesson (string)
    *   `content`: Markdown content of the lesson (string)
    *   `learning_objectives`: Key takeaways for the lesson (list of strings)
*   **Relationships**:
    *   Belongs to a `Chapter`.
    *   Includes one or more `Code Example` entities.
    *   May reference `Hardware Context`.

### 3. Code Example
*   **Description**: Executable code snippets illustrating concepts. Adheres to the "Code-First" guideline.
*   **Fields**:
    *   `id`: Unique identifier (string)
    *   `lesson_id`: Foreign key linking to `Lesson` (string)
    *   `language`: Programming language (string, e.g., "Python", "YAML")
    *   `code_snippet`: The actual code (string)
    *   `explanation`: Description of the code's functionality (string)
    *   `expected_output`: (Optional) Expected result when running the code (string)
*   **Validation Rules**:
    *   Must be functional and verifiable (SC-003).

### 4. Hardware Context
*   **Description**: Information on hardware requirements, setup, and considerations for practical application. Details requirements for Workstation, Edge Kit, and Robot Lab.
*   **Fields**:
    *   `id`: Unique identifier (string)
    *   `lesson_id`: Foreign key linking to `Lesson` (optional, string)
    *   `type`: Type of hardware context (string, e.g., "Workstation", "Edge Kit", "Robot Lab")
    *   `specifications`: Detailed technical requirements (string)
    *   `setup_instructions`: Steps for hardware setup (string)
*   **Validation Rules**:
    *   Must provide complete and accurate specifications (SC-004).

### 5. RAG Chatbot Placeholder
*   **Description**: Represents the integration point for a future RAG (Retrieval Augmented Generation) Chatbot functionality. This chatbot will provide interactive Q&A based on the book's content.
*   **Integration Points**:
    *   **Content Indexing**: The book's markdown content (`Chapter`, `Lesson`) will be indexed by the RAG system.
    *   **User Interface**: A UI component within Docusaurus to interact with the chatbot.
    *   **Query Interface**: An API or mechanism for the chatbot to query the indexed content.

### 6. Personalization Placeholder
*   **Description**: Represents the integration point for a future Personalization feature, enabling adaptive learning paths and content recommendations based on user progress and interests.
*   **Integration Points**:
    *   **User Progress Tracking**: Mechanisms to record completed `Lesson` and `Chapter` entities.
    *   **Recommendation Engine**: Logic to suggest next `Lesson` or `Chapter` based on tracked progress and user profile.
    *   **UI Adaptations**: Dynamic adjustments to the Docusaurus interface to display personalized content or pathways.

### 7. Urdu Translation Placeholder
*   **Description**: Represents the integration point for a future Urdu Translation feature, providing multilingual content support for the book.
*   **Integration Points**:
    *   **Content Duplication/Localization**: A strategy for storing and retrieving translated versions of `Chapter` and `Lesson` content.
    *   **Language Selector**: A UI component within Docusaurus to switch between English and Urdu versions.
    *   **Translation Workflow**: A process for managing and updating translations.
