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

- [ ] **Phase 1: Foundation** - Project setup, backend API skeleton, authentication system
- [ ] **Phase 2: Site Management** - Sites list, detail view, create/update/delete operations
- [ ] **Phase 3: Server Dashboard** - Netdata integration, service status, log viewer
- [ ] **Phase 4: Deployment** - Nginx config, systemd service, production setup

## Phase Details

### Phase 1: Foundation
**Goal**: Set up project structure with working authentication and backend API skeleton
**Depends on**: Nothing (first phase)
**Research**: Likely (tech stack decision)
**Research topics**: FastAPI vs Node.js for CLI wrapper patterns, JWT auth library choice
**Plans**: TBD

Plans:
- [x] 01-01: Project scaffolding and backend setup
- [ ] 01-02: JWT authentication system
- [x] 01-03: WordOps CLI wrapper module

### Phase 2: Site Management
**Goal**: Full site CRUD through the dashboard UI
**Depends on**: Phase 1
**Research**: Unlikely (internal patterns, CRUD operations)
**Plans**: TBD

Plans:
- [ ] 02-01: Sites list view with filtering and search
- [ ] 02-02: Site detail view with tabbed interface
- [ ] 02-03: Create site wizard
- [ ] 02-04: Site update and delete operations

### Phase 3: Server Dashboard
**Goal**: Server monitoring with Netdata metrics and log viewing
**Depends on**: Phase 2
**Research**: Likely (external API)
**Research topics**: Netdata API endpoints, WebSocket log streaming patterns
**Plans**: TBD

Plans:
- [ ] 03-01: Netdata metrics integration
- [ ] 03-02: Service status display
- [ ] 03-03: Real-time log viewer with WebSocket

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
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 2/3 | In progress | - |
| 2. Site Management | 0/4 | Not started | - |
| 3. Server Dashboard | 0/3 | Not started | - |
| 4. Deployment | 0/2 | Not started | - |
