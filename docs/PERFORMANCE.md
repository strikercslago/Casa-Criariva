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
