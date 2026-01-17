"""WordOps Dashboard API - Main FastAPI application."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import settings

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
