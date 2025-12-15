"""
FastAPI server for RAG chatbot backend
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from dotenv import load_dotenv
from agents import Agent, Runner, OpenAIChatCompletionsModel, AsyncOpenAI
from agents import set_tracing_disabled, function_tool
import cohere
from qdrant_client import QdrantClient

# Load environment variables
load_dotenv()
set_tracing_disabled(disabled=True)

# Initialize OpenAI
openai_api_key = os.getenv("OPENAI_API_KEY")
if not openai_api_key:
    raise ValueError("OPENAI_API_KEY not found in environment variables.")

provider = AsyncOpenAI(api_key=openai_api_key)
model = OpenAIChatCompletionsModel(
    model="gpt-4o-mini",
    openai_client=provider
)

# Initialize Cohere and Qdrant
cohere_client = cohere.Client(os.getenv("COHERE_API_KEY"))
qdrant_client = QdrantClient(
    url=os.getenv("QDRANT_URL"),
    api_key=os.getenv("QDRANT_API_KEY"),
)

def get_embedding(text):
    """Get embedding vector from Cohere Embed v3"""
    response = cohere_client.embed(
        model=os.getenv("EMBED_MODEL", "embed-english-v3.0"),
        input_type="search_query",
        texts=[text],
    )
    return response.embeddings[0]

@function_tool
def retrieve(query):
    embedding = get_embedding(query)
    result = qdrant_client.query_points(
        collection_name=os.getenv("COLLECTION_NAME", "physical_ai_book"),
        query=embedding,
        limit=5
    )
    return [point.payload["text"] for point in result.points]

# Create agent
agent = Agent(
    name="Assistant for Physical AI & Humanoid Robotics",
    instructions="""
You are a concise AI tutor for Physical AI and Humanoid Robotics. Answer questions using ONLY retrieved textbook content.

**CRITICAL: Be CONCISE to minimize API costs:**
- Keep responses brief and direct - avoid unnecessary words
- Use bullet points instead of long paragraphs when possible
- Get straight to the answer without lengthy introductions
- Avoid repetition and redundant explanations
- Limit responses to 2-4 sentences for simple questions, max 1-2 paragraphs for complex ones

**Process:**
1. Always use `retrieve` tool first
2. Base answers STRICTLY on retrieved content only
3. Synthesize key points concisely
4. If information unavailable, briefly say: "Not found in textbook. Try rephrasing."

**Style:**
- Direct and factual
- No fluff or filler words
- Essential information only
- Professional but brief
""",
    model=model,
    tools=[retrieve]
)

# FastAPI app
app = FastAPI(title="RAG Chatbot API")

# CORS middleware
# In production, replace "*" with your frontend domain
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "https://physical-ai-humanoid-robotics-beige.vercel.app"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str
    error: str = None

@app.get("/")
async def root():
    return {"message": "RAG Chatbot API is running"}

import asyncio
from concurrent.futures import ThreadPoolExecutor

# Create a thread pool executor for running sync operations
executor = ThreadPoolExecutor(max_workers=4)

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        # Run the synchronous operation in a thread pool to avoid blocking the event loop
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            executor,
            lambda: Runner.run_sync(agent, input=request.message)
        )
        return ChatResponse(response=result.final_output)
    except Exception as e:
        error_msg = str(e)
        if "429" in error_msg or "RateLimitError" in error_msg or "quota" in error_msg.lower():
            return ChatResponse(
                response="",
                error="API quota exceeded. Please try again later or check your API key."
            )
        else:
            return ChatResponse(
                response="",
                error="Error: " + error_msg[:200]
            )

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
