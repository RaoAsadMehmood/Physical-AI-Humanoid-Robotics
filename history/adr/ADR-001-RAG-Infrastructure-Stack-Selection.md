# ADR-001: RAG Infrastructure Stack Selection

## Status

Accepted

## Date

2025-12-10

## Context

The Physical AI & Humanoid Robotics project requires a robust backend infrastructure to support the RAG (Retrieval Augmented Generation) chatbot functionality. This system needs to handle semantic search across extensive documentation, process natural language queries about complex robotics concepts, and provide accurate, context-aware responses with source citations. The infrastructure must support high-performance vector operations for semantic similarity search, reliable metadata storage for content references and user data, and scalable API endpoints to serve chatbot interactions.

## Decision

We will use the following technology stack for the RAG infrastructure:

- **Backend Framework**: FastAPI for the API layer due to its speed, asynchronous nature, and excellent integration with Python-based AI workflows
- **Vector Database**: Qdrant Cloud (free tier) for vector storage and similarity search operations
- **Relational Database**: Neon Serverless Postgres for metadata storage, user data, and content references

This combination provides:
- FastAPI: High-performance async Python framework with automatic API documentation and strong typing
- Qdrant: Optimized vector database with efficient similarity search capabilities
- Neon Postgres: Serverless SQL database with familiar SQL interface and branching capabilities

## Consequences

### Positive
- High performance for RAG operations with async FastAPI handling concurrent requests efficiently
- Qdrant's optimized vector operations support fast semantic search across documentation
- Neon's serverless nature provides automatic scaling and cost efficiency
- Strong Python ecosystem integration for AI/ML workflows
- Automatic API documentation generation with FastAPI
- Familiar SQL interface for complex queries on metadata

### Negative
- Additional infrastructure complexity with multiple database systems
- Potential vendor lock-in with Neon and Qdrant cloud services
- Additional operational overhead for managing multiple services
- Learning curve for team members unfamiliar with Qdrant

## Alternatives

### Alternative 1: Single Database Approach
- PostgreSQL with pgvector extension for vector operations
- Pros: Single database system, familiar SQL interface, open source
- Cons: Less optimized for vector operations than dedicated vector DB, potential performance issues with large vector datasets

### Alternative 2: Different Vector Database
- Pinecone for vector storage
- Pros: Mature managed service, good performance
- Cons: More expensive than Qdrant, less open source friendly

### Alternative 3: Different Backend Framework
- Django with Django REST Framework
- Pros: Mature ecosystem, built-in admin, ORM
- Cons: Heavier framework, synchronous by default, slower for high-concurrency API requests

## References

- plan.md: Technical Context section
- research.md: RAG Chatbot Implementation Research
- data-model.md: Entity definitions for ContentReference and RAGDocument