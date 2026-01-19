---
phase: 04-deployment
plan: 01
subsystem: infra
tags: [nginx, systemd, deployment, uvicorn, reverse-proxy]

# Dependency graph
requires:
  - phase: 03-server-dashboard
    provides: Complete backend API with WebSocket log streaming
provides:
  - Nginx reverse proxy template with rate limiting and WebSocket support
  - Systemd service unit for uvicorn lifecycle management
  - Environment configuration template with all settings
affects: [04-02-installer]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Unix socket for uvicorn-nginx communication
    - Systemd EnvironmentFile for configuration
    - Rate limiting at nginx level

key-files:
  created:
    - deploy/nginx.conf.template
    - deploy/wo-dashboard.service
    - deploy/config.env.template
  modified: []

key-decisions:
  - "Unix socket communication: uvicorn listens on /run/wo-dashboard/uvicorn.sock"
  - "Upstream block pattern: Named upstream for keepalive connections"
  - "Rate limit zone: 10r/m for login endpoint with burst=5"
  - "WebSocket timeout: 3600s for long-lived log streaming connections"

patterns-established:
  - "Template placeholders: {{VAR}} syntax for installer substitution"
  - "Systemd logging: append mode to /var/log/wo-dashboard/"

# Metrics
duration: 2min
completed: 2026-01-19
---

# Phase 04 Plan 01: Deployment Configs Summary

**Nginx reverse proxy, systemd service unit, and environment templates for production deployment**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-19T14:52:29Z
- **Completed:** 2026-01-19T14:54:30Z
- **Tasks:** 2
- **Files created:** 3

## Accomplishments

- Created nginx reverse proxy template with upstream block for unix socket communication
- Added rate limiting (10r/m) for /api/v1/auth/login to prevent brute force attacks
- Configured WebSocket upgrade headers for log streaming endpoint
- Created systemd service unit with proper restart behavior and logging
- Created environment template covering all backend config settings

## Task Commits

Each task was committed atomically:

1. **Task 1: Create nginx reverse proxy template** - `a177c1b` (feat)
2. **Task 2: Create systemd service unit and environment template** - `be00b60` (feat)

## Files Created

- `deploy/nginx.conf.template` - Nginx site configuration with proxy settings, rate limiting, WebSocket support
- `deploy/wo-dashboard.service` - Systemd unit file for uvicorn lifecycle management
- `deploy/config.env.template` - Environment variable template for all dashboard settings

## Decisions Made

1. **Unix socket communication** - Using /run/wo-dashboard/uvicorn.sock instead of localhost port for better performance and security (no network stack overhead)
2. **Named upstream block** - Enables keepalive connections to backend for efficiency
3. **Rate limiting configuration** - 10 requests per minute with burst of 5 for login endpoint specifically
4. **WebSocket long timeout** - 3600s (1 hour) for log streaming connections to avoid premature disconnects
5. **Systemd restart policy** - on-failure with 5s delay and burst limits (3 attempts per 60s)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All three deployment templates are ready for the installation script
- Templates use consistent {{VAR}} placeholder syntax
- Next plan (04-02) will create the installation script that deploys these templates

---
*Phase: 04-deployment*
*Completed: 2026-01-19*
