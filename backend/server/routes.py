"""Server metrics, service status, and log streaming API routes for WordOps Dashboard."""

import asyncio
import time

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status

from backend.auth.dependencies import get_current_user
from backend.auth.models import User
from backend.auth.utils import decode_token
from backend.server.dns import get_dns_credentials
from backend.server.fail2ban import (
    get_fail2ban_status as get_fail2ban_status_impl,
    start_fail2ban as start_fail2ban_impl,
    stop_fail2ban as stop_fail2ban_impl,
    update_fail2ban_config as update_fail2ban_config_impl,
)
from backend.server.firewall import add_ufw_rule as add_ufw_rule_impl, delete_ufw_rule as delete_ufw_rule_impl, get_ufw_rules
from backend.server.logs import tail_log, validate_log_type
from backend.server.models import (
    DnsCredential,
    Fail2banConfig,
    Fail2banConfigUpdate,
    FirewallRule,
    FirewallRuleCreate,
    LogEntry,
    LogType,
    MonitoringAlert,
    MonitoringAlertCreate,
    MonitoringAlertUpdate,
    PackageUpdateRequest,
    PackageUpdateResponse,
    SSHConfig,
    SSHConfigUpdate,
    ServerOverviewInfo,
    ServiceStatus,
    StackServiceInfo,
    SystemInfo,
    SystemMetrics,
    TimeRange,
)
from backend.server.monitoring import create_alert, delete_alert, get_alerts, toggle_alert, update_alert
from backend.server.ssh import get_ssh_config as get_ssh_config_impl, update_ssh_config as update_ssh_config_impl
from backend.server.netdata import get_system_metrics
from backend.server.services import get_all_services, get_service_status, restart_service, get_stack_service_details, validate_service
from backend.server.system import get_server_overview, get_system_info
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


@router.get("/info", response_model=SystemInfo)
async def get_info(
    current_user: User = Depends(get_current_user),
) -> SystemInfo:
    """Get system information including hostname, uptime, and updates.

    Args:
        current_user: Authenticated user (injected via dependency)

    Returns:
        SystemInfo with hostname, boot time, and update counts
    """
    return await get_system_info()


@router.get("/overview", response_model=ServerOverviewInfo)
async def get_overview(
    current_user: User = Depends(get_current_user),
) -> ServerOverviewInfo:
    """Get server overview information including OS, kernel, WordOps version, and updates.

    Args:
        current_user: Authenticated user (injected via dependency)

    Returns:
        ServerOverviewInfo with complete server details

    Raises:
        HTTPException: 503 if unable to fetch server information
    """
    try:
        return await get_server_overview()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to fetch server overview: {str(e)}",
        )


@router.get("/security/dns-credentials", response_model=list[DnsCredential])
async def get_dns_credentials_endpoint(
    current_user: User = Depends(get_current_user),
) -> list[DnsCredential]:
    """Get configured DNS API credentials from acme.sh account.conf.

    Returns a list of configured DNS provider credentials for Let's Encrypt
    wildcard SSL certificate validation. API keys are masked for security.

    Args:
        current_user: Authenticated user (injected via dependency)

    Returns:
        List of DnsCredential objects with provider, email, and masked key preview

    Raises:
        HTTPException: 503 if unable to read credentials
    """
    try:
        return await get_dns_credentials()
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Timeout reading DNS credentials configuration",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to fetch DNS credentials: {str(e)}",
        )


@router.get("/security/firewall", response_model=list[FirewallRule])
async def get_firewall_rules_endpoint(
    current_user: User = Depends(get_current_user),
) -> list[FirewallRule]:
    """Get UFW firewall rules.

    Returns a list of all UFW firewall rules with their numbers, ports,
    protocols, actions, and source addresses.

    Args:
        current_user: Authenticated user (injected via dependency)

    Returns:
        List of FirewallRule objects representing current UFW rules

    Raises:
        HTTPException: 503 if unable to fetch firewall rules
    """
    try:
        return await get_ufw_rules()
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Timeout fetching firewall rules",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to fetch firewall rules: {str(e)}",
        )


