# Casa Criativa Gestao V2

Sistema administrativo SPA para a operacao Casa Criativa.

Inclui Auth Supabase, RLS, alunos, responsaveis, turmas, agenda, frequencia, mensalidades, financeiro, eventos, materiais, estoque, relatorios, dashboard gerencial e administracao.

## Stack

- React
- TypeScript strict
- Vite
- React Router
- TanStack Query
- Supabase
- React Hook Form
- Zod
- Tailwind CSS
- Vitest
- React Testing Library
- Playwright

## Requirements

- Node 20+
- npm
- Supabase CLI

## Scripts

- `npm run dev`
- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run e2e`

## Documentation

- `docs/ARCHITECTURE.md`
- `docs/PERFORMANCE.md`
- `docs/DATABASE.md`
- `docs/SECURITY.md`
- `docs/DESIGN-SYSTEM.md`
- `docs/DEVELOPMENT.md`

## Environment

`.env.local` is ignored by Git. Browser env must contain only public Vite values:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

Never create `VITE_SUPABASE_SERVICE_ROLE_KEY`.

## Supabase

Project ref: `baugbpqdgslfogggaqen`.

Useful commands:

```bash
npx supabase migration list
npx supabase db push --dry-run
npx supabase db lint --linked
npx supabase db push
npx supabase functions deploy admin-users --project-ref baugbpqdgslfogggaqen
```

## Deploy

Netlify is configured by `netlify.toml` for a Vite SPA:

- build command: `npm run build`
- publish directory: `dist`
- Node: `20`
- SPA fallback: `/* -> /index.html`

Production env must include only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.

## Operations Docs

- `docs/PERMISSIONS.md`
- `docs/RUNBOOK.md`
- `docs/PRODUCTION-CHECKLIST.md`
- `docs/BACKUP-RECOVERY.md`
- `docs/DISASTER-RECOVERY.md`
- `docs/OBSERVABILITY.md`
