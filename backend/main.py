"""WordOps Dashboard API - Main FastAPI application."""

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.auth.dependencies import get_current_user
from backend.auth.models import User
from backend.auth.routes import router as auth_router
from backend.config import settings
from backend.wordops.routes import router as sites_router

app = FastAPI(
    title="WordOps Dashboard API",
    version="0.1.0",
    description="API for managing WordOps servers through a web interface",
)

# Configure CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check() -> dict:
    """Health check endpoint for monitoring."""
    return {"status": "healthy", "version": "0.1.0"}


@app.get("/api/v1/health")
async def api_health_check() -> dict:
    """API versioned health check endpoint."""
    return {"status": "healthy", "version": "0.1.0"}


# Include authentication routes
app.include_router(auth_router)

# Include sites routes
app.include_router(sites_router)


@app.get("/api/v1/protected")
async def protected_endpoint(current_user: User = Depends(get_current_user)) -> dict:
    """Protected endpoint requiring authentication.

    Requires valid JWT token in Authorization header.
    """
    return {"message": "Access granted", "user": current_user.username}
