"""
Chat service with RAG (Retrieval-Augmented Generation).

Provides intelligent chatbot responses by:
1. Embedding user questions
2. Retrieving relevant context from Qdrant
3. Generating responses using OpenAI or Ollama with context
"""

import logging
import json
import httpx
from typing import AsyncGenerator, List, Optional

from openai import AsyncOpenAI

from app.config import get_settings
from app.services.config_service import get_ai_config
from app.models import Bot, Message
from app.services.embeddings import generate_query_embedding
from app.services.qdrant_client import search_vectors

settings = get_settings()
logger = logging.getLogger(__name__)

# OpenAI client singleton (reuse from embeddings service)
_openai_client = None

# Chat configuration
MAX_CONTEXT_CHUNKS = 3  # Top N chunks to include in context
SIMILARITY_THRESHOLD = 0.6  # Minimum similarity score
MAX_CONVERSATION_HISTORY = 10  # Last N messages to include


def get_openai_client(api_key: Optional[str] = None) -> AsyncOpenAI:
    """Get or create OpenAI client singleton."""
    global _openai_client

    if _openai_client is None or (_openai_client.api_key != api_key and api_key is not None):
        key_to_use = api_key or settings.openai_api_key
        _openai_client = AsyncOpenAI(api_key=key_to_use)
        logger.info("OpenAI client initialized for chat")

    return _openai_client


def build_system_prompt(bot: Bot, context_chunks: List[dict]) -> str:
    """Build system prompt with bot context and retrieved knowledge."""
    bot_name = bot.name or "Assistant"

    # Build context section from retrieved chunks
    context_text = ""
    if context_chunks:
        context_text = "Context from knowledge base:\n\n"
        for i, chunk in enumerate(context_chunks, 1):
            text = chunk["payload"].get("text", "")
            score = chunk.get("score", 0)
            context_text += f"[{i}] (relevance: {score:.2f})\n{text}\n\n"

    # Build system prompt
    prompt = f"""You are {bot_name}, a helpful customer support assistant.

{context_text}

Instructions:
- Answer the user's question using ONLY the context provided above
- Be helpful, concise, and friendly
- If the answer is not in the context, respond: "I don't have that information in my knowledge base. Please contact our support team for assistance."
- Do not make up information or use knowledge outside the provided context
- If multiple pieces of context are relevant, synthesize them into a coherent answer
"""

    return prompt


def build_messages(
    system_prompt: str,
    conversation_history: List[Message],
    current_question: str,
) -> List[dict]:
    """Build messages array for chat completion."""
    messages = [{"role": "system", "content": system_prompt}]

    # Add conversation history (last N messages)
    for msg in conversation_history[-MAX_CONVERSATION_HISTORY:]:
        messages.append({"role": msg.role, "content": msg.content})

    # Add current question
    messages.append({"role": "user", "content": current_question})

    return messages


async def retrieve_context(bot_id: str, question: str) -> List[dict]:
    """Retrieve relevant context chunks for a question."""
    logger.info(f"Retrieving context for question: {question[:100]}...")

    # Generate embedding for question
    query_embedding = await generate_query_embedding(question)

    # Search Qdrant for similar chunks
    results = await search_vectors(
        bot_id=bot_id,
        query_embedding=query_embedding,
        limit=MAX_CONTEXT_CHUNKS,
        similarity_threshold=SIMILARITY_THRESHOLD,
    )

    if results:
        scores_str = ", ".join([f"{r['score']:.2f}" for r in results])
        logger.info(
            f"Retrieved {len(results)} chunks "
            f"(scores: {scores_str})"
        )
    else:
        logger.warning(f"No relevant context found for bot {bot_id}")

    return results


async def generate_response_openai(
    messages: List[dict],
    api_key: str
) -> AsyncGenerator[str, None]:
    """Stream response from OpenAI."""
    client = get_openai_client(api_key)

    try:
        stream = await client.chat.completions.create(
            model=settings.chat_model,
            messages=messages,
            stream=True,
            temperature=0.7,
            max_tokens=500,
        )

        async for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    except Exception as e:
        logger.error(f"OpenAI streaming failed: {e}")
        yield f"I apologize, but I encountered an error: {str(e)}"


async def generate_response_ollama(
    messages: List[dict],
    base_url: str
) -> AsyncGenerator[str, None]:
    """Stream response from Ollama."""
    url = f"{base_url.rstrip('/')}/api/chat"
    
    payload = {
        "model": settings.local_chat_model,
        "messages": messages,
        "stream": True,
        "options": {
            "temperature": 0.7,
            "num_predict": 500,
        }
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            async with client.stream("POST", url, json=payload) as response:
                if response.status_code != 200:
                    error_msg = await response.aread()
                    logger.error(f"Ollama API Error: {response.status_code} - {error_msg}")
                    yield f"Error calling Local AI: {response.status_code}"
                    return

                async for line in response.aiter_lines():
                    if not line:
                        continue
                    
                    try:
                        data = json.loads(line)
                        if "message" in data and "content" in data["message"]:
                            yield data["message"]["content"]
                        
                        if data.get("done"):
                            break
                    except json.JSONDecodeError:
                        continue

    except Exception as e:
        logger.error(f"Ollama streaming failed: {e}")
        yield f"I apologize, but I encountered an error connecting to Local AI: {str(e)}"


async def generate_response(
    bot: Bot,
    question: str,
    conversation_history: List[Message],
) -> AsyncGenerator[str, None]:
    """
    Generate streaming chat response using RAG.
    """
    logger.info(f"Generating response for bot {bot.id} ({bot.name})")

    # Retrieve relevant context
    context_chunks = await retrieve_context(bot.id, question)

    # Build system prompt with context
    system_prompt = build_system_prompt(bot, context_chunks)

    # Build messages array
    messages = build_messages(system_prompt, conversation_history, question)

    config = await get_ai_config()

    logger.info(
        f"Calling AI Provider ({config['ai_provider']}) with {len(messages)} messages"
    )

    if config["ai_provider"] == "local":
        async for token in generate_response_ollama(messages, config["ollama_base_url"]):
            yield token
    else:
        async for token in generate_response_openai(messages, config["openai_api_key"]):
            yield token

    logger.info(f"Response generation complete for bot {bot.id}")
