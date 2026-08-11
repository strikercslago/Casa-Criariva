# Runbook

## Create User

Owner opens `/configuracoes/usuarios`, fills name, email and role, then sends an invite. The browser calls the `admin-users` Edge Function; service role remains server-side only.

## Disable User

Owner uses `/configuracoes/usuarios` and clicks `Desativar`. The account profile becomes inactive and the auth user is banned by the Edge Function. Historical `created_by`, `recorded_by` and `audit_events` remain preserved.

The database trigger blocks disabling or demoting the last active owner.

## Recover Access

If one owner remains active, use that account to invite/promote another owner. If all owner access is lost, use Supabase Dashboard/SQL with human approval and log the action manually in the incident record.

## Backup

Follow `docs/BACKUP-RECOVERY.md`. Never store dumps in Git.

## Investigate Error

Check browser console in development, Supabase Auth/API logs in the dashboard and `/configuracoes/auditoria` for administrative events. Logs must not include passwords, tokens or full financial/person data unless required for the investigation.

## Deploy

Use Node 20, `npm ci`, `npm run build`, then deploy `dist` as a Vite SPA. Netlify uses `netlify.toml`.

## Daily Smoke

Before opening daily operation, run:

```bash
npm run e2e:smoke
```

The smoke logs in as an owner with mocked Supabase responses, opens Inicio, Alunos, Agenda, Frequencia, Mensalidades and Financeiro, checks mobile widths 360/390/430 for the operational shell, and logs out.

## Rollback Deploy

Use Netlify deploy history to restore the last good deploy. If a migration caused the issue, stop and prepare a reviewed forward-fix migration; do not reset or truncate production data.

## Apply Migration

Run:

```bash
npx supabase db push --dry-run
npx supabase db lint --linked
npx supabase db push
```

Destructive migrations require separate approval.