@router.post("/security/firewall")
async def add_firewall_rule_endpoint(
    request: FirewallRuleCreate,
    current_user: User = Depends(get_current_user),
) -> dict:
    """Add a new UFW firewall rule.

    Creates a new firewall rule with the specified action, port, protocol,
    and source address.

    Args:
        request: Firewall rule creation request
        current_user: Authenticated user (injected via dependency)

    Returns:
        Success message

    Raises:
        HTTPException: 503 if unable to add rule
    """
    try:
        return await add_ufw_rule_impl(request)
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Timeout adding firewall rule",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to add firewall rule: {str(e)}",
        )


@router.delete("/security/firewall/{rule_id}")
async def delete_firewall_rule_endpoint(
    rule_id: str,
    current_user: User = Depends(get_current_user),
) -> dict:
    """Delete a UFW firewall rule by number.

    Deletes the firewall rule with the specified rule number.

    Args:
        rule_id: The rule number from ufw status numbered output
        current_user: Authenticated user (injected via dependency)

    Returns:
        Success message

    Raises:
        HTTPException: 503 if unable to delete rule
    """
    try:
        return await delete_ufw_rule_impl(rule_id)
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Timeout deleting firewall rule",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to delete firewall rule: {str(e)}",
        )


@router.get("/security/ssh", response_model=SSHConfig)
async def get_ssh_config_endpoint(
    current_user: User = Depends(get_current_user),
) -> SSHConfig:
    """Get SSH server configuration.

    Returns the current SSH configuration including port, root login settings,
    and password authentication status.

    Args:
        current_user: Authenticated user (injected via dependency)

    Returns:
        SSHConfig with current settings

    Raises:
        HTTPException: 503 if unable to read SSH config
    """
    try:
        return await get_ssh_config_impl()
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Timeout reading SSH configuration",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to fetch SSH configuration: {str(e)}",
        )


@router.put("/security/ssh")
async def update_ssh_config_endpoint(
    request: SSHConfigUpdate,
    current_user: User = Depends(get_current_user),
) -> dict:
    """Update SSH server configuration.

    Updates SSH settings and validates with sshd -t before applying.
    Changes take effect immediately via sshd reload.

    Args:
        request: SSH configuration update request
        current_user: Authenticated user (injected via dependency)

    Returns:
        Success message

    Raises:
        HTTPException: 400 if validation fails, 503 if unable to update
    """
    try:
        from backend.server.ssh import SSHConfig

        # Create full SSH config for update
        ssh_config = SSHConfig(
            port=request.port,
            permit_root_login=request.permit_root_login,
            password_authentication=request.password_authentication,
        )
        return await update_ssh_config_impl(ssh_config)
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Timeout updating SSH configuration",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to update SSH configuration: {str(e)}",
        )


@router.get("/security/fail2ban", response_model=Fail2banConfig)
async def get_fail2ban_status_endpoint(
    current_user: User = Depends(get_current_user),
) -> Fail2banConfig:
    """Get fail2ban status and configuration.

    Returns fail2ban service status, configuration values, banned IP count,
    and list of active jails.

    Args:
        current_user: Authenticated user (injected via dependency)

    Returns:
        Fail2banConfig with current settings

    Raises:
        HTTPException: 503 if unable to read fail2ban status
    """
    try:
        return await get_fail2ban_status_impl()
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Timeout reading fail2ban status",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to fetch fail2ban status: {str(e)}",
        )


@router.put("/security/fail2ban")
async def update_fail2ban_config_endpoint(
    request: Fail2banConfigUpdate,
    current_user: User = Depends(get_current_user),
) -> dict:
    """Update fail2ban configuration.

    Updates fail2ban settings in /etc/fail2ban/jail.d/custom-dashboard.conf
    and reloads the service.

    Args:
        request: Fail2ban configuration update request
        current_user: Authenticated user (injected via dependency)

    Returns:
        Success message

    Raises:
        HTTPException: 503 if unable to update config
    """
    try:
        return await update_fail2ban_config_impl(
            bantime=request.bantime,
            findtime=request.findtime,
            maxretry=request.maxretry,
            destemail=request.destemail,
        )
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Timeout updating fail2ban configuration",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to update fail2ban configuration: {str(e)}",
        )


