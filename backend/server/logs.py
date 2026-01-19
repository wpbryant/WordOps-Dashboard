"""Log file reading utilities for WordOps Dashboard.

Security: Log paths are hardcoded - never construct paths from user input.
"""

import logging
from collections import deque

import aiofiles

logger = logging.getLogger(__name__)

# Maximum lines allowed to prevent memory issues
MAX_LINES = 500

# Hardcoded log file paths - NEVER construct from user input
LOG_PATHS: dict[str, str] = {
    "nginx-access": "/var/log/nginx/access.log",
    "nginx-error": "/var/log/nginx/error.log",
    "php-fpm": "/var/log/php8.2-fpm.log",
    "mysql": "/var/log/mysql/error.log",
}


def validate_log_type(log_type: str) -> bool:
    """Validate log type against allowed paths.

    Args:
        log_type: Log type identifier to validate

    Returns:
        True if log type is valid, False otherwise
    """
    return log_type in LOG_PATHS


async def tail_log(log_type: str, lines: int = 50) -> list[str]:
    """Read the last N lines from a log file.

    Args:
        log_type: Type of log file (must be in LOG_PATHS)
        lines: Number of lines to return (max 500)

    Returns:
        List of log lines (empty if file not found or permission denied)

    Raises:
        ValueError: If log_type is not in LOG_PATHS
    """
    if not validate_log_type(log_type):
        raise ValueError(f"Invalid log type: {log_type}")

    # Clamp lines to maximum
    lines = min(lines, MAX_LINES)

    log_path = LOG_PATHS[log_type]

    try:
        async with aiofiles.open(log_path, mode="r") as f:
            # Use deque for efficient tail operation
            content = await f.read()
            all_lines = content.splitlines()
            return all_lines[-lines:] if all_lines else []
    except FileNotFoundError:
        logger.warning(f"Log file not found: {log_path}")
        return []
    except PermissionError:
        logger.warning(f"Permission denied reading log file: {log_path}")
        return []
    except Exception as e:
        logger.error(f"Error reading log file {log_path}: {e}")
        return []
