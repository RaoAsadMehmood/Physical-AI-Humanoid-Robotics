# RAG Chatbot API Server

This is the FastAPI backend server for the RAG chatbot widget.

## Setup

1. Install dependencies:
```bash
cd rag-backend
uv sync
```

2. Make sure your `.env` file has all required credentials:
- `OPENAI_API_KEY`
- `COHERE_API_KEY`
- `QDRANT_URL`
- `QDRANT_API_KEY`
- `EMBED_MODEL` (optional, defaults to "embed-english-v3.0")
- `COLLECTION_NAME` (optional, defaults to "physical_ai_book")

3. Run the server:
```bash
uv run api_server.py
```

Or using uvicorn directly:
```bash
uvicorn api_server.py:app --reload --host 0.0.0.0 --port 8000
```

## API Endpoints

### GET `/`
Health check endpoint.

### POST `/chat`
Send a message to the chatbot.

**Request:**
```json
{
  "message": "What is Physical AI?"
}
```

**Response:**
```json
{
  "response": "Physical AI is...",
  "error": null
}
```

## Frontend Integration

The React chatbot widget is located at `src/components/Chatbot/ChatbotWidget.jsx` and is automatically included in the Docusaurus layout.

To change the API URL, update the `API_URL` constant in `ChatbotWidget.jsx`:

```javascript
const API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-backend-url.com' 
  : 'http://localhost:8000';
```

## Production Deployment

For production, you should:
1. Set up proper CORS origins in `api_server.py`
2. Use environment variables for the API URL
3. Deploy the backend to a service like:
   - Railway
   - Render
   - Fly.io
   - AWS/GCP/Azure
   - Or any Python hosting service

4. Update the `API_URL` in the frontend to point to your production backend.
