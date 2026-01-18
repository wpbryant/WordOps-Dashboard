# Phase 3: Server Dashboard - Research

**Researched:** 2026-01-18
**Domain:** Server monitoring, Netdata integration, WebSocket streaming, service management
**Confidence:** HIGH

## Summary

This research covers implementation of a server monitoring dashboard with three core components: Netdata metrics integration (via REST API v3), service status display (via systemctl), and real-time log viewing (via WebSocket). The phase requires proxying requests to Netdata's local API, executing systemctl commands safely, and streaming log file updates to connected clients.

WordOps servers have Netdata pre-installed and running on port 19999. The local Netdata API requires no authentication when accessed from localhost, making backend-to-Netdata communication straightforward. The dashboard frontend will use react-grid-layout for the flexible panel system with localStorage persistence as specified in CONTEXT.md.

**Primary recommendation:** Use httpx for async Netdata API calls, asyncio subprocess for systemctl commands, and native FastAPI WebSocket support with asyncio file tailing for log streaming.

## Standard Stack

The established libraries/tools for this domain:

### Core (Backend)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| httpx | >=0.27.0 | Async HTTP client for Netdata API | Modern async client, already in dev deps, built-in timeout handling |
| websockets | (via FastAPI) | WebSocket log streaming | Native FastAPI/Starlette support, no additional dep needed |

### Core (Frontend)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-grid-layout | ^2.0 | Draggable/resizable dashboard panels | Industry standard for dashboard layouts, TypeScript support, active maintenance |
| recharts | ^2.12 | Gauge and sparkline visualization | Most popular React chart library, SVG-based, lightweight |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @mui/x-charts | ^7.0 | Alternative sparkline component | If recharts sparklines insufficient |
| react-gauge-component | ^1.0 | Gauge visualization | If custom gauge needed beyond recharts |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| httpx | aiohttp | aiohttp slightly faster at high concurrency, but httpx already in project and simpler API |
| react-grid-layout | gridstack.js | gridstack framework-agnostic but less React-native integration |
| recharts | tremor | tremor has nice sparklines but heavier dependency, less customizable |

**Installation:**
```bash
# Backend (add to pyproject.toml dependencies)
pip install httpx>=0.27.0

# Frontend
npm install react-grid-layout recharts
npm install -D @types/react-grid-layout
```

## Architecture Patterns

### Recommended Project Structure
```
backend/
  server/                    # NEW: Server monitoring module
    __init__.py
    models.py               # ServiceStatus, MetricData, LogEntry models
    netdata.py              # Netdata API client wrapper
    services.py             # systemctl wrapper functions
    logs.py                 # Log file reading/streaming
    routes.py               # /api/v1/server/* endpoints
    websocket.py            # WebSocket connection manager for logs
```

### Pattern 1: Netdata API Proxy
**What:** Backend acts as authenticated proxy to local Netdata API
**When to use:** All Netdata metric requests from frontend
**Example:**
```python
# Source: Netdata API v3 documentation + httpx official docs
import httpx
from typing import Optional

NETDATA_URL = "http://127.0.0.1:19999"

async def fetch_metrics(
    context: str,
    after: int = -300,  # Last 5 minutes
    points: int = 60,
    timeout: float = 5.0
) -> dict:
    """Fetch metrics from local Netdata instance."""
    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.get(
            f"{NETDATA_URL}/api/v3/data",
            params={
                "scope_contexts": context,
                "after": after,
                "points": points,
                "format": "json",
            }
        )
        response.raise_for_status()
        return response.json()
```

### Pattern 2: Service Status via systemctl
**What:** Query service status using subprocess with systemctl show
**When to use:** Service status cards on dashboard
**Example:**
```python
# Source: systemctl man page + existing cli.py patterns
import asyncio
from dataclasses import dataclass
from typing import Optional

@dataclass
class ServiceStatus:
    name: str
    active: bool
    sub_state: str
    main_pid: Optional[int]
    memory_bytes: Optional[int]
    active_enter_timestamp: Optional[str]

async def get_service_status(service_name: str) -> ServiceStatus:
    """Get status of a systemd service."""
    # Allowlist validation - only known services
    ALLOWED_SERVICES = {
        "nginx", "php8.1-fpm", "php8.2-fpm", "php8.3-fpm",
        "mariadb", "mysql", "redis-server", "postfix",
        "fail2ban", "ufw", "netdata"
    }
    if service_name not in ALLOWED_SERVICES:
        raise ValueError(f"Service not in allowlist: {service_name}")

    proc = await asyncio.create_subprocess_exec(
        "systemctl", "show", service_name,
        "--property=ActiveState,SubState,MainPID,MemoryCurrent,ActiveEnterTimestamp",
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=5.0)

    props = {}
    for line in stdout.decode().strip().split("\n"):
        if "=" in line:
            key, value = line.split("=", 1)
            props[key] = value

    return ServiceStatus(
        name=service_name,
        active=props.get("ActiveState") == "active",
        sub_state=props.get("SubState", "unknown"),
        main_pid=int(props["MainPID"]) if props.get("MainPID", "0") != "0" else None,
        memory_bytes=int(props["MemoryCurrent"]) if props.get("MemoryCurrent", "[not set]") != "[not set]" else None,
        active_enter_timestamp=props.get("ActiveEnterTimestamp"),
    )
```

