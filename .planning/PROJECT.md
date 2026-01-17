# WordOps Dashboard

## What This Is

A modern web-based dashboard for managing WordOps servers, providing a unified interface for creating/configuring WordPress and non-WordPress sites, viewing server metrics via Netdata, and performing administrative tasks without CLI access. Inspired by EasyEngine Dashboard's clean UX patterns.

## Core Value

Site management through a web UI — create, configure, and delete sites without touching the command line.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Authentication system with JWT tokens and secure login
- [ ] Sites list view with filtering, search, and status indicators
- [ ] Site detail view with tabbed interface (Overview, Configuration, Admin Actions, Logs, Danger Zone)
- [ ] Create site wizard (WordPress, PHP, HTML, Proxy types)
- [ ] Site update functionality (SSL, cache, PHP version)
- [ ] Site delete with confirmation
- [ ] WordOps CLI wrapper module for safe command execution
- [ ] Server dashboard with Netdata metrics integration
- [ ] Service status display (nginx, php-fpm, mariadb, redis)
- [ ] Real-time log viewer with WebSocket streaming
- [ ] Quick access tools (phpMyAdmin, Adminer links)
- [ ] Nginx configuration for dashboard deployment
- [ ] Systemd service for backend API

### Out of Scope

- Multi-server management — single server only for v1
- Team access / RBAC — single admin user for v1
- Mobile app — web-only for v1
- Backup management — future enhancement
- DNS management (Cloudflare/Route53) — future enhancement
- Automated WordPress updates — future enhancement
- Docker deployment — native installation only

## Context

**Target Environment:**
- Ubuntu 24.04 LTS VPS with WordOps installed
- Netdata already installed and running
- Dashboard runs on same VPS as WordOps
- Access via subdomain (e.g., dashboard.yourdomain.com)

**WordOps Integration:**
- CLI-only integration (no direct SQLite DB access)
- Wraps `wo` commands for site/stack/service management
- Leverages existing WordOps SSL certificates
- Integrates with WordOps ACL for IP whitelisting

**Architecture:**
```
Frontend (React/TypeScript) → Backend API (Python FastAPI or Node.js) → WordOps CLI
                                    ↓
                              Netdata API (metrics)
```

**EasyEngine Inspiration:**
- Clean, modern interface with card-based layouts
- Tabbed site detail views
- Step-by-step site creation wizard
- Service status indicators with quick actions

## Constraints

- **Deployment**: Must run on same VPS as WordOps — no separate server
- **Installation**: Native installation only — no Docker containers
- **Data Access**: CLI-only for WordOps operations — decoupled from internal DB schema
- **Security**: HTTPS-only, JWT auth, IP whitelist support, input sanitization for all CLI params
- **Port**: Dashboard on port 8443 (or configurable) with SSL

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| CLI-only WordOps integration | Decouples from WordOps internal schema, survives WordOps updates | — Pending |
| Subdomain access pattern | Clean URLs, proper SSL cert, standard port 443 possible | — Pending |
| Tech stack open (Python/Node) | To be decided during planning based on requirements | — Pending |

---
*Last updated: 2026-01-17 after initialization*
