"""System information fetching for hostname, uptime, and updates."""

import asyncio
import time

import httpx
from backend.server.models import SystemInfo


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

        # Parse df -i output
        # Format: "Filesystem      Inodes IUsed   IUse IUsed% Mounted on"
        lines = output.split("\n")
        for line in lines:
            if "/dev" in line or ("sd" in line.lower() or "nvme" in line.lower() or "xvda" in line.lower()):
                parts = line.split()
                if len(parts) >= 5:
                    inodes_total = int(parts[1])
                    inodes_used = int(parts[2])
                    inodes_percent = int(parts[3].rstrip("%"))
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
