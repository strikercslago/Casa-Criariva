# Architecture

Casa Criativa Gestao V2 is a React SPA with a persistent app shell. The shell owns providers, topbar, sidebar and route outlet. Route changes replace only outlet content.

## Stack

- React 18 with TypeScript strict mode.
- Vite for local development and production build.
- React Router for client routes.
- TanStack Query for server state, cache and retries.
- Supabase browser client centralized in `src/lib/supabase/client.ts`.
- React Hook Form and Zod reserved for forms and validation.
- Tailwind CSS with design tokens in `src/index.css`.
- Vitest, React Testing Library and Playwright.

## Folder Model

Source is organized by domain under `src/features`. Shared UI and utilities live under `src/shared`. Cross-cutting infrastructure lives under `src/app` and `src/lib`.

## Routing

Routes are lazy-loaded through `src/app/router/routePreloaders.ts`. Sidebar hover and focus prefetch the matching route chunk. Heavy future modules, especially reports and calendars, must stay lazy.

## State

Remote data must use TanStack Query. Local UI state should stay close to the component that owns it. Global state is acceptable only for cross-cutting concerns such as auth, toasts and user preferences.

## Current Scope

The current real domain modules are Students, Student 360, Guardians, Classes, Agenda/Attendance and Billing/Payments. General finance, expenses, events, materials, ideas and reports remain intentionally outside this phase.

## Auth Flow

App startup calls Supabase `getSession()` once in `AuthProvider`. `onAuthStateChange` keeps session state current. Profile and roles are loaded through TanStack Query with keys `['profile', userId]` and `['roles', userId]`.

Route guards use provider state only:

- unauthenticated users go to `/login`;
- authenticated users can enter the app shell;
- authenticated users visiting `/login` return to dashboard.

Logout calls Supabase Auth once, clears private Query cache and redirects to `/login`.

## Students Module Pattern

Students is the reference module for the next domains. Its code is isolated under `src/features/students`:

- `api`: pure Supabase data operations, no React state.
- `hooks`: TanStack Query hooks and query keys.
- `schemas`: Zod form validation.
- `types`: database-backed domain types.
- `utils`: status, dates and error mapping.
- `components`: list, filters, form, skeleton and detail drawer.
- `pages`: route-level orchestration for `/alunos`.

The list route selects only fields shown in the list:

`id, full_name, preferred_name, birth_date, enrollment_date, status`

Detail/edit loads notes and audit fields only when a student is opened.

Student details currently use a side drawer backed by the `?aluno=<id>` query parameter. This keeps navigation fast and preserves a URL state for browser history. A future full page can replace the drawer when guardians, classes, billing and attendance need larger nested surfaces.

Students query keys live in `src/features/students/hooks/studentsKeys.ts`:

- `studentsKeys.all`
- `studentsKeys.lists()`
- `studentsKeys.list(filters)`
- `studentsKeys.details()`
- `studentsKeys.detail(id)`

The route uses server-side pagination with 20 rows per page, debounced search at 320 ms and status filters (`all`, `active`, `inactive`, `archived`). Mutations update the detail cache and invalidate only students list queries.

Route chunk prefetch already happens through the sidebar hover/focus mechanism. The first students list is not prefetched because that would create a REST request before clear user intent.

## Student 360 Pattern

Phase 3.5 keeps the existing students list contract unchanged and adds Student 360 behind detail-only queries. The list still performs no joins and selects only list columns. The profile loads related responsible parties, enrollments, billing plans and recent audit history after the student is opened.

New files follow the existing domain split:

- `student360Api.ts`: Supabase operations and RPC payload mapping.
- `useStudent360.ts`: query and mutation hooks.
- `EnrollmentWizard.tsx`: local-only stepped enrollment flow.
- `Student360Profile.tsx`: tabbed profile for overview, responsible parties, enrollments, billing and history.

The enrollment wizard persists only through `complete_student_enrollment`. There is no autosave to Supabase while the user is moving between steps, and closing a dirty wizard asks for confirmation.

Student 360 query keys live in `src/features/students/hooks/student360Keys.ts`:

- `student360Keys.guardians.candidates(params)`
- `student360Keys.classes.list()`
- `student360Keys.relations.detail(studentId)`

`useCompleteStudentEnrollment` invalidates the students list, active class list and the new student's 360 relation cache. Existing older students render fallback messages when they have no related rows.

## Guardians Module Pattern

