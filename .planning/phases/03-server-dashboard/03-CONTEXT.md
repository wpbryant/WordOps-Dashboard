# Phase 3: Server Dashboard - Context

**Gathered:** 2026-01-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Server monitoring dashboard with Netdata metrics integration, service status display, and real-time log viewing. Users can view server health, monitor services, and read logs. Service management is limited to restart actions only.

</domain>

<decisions>
## Implementation Decisions

### Dashboard layout
- Flexible grid with draggable/resizable panels
- Panel positions persist to local storage across sessions
- Panels resize within grid only — no fullscreen/maximize mode

### Service status
- Monitor all system services: nginx, php-fpm, mysql/mariadb, redis, postfix, fail2ban, ufw, and other installed services
- Detailed status cards showing: uptime, memory usage, restart count per service
- Restart action only (no start/stop) — safer approach
- Minimal server resource impact for status updates — prefer efficient polling or on-demand refresh over constant real-time updates

### Metrics display
- Gauge + sparkline visualization: current value as gauge, small trend line showing history
- User-selectable time range for sparklines: 5m, 1h, 24h dropdown

### Claude's Discretion
- Panel minimum size constraints and resize behavior
- Which Netdata metrics to display (appropriate for web server monitoring)
- Alert threshold behavior (visual color coding)
- Exact refresh strategy for service status (balancing responsiveness with resource impact)

</decisions>

<specifics>
## Specific Ideas

- Server resource impact is a priority — the dashboard should monitor without adding significant load
- Service control limited to restart only for safety

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-server-dashboard*
*Context gathered: 2026-01-18*
