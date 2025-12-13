import cohere
from qdrant_client import QdrantClient

# Initialize Cohere client
cohere_client = cohere.Client("iqobsHoQ3v97qZVWLntmHSK35abrpduNB22Jlh76")

# Connect to Qdrant
qdrant_client = QdrantClient(
    url="https://12270bbe-9a85-4f75-bb8b-ec62a640eb2f.us-east4-0.gcp.cloud.qdrant.io:6333", 
    api_key="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.zX2MDZxZc8rYYytrUjBcP5oa55-Ov-PZqQBDzYCO5yY",
)

def get_embedding(text):
    """Get embedding vector from Cohere Embed v3"""
    response = cohere_client.embed(
        model="embed-english-v3.0",
        input_type="search_query",  # Use search_query for queries
        texts=[text],
    )
    return response.embeddings[0]  # Return the first embedding

def retrieve(query):
    embedding = get_embedding(query)
    result = qdrant_client.query_points(
        collection_name="physical_ai_book",
        query=embedding,
        limit=5
    )
    return [point.payload["text"] for point in result.points]

# Test
print(retrieve("What data do you have?"))