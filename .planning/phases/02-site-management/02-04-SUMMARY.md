---
phase: 02-site-management
plan: 04
subsystem: api
tags: [fastapi, wordops, crud, ssl, cache, php]

# Dependency graph
requires:
  - phase: 02-03
    provides: POST /api/v1/sites endpoint and create_site wrapper
provides:
  - PUT /api/v1/sites/{domain} endpoint for partial updates
  - DELETE /api/v1/sites/{domain} endpoint with confirmation
  - update_site() CLI wrapper for SSL, cache, PHP changes
  - delete_site() CLI wrapper with --no-prompt flag
affects: [03-monitoring, frontend-site-management]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Partial update pattern with optional fields
    - Confirmation flag for destructive operations

key-files:
  created: []
  modified:
    - backend/wordops/models.py
    - backend/wordops/sites.py
    - backend/wordops/routes.py

key-decisions:
  - "Confirmation query param required for DELETE (confirm=true)"
  - "Separate WordOps commands for each update type (SSL, cache, PHP)"
  - "120s timeout for update operations, 60s for delete"

patterns-established:
  - "Partial update: Optional fields in request body, only provided fields updated"
  - "Destructive safety: Required confirm=true query param for DELETE"

# Metrics
duration: 3min
completed: 2026-01-18
---

# Phase 2 Plan 4: Site Update and Delete Summary

**PUT/DELETE endpoints for site modifications with UpdateSiteRequest model and confirmation-protected deletion**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-18T13:06:38Z
- **Completed:** 2026-01-18T13:09:17Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- UpdateSiteRequest Pydantic model with optional ssl, cache, php_version fields
- update_site() CLI wrapper supporting SSL toggle, cache change, PHP version update
- delete_site() CLI wrapper with --no-prompt and optional --files flags
- PUT /api/v1/sites/{domain} endpoint for partial site updates
- DELETE /api/v1/sites/{domain} endpoint requiring confirm=true query parameter

## Task Commits

Each task was committed atomically:

1. **Task 1: Create update request model** - `b56165f` (feat - pre-existing)
2. **Task 2: Implement update_site and delete_site CLI wrappers** - `a688152` (feat)
3. **Task 3: Add update and delete endpoints** - `3ef2c61` (feat)

## Files Created/Modified
- `backend/wordops/models.py` - Added UpdateSiteRequest with optional fields
- `backend/wordops/sites.py` - Added update_site() and delete_site() functions
- `backend/wordops/routes.py` - Added PUT and DELETE /{domain} endpoints

## Decisions Made
- **Confirmation for DELETE:** Required confirm=true query param prevents accidental deletions
- **Separate update commands:** WordOps CLI uses separate commands for SSL, cache, PHP - execute sequentially
- **Update timeout 120s:** Reasonable for SSL/cache/PHP changes
- **Delete timeout 60s:** Shorter than creation since less work involved
- **Force flag behavior:** When force=True, adds --files to remove site files completely

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - Task 1 model was pre-committed from a previous partial execution.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Complete CRUD operations for sites API
- Ready for frontend site management UI
- Ready for monitoring/metrics phase

---
*Phase: 02-site-management*
*Completed: 2026-01-18*
