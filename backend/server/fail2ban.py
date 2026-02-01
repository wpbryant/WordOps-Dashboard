"""Fail2ban configuration management module."""

import asyncio
import logging
import re

from .models import Fail2banConfig

# Fail2ban paths
FAIL2BAN_JAIL_LOCAL = "/etc/fail2ban/jail.local"
FAIL2BAN_JAIL_D_CUSTOM = "/etc/fail2ban/jail.d/custom-dashboard.conf"

# Timeout for subprocess operations
FAIL2BAN_TIMEOUT = 10  # seconds


async def get_fail2ban_status() -> Fail2banConfig:
    """
    Get fail2ban status and configuration.

    Returns:
        Fail2banConfig with current settings

    Raises:
        RuntimeError: If unable to read status
    """
    try:
        # Check if fail2ban is installed
        check_process = await asyncio.create_subprocess_exec(
            "which",
            "fail2ban-client",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        await asyncio.wait_for(check_process.wait(), timeout=FAIL2BAN_TIMEOUT)

        if check_process.returncode != 0:
            # fail2ban not installed
            return Fail2banConfig(
                enabled=False,
                bantime=3600,
                findtime=600,
                maxretry=5,
                destemail="root@localhost",
                banned_total=0,
                jails=[],
            )

        # Check service status
        enabled = False
        status_process = await asyncio.create_subprocess_exec(
            "systemctl",
            "is-active",
            "fail2ban",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        stdout, _ = await asyncio.wait_for(
            status_process.communicate(), timeout=FAIL2BAN_TIMEOUT
        )

        if status_process.returncode == 0:
            enabled = stdout.decode("utf-8", errors="replace").strip() == "active"

        # Get jail list
        jails = []
        banned_total = 0

        if enabled:
            try:
                # Get status for all jails
                status_process = await asyncio.create_subprocess_exec(
                    "sudo",
                    "fail2ban-client",
                    "status",
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )

                stdout, stderr = await asyncio.wait_for(
                    status_process.communicate(), timeout=FAIL2BAN_TIMEOUT
                )

                if status_process.returncode == 0:
                    output = stdout.decode("utf-8", errors="replace")

                    # Parse jail list from status output
                    # Output format: "Status\n|- Number of jail:\t2\n`- Jail list:\tsshd, recidive"
                    match = re.search(r"Jail list:\s*(.+)", output)
                    if match:
                        jails_str = match.group(1).strip()
                        jails = [j.strip() for j in jails_str.split(",")]

                    # Get banned count for each jail
                    for jail in jails:
                        try:
                            jail_process = await asyncio.create_subprocess_exec(
                                "sudo",
                                "fail2ban-client",
                                "status",
                                jail,
                                stdout=asyncio.subprocess.PIPE,
                                stderr=asyncio.subprocess.PIPE,
                            )

                            jail_stdout, _ = await asyncio.wait_for(
                                jail_process.communicate(), timeout=FAIL2BAN_TIMEOUT
                            )

                            if jail_process.returncode == 0:
                                jail_output = jail_stdout.decode("utf-8", errors="replace")
                                # Parse: "Currently failed: 0\nTotal failed: 15\nCurrently banned: 1\nTotal banned: 10"
                                banned_match = re.search(r"Total banned:\s+(\d+)", jail_output)
                                if banned_match:
                                    banned_total += int(banned_match.group(1))
                        except (asyncio.TimeoutError, ValueError):
                            pass

            except (asyncio.TimeoutError, Exception) as e:
                logging.debug(f"Failed to get fail2ban jail status: {e}")

        # Read configuration values
        bantime = 3600  # default: 1 hour
        findtime = 600  # default: 10 minutes
        maxretry = 5  # default
        destemail = "root@localhost"  # default

        # Try to read from jail.local
        config_values = await _read_jail_config()
        if config_values:
            bantime = config_values.get("bantime", bantime)
            findtime = config_values.get("findtime", findtime)
            maxretry = config_values.get("maxretry", maxretry)
            destemail = config_values.get("destemail", destemail)

        return Fail2banConfig(
            enabled=enabled,
            bantime=bantime,
            findtime=findtime,
            maxretry=maxretry,
            destemail=destemail,
            banned_total=banned_total,
            jails=jails,
        )

    except asyncio.TimeoutError:
        raise RuntimeError(f"Timeout reading fail2ban status after {FAIL2BAN_TIMEOUT} seconds")
    except Exception as e:
        raise RuntimeError(f"Failed to read fail2ban status: {str(e)}")


async def _read_jail_config() -> dict | None:
    """
    Read fail2ban jail configuration.

    Returns:
        Dict with bantime, findtime, maxretry, destemail or None
    """
    try:
        # Try jail.local first
        process = await asyncio.create_subprocess_exec(
            "sudo",
            "cat",
            FAIL2BAN_JAIL_LOCAL,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        stdout, _ = await asyncio.wait_for(
            process.communicate(), timeout=FAIL2BAN_TIMEOUT
        )

        if process.returncode != 0:
            # Try custom dashboard config
            process = await asyncio.create_subprocess_exec(
                "sudo",
                "cat",
                FAIL2BAN_JAIL_D_CUSTOM,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

            stdout, _ = await asyncio.wait_for(
                process.communicate(), timeout=FAIL2BAN_TIMEOUT
            )

            if process.returncode != 0:
                return None

        config_text = stdout.decode("utf-8", errors="replace")

        # Parse configuration values
        # Look for settings in [DEFAULT] section or top-level
        config = {}
        in_default_section = False

        for line in config_text.split("\n"):
            line = line.strip()

            # Track sections
            if line.startswith("["):
                in_default_section = line.upper() == "[DEFAULT]"
                continue

            # Only parse settings in DEFAULT section or at top (before any section)
            if not in_default_section and line.startswith("["):
                break

            # Parse bantime
            if line.upper().startswith("BANTIME "):
                match = re.match(r"^bantime\s*=\s*(\d+)", line, re.IGNORECASE)
                if match:
                    try:
                        config["bantime"] = int(match.group(1))
                    except ValueError:
                        pass

            # Parse findtime
            elif line.upper().startswith("FINDTIME "):
                match = re.match(r"^findtime\s*=\s*(\d+)", line, re.IGNORECASE)
                if match:
                    try:
                        config["findtime"] = int(match.group(1))
                    except ValueError:
                        pass

            # Parse maxretry
            elif line.upper().startswith("MAXRETRY "):
                match = re.match(r"^maxretry\s*=\s*(\d+)", line, re.IGNORECASE)
                if match:
                    try:
                        config["maxretry"] = int(match.group(1))
                    except ValueError:
                        pass

            # Parse destemail
            elif line.upper().startswith("DESTEMAIL "):
                match = re.match(r"^destemail\s*=\s*(.+)", line, re.IGNORECASE)
                if match:
                    config["destemail"] = match.group(1).strip()

        return config if config else None

    except asyncio.TimeoutError:
        return None
    except Exception:
        return None


async def update_fail2ban_config(
    bantime: int,
    findtime: int,
    maxretry: int,
    destemail: str,
) -> dict:
    """
    Update fail2ban configuration.

    Writes to /etc/fail2ban/jail.d/custom-dashboard.conf and reloads service.

    Args:
        bantime: Ban duration in seconds
        findtime: Time window in seconds
        maxretry: Max retry attempts
        destemail: Destination email for notifications

    Returns:
        Success message

    Raises:
        RuntimeError: If unable to update config
    """
    try:
        # Create configuration content
        config_content = f"""# Fail2ban configuration managed by WordOps Dashboard
[DEFAULT]
bantime = {bantime}
findtime = {findtime}
maxretry = {maxretry}
destemail = {destemail}
"""

        # Write to jail.d/custom-dashboard.conf
        process = await asyncio.create_subprocess_exec(
            "sudo",
            "tee",
            FAIL2BAN_JAIL_D_CUSTOM,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        stdout, stderr = await asyncio.wait_for(
            process.communicate(input=config_content.encode()), timeout=FAIL2BAN_TIMEOUT
        )

        if process.returncode != 0:
            stderr_str = stderr.decode("utf-8", errors="replace").strip()
            raise RuntimeError(f"Failed to write fail2ban config: {stderr_str}")

        # Reload fail2ban service
        process = await asyncio.create_subprocess_exec(
            "sudo",
            "systemctl",
            "reload",
            "fail2ban",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        stdout, stderr = await asyncio.wait_for(
            process.communicate(), timeout=FAIL2BAN_TIMEOUT
        )

        if process.returncode != 0:
            stderr_str = stderr.decode("utf-8", errors="replace").strip()
            logging.warning(f"fail2ban reload returned non-zero: {stderr_str}")

        return {
            "success": True,
            "message": "Fail2ban configuration updated and service reloaded",
        }

    except asyncio.TimeoutError:
        raise RuntimeError(
            f"Timeout updating fail2ban config after {FAIL2BAN_TIMEOUT} seconds"
        )
    except FileNotFoundError:
        raise RuntimeError("systemctl or tee command not found")


async def start_fail2ban() -> dict:
    """
    Start the fail2ban service.

    Returns:
        Success message

    Raises:
        RuntimeError: If unable to start service
    """
    try:
        process = await asyncio.create_subprocess_exec(
            "sudo",
            "systemctl",
            "start",
            "fail2ban",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        stdout, stderr = await asyncio.wait_for(
            process.communicate(), timeout=FAIL2BAN_TIMEOUT
        )

        if process.returncode != 0:
            stderr_str = stderr.decode("utf-8", errors="replace").strip()
            raise RuntimeError(f"Failed to start fail2ban: {stderr_str}")

        return {"success": True, "message": "Fail2ban service started"}

    except asyncio.TimeoutError:
        raise RuntimeError(f"Timeout starting fail2ban after {FAIL2BAN_TIMEOUT} seconds")
    except FileNotFoundError:
        raise RuntimeError("systemctl command not found")


async def stop_fail2ban() -> dict:
    """
    Stop the fail2ban service.

    Returns:
        Success message

    Raises:
        RuntimeError: If unable to stop service
    """
    try:
        process = await asyncio.create_subprocess_exec(
            "sudo",
            "systemctl",
            "stop",
            "fail2ban",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        stdout, stderr = await asyncio.wait_for(
            process.communicate(), timeout=FAIL2BAN_TIMEOUT
        )

        if process.returncode != 0:
            stderr_str = stderr.decode("utf-8", errors="replace").strip()
            raise RuntimeError(f"Failed to stop fail2ban: {stderr_str}")

        return {"success": True, "message": "Fail2ban service stopped"}

    except asyncio.TimeoutError:
        raise RuntimeError(f"Timeout stopping fail2ban after {FAIL2BAN_TIMEOUT} seconds")
    except FileNotFoundError:
        raise RuntimeError("systemctl command not found")
