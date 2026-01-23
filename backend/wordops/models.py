"""Pydantic models for WordOps site data."""

from enum import Enum

from pydantic import BaseModel


class SiteType(str, Enum):
    """Types of sites that WordOps can create."""

    WORDPRESS = "wordpress"
    PHP = "php"
    PHPMYSQL = "phpmysql"
    HTML = "html"
    PROXY = "proxy"
    MYSQL = "mysql"
    ALIAS = "alias"


class CacheType(str, Enum):
    """Cache types supported by WordOps."""

    NONE = "none"
    WPFC = "wpfc"  # FastCGI cache
    WPSC = "wpsc"  # WP Super Cache
    WPREDIS = "wpredis"  # Redis object cache
    REDIS = "redis"  # Redis full page cache


class DatabaseInfo(BaseModel):
    """Database information for a site."""

    name: str | None = None
    user: str | None = None
    password: str | None = None
    host: str = "localhost"


class Site(BaseModel):
    """Represents a WordOps managed site."""

    name: str
    type: SiteType
    ssl: bool = False
    cache: str | None = None
    php_version: str | None = None
    database: DatabaseInfo | None = None
    wp_admin_url: str | None = None
    wp_admin_user: str | None = None
    wp_admin_password: str | None = None
    is_disabled: bool = False  # Whether the site is disabled
    nginx_config: str | None = None  # Nginx configuration content (not included by default)
    alias_target: str | None = None  # For alias sites: the target domain
    proxy_destination: str | None = None  # For proxy sites: the destination URL

    class Config:
        """Pydantic model configuration."""

        use_enum_values = True

    def model_dump(self, **kwargs):
        """Custom dump to ensure nested models are serialized properly."""
        data = super().model_dump(**kwargs)
        # Ensure database is included even if it's a nested model
        if self.database is not None:
            data['database'] = self.database.model_dump(**kwargs)
        return data


class CreateSiteRequest(BaseModel):
    """Request body for creating a new site."""

    domain: str
    type: SiteType = SiteType.WORDPRESS
    ssl: bool = True
    cache: CacheType | None = None
    php_version: str | None = None  # e.g., "8.1", "8.2"
    proxy_destination: str | None = None  # For proxy sites, e.g., "http://localhost:3000"
    alias_target: str | None = None  # For alias sites, e.g., "mainsite.com"

    class Config:
        """Pydantic model configuration."""

        use_enum_values = True


class UpdateSiteRequest(BaseModel):
    """Request body for updating site settings.

    All fields are optional - only provided fields will be updated.
    """

    ssl: bool | None = None  # Enable/disable SSL
    cache: CacheType | None = None  # Change cache type
    php_version: str | None = None  # Change PHP version

    class Config:
        """Pydantic model configuration."""

        use_enum_values = True


class SiteMonitoringInfo(BaseModel):
    """Monitoring information for a specific site."""

    disk_usage: str  # Human-readable disk usage (e.g., "2.5 GB")
    bandwidth_month: str  # Monthly bandwidth (e.g., "15.3 GB")
    inodes_used: str  # Inodes usage (e.g., "25,432 / 100,000")
