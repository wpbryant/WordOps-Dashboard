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
