"""Systemctl wrapper for safe service status queries and management."""

import asyncio
import re
from datetime import datetime, timezone

from .models import ServiceStatus, StackServiceInfo

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


# Service version detection and configuration paths
SERVICE_CONFIG_PATHS = {
    "nginx": "/etc/nginx/nginx.conf",
    "php7.4-fpm": "/etc/php/7.4/fpm/pool.d/www.conf",
    "php8.0-fpm": "/etc/php/8.0/fpm/pool.d/www.conf",
    "php8.1-fpm": "/etc/php/8.1/fpm/pool.d/www.conf",
    "php8.2-fpm": "/etc/php/8.2/fpm/pool.d/www.conf",
    "php8.3-fpm": "/etc/php/8.3/fpm/pool.d/www.conf",
    "php8.4-fpm": "/etc/php/8.4/fpm/pool.d/www.conf",
    "mariadb": "/etc/mysql/my.cnf",
    "mysql": "/etc/mysql/my.cnf",
    "redis-server": "/etc/redis/redis.conf",
}

SERVICE_DISPLAY_NAMES = {
    "nginx": "Nginx",
    "php7.4-fpm": "PHP 7.4-FPM",
    "php8.0-fpm": "PHP 8.0-FPM",
    "php8.1-fpm": "PHP 8.1-FPM",
    "php8.2-fpm": "PHP 8.2-FPM",
    "php8.3-fpm": "PHP 8.3-FPM",
    "php8.4-fpm": "PHP 8.4-FPM",
    "mariadb": "MariaDB",
    "mysql": "MySQL",
    "redis-server": "Redis",
}


