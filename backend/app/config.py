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

    # Database
    DATABASE_URL: str = "sqlite:///./db.sqlite3"

    # CORS - comma-separated string in env, list here
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # Default creator (no real auth in this project)
    DEFAULT_USER_EMAIL: str = "creator@example.com"
    DEFAULT_USER_NAME: str = "Default Creator"

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",")]
        return value


settings = Settings()
