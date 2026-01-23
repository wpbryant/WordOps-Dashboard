"""Netdata API client for fetching server metrics."""

import httpx

from backend.config import settings
from backend.server.models import MetricData, MetricPoint, SystemMetrics, TimeRange

# Time range to seconds mapping (negative for relative time)
TIME_RANGE_SECONDS = {
    TimeRange.FIVE_MIN: -300,
    TimeRange.ONE_HOUR: -3600,
    TimeRange.ONE_DAY: -86400,
}

# Points per time range (reasonable sparkline resolution)
TIME_RANGE_POINTS = {
    TimeRange.FIVE_MIN: 60,
    TimeRange.ONE_HOUR: 60,
    TimeRange.ONE_DAY: 144,
}

# Metric contexts to fetch from Netdata
METRIC_CONTEXTS = {
    "cpu": "system.cpu",
    "ram": "system.ram",
    "disk": "system.io",
    "network": "system.net",
}


async def fetch_metric(
    context: str,
    time_range: TimeRange,
    timeout: float = 5.0,
) -> dict:
    """Fetch raw metric data from Netdata API v3.

    Args:
        context: Netdata chart context (e.g., system.cpu)
        time_range: Time range for data query
        timeout: HTTP request timeout in seconds

    Returns:
        Raw JSON response from Netdata API

    Raises:
        httpx.ConnectError: If Netdata is unreachable
        httpx.HTTPStatusError: If Netdata returns error status
    """
    params = {
        "scope_contexts": context,
        "after": TIME_RANGE_SECONDS[time_range],
        "points": TIME_RANGE_POINTS[time_range],
        "format": "json",
        "group": "average",
    }

    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.get(
            f"{settings.NETDATA_URL}/api/v3/data",
            params=params,
        )
        response.raise_for_status()
        return response.json()


def _parse_metric_response(
    raw_data: dict,
    name: str,
    unit: str,
) -> MetricData:
    """Parse Netdata API response into MetricData model.

    Netdata v3 response format:
    {
        "result": {
            "labels": [...],
            "data": [[timestamp, value1, value2, ...], ...]
        }
    }
    """
    result = raw_data.get("result", {})
    labels = result.get("labels", [])
    data_rows = result.get("data", [])

    points = []
    current = 0.0

    # Special handling for CPU: calculate as 100 - idle
    if name == "cpu":
        # Find the index of the 'idle' dimension
        idle_idx = None
        for i, label in enumerate(labels):
            if i == 0:
                continue  # Skip timestamp label
            if isinstance(label, str) and label.lower() == "idle":
                idle_idx = i
                break

        for row in data_rows:
            if len(row) >= 2:
                timestamp = int(row[0])
                if idle_idx is not None and len(row) > idle_idx:
                    idle_value = float(row[idle_idx]) if row[idle_idx] is not None else 0
                    value = max(0, min(100, 100 - idle_value))  # Clamp to 0-100
                else:
                    # Fallback: sum all non-idle dimensions
                    value = 0
                    for i, v in enumerate(row[1:]):
                        label = labels[i + 1] if i + 1 < len(labels) else ""
                        if v is not None and (not isinstance(label, str) or label.lower() != "idle"):
                            value += float(v)
                    value = max(0, min(100, value))  # Clamp to 0-100
                points.append(MetricPoint(timestamp=timestamp, value=value))

        if points:
            current = points[-1].value
    elif name == "ram":
        # Special handling for RAM: calculate percentage as used / total * 100
        # Find indices for 'used' and total (sum of all dimensions)
        used_idx = None
        for i, label in enumerate(labels):
            if i == 0:
                continue  # Skip timestamp label
            if isinstance(label, str) and label.lower() == "used":
                used_idx = i
                break

        for row in data_rows:
            if len(row) >= 2:
                timestamp = int(row[0])
                used_value = 0.0
                total_value = 0.0

                # Sum all dimensions to get total, find used specifically
                for i, v in enumerate(row[1:]):
                    if v is not None:
                        value = float(v)
                        total_value += value
                        if used_idx is not None and i + 1 == used_idx:
                            used_value = value

                # Calculate percentage
                if total_value > 0:
                    value = (used_value / total_value) * 100
                else:
                    value = 0.0
                value = max(0, min(100, value))  # Clamp to 0-100
                points.append(MetricPoint(timestamp=timestamp, value=value))

        if points:
            current = points[-1].value
    else:
        # Default parsing: sum all dimensions
        for row in data_rows:
            if len(row) >= 2:
                timestamp = int(row[0])
                # Sum all dimension values (e.g., user + system CPU)
                value = sum(float(v) for v in row[1:] if v is not None)
                points.append(MetricPoint(timestamp=timestamp, value=value))

        if points:
            current = points[-1].value

    return MetricData(
        name=name,
        current=round(current, 2),
        unit=unit,
        points=points,
    )


