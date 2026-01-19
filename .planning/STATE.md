# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-17)

**Core value:** Site management through a web UI — create, configure, and delete sites without touching the command line.
**Current focus:** Project complete

## Current Position

Phase: 4 of 4 (Deployment)
Plan: 2 of 2 in current phase
Status: Complete
Last activity: 2026-01-19 — Completed 04-02-PLAN.md (installation script)

Progress: ████████████ 100%

## Performance Metrics

**Velocity:**
- Total plans completed: 12
- Average duration: 2.4 min
- Total execution time: 0.50 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 3 | 8 min | 2.7 min |
| 02-site-management | 4 | 8 min | 2.0 min |
| 03-server-dashboard | 3 | 9 min | 3.0 min |
| 04-deployment | 2 | 5 min | 2.5 min |

**Recent Trend:**
- Last 5 plans: 03-02 (3 min), 03-03 (3 min), 04-01 (2 min), 04-02 (3 min)
- Trend: stable

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- **Tech stack**: Python/FastAPI chosen for backend (2026-01-17) - Better subprocess handling for CLI wrapper patterns
- **Config prefix**: WO_DASHBOARD_ env var prefix for settings (01-01) - Clear namespacing
- **Health endpoints**: Dual endpoints at /health and /api/v1/health (01-01) - Deployment flexibility
- **Single admin user**: Config-based credentials for v1, no database (01-02) - Simplicity
- **OAuth2 form login**: Standard OAuth2PasswordRequestForm (01-02) - Swagger UI compatibility
- **CLI execution**: asyncio.create_subprocess_exec with list args (01-03) - Security against command injection
- **Domain validation**: Strict allowlist pattern for domain names (01-03) - Prevent shell injection
- **Query param alias**: Use 'type' alias for site_type in API (02-01) - Clean API interface
- **Error handling**: 503 Service Unavailable for WordOpsError (02-01) - Indicates backend CLI issue
- **Domain validation first**: Validate domain format before calling get_site_info() (02-02) - Fail fast pattern
- **None for 404**: Return None from sites.py for not found, convert to 404 in routes (02-02) - Clean separation
- **Site creation timeout**: 300s for create operations (02-03) - Operations take significant time
- **Cache flag mapping**: Both REDIS and WPREDIS map to --wpredis (02-03) - WordOps CLI behavior
- **Confirmation for DELETE**: Required confirm=true query param prevents accidental deletions (02-04)
- **Separate update commands**: WordOps CLI uses separate commands for SSL, cache, PHP (02-04)
- **Update timeout 120s**: Reasonable timeout for SSL/cache/PHP changes (02-04)
- **Netdata API v3**: Use /api/v3/data endpoint for metrics (03-01) - Current API version
- **httpx production**: Move httpx to main dependencies (03-01) - Required at runtime for Netdata client
- **Service allowlist**: Frozenset of allowed service names (03-02) - Security against arbitrary service access
- **Systemctl show**: Use --property flag for status queries (03-02) - Machine-parseable output
- **Sudo restart**: Use sudo for service restart (03-02) - Requires root privileges
- **Hardcoded LOG_PATHS**: Log file paths in fixed dict for security (03-03) - Prevents path traversal
- **WebSocket auth via query param**: Token passed as query param (03-03) - Headers don't work well with WebSocket
- **aiofiles for async I/O**: Added aiofiles dependency (03-03) - Async file reading for log tailing
- **Unix socket communication**: uvicorn listens on /run/wo-dashboard/uvicorn.sock (04-01) - Better performance than TCP
- **Nginx rate limiting**: 10r/m for login endpoint (04-01) - Brute force protection
- **Systemd restart policy**: on-failure with 5s delay (04-01) - Automatic recovery
- **Idempotent upgrade detection**: Check APP_DIR and config.env for upgrade mode (04-02) - Reliable mode detection
- **Password hashing via Python**: Use passlib for bcrypt hashing in installer (04-02) - Consistent with backend auth
- **Secret key preservation**: Keep existing SECRET_KEY on upgrades (04-02) - Avoid invalidating JWTs
- **Optional site deletion**: Prompt before removing WordOps site on uninstall (04-02) - Prevent accidental data loss

### Deferred Issues

None.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-01-19
Stopped at: Project complete - all 12 plans executed
Resume file: None
