# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-25)

**Core value:** Site management through a web UI — create, configure, and delete sites without touching the command line.
**Current focus:** Phase 7: Logs and Monitoring

## Current Position

Phase: 7 of 7 (Logs and Monitoring)
Plan: 1 of 3 in current phase
Status: In progress
Last activity: 2026-02-01 — Completed 07-01 (Log Viewer) implementation, awaiting checkpoint verification

Progress: [█████████░] 79% (19/24 plans complete)

## Performance Metrics

**v1.0 MVP:**
- Total plans completed: 12
- Total phases: 4
- Total execution time: ~30 min
- Timeline: 3 days (2026-01-17 to 2026-01-19)

**v1.1 Server Config UI:**
- Total plans planned: 9
- Plans completed: 6
- Status: Phase 6 complete with verification (2026-02-01), ready for Phase 7

## Accumulated Context

### Decisions

Key decisions from v1.0 logged in PROJECT.md Key Decisions table.
Recent decisions affecting v1.1:
- Phase 5: Overview and Stack Services grouped together (server info + stack management)
- Phase 6: All security features in single phase (SSH, fail2ban, firewall, DNS)
- Phase 7: Logs and Monitoring combined (observability features)
- **Log Parsing**: Parse logs at backend with source-specific regex patterns to avoid sending raw log files to frontend
- **Log Severity**: Map nginx status codes to severity (4xx=warn, 5xx=error), parse severity levels from PHP-FPM, MySQL, fail2ban logs
- **Log Limits**: Return 500 entries max across all sources (1000 max at API level) to prevent memory issues
- **Timeline UI**: Vertical left border with colored dots and severity-based background tinting for log entries
- **Log Search**: Debounced text input (500ms delay) covering message, source, severity, and client_ip fields
- **Package Update Execution**: Synchronous execution for this phase (returns final result after apt completes)
- **Progress Tracking**: Synthetic progress animation (0%, 25%, 50%, 75%, 100%) at 2-second intervals
- **Backup Detection**: Check multiple common backup directory locations for latest timestamp, excluding generic /var/backups
- **Modal Auto-Close**: Success state auto-closes after 5 seconds but allows manual dismiss
- **Service Icon Color Coding**: Blue (nginx), Purple (PHP-FPM), Teal (MySQL), Amber (Redis)
- **Status Dot Colors**: Green (running), Red (stopped), Amber (error/restarting)
- **Config Editing**: Out of scope for 05-02 - modal shows placeholder message
- **Manual Refresh Only**: No auto-refresh for stack services per CONTEXT decisions
- **No Confirmations**: Start/Stop/Restart actions execute immediately per CONTEXT decisions
- **Service Authentication**: Use config file credentials (~/.my.cnf for MySQL, /etc/redis/redis.conf for Redis), fall back to sudo
- **Error Visibility**: Capture stderr and log with context instead of silent None returns
- **DNS Credentials**: Read from /etc/letsencrypt/config/account.conf via sudo cat, mask API keys at source (first 8 chars + "..."), support 12+ providers (Cloudflare, DigitalOcean, Linode, GoDaddy, AWS, Google, Vultr, Hetzner, OVH, Aliyun, Name.com, Lexicon)
- **DNS View-Only**: No credential editing in UI for MVP; users configure via WordOps CLI export commands
- **Firewall MVP**: No edit or toggle functionality for UFW rules - users can delete and re-add rules to modify them
- **UFW Commands**: Async subprocess execution with 10s timeout, rule number used as ID for deletion
- **SSH Config Validation**: SSH changes validate with sshd -t before applying to prevent breaking access
- **Fail2ban Config**: Writes to jail.d/custom-dashboard.conf to preserve original configuration files
- **Type Field Names**: Use snake_case to match backend Pydantic models exactly

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-02-01
Stopped at: Completed 07-01 (Log Viewer) implementation - backend parsing, API endpoint, and frontend timeline UI all committed
Resume file: None
Next action: Verify log viewer functionality at checkpoint (type "approved" or describe issues)
