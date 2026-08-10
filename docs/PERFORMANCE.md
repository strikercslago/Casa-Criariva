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

## Startup Notes

The first failed E2E run found that Chromium was not installed for Playwright. After `npx playwright install chromium`, the E2E smoke passed.
