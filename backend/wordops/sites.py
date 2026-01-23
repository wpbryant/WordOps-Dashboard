"""WordOps site management CLI wrappers."""

import re

from .cli import run_command
from .exceptions import ParseError
from .models import CacheType, Site, SiteType


def validate_domain(domain: str) -> bool:
    """
    Validate a domain name to prevent command injection.

    Only allows alphanumeric characters, dots, and hyphens.
    Rejects anything suspicious that could be used for shell injection.

    Args:
        domain: The domain name to validate

    Returns:
        True if domain is safe, False otherwise
    """
    if not domain or len(domain) > 253:
        return False

    # Only allow alphanumeric, dots, and hyphens
    # Must not start or end with a hyphen or dot
    pattern = r"^[a-zA-Z0-9]([a-zA-Z0-9\-\.]*[a-zA-Z0-9])?$"

    if not re.match(pattern, domain):
        return False

    # Additional checks: no consecutive dots, no leading/trailing dots
    if ".." in domain or domain.startswith(".") or domain.endswith("."):
        return False

    # No shell metacharacters or suspicious patterns
    suspicious_patterns = [
        ";", "&", "|", "$", "`", "(", ")", "{", "}", "[", "]",
        "<", ">", "!", "~", "'", '"', "\\", "\n", "\r", "\t", " "
    ]
    for char in suspicious_patterns:
        if char in domain:
            return False

    return True


def _parse_site_type(type_str: str) -> SiteType:
    """
    Parse site type string from WordOps output to SiteType enum.

    Args:
        type_str: The type string from wo site list output

    Returns:
        Corresponding SiteType enum value
    """
    type_lower = type_str.lower().strip()

    if "wp" in type_lower or "wordpress" in type_lower:
        return SiteType.WORDPRESS
    elif "php" in type_lower:
        return SiteType.PHP
    elif "html" in type_lower or "static" in type_lower:
        return SiteType.HTML
    elif "proxy" in type_lower:
        return SiteType.PROXY
    elif "mysql" in type_lower:
        return SiteType.MYSQL

    # Default to PHP if unknown
    return SiteType.PHP


def _parse_cache_type(cache_str: str | None) -> str | None:
    """
    Parse cache type from WordOps output.

    Args:
        cache_str: The cache string from wo output

    Returns:
        Normalized cache type or None
    """
    if not cache_str:
        return None

    cache_lower = cache_str.lower().strip()

    if cache_lower in ("none", "-", ""):
        return None
    elif "redis" in cache_lower:
        return "redis"
    elif "wpredis" in cache_lower:
        return "wpredis"
    elif "wpsc" in cache_lower or "supercache" in cache_lower:
        return "wpsc"
    elif "wpfc" in cache_lower or "fastcgi" in cache_lower:
        return "wpfc"

    return cache_str.strip() if cache_str.strip() else None


async def list_sites() -> list[Site]:
    """
    List all WordOps managed sites.

    Returns:
        List of Site objects for all sites on the server.
        Returns empty list if no sites exist.

    Raises:
        CommandNotFoundError: If wo binary not found
        CommandFailedError: If command fails
        ParseError: If output cannot be parsed
    """
    try:
        output = await run_command(["site", "list"])
    except Exception:
        # Re-raise any command errors
        raise

    if not output or output.strip() == "":
        return []

    # First, extract just the domain names from the list output
    domains: list[str] = []
    lines = output.strip().split("\n")

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Skip header lines or separator lines
        if line.startswith("-") or line.startswith("="):
            continue
        if "site" in line.lower() and "type" in line.lower():
            continue

        parts = line.split()
        if not parts:
            continue

        domain = parts[0].strip()

        # Skip if domain looks like a header or separator
        if validate_domain(domain):
            domains.append(domain)

    # Now fetch detailed info for each domain to get PHP version, database info, etc.
    sites: list[Site] = []
    for domain in domains:
        try:
            site_info = await get_site_info(domain)
            if site_info:
                sites.append(site_info)
        except Exception as e:
            # Log error but continue with other sites
            import logging
            logging.warning(f"Failed to fetch info for {domain}: {e}")
            # Create a basic site object with at least the domain
            sites.append(
                Site(
                    name=domain,
                    type=SiteType.WORDPRESS,
                    ssl=False,
                    cache=None,
                    php_version=None,
                    database=None,
                )
            )

    return sites


