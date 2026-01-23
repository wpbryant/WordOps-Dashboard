"""Pydantic models for WordOps site data."""

from enum import Enum

from pydantic import BaseModel


class SiteType(str, Enum):
    """Types of sites that WordOps can create."""

    WORDPRESS = "wordpress"
    PHP = "php"
    HTML = "html"
    PROXY = "proxy"
    MYSQL = "mysql"


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

    class Config:
        """Pydantic model configuration."""

        use_enum_values = True


class CreateSiteRequest(BaseModel):
    """Request body for creating a new site."""

    domain: str
    type: SiteType = SiteType.WORDPRESS
    ssl: bool = True
    cache: CacheType | None = None
    php_version: str | None = None  # e.g., "8.1", "8.2"

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
