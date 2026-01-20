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

    sites: list[Site] = []
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

        # Parse the line - WordOps output format varies
        # Common formats:
        # - "example.com" (just domain)
        # - "example.com    wp    ssl    wpfc" (tabular)
        parts = line.split()

        if not parts:
            continue

        domain = parts[0].strip()

        # Skip if domain looks like a header or separator
        if not validate_domain(domain):
            continue

        # Try to extract additional info from remaining parts
        site_type = SiteType.WORDPRESS  # Default assumption
        ssl = False
        cache = None

        for part in parts[1:]:
            part_lower = part.lower().strip()

            # Check for site type
            if any(t in part_lower for t in ["wp", "wordpress"]):
                site_type = SiteType.WORDPRESS
            elif "php" in part_lower:
                site_type = SiteType.PHP
            elif "html" in part_lower or "static" in part_lower:
                site_type = SiteType.HTML
            elif "proxy" in part_lower:
                site_type = SiteType.PROXY
            elif "mysql" in part_lower:
                site_type = SiteType.MYSQL

            # Check for SSL
            if part_lower in ("ssl", "https", "le", "letsencrypt"):
                ssl = True

            # Check for cache
            if any(c in part_lower for c in ["redis", "wpsc", "wpfc", "cache"]):
                cache = _parse_cache_type(part)

        sites.append(
            Site(
                name=domain,
                type=site_type,
                ssl=ssl,
                cache=cache,
                php_version=None,  # Not available in list output
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
    # WordOps site info format typically includes:
    # Site Name: example.com
    # Site Type: wp
    # Cache: wpfc
    # SSL: enabled
    # PHP: 8.1

    site_type = SiteType.WORDPRESS
    ssl = False
    cache = None
    php_version = None

    lines = output.strip().split("\n")

    for line in lines:
        line_lower = line.lower().strip()

        # Parse site type
        if "type" in line_lower and ":" in line:
            value = line.split(":", 1)[1].strip()
            site_type = _parse_site_type(value)

        # Parse SSL status
        if "ssl" in line_lower and ":" in line:
            value = line.split(":", 1)[1].strip().lower()
            ssl = value in ("enabled", "true", "yes", "on", "le", "letsencrypt")

        # Parse cache
        if "cache" in line_lower and ":" in line:
            value = line.split(":", 1)[1].strip()
            cache = _parse_cache_type(value)

        # Parse PHP version
        if "php" in line_lower and ":" in line:
            value = line.split(":", 1)[1].strip()
            # Extract version number (e.g., "8.1", "7.4")
            php_match = re.search(r"(\d+\.\d+)", value)
            if php_match:
                php_version = php_match.group(1)

    return Site(
        name=domain,
        type=site_type,
        ssl=ssl,
        cache=cache,
        php_version=php_version,
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
        # Validate PHP version format
        if not re.match(r"^\d+\.\d+$", php_version):
            raise ValueError(f"Invalid PHP version format: {php_version}")
        args.extend(["--php", php_version])

    # Execute with longer timeout for site creation (can take a while)
    await run_command(args, timeout=300)

    # Fetch and return the created site info
    site = await get_site_info(domain)
    if site is None:
        # Site was created but we couldn't fetch info - return basic info
        return Site(
            name=domain,
            type=site_type,
            ssl=ssl,
            cache=cache.value if cache else None,
            php_version=php_version,
        )

    return site


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
        commands_to_run.append(["site", "update", domain, f"--php={php_version}"])

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
