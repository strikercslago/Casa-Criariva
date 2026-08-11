# UAT Checklist

Use this checklist for human acceptance. Mark each row as approved, problem or observation.

Before the session, run `npm run e2e:smoke` and attach the result to the acceptance notes.

## Access

| Item | Approved | Problem | Observation |
| --- | --- | --- | --- |
| Owner logs in and sees all modules | [ ] | [ ] | |
| Admin logs in and does not see Financeiro Geral or Relatorios | [ ] | [ ] | |
| Teacher logs in and sees Agenda, Turmas and Frequencia clearly | [ ] | [ ] | |
| Logout clears private information after back/refresh | [ ] | [ ] | |

## Daily Operation

| Item | Approved | Problem | Observation |
| --- | --- | --- | --- |
| Dashboard answers "what do I have today?" | [ ] | [ ] | |
| Agenda opens a class and starts attendance | [ ] | [ ] | |
| Attendance for 8 students can be saved quickly on mobile | [ ] | [ ] | |
| Empty states are understandable on first use | [ ] | [ ] | |

## Students And Guardians

| Item | Approved | Problem | Observation |
| --- | --- | --- | --- |
| New student enrollment is clear from start to review | [ ] | [ ] | |
| Student 360 opens after enrollment | [ ] | [ ] | |
| Guardian phone can be searched, edited and saved quickly | [ ] | [ ] | |
| Related student is easy to find from guardian context | [ ] | [ ] | |

## Classes

| Item | Approved | Problem | Observation |
| --- | --- | --- | --- |
| Class capacity and current enrollment are obvious | [ ] | [ ] | |
| Student transfer preserves history | [ ] | [ ] | |
| Archived classes do not confuse daily operation | [ ] | [ ] | |

## Billing And Finance

| Item | Approved | Problem | Observation |
| --- | --- | --- | --- |
| Monthly fee can be found and paid by PIX | [ ] | [ ] | |
| Partial payments show value, paid amount, balance and status | [ ] | [ ] | |
| Overdue list answers "who owes?" | [ ] | [ ] | |
| Finance payable becomes paid and appears in cash flow | [ ] | [ ] | |
| Dashboard, Financeiro, Mensalidades and Relatorios reconcile | [ ] | [ ] | |

## Events And Materials

| Item | Approved | Problem | Observation |
| --- | --- | --- | --- |
| Workshop/event creation is clear | [ ] | [ ] | |
| Current student registration is clear | [ ] | [ ] | |
| External participant registration is clear | [ ] | [ ] | |
| Waitlist is clear when capacity fills | [ ] | [ ] | |
| Low stock is easy to identify | [ ] | [ ] | |
| Purchase receiving increases stock and creates finance entry | [ ] | [ ] | |

## Production

| Item | Approved | Problem | Observation |
| --- | --- | --- | --- |
| HTTPS production URL opens | [ ] | [ ] | |
| Direct deep links refresh correctly | [ ] | [ ] | |
| Mobile widths 360, 390 and 430 are usable | [ ] | [ ] | |
| Slow network remains understandable | [ ] | [ ] | |
| No console errors in production smoke | [ ] | [ ] | |