async def get_service_version(name: str) -> str | None:
    """
    Get version string for a service.

    Args:
        name: Service name (must be in ALLOWED_SERVICES)

    Returns:
        Version string or None if unable to determine
    """
    try:
        if name == "nginx":
            process = await asyncio.create_subprocess_exec(
                "nginx", "-v",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            _, stderr = await asyncio.wait_for(process.communicate(), timeout=STATUS_TIMEOUT)
            # nginx outputs version to stderr
            output = stderr.decode("utf-8", errors="replace")
            match = re.search(r"nginx/([\d.]+)", output)
            return match.group(1) if match else None

        elif name.startswith("php") and "-fpm" in name:
            # Extract PHP version from service name (e.g., "php8.1-fpm" -> "8.1")
            php_version = name.replace("php", "").replace("-fpm", "")
            process = await asyncio.create_subprocess_exec(
                f"php{php_version}", "--version",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, _ = await asyncio.wait_for(process.communicate(), timeout=STATUS_TIMEOUT)
            output = stdout.decode("utf-8", errors="replace")
            match = re.search(r"PHP ([\d.]+)", output)
            return match.group(1) if match else php_version

        elif name in ("mysql", "mariadb"):
            process = await asyncio.create_subprocess_exec(
                "mysql", "--version",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, _ = await asyncio.wait_for(process.communicate(), timeout=STATUS_TIMEOUT)
            output = stdout.decode("utf-8", errors="replace")
            # MariaDB outputs like: mysql  Ver 15.1 Distrib 10.6.12-MariaDB
            # MySQL outputs like: mysql  Ver 8.0.35
            match = re.search(r"Distrib ([\d.]+)", output) or re.search(r"mysql\s+Ver\s+([\d.]+)", output)
            return match.group(1) if match else None

        elif name == "redis-server":
            process = await asyncio.create_subprocess_exec(
                "redis-cli", "--version",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, _ = await asyncio.wait_for(process.communicate(), timeout=STATUS_TIMEOUT)
            output = stdout.decode("utf-8", errors="replace")
            match = re.search(r"redis-cli\s+([\d.]+)", output)
            return match.group(1) if match else None

        return None
    except (asyncio.TimeoutError, FileNotFoundError, Exception):
        return None


def format_memory_bytes(bytes: int | None) -> str | None:
    """
    Convert bytes to human-readable format.

    Args:
        bytes: Memory in bytes

    Returns:
        Formatted string like "256 MB" or None if bytes is None
    """
    if bytes is None:
        return None

    for unit, divisor in [("GB", 1024**3), ("MB", 1024**2), ("KB", 1024)]:
        if bytes >= divisor:
            return f"{bytes / divisor:.1f} {unit}"
    return f"{bytes} B"


async def get_php_fpm_status(name: str) -> dict | None:
    """
    Get PHP-FPM specific status (connections and max children).

    Args:
        name: PHP-FPM service name (e.g., "php8.1-fpm")

    Returns:
        Dict with "connections" and "max_children" or None
    """
    import logging

    try:
        # Extract PHP version from service name
        php_version = name.replace("php", "").replace("-fpm", "")

        # Try to get max_children from pool config
        process = await asyncio.create_subprocess_exec(
            "bash", "-c",
            f"grep -E '^pm\\.max_children' /etc/php/{php_version}/fpm/pool.d/www.conf 2>/dev/null || echo 'not found'",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=STATUS_TIMEOUT)
        output = stdout.decode("utf-8", errors="replace").strip()

        max_children = None
        if output and "not found" not in output.lower():
            match = re.search(r"pm\.max_children\s*=\s*(\d+)", output)
            if match:
                max_children = int(match.group(1))

        # For active connections, count PHP-FPM worker processes
        # Use broader pattern to match various PHP-FPM process name formats
        process = await asyncio.create_subprocess_exec(
            "bash", "-c",
            f"pgrep -f 'php.*fpm.*pool' 2>/dev/null | wc -l || echo 0",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=STATUS_TIMEOUT)
        connections_str = stdout.decode("utf-8", errors="replace").strip()

        # Log for debugging
        logging.debug(f"PHP-FPM {php_version}: pgrep result='{connections_str}'")

        connections = int(connections_str) if connections_str.isdigit() and int(connections_str) > 0 else None

        return {
            "connections": connections,
            "max_children": max_children,
        }
    except (asyncio.TimeoutError, ValueError, Exception) as e:
        logging.error(f"Failed to get PHP-FPM status for {name}: {e}")
        return None


async def get_mysql_status() -> dict | None:
    """
    Get MySQL/MariaDB specific status (connection count).

    Returns:
        Dict with "connections" or None
    """
    import os
    import logging

    try:
        # Try ~/.my.cnf first (standard for WordOps MySQL setups)
        my_cnf_path = os.path.expanduser("~/.my.cnf")
        mysql_cmd = ["mysql"]

        if os.path.exists(my_cnf_path):
            mysql_cmd.extend(["--defaults-file=" + my_cnf_path])
        else:
            # Fallback to sudo mysql
            mysql_cmd = ["sudo", "mysql"]

        mysql_cmd.extend(["-e", "SHOW STATUS LIKE 'Threads_connected';"])

        process = await asyncio.create_subprocess_exec(
            *mysql_cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=STATUS_TIMEOUT)

        if process.returncode != 0:
            stderr_str = stderr.decode("utf-8", errors="replace").strip()
            logging.error(f"MySQL status command failed: {stderr_str}")
            return None

        output = stdout.decode("utf-8", errors="replace")

        # Parse output: "Threads_connected\t15"
        for line in output.split("\n"):
            if "\t" in line and "Threads_connected" not in line:
                parts = line.split("\t")
                if len(parts) >= 2:
                    connections = int(parts[1].strip())
                    return {"connections": connections}

        return None
    except (asyncio.TimeoutError, ValueError, Exception) as e:
        logging.error(f"Failed to get MySQL status: {e}")
        return None


async def get_redis_status() -> dict | None:
    """
    Get Redis specific status (connected clients).

    Returns:
        Dict with "connected_clients" or None
    """
    try:
        process = await asyncio.create_subprocess_exec(
            "redis-cli", "INFO", "clients",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await asyncio.wait_for(process.communicate(), timeout=STATUS_TIMEOUT)
        output = stdout.decode("utf-8", errors="replace")

        # Parse output: "connected_clients:10"
        match = re.search(r"connected_clients:(\d+)", output)
        if match:
            return {"connected_clients": int(match.group(1))}

        return None
    except (asyncio.TimeoutError, ValueError, Exception):
        return None


async def get_stack_service_details(name: str) -> StackServiceInfo | None:
    """
    Get detailed information about a stack service.

    Args:
        name: Service name (must be in ALLOWED_SERVICES)

    Returns:
        StackServiceInfo with enriched details or None if not installed

    Raises:
        ValueError: If service name is not in allowlist
    """
    if not validate_service(name):
        raise ValueError(f"Service '{name}' is not in the allowed services list")

    # Get base service status
    base_status = await get_service_status(name)
    if base_status is None:
        return None

    # Determine status string
    if base_status.active:
        status = "running"
    elif base_status.sub_state in ("restarting", "auto-restart"):
        status = "restarting"
    else:
        status = "stopped"

    # Get version
    version = await get_service_version(name)

    # Format memory
    memory_display = format_memory_bytes(base_status.memory_bytes)

    # Get config file path
    config_file = SERVICE_CONFIG_PATHS.get(name, "/etc/unknown.conf")

    # Get display name
    display_name = SERVICE_DISPLAY_NAMES.get(name, name.capitalize())

    # Service-specific stats
    php_fpm_connections = None
    php_fpm_max_children = None
    mysql_connections = None
    redis_connected_clients = None

    if name.startswith("php") and "-fpm" in name:
        fpm_status = await get_php_fpm_status(name)
        if fpm_status:
            php_fpm_connections = fpm_status.get("connections")
            php_fpm_max_children = fpm_status.get("max_children")
    elif name in ("mysql", "mariadb"):
        mysql_status = await get_mysql_status()
        if mysql_status:
            mysql_connections = mysql_status.get("connections")
    elif name == "redis-server":
        redis_status = await get_redis_status()
        if redis_status:
            redis_connected_clients = redis_status.get("connected_clients")

    return StackServiceInfo(
        name=base_status.name,
        display_name=display_name,
        status=status,
        version=version,
        memory_usage=base_status.memory_bytes,
        memory_display=memory_display,
        uptime_seconds=base_status.uptime_seconds,
        config_file=config_file,
        php_fpm_connections=php_fpm_connections,
        php_fpm_max_children=php_fpm_max_children,
        mysql_connections=mysql_connections,
        redis_connected_clients=redis_connected_clients,
    )
