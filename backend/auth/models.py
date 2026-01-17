"""Authentication models for WordOps Dashboard API."""

from pydantic import BaseModel


class LoginRequest(BaseModel):
    """Login request payload."""

    username: str
    password: str


class Token(BaseModel):
    """JWT token response."""

    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Decoded token data."""

    username: str | None = None


class User(BaseModel):
    """User model for internal use."""

    username: str
    hashed_password: str
