"""
Embeddings service for generating and storing vector embeddings.

Integrates with OpenAI API for text-embedding-3-small and stores
embeddings in Qdrant vector database.
"""

import logging
import uuid
from typing import List

from openai import AsyncOpenAI

from app.config import get_settings
from app.services.config_service import get_ai_config
from app.services.qdrant_client import upsert_vectors

settings = get_settings()
logger = logging.getLogger(__name__)

# OpenAI client singleton
_openai_client = None

# FastEmbed model singleton
_fastembed_model = None

# Embedding configuration
BATCH_SIZE = 100  # Max embeddings per API request


def get_openai_client(api_key: str = None) -> AsyncOpenAI:
    """Get or create OpenAI client singleton."""
    global _openai_client

    if _openai_client is None or (_openai_client.api_key != api_key and api_key is not None):
        key_to_use = api_key or settings.openai_api_key
        _openai_client = AsyncOpenAI(api_key=key_to_use)
        logger.info("OpenAI client initialized")

    return _openai_client


def get_fastembed_model():
    """Get or create FastEmbed model singleton."""
    global _fastembed_model

    if _fastembed_model is None:
        from fastembed import TextEmbedding

        logger.info(f"Loading FastEmbed model: {settings.local_embedding_model}")
        _fastembed_model = TextEmbedding(model_name=settings.local_embedding_model)
        logger.info("FastEmbed model loaded")

    return _fastembed_model


async def generate_embeddings_openai(texts: List[str], api_key: str) -> List[List[float]]:
    """Generate embeddings using OpenAI API."""
    client = get_openai_client(api_key)
    all_embeddings = []

    # Process in batches
    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i : i + BATCH_SIZE]
        batch_num = i // BATCH_SIZE + 1
        total_batches = (len(texts) + BATCH_SIZE - 1) // BATCH_SIZE

        logger.info(
            f"Generating OpenAI embeddings for batch {batch_num}/{total_batches} "
            f"({len(batch)} texts)"
        )

        try:
            response = await client.embeddings.create(
                model=settings.embedding_model,
                input=batch,
            )

            # Extract embeddings in order
            batch_embeddings = [item.embedding for item in response.data]
            all_embeddings.extend(batch_embeddings)

        except Exception as e:
            logger.error(f"Failed to generate OpenAI embeddings: {e}")
            raise

    return all_embeddings


async def generate_embeddings_local(texts: List[str]) -> List[List[float]]:
    """Generate embeddings using FastEmbed (local CPU)."""
    model = get_fastembed_model()
    
    logger.info(f"Generating local embeddings for {len(texts)} texts...")
    
    # FastEmbed generator returns numpy arrays/lists
    embeddings_generator = model.embed(texts)
    
    # Convert generator to list of lists
    all_embeddings = [list(e) for e in embeddings_generator]
    
    logger.info(f"Generated {len(all_embeddings)} local embeddings")
    return all_embeddings


from app.models import Bot

async def generate_embeddings(texts: List[str], bot: Bot = None) -> List[List[float]]:
    """
    Generate embeddings for texts using configured provider.
    Priority:
    1. If bot is provided and bot.provider is local/ollama/custom/huggingface -> Use Local (FastEmbed)
    2. If global config is local -> Use Local
    3. Else -> Use OpenAI
    """
    if not texts:
        logger.warning("Empty text list provided for embedding")
        return []

    config = await get_ai_config()
    
    # Determine if we should use local embeddings
    use_local = False
    
    if bot:
        # If bot is configured for ANY non-OpenAI provider, use local embeddings
        # This prevents OpenAI quota errors for users expecting a fully local/free stack
        if bot.provider in ["local", "ollama", "custom", "huggingface"]:
            use_local = True
    
    if config.get("ai_provider") == "local":
        use_local = True

    if use_local:
        return await generate_embeddings_local(texts)
    else:
        # Fallback to OpenAI
        api_key = config.get("openai_api_key")
        return await generate_embeddings_openai(texts, api_key)


async def embed_and_store(
    bot_id: str,
    chunks: List[dict],
    bot: Bot = None
) -> int:
    """
    Generate embeddings for chunks and store in Qdrant.
    """
    if not chunks:
        logger.warning("No chunks provided for embedding")
        return 0

    logger.info(f"Embedding and storing {len(chunks)} chunks for bot {bot_id}")

    # Extract texts for embedding
    texts = [chunk["text"] for chunk in chunks]

    # Generate embeddings (pass bot to decide provider)
    embeddings = await generate_embeddings(texts, bot)

    if len(embeddings) != len(chunks):
        raise ValueError(
            f"Embedding count mismatch: got {len(embeddings)}, expected {len(chunks)}"
        )

    # Prepare vectors for Qdrant
    vectors = []
    for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
        point_id = str(uuid.uuid4())

        payload = {
            "text": chunk["text"],
            "chunk_index": chunk.get("index", i),
            "source": chunk.get("source", ""),
            "token_count": chunk.get("token_count", 0),
        }

        vectors.append((point_id, embedding, payload))

    # Store in Qdrant
    await upsert_vectors(bot_id, vectors)

    logger.info(f"Successfully stored {len(vectors)} vectors for bot {bot_id}")

    return len(vectors)


async def generate_query_embedding(query: str, bot: Bot = None) -> List[float]:
    """
    Generate embedding for a query string.
    """
    logger.info(f"Generating query embedding: {query[:100]}...")

    # Reuse generate_embeddings logic for consistency
    embeddings = await generate_embeddings([query], bot)
    
    if not embeddings:
        raise ValueError("Failed to generate query embedding")
        
    return embeddings[0]
