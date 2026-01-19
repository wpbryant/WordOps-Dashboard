# Phase 4: Deployment - Context

**Gathered:** 2026-01-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Production-ready deployment with nginx reverse proxy and systemd service management. Includes install script for easy setup. Does not include frontend build/deployment (backend API only for v1).

</domain>

<decisions>
## Implementation Decisions

### Nginx setup
- Use WordOps to create the site with SSL (`wo site create dashboard.domain.com --proxy=...`)
- User provides any domain they want during install — no restrictions
- Config lives in `/etc/nginx/sites-available/` following WordOps structure
- Symlinked to `/etc/nginx/sites-enabled/` like other WordOps sites

### Service management
- Logs written to `/var/log/wo-dashboard/` (file-based logging)
- Environment config via `/etc/wo-dashboard/config.env` (systemd EnvironmentFile)
- Service runs as root — needed for systemctl restart commands and WordOps CLI

### Installation flow
- Single bash script installer (`curl ... | bash` pattern)
- Interactive prompts for: domain, admin username, admin password, and optional settings
- Application files installed to `/var/www/wo-dashboard/`
- Re-running installer handles upgrades — detects existing install, pulls updates, restarts service

### Access control
- Standard HTTPS on port 443 (not WordOps 22222 admin port)
- Optional IP allowlist in config — public by default, can restrict if desired
- Nginx-level rate limiting on `/api/v1/auth/login` — brute force protection

### Claude's Discretion
- Unix socket vs localhost port for FastAPI connection
- Exact systemd restart behavior (on-failure vs always)
- HTTP-to-HTTPS redirect handling
- Python virtual environment setup in installer
- Dependency installation approach (pip vs system packages)

</decisions>

<specifics>
## Specific Ideas

- Should feel like a standard WordOps operation — `wo site create` for SSL, familiar nginx structure
- Install experience should be simple one-liner for getting started

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-deployment*
*Context gathered: 2026-01-19*
