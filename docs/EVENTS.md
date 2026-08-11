# Events

Phase 9 adds events, workshops and holiday colonies without creating a parallel finance system.

## Model

The module separates event setup, sessions and registrations:

- `events`: event identity, type, status, base capacity and base price.
- `event_sessions`: dated sessions with optional capacity or price override.
- `event_registrations`: one participant registration, either an existing student or an external guest.
- `event_registration_sessions`: selected sessions when the registration is not for the full event.
- `financial_entries`: the single receivable created for each paid confirmed registration.
- `financial_settlements`: partial or full receipts for event receivables.

External guests must have a responsible guardian, either reused from `guardians` or created during registration. Existing students can be registered without duplicating guardian data.

## Finance Rule

Confirmed paid registrations create exactly one income `financial_entries` row linked by `event_registrations.financial_entry_id`.

Free confirmed registrations do not create receivables. Waitlisted and pending registrations do not create receivables until confirmed. Event receipts call `settle_event_registration`, which delegates to the existing finance settlement path.

Cancellation preserves money. An unpaid registration can cancel its linked receivable. A registration with active receipts is blocked from cancellation and must be handled explicitly through finance policy before cancellation.

## Capacity

Capacity is enforced in the database during create/confirm:

- full-event registrations count against every limited session and event capacity;
- selected-session registrations count only against selected sessions;
- session capacity override wins over event capacity for that session;
- row locks protect concurrent confirmations from overbooking.

The event list shows available spots from the most restrictive limited session.

## UI

`/eventos` provides:

- event filters by status, type and search;
- event creation with one or more sessions;
- selected event summary with sessions and finance cards;
- registration creation for existing students or external participants;
- responsible party reuse or creation for external guests;
- confirmed, pending and waitlisted registrations;
- partial/full receipts through finance settlements;
- WhatsApp shortcut when the guardian has a valid phone.

Query keys:

- `eventsKeys.all`
- `eventsKeys.lists()`
- `eventsKeys.list(filters)`
- `eventsKeys.detail(id)`
- `eventsKeys.sessions(id)`
- `eventRegistrationsKeys.list(eventId, filters)`
- `eventRegistrationsKeys.detail(id)`
- `eventFinanceKeys.summary(eventId)`

## Verification

Remote rollback smoke covered event/session creation, existing student registration, external participant with new guardian, capacity rejection, waitlist promotion path, event financial summary, partial/full receipt, cash-flow source `event_registration`, paid cancellation rejection, free registration without receivable and zero residual event rows after rollback.

Anonymous REST/RPC access to event resources was blocked with `401` / PostgreSQL `42501`.

## Dashboard And Reports Integration

Dashboard shows only upcoming/today event information from `events` and `event_sessions`.

Event reports use sessions in the selected period, registrations for those events, and linked finance settlements for received/receivable amounts. They do not duplicate finance entries or cash-flow rows.
