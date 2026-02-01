"""Log file reading utilities for WordOps Dashboard.

Security: Log paths are hardcoded - never construct paths from user input.
"""

import logging
import re
from collections import deque
from datetime import datetime

import aiofiles

from backend.server.models import ServerLog

logger = logging.getLogger(__name__)

# Maximum lines allowed to prevent memory issues
MAX_LINES = 500

# Hardcoded log file paths - NEVER construct from user input
LOG_PATHS: dict[str, str] = {
    "nginx-access": "/var/log/nginx/access.log",
    "nginx-error": "/var/log/nginx/error.log",
    "php-fpm": "/var/log/php8.2-fpm.log",
    "mysql": "/var/log/mysql/error.log",
    "fail2ban": "/var/log/fail2ban.log",
    "ufw": "/var/log/ufw.log",
    "system": "/var/log/syslog",
}

# Log source mapping for frontend
LOG_SOURCE_MAP: dict[str, str] = {
    "nginx-access": "nginx",
    "nginx-error": "nginx",
    "php-fpm": "php",
    "mysql": "mysql",
    "fail2ban": "fail2ban",
    "ufw": "ufw",
    "system": "system",
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


def parse_log_entry(raw_line: str, source: str, line_index: int) -> ServerLog:
    """Parse a log line into a structured ServerLog entry.

    Args:
        raw_line: The raw log line to parse
        source: The log source type (nginx-access, nginx-error, php-fpm, mysql, system, fail2ban, ufw)
        line_index: Line number for unique ID generation

    Returns:
        ServerLog object with parsed data
    """
    # Generate unique ID
    entry_id = f"{int(datetime.now().timestamp())}-{line_index}"

    # Get display source name
    display_source = LOG_SOURCE_MAP.get(source, source)

    # Default values
    timestamp = int(datetime.now().timestamp())
    severity = "info"
    message = raw_line.strip()
    client_ip = None

    # Empty line - skip or return minimal entry
    if not message:
        return ServerLog(
            id=entry_id,
            source=display_source,
            timestamp=timestamp,
            severity=severity,
            message="(empty line)",
            client_ip=None,
            raw_line=raw_line,
        )

    # Nginx access log parsing (combined log format)
    # Example: 192.168.1.1 - - [01/Feb/2026:12:00:00 +0000] "GET /path HTTP/1.1" 200 1234 "https://example.com" "Mozilla/5.0"
    if source == "nginx-access":
        nginx_access_pattern = r'^(\S+)\s+-\s+\S+\s+\[([^\]]+)\]\s+"(\w+)\s+(\S+)\s+[^"]*"\s+(\d+)\s+(\d+)'
        match = re.match(nginx_access_pattern, raw_line)
        if match:
            client_ip = match.group(1)
            timestamp_str = match.group(2)
            method = match.group(3)
            path = match.group(4)
            status_code = match.group(5)

            # Parse nginx timestamp
            try:
                timestamp = int(datetime.strptime(timestamp_str, "%d/%b/%Y:%H:%M:%S %z").timestamp())
            except (ValueError, OSError):
                pass

            message = f"{method} {path} - {status_code}"
            severity = "info"
            if status_code.startswith("5"):
                severity = "error"
            elif status_code.startswith("4"):
                severity = "warn"

    # Nginx error log parsing
    # Example: 2026/02/01 12:00:00 [error] 1234#1234: *1 directory index of "/var/www/html/" is forbidden
    elif source == "nginx-error":
        nginx_error_pattern = r'^(\d{4}/\d{2}/\d{2}\s+\d{2}:\d{2}:\d{2})\s+\[(\w+)\]'
        match = re.match(nginx_error_pattern, raw_line)
        if match:
            timestamp_str = match.group(1)
            severity = match.group(2).lower()
            if severity not in ["debug", "info", "warn", "error", "fatal"]:
                severity = "error" if severity == "error" else "info"

            # Parse nginx timestamp
            try:
                timestamp = int(datetime.strptime(timestamp_str, "%Y/%m/%d %H:%M:%S").timestamp())
            except (ValueError, OSError):
                pass

            # Extract message after the bracket
            message_part = raw_line.split("]", 1)
            if len(message_part) > 1:
                message = message_part[1].strip()

    # PHP-FPM log parsing
    # Example: [01-Feb-2026 12:00:00] WARNING: pool www
    elif source == "php-fpm":
        php_pattern = r'^\[([^\]]+)\]\s+(\w+):\s*(.*)'
        match = re.match(php_pattern, raw_line)
        if match:
            timestamp_str = match.group(1)
            severity_str = match.group(2).lower()
            message = match.group(3) or raw_line

            # Map PHP severity levels
            severity_map = {
                "debug": "debug",
                "info": "info",
                "notice": "info",
                "warning": "warn",
                "warn": "warn",
                "error": "error",
                "critical": "fatal",
                "fatal": "fatal",
            }
            severity = severity_map.get(severity_str, "info")

            # Parse PHP timestamp
            try:
                timestamp = int(datetime.strptime(timestamp_str, "%d-%b-%Y %H:%M:%S").timestamp())
            except (ValueError, OSError):
                pass

    # MySQL error log parsing
    # Example: 2026-02-01T12:00:00.123456Z 0 [Note] Some message
    elif source == "mysql":
        mysql_pattern = r'^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[^\s]*)\s+\d+\s+\[(\w+)\]\s*(.*)'
        match = re.match(mysql_pattern, raw_line)
        if match:
            timestamp_str = match.group(1)
            severity_str = match.group(2).lower()
            message = match.group(3) or raw_line

            # Map MySQL severity levels
            severity_map = {
                "note": "info",
                "info": "info",
                "warning": "warn",
                "error": "error",
                "critical": "fatal",
            }
            severity = severity_map.get(severity_str, "info")

            # Parse MySQL timestamp (ISO 8601)
            try:
                # Remove microseconds if present
                ts_clean = timestamp_str.split(".")[0] + "Z"
                timestamp = int(datetime.fromisoformat(ts_clean.replace("Z", "+00:00")).timestamp())
            except (ValueError, OSError):
                pass

    # Fail2ban log parsing
    # Example: 2026-02-01 12:00:00 fail2ban.actions [1234]: NOTICE [sshd] Ban 192.168.1.1
    elif source == "fail2ban":
        fail2ban_pattern = r'^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\s+fail2ban\.\w+\s+\[\d+\]:\s+(\w+)\s+(.*)'
        match = re.match(fail2ban_pattern, raw_line)
        if match:
            timestamp_str = match.group(1)
            severity_str = match.group(2).lower()
            message = match.group(3) or raw_line

            # Map fail2ban severity
            severity_map = {
                "debug": "debug",
                "info": "info",
                "notice": "info",
                "warning": "warn",
                "error": "error",
                "critical": "fatal",
            }
            severity = severity_map.get(severity_str, "info")

            # Try to extract IP from fail2ban messages
            ip_match = re.search(r'(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})', message)
            if ip_match:
                client_ip = ip_match.group(1)

            # Parse timestamp
            try:
                timestamp = int(datetime.strptime(timestamp_str, "%Y-%m-%d %H:%M:%S").timestamp())
            except (ValueError, OSError):
                pass

    # UFW firewall log parsing (syslog format)
    # Example: Feb  1 12:00:00 hostname kernel: [UFW BLOCK] ...
    elif source == "ufw":
        # UFW logs are in syslog format
        syslog_pattern = r'^(\w+\s+\d+\s+\d{2}:\d{2}:\d{2})\s+(\S+)\s+(\S+):\s*(.*)'
        match = re.match(syslog_pattern, raw_line)
        if match:
            timestamp_str = match.group(1)
            hostname = match.group(2)
            app = match.group(3)
            message = match.group(4) or raw_line

            # Determine severity based on message content
            if "BLOCK" in message.upper():
                severity = "warn"
            elif "ALLOW" in message.upper():
                severity = "info"

            # Try to extract IP from UFW messages
            ip_match = re.search(r'SRC=(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})', message)
            if ip_match:
                client_ip = ip_match.group(1)

            # Parse syslog timestamp (add current year)
            try:
                current_year = datetime.now().year
                timestamp = int(datetime.strptime(f"{current_year} {timestamp_str}", "%Y %b %d %H:%M:%S").timestamp())
            except (ValueError, OSError):
                pass

    # System log parsing (syslog format)
    # Example: Feb  1 12:00:00 hostname systemd[1]: Started Some Service
    elif source == "system":
        syslog_pattern = r'^(\w+\s+\d+\s+\d{2}:\d{2}:\d{2})\s+(\S+)\s+(\S+?)(?:\[\d+\])?:\s*(.*)'
        match = re.match(syslog_pattern, raw_line)
        if match:
            timestamp_str = match.group(1)
            hostname = match.group(2)
            app = match.group(3)
            message = match.group(4) or raw_line

            # Determine severity based on app and message content
            if any(keyword in message.lower() for keyword in ["error", "failed", "failure"]):
                severity = "error"
            elif any(keyword in message.lower() for keyword in ["warning", "warn"]):
                severity = "warn"
            elif any(keyword in message.lower() for keyword in ["debug"]):
                severity = "debug"

            # Parse syslog timestamp (add current year)
            try:
                current_year = datetime.now().year
                timestamp = int(datetime.strptime(f"{current_year} {timestamp_str}", "%Y %b %d %H:%M:%S").timestamp())
            except (ValueError, OSError):
                pass

    # Ensure severity is valid
    if severity not in ["debug", "info", "warn", "error", "fatal"]:
        severity = "info"

    return ServerLog(
        id=entry_id,
        source=display_source,
        timestamp=timestamp,
        severity=severity,
        message=message,
        client_ip=client_ip,
        raw_line=raw_line,
    )


async def get_log_entries(
    source: str | None = None,
    search: str | None = None,
    limit: int = 500,
) -> list[ServerLog]:
    """Get parsed log entries from multiple sources with filtering.

    Args:
        source: Optional log source filter (nginx, php, mysql, system, fail2ban, ufw)
        search: Optional text search query (searches message, source, severity)
        limit: Maximum entries to return (default 500, max 1000)

    Returns:
        List of ServerLog objects sorted by timestamp descending (newest first)
    """
    # Clamp limit
    limit = min(limit, 1000)

    all_entries: list[ServerLog] = []

    # Determine which log types to read
    if source:
        # Map frontend source names to backend log types
        source_to_log_types: dict[str, list[str]] = {
            "nginx": ["nginx-access", "nginx-error"],
            "php": ["php-fpm"],
            "mysql": ["mysql"],
            "system": ["system"],
            "fail2ban": ["fail2ban"],
            "ufw": ["ufw"],
        }

        log_types = source_to_log_types.get(source, [])
    else:
        # Read all log types
        log_types = list(LOG_PATHS.keys())

    # Read from each log type
    for log_type in log_types:
        if log_type not in LOG_PATHS:
            continue

        # Read last N lines from this log
        lines_per_source = limit // len(log_types) + 50  # Get extra for filtering
        raw_lines = await tail_log(log_type, lines_per_source)

        # Parse each line
        for line_index, raw_line in enumerate(raw_lines):
            entry = parse_log_entry(raw_line, log_type, line_index)

            # Apply search filter if provided
            if search:
                search_lower = search.lower()
                if not (
                    search_lower in entry.message.lower()
                    or search_lower in entry.source.lower()
                    or search_lower in entry.severity.lower()
                    or (entry.client_ip and search_lower in entry.client_ip)
                ):
                    continue

            all_entries.append(entry)

    # Sort by timestamp descending (newest first)
    all_entries.sort(key=lambda x: x.timestamp, reverse=True)

    # Apply limit
    return all_entries[:limit]
