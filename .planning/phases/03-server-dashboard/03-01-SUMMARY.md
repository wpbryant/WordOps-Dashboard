---
phase: 03-server-dashboard
plan: 01
subsystem: monitoring
tags: [netdata, metrics, api, server-monitoring]

dependency-graph:
  requires: [02-site-management]
  provides: [server-metrics-api, netdata-integration]
  affects: [03-02, 03-03, 03-04]

tech-stack:
  added:
    - httpx: ">=0.27.0 (async HTTP client for Netdata API)"
  patterns:
    - proxy-pattern: "Backend proxies Netdata API for auth"
    - time-range-enum: "TimeRange enum for metric windows"

key-files:
  created:
    - backend/server/__init__.py
    - backend/server/models.py
    - backend/server/netdata.py
    - backend/server/routes.py
  modified:
    - backend/config.py
    - backend/main.py
    - pyproject.toml

decisions:
  - key: netdata-api-v3
    choice: "Use Netdata API v3 /api/v3/data endpoint"
    rationale: "v3 is current API, combines v1/v2 functionality"
  - key: httpx-production
    choice: "Move httpx from dev to main dependencies"
    rationale: "Required at runtime for Netdata client"

metrics:
  duration: 3min
  completed: 2026-01-19
---

# Phase 3 Plan 1: Netdata API Integration Summary

Backend Netdata API integration providing authenticated access to server metrics (CPU, RAM, disk, network) with time-range support for sparkline visualization.

## One-liner

Netdata proxy endpoint with TimeRange parameter returning SystemMetrics for dashboard gauges and sparklines.

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 0ff3d3a | feat | Create server module with Netdata client |
| c33909b | feat | Add server metrics API endpoint |

## What Was Built

### Server Module Structure
```
backend/server/
  __init__.py       # Module exports
  models.py         # TimeRange, MetricPoint, MetricData, SystemMetrics
  netdata.py        # Netdata API v3 client wrapper
  routes.py         # GET /api/v1/server/metrics endpoint
```

### Models (models.py)
- `TimeRange` enum: FIVE_MIN ("5m"), ONE_HOUR ("1h"), ONE_DAY ("24h")
- `MetricPoint`: timestamp + value for sparkline data points
- `MetricData`: name, current value, unit, and historical points
- `SystemMetrics`: cpu, ram, disk, network_in, network_out

### Netdata Client (netdata.py)
- `fetch_metric(context, time_range)`: Fetch raw data from Netdata API v3
- `get_system_metrics(time_range)`: Fetch all core metrics as SystemMetrics
- Time range mapping: 5m=-300s, 1h=-3600s, 24h=-86400s
- Points per range: 5m=60, 1h=60, 24h=144 (sparkline resolution)
- Metric contexts: system.cpu, system.ram, system.io, system.net

### API Endpoint (routes.py)
- `GET /api/v1/server/metrics?range=5m|1h|24h`
- Requires JWT authentication
- Returns 503 if Netdata unreachable (httpx.ConnectError)
- Returns 503 if Netdata returns error (httpx.HTTPStatusError)

### Config Addition (config.py)
- `NETDATA_URL`: Default "http://127.0.0.1:19999"
- Env var: `WO_DASHBOARD_NETDATA_URL`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Move httpx to production dependencies**
- **Found during:** Task 1
- **Issue:** httpx was only in dev dependencies but needed at runtime for Netdata client
- **Fix:** Added httpx>=0.27.0 to main dependencies in pyproject.toml
- **Files modified:** pyproject.toml
- **Commit:** 0ff3d3a

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Netdata API version | v3 | Current API, replaces v1/v2 |
| HTTP client | httpx | Already in dev deps, async, simple API |
| Default points | 60 for 5m/1h, 144 for 24h | Reasonable sparkline resolution |
| Error response | 503 Service Unavailable | Indicates external service issue |

## Testing Notes

**Verified:**
- Models importable: `from backend.server.models import SystemMetrics`
- Netdata client importable: `from backend.server.netdata import get_system_metrics`
- Route registered in OpenAPI schema
- Endpoint returns 401 without auth

**Expected behavior:**
- Returns 503 if Netdata not running (normal for dev environments)
- Returns SystemMetrics JSON when Netdata available and authenticated

## Next Phase Readiness

**Provides for 03-02:**
- Server module structure for adding service status endpoints
- Pattern for proxy-style API endpoints with auth

**Provides for 03-04:**
- Metric models for frontend consumption
- Time range parameter pattern

**No blockers identified.**
