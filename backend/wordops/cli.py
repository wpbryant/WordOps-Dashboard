"""WordOps CLI wrapper for safe command execution."""

import asyncio
import shutil

from .exceptions import CommandFailedError, CommandNotFoundError

# Standard WordOps binary location
WO_BINARY = "/usr/local/bin/wo"


async def run_command(args: list[str], timeout: int = 30) -> str:
    """
    Execute a WordOps command safely.

    Args:
        args: Command arguments (without the 'wo' binary itself)
        timeout: Maximum seconds to wait for command completion

    Returns:
        stdout from the command

    Raises:
        CommandNotFoundError: If wo binary is not found
        CommandFailedError: If command exits with non-zero status
        asyncio.TimeoutError: If command exceeds timeout
    """
    # Verify wo binary exists
    wo_path = shutil.which("wo") or WO_BINARY
    if not shutil.which("wo") and not await _binary_exists(WO_BINARY):
        raise CommandNotFoundError(f"WordOps binary not found at {WO_BINARY}")

    # Build command - NEVER use shell=True or string interpolation
    cmd = [wo_path] + args

    try:
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        stdout, stderr = await asyncio.wait_for(
            process.communicate(), timeout=timeout
        )

        stdout_str = stdout.decode("utf-8", errors="replace").strip()
        stderr_str = stderr.decode("utf-8", errors="replace").strip()

        if process.returncode != 0:
            raise CommandFailedError(
                message=f"Command failed with exit code {process.returncode}: {stderr_str or stdout_str}",
                returncode=process.returncode,
                stderr=stderr_str,
            )

        return stdout_str

    except FileNotFoundError:
        raise CommandNotFoundError(f"WordOps binary not found at {wo_path}")


async def check_wordops_available() -> bool:
    """
    Check if WordOps CLI is installed and accessible.

    Returns:
        True if wo --version succeeds, False otherwise
    """
    try:
        await run_command(["--version"], timeout=5)
        return True
    except (CommandNotFoundError, CommandFailedError):
        return False


async def _binary_exists(path: str) -> bool:
    """Check if a binary exists at the given path."""
    import os

    return os.path.isfile(path) and os.access(path, os.X_OK)
