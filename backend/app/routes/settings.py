"""
Settings routes for admin dashboard.

Endpoints:
- GET /api/admin/config - Get current system configuration
- PUT /api/admin/config - Update system configuration
"""

import logging
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.dependencies import get_current_admin
from app.models import AdminSession
from app.services.config_service import get_ai_config, set_system_setting

logger = logging.getLogger(__name__)

router = APIRouter()


class ConfigResponse(BaseModel):
    ai_provider: str
    openai_api_key: str | None
    ollama_base_url: str
    base_url: str
    model_name: str
    huggingface_api_key: str | None


class ConfigUpdate(BaseModel):
    ai_provider: Literal["openai", "local", "custom", "huggingface"]
    openai_api_key: str | None = None
    ollama_base_url: str | None = None
    base_url: str | None = None
    model_name: str | None = None
    huggingface_api_key: str | None = None


@router.get("/config", response_model=ConfigResponse)
async def get_config(
    admin: AdminSession = Depends(get_current_admin),
):
    """
    Get current AI configuration.
    """
    config = await get_ai_config()
    return config


@router.put("/config", response_model=ConfigResponse)
async def update_config(
    data: ConfigUpdate,
    admin: AdminSession = Depends(get_current_admin),
):
    """
    Update AI configuration.
    """
    await set_system_setting("AI_PROVIDER", data.ai_provider)
    
    if data.openai_api_key is not None:
        await set_system_setting("OPENAI_API_KEY", data.openai_api_key)
        
    if data.ollama_base_url:
        await set_system_setting("OLLAMA_BASE_URL", data.ollama_base_url)

    if data.base_url is not None:
        await set_system_setting("CUSTOM_BASE_URL", data.base_url)

    if data.model_name is not None:
        await set_system_setting("CUSTOM_MODEL_NAME", data.model_name)
    
    if data.huggingface_api_key is not None:
        await set_system_setting("HUGGINGFACE_API_KEY", data.huggingface_api_key)
        
    logger.info(f"Admin {admin.username} updated system configuration")
    
    return await get_ai_config()
