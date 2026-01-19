# Roadmap: WordOps Dashboard

## Overview

Build a modern web dashboard for WordOps server management, starting with authentication and backend foundation, then implementing site CRUD operations, adding server monitoring capabilities, and finally deploying with proper nginx/systemd configuration.

## Domain Expertise

None

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Project setup, backend API skeleton, authentication system
- [x] **Phase 2: Site Management** - Sites list, detail view, create/update/delete operations
- [x] **Phase 3: Server Dashboard** - Netdata integration, service status, log viewer
- [ ] **Phase 4: Deployment** - Nginx config, systemd service, production setup

## Phase Details

### Phase 1: Foundation
**Goal**: Set up project structure with working authentication and backend API skeleton
**Depends on**: Nothing (first phase)
**Research**: Likely (tech stack decision)
**Research topics**: FastAPI vs Node.js for CLI wrapper patterns, JWT auth library choice
**Plans**: 3 plans

Plans:
- [x] 01-01: Project scaffolding and backend setup
- [x] 01-02: JWT authentication system
- [x] 01-03: WordOps CLI wrapper module

### Phase 2: Site Management
**Goal**: Full site CRUD API for WordOps sites with filtering, search, and validation
**Depends on**: Phase 1
**Research**: Unlikely (internal patterns, CRUD operations)
**Plans**: 4 plans

Plans:
- [x] 02-01: Sites API router with list endpoint and filtering
- [x] 02-02: Site detail endpoint for single site info
- [x] 02-03: Create site CLI wrapper and POST endpoint
- [x] 02-04: Update and delete site operations

### Phase 3: Server Dashboard
**Goal**: Server monitoring with Netdata metrics and log viewing
**Depends on**: Phase 2
**Research**: Complete (see 03-RESEARCH.md)
**Research topics**: Netdata API endpoints, WebSocket log streaming patterns
**Plans**: 3 plans

Plans:
- [x] 03-01-PLAN.md — Netdata metrics integration (CPU, RAM, disk, network via API proxy)
- [x] 03-02-PLAN.md — Service status display (systemctl wrapper with restart capability)
- [x] 03-03-PLAN.md — Real-time log viewer with WebSocket streaming

### Phase 4: Deployment
**Goal**: Production-ready deployment with nginx and systemd
**Depends on**: Phase 3
**Research**: Unlikely (standard nginx/systemd patterns)
**Plans**: TBD

Plans:
- [ ] 04-01: Nginx configuration for dashboard
- [ ] 04-02: Systemd service and installation script

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/3 | Complete | 2026-01-17 |
| 2. Site Management | 4/4 | Complete | 2026-01-18 |
| 3. Server Dashboard | 3/3 | Complete | 2026-01-18 |
| 4. Deployment | 0/2 | Not started | - |
