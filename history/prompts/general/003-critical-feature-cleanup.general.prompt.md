---
id: 003
title: "Critical Feature Cleanup"
stage: "general"
date_iso: "2025-12-10"
surface: "agent"
model: "Claude Sonnet 4.5"
feature: "none"
branch: "001-infra-bonus-features"
user: "DELL"
command: "/sp.implement 'CRITICAL FEATURE CLEANUP: Delete all integrated bonus features and their associated infrastructure to simplify the book project.'"
labels: ["cleanup", "refactoring", "bonus-features", "infrastructure"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files_yaml: |
  - backend/src/api/chat_router.py
  - backend/src/api/auth_router.py
  - backend/src/api/search_router.py
  - backend/src/api/content_router.py
  - backend/src/services/chat_service.py
  - backend/src/services/document_processing_service.py
  - backend/src/services/rag_service.py
  - backend/src/services/search_service.py
  - backend/src/services/vector_service.py
  - backend/src/services/content_service.py
  - backend/src/models/chat_message.py
  - backend/src/models/chat_session.py
  - backend/src/models/content_reference.py
  - backend/src/models/rag_document.py
  - backend/src/models/bookmark.py
  - backend/src/models/user_progress.py
  - backend/src/models/personalization_profile.py
  - backend/src/models/translation_set.py
  - backend/src/middleware/auth_middleware.py
  - backend/src/config/auth_config.py
  - backend/src/config/rag_config.py
  - docusaurus-book/src/components/Chatbot/
  - docusaurus-book/src/components/Auth/
  - docusaurus-book/src/components/Personalization/
  - docusaurus-book/src/components/Translation/
  - docusaurus-book/src/pages/auth/
  - docusaurus-book/src/pages/chat.jsx
  - docusaurus-book/src/pages/dashboard/
  - docusaurus-book/src/pages/bookmarks/
  - docusaurus-book/src/pages/translate.jsx
  - backend/requirements.txt
  - backend/src/main.py
  - backend/src/services/user_service.py
  - backend/alembic/env.py
  - backend/src/database/database.py
  - backend/src/middleware/rate_limiter.py
  - docusaurus-book/docusaurus.config.js
  - docusaurus-book/sidebars.js
prompt_text: |
  'CRITICAL FEATURE CLEANUP: Delete all integrated bonus features and their associated infrastructure to simplify the book project.

  ### **Action Points (MUST delete related code and configuration):**
  1.  **Delete RAG Chatbot:** Permanently delete all files related to the RAG Chatbot, including the floating widget component, its integration logic, and any associated backend services (FastAPI endpoints, Qdrant/Neon configuration files).
  2.  **Delete Authentication/Personalization:** Permanently delete all files and components related to Better-Auth, Login/Signup pages, user dashboard, and personalization logic.
  3.  **Delete Urdu Translation:** Permanently delete all translation components and client-side logic.
  4.  **Docusaurus Cleanup:** Remove all corresponding links, routes, and navigation entries (from `sidebars.js` and `docusaurus.config.js`) that pointed to the deleted bonus features (e.g., /chat, /auth, /translate).
  5.  **Navbar Cleanup:** Remove the "Bonus Features" menu item from the Navbar.

  **Goal:** Ensure the project contains only the core Docusaurus book content (Chapters 1-4) and runs without any compilation errors or references to the deleted features. Document the cleanup in PHR.'
response_text: |
  Successfully completed the critical feature cleanup task. All bonus features have been removed from the project:

  1. RAG Chatbot: Removed all frontend components, backend API routes, services, and models
  2. Authentication/Personalization: Removed all auth components, API routes, services, and models
  3. Urdu Translation: Removed all translation components and services
  4. Docusaurus Cleanup: Updated navigation and configuration files to remove bonus feature references
  5. Updated dependencies and configurations to remove bonus feature related packages

  The project now contains only the core Docusaurus book content with Chapters 1-4.
outcome: "Successfully cleaned up all bonus features from the project, leaving only core book content."
evaluation: "All specified bonus features have been removed and the project structure has been simplified as requested."
---

# Critical Feature Cleanup PHR

## Summary
Successfully removed all integrated bonus features (RAG Chatbot, Authentication/Personalization, Urdu Translation) from the Physical AI & Humanoid Robotics project to simplify the book project and retain only core Docusaurus book content (Chapters 1-4).

## Changes Made

### 1. Deleted RAG Chatbot Components
- Frontend: Removed `docusaurus-book/src/components/Chatbot/` directory
- Backend API: Removed `backend/src/api/chat_router.py`, `search_router.py`, `content_router.py`
- Backend Services: Removed `chat_service.py`, `document_processing_service.py`, `rag_service.py`, `search_service.py`, `vector_service.py`
- Backend Models: Removed `chat_message.py`, `chat_session.py`, `content_reference.py`, `rag_document.py`

### 2. Deleted Authentication/Personalization Components
- Frontend: Removed `docusaurus-book/src/components/Auth/` and `docusaurus-book/src/components/Personalization/` directories
- Backend API: Removed `backend/src/api/auth_router.py`
- Backend Services: Updated `user_service.py` to remove personalization profile creation
- Backend Models: Removed `bookmark.py`, `user_progress.py`, `personalization_profile.py`

### 3. Deleted Urdu Translation Components
- Frontend: Removed `docusaurus-book/src/components/Translation/` directory
- Backend: Removed `translation_service.py` and `translation_set.py` model
- Frontend Pages: Removed translation-related pages

### 4. Docusaurus Configuration Cleanup
- Updated `docusaurus.config.js` to remove Urdu locale and bonus feature navigation items
- Removed bonus features from footer links
- Removed bonus feature pages from `docusaurus-book/src/pages/`

### 5. Backend Infrastructure Cleanup
- Removed bonus feature related dependencies from `requirements.txt`
- Updated `main.py` to remove references to deleted routers and middleware
- Updated `alembic/env.py` to remove imports of deleted models
- Updated `database/database.py` to remove references to deleted models
- Updated `rate_limiter.py` to remove chat-specific functions

## Result
The project now contains only the core Docusaurus book content with Chapters 1-4 and runs without any compilation errors or references to the deleted bonus features. The codebase has been significantly simplified while preserving all core educational content.