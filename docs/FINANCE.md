# Finance

Phase 8 adds the general finance module without duplicating tuition revenue.

## Model

The system separates obligations from effective cash movements:

- `financial_categories`: manual income and expense categories.
- `financial_entries`: manual non-tuition obligations, either `income` or `expense`.
- `financial_settlements`: received/paid money against manual entries.
- `recurring_financial_rules`: monthly rules that generate manual obligations idempotently.
- `cash_accounts`: cash/bank buckets used by manual settlements.
- `payments`: tuition cash receipts from Billing/Payments.

Tuition revenue is not copied into `financial_entries`. The consolidated cash flow reads `payments` once and uses `payment_allocations` only as descriptive links.

## Cash Flow

`finance_cash_flow_rows(start_date, end_date)` is the internal projection used by finance lists and summary.

It unions:

- received `payments` as `tuition_payment` income rows;
- active `financial_settlements` for active manual entries.
- active `financial_settlements` for event registrations as `event_registration` income rows.

The final cash total therefore counts one tuition payment amount once, even when that payment has multiple monthly fee allocations.

## Obligations

Receivables combine:

- active monthly fees with balance greater than zero;
- active manual income entries with balance greater than zero.

Payables combine:

- active manual expense entries with balance greater than zero.

Statuses are derived from lifecycle, settlement total, balance and due date: `pending`, `overdue`, `partial`, `received`, `paid` or `cancelled`.

## Transactions

Manual entry operations use database RPCs:

- `create_financial_entry(payload)`;
- `update_financial_entry(payload)`;
- `settle_financial_entry(payload)`;
- `reverse_financial_settlement(payload)`;
- `cancel_financial_entry(payload)`;
- `create_recurring_financial_rule(payload)`;
- `update_recurring_financial_rule(payload)`;
- `disable_recurring_financial_rule(payload)`;
- `ensure_recurring_financial_entries(reference_month)`.

`settle_financial_entry` locks the entry, recalculates active settlements and rejects overpayment in the database. Corrections reverse settlements instead of deleting rows.

## UI

`/financeiro` opens on the current month with:

- summary cards for entries received, exits paid, result, receivable and payable;
- tabs for `Visao geral`, `Lancamentos`, `A receber` and `A pagar`;
- consolidated cash-flow list;
- manual entry drawer with optional immediate settlement;
- settlement drawer with partial payment/receipt support;
- recurring rule creation through the new-entry drawer and idempotent month generation;
- owner-only edit, cancel and settlement reversal actions.

The route query keys are:

- `financeKeys.summary(month)`;
- `financeKeys.cashFlow(filters)`;
- `financeKeys.entries(filters)`;
- `financeKeys.receivables(filters)`;
- `financeKeys.payables(filters)`;
- `financeKeys.categories()`;
- `financeKeys.accounts()`;
- `financeKeys.recurringRules()`.

Billing payment mutations invalidate `financeKeys.all` so tuition cash flow and receivables stay current after payment registration, reversal or fee cancellation. Event registration mutations also invalidate finance keys when they create, cancel or settle linked receivables.

## Events Integration

Events reuse finance obligations and settlements:

- paid confirmed registration: one income `financial_entries` row;
- free confirmed registration: no receivable;
- partial/full receipt: `financial_settlements` against the linked entry;
- cancellation with active receipt: blocked, preserving cash evidence.

Finance cash flow labels event-sourced settlements as `Evento` and uses `source_type = 'event_registration'` with `source_id = event_registrations.id`.

## Security

All finance tables use owner-only RLS. Anonymous REST access is blocked. Public frontend code uses only Supabase URL and publishable key; no service role is used.

Finance RPCs use `SECURITY DEFINER` only where needed for transactional writes or private projections. Every RPC validates `auth.uid()` and `current_user_is_owner()` and sets `search_path = public`.

## Validation

Remote rollback smoke covered:

- manual expense creation;
- partial settlement;
- overpayment rejection;
- full settlement;
- settlement reversal;
- manual income settlement;
- recurring February due-day clamping;
- idempotent recurring generation;
- one tuition payment allocated to two monthly fees counted once in cash flow;
- rollback with zero residual finance entries.
