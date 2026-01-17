"""Authentication dependencies for FastAPI routes."""

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from backend.auth.models import TokenData, User
from backend.auth.utils import decode_token
from backend.config import settings

# OAuth2 scheme for token extraction from Authorization header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    """Validate JWT token and return current user.

    Args:
        token: JWT token from Authorization header

    Returns:
        User object for the authenticated user

    Raises:
        HTTPException: 401 if token is invalid or expired
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token_data: TokenData | None = decode_token(token)
    if token_data is None or token_data.username is None:
        raise credentials_exception

    # For v1, we only have one admin user defined in config
    if token_data.username != settings.ADMIN_USERNAME:
        raise credentials_exception

    return User(
        username=settings.ADMIN_USERNAME,
        hashed_password=settings.ADMIN_PASSWORD_HASH,
    )