async def get_site_info(domain: str) -> Site | None:
    """
    Get detailed information about a specific site.

    Args:
        domain: The domain name of the site

    Returns:
        Site object with detailed info, or None if site not found

    Raises:
        ValueError: If domain validation fails
        CommandNotFoundError: If wo binary not found
        CommandFailedError: If command fails (except for "site not found")
    """
    if not validate_domain(domain):
        raise ValueError(f"Invalid domain name: {domain}")

    try:
        output = await run_command(["site", "info", domain])
    except Exception as e:
        # Check if error indicates site not found
        error_msg = str(e).lower()
        if "not" in error_msg and "found" in error_msg:
            return None
        if "does not exist" in error_msg:
            return None
        raise

    if not output:
        return None

    # Parse site info output
    # WordOps site info format (varies by version):
    # Nginx configuration     wp basic (enabled)
    # PHP Version         8.3
    # SSL             disabled
    # DB_NAME             baby_com_lK4O2jPu
    # DB_USER             babycomDQRi
    # DB_PASS             9TnEui1Dorlc2qeU3CzWdk4t

    from .models import DatabaseInfo

    site_type = SiteType.WORDPRESS
    ssl = False
    cache = None
    php_version = None
    db_name = None
    db_user = None
    db_pass = None

    lines = output.strip().split("\n")

    for line in lines:
        line_stripped = line.strip()
        line_lower = line.lower().strip()

        # Parse site type from "Nginx configuration" line
        if "nginx configuration" in line_lower:
            # Extract the part between "configuration" and "(enabled)"
            if "enabled" in line_lower:
                parts = line_stripped.split()
                for i, part in enumerate(parts):
                    if part.lower() == "configuration" and i + 1 < len(parts):
                        config_value = parts[i + 1].lower()
                        # Parse site type from config value
                        if "wp" in config_value and "basic" in config_value:
                            site_type = SiteType.WORDPRESS
                        elif "wp" in config_value and "fc" in config_value:
                            site_type = SiteType.WORDPRESS
                            cache = "wpfc"
                        elif "wp" in config_value and "redis" in config_value:
                            site_type = SiteType.WORDPRESS
                            cache = "redis"
                        elif "php" in config_value:
                            site_type = SiteType.PHP
                        elif "html" in config_value or "static" in config_value:
                            site_type = SiteType.HTML
                        elif "proxy" in config_value:
                            site_type = SiteType.PROXY
                        break

        # Parse SSL status
        if "ssl" in line_lower:
            # Format: "SSL             disabled" or "SSL             enabled"
            parts = line_stripped.split()
            if len(parts) >= 2:
                ssl = parts[1].lower() in ("enabled", "active", "yes", "on", "true")

        # Parse PHP version - format: "PHP Version         8.3"
        if "php version" in line_lower:
            parts = line_stripped.split()
            if len(parts) >= 3:
                # Extract version number (e.g., "8.3", "8.1")
                # Format is "PHP Version X.Y" so version is at index 2
                php_match = re.search(r"(\d+\.\d+)", parts[2])
                if php_match:
                    php_version = php_match.group(1)
                    # Debug logging
                    import logging
                    logging.info(f"Parsed PHP version {php_version} from line: {line_stripped}")
                else:
                    import logging
                    logging.warning(f"Failed to parse PHP version from line: {line_stripped}")

        # Parse database info - format: "DB_NAME             baby_com_lK4O2jPu"
        if "db_name" in line_lower:
            parts = line_stripped.split()
            if len(parts) >= 2:
                db_name = parts[1].strip()

        if "db_user" in line_lower:
            parts = line_stripped.split()
            if len(parts) >= 2:
                db_user = parts[1].strip()

        if "db_pass" in line_lower:
            parts = line_stripped.split()
            if len(parts) >= 2:
                db_pass = parts[1].strip()

    # If database info wasn't found in output, generate from domain
    if not db_name and site_type in (SiteType.WORDPRESS, SiteType.PHP, SiteType.MYSQL):
        db_name = f"{domain.replace('.', '_').replace('-', '_')}_db"

    if not db_user and site_type in (SiteType.WORDPRESS, SiteType.PHP, SiteType.MYSQL):
        db_user = domain.replace('.', '_').replace('-', '_')

    database = None
    if db_name or db_user:
        database = DatabaseInfo(
            name=db_name,
            user=db_user,
            password=db_pass,
            host="localhost"
        )

    return Site(
        name=domain,
        type=site_type,
        ssl=ssl,
        cache=cache,
        php_version=php_version,
        database=database,
    )


