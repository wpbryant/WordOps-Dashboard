"""Server metrics, service status, and log streaming API routes for WordOps Dashboard."""

import asyncio
import time

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status

from backend.auth.dependencies import get_current_user
from backend.auth.models import User
from backend.auth.utils import decode_token
from backend.server.logs import tail_log, validate_log_type
from backend.server.models import LogEntry, LogType, ServiceStatus, SystemMetrics, TimeRange
from backend.server.netdata import get_system_metrics
from backend.server.services import get_all_services, get_service_status, restart_service
from backend.server.websocket import log_manager

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


@router.get("/services", response_model=list[ServiceStatus])
async def list_services(
    current_user: User = Depends(get_current_user),
) -> list[ServiceStatus]:
    """Get status of all installed services.

    Args:
        current_user: Authenticated user (injected via dependency)

    Returns:
        List of ServiceStatus for installed services from the allowlist

    Raises:
        HTTPException: 503 if systemctl commands fail
    """
    try:
        services = await get_all_services()
        return services
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        )
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Timeout querying service status",
        )


@router.get("/services/{service_name}", response_model=ServiceStatus)
async def get_service(
    service_name: str,
    current_user: User = Depends(get_current_user),
) -> ServiceStatus:
    """Get status of a specific service.

    Args:
        service_name: Name of the service to query
        current_user: Authenticated user (injected via dependency)

    Returns:
        ServiceStatus for the requested service

    Raises:
        HTTPException: 400 if service not in allowlist, 404 if not installed, 503 on error
    """
    try:
        service_status = await get_service_status(service_name)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        )
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Timeout querying service {service_name}",
        )

    if service_status is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Service '{service_name}' is not installed",
        )

    return service_status


@router.post("/services/{service_name}/restart")
async def restart_service_endpoint(
    service_name: str,
    current_user: User = Depends(get_current_user),
) -> dict:
    """Restart a specific service.

    Args:
        service_name: Name of the service to restart
        current_user: Authenticated user (injected via dependency)

    Returns:
        Success message

    Raises:
        HTTPException: 400 if service not in allowlist, 503 if restart fails
    """
    try:
        await restart_service(service_name)
        return {"success": True, "message": f"Service {service_name} restarted"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        )
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Timeout restarting service {service_name}",
        )


@router.get("/logs/{log_type}", response_model=LogEntry)
async def get_logs(
    log_type: str,
    current_user: User = Depends(get_current_user),
    lines: int = Query(50, ge=1, le=500),
) -> LogEntry:
    """Get recent lines from a log file.

    Args:
        log_type: Type of log (nginx-access, nginx-error, php-fpm, mysql)
        current_user: Authenticated user (injected via dependency)
        lines: Number of lines to return (1-500, default 50)

    Returns:
        LogEntry with log lines and metadata

    Raises:
        HTTPException: 400 if log type is invalid
    """
    if not validate_log_type(log_type):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid log type: {log_type}. Valid types: {', '.join(LogType._value2member_map_.keys())}",
        )

    log_lines = await tail_log(log_type, lines)
    return LogEntry(
        lines=log_lines,
        log_type=LogType(log_type),
        timestamp=int(time.time()),
    )


@router.websocket("/logs/{log_type}/ws")
async def log_stream(
    websocket: WebSocket,
    log_type: str,
    token: str = Query(...),
) -> None:
    """WebSocket endpoint for streaming log updates.

    Args:
        websocket: The WebSocket connection
        log_type: Type of log to stream (nginx-access, nginx-error, php-fpm, mysql)
        token: JWT authentication token (query parameter)

    Closes with:
        4000: Invalid log type
        4001: Invalid or expired token
    """
    # Validate token
    try:
        token_data = decode_token(token)
        if token_data is None:
            await websocket.close(code=4001)
            return
    except Exception:
        await websocket.close(code=4001)
        return

    # Validate log type
    if not validate_log_type(log_type):
        await websocket.close(code=4000)
        return

    await log_manager.connect(websocket, log_type)
    try:
        # Send initial lines
        lines = await tail_log(log_type, 50)
        await log_manager.send_lines(websocket, lines)

        # Poll for updates every 2 seconds
        while True:
            await asyncio.sleep(2)
            lines = await tail_log(log_type, 50)
            await log_manager.send_lines(websocket, lines)
    except WebSocketDisconnect:
        log_manager.disconnect(websocket, log_type)
    except Exception:
        log_manager.disconnect(websocket, log_type)
