# Disaster Recovery

## Bad Deploy

Rollback in Netlify deploy history. Confirm login, dashboard and deep links after rollback.

## Bad Migration

Do not reset production. Stop writes if needed, inspect impact, then ship a reviewed forward-fix migration. Preserve audit history.

## Accidental Data Removal

Do not truncate or re-import blindly. Identify entity, timestamp and actor from `audit_events`. Restore only in an isolated environment first, then apply the minimal repair.

## Supabase Unavailable

The app must show error states and avoid pretending mutations succeeded. Payments and inventory movements must wait for server confirmation.

## Owner Lost

If another owner is active, promote or invite a replacement. If no owner can sign in, use Supabase administrative access only with explicit human approval and record the recovery action.
