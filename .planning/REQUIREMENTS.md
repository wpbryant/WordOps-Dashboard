# Requirements: WordOps Dashboard v1.1 Server Config

**Defined:** 2026-01-25
**Core Value:** Site management through a web UI — create, configure, and delete sites without touching the command line.

## v1.1 Requirements

Requirements for Server Config milestone. Each maps to roadmap phases.

### Overview

- [x] **OV-01**: User can view server header with hostname, IP address, OS version, kernel version, uptime
- [x] **OV-02**: User can view WordOps version
- [x] **OV-03**: User can view system package update count (total and security updates)
- [x] **OV-04**: User can trigger system package update with confirmation modal
- [x] **OV-05**: User can view last backup date

### Stack Services

- [x] **STK-01**: User can view list of stack services (nginx, PHP-FPM versions, Redis, MySQL)
- [x] **STK-02**: User can view service status (running, stopped, restarting, error)
- [x] **STK-03**: User can view service version and memory usage
- [x] **STK-04**: User can view PHP-FPM connection count and max requests
- [x] **STK-05**: User can edit service configuration via modal
- [x] **STK-06**: User can restart a stack service with confirmation
- [x] **STK-07**: User can start a stopped stack service
- [x] **STK-08**: User can stop a running stack service with confirmation

### Security

- [ ] **SEC-01**: User can view SSH configuration (port, root login setting, password auth setting)
- [ ] **SEC-02**: User can edit SSH configuration and save changes
- [ ] **SEC-03**: User can view fail2ban configuration (enabled status, ban time, max retries)
- [ ] **SEC-04**: User can edit fail2ban configuration and save changes
- [ ] **SEC-05**: User can view list of UFW firewall rules
- [ ] **SEC-06**: User can add a new firewall rule via form
- [ ] **SEC-07**: User can edit an existing firewall rule
- [ ] **SEC-08**: User can delete a firewall rule with confirmation
- [ ] **SEC-09**: User can toggle firewall rule enabled/disabled
- [ ] **SEC-10**: User can view DNS API credentials for Let's Encrypt
- [ ] **SEC-11**: User can add/edit DNS API credentials (provider, key, secret)

### Logs

- [ ] **LOG-01**: User can view log entries with source, timestamp, severity, and message
- [ ] **LOG-02**: User can filter logs by source (nginx, php, mysql, system, fail2ban, ufw)
- [ ] **LOG-03**: User can search logs by text query
- [ ] **LOG-04**: User can view client IP for applicable log entries

### Monitoring

- [ ] **MON-01**: User can view list of monitoring alerts
- [ ] **MON-02**: User can create new monitoring alert (name, metric, threshold, operator, duration)
- [ ] **MON-03**: User can edit existing monitoring alert
- [ ] **MON-04**: User can delete monitoring alert with confirmation
- [ ] **MON-05**: User can toggle monitoring alert enabled/disabled
- [ ] **MON-06**: User can open Netdata dashboard in new tab via button

### Backend API Extensions

- [ ] **API-01**: Backend provides SSH configuration endpoints
- [ ] **API-02**: Backend provides fail2ban configuration endpoints
- [ ] **API-03**: Backend provides UFW firewall rule CRUD endpoints
- [ ] **API-04**: Backend provides DNS API credential storage endpoints
- [ ] **API-05**: Backend provides monitoring alert storage endpoints
- [x] **API-06**: Backend provides system package update trigger endpoint

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Server Config

- **SC-01**: Real-time log streaming via WebSocket
- **SC-02**: Log export functionality
- **SC-03**: Advanced monitoring with notification delivery
- **SC-04**: Service configuration file editor with syntax highlighting
- **SC-05**: Server backup management

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Multi-server management | Single server only for v1.x |
| Team access / RBAC | Single admin user for v1.x |
| Automated security updates | Manual trigger only for v1.1 |
| Custom monitoring integrations | Netdata-only for v1.1 |
| Email/SMS notifications | Alert configuration only, no delivery |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| OV-01 | Phase 5 | Complete |
| OV-02 | Phase 5 | Complete |
| OV-03 | Phase 5 | Complete |
| OV-04 | Phase 5 | Complete |
| OV-05 | Phase 5 | Complete |
| STK-01 | Phase 5 | Complete |
| STK-02 | Phase 5 | Complete |
| STK-03 | Phase 5 | Complete |
| STK-04 | Phase 5 | Complete |
| STK-05 | Phase 5 | Complete |
| STK-06 | Phase 5 | Complete |
| STK-07 | Phase 5 | Complete |
| STK-08 | Phase 5 | Complete |
| SEC-01 | Phase 6 | Pending |
| SEC-02 | Phase 6 | Pending |
| SEC-03 | Phase 6 | Pending |
| SEC-04 | Phase 6 | Pending |
| SEC-05 | Phase 6 | Pending |
| SEC-06 | Phase 6 | Pending |
| SEC-07 | Phase 6 | Pending |
| SEC-08 | Phase 6 | Pending |
| SEC-09 | Phase 6 | Pending |
| SEC-10 | Phase 6 | Pending |
| SEC-11 | Phase 6 | Pending |
| LOG-01 | Phase 7 | Pending |
| LOG-02 | Phase 7 | Pending |
| LOG-03 | Phase 7 | Pending |
| LOG-04 | Phase 7 | Pending |
| MON-01 | Phase 7 | Pending |
| MON-02 | Phase 7 | Pending |
| MON-03 | Phase 7 | Pending |
| MON-04 | Phase 7 | Pending |
| MON-05 | Phase 7 | Pending |
| MON-06 | Phase 7 | Pending |
| API-01 | Phase 6 | Pending |
| API-02 | Phase 6 | Pending |
| API-03 | Phase 6 | Pending |
| API-04 | Phase 6 | Pending |
| API-05 | Phase 7 | Pending |
| API-06 | Phase 5 | Complete |

**Coverage:**
- v1.1 requirements: 33 total
- Mapped to phases: 33
- Unmapped: 0 ✓

**Phase Distribution:**
- Phase 5 (Overview + Stack): 14 requirements (OV-01 to OV-05, STK-01 to STK-08, API-06)
- Phase 6 (Security): 15 requirements (SEC-01 to SEC-11, API-01 to API-04)
- Phase 7 (Logs + Monitoring): 10 requirements (LOG-01 to LOG-04, MON-01 to MON-06, API-05)

---
*Requirements defined: 2026-01-25*
*Last updated: 2026-01-25 after roadmap creation*
