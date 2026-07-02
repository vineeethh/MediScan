"""
RAG Retriever — MediScan
Semantic similarity search via HuggingFace embeddings + Qdrant.
Singleton — model loaded once at startup.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).parent.parent.parent / "backend" / ".env"
load_dotenv(dotenv_path=env_path)

QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
COLLECTION_NAME = "mediscan_knowledge"

_vector_store = None


def _get_store():
    global _vector_store
    if _vector_store is None:
        from langchain_huggingface import HuggingFaceEmbeddings
        from langchain_qdrant import QdrantVectorStore
        from qdrant_client import QdrantClient

        embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2",
            model_kwargs={"device": "cpu"},
            encode_kwargs={"normalize_embeddings": True}
        )
        client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
        _vector_store = QdrantVectorStore(
            client=client,
            collection_name=COLLECTION_NAME,
            embedding=embeddings
        )
    return _vector_store


def retrieve(query: str, k: int = 3) -> list[dict]:
    """
    Returns top-k semantically relevant chunks for the given query.
    Each item: { "content": str, "source": str }
    """
    try:
        store = _get_store()
        results = store.similarity_search(query, k=k)
        return [
            {
                "content": doc.page_content,
                "source": os.path.basename(doc.metadata.get("source", "knowledge_base"))
            }
            for doc in results
        ]
    except Exception as e:
        print(f"[RAG Retriever] Error: {e}")
        return []


def retrieve_as_context(query: str, k: int = 3) -> str:
    """
    Returns retrieved chunks as a single formatted string
    ready to inject into the LLM system prompt.
    """
    chunks = retrieve(query, k=k)
    if not chunks:
        return ""
    parts = []
    for i, chunk in enumerate(chunks, 1):
        parts.append(f"[Reference {i} — {chunk['source']}]\n{chunk['content']}")
    return "\n\n".join(parts)