def _parse_network_response(
    raw_data: dict,
) -> tuple[MetricData, MetricData]:
    """Parse Netdata network response into in/out MetricData models.

    Network data has received and sent dimensions.
    """
    result = raw_data.get("result", {})
    labels = result.get("labels", [])
    data_rows = result.get("data", [])

    # Find indices for received and sent
    received_idx = None
    sent_idx = None
    for i, label in enumerate(labels):
        if i == 0:
            continue  # Skip timestamp label
        label_lower = label.lower() if isinstance(label, str) else ""
        if "received" in label_lower or "in" in label_lower:
            received_idx = i
        elif "sent" in label_lower or "out" in label_lower:
            sent_idx = i

    # Default to indices 1 and 2 if not found
    if received_idx is None:
        received_idx = 1
    if sent_idx is None:
        sent_idx = 2 if len(labels) > 2 else 1

    in_points = []
    out_points = []

    for row in data_rows:
        if len(row) > max(received_idx, sent_idx):
            timestamp = int(row[0])
            in_value = abs(float(row[received_idx])) if row[received_idx] is not None else 0.0
            out_value = abs(float(row[sent_idx])) if row[sent_idx] is not None else 0.0
            in_points.append(MetricPoint(timestamp=timestamp, value=in_value))
            out_points.append(MetricPoint(timestamp=timestamp, value=out_value))

    current_in = in_points[-1].value if in_points else 0.0
    current_out = out_points[-1].value if out_points else 0.0

    return (
        MetricData(
            name="network_in",
            current=round(current_in, 2),
            unit="kilobits/s",
            points=in_points,
        ),
        MetricData(
            name="network_out",
            current=round(current_out, 2),
            unit="kilobits/s",
            points=out_points,
        ),
    )


async def get_system_metrics(time_range: TimeRange) -> SystemMetrics:
    """Fetch all core system metrics from Netdata.

    Args:
        time_range: Time range for data query

    Returns:
        SystemMetrics with CPU, RAM, disk, and network data

    Raises:
        httpx.ConnectError: If Netdata is unreachable
        httpx.HTTPStatusError: If Netdata returns error status
    """
    # Fetch all metrics
    cpu_data = await fetch_metric(METRIC_CONTEXTS["cpu"], time_range)
    ram_data = await fetch_metric(METRIC_CONTEXTS["ram"], time_range)
    disk_data = await fetch_metric(METRIC_CONTEXTS["disk"], time_range)
    network_data = await fetch_metric(METRIC_CONTEXTS["network"], time_range)

    # Parse responses
    cpu = _parse_metric_response(cpu_data, "cpu", "%")
    ram = _parse_metric_response(ram_data, "ram", "%")
    disk = _parse_metric_response(disk_data, "disk", "KiB/s")
    network_in, network_out = _parse_network_response(network_data)

    return SystemMetrics(
        cpu=cpu,
        ram=ram,
        disk=disk,
        network_in=network_in,
        network_out=network_out,
    )
