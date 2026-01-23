"""Sites API routes for WordOps Dashboard."""

from fastapi import APIRouter, Depends, HTTPException, Query, status

from backend.auth.dependencies import get_current_user
from backend.auth.models import User
from backend.wordops.exceptions import WordOpsError
from backend.wordops.models import CreateSiteRequest, Site, SiteType, UpdateSiteRequest
from backend.wordops.sites import (
    create_site,
    delete_site,
    disable_site,
    enable_site,
    get_nginx_config,
    get_site_info,
    get_site_monitoring_info,
    list_sites,
    update_site,
    validate_domain,
)

router = APIRouter(prefix="/api/v1/sites", tags=["sites"])


@router.get("/health-check")
async def wordops_health_check(
    current_user: User = Depends(get_current_user),
) -> dict:
    """Check if WordOps CLI is available and working.

    Returns:
        Health status with WordOps version and availability
    """
    from backend.wordops.cli import check_wordops_available

    is_available = await check_wordops_available()
    return {
        "wordops_available": is_available,
        "status": "healthy" if is_available else "unavailable",
    }


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


@router.post("/", response_model=Site, status_code=status.HTTP_201_CREATED)
async def create_new_site(
    request: CreateSiteRequest,
    current_user: User = Depends(get_current_user),
) -> Site:
    """Create a new WordOps site.

    Args:
        request: Site creation parameters

    Returns:
        Created site details

    Raises:
        400: Invalid domain or parameters
        503: WordOps command failed
    """
    # Validate domain format
    if not validate_domain(request.domain):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid domain format: {request.domain}",
        )

    try:
        site = await create_site(
            domain=request.domain,
            site_type=SiteType(request.type) if isinstance(request.type, str) else request.type,
            ssl=request.ssl,
            cache=request.cache,
            php_version=request.php_version,
        )
        return site
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        # Log the full error for debugging
        import logging
        logging.error(f"Site creation error: {type(e).__name__}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Site creation failed: {str(e)}",
        )


@router.put("/{domain}", response_model=Site)
async def update_existing_site(
    domain: str,
    request: UpdateSiteRequest,
    current_user: User = Depends(get_current_user),
) -> Site:
    """Update an existing site's settings.

    Args:
        domain: The domain name of the site
        request: Fields to update (only provided fields are changed)

    Returns:
        Updated site details

    Raises:
        400: Invalid domain or parameters
        404: Site not found
        503: WordOps command failed
    """
    if not validate_domain(domain):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid domain format: {domain}",
        )

    try:
        site = await update_site(
            domain=domain,
            ssl=request.ssl,
            cache=request.cache,
            php_version=request.php_version,
        )
        return site
    except ValueError as e:
        error_msg = str(e).lower()
        if "not found" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e),
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Site update failed: {str(e)}",
        )


@router.delete("/{domain}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_site(
    domain: str,
    confirm: bool = Query(..., description="Must be true to confirm deletion"),
    current_user: User = Depends(get_current_user),
) -> None:
    """Delete a site permanently.

    Args:
        domain: The domain name of the site to delete
        confirm: Must be true to confirm deletion (safety check)

    Raises:
        400: Invalid domain, confirm not true, or other validation error
        404: Site not found
        503: WordOps command failed
    """
    if not confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Deletion requires confirm=true query parameter",
        )

    if not validate_domain(domain):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid domain format: {domain}",
        )

    try:
        await delete_site(domain=domain)
    except ValueError as e:
        error_msg = str(e).lower()
        if "not found" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e),
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Site deletion failed: {str(e)}",
        )


@router.get("/{domain}/monitoring")
async def get_site_monitoring(
    domain: str,
    current_user: User = Depends(get_current_user),
) -> dict:
    """Get monitoring information for a specific site.

    Args:
        domain: The domain name of the site
        current_user: Authenticated user (injected via dependency)

    Returns:
        Dictionary with disk_usage, bandwidth_month, and inodes_used

    Raises:
        400: Invalid domain format
        503: Failed to fetch monitoring data
    """
    if not validate_domain(domain):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid domain format: {domain}",
        )

    try:
        monitoring_info = await get_site_monitoring_info(domain)
        return monitoring_info
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to fetch monitoring data: {str(e)}",
        )


@router.get("/{domain}/nginx-config")
async def get_nginx_configuration(
    domain: str,
    current_user: User = Depends(get_current_user),
) -> dict:
    """Get the nginx configuration for a site.

    Args:
        domain: The domain name of the site
        current_user: Authenticated user (injected via dependency)

    Returns:
        Dictionary with the nginx configuration content

    Raises:
        400: Invalid domain format
        503: Failed to fetch nginx configuration
    """
    if not validate_domain(domain):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid domain format: {domain}",
        )

    try:
        config = await get_nginx_config(domain)
        return {"config": config}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to fetch nginx configuration: {str(e)}",
        )


@router.post("/{domain}/enable")
async def enable_site_endpoint(
    domain: str,
    current_user: User = Depends(get_current_user),
) -> dict:
    """Enable a disabled site.

    Args:
        domain: The domain name of the site
        current_user: Authenticated user (injected via dependency)

    Returns:
        Success message

    Raises:
        400: Invalid domain format
        503: Failed to enable site
    """
    if not validate_domain(domain):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid domain format: {domain}",
        )

    try:
        await enable_site(domain)
        return {"success": True, "message": f"Site {domain} enabled successfully"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to enable site: {str(e)}",
        )


@router.post("/{domain}/disable")
async def disable_site_endpoint(
    domain: str,
    current_user: User = Depends(get_current_user),
) -> dict:
    """Disable a site.

    Args:
        domain: The domain name of the site
        current_user: Authenticated user (injected via dependency)

    Returns:
        Success message

    Raises:
        400: Invalid domain format
        503: Failed to disable site
    """
    if not validate_domain(domain):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid domain format: {domain}",
        )

    try:
        await disable_site(domain)
        return {"success": True, "message": f"Site {domain} disabled successfully"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to disable site: {str(e)}",
        )
