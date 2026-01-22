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

    # Netdata integration
    NETDATA_URL: str = "http://127.0.0.1:19999"

    # Single admin user for v1 (no database)
    ADMIN_USERNAME: str = "admin"
    # Default hash is for password "changeme" - MUST be changed in production
    # Generate new hash with: python -c "from passlib.context import CryptContext; print(CryptContext(schemes=['bcrypt'], deprecated='auto').hash('your-password'))"
    ADMIN_PASSWORD_HASH: str = "$2b$12$vs/ix375dRw/VmooY89/QOuv1OGOQZ5AfTAQWTf5sIlSJdNT1fgQW"

    model_config = {
        "env_prefix": "WO_DASHBOARD_",
        "case_sensitive": False,
    }


# Singleton instance for application use
settings = Settings()