Phase 4 turns `/responsaveis` into a real lazy domain module under `src/features/guardians`:

- `api`: Supabase RPC/REST operations.
- `hooks`: TanStack Query hooks and query keys.
- `schemas`: Zod validation for contact and relationship forms.
- `types`: database-backed guardian and relationship types.
- `utils`: phone normalization, WhatsApp and role labels.
- `components`: filters, list, create drawer, relationship form and detail drawer.
- `pages`: route orchestration for `/responsaveis` and `/responsaveis/:guardianId`.

The list uses `list_guardians` to avoid N+1 queries. The detail route loads one guardian, its linked students and guardian audit events only when opened. Links to students navigate with React Router to `/alunos?aluno=<id>`, so the Student 360 drawer remains the single student profile surface.

Guardian contact mutations invalidate guardian lists/details and the Student 360 caches of linked students. Relationship mutations invalidate guardian caches and the affected student's detail/360 relation keys. There is no second source of truth for relationship flags.

## Classes Module Pattern

Phase 5 turns `/turmas` into a real lazy domain module under `src/features/classes`:

- `api`: Supabase RPC/REST operations and class payload mapping.
- `hooks`: TanStack Query hooks and query keys.
- `schemas`: Zod validation for class schedules and enrollment actions.
- `types`: database-backed class, schedule, enrollment and audit types.
- `utils`: schedule formatting, capacity calculation and class error mapping.
- `components`: filters, list, class form, create drawer, detail drawer and student action forms.
- `pages`: route orchestration for `/turmas` and `/turmas/:classId`.

The list uses `list_classes` to avoid N+1 schedule/enrollment counts. The detail drawer loads one class, schedules, enrollments with student summaries and class audit events only when opened. Links to students navigate to `/alunos?aluno=<id>`, keeping Student 360 as the single student profile surface.

Class mutations invalidate class lists/details plus affected Student 360 relation caches. Transfer is not modeled in UI state; it is a single database RPC that ends the source enrollment and creates the target enrollment atomically.

## Agenda And Attendance Pattern

Phase 6 turns `/agenda` into the daily operational attendance surface under `src/features/agenda`:

- `api`: agenda/session RPCs and attendance payloads.
- `hooks`: TanStack Query hooks and invalidation.
- `types`: generated session/attendance enum and RPC result types.
- `utils`: date handling, labels, attendance rate and error mapping.
- `components`: session list and attendance drawer.
- `pages`: day/week agenda orchestration.

The route intentionally avoids a heavy calendar widget. It loads a bounded date window through `list_agenda_sessions`, which materializes only the needed recurring sessions and returns list cards with expected-student and attendance totals.

Attendance is edited in a drawer and saved by one RPC call. Student-affecting attendance mutations invalidate the affected Student 360 relation cache so the `Frequencia` tab stays current.

## Billing And Payments Pattern

Phase 7 turns `/mensalidades` into the billing surface under `src/features/billing`:

- `api`: Supabase RPC operations and payload mapping.
- `hooks`: TanStack Query keys, list/detail hooks and scoped invalidation.
- `types`: generated table/RPC types plus parsed payment history shapes.
- `utils`: month handling, money/status labels and error mapping.
- `components`: filters, responsive fee list, payment drawer and monthly fee detail drawer.
- `pages`: month navigation, summary cards, server-side filters and pagination.

The architecture separates plan, charge, payment and allocation:

`student_billing_plans -> monthly_fees <- payment_allocations -> payments`

`student_billing_plans` remains the configuration source. `monthly_fees` stores snapshots of base amount, discount, final amount and due date for one reference month, so changing a plan later does not rewrite history. `payments` records received money and is reversed instead of deleted. `payment_allocations` links money to charges and stays as historical evidence even when the payment is reversed.

Billing status is derived, not stored as a mutable status column. The UI receives aggregated rows from `list_monthly_fees`, including amount paid, balance, computed status, financial guardian and overdue days. Partial overdue charges are shown as `Vencida - Parcial`, with overdue as the primary risk signal.

Payments are registered through one RPC. The database locks the target monthly fee, recalculates balance and rejects overpayment, including concurrent overpayment attempts. The frontend does not use optimistic updates for money; it waits for the RPC and then invalidates the fee detail, month list, month summary and affected Student 360 snapshot.

Payments are the future source of truth for tuition revenue. The later general finance phase must reuse or integrate this source instead of duplicating each payment as a disconnected revenue row.