@router.post("/security/fail2ban/start")
async def start_fail2ban_endpoint(
    current_user: User = Depends(get_current_user),
) -> dict:
    """Start the fail2ban service.

    Args:
        current_user: Authenticated user (injected via dependency)

    Returns:
        Success message

    Raises:
        HTTPException: 503 if unable to start service
    """
    try:
        return await start_fail2ban_impl()
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Timeout starting fail2ban service",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to start fail2ban: {str(e)}",
        )


@router.post("/security/fail2ban/stop")
async def stop_fail2ban_endpoint(
    current_user: User = Depends(get_current_user),
) -> dict:
    """Stop the fail2ban service.

    Args:
        current_user: Authenticated user (injected via dependency)

    Returns:
        Success message

    Raises:
        HTTPException: 503 if unable to stop service
    """
    try:
        return await stop_fail2ban_impl()
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Timeout stopping fail2ban service",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to stop fail2ban: {str(e)}",
        )


@router.post("/packages/update", response_model=PackageUpdateResponse)
async def update_packages(
    request: PackageUpdateRequest,
    current_user: User = Depends(get_current_user),
) -> PackageUpdateResponse:
    """Update system packages.

    Args:
        request: Package update request with update_type ('all' or 'security')
        current_user: Authenticated user (injected via dependency)

    Returns:
        PackageUpdateResponse with status, message, and updated count

    Raises:
        HTTPException: 503 if package update fails
    """
    try:
        update_type = request.update_type

        # Build the apt command based on update type
        if update_type == "security":
            # Security-only updates (using apt's security filters)
            cmd = [
                "sudo",
                "apt-get",
                "update",
                "&&",
                "sudo",
                "apt-get",
                "-y",
                "upgrade",
                "-o",
                "APT::Get::Show-Upgraded=true",
            ]
        else:
            # All updates
            cmd = [
                "sudo",
                "apt-get",
                "update",
                "&&",
                "sudo",
                "apt-get",
                "-y",
                "upgrade",
                "-o",
                "APT::Get::Show-Upgraded=true",
            ]

        # Run the update command
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=300)

        stdout_str = stdout.decode("utf-8", errors="replace")
        stderr_str = stderr.decode("utf-8", errors="replace")

        if process.returncode == 0:
            # Parse output to count updated packages
            # Look for lines like "The following packages will be upgraded:"
            # and count the packages listed
            updated_count = stdout_str.count(" upgraded")

            return PackageUpdateResponse(
                status="completed",
                message=f"System packages updated successfully",
                updated_count=updated_count,
            )
        else:
            return PackageUpdateResponse(
                status="failed",
                message=f"Package update failed: {stderr_str or stdout_str}",
                updated_count=0,
            )

    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Package update timed out after 5 minutes",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to update packages: {str(e)}",
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


@router.get("/stack-services", response_model=list[StackServiceInfo])
async def get_stack_services(
    current_user: User = Depends(get_current_user),
) -> list[StackServiceInfo]:
    """Get detailed information about all installed stack services.

    Args:
        current_user: Authenticated user (injected via dependency)

    Returns:
        List of StackServiceInfo with enriched details for installed services

    Raises:
        HTTPException: 503 if service queries fail
    """
    try:
        from backend.server.services import ALLOWED_SERVICES

        services = []
        for service_name in sorted(ALLOWED_SERVICES):
            try:
                service_details = await get_stack_service_details(service_name)
                if service_details is not None:
                    services.append(service_details)
            except (ValueError, RuntimeError):
                # Skip services that error or aren't installed
                continue

        return services
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to fetch stack services: {str(e)}",
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


