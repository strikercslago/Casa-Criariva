# Observability

## Frontend

`reportError(error, context)` is the application boundary for future error tracking. In development it writes sanitized console errors. In production it does not leak stack traces to users.

Auth diagnostics are development-only and record status, route, method and duration. They do not log passwords, tokens, Authorization headers, request bodies or emails.

Web Vitals record CLS, INP and LCP in development. A paid analytics/error tracking service was not added.

## Supabase

Use the Supabase dashboard for:

- Auth logs: sign-in failures, invite delivery, MFA issues.
- API/PostgREST logs: RLS denials, 401/403/500 responses.
- Postgres logs: function errors and constraint failures.
- Edge Function logs: `admin-users` failures.

## Slow Paths

Monitor Dashboard, Relatorios, Financeiro, Mensalidades, Agenda and Estoque first. These routes depend on aggregation RPCs and should be checked after every migration that changes joins, indexes or policy helpers.
