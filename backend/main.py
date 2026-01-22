"""WordOps Dashboard API - Main FastAPI application."""

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path

from backend.auth.dependencies import get_current_user
from backend.auth.models import User
from backend.auth.routes import router as auth_router
from backend.config import settings
from backend.server.routes import router as server_router
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

# Include server routes
app.include_router(server_router)


@app.get("/api/v1/protected")
async def protected_endpoint(current_user: User = Depends(get_current_user)) -> dict:
    """Protected endpoint requiring authentication.

    Requires valid JWT token in Authorization header.
    """
    return {"message": "Access granted", "user": current_user.username}


# =============================================================================
# Frontend Static Files
# =============================================================================

# Get the frontend build directory
frontend_dir = Path(__file__).parent.parent / "frontend" / "dist"

# Mount static files if the frontend has been built
if frontend_dir.exists():
    app.mount("/assets", StaticFiles(directory=str(frontend_dir / "assets")), name="assets")

    @app.get("/api/v1/{path:path}")
    async def api_catchall():
        """Return 404 for unmatched API routes."""
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=404, content={"detail": "Not Found"})

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """Serve the frontend SPA - return index.html for all non-API routes."""
        file_path = frontend_dir / full_path

        # If it's a file that exists, serve it
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)

        # Otherwise, return index.html for SPA routing
        index_file = frontend_dir / "index.html"
        if index_file.exists():
            return FileResponse(index_file)

        # Frontend not built
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=503,
            content={"detail": "Frontend not built. Run: cd frontend && npm run build"}
        )
else:
    @app.get("/")
    async def frontend_not_built():
        """Return message when frontend is not built."""
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=503,
            content={
                "detail": "Frontend not built. Run: cd /var/www/wo-dashboard/frontend && npm run build",
                "api_available": True,
                "api_docs": "/docs"
            }
        )
