# Roadmap: WordOps Dashboard

## Milestones

- ✅ **v1.0 MVP** - Phases 1-4 (shipped 2026-01-19)
- 🚧 **v1.1 Server Config UI** - Phases 5-7 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-4) - SHIPPED 2026-01-19</summary>

### Phase 1: Foundation
**Goal**: FastAPI backend with JWT authentication, WordOps CLI wrapper, and base infrastructure
**Plans**: 3 plans

Plans:
- [x] 01-01: Backend project setup and JWT authentication
- [x] 01-02: WordOps CLI wrapper with async subprocess execution
- [x] 01-03: Pydantic models and error handling

### Phase 2: Site Management APIs
**Goal**: Complete CRUD operations for WordOps site management
**Plans**: 3 plans

Plans:
- [x] 02-01: Site list and detail endpoints with filtering
- [x] 02-02: Site creation endpoint with validation
- [x] 02-03: Site update and delete endpoints

### Phase 3: Server Monitoring APIs
**Goal**: Server metrics integration with Netdata and service status monitoring
**Plans**: 3 plans

Plans:
- [x] 03-01: Netdata metrics integration
- [x] 03-02: Service status monitoring via systemctl
- [x] 03-03: WebSocket log streaming

### Phase 4: Production Deployment
**Goal**: Production-ready deployment configuration with nginx, systemd, and installer
**Plans**: 3 plans

Plans:
- [x] 04-01: Nginx reverse proxy configuration
- [x] 04-02: Systemd service and installer script

</details>

### 🚧 v1.1 Server Config UI (In Progress)

**Milestone Goal:** Implement comprehensive Server Config feature with tabbed interface for server management.

#### Phase 5: Overview and Stack Services
**Goal**: User can view server health information and manage stack services (nginx, PHP-FPM, Redis, MySQL)
**Depends on**: Phase 4
**Requirements**: OV-01, OV-02, OV-03, OV-04, OV-05, STK-01, STK-02, STK-03, STK-04, STK-05, STK-06, STK-07, STK-08, API-06
**Success Criteria** (what must be TRUE):
  1. User can view server header with hostname, IP, OS version, kernel version, and uptime
  2. User can view WordOps version and system package update counts
  3. User can trigger system package updates with confirmation modal
  4. User can view stack service list with status, version, and memory usage
  5. User can start, stop, and restart stack services with confirmation
  6. User can edit service configuration via modal
**Plans**: 3 plans

Plans:
- [x] 05-01: Server overview API and UI (server info, package updates)
- [x] 05-02: Stack services display and management (status, start/stop/restart, config editing)
- [ ] 05-03: Gap fixes (backup directory exclusion, service statistics with authentication)
**Status**: Gap closure pending - fixes for /var/backups exclusion and service-specific statistics (MySQL/PHP-FPM/Redis authentication)

#### Phase 6: Security Management
**Goal**: User can configure SSH, fail2ban, firewall rules, and DNS API credentials through the UI
**Depends on**: Phase 5
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-06, SEC-07, SEC-08, SEC-09, SEC-10, SEC-11, API-01, API-02, API-03, API-04
**Success Criteria** (what must be TRUE):
  1. User can view and edit SSH configuration (port, root login, password auth)
  2. User can view and edit fail2ban configuration (enabled status, ban time, max retries)
  3. User can view list of UFW firewall rules
  4. User can add, edit, delete, and toggle firewall rules
  5. User can view and add/edit DNS API credentials for Let's Encrypt
**Plans**: TBD

Plans:
- [ ] 06-01: SSH and fail2ban configuration UI
- [ ] 06-02: UFW firewall rule management (CRUD operations)
- [ ] 06-03: DNS API credential storage and management

#### Phase 7: Logs and Monitoring
**Goal**: User can view filtered log entries and configure monitoring alerts with Netdata integration
**Depends on**: Phase 5
**Requirements**: LOG-01, LOG-02, LOG-03, LOG-04, MON-01, MON-02, MON-03, MON-04, MON-05, MON-06, API-05
**Success Criteria** (what must be TRUE):
  1. User can view log entries with source, timestamp, severity, and message
  2. User can filter logs by source and search by text query
  3. User can view, create, edit, delete, and toggle monitoring alerts
  4. User can open Netdata dashboard in new tab via button
**Plans**: TBD

Plans:
- [ ] 07-01: Logs UI with filtering and search
- [ ] 07-02: Monitoring alert management (CRUD operations)
- [ ] 07-03: Netdata integration link

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 3/3 | Complete | 2026-01-17 |
| 2. Site Management APIs | v1.0 | 3/3 | Complete | 2026-01-17 |
| 3. Server Monitoring APIs | v1.0 | 3/3 | Complete | 2026-01-18 |
| 4. Production Deployment | v1.0 | 3/3 | Complete | 2026-01-19 |
| 5. Overview and Stack Services | v1.1 | 2/3 | Gap closure | - |
| 6. Security Management | v1.1 | 0/3 | Not started | - |
| 7. Logs and Monitoring | v1.1 | 0/3 | Not started | - |
