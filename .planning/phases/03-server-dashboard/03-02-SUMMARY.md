---
phase: 03-server-dashboard
plan: 02
subsystem: services
tags: [systemctl, service-status, service-restart, security-allowlist]

dependency-graph:
  requires: [03-01]
  provides: [service-status-api, service-restart-api]
  affects: [03-04]

tech-stack:
  added: []
  patterns:
    - allowlist-security: "Frozenset of allowed service names"
    - systemctl-wrapper: "Safe subprocess exec for systemd queries"
    - async-subprocess: "asyncio.create_subprocess_exec for CLI"

key-files:
  created:
    - backend/server/services.py
  modified:
    - backend/server/models.py
    - backend/server/routes.py
    - backend/server/__init__.py

decisions:
  - key: service-allowlist
    choice: "Strict frozenset of allowed service names"
    rationale: "Prevent arbitrary service access via path traversal or injection"
  - key: systemctl-show
    choice: "Use systemctl show with --property flag for status"
    rationale: "Machine-parseable output, consistent format"
  - key: sudo-restart
    choice: "Use sudo for restart operations"
    rationale: "Restart requires root privileges"
  - key: status-timeout
    choice: "5s for status queries, 30s for restart"
    rationale: "Status is fast, restart needs time for service to stop/start"

metrics:
  duration: 3min
  completed: 2026-01-19
---

# Phase 3 Plan 2: Service Status API Summary

Backend service status monitoring via systemctl with restart capability. Strict security allowlist prevents unauthorized service access.

## One-liner

Systemctl wrapper with frozenset allowlist providing service status/restart endpoints for nginx, php-fpm, mariadb, redis.

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 298fac4 | feat | Add ServiceStatus model and systemctl wrapper |
| a73d61c | feat | Add service status and restart API endpoints |

## What Was Built

### ServiceStatus Model (models.py)
```python
class ServiceStatus(BaseModel):
    name: str              # e.g., "nginx"
    active: bool           # whether service is running
    sub_state: str         # e.g., "running", "dead"
    memory_bytes: int | None
    uptime_seconds: int | None
    main_pid: int | None
```

### Services Wrapper (services.py)
```python
ALLOWED_SERVICES = frozenset({
    "nginx",
    "php7.4-fpm", "php8.0-fpm", "php8.1-fpm", "php8.2-fpm", "php8.3-fpm", "php8.4-fpm",
    "mariadb", "mysql",
    "redis-server",
    "postfix", "fail2ban", "ufw", "netdata",
})

validate_service(name: str) -> bool
get_service_status(name: str) -> ServiceStatus | None
get_all_services() -> list[ServiceStatus]
restart_service(name: str) -> bool
```

### API Endpoints (routes.py)
- `GET /api/v1/server/services` - List all installed services
- `GET /api/v1/server/services/{name}` - Get single service status
- `POST /api/v1/server/services/{name}/restart` - Restart a service

### Error Handling
| Condition | HTTP Status |
|-----------|-------------|
| Service not in allowlist | 400 Bad Request |
| Service not installed | 404 Not Found |
| Systemctl timeout | 503 Service Unavailable |
| Restart failure | 503 Service Unavailable |

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Allowlist type | frozenset | Immutable, fast lookup, prevents modification |
| Status query method | systemctl show --property | Machine-parseable output |
| Restart method | sudo systemctl restart | Requires root privileges |
| Service existence check | systemctl cat | Verify unit file exists |
| Uptime calculation | Parse ActiveEnterTimestamp | Calculate from service start time |

## Testing Notes

**Verified:**
- ServiceStatus model importable
- Services wrapper functions importable
- Allowlist enforced - invalid services rejected
- Routes registered in OpenAPI schema
- Path traversal attempts rejected (e.g., `../../../etc/passwd`)

**Security considerations:**
- NEVER uses shell=True
- Uses asyncio.create_subprocess_exec with list arguments
- Service names validated against strict allowlist before any system call

## Next Phase Readiness

**Provides for 03-04 (Frontend):**
- Service status API for dashboard cards
- Service restart API for management actions

**No blockers identified.**
