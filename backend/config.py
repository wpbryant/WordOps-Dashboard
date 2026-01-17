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

    # JWT Authentication settings
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Single admin user for v1 (no database)
    ADMIN_USERNAME: str = "admin"
    # Default hash is for password "changeme" - MUST be changed in production
    # Generate new hash with: python -c "from passlib.context import CryptContext; print(CryptContext(schemes=['bcrypt']).hash('your-password'))"
    ADMIN_PASSWORD_HASH: str = "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.V0nOa.Lv4n/Ici"

    model_config = {
        "env_prefix": "WO_DASHBOARD_",
        "case_sensitive": False,
    }


# Singleton instance for application use
settings = Settings()
