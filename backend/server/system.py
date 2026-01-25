"""System information fetching for hostname, uptime, and updates."""

import asyncio
import time

import httpx
from backend.server.models import ServerOverviewInfo, SystemInfo


async def get_hostname() -> str:
    """Get the system hostname.

    Returns:
        The system hostname
    """
    process = await asyncio.create_subprocess_exec(
        "hostname",
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )

    stdout, _ = await asyncio.wait_for(process.communicate(), timeout=5.0)
    return stdout.decode("utf-8").strip()


async def get_disk_usage() -> int:
    """Get disk usage percentage for root filesystem.

    Returns:
        Disk usage percentage (0-100)
    """
    try:
        process = await asyncio.create_subprocess_exec(
            "df",
            "/",
            "--output=pcent",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await asyncio.wait_for(process.communicate(), timeout=5.0)
        output = stdout.decode("utf-8").strip()
        # Output is like "Use%\n 45%"
        lines = output.split("\n")
        for line in lines:
            line = line.strip()
            if line and line != "Use%":
                # Parse "45%" to 45
                return int(line.rstrip("%"))
        return 0
    except (asyncio.TimeoutError, FileNotFoundError, ValueError, IndexError):
        return 0


async def get_boot_time() -> tuple[int, int]:
    """Get system boot time and uptime.

    Reads /proc/uptime to get uptime in seconds.

    Returns:
        Tuple of (boot_time_timestamp, uptime_seconds)
    """
    try:
        with open("/proc/uptime", "r") as f:
            uptime_str = f.read().strip().split()[0]
            uptime_seconds = int(float(uptime_str))
            boot_time = int(time.time()) - uptime_seconds
            return boot_time, uptime_seconds
    except (OSError, ValueError, IndexError):
        # Fallback to current time if unable to read
        return int(time.time()), 0


async def get_apt_updates() -> tuple[int, int]:
    """Get count of available apt updates.

    Returns:
        Tuple of (security_updates, other_updates)
    """
    try:
        # Run apt list --upgradable to get available updates
        process = await asyncio.create_subprocess_exec(
            "apt",
            "list",
            "--upgradable",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.DEVNULL,
        )
        stdout, _ = await asyncio.wait_for(process.communicate(), timeout=30.0)

        output = stdout.decode("utf-8")
        security_count = 0
        other_count = 0

        for line in output.splitlines():
            line_lower = line.lower()
            # Check if this is an upgradable package line (not headers)
            if "/" in line_lower and "upgradable" in line_lower:
                # Check for security updates
                if "security" in line_lower:
                    security_count += 1
                else:
                    other_count += 1

        return security_count, other_count
    except (asyncio.TimeoutError, FileNotFoundError, OSError):
        # apt not available or timeout
        return 0, 0


async def get_public_ip() -> str:
    """Get the server's public IP address.

    Uses multiple external services with fallback.

    Returns:
        The public IP address or "unknown" if unable to fetch
    """
    # List of services to try, in order
    services = [
        "https://api.ipify.org",
        "https://icanhazip.com",
        "https://ifconfig.me",
    ]

    async with httpx.AsyncClient(timeout=5.0) as client:
        for service in services:
            try:
                response = await client.get(service)
                if response.status_code == 200:
                    ip = response.text.strip()
                    # Basic validation that it looks like an IP address
                    if ip and not ip.startswith("<"):
                        return ip
            except Exception:
                continue

    return "unknown"


async def get_inodes_info() -> tuple[int | None, int | None, int | None]:
    """Get inodes usage information for the root filesystem.

    Returns:
        Tuple of (inodes_used, inodes_total, inodes_percent) or (None, None, None) if unavailable
    """
    try:
        process = await asyncio.create_subprocess_exec(
            "df",
            "-i",
            "/",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await asyncio.wait_for(process.communicate(), timeout=5.0)
        output = stdout.decode("utf-8").strip()

        import logging
        logging.info(f"df -i output: {output}")

        # Parse df -i output
        # Format: "Filesystem      Inodes IUsed   IUse IUsed% Mounted on"
        # Data line: "/dev/sda1      6553600 3765   1%    /"
        lines = output.split("\n")
        for line in lines:
            if "/dev" in line or ("sd" in line.lower() or "nvme" in line.lower() or "xvda" in line.lower()):
                parts = line.split()
                logging.info(f"Parsing inodes line: parts={parts}")

                if len(parts) >= 5:
                    inodes_total = int(parts[1])
                    inodes_used = int(parts[2])
                    # The percentage might be in different positions depending on the system
                    # Try to find the column with % sign
                    inodes_percent = None
                    for i, part in enumerate(parts[3:], start=3):
                        if "%" in part:
                            inodes_percent = int(part.rstrip("%"))
                            break

                    if inodes_percent is None and len(parts) >= 4:
                        # Fallback: calculate percentage from used/total
                        inodes_percent = int((inodes_used / inodes_total) * 100)

                    logging.info(f"Inodes: used={inodes_used}, total={inodes_total}, percent={inodes_percent}")
                    return inodes_used, inodes_total, inodes_percent
        return None, None, None
    except (asyncio.TimeoutError, FileNotFoundError, ValueError, IndexError):
        return None, None, None


async def get_system_info() -> SystemInfo:
    """Get complete system information.

    Returns:
        SystemInfo with hostname, uptime, boot time, and updates
    """
    hostname, boot_time_result, updates_result, disk_usage, public_ip, inodes_info = await asyncio.gather(
        get_hostname(),
        get_boot_time(),
        get_apt_updates(),
        get_disk_usage(),
        get_public_ip(),
        get_inodes_info(),
        return_exceptions=True,
    )

    # Handle results
    if isinstance(hostname, BaseException):
        hostname = "unknown"
    if isinstance(boot_time_result, BaseException):
        boot_time, uptime = int(time.time()), 0
    else:
        boot_time, uptime = boot_time_result
    if isinstance(updates_result, BaseException):
        security_updates, other_updates = 0, 0
    else:
        security_updates, other_updates = updates_result
    if isinstance(disk_usage, BaseException):
        disk_usage_percent = 0
    else:
        disk_usage_percent = disk_usage
    if isinstance(public_ip, BaseException):
        public_ip = "unknown"

    # Handle inodes info
    if isinstance(inodes_info, BaseException):
        inodes_used, inodes_total, inodes_percent = None, None, None
    else:
        inodes_used, inodes_total, inodes_percent = inodes_info

    return SystemInfo(
        hostname=hostname,
        uptime_seconds=uptime,
        boot_time=boot_time,
        security_updates=security_updates,
        other_updates=other_updates,
        disk_usage_percent=disk_usage_percent,
        public_ip=public_ip,
        inodes_used=inodes_used,
        inodes_total=inodes_total,
        inodes_percent=inodes_percent,
    )


async def get_os_version() -> str:
    """Get the OS version from /etc/os-release.

    Returns:
        The PRETTY_NAME from /etc/os-release, or "Unknown" if unavailable
    """
    try:
        with open("/etc/os-release", "r") as f:
            content = f.read()
            for line in content.splitlines():
                if line.startswith("PRETTY_NAME="):
                    # Remove quotes and variable name
                    value = line.split("=", 1)[1].strip('"\'')
                    return value
        return "Unknown"
    except (OSError, IndexError):
        return "Unknown"


async def get_kernel_version() -> str:
    """Get the kernel version using uname -r.

    Returns:
        The kernel version string, or "Unknown" if unavailable
    """
    try:
        process = await asyncio.create_subprocess_exec(
            "uname",
            "-r",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await asyncio.wait_for(process.communicate(), timeout=5.0)
        return stdout.decode("utf-8").strip()
    except (asyncio.TimeoutError, FileNotFoundError, OSError):
        return "Unknown"


async def get_wordops_version() -> str | None:
    """Get the WordOps version.

    Returns:
        The WordOps version string (e.g., "3.14.0") or None if unavailable
    """
    try:
        from backend.wordops.cli import run_command

        output = await run_command(["--version"], timeout=10)
        # Parse output like "WordOps v3.14.0" or "WordOps 3.14.0"
        # Extract just the version number
        import re
        match = re.search(r'(\d+\.\d+\.\d+)', output)
        if match:
            return match.group(1)
        return None
    except Exception:
        return None


async def get_last_backup_date() -> str | None:
    """Get the last backup date.

    Checks common WordOps backup directories for the latest backup.

    Returns:
        ISO date string of the last backup, or None if no backups found
    """
    import os
    from datetime import datetime

    backup_dirs = [
        "/var/backups/wordops",
        "/var/backups",
        os.path.expanduser("~/backups"),
        "/opt/wordops/backups",
    ]

    latest_timestamp = 0

    for backup_dir in backup_dirs:
        if not os.path.isdir(backup_dir):
            continue

        try:
            for entry in os.listdir(backup_dir):
                entry_path = os.path.join(backup_dir, entry)
                if os.path.isfile(entry_path):
                    stat = os.stat(entry_path)
                    if stat.st_mtime > latest_timestamp:
                        latest_timestamp = stat.st_mtime
                elif os.path.isdir(entry_path):
                    # Check directory modification time
                    stat = os.stat(entry_path)
                    if stat.st_mtime > latest_timestamp:
                        latest_timestamp = stat.st_mtime
        except (OSError, PermissionError):
            continue

    if latest_timestamp > 0:
        return datetime.fromtimestamp(latest_timestamp).isoformat()

    return None


async def get_server_overview():
    """Get complete server overview information.

    Gathers all server information including OS, kernel, WordOps version,
    and backup status in parallel for efficiency.

    Returns:
        ServerOverviewInfo with all server details
    """
    hostname, public_ip, os_version, kernel_version, boot_time_result, updates_result, wordops_version, last_backup = await asyncio.gather(
        get_hostname(),
        get_public_ip(),
        get_os_version(),
        get_kernel_version(),
        get_boot_time(),
        get_apt_updates(),
        get_wordops_version(),
        get_last_backup_date(),
        return_exceptions=True,
    )

    # Handle results
    if isinstance(hostname, BaseException):
        hostname = "unknown"
    if isinstance(public_ip, BaseException):
        public_ip = "unknown"
    if isinstance(os_version, BaseException):
        os_version = "Unknown"
    if isinstance(kernel_version, BaseException):
        kernel_version = "Unknown"
    if isinstance(boot_time_result, BaseException):
        _, uptime = int(time.time()), 0
    else:
        _, uptime = boot_time_result
    if isinstance(updates_result, BaseException):
        security_updates, other_updates = 0, 0
    else:
        security_updates, other_updates = updates_result
    if isinstance(wordops_version, BaseException):
        wordops_version = None
    if isinstance(last_backup, BaseException):
        last_backup = None

    return ServerOverviewInfo(
        hostname=hostname,
        public_ip=public_ip,
        os_version=os_version,
        kernel_version=kernel_version,
        uptime_seconds=uptime,
        wordops_version=wordops_version,
        security_updates=security_updates,
        other_updates=other_updates,
        last_backup_date=last_backup,
    )
