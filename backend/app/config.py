"""Application configuration via pydantic-settings."""
from __future__ import annotations

from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Deployment settings. The relative SQLite path is resolved from backend/.
    DATABASE_URL: str = "sqlite:///./db.sqlite3"
    ENV: str = "dev"
    PORT: int = 8000

    # CORS is supplied as a comma-separated environment variable.
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]

    # Public POST limiter. These values are intentionally modest demo defaults.
    RATE_LIMIT_MAX_REQUESTS: int = 30
    RATE_LIMIT_WINDOW_SECONDS: int = 60

    # Default creator (no real auth in this project)
    DEFAULT_USER_EMAIL: str = "creator@example.com"
    DEFAULT_USER_NAME: str = "Default Creator"

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",")]
        return value

    @field_validator("CORS_ORIGINS")
    @classmethod
    def reject_wildcard_cors(cls, value: List[str]) -> List[str]:
        if "*" in value:
            raise ValueError("CORS_ORIGINS must list explicit origins; '*' is not allowed")
        return value


settings = Settings()
