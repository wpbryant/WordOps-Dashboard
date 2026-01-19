# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-17)

**Core value:** Site management through a web UI — create, configure, and delete sites without touching the command line.
**Current focus:** Phase 4 — Deployment (Ready to plan)

## Current Position

Phase: 3 of 4 (Server Dashboard)
Plan: 3 of 3 in current phase
Status: Phase verified
Last activity: 2026-01-18 — Phase 3 verified (19/19 must-haves)

Progress: ██████████ 83%

## Performance Metrics

**Velocity:**
- Total plans completed: 10
- Average duration: 2.5 min
- Total execution time: 0.42 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 3 | 8 min | 2.7 min |
| 02-site-management | 4 | 8 min | 2.0 min |
| 03-server-dashboard | 3 | 9 min | 3.0 min |

**Recent Trend:**
- Last 5 plans: 02-04 (3 min), 03-01 (3 min), 03-02 (3 min), 03-03 (3 min)
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

### Deferred Issues

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-01-18
Stopped at: Phase 3 verified, ready for Phase 4
Resume file: None
