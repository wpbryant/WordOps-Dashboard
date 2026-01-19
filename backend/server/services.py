"""Systemctl wrapper for safe service status queries and management."""

import asyncio
from datetime import datetime, timezone

from .models import ServiceStatus

# Strict allowlist of services that can be queried or managed
ALLOWED_SERVICES = frozenset({
    "nginx",
    "php7.4-fpm",
    "php8.0-fpm",
    "php8.1-fpm",
    "php8.2-fpm",
    "php8.3-fpm",
    "php8.4-fpm",
    "mariadb",
    "mysql",
    "redis-server",
    "postfix",
    "fail2ban",
    "ufw",
    "netdata",
})

# Timeouts
STATUS_TIMEOUT = 5  # seconds for status queries
RESTART_TIMEOUT = 30  # seconds for restart operations


def validate_service(name: str) -> bool:
    """
    Check if a service name is in the allowlist.

    Args:
        name: Service name to validate

    Returns:
        True if service is allowed, False otherwise
    """
    return name in ALLOWED_SERVICES


async def get_service_status(name: str) -> ServiceStatus | None:
    """
    Get status information for a system service.

    Args:
        name: Service name (must be in ALLOWED_SERVICES)

    Returns:
        ServiceStatus if service exists, None if not installed

    Raises:
        ValueError: If service name is not in allowlist
    """
    if not validate_service(name):
        raise ValueError(f"Service '{name}' is not in the allowed services list")

    try:
        process = await asyncio.create_subprocess_exec(
            "systemctl",
            "show",
            name,
            "--property=ActiveState,SubState,MainPID,MemoryCurrent,ActiveEnterTimestamp",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        stdout, _ = await asyncio.wait_for(
            process.communicate(), timeout=STATUS_TIMEOUT
        )

        output = stdout.decode("utf-8", errors="replace").strip()

        # Parse key=value pairs
        props = {}
        for line in output.split("\n"):
            if "=" in line:
                key, value = line.split("=", 1)
                props[key.strip()] = value.strip()

        active_state = props.get("ActiveState", "unknown")
        sub_state = props.get("SubState", "unknown")
        main_pid_str = props.get("MainPID", "0")
        memory_current = props.get("MemoryCurrent", "")
        active_enter_timestamp = props.get("ActiveEnterTimestamp", "")

        # Parse MainPID
        try:
            main_pid = int(main_pid_str)
        except ValueError:
            main_pid = 0

        # If inactive with no PID, service is not installed or not running
        if active_state == "inactive" and main_pid == 0:
            # Check if service unit exists at all
            unit_check = await asyncio.create_subprocess_exec(
                "systemctl",
                "cat",
                name,
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.DEVNULL,
            )
            await asyncio.wait_for(unit_check.wait(), timeout=STATUS_TIMEOUT)
            if unit_check.returncode != 0:
                # Service unit file doesn't exist
                return None

        # Parse memory (may be empty or "[not set]")
        memory_bytes = None
        if memory_current and memory_current not in ("[not set]", ""):
            try:
                memory_bytes = int(memory_current)
            except ValueError:
                memory_bytes = None

        # Parse uptime from ActiveEnterTimestamp
        uptime_seconds = None
        if active_enter_timestamp and active_state == "active":
            uptime_seconds = _parse_uptime(active_enter_timestamp)

        return ServiceStatus(
            name=name,
            active=active_state == "active",
            sub_state=sub_state,
            memory_bytes=memory_bytes,
            uptime_seconds=uptime_seconds,
            main_pid=main_pid if main_pid > 0 else None,
        )

    except asyncio.TimeoutError:
        raise RuntimeError(f"Timeout querying service {name}")
    except FileNotFoundError:
        raise RuntimeError("systemctl command not found")


async def get_all_services() -> list[ServiceStatus]:
    """
    Get status for all allowed services that are installed.

    Returns:
        List of ServiceStatus for installed services
    """
    results = []

    for service_name in sorted(ALLOWED_SERVICES):
        try:
            status = await get_service_status(service_name)
            if status is not None:
                results.append(status)
        except (ValueError, RuntimeError):
            # Skip services that error
            continue

    return results


async def restart_service(name: str) -> bool:
    """
    Restart a system service.

    Args:
        name: Service name (must be in ALLOWED_SERVICES)

    Returns:
        True if restart succeeded

    Raises:
        ValueError: If service name is not in allowlist
        RuntimeError: If restart fails
        asyncio.TimeoutError: If restart times out
    """
    if not validate_service(name):
        raise ValueError(f"Service '{name}' is not in the allowed services list")

    try:
        process = await asyncio.create_subprocess_exec(
            "sudo",
            "systemctl",
            "restart",
            name,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        _, stderr = await asyncio.wait_for(
            process.communicate(), timeout=RESTART_TIMEOUT
        )

        if process.returncode != 0:
            stderr_str = stderr.decode("utf-8", errors="replace").strip()
            raise RuntimeError(f"Failed to restart {name}: {stderr_str}")

        return True

    except FileNotFoundError:
        raise RuntimeError("systemctl or sudo command not found")


def _parse_uptime(timestamp_str: str) -> int | None:
    """
    Parse systemd timestamp and calculate uptime in seconds.

    Args:
        timestamp_str: Timestamp from systemctl show (e.g., "Mon 2026-01-19 01:23:45 UTC")

    Returns:
        Uptime in seconds, or None if parsing fails
    """
    if not timestamp_str or timestamp_str in ("", "n/a"):
        return None

    try:
        # systemd timestamps are like: "Mon 2026-01-19 01:23:45 UTC"
        # or sometimes with timezone offset
        # Remove the day name prefix if present
        parts = timestamp_str.split()
        if len(parts) >= 3:
            # Try to parse "YYYY-MM-DD HH:MM:SS" portion
            date_str = parts[1] if parts[0].isalpha() else parts[0]
            time_str = parts[2] if parts[0].isalpha() else parts[1]

            dt_str = f"{date_str} {time_str}"
            dt = datetime.strptime(dt_str, "%Y-%m-%d %H:%M:%S")
            dt = dt.replace(tzinfo=timezone.utc)

            now = datetime.now(timezone.utc)
            delta = now - dt

            if delta.total_seconds() >= 0:
                return int(delta.total_seconds())

        return None
    except (ValueError, IndexError):
        return None
