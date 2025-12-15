import os
import random
from agents import Agent, Runner, OpenAIChatCompletionsModel, AsyncOpenAI
from agents import set_tracing_disabled, function_tool
from dotenv import load_dotenv
from agents import enable_verbose_stdout_logging


enable_verbose_stdout_logging()

load_dotenv()
set_tracing_disabled(disabled=True)


openai_api_key = os.getenv("OPENAI_API_KEY")
if not openai_api_key:
    raise ValueError("OPENAI_API_KEY not found in environment variables. Please add it to your .env file.")

provider = AsyncOpenAI(
    api_key=openai_api_key
)

model = OpenAIChatCompletionsModel(
    model="gpt-4o-mini",  # You can change this to "gpt-4", "gpt-3.5-turbo", etc.
    openai_client=provider
)

import cohere
from qdrant_client import QdrantClient
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Initialize Cohere client
cohere_client = cohere.Client(os.getenv("COHERE_API_KEY"))

# Connect to Qdrant
qdrant_client = QdrantClient(
    url=os.getenv("QDRANT_URL"), 
    api_key=os.getenv("QDRANT_API_KEY"),
)

def get_embedding(text):
    """Get embedding vector from Cohere Embed v3"""
    response = cohere_client.embed(
        model=os.getenv("EMBED_MODEL", "embed-english-v3.0"),
        input_type="search_query",  # Use search_query for queries
        texts=[text],
    )
    return response.embeddings[0]  # Return the first embedding

@function_tool
def retrieve(query):
    embedding = get_embedding(query)
    result = qdrant_client.query_points(
        collection_name=os.getenv("COLLECTION_NAME", "physical_ai_book"),
        query=embedding,
        limit=5
    )
    return [point.payload["text"] for point in result.points]


agent = Agent(
    name="Assistant for Physical AI & Humanoid Robotics",
    instructions=
"""
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

# Only run test when executing this file directly, not when imported
if __name__ == "__main__":
    try:
        result = Runner.run_sync(
            agent,
            input="What is Pyhsical AI and how is it different from traditional AI?",
        )
        print(result.final_output)
    except Exception as e:
        error_msg = str(e)
        if "429" in error_msg or "RateLimitError" in error_msg or "quota" in error_msg.lower():
            print("\n❌ ERROR: OpenAI API Quota/Rate Limit Exceeded")
            print("=" * 60)
            print("Your OpenAI API quota or rate limit has been exceeded.")
            print("\nPossible solutions:")
            print("1. Wait for the rate limit to reset")
            print("2. Check your API usage at: https://platform.openai.com/usage")
            print("3. Upgrade your OpenAI plan if needed")
            print("4. Verify your OPENAI_API_KEY in .env file is correct")
            print("5. Try using a different API key or model")
            print("\nError details:", error_msg[:200] + "..." if len(error_msg) > 200 else error_msg)
        else:
            print(f"\n❌ ERROR: {type(e).__name__}")
            print("=" * 60)
            print(f"Error message: {error_msg}")
            import traceback
            traceback.print_exc()