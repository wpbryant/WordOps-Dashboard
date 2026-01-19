"""Pydantic models for server metrics data."""

from enum import Enum

from pydantic import BaseModel


class TimeRange(str, Enum):
    """Time range options for metric queries."""

    FIVE_MIN = "5m"
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
