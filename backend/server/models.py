"""Pydantic models for server metrics and service status data."""

from enum import Enum

from pydantic import BaseModel


class TimeRange(str, Enum):
    """Time range options for metric queries."""

    FIVE_MIN = "5m"
    TEN_MIN = "10m"
    ONE_HOUR = "1h"
    ONE_DAY = "24h"


class MetricPoint(BaseModel):
    """A single data point in a metric time series."""

    timestamp: int
    value: float


class MetricData(BaseModel):
    """Metric data with current value and historical points for sparklines."""

    name: str
    current: float
    unit: str
    points: list[MetricPoint]


class SystemMetrics(BaseModel):
    """Complete system metrics snapshot."""

    cpu: MetricData
    ram: MetricData
    disk: MetricData
    network_in: MetricData
    network_out: MetricData


class ServiceStatus(BaseModel):
    """Status information for a system service."""

    name: str
    active: bool
    sub_state: str
    memory_bytes: int | None = None
    uptime_seconds: int | None = None
    main_pid: int | None = None


class SystemInfo(BaseModel):
    """System information including hostname, uptime, and updates."""

    hostname: str
    uptime_seconds: int
    boot_time: int  # Unix timestamp
    security_updates: int
    other_updates: int
    disk_usage_percent: int
    public_ip: str  # Server's public IP address
    inodes_used: int | None = None  # Number of inodes used
    inodes_total: int | None = None  # Total inodes available
    inodes_percent: int | None = None  # Percentage of inodes used


class LogType(str, Enum):
    """Supported log file types."""

    NGINX_ACCESS = "nginx-access"
    NGINX_ERROR = "nginx-error"
    PHP_FPM = "php-fpm"
    MYSQL = "mysql"


class LogEntry(BaseModel):
    """Log file content response."""

    lines: list[str]
    log_type: LogType
    timestamp: int


class ServerOverviewInfo(BaseModel):
    """Server overview information including OS, kernel, WordOps version, and updates."""

    hostname: str
    public_ip: str
    os_version: str
    kernel_version: str
    uptime_seconds: int
    wordops_version: str | None = None
    security_updates: int
    other_updates: int
    last_backup_date: str | None = None


class PackageUpdateRequest(BaseModel):
    """Request model for package updates."""

    update_type: str  # "all" or "security"


class PackageUpdateResponse(BaseModel):
    """Response model for package updates."""

    status: str  # "running", "completed", "failed"
    message: str
    updated_count: int
