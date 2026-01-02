"""
Application configuration using Pydantic Settings.

Loads environment variables from .env file and provides typed configuration.
"""

from functools import lru_cache
from pathlib import Path
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # App Info
    app_name: str = "Myndulon"
    app_version: str = "0.1.0"
    debug: bool = False

    # API Keys (Required)
    # API Keys
    openai_api_key: Optional[str] = None  # Make optional to support local mode
    secret_key: str

    # Admin Account (First-time setup)
    admin_username: str = "admin"
    admin_password: str

    # Database
    database_url: str = "sqlite+aiosqlite:///./data/chatbots.db"

    # Qdrant Vector Database
    qdrant_path: str = "./data/qdrant"  # Local mode path
    qdrant_url: Optional[str] = None  # Server mode URL (overrides path if set)
    qdrant_api_key: Optional[str] = None  # For Qdrant Cloud or secured instances

    # File Storage
    upload_path: str = "./data/uploads"
    avatar_max_size_kb: int = 500

    # AI/Chat Settings
    message_limit_default: int = 1000
    max_scrape_words: int = 10000
    embedding_model: str = "text-embedding-3-small"
    ai_provider: str = "openai"  # openai, local
    ollama_base_url: str = "http://host.docker.internal:11434"
    embedding_model: str = "text-embedding-3-small"
    chat_model: str = "gpt-4o-mini"
    local_embedding_model: str = "BAAI/bge-small-en-v1.5"
    local_chat_model: str = "llama3"

    # Session/Auth
    access_token_expire_minutes: int = 10080  # 7 days
    session_cookie_name: str = "session_token"

    # CORS
    cors_origins: str = "*"  # Comma-separated list or "*"

    # Logging
    log_level: str = "INFO"

    # Optional API Keys (for future features)
    google_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    clerk_secret_key: Optional[str] = None
    clerk_webhook_secret: Optional[str] = None
    stripe_secret_key: Optional[str] = None
    stripe_publishable_key: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse CORS origins from comma-separated string."""
        if self.cors_origins == "*":
            return ["*"]
        return [origin.strip() for origin in self.cors_origins.split(",")]

    @property
    def use_qdrant_server(self) -> bool:
        """Check if Qdrant server mode should be used."""
        return self.qdrant_url is not None

    def ensure_data_directories(self) -> None:
        """Create data directories if they don't exist."""
        Path("./data").mkdir(exist_ok=True)
        Path(self.upload_path).mkdir(parents=True, exist_ok=True)
        Path(f"{self.upload_path}/avatars").mkdir(parents=True, exist_ok=True)

        if not self.use_qdrant_server:
            Path(self.qdrant_path).mkdir(parents=True, exist_ok=True)


@lru_cache
def get_settings() -> Settings:
    """
    Get cached settings instance.

    Uses lru_cache to ensure settings are only loaded once.
    """
    return Settings()