async def create_site(
    domain: str,
    site_type: SiteType = SiteType.WORDPRESS,
    ssl: bool = True,
    cache: CacheType | None = None,
    php_version: str | None = None,
) -> Site:
    """
    Create a new WordOps site.

    Args:
        domain: The domain name for the site
        site_type: Type of site (wordpress, php, html, proxy, mysql)
        ssl: Whether to enable SSL (Let's Encrypt)
        cache: Cache type (wpfc, wpsc, wpredis, redis, none)
        php_version: PHP version (e.g., "8.1", "8.2")

    Returns:
        Site object for the newly created site

    Raises:
        ValueError: If domain validation fails
        CommandFailedError: If site creation fails
    """
    if not validate_domain(domain):
        raise ValueError(f"Invalid domain name: {domain}")

    # Build wo site create command
    args = ["site", "create", domain]

    # Add site type flag
    type_flags = {
        SiteType.WORDPRESS: "--wp",
        SiteType.PHP: "--php",
        SiteType.HTML: "--html",
        SiteType.PROXY: "--proxy",
        SiteType.MYSQL: "--mysql",
    }
    args.append(type_flags.get(site_type, "--wp"))

    # Add cache flag if specified
    if cache and cache != CacheType.NONE:
        cache_flags = {
            CacheType.WPFC: "--wpfc",
            CacheType.WPSC: "--wpsc",
            CacheType.WPREDIS: "--wpredis",
            CacheType.REDIS: "--wpredis",  # Redis uses wpredis flag
        }
        if cache in cache_flags:
            args.append(cache_flags[cache])

    # Add SSL flag
    if ssl:
        args.append("--letsencrypt")

    # Add PHP version if specified
    if php_version:
        # Validate PHP version format (e.g., "8.3", "8.2")
        if not re.match(r"^\d+\.\d+$", php_version):
            raise ValueError(f"Invalid PHP version format: {php_version}")
        # WordOps uses format like --php83, --php82 (no dot)
        php_flag = f"--php{php_version.replace('.', '')}"
        args.append(php_flag)

    # Execute with longer timeout for site creation (can take a while)
    # Capture output to parse WordPress admin credentials
    output = await run_command(args, timeout=300)

    # Parse WordPress admin credentials from output if this is a WordPress site
    wp_admin_url = None
    wp_admin_user = None
    wp_admin_password = None

    if site_type == SiteType.WORDPRESS and output:
        lines = output.strip().split("\n")
        for line in lines:
            line_lower = line.lower()
            # Look for WordPress admin URL
            if "wordpress admin" in line_lower and "http" in line_lower:
                parts = line.split("http")
                if len(parts) > 1:
                    wp_admin_url = "http" + parts[1].strip()

            # Look for WordPress username
            if "wordpress username" in line_lower or "admin user" in line_lower:
                parts = line.split(":")
                if len(parts) > 1:
                    wp_admin_user = parts[1].strip()

            # Look for WordPress password
            if "wordpress password" in line_lower or "admin password" in line_lower:
                parts = line.split(":")
                if len(parts) > 1:
                    wp_admin_password = parts[1].strip()

    # Fetch and return the created site info
    site = await get_site_info(domain)

    # Add WordPress admin credentials to site info
    if site:
        site.wp_admin_url = wp_admin_url
        site.wp_admin_user = wp_admin_user
        site.wp_admin_password = wp_admin_password
        return site

    # Site was created but we couldn't fetch info - return basic info
    return Site(
        name=domain,
        type=site_type,
        ssl=ssl,
        cache=cache.value if cache else None,
        php_version=php_version,
        wp_admin_url=wp_admin_url,
        wp_admin_user=wp_admin_user,
        wp_admin_password=wp_admin_password,
    )


