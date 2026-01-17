"""Configuration settings for WordOps Dashboard API."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables.

    Environment variables should be prefixed with WO_DASHBOARD_.
    Example: WO_DASHBOARD_SECRET_KEY=mysecret
    """

    SECRET_KEY: str = "development-secret-key-change-in-production"
    DEBUG: bool = True
    CORS_ORIGINS: list[str] = ["*"]

    model_config = {
        "env_prefix": "WO_DASHBOARD_",
        "case_sensitive": False,
    }


# Singleton instance for application use
settings = Settings()
