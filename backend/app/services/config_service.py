"""
Configuration service for dynamic system settings.

Provides functions to get and set system settings, handling the priority
between database-stored settings and environment variables.
"""

import logging
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import AsyncSessionLocal
from app.models import SystemSetting

settings = get_settings()
logger = logging.getLogger(__name__)


async def get_system_setting(key: str, default: Optional[str] = None) -> Optional[str]:
    """
    Get a system setting from the database.
    
    Args:
        key: Setting key
        default: Default value if not found
        
    Returns:
        Setting value or default
    """
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(SystemSetting).where(SystemSetting.key == key))
        setting = result.scalar_one_or_none()
        
        if setting:
            return setting.value
            
        return default


async def set_system_setting(key: str, value: str) -> SystemSetting:
    """
    Set a system setting in the database.
    
    Args:
        key: Setting key
        value: Setting value
        
    Returns:
        Updated setting object
    """
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(SystemSetting).where(SystemSetting.key == key))
        setting = result.scalar_one_or_none()
        
        if setting:
            setting.value = value
        else:
            setting = SystemSetting(key=key, value=value)
            db.add(setting)
            
        await db.commit()
        await db.refresh(setting)
        
        return setting


async def get_ai_config() -> dict:
    """
    Get current AI configuration with DB overrides.
    
    Returns:
        Dictionary with current config values
    """
    # Get values from DB or fall back to env settings
    provider = await get_system_setting("AI_PROVIDER", settings.ai_provider)
    openai_key = await get_system_setting("OPENAI_API_KEY", settings.openai_api_key)
    ollama_url = await get_system_setting("OLLAMA_BASE_URL", settings.ollama_base_url)
    
    return {
        "ai_provider": provider,
        "openai_api_key": openai_key,
        "ollama_base_url": ollama_url,
    }