async def update_site(
    domain: str,
    ssl: bool | None = None,
    cache: CacheType | None = None,
    php_version: str | None = None,
) -> Site:
    """
    Update an existing WordOps site.

    Args:
        domain: The domain name of the site
        ssl: Enable (True) or disable (False) SSL, or None to skip
        cache: New cache type, or None to skip
        php_version: New PHP version, or None to skip

    Returns:
        Updated Site object

    Raises:
        ValueError: If domain validation fails or site not found
        CommandFailedError: If update fails
    """
    if not validate_domain(domain):
        raise ValueError(f"Invalid domain name: {domain}")

    # Verify site exists first
    existing = await get_site_info(domain)
    if existing is None:
        raise ValueError(f"Site not found: {domain}")

    # Build update commands - WordOps uses separate commands for different updates
    commands_to_run = []

    # SSL toggle
    if ssl is not None:
        if ssl and not existing.ssl:
            # Enable SSL
            commands_to_run.append(["site", "update", domain, "--letsencrypt"])
        elif not ssl and existing.ssl:
            # Disable SSL (remove letsencrypt)
            commands_to_run.append(["site", "update", domain, "--letsencrypt=off"])

    # Cache change
    if cache is not None:
        cache_flags = {
            CacheType.NONE: "--wpfc=off",  # Disable cache
            CacheType.WPFC: "--wpfc",
            CacheType.WPSC: "--wpsc",
            CacheType.WPREDIS: "--wpredis",
            CacheType.REDIS: "--wpredis",
        }
        if cache in cache_flags:
            commands_to_run.append(["site", "update", domain, cache_flags[cache]])

    # PHP version change
    if php_version is not None:
        if not re.match(r"^\d+\.\d+$", php_version):
            raise ValueError(f"Invalid PHP version format: {php_version}")
        # WordOps uses format like --php83, --php82 (no dot, no equals)
        php_flag = f"--php{php_version.replace('.', '')}"
        commands_to_run.append(["site", "update", domain, php_flag])

    # Execute all update commands
    for args in commands_to_run:
        await run_command(args, timeout=120)

    # Return updated site info
    updated = await get_site_info(domain)
    return updated if updated else existing


async def delete_site(domain: str) -> bool:
    """
    Delete a WordOps site.

    Args:
        domain: The domain name of the site to delete

    Returns:
        True if deletion was successful

    Raises:
        ValueError: If domain validation fails or site not found
        CommandFailedError: If deletion fails
    """
    if not validate_domain(domain):
        raise ValueError(f"Invalid domain name: {domain}")

    # Verify site exists first
    existing = await get_site_info(domain)
    if existing is None:
        raise ValueError(f"Site not found: {domain}")

    # Build delete command - --no-prompt skips confirmation
    args = ["site", "delete", domain, "--no-prompt"]

    await run_command(args, timeout=60)

    return True


