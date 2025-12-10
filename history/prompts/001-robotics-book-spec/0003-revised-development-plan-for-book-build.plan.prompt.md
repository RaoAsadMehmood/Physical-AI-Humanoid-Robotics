---
id: 0003
title: Revised Development Plan for Book Build
stage: plan
date: 2025-12-06
surface: agent
model: claude-sonnet-4-5-20251101
feature: 001-robotics-book-spec
branch: 001-robotics-book-spec
user: User
command: /sp.plan
labels: ["development-plan", "plan"]
links:
  spec: specs/001-robotics-book-spec/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/001-robotics-book-spec/plan.md
tests:
  null
---

## Prompt

```text
Based on the approved Specification, generate a highly prioritized and actionable Development Plan/Task List for building the "Physical AI & Humanoid Robotics" book in Docusaurus.

The Development Plan MUST be structured into these phases:

### Phase 1: Docusaurus Architecture & File System (Highest Priority)
* **Goal:** Explicitly define the directory structure and create all necessary Docusaurus files/folders before content generation.
* **Tasks MUST Include:**
    1.  Docusaurus project initialization (`npx create-docusaurus@latest`).
    2.  Detailed **File Structure** creation (e.g., creating the `/docs/chapter1`, `/docs/chapter2` directories, etc.).
    3.  Defining the **kebab-case file naming convention** for all lessons (e.g., `ros2-fundamentals.md`).
    4.  Configuring the primary **`sidebars.js`** file to create the hierarchical navigation for all 4 chapters, adhering to the Spec's lesson flow.

### Phase 2: Core Content Generation & Refinement
* **Goal:** Generate the 13-Week content, ensuring Code-First and Hardware Realism principles are met.
* **Tasks MUST Include:**
    1.  Generating content for the remaining lessons of **Chapter 1 (ROS 2 Fundamentals)**.
    2.  Generating all content for **Chapter 2 (Simulation)**, **Chapter 3 (Isaac)**, and **Chapter 4 (VLA/Capstone)** in sequence.

### Phase 3: Infrastructure Integration & Bonus Features
* **Goal:** Integrate the RAG chatbot and implement all bonus features.
* **Tasks MUST Include:**
    1.  Defining the reusable intelligence: **Claude Code Subagents/Agent Skills** for generating standardized ROS 2 code snippets (to secure the +50 bonus).
    2.  Implementing the **RAG Chatbot** infrastructure (FastAPI, Neon, Qdrant).
    3.  Integrating **Better-Auth** for Signup/Signin (+50 bonus).
    4.  Implementing **Content Personalization** and **Urdu Translation** features (+100 bonus).
```

## Response snapshot

The `plan.md` file was successfully updated to include a revised development plan structured into three phases: Docusaurus Architecture & File System, Core Content Generation & Refinement, and Infrastructure Integration & Bonus Features, with detailed tasks for each phase as specified by the user.

## Outcome

- ✅ Impact: Development plan revised and updated in `plan.md`.
- 🧪 Tests: N/A
- 📁 Files: One file modified (specs/001-robotics-book-spec/plan.md).
- 🔁 Next prompts: N/A
- 🧠 Reflection: PHR successfully created using agent-native tools after script failure.

## Evaluation notes (flywheel)

- Failure modes observed: Bash script `create-phr.sh` not found.
- Graders run and results (PASS/FAIL): N/A
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): Investigate `create-phr.sh` path/availability.
