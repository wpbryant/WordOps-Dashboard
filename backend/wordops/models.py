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


class Site(BaseModel):
    """Represents a WordOps managed site."""

    name: str
    type: SiteType
    ssl: bool = False
    cache: str | None = None
    php_version: str | None = None

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