async def get_site_monitoring_info(domain: str) -> dict:
    """
    Get monitoring information for a specific site.

    Args:
        domain: The domain name of the site

    Returns:
        Dictionary with disk_usage, bandwidth_month, and inodes_used

    Raises:
        ValueError: If domain validation fails
    """
    if not validate_domain(domain):
        raise ValueError(f"Invalid domain name: {domain}")

    # Site install path
    site_path = f"/var/www/{domain}"

    # Import asyncio for subprocess commands
    import asyncio

    # Get disk usage for the site directory
    disk_usage = "N/A"
    try:
        process = await asyncio.create_subprocess_exec(
            "du",
            "-sh",
            site_path,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await asyncio.wait_for(process.communicate(), timeout=10.0)
        output = stdout.decode("utf-8").strip()
        # Output format: "2.5G    /var/www/example.com"
        if output:
            parts = output.split()
            if parts:
                disk_usage = parts[0]
    except (asyncio.TimeoutError, FileNotFoundError, Exception):
        disk_usage = "N/A"

    # Get inodes count for the site directory (just the count, not percentage)
    inodes_used = "N/A"
    try:
        # Use find to count files/directories (each uses an inode)
        process = await asyncio.create_subprocess_exec(
            "find",
            site_path,
            "-xdev",
            "-type",
            "f",
            "-o",
            "-type",
            "d",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await asyncio.wait_for(process.communicate(), timeout=30.0)

        # Count the number of lines (files + directories)
        inodes_count = len([line for line in stdout.decode("utf-8").split("\n") if line.strip()])

        if inodes_count > 0:
            inodes_used = f"{inodes_count:,}"
    except (asyncio.TimeoutError, FileNotFoundError, Exception):
        inodes_used = "N/A"

    # Get bandwidth from nginx access logs
    bandwidth_month = "N/A"
    try:
        # Nginx access log path for the site
        # WordOps uses format: {domain}.access.log
        access_log = f"/var/log/nginx/{domain}.access.log"

        # Check if log file exists and is readable
        process = await asyncio.create_subprocess_exec(
            "test",
            "-f",
            access_log,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        await process.communicate()

        if process.returncode == 0:
            # Log file exists - try to parse it
            # Use a simple approach: grep for current month in logs and extract bytes
            # This is more reliable than complex awk scripts
            current_month = ""
            try:
                date_process = await asyncio.create_subprocess_exec(
                    "date",
                    "+%b/%Y",
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                stdout, _ = await asyncio.wait_for(date_process.communicate(), timeout=5.0)
                current_month = stdout.decode("utf-8").strip()
            except Exception:
                pass

            if current_month:
                # Try to extract body_bytes_sent from nginx logs
                # Standard nginx combined log format has bytes sent as the last field
                # Or use $body_bytes_sent in custom format
                process = await asyncio.create_subprocess_shell(
                    f"grep '{current_month}' {access_log} 2>/dev/null | awk '{{sum+=$NF}} END {{print sum}}'",
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                stdout, _ = await asyncio.wait_for(process.communicate(), timeout=30.0)
                bytes_sent = stdout.decode("utf-8").strip()

                if bytes_sent and bytes_sent != "0" and bytes_sent != "":
                    try:
                        bytes_val = int(float(bytes_sent))
                        # Convert to human readable
                        if bytes_val < 1024:
                            bandwidth_month = f"{bytes_val} B"
                        elif bytes_val < 1024 * 1024:
                            bandwidth_month = f"{bytes_val / 1024:.1f} KB"
                        elif bytes_val < 1024 * 1024 * 1024:
                            bandwidth_month = f"{bytes_val / (1024 * 1024):.1f} MB"
                        else:
                            bandwidth_month = f"{bytes_val / (1024 * 1024 * 1024):.2f} GB"
                    except ValueError:
                        bandwidth_month = "N/A"
    except (asyncio.TimeoutError, FileNotFoundError, Exception):
        bandwidth_month = "N/A"

    return {
        "disk_usage": disk_usage,
        "bandwidth_month": bandwidth_month,
        "inodes_used": inodes_used,
    }
