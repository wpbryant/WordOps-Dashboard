# WordOps Dashboard

## What This Is

A modern web-based dashboard for managing WordOps servers, providing a unified interface for creating/configuring WordPress and non-WordPress sites, viewing server metrics via Netdata, and performing administrative tasks without CLI access. Inspired by EasyEngine Dashboard's clean UX patterns.

## Core Value

Site management through a web UI — create, configure, and delete sites without touching the command line.

## Requirements

### Validated

- [x] Authentication system with JWT tokens and secure login — v1.0
- [x] Sites list API with filtering, search, and status indicators — v1.0
- [x] Site detail API endpoint — v1.0
- [x] Create site API (WordPress, PHP, HTML, Proxy types) — v1.0
- [x] Site update functionality (SSL, cache, PHP version) — v1.0
- [x] Site delete with confirmation — v1.0
- [x] WordOps CLI wrapper module for safe command execution — v1.0
- [x] Server dashboard API with Netdata metrics integration — v1.0
- [x] Service status display (nginx, php-fpm, mariadb, redis) — v1.0
- [x] Real-time log viewer with WebSocket streaming — v1.0
- [x] Nginx configuration for dashboard deployment — v1.0
- [x] Systemd service for backend API — v1.0

### Active

- [ ] Sites list view UI with filtering and search
- [ ] Site detail view with tabbed interface (Overview, Configuration, Admin Actions, Logs, Danger Zone)
- [ ] Create site wizard UI
- [ ] Server dashboard UI with metrics visualization
- [ ] Quick access tools (phpMyAdmin, Adminer links)

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
| CLI-only WordOps integration | Decouples from WordOps internal schema, survives WordOps updates | Good |
| Subdomain access pattern | Clean URLs, proper SSL cert, standard port 443 | Good |
| Python/FastAPI backend | Better subprocess handling for CLI wrapper patterns | Good |
| pydantic-settings for config | WO_DASHBOARD_ env prefix, clean configuration management | Good |
| asyncio subprocess execution | Safe command execution with explicit list args, no shell=True | Good |
| OAuth2PasswordRequestForm login | Swagger UI compatibility, standard OAuth2 flow | Good |
| Hardcoded log paths | Security against path traversal attacks | Good |
| WebSocket auth via query param | Headers don't work well with WebSocket connections | Good |
| Unix socket for uvicorn | Better performance than TCP for local nginx proxy | Good |

## Current State

**v1.0 Shipped:** 2026-01-19

Backend API complete with:
- JWT authentication
- Site CRUD operations
- Server monitoring (Netdata + systemctl)
- Real-time log streaming
- Production deployment configs

**Tech stack:** Python 3.10+, FastAPI, pydantic-settings, python-jose, passlib, httpx, aiofiles

**Lines of code:** 2,093 Python across 18 files

---
*Last updated: 2026-01-19 after v1.0 milestone*
