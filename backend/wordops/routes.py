"""Sites API routes for WordOps Dashboard."""

from fastapi import APIRouter, Depends, HTTPException, Query, status

from backend.auth.dependencies import get_current_user
from backend.auth.models import User
from backend.wordops.exceptions import WordOpsError
from backend.wordops.models import Site, SiteType
from backend.wordops.sites import list_sites

router = APIRouter(prefix="/api/v1/sites", tags=["sites"])


@router.get("/", response_model=list[Site])
async def get_sites(
    current_user: User = Depends(get_current_user),
    site_type: SiteType | None = Query(None, alias="type"),
    ssl: bool | None = Query(None),
    search: str | None = Query(None, min_length=1, max_length=253),
) -> list[Site]:
    """List all WordOps managed sites with optional filtering.

    Args:
        current_user: Authenticated user (injected via dependency)
        site_type: Filter by site type (wordpress, php, html, proxy, mysql)
        ssl: Filter by SSL status (true/false)
        search: Filter by domain name substring (case-insensitive)

    Returns:
        List of Site objects matching the filters

    Raises:
        HTTPException: 503 if WordOps CLI fails
    """
    try:
        sites = await list_sites()
    except WordOpsError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"WordOps service error: {e.message}",
        )

    # Apply filters
    if site_type is not None:
        sites = [s for s in sites if s.type == site_type.value]

    if ssl is not None:
        sites = [s for s in sites if s.ssl == ssl]

    if search is not None:
        sites = [s for s in sites if search.lower() in s.name.lower()]

    return sites
