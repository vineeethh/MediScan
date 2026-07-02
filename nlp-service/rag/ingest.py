"""
RAG Ingestion Script — MediScan
Loads Indian medical knowledge base, chunks with LangChain,
embeds with HuggingFace sentence-transformers, stores in Qdrant.
Run once: python3.12 rag/ingest.py
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).parent.parent.parent / "backend" / ".env"
load_dotenv(dotenv_path=env_path)

QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
COLLECTION_NAME = "mediscan_knowledge"

if not QDRANT_URL or not QDRANT_API_KEY:
    print("ERROR: QDRANT_URL and QDRANT_API_KEY must be set in backend/.env")
    sys.exit(1)

from langchain_community.document_loaders import TextLoader, DirectoryLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_qdrant import QdrantVectorStore
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams

KNOWLEDGE_BASE_DIR = Path(__file__).parent / "knowledge_base"


def ingest():
    print("=== MediScan RAG Ingestion (semantic embeddings) ===")

    # Load documents
    loader = DirectoryLoader(
        str(KNOWLEDGE_BASE_DIR),
        glob="**/*.txt",
        loader_cls=TextLoader,
        loader_kwargs={"encoding": "utf-8"}
    )
    docs = loader.load()
    print(f"Loaded {len(docs)} documents")

    # Chunk
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=600,
        chunk_overlap=100,
        separators=["\n\n===", "\n\n", "\n", ". ", " "]
    )
    chunks = splitter.split_documents(docs)
    print(f"Created {len(chunks)} chunks")

    # Embed — all-MiniLM-L6-v2 (384-dim, fast, good semantic similarity)
    print("Loading embedding model (first run downloads ~90MB)...")
    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2",
        model_kwargs={"device": "cpu"},
        encode_kwargs={"normalize_embeddings": True}
    )

    # Setup Qdrant collection
    client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
    existing = [c.name for c in client.get_collections().collections]
    if COLLECTION_NAME in existing:
        print(f"Deleting existing collection '{COLLECTION_NAME}'...")
        client.delete_collection(COLLECTION_NAME)
    client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=VectorParams(size=384, distance=Distance.COSINE)
    )
    print(f"Collection '{COLLECTION_NAME}' created")

    # Embed and store
    print("Embedding and storing chunks (this takes ~1-2 minutes)...")
    vector_store = QdrantVectorStore(
        client=client,
        collection_name=COLLECTION_NAME,
        embedding=embeddings
    )
    vector_store.add_documents(chunks)
    print(f"Successfully stored {len(chunks)} chunks in Qdrant")
    print("Ingestion complete.")


if __name__ == "__main__":
    ingest()
