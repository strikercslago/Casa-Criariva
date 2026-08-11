# Billing And Payments

Phase 7 adds professional tuition billing without creating the future general finance module.

## Model

The system separates four concepts:

- `student_billing_plans`: financial setup for a student.
- `monthly_fees`: one generated charge for one student/reference month.
- `payments`: money actually received.
- `payment_allocations`: the amount of a payment applied to a charge.

Generated `monthly_fees` snapshot `base_amount`, `discount_amount`, `final_amount` and `due_date`. Historical charges do not change when a billing plan changes later.

`reference_month` is always the first day of the month, such as `2026-08-01`. Due dates are real `date` values. A due day of 31 in February becomes the last valid day of February.

## Generation

`ensure_monthly_fees(reference_month)` creates charges only for active students with active, auto-generated billing plans whose billing start date is applicable. It is idempotent and protected by a partial unique index on active `(student_id, reference_month)`.

Students without a billing plan do not receive invented charges.

## Status

Status is derived from charge lifecycle, received allocations and due date:

- `Cancelada`: charge lifecycle is cancelled.
- `Paga`: balance is zero.
- `Vencida`: balance remains and due date has passed.
- `Parcial`: some payment exists and balance remains.
- `Pendente`: balance remains and due date has not passed.

If a charge is both partial and overdue, the UI presents `Vencida - Parcial` so delinquency stays visible.

## Payments

`register_payment(payload)` is one database transaction:

- validates owner access;
- locks the monthly fee row;
- recalculates received amount;
- rejects overpayment;
- creates `payments`;
- creates `payment_allocations`;
- writes audit events.

No optimistic UI is used for money. The frontend waits for the RPC result and then refreshes only billing-related caches.

## Reversal And Cancellation

Payments are not deleted by the application. `reverse_payment(payload)` requires a reason, marks the payment as `reversed` and keeps allocations for traceability. Reversed payments no longer count toward balances.

`cancel_monthly_fee(payload)` requires a reason and refuses to cancel while received payments remain active. Payments must be reversed first.

`update_monthly_fee_amount(payload)` allows negotiated correction of generated charges with a reason. It blocks final amounts below already received payments.

## UI

`/mensalidades` opens on the current month and supports:

- month navigation and month picker;
- idempotent charge generation;
- monthly summary: expected, received, pending and overdue;
- server-side status filters;
- debounced search by student or financial guardian;
- server-side pagination;
- responsive desktop list and mobile cards;
- payment drawer with partial payment support;
- charge detail drawer with payment history, reversals, adjustments and cancellation.

Student 360 Financeiro loads a compact snapshot on demand and links back to `/mensalidades`.

## Security

`monthly_fees`, `payments` and `payment_allocations` are owner-only behind RLS. Anon has zero access. Write RPCs use `SECURITY DEFINER` only for transactional integrity and audit writes; all validate `auth.uid()` and `current_user_is_owner()` and use fixed `search_path = public`.

## Validation

Remote rollback smoke test covered:

- idempotent generation;
- February due-day clamping;
- historical amount snapshots;
- partial payment;
- full payment;
- overpayment rejection;
- reversal preserving history;
- cancel-with-active-payment rejection;
- rollback with zero residual test rows.
