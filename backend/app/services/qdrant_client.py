"""
Qdrant vector database client service.

Provides initialization and management of Qdrant collections for storing
and retrieving embeddings with bot-specific filtering.
"""

import logging
from typing import Optional

from qdrant_client import QdrantClient
from qdrant_client.http import models

from app.config import get_settings
from app.services.config_service import get_system_setting

logger = logging.getLogger(__name__)
settings = get_settings()

# Global client instance
_qdrant_client: Optional[QdrantClient] = None

# Constants
DISTANCE_METRIC = models.Distance.COSINE


def get_qdrant_client() -> QdrantClient:
    """Get or create Qdrant client singleton."""
    global _qdrant_client

    if _qdrant_client is None:
        try:
            if settings.qdrant_url:
                # Server mode
                logger.info(f"Connecting to Qdrant server at {settings.qdrant_url}")
                _qdrant_client = QdrantClient(
                    url=settings.qdrant_url,
                    api_key=settings.qdrant_api_key,
                    timeout=30,
                )
            else:
                # Local mode
                logger.info(f"Initializing local Qdrant at {settings.qdrant_path}")
                _qdrant_client = QdrantClient(path=settings.qdrant_path)

            logger.info("Qdrant client initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize Qdrant client: {e}")
            raise ConnectionError(f"Unable to connect to Qdrant: {e}")

    return _qdrant_client


async def get_collection_config(vector_size: int = 1536) -> str:
    """
    Get dynamic collection name based on vector size.
    """
    if vector_size == 384:
        return "myndulon_embeddings_local"
    else:
        return "myndulon_embeddings"


async def init_collection() -> None:
    """Initialize Qdrant collections for both providers."""
    client = get_qdrant_client()
    
    # Define both collection types to ensure they exist
    configs = [
        ("myndulon_embeddings", 1536),      # OpenAI
        ("myndulon_embeddings_local", 384), # Local
    ]

    try:
        collections = client.get_collections().collections
        existing_names = [col.name for col in collections]

        for name, size in configs:
            if name in existing_names:
                logger.info(f"Collection '{name}' already exists")
                continue

            # Create collection
            logger.info(f"Creating collection '{name}' (size={size})")
            client.create_collection(
                collection_name=name,
                vectors_config=models.VectorParams(
                    size=size,
                    distance=DISTANCE_METRIC,
                ),
            )

            # Create payload index
            client.create_payload_index(
                collection_name=name,
                field_name="bot_id",
                field_schema=models.PayloadSchemaType.KEYWORD,
            )
            
            logger.info(f"Collection '{name}' created successfully")

    except Exception as e:
        logger.error(f"Failed to initialize collections: {e}")
        # We raise here because if DB is down, app calls might fail anyway, 
        # but main.py might handle it. Use raise to be safe or log and pass.
        # Original code raised.
        raise


async def health_check() -> dict:
    """Check Qdrant health."""
    try:
        client = get_qdrant_client()
        collections = client.get_collections()
        mode = "server" if settings.qdrant_url else "local"

        return {
            "healthy": True,
            "collections": len(collections.collections),
            "mode": mode,
        }

    except Exception as e:
        logger.error(f"Qdrant health check failed: {e}")
        return {"healthy": False, "error": str(e)}

async def upsert_vectors(
    bot_id: str,
    vectors: list[tuple[str, list[float], dict]],
) -> None:
    """Upsert vectors into the correct collection based on dimension."""
    if not vectors:
        return

    client = get_qdrant_client()
    
    # Determine collection based on first vector's dimension
    vector_size = len(vectors[0][1])
    collection_name = await get_collection_config(vector_size)

    try:
        points = []
        for point_id, embedding, payload in vectors:
            full_payload = {"bot_id": bot_id, **payload}
            points.append(
                models.PointStruct(
                    id=point_id,
                    vector=embedding,
                    payload=full_payload,
                )
            )

        client.upsert(
            collection_name=collection_name,
            points=points,
        )

        logger.info(f"Upserted {len(points)} vectors to '{collection_name}' (size={vector_size}) for bot {bot_id}")

    except Exception as e:
        logger.error(f"Failed to upsert vectors: {e}")
        raise


async def search_vectors(
    bot_id: str,
    query_embedding: list[float],
    limit: int = 5,
    similarity_threshold: float = 0.7,
) -> list[dict]:
    """Search for similar vectors in the correct collection."""
    client = get_qdrant_client()
    
    # Determine collection based on query dimension
    vector_size = len(query_embedding)
    collection_name = await get_collection_config(vector_size)

    try:
        results = client.query_points(
            collection_name=collection_name,
            query=query_embedding,
            query_filter=models.Filter(
                must=[
                    models.FieldCondition(
                        key="bot_id",
                        match=models.MatchValue(value=bot_id),
                    )
                ]
            ),
            limit=limit,
            score_threshold=similarity_threshold,
        )

        formatted_results = []
        for point in results.points:
            formatted_results.append(
                {
                    "id": point.id,
                    "score": point.score,
                    "payload": point.payload,
                }
            )

        return formatted_results

    except Exception as e:
        logger.error(f"Failed to search vectors: {e}")
        raise


async def delete_vectors(bot_id: str) -> int:
    """Delete vectors for a bot from ALL collections to ensure cleanup."""
    client = get_qdrant_client()
    
    # Clean up from both collections just in case
    collections = ["myndulon_embeddings", "myndulon_embeddings_local"]
    total_deleted = 0

    try:
        for name in collections:
            # Check if exists first to avoid error
            try:
                client.get_collection(name)
            except Exception:
                continue

            client.delete(
                collection_name=name,
                points_selector=models.FilterSelector(
                    filter=models.Filter(
                        must=[
                            models.FieldCondition(
                                key="bot_id",
                                match=models.MatchValue(value=bot_id),
                            )
                        ]
                    )
                ),
            )
            total_deleted += 1

        return total_deleted

    except Exception as e:
        logger.error(f"Failed to delete vectors: {e}")
        # Don't fail if just cleanup
        return 0


async def close_client() -> None:
    """Close Qdrant client connection."""
    global _qdrant_client

    if _qdrant_client is not None:
        try:
            _qdrant_client.close()
            logger.info("Qdrant client closed")
        except Exception as e:
            logger.error(f"Error closing Qdrant client: {e}")
        finally:
            _qdrant_client = None