### Pattern 3: WebSocket Log Streaming
**What:** Stream log file updates to connected clients
**When to use:** Real-time log viewer panel
**Example:**
```python
# Source: FastAPI WebSocket docs + h3xagn streaming log viewer
from fastapi import WebSocket, WebSocketDisconnect
import asyncio
import aiofiles

class LogConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, log_type: str):
        await websocket.accept()
        if log_type not in self.active_connections:
            self.active_connections[log_type] = []
        self.active_connections[log_type].append(websocket)

    def disconnect(self, websocket: WebSocket, log_type: str):
        if log_type in self.active_connections:
            self.active_connections[log_type].remove(websocket)

    async def broadcast(self, log_type: str, message: str):
        if log_type in self.active_connections:
            for connection in self.active_connections[log_type]:
                await connection.send_text(message)

async def tail_log_file(path: str, lines: int = 50) -> list[str]:
    """Read last N lines from a log file."""
    async with aiofiles.open(path, mode='r') as f:
        content = await f.read()
        return content.strip().split('\n')[-lines:]
```

### Pattern 4: React Grid Layout Persistence
**What:** Save and restore panel positions to localStorage
**When to use:** Dashboard layout customization
**Example:**
```typescript
// Source: react-grid-layout GitHub + official docs
import { Responsive, WidthProvider } from "react-grid-layout";
import { useState, useEffect } from "react";

const ResponsiveGridLayout = WidthProvider(Responsive);

const STORAGE_KEY = "wo-dashboard-layout";

interface LayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}

function Dashboard() {
  const [layouts, setLayouts] = useState<{ [key: string]: LayoutItem[] }>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : defaultLayouts;
  });

  const handleLayoutChange = (
    _currentLayout: LayoutItem[],
    allLayouts: { [key: string]: LayoutItem[] }
  ) => {
    setLayouts(allLayouts);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allLayouts));
  };

  return (
    <ResponsiveGridLayout
      layouts={layouts}
      onLayoutChange={handleLayoutChange}
      breakpoints={{ lg: 1200, md: 996, sm: 768 }}
      cols={{ lg: 12, md: 10, sm: 6 }}
      rowHeight={30}
      draggableHandle=".panel-header"
    >
      {/* Panel children */}
    </ResponsiveGridLayout>
  );
}
```

### Anti-Patterns to Avoid
- **Direct Netdata exposure:** Never expose Netdata port 19999 to frontend directly; always proxy through backend for auth
- **Shell=True for systemctl:** Never use shell=True; use create_subprocess_exec with argument lists
- **Unbounded log reads:** Always limit log lines; never read entire large log files into memory
- **Polling without throttle:** Implement reasonable intervals (30s+ for services, configurable for metrics)
- **Mutable layout state:** Use immutable updates for react-grid-layout; don't mutate layout arrays directly

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Gauge visualization | Custom SVG gauge | recharts RadialBarChart or react-gauge-component | Complex arc calculations, animation handling |
| Dashboard grid | CSS Grid manual drag | react-grid-layout | Collision detection, responsive breakpoints, persistence |
| HTTP client | urllib3/requests sync | httpx async | Proper async, timeout handling, connection pooling |
| Log file tailing | Manual seek/read | aiofiles + fixed buffer | File locking, encoding issues, memory management |
| Time range selection | Manual date parsing | Netdata's `after` parameter | Netdata handles relative timestamps natively |

**Key insight:** Dashboard UIs have solved problems (drag/resize, collision, persistence) that are deceptively complex. react-grid-layout handles edge cases that take months to discover when hand-rolling.

## Common Pitfalls

