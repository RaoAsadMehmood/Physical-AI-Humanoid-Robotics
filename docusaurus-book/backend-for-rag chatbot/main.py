import requests
import xml.etree.ElementTree as ET
import trafilatura
from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance, PointStruct
import cohere
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# -------------------------------------
# CONFIG
# -------------------------------------
# Your Deployment Link:
SITEMAP_URL = os.getenv("SITEMAP_URL", "https://physical-ai-humanoid-robotics-beige.vercel.app/sitemap.xml")
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "physical_ai_book")

cohere_client = cohere.Client(os.getenv("COHERE_API_KEY"))
EMBED_MODEL = os.getenv("EMBED_MODEL", "embed-english-v3.0")

# Connect to Qdrant Cloud
qdrant_client = QdrantClient(
    url=os.getenv("QDRANT_URL"), 
    api_key=os.getenv("QDRANT_API_KEY"),
)

# -------------------------------------
# Step 1 — Extract URLs from sitemap
# -------------------------------------
def get_all_urls(sitemap_url):
    xml = requests.get(sitemap_url).text
    root = ET.fromstring(xml)

    urls = []
    for child in root:
        loc_tag = child.find("{http://www.sitemaps.org/schemas/sitemap/0.9}loc")
        if loc_tag is not None:
            urls.append(loc_tag.text)

    print("\nFOUND URLS:")
    for u in urls:
        print(" -", u)

    return urls


# -------------------------------------
# Step 2 — Download page + extract text
# -------------------------------------
def extract_text_from_url(url):
    html = requests.get(url).text
    text = trafilatura.extract(html)

    if not text:
        print("[WARNING] No text extracted from:", url)

    return text


# -------------------------------------
# Step 3 — Chunk the text
# -------------------------------------
def chunk_text(text, max_chars=1200):
    if not text:
        return []
    chunks = []
    while len(text) > max_chars:
        split_pos = text[:max_chars].rfind(". ")
        if split_pos == -1:
            split_pos = max_chars
        chunks.append(text[:split_pos].strip())
        # Skip the ". " delimiter (2 characters)
        text = text[split_pos + 2:].strip() if split_pos + 2 < len(text) else text[split_pos:].strip()
    if text.strip():
        chunks.append(text.strip())
    return chunks


# -------------------------------------
# Step 4 — Create embedding
# -------------------------------------
def embed(text):
    response = cohere_client.embed(
        model=EMBED_MODEL,
        input_type="search_document",  # Use search_document for indexing documents
        texts=[text],
    )
    return response.embeddings[0]  # Return the first embedding


# -------------------------------------
# Step 5 — Store in Qdrant
# -------------------------------------
def create_collection():
    print("\nCreating Qdrant collection...")
    qdrant_client.recreate_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=VectorParams(
        size=1024,        # Cohere embed-english-v3.0 dimension
        distance=Distance.COSINE
        )
    )

def save_chunk_to_qdrant(chunk, chunk_id, url):
    try:
        vector = embed(chunk)
        qdrant_client.upsert(
            collection_name=COLLECTION_NAME,
            points=[
                PointStruct(
                    id=chunk_id,
                    vector=vector,
                    payload={
                        "url": url,
                        "text": chunk,
                        "chunk_id": chunk_id
                    }
                )
            ]
        )
        return True
    except Exception as e:
        print(f"[ERROR] Failed to save chunk {chunk_id}: {str(e)}")
        return False


# -------------------------------------
# MAIN INGESTION PIPELINE
# -------------------------------------
def ingest_book():
    try:
        urls = get_all_urls(SITEMAP_URL)
        print(f"\nTotal URLs found: {len(urls)}")

        create_collection()

        global_id = 1
        total_chunks = 0
        failed_chunks = 0

        for url in urls:
            print("\nProcessing:", url)
            try:
                text = extract_text_from_url(url)

                if not text:
                    print(f"[SKIP] No text extracted from: {url}")
                    continue

                chunks = chunk_text(text)
                print(f"  → Created {len(chunks)} chunks from this URL")

                for ch in chunks:
                    if not ch or len(ch.strip()) == 0:
                        continue
                    success = save_chunk_to_qdrant(ch, global_id, url)
                    if success:
                        print(f"  ✓ Saved chunk {global_id} (length: {len(ch)} chars)")
                        total_chunks += 1
                    else:
                        failed_chunks += 1
                    global_id += 1
            except Exception as e:
                print(f"[ERROR] Failed to process URL {url}: {str(e)}")
                continue

        print("\n✔️ Ingestion completed!")
        print(f"Total chunks stored: {total_chunks}")
        print(f"Failed chunks: {failed_chunks}")
        print(f"Total chunk IDs used: {global_id - 1}")
    except Exception as e:
        print(f"\n[FATAL ERROR] Ingestion failed: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    ingest_book()