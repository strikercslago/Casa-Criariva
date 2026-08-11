# Performance

Performance is a product requirement for Casa Criativa Gestao V2.

## Budget

| Area | Target |
| --- | --- |
| Warm route navigation | Visual response under 100 ms when route chunk is loaded |
| Button feedback | Under 100 ms |
| Initial JS gzip | Under 250 KB during foundation |
| Simple queries | Few hundreds of ms after Supabase schema exists |
| Console | Zero runtime errors |
| Failed network | No silent failures |

## Strategy

- Persistent shell avoids remounting navigation and providers.
- Routes use lazy loading.
- Sidebar hover/focus preloads route chunks.
- TanStack Query default `staleTime` is 60 seconds, with per-domain overrides expected later.
- Cached data should render immediately while background refresh happens.
- Reports, calendars and exporters must remain route-local chunks.

## Measurements

| Date | Measurement | Result | Notes |
| --- | --- | --- | --- |
| 2026-08-10 | Vite dev startup | 470 ms | `npm run dev -- --host 127.0.0.1` |
| 2026-08-10 | Production build | 14.84 s | Includes TypeScript build and Vite build |
| 2026-08-10 | Vite transform/render | 5.56 s | Reported by Vite inside the build |
| 2026-08-10 | Initial JS bundle | 460.96 KB / 137.74 KB gzip | `dist/assets/index-*.js` |
| 2026-08-10 | CSS bundle | 16.58 KB / 4.26 KB gzip | `dist/assets/index-*.css` |
| 2026-08-10 | Lazy route chunks | 0.20 KB to 0.95 KB gzip | Placeholder routes only |
| 2026-08-10 | Unit/component tests | 7.37 s | 3 files, 4 tests |
| 2026-08-10 | E2E smoke | 6.37 s | 1 Chromium test, route navigation |
| 2026-08-10 | Vite dev startup after Auth | 1254 ms | Separate port `5174`; existing dev server was already running on `5173` |
| 2026-08-10 | Production build after Auth | 22.09 s | Includes TypeScript build and Vite build |
| 2026-08-10 | Vite transform/render after Auth | 11.21 s | Reported by Vite inside the build |
| 2026-08-10 | Initial JS bundle after Auth | 476.55 KB / 142.51 KB gzip | `dist/assets/index-*.js` |
| 2026-08-10 | Login route chunk | 89.04 KB / 25.19 KB gzip | React Hook Form, Zod resolver and login UI isolated in lazy route |
| 2026-08-10 | CSS bundle after Auth | 17.38 KB / 4.43 KB gzip | `dist/assets/index-*.css` |
| 2026-08-10 | Unauthenticated startup requests | `/auth/v1`: 0, `/rest/v1`: 0 | Headless Chromium against dev server |
| 2026-08-10 | Protected navigation requests | `/auth/v1`: 0, `/rest/v1`: 0 | `/alunos` redirected to `/login` without remote auth recheck |
| 2026-08-10 | Invalid login requests | `/auth/v1`: 1, `/rest/v1`: 0 | No real credentials used |
| 2026-08-10 | Unauthenticated startup visual | 346 ms | Headless Chromium to login screen |
| 2026-08-10 | Protected route redirect | 92 ms | `/alunos` to `/login` |
| 2026-08-10 | Invalid login feedback | 3545 ms | Supabase Auth rejected invalid credentials |
| 2026-08-10 | E2E smoke after Auth | 8.5 s | Protected route and login smoke |
| 2026-08-10 | Public signup check | blocked | Fake signup returned error and created no user |
| 2026-08-10 | Vite dev startup before Students | 1001 ms | `npm run dev -- --host 127.0.0.1 --port 5176` |
| 2026-08-10 | Production build after Students | 36.64 s | Final validation run, includes TypeScript build and Vite build |
| 2026-08-10 | Vite transform/render after Students | 19.59 s | Reported by Vite inside the final build |
| 2026-08-10 | Initial JS bundle after Students | 478.85 KB / 143.37 KB gzip | `dist/assets/index-*.js` |
| 2026-08-10 | CSS bundle after Students | 18.88 KB / 4.67 KB gzip | `dist/assets/index-*.css` |
| 2026-08-10 | Students route chunk | 27.05 KB / 8.16 KB gzip | Lazy `StudentsPage` domain code |
| 2026-08-10 | Shared form chunk | 85.31 KB / 23.95 KB gzip | Shared by lazy login and students form routes |
| 2026-08-10 | First `/alunos` open | 87 ms | Mocked authenticated run, `/auth/v1`: 0, `/rest/v1`: 1 |
| 2026-08-10 | Return to `/alunos` with cache | 105 ms | Mocked authenticated run, `/auth/v1`: 0, `/rest/v1`: 0 |
| 2026-08-10 | Student create | 164 ms | Mocked authenticated run, `/auth/v1`: 0, `/rest/v1`: 2 |
| 2026-08-10 | Student detail open | 98 ms | Detail was already cached after create, `/auth/v1`: 0, `/rest/v1`: 0 |
| 2026-08-10 | Student edit | 149 ms | Mocked authenticated run, `/auth/v1`: 0, `/rest/v1`: 2 |
| 2026-08-10 | Student archive | 97 ms | Mocked authenticated run, `/auth/v1`: 0, `/rest/v1`: 2 |
| 2026-08-10 | Filter archived | 99 ms | Mocked authenticated run with warm cache, `/auth/v1`: 0, `/rest/v1`: 0 |
| 2026-08-10 | Student restore | 139 ms | Mocked authenticated run, `/auth/v1`: 0, `/rest/v1`: 3 |
| 2026-08-10 | E2E after Students | 5.9 s | 2 Chromium tests: auth smoke and isolated students flow |
| 2026-08-10 | Production build after Student 360 | 13.78 s | Vite internal build time after final prefetch change |
| 2026-08-10 | Initial JS bundle after Student 360 | 478.85 KB / 143.37 KB gzip | Main shell unchanged in gzip size from Phase 3 build |
| 2026-08-10 | CSS bundle after Student 360 | 20.16 KB / 4.82 KB gzip | Wizard/profile styles added through existing Tailwind tokens |
| 2026-08-10 | Students route chunk after Student 360 | 61.02 KB / 15.68 KB gzip | Enrollment wizard, Student 360 profile, relation hooks and lightweight detail prefetch isolated in lazy route |
| 2026-08-10 | Unit/component tests after Student 360 | 24.42 s | 15 files, 27 tests |
| 2026-08-10 | E2E after Student 360 | 5.7 s | 2 Chromium tests: auth smoke and mocked 360 enrollment flow |
| 2026-08-11 | Baseline before Guardians | 9.10 s | Vite internal build; `/responsaveis` placeholder chunk was 0.28 KB / 0.23 KB gzip |
| 2026-08-11 | Production build after Guardians | 11.75 s | Vite internal build after the module implementation |
| 2026-08-11 | Initial JS bundle after Guardians | 479.04 KB / 143.43 KB gzip | Main shell increased by about 0.06 KB gzip |
| 2026-08-11 | Guardians route chunk | 33.72 KB / 8.75 KB gzip | Lazy route with list, forms, detail drawer and hooks |
| 2026-08-11 | Unit/component tests after Guardians | 20.09 s | 20 files, 35 tests |
| 2026-08-11 | E2E after Guardians | 5.7 s | 3 Chromium tests: auth, students and guardians integration smoke |
| 2026-08-11 | Baseline before Classes | 8.93 s | Vite internal build; `/turmas` placeholder chunk was 0.27 KB / 0.22 KB gzip |
| 2026-08-11 | Production build after Classes | 14.28 s | Vite internal build after module implementation |
| 2026-08-11 | Initial JS bundle after Classes | 479.15 KB / 143.48 KB gzip | Main shell increased by about 0.05 KB gzip from Guardians |
| 2026-08-11 | Classes route chunk | 35.04 KB / 9.62 KB gzip | Lazy route with list, forms, detail drawer, enrollment actions and hooks |
| 2026-08-11 | Unit/component tests after Classes | 17.84 s | 26 files, 46 tests |
| 2026-08-11 | E2E after Classes | 9.8 s | 4 Chromium tests: auth, students, guardians and classes integration smoke |
| 2026-08-11 | Production build after Agenda/Attendance | 11.14 s | Vite internal build after final implementation |
| 2026-08-11 | Initial JS bundle after Agenda/Attendance | 479.34 KB / 143.59 KB gzip | Main shell increased by about 0.11 KB gzip from Classes |
| 2026-08-11 | Agenda route chunk | 15.21 KB / 4.91 KB gzip | Lazy route with day/week list and attendance drawer |
| 2026-08-11 | Unit/component tests after Agenda/Attendance | 26.40 s | 29 files, 51 tests |
| 2026-08-11 | E2E after Agenda/Attendance | 10.8 s | 5 Chromium tests: auth, agenda, students, guardians and classes |
| 2026-08-11 | Baseline before Billing/Payments | 8.19 s | `/mensalidades` placeholder chunk was 0.29 KB / 0.23 KB gzip |
| 2026-08-11 | Production build after Billing/Payments | 7.92 s | Vite internal build after final implementation |
| 2026-08-11 | Initial JS bundle after Billing/Payments | 479.53 KB / 143.67 KB gzip | Main shell increased by about 0.08 KB gzip from Agenda/Attendance |
| 2026-08-11 | Billing route chunk | 19.35 KB / 5.17 KB gzip | Lazy route with monthly list, summary, filters, detail and payment flow |
| 2026-08-11 | Payment drawer shared chunk | 12.75 KB / 4.43 KB gzip | Reused by `/mensalidades` and Student 360 Financeiro |
| 2026-08-11 | Unit/component tests after Billing/Payments | 18.09 s | 30 files, 53 tests |
| 2026-08-11 | Billing E2E isolated | 12.6 s | 1 Chromium test: generation, partial/full payment, reversal and Student 360 Financeiro |
| 2026-08-11 | E2E after Billing/Payments | 17.2 s | 6 Chromium tests: auth, students, guardians, classes, agenda and billing |
| 2026-08-11 | Baseline before Finance | 10.06 s | `/financeiro` placeholder chunk was 0.29 KB / 0.23 KB gzip |
| 2026-08-11 | Production build after Finance | 10.71 s | Vite internal build after final implementation |
| 2026-08-11 | Initial JS bundle after Finance | 479.74 KB / 143.79 KB gzip | Main shell increased by about 0.12 KB gzip from Billing/Payments |
| 2026-08-11 | Finance route chunk | 36.46 KB / 8.58 KB gzip | Lazy route with summary, cash flow, entries, obligations, drawers and recurring rules |
| 2026-08-11 | Unit/component tests after Finance | 19.08 s | 31 files, 55 tests |
| 2026-08-11 | Finance E2E isolated | 7.6 s | 1 Chromium test: summary, manual entry, settlement, cash flow, receivables and payables |
| 2026-08-11 | E2E after Finance | 14.6 s | 7 Chromium tests: auth, students, guardians, classes, agenda, billing and finance |
| 2026-08-11 | Baseline before Events | 8.79 s | `/eventos` placeholder chunk was 0.29 KB / 0.23 KB gzip |
| 2026-08-11 | Production build after Events | 8.10 s | Vite internal build after final implementation |
| 2026-08-11 | Initial JS bundle after Events | 479.92 KB / 143.86 KB gzip | Main shell increased by about 0.07 KB gzip from Finance |
| 2026-08-11 | Events route chunk | 42.09 KB / 10.77 KB gzip | Lazy route with event list, sessions, registrations, drawers and payment flow |
| 2026-08-11 | Unit/component tests after Events | 16.29 s | 32 files, 57 tests |
| 2026-08-11 | Events E2E isolated | 20.2 s | 1 Chromium test: event creation, student registration, waitlist and partial/full receipt |
| 2026-08-11 | Baseline before Materials | 10.17 s | `/materiais` placeholder chunk was 0.28 KB / 0.23 KB gzip |
| 2026-08-11 | Production build after Materials | 17.12 s | Vite internal build after final implementation |
| 2026-08-11 | Initial JS bundle after Materials | 479.97 KB / 143.91 KB gzip | Main shell increased by about 0.05 KB gzip from Events |
| 2026-08-11 | Materials route chunk | 37.75 KB / 9.72 KB gzip | Lazy route with stock list, movements, purchases, suppliers and drawers |
| 2026-08-11 | Unit/component tests after Materials | 20.82 s | 33 files, 59 tests |
| 2026-08-11 | Materials E2E isolated | 17.9 s | 1 Chromium test: materials, movements, purchase receiving and finance cash-flow integration |
| 2026-08-11 | E2E after Materials | 24.6 s | 9 Chromium tests: auth, students, guardians, classes, agenda, billing, finance, events and materials |
| 2026-08-11 | Baseline before Dashboard/Reports | 27.14 s | Dashboard placeholder 3.00 KB / 0.98 KB gzip; reports placeholder 0.28 KB / 0.23 KB gzip |
| 2026-08-11 | Production build after Dashboard/Reports | 20.68 s | Vite internal build after final implementation |
| 2026-08-11 | Initial JS bundle after Dashboard/Reports | 480.06 KB / 143.95 KB gzip | Main shell increased by about 0.04 KB gzip from Materials |
| 2026-08-11 | Dashboard route chunk | 9.85 KB / 2.92 KB gzip | Lazy route with today, attention and management summary blocks |
| 2026-08-11 | Reports route chunk | 16.44 KB / 4.52 KB gzip | Lazy route with period filter, report tabs, CSV and print support |
| 2026-08-11 | Unit/component tests after Dashboard/Reports | 33.10 s | 34 files, 62 tests |
| 2026-08-11 | Dashboard/Reports E2E isolated | 5.2 s | 1 Chromium test: dashboard, drill-downs, reports, CSV, mobile and logout |
| 2026-08-11 | E2E after Dashboard/Reports | 24.5 s | 10 Chromium tests: full regression suite with dashboard and reports |

## Startup Notes

The first failed E2E run found that Chromium was not installed for Playwright. After `npx playwright install chromium`, the E2E smoke passed.

The first Auth E2E run exposed that `.env.local` had been written with a BOM by PowerShell, so Vite preview did not receive the Supabase env values. Rewriting `.env.local` as UTF-8 without BOM fixed the preview build.

## Baseline Comparison

| Metric | Before Supabase/Auth | After Supabase/Auth | Change |
| --- | --- | --- | --- |
| Dev startup | 470 ms | 1254 ms | +784 ms |
| Vite build internal | 5.56 s | 11.21 s | +5.65 s |
| Build command | 14.84 s | 22.09 s | +7.25 s |
| Initial JS gzip | 137.74 KB | 142.51 KB | +4.77 KB |
| CSS gzip | 4.26 KB | 4.43 KB | +0.17 KB |

The main bundle increase is small. Login-specific form dependencies are isolated in the lazy `LoginPage` chunk.

## Students Request Budget

Target for opening `/alunos` after a valid session is already available:

- `/auth/v1`: 0 requests.
- `/rest/v1`: 1 list request when cache is cold.
- `/rest/v1`: 0 requests when the list cache is still fresh.

Students list cache uses `staleTime = 90_000 ms`. Global auth profile and roles are owned by `AuthProvider`; the students route does not re-fetch Auth just to navigate.

Students list query:

```sql
select id, full_name, preferred_name, birth_date, enrollment_date, status
from students
where status = :status -- omitted for "all"
  and full_name ilike :search -- only after debounce
order by full_name asc, id asc
range :page
```

Detail query:

```sql
select id, full_name, preferred_name, birth_date, enrollment_date, status,
       notes, created_by, created_at, updated_at, archived_at
from students
where id = :id
```

EXPLAIN confirmed `students_full_name_trgm_idx` for `full_name ilike '%Ana%'`; execution time on the empty/initial remote table was 0.187 ms. The status/name list query is backed by `students_status_full_name_idx` and has no broad client-side filtering.

## Student 360 Request Budget

The `/alunos` list keeps the Phase 3 budget: one cold list request and no joins. The enrollment wizard adds class lookup only when the wizard opens, and guardian candidate lookup only when phone/email is long enough to search.

After a student is opened, Student 360 makes detail-only relation requests:

- `student_guardians`
- `enrollments`
- `student_billing_plans`
- `audit_events` limited to 50 rows

History is not loaded by the list and is not preloaded for every row. The route chunk remains lazy, and the heavier profile code is still isolated from initial app startup.

## Guardians Request Budget

Target for opening `/responsaveis` after a valid session is already available:

- `/auth/v1`: 0 requests.
- `/rest/v1`: 0 list requests.
- `/rpc/list_guardians`: 1 cold list request.
- Cached return within `staleTime`: renders cache immediately and refreshes only when invalidated/stale.

Guardian list query is centralized in `list_guardians(search, role, page, page_size)`. It returns guardian contact fields, linked-student summaries and aggregate relationship flags in one paged request, avoiding one query per responsible party.

Opening a guardian detail performs detail-only reads:

- `guardians` with embedded `student_guardians` and student summary;
- `audit_events` for the guardian timeline, limited to 50 rows.

Mutations use RPCs:

- create: `create_guardian_with_optional_student`;
- edit contact: `update_guardian_contact`;
- link/edit relationship: `upsert_guardian_student_link`;
- unlink: `unlink_guardian_student`.

Relationship changes invalidate the guardian list/detail and the affected Student 360 cache. No browser reload is used.

## Classes Request Budget

Target for opening `/turmas` after a valid session is already available:

- `/auth/v1`: 0 requests.
- `/rest/v1`: 0 list requests.
- `/rpc/list_classes`: 1 cold list request.
- Cached return within `staleTime`: cached rows render immediately, then refresh only when invalidated/stale.

`list_classes` returns schedule JSON, active enrollment count, available spots and full-class state in one paged RPC. This avoids per-row schedule/count requests.

Opening a class detail performs detail-only reads:

- `classes` with embedded schedules and enrollments plus student summary;
- `audit_events` for the class timeline, limited to 50 rows.

