"""Sites API routes for WordOps Dashboard."""

from fastapi import APIRouter, Depends, HTTPException, Query, status

from backend.auth.dependencies import get_current_user
from backend.auth.models import User
from backend.wordops.exceptions import WordOpsError
from backend.wordops.models import Site, SiteType
from backend.wordops.sites import get_site_info, list_sites, validate_domain

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


@router.get("/{domain}", response_model=Site)
async def get_site(
    domain: str,
    current_user: User = Depends(get_current_user),
) -> Site:
    """Get detailed information about a specific site.

    Args:
        domain: The domain name of the site

    Returns:
        Site object with full details

    Raises:
        400: Invalid domain format
        404: Site not found
        503: WordOps command failed
    """
    # Validate domain format
    if not validate_domain(domain):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid domain format: {domain}",
        )

    try:
        site = await get_site_info(domain)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except WordOpsError as e:
        # WordOps command errors
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"WordOps error: {e.message}",
        )

    if site is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Site not found: {domain}",
        )

    return site