### Pitfall 1: Netdata API Rate Limiting
**What goes wrong:** Dashboard polls Netdata too frequently, causing performance issues
**Why it happens:** Each panel might independently fetch metrics on its own timer
**How to avoid:** Centralize metric fetching; batch requests; use appropriate `points` parameter to match display resolution
**Warning signs:** High CPU on Netdata process, slow dashboard response

### Pitfall 2: WebSocket Connection Leaks
**What goes wrong:** Disconnected clients remain in connection manager, causing memory leaks
**Why it happens:** WebSocketDisconnect exception not caught or cleanup not performed
**How to avoid:** Always wrap WebSocket loops in try/finally; implement heartbeat/ping
**Warning signs:** Growing memory usage, "connection reset" errors in logs

### Pitfall 3: Service Name Injection
**What goes wrong:** Attacker passes malicious service name to systemctl
**Why it happens:** No validation of service name parameter
**How to avoid:** Strict allowlist of known services; reject any name not in list
**Warning signs:** Unexpected service names in logs, unusual systemctl calls

### Pitfall 4: Log File Path Traversal
**What goes wrong:** Attacker reads arbitrary files via log viewer
**Why it happens:** User-controlled log_type parameter maps to file path
**How to avoid:** Map log types to hardcoded paths; never construct paths from user input
**Warning signs:** Requests for "../" or absolute paths in log_type parameter

### Pitfall 5: Layout State Corruption
**What goes wrong:** Dashboard layout breaks after resize/drag
**Why it happens:** Mutating layout arrays directly instead of creating new objects
**How to avoid:** Use spread operator or immer for immutable updates; validate layout on load
**Warning signs:** Panels overlapping, panels disappearing, console errors about keys

## Code Examples

Verified patterns from official sources:

### Netdata API v3 Data Query
```python
# Source: https://learn.netdata.cloud/docs/developer-and-contributor-corner/rest-api/queries/
# Fetch CPU metrics for last 5 minutes with 60 data points
async def get_cpu_metrics() -> dict:
    """Get system CPU metrics from Netdata."""
    params = {
        "scope_contexts": "system.cpu",
        "after": -300,      # Last 5 minutes (relative to now)
        "points": 60,       # 60 data points (5 second intervals)
        "format": "json",
        "group": "average"  # Aggregate method
    }
    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.get("http://127.0.0.1:19999/api/v3/data", params=params)
        resp.raise_for_status()
        return resp.json()
```

### FastAPI WebSocket Endpoint
```python
# Source: https://fastapi.tiangolo.com/advanced/websockets/
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from backend.auth.dependencies import get_current_user_ws

router = APIRouter()

@router.websocket("/api/v1/server/logs/{log_type}")
async def log_stream(
    websocket: WebSocket,
    log_type: str,
    # Note: WebSocket auth requires different approach than HTTP
):
    LOG_PATHS = {
        "nginx-access": "/var/log/nginx/access.log",
        "nginx-error": "/var/log/nginx/error.log",
        "php-fpm": "/var/log/php8.2-fpm.log",
        "mysql": "/var/log/mysql/error.log",
    }

    if log_type not in LOG_PATHS:
        await websocket.close(code=4000)
        return

    await websocket.accept()
    try:
        while True:
            # Read last 50 lines
            lines = await tail_log_file(LOG_PATHS[log_type], 50)
            await websocket.send_json({"lines": lines})
            await asyncio.sleep(2)  # Poll every 2 seconds
    except WebSocketDisconnect:
        pass  # Clean disconnect
```

### systemctl Service Restart
```python
# Source: systemctl man page + existing cli.py patterns
async def restart_service(service_name: str) -> bool:
    """Restart a systemd service (requires sudo)."""
    ALLOWED_SERVICES = {"nginx", "php8.2-fpm", "mariadb", "redis-server"}

    if service_name not in ALLOWED_SERVICES:
        raise ValueError(f"Service not allowed: {service_name}")

    proc = await asyncio.create_subprocess_exec(
        "sudo", "systemctl", "restart", service_name,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )

    _, stderr = await asyncio.wait_for(proc.communicate(), timeout=30.0)

    if proc.returncode != 0:
        raise RuntimeError(f"Failed to restart {service_name}: {stderr.decode()}")

    return True
```