Mutations use RPCs and scoped invalidation. Student-affecting actions also invalidate the affected Student 360 relation cache, so `/alunos?aluno=<id>` reflects class changes without a browser reload.

## Agenda Request Budget

Target for opening `/agenda` after a valid session is already available:

- `/auth/v1`: 0 requests.
- `/rest/v1`: 0 list requests.
- `/rpc/list_agenda_sessions`: 1 cold request for the selected day/week.

`list_agenda_sessions` materializes needed sessions and returns the agenda cards in one request. Opening a session performs one `get_session_attendance` RPC. Saving attendance performs one `save_session_attendance` RPC regardless of student count.

Student 360 attendance history adds one detail-only `attendance_records` request after the student profile opens; it is not loaded by the students list.

## Billing Request Budget

Target for opening `/mensalidades` after a valid session is already available:

- `/auth/v1`: 0 requests.
- `/rest/v1`: 0 direct list requests.
- `/rpc/list_monthly_fees`: 1 cold list request for the selected month/page/filter.
- `/rpc/get_billing_month_summary`: 1 cold summary request for the selected month.

Changing month or filters invalidates only the billing list key for those parameters. Registering a payment uses one `register_payment` RPC, then invalidates:

- the opened monthly fee detail;
- monthly fee lists;
- the selected month summary;
- the affected Student 360 billing snapshot.

Opening a monthly fee performs one `get_monthly_fee_detail` RPC with payment history in the same response. Student 360 Financeiro performs one `get_student_billing_snapshot` RPC only when the Financeiro tab is opened; it does not load years of payment history during the initial student profile load.

## Finance Request Budget

Target for opening `/financeiro` after a valid session is already available:

- `/auth/v1`: 0 requests.
- `/rest/v1/financial_categories`: 1 cold metadata request.
- `/rest/v1/cash_accounts`: 1 cold metadata request.
- `/rest/v1/recurring_financial_rules`: 1 cold recurring rules request.
- `/rpc/get_finance_month_summary`: 1 cold summary request.
- `/rpc/list_finance_cash_flow`: 1 cold overview cash-flow request.
- `/rpc/list_financial_entries`: 1 cold manual entries request.
- `/rpc/list_finance_receivables`: 1 cold receivables request.
- `/rpc/list_finance_payables`: 1 cold payables request.

The route keeps all finance code lazy in `FinancePage`. Summary, cash flow, entries and obligations use separate TanStack Query keys so month/filter/page changes do not require browser reloads.

Manual entry creation uses one `create_financial_entry` RPC. Manual settlement uses one `settle_financial_entry` RPC. Reversal and cancellation each use one RPC. Billing payment mutations invalidate finance keys because tuition cash is read from `payments` in the finance cash-flow projection.

