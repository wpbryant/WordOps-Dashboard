"""WebSocket connection manager for log streaming."""

from fastapi import WebSocket


class LogConnectionManager:
    """Manages WebSocket connections for log streaming."""

    def __init__(self) -> None:
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, log_type: str) -> None:
        """Accept a WebSocket connection and track it by log type.

        Args:
            websocket: The WebSocket connection to accept
            log_type: The type of log being streamed
        """
        await websocket.accept()
        if log_type not in self.active_connections:
            self.active_connections[log_type] = []
        self.active_connections[log_type].append(websocket)

    def disconnect(self, websocket: WebSocket, log_type: str) -> None:
        """Remove a WebSocket connection from tracking.

        Args:
            websocket: The WebSocket connection to remove
            log_type: The type of log that was being streamed
        """
        if log_type in self.active_connections:
            if websocket in self.active_connections[log_type]:
                self.active_connections[log_type].remove(websocket)

    async def send_lines(self, websocket: WebSocket, lines: list[str]) -> None:
        """Send log lines to a WebSocket connection.

        Args:
            websocket: The WebSocket connection to send to
            lines: List of log lines to send
        """
        await websocket.send_json({"lines": lines})


# Singleton instance for use across routes
log_manager = LogConnectionManager()