### React Gauge with Sparkline
```typescript
// Source: recharts docs + react-gauge-chart npm
import { RadialBarChart, RadialBar, AreaChart, Area } from "recharts";

interface MetricPanelProps {
  label: string;
  value: number;        // 0-100 for gauge
  history: number[];    // Array for sparkline
  unit: string;
}

function MetricPanel({ label, value, history, unit }: MetricPanelProps) {
  const gaugeData = [{ value, fill: value > 80 ? "#ef4444" : value > 60 ? "#f59e0b" : "#22c55e" }];
  const sparkData = history.map((v, i) => ({ index: i, value: v }));

  return (
    <div className="metric-panel">
      <h3>{label}</h3>
      <div className="gauge-container">
        <RadialBarChart
          width={120}
          height={120}
          innerRadius="70%"
          outerRadius="100%"
          data={gaugeData}
          startAngle={180}
          endAngle={0}
        >
          <RadialBar dataKey="value" cornerRadius={10} />
        </RadialBarChart>
        <span className="gauge-value">{value}{unit}</span>
      </div>
      <div className="sparkline-container">
        <AreaChart width={200} height={40} data={sparkData}>
          <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="#3b82f680" />
        </AreaChart>
      </div>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Netdata API v1 | Netdata API v3 | 2024 | v3 combines v1/v2, new integrations must use v3 |
| react-grid-layout v1 | react-grid-layout v2 | 2025 | TypeScript rewrite, new hook-based API, v1 compatible via /legacy import |
| aiohttp for HTTP | httpx preferred | 2024 | httpx simpler API, better timeout handling |
| recharts v1 | recharts v2.12+ | 2024 | Better TypeScript, SSR support |

**Deprecated/outdated:**
- Netdata API v1/v2: Use v3 exclusively for new integrations
- react-grid-layout v1 API: Migrate to v2 hook-based API (or use /legacy import)

## Open Questions

Things that couldn't be fully resolved:

1. **WebSocket Authentication Strategy**
   - What we know: HTTP auth uses JWT in Authorization header; WebSockets can use query params or cookies
   - What's unclear: Best pattern for WebSocket auth in FastAPI with existing JWT setup
   - Recommendation: Use query parameter token for WebSocket auth, validate on connect

2. **Exact Netdata Contexts for WordOps**
   - What we know: Common contexts are system.cpu, system.ram, system.net, disk.*, nginx.*, mysql.*, php-fpm.*
   - What's unclear: Exact context names on a typical WordOps installation
   - Recommendation: Query /api/v3/contexts on a live system to discover available contexts

3. **PHP-FPM Version Detection**
   - What we know: WordOps supports multiple PHP versions (7.4, 8.0, 8.1, 8.2, 8.3, 8.4)
   - What's unclear: How to dynamically detect which PHP versions are installed
   - Recommendation: Check for existence of php*-fpm services at runtime

4. **sudo Configuration for Service Restart**
   - What we know: systemctl restart requires elevated privileges
   - What's unclear: How dashboard user gets sudo access for specific commands
   - Recommendation: Configure sudoers to allow specific systemctl commands without password

## Sources

### Primary (HIGH confidence)
- [FastAPI WebSocket Documentation](https://fastapi.tiangolo.com/advanced/websockets/) - Connection handling, dependencies
- [Netdata Swagger API v3](https://raw.githubusercontent.com/netdata/netdata/master/src/web/api/netdata-swagger.yaml) - Full endpoint specification
- [Netdata API Queries](https://learn.netdata.cloud/docs/developer-and-contributor-corner/rest-api/queries/) - Query parameters
- [react-grid-layout GitHub](https://github.com/react-grid-layout/react-grid-layout) - v2 API, TypeScript support
- [systemctl man page](https://www.freedesktop.org/software/systemd/man/latest/systemctl.html) - Service properties

### Secondary (MEDIUM confidence)
- [h3xagn Streaming Log Viewer](https://h3xagn.com/create-a-streaming-log-viewer-using-fastapi/) - WebSocket log pattern (verified with FastAPI docs)
- [WordOps Log Command](https://docs.wordops.net/commands/log/) - Log file operations
- [httpx Timeouts](https://www.python-httpx.org/advanced/timeouts/) - Timeout configuration

### Tertiary (LOW confidence)
- [Netdata Securing Agents](https://learn.netdata.cloud/docs/netdata-agent/configuration/securing-agents/) - Access control (needs live system verification)
- Standard Ubuntu log paths - May vary by WordOps version

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Verified with official docs and existing project patterns
- Architecture: HIGH - Based on FastAPI docs and established patterns
- Pitfalls: HIGH - Common issues documented in multiple sources
- Netdata specifics: MEDIUM - v3 API documented but WordOps context names need live verification

**Research date:** 2026-01-18
**Valid until:** 60 days (libraries stable, Netdata API v3 is current)
