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

Phase 3 adds the first real domain module: Students. Guardians, classes, billing, finance, events, materials, ideas and reports remain intentionally outside this phase.

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