@router.post("/services/{service_name}/start")
async def start_service_endpoint(
    service_name: str,
    current_user: User = Depends(get_current_user),
) -> dict:
    """Start a specific service.

    Args:
        service_name: Name of the service to start
        current_user: Authenticated user (injected via dependency)

    Returns:
        Success message

    Raises:
        HTTPException: 400 if service not in allowlist, 503 if start fails
    """
    if not validate_service(service_name):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Service '{service_name}' is not in the allowed services list",
        )

    try:
        process = await asyncio.create_subprocess_exec(
            "sudo",
            "systemctl",
            "start",
            service_name,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        _, stderr = await asyncio.wait_for(
            process.communicate(), timeout=30
        )

        if process.returncode != 0:
            stderr_str = stderr.decode("utf-8", errors="replace").strip()
            raise RuntimeError(f"Failed to start {service_name}: {stderr_str}")

        return {"success": True, "message": f"Service {service_name} started"}

    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        )
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Timeout starting service {service_name}",
        )
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="systemctl or sudo command not found",
        )


@router.post("/services/{service_name}/stop")
async def stop_service_endpoint(
    service_name: str,
    current_user: User = Depends(get_current_user),
) -> dict:
    """Stop a specific service.

    Args:
        service_name: Name of the service to stop
        current_user: Authenticated user (injected via dependency)

    Returns:
        Success message

    Raises:
        HTTPException: 400 if service not in allowlist, 503 if stop fails
    """
    if not validate_service(service_name):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Service '{service_name}' is not in the allowed services list",
        )

    try:
        process = await asyncio.create_subprocess_exec(
            "sudo",
            "systemctl",
            "stop",
            service_name,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        _, stderr = await asyncio.wait_for(
            process.communicate(), timeout=30
        )

        if process.returncode != 0:
            stderr_str = stderr.decode("utf-8", errors="replace").strip()
            raise RuntimeError(f"Failed to stop {service_name}: {stderr_str}")

        return {"success": True, "message": f"Service {service_name} stopped"}

    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        )
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Timeout stopping service {service_name}",
        )
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="systemctl or sudo command not found",
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


@router.get("/monitoring/alerts", response_model=list[MonitoringAlert])
async def get_monitoring_alerts(
    current_user: User = Depends(get_current_user),
) -> list[MonitoringAlert]:
    """Get all monitoring alerts.

    Returns:
        List of monitoring alerts (empty if none configured)
    """
    return await get_alerts()


@router.post("/monitoring/alerts", response_model=MonitoringAlert)
async def create_monitoring_alert(
    create: MonitoringAlertCreate,
    current_user: User = Depends(get_current_user),
) -> MonitoringAlert:
    """Create a new monitoring alert.

    Args:
        create: Alert creation data
        current_user: Authenticated user (injected via dependency)

    Returns:
        Created alert with generated ID
    """
    return await create_alert(create)


@router.put("/monitoring/alerts/{alert_id}", response_model=MonitoringAlert)
async def update_monitoring_alert(
    alert_id: str,
    update: MonitoringAlertUpdate,
    current_user: User = Depends(get_current_user),
) -> MonitoringAlert:
    """Update an existing monitoring alert.

    Args:
        alert_id: ID of alert to update
        update: Updated alert data
        current_user: Authenticated user (injected via dependency)

    Returns:
        Updated alert

    Raises:
        HTTPException: 404 if alert not found
    """
    result = await update_alert(alert_id, update)
    if not result:
        raise HTTPException(status_code=404, detail="Alert not found")
    return result


@router.delete("/monitoring/alerts/{alert_id}")
async def delete_monitoring_alert(
    alert_id: str,
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    """Delete a monitoring alert.

    Args:
        alert_id: ID of alert to delete
        current_user: Authenticated user (injected via dependency)

    Returns:
        Success message

    Raises:
        HTTPException: 404 if alert not found
    """
    success = await delete_alert(alert_id)
    if not success:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"message": "Alert deleted successfully"}


@router.patch("/monitoring/alerts/{alert_id}/toggle", response_model=MonitoringAlert)
async def toggle_monitoring_alert(
    alert_id: str,
    current_user: User = Depends(get_current_user),
) -> MonitoringAlert:
    """Toggle an alert enabled/disabled.

    Args:
        alert_id: ID of alert to toggle
        current_user: Authenticated user (injected via dependency)

    Returns:
        Updated alert with toggled enabled state

    Raises:
        HTTPException: 404 if alert not found
    """
    result = await toggle_alert(alert_id)
    if not result:
        raise HTTPException(status_code=404, detail="Alert not found")
    return result


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
