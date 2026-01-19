"""Server metrics API routes for WordOps Dashboard."""

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status

from backend.auth.dependencies import get_current_user
from backend.auth.models import User
from backend.server.models import SystemMetrics, TimeRange
from backend.server.netdata import get_system_metrics

router = APIRouter(prefix="/api/v1/server", tags=["server"])


@router.get("/metrics", response_model=SystemMetrics)
async def get_metrics(
    current_user: User = Depends(get_current_user),
    range: TimeRange = Query(TimeRange.FIVE_MIN, alias="range"),
) -> SystemMetrics:
    """Get system metrics from Netdata.

    Args:
        current_user: Authenticated user (injected via dependency)
        range: Time range for historical data (5m, 1h, 24h)

    Returns:
        SystemMetrics with CPU, RAM, disk, and network data

    Raises:
        HTTPException: 503 if Netdata is unreachable or returns error
    """
    try:
        metrics = await get_system_metrics(range)
        return metrics
    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Netdata service unreachable. Ensure Netdata is running on port 19999.",
        )
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Netdata API error: {e.response.status_code}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to fetch metrics: {str(e)}",
        )
