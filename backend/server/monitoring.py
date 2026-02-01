"""Monitoring alert management with JSON file storage.

Storage: /var/lib/wordops-dashboard/monitoring-alerts.json
"""

import json
import uuid
import time
from pathlib import Path
from typing import Any

import aiofiles

from backend.server.models import MonitoringAlert, MonitoringAlertCreate, MonitoringAlertUpdate

# Alert storage file
ALERTS_FILE = Path("/var/lib/wordops-dashboard/monitoring-alerts.json")
ALERTS_DIR = ALERTS_FILE.parent


async def _ensure_alerts_dir() -> None:
    """Ensure alerts directory exists."""
    ALERTS_DIR.mkdir(parents=True, exist_ok=True)


async def load_alerts() -> list[dict[str, Any]]:
    """Load alerts from JSON file.

    Returns:
        Empty list if file doesn't exist or on error
    """
    try:
        if not ALERTS_FILE.exists():
            return []
        async with aiofiles.open(ALERTS_FILE, "r") as f:
            content = await f.read()
            return json.loads(content) if content.strip() else []
    except (json.JSONDecodeError, IOError):
        return []


async def save_alerts(alerts: list[dict[str, Any]]) -> None:
    """Save alerts to JSON file atomically.

    Uses temp file + rename to prevent corruption.
    """
    await _ensure_alerts_dir()
    temp_file = ALERTS_FILE.with_suffix(".tmp")
    async with aiofiles.open(temp_file, "w") as f:
        await f.write(json.dumps(alerts, indent=2))
    temp_file.replace(ALERTS_FILE)


async def get_alerts() -> list[MonitoringAlert]:
    """Get all monitoring alerts.

    Returns:
        List of alerts (empty if none configured)
    """
    alerts_data = await load_alerts()
    return [MonitoringAlert(**alert) for alert in alerts_data]


async def create_alert(create: MonitoringAlertCreate) -> MonitoringAlert:
    """Create a new monitoring alert.

    Args:
        create: Alert creation data

    Returns:
        Created alert with generated ID
    """
    alerts_data = await load_alerts()

    new_alert = MonitoringAlert(
        id=str(uuid.uuid4()),
        name=create.name,
        metric=create.metric,
        threshold=create.threshold,
        operator=create.operator,
        duration=create.duration,
        enabled=True,
        notification_email=create.notification_email,
        created_at=int(time.time()),
        updated_at=int(time.time()),
    )

    alerts_data.append(new_alert.model_dump())
    await save_alerts(alerts_data)

    return new_alert


async def update_alert(alert_id: str, update: MonitoringAlertUpdate) -> MonitoringAlert | None:
    """Update an existing monitoring alert.

    Args:
        alert_id: ID of alert to update
        update: Updated alert data

    Returns:
        Updated alert or None if not found
    """
    alerts_data = await load_alerts()

    for i, alert_data in enumerate(alerts_data):
        if alert_data["id"] == alert_id:
            updated = MonitoringAlert(
                id=alert_id,
                name=update.name,
                metric=update.metric,
                threshold=update.threshold,
                operator=update.operator,
                duration=update.duration,
                enabled=alert_data["enabled"],  # Preserve enabled state
                notification_email=update.notification_email,
                created_at=alert_data["created_at"],  # Preserve created timestamp
                updated_at=int(time.time()),
            )
            alerts_data[i] = updated.model_dump()
            await save_alerts(alerts_data)
            return updated

    return None


async def delete_alert(alert_id: str) -> bool:
    """Delete a monitoring alert.

    Args:
        alert_id: ID of alert to delete

    Returns:
        True if deleted, False if not found
    """
    alerts_data = await load_alerts()

    for i, alert_data in enumerate(alerts_data):
        if alert_data["id"] == alert_id:
            alerts_data.pop(i)
            await save_alerts(alerts_data)
            return True

    return False


async def toggle_alert(alert_id: str) -> MonitoringAlert | None:
    """Toggle an alert enabled/disabled.

    Args:
        alert_id: ID of alert to toggle

    Returns:
        Updated alert or None if not found
    """
    alerts_data = await load_alerts()

    for i, alert_data in enumerate(alerts_data):
        if alert_data["id"] == alert_id:
            alert_data["enabled"] = not alert_data["enabled"]
            alert_data["updated_at"] = int(time.time())
            await save_alerts(alerts_data)
            return MonitoringAlert(**alert_data)

    return None
