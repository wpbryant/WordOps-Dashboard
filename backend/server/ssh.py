"""SSH configuration management module."""

import asyncio
import logging
import re

from .models import SSHConfig

# SSH config file path
SSH_CONFIG_FILE = "/etc/ssh/sshd_config"

# Timeout for subprocess operations
SSH_TIMEOUT = 10  # seconds


async def get_ssh_config() -> SSHConfig:
    """
    Read and parse SSH server configuration.

    Returns:
        SSHConfig with current settings

    Raises:
        RuntimeError: If unable to read or parse config
    """
    try:
        # Read sshd_config file
        process = await asyncio.create_subprocess_exec(
            "sudo",
            "cat",
            SSH_CONFIG_FILE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        stdout, stderr = await asyncio.wait_for(
            process.communicate(), timeout=SSH_TIMEOUT
        )

        if process.returncode != 0:
            stderr_str = stderr.decode("utf-8", errors="replace").strip()
            raise RuntimeError(f"Failed to read SSH config: {stderr_str}")

        config_text = stdout.decode("utf-8", errors="replace")

        # Parse configuration values
        port = 22  # default
        permit_root_login = True  # default
        password_authentication = True  # default
        max_auth_tries = 3  # default

        for line in config_text.split("\n"):
            line = line.strip()
            if not line or line.startswith("#"):
                continue

            # Parse Port
            if line.upper().startswith("PORT "):
                match = re.match(r"^Port\s+(\d+)", line, re.IGNORECASE)
                if match:
                    try:
                        port = int(match.group(1))
                    except ValueError:
                        pass

            # Parse PermitRootLogin
            elif line.upper().startswith("PERMITROOTLOGIN "):
                value = line.split(None, 1)[1].lower() if " " in line else ""
                permit_root_login = value in ("yes", "prohibit-password")

            # Parse PasswordAuthentication
            elif line.upper().startswith("PASSWORDAUTHENTICATION "):
                value = line.split(None, 1)[1].lower() if " " in line else ""
                password_authentication = value == "yes"

            # Parse MaxAuthTries
            elif line.upper().startswith("MAXAUTHTRIES "):
                match = re.match(r"^MaxAuthTries\s+(\d+)", line, re.IGNORECASE)
                if match:
                    try:
                        max_auth_tries = int(match.group(1))
                    except ValueError:
                        pass

        return SSHConfig(
            port=port,
            permit_root_login=permit_root_login,
            password_authentication=password_authentication,
            max_auth_tries=max_auth_tries,
        )

    except asyncio.TimeoutError:
        raise RuntimeError(f"Timeout reading SSH config after {SSH_TIMEOUT} seconds")
    except FileNotFoundError:
        raise RuntimeError("SSH configuration file not found")


async def update_ssh_config(config: SSHConfig) -> dict:
    """
    Update SSH configuration and apply changes.

    Validates configuration with sshd -t before applying.

    Args:
        config: New SSH configuration

    Returns:
        Success message

    Raises:
        RuntimeError: If validation fails or config cannot be updated
    """
    try:
        # Read current config
        process = await asyncio.create_subprocess_exec(
            "sudo",
            "cat",
            SSH_CONFIG_FILE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        stdout, stderr = await asyncio.wait_for(
            process.communicate(), timeout=SSH_TIMEOUT
        )

        if process.returncode != 0:
            stderr_str = stderr.decode("utf-8", errors="replace").strip()
            raise RuntimeError(f"Failed to read SSH config: {stderr_str}")

        config_text = stdout.decode("utf-8", errors="replace")
        lines = config_text.split("\n")
        new_lines = []

        # Track which settings have been updated
        port_updated = False
        permit_root_updated = False
        password_auth_updated = False

        for line in lines:
            stripped = line.strip()

            # Skip empty lines and comments
            if not stripped or stripped.startswith("#"):
                new_lines.append(line)
                continue

            # Update Port
            if stripped.upper().startswith("PORT "):
                new_lines.append(f"Port {config.port}")
                port_updated = True
            # Update PermitRootLogin
            elif stripped.upper().startswith("PERMITROOTLOGIN "):
                permit_value = "yes" if config.permit_root_login else "no"
                new_lines.append(f"PermitRootLogin {permit_value}")
                permit_root_updated = True
            # Update PasswordAuthentication
            elif stripped.upper().startswith("PASSWORDAUTHENTICATION "):
                password_value = "yes" if config.password_authentication else "no"
                new_lines.append(f"PasswordAuthentication {password_value}")
                password_auth_updated = True
            else:
                new_lines.append(line)

        # Add missing settings at the end
        if not port_updated:
            new_lines.append(f"Port {config.port}")
        if not permit_root_updated:
            permit_value = "yes" if config.permit_root_login else "no"
            new_lines.append(f"PermitRootLogin {permit_value}")
        if not password_auth_updated:
            password_value = "yes" if config.password_authentication else "no"
            new_lines.append(f"PasswordAuthentication {password_value}")

        # Write updated config to temp file
        new_config = "\n".join(new_lines)

        # Use sudo tee to write the file
        process = await asyncio.create_subprocess_exec(
            "sudo",
            "tee",
            SSH_CONFIG_FILE,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        stdout, stderr = await asyncio.wait_for(
            process.communicate(input=new_config.encode()), timeout=SSH_TIMEOUT
        )

        if process.returncode != 0:
            stderr_str = stderr.decode("utf-8", errors="replace").strip()
            raise RuntimeError(f"Failed to write SSH config: {stderr_str}")

        # Validate configuration with sshd -t
        process = await asyncio.create_subprocess_exec(
            "sudo",
            "sshd",
            "-t",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        stdout, stderr = await asyncio.wait_for(
            process.communicate(), timeout=SSH_TIMEOUT
        )

        if process.returncode != 0:
            stderr_str = stderr.decode("utf-8", errors="replace").strip()
            # Restore original config on validation failure
            await _restore_config(config_text)
            raise RuntimeError(f"SSH configuration validation failed: {stderr_str}")

        # Reload sshd service
        process = await asyncio.create_subprocess_exec(
            "sudo",
            "systemctl",
            "reload",
            "sshd",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        stdout, stderr = await asyncio.wait_for(
            process.communicate(), timeout=SSH_TIMEOUT
        )

        if process.returncode != 0:
            stderr_str = stderr.decode("utf-8", errors="replace").strip()
            logging.warning(f"sshd reload returned non-zero: {stderr_str}")

        return {
            "success": True,
            "message": "SSH configuration updated and service reloaded",
        }

    except asyncio.TimeoutError:
        raise RuntimeError(f"Timeout updating SSH config after {SSH_TIMEOUT} seconds")
    except FileNotFoundError:
        raise RuntimeError("sshd or systemctl command not found")


async def _restore_config(config_text: str) -> None:
    """Helper to restore original config on validation failure."""
    try:
        process = await asyncio.create_subprocess_exec(
            "sudo",
            "tee",
            SSH_CONFIG_FILE,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        await asyncio.wait_for(
            process.communicate(input=config_text.encode()), timeout=SSH_TIMEOUT
        )
    except Exception:
        logging.error("Failed to restore original SSH config")
