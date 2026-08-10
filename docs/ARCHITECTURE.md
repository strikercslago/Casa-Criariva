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

Phase 2 adds Supabase Auth foundation: protected routes, login, logout, profile and roles cache. Real students, finance, billing and agenda logic are intentionally not implemented yet.

## Auth Flow

App startup calls Supabase `getSession()` once in `AuthProvider`. `onAuthStateChange` keeps session state current. Profile and roles are loaded through TanStack Query with keys `['profile', userId]` and `['roles', userId]`.

Route guards use provider state only:

- unauthenticated users go to `/login`;
- authenticated users can enter the app shell;
- authenticated users visiting `/login` return to dashboard.

Logout calls Supabase Auth once, clears private Query cache and redirects to `/login`.
