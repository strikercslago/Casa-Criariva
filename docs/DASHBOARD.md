# Dashboard

Phase 11 replaces the placeholder `/` route with the management dashboard.

## Sections

Priority order:

1. Today.
2. Attention.
3. Finance.
4. Students and classes.
5. Attendance.
6. Events.
7. Inventory.

The dashboard intentionally avoids a grid of identical cards. It groups operational urgency first, then monthly management indicators.

## Data Layer

The route uses three cached queries:

- `dashboardKeys.today(date)` calls `get_dashboard_today`.
- `dashboardKeys.attention(date)` calls `get_dashboard_attention`.
- `dashboardKeys.operations(referenceMonth)` calls `get_dashboard_operations`.

These are small read aggregators, not a single mega-RPC. Each block can load independently.

## Request Budget

Cold authenticated dashboard:

- `/auth/v1`: 0 redundant requests after session is available.
- `/rpc/get_dashboard_today`: 1 request.
- `/rpc/get_dashboard_attention`: 1 request.
- `/rpc/get_dashboard_operations`: 1 request.

The route does not load raw CRUD lists for students, fees, movements or registrations.

## Drill Down

Cards link to the operational module that owns the underlying data:

- agenda and pending attendance -> `/agenda`;
- finance -> `/financeiro`;
- overdue billing -> `/mensalidades`;
- students -> `/alunos`;
- classes -> `/turmas`;
- events -> `/eventos`;
- inventory -> `/materiais`;
- reports -> `/relatorios`.

Some links include query parameters as navigation hints. Operational modules remain the source of truth even when a target module does not yet persist every filter in URL state.

## Cache And Invalidation

Stale times:

- Today and attention: 60 seconds.
- Operations: 120 seconds.

Relevant mutations invalidate dashboard keys:

- billing and finance payments invalidate operations and attention;
- attendance changes invalidate today, attention and operations;
- material movements and purchase receiving invalidate operations and attention;
- student/class/event changes invalidate their related dashboard summaries.

## Mobile

Mobile order follows the priority order: Today, Attention, Finance, then the remaining management blocks. No central spinner is used; each block renders its own skeleton.