## Events Request Budget

Target for opening `/eventos` after a valid session is already available:

- `/auth/v1`: 0 requests.
- `/rest/v1/cash_accounts`: 1 cold metadata request.
- `/rpc/list_events`: 1 cold event list request.
- Selected event detail: one `events` row request, one `event_sessions` request, one `get_event_finance_summary` RPC and one `list_event_registrations` RPC.

Creating an event uses one `create_event` RPC. Creating a registration uses one `create_event_registration` RPC. Confirm, cancel and receive each use one RPC and invalidate event, registration, event finance and general finance caches.

## Materials Request Budget

Target for opening `/materiais` after a valid session is already available:

- `/auth/v1`: 0 requests.
- `/rest/v1/material_categories`: 1 cold metadata request.
- `/rest/v1/cash_accounts`: 1 cold metadata request.
- `/rpc/get_inventory_summary`: 1 cold summary request.
- `/rpc/list_materials`: 1 cold material list request.
- `/rpc/list_purchases`: 1 cold purchase list request.
- `/rpc/list_suppliers`: 1 cold supplier list request.

Opening a material history performs one `list_inventory_movements` RPC for that material. Creating a manual movement performs one `record_inventory_movement` RPC and invalidates material lists, movement history and the inventory summary.

Creating a draft purchase performs one `create_purchase` RPC and no stock or finance refresh is needed beyond purchase/supplier lists. Receiving a purchase performs one `receive_purchase` RPC and invalidates inventory, purchase and finance query keys.

## Dashboard Request Budget

Target for opening `/` after a valid session is already available:

- `/auth/v1`: 0 redundant requests.
- `/rpc/get_dashboard_today`: 1 cold request.
- `/rpc/get_dashboard_attention`: 1 cold request.
- `/rpc/get_dashboard_operations`: 1 cold request.

Dashboard does not load raw student lists, monthly fee lists, event registrations or inventory movement history.

## Reports Request Budget

`/relatorios` remains lazy. The selected report loads only its own aggregate RPC. The monthly summary intentionally loads the domain reports it displays:

- Financeiro: `get_financial_report`.
- Alunos: `get_students_report`.
- Turmas: `get_classes_report`.
- Frequencia: `get_attendance_report`.
- Eventos: `get_events_report`.
- Estoque: `get_inventory_report`.

CSV export uses the already filtered report payload in memory and does not issue another network request.

## Phase 12 Production Build

Measured on 2026-08-11 after stopping an old `vite preview` process that was locking `dist`.

- `npm run build`: passed.
- Initial app chunk: `dist/assets/index-C6JxusZC.js` 513.45 kB, gzip 154.51 kB.
- CSS: `dist/assets/index-6uiYOTPj.css` 25.61 kB, gzip 5.77 kB.
- Largest lazy route chunks: Students 55.35 kB, Events 42.46 kB, Materials 38.07 kB, Finance 36.91 kB, Classes 35.76 kB.
- Build warning: initial chunk is above 500 kB after React Router 7 and administration UI. This is documented for follow-up manual chunking; route modules remain lazy.
- Dashboard requests remain 3 aggregate RPCs for owner/admin. Teacher-only dashboard avoids management dashboard RPCs and shows operational shortcuts.
- React Router was upgraded to 7.18.2; production runtime is now Node 20+.

## Phase 13 Homologation Build

Measured on 2026-08-11 during final homologation.

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run test`: 37 files, 67 tests, 20.62 s.
- `npm run build`: passed; Vite internal build 11.44 s.
- Initial app chunk: `dist/assets/index-Cz8QohWB.js` 513.46 kB, gzip 154.51 kB.
- CSS: `dist/assets/index-6uiYOTPj.css` 25.61 kB, gzip 5.77 kB.
- Largest lazy route chunks: Students 55.35 kB, Events 42.46 kB, Materials 38.07 kB, Finance 36.91 kB, Classes 35.81 kB.
- `npm run e2e`: 14 Chromium tests, 29.8 s.
- `npm run e2e:smoke`: 1 Chromium test, 6.2 s, including mobile widths 360/390/430.
- Remaining P2: initial chunk is above Vite's 500 kB warning threshold. Keep monitoring real production Core Web Vitals before adding manual chunks.
