# Metrics

Reports are not a new source of truth. Dashboard and reports use the same database projections as operational modules.

## Official Matrix

| Metric | Truth source | Query/RPC | Period | Rule |
| --- | --- | --- | --- | --- |
| Active students | `students` | `get_students_report`, `get_dashboard_operations` | current state | `students.status = active`. |
| New students | `students` | `get_students_report` | selected period | `enrollment_date between start_date and end_date`. |
| Archived students | `students` | `get_students_report` | selected period | `status = archived` and `archived_at::date` inside period. |
| Net student change | students report rows | `get_students_report` | selected period | new students minus archived students. |
| Class active enrollments | `enrollments` via `list_classes` | `get_classes_report` | current state | `enrollments.status = active`. |
| Global class occupancy | `list_classes` projection | `get_classes_report`, `get_dashboard_operations` | current state | total active enrollments divided by total defined capacity. Classes without capacity do not add capacity. |
| Full classes | `list_classes` projection | `get_classes_report`, `get_dashboard_attention` | current state | active enrollments greater than or equal to capacity when capacity exists. |
| Today sessions | `class_sessions` via `list_agenda_sessions` | `get_dashboard_today` | local day | Concrete sessions for the selected day, after materialization. |
| Expected students today | `enrollments` via `list_agenda_sessions` | `get_dashboard_today` | local day | Enrollment dates overlap session date. |
| Pending attendance | `list_agenda_sessions` | `get_dashboard_today`, `get_attendance_report` | selected day/period | Session is not cancelled and attendance state is `pending`. Pending does not mean absent. |
| Attendance rate | `attendance_records` and `class_sessions` | `get_attendance_report`, `get_dashboard_operations` | selected period | present divided by present + absent + excused. Cancelled sessions do not enter. |
| Cash in | `payments` + `financial_settlements` | `finance_cash_flow_rows`, `get_financial_report`, `get_dashboard_operations` | selected period | Consolidated cash-flow income rows. Tuition payments are counted once. |
| Cash out | `financial_settlements` | `finance_cash_flow_rows`, `get_financial_report`, `get_dashboard_operations` | selected period | Consolidated cash-flow expense rows. |
| Cash result | cash-flow projection | `get_financial_report`, `get_dashboard_operations` | selected period | cash in minus cash out. This is not formal net profit. |
| Receivable | `monthly_fee_financial_rows` + `finance_entry_financial_rows` | `get_financial_report`, `get_dashboard_operations` | due/competence period | Active balances greater than zero. |
| Payable | `finance_entry_financial_rows` | `get_financial_report`, `get_dashboard_operations` | competence period | Active expense balances greater than zero. |
| Overdue tuition | `monthly_fee_financial_rows` | `get_dashboard_attention`, `get_dashboard_operations` | due date | Active balance greater than zero and `due_date < today`. |
| Event registrations | `event_registrations` | `get_events_report` | event session period | Registrations for events with sessions inside selected period. |
| Event received | linked finance settlements | `get_events_report` | event session period | Active settlements against event registration finance entries. |
| Low stock | `materials` + `inventory_movements` | `list_materials`, `get_inventory_report`, `get_dashboard_attention` | current state | Derived stock is positive and less than or equal to minimum stock. |
| Out of stock | `materials` + `inventory_movements` | `list_materials`, `get_inventory_report`, `get_dashboard_attention` | current state | Derived stock is less than or equal to zero. |
| Inventory consumption | `inventory_movements` | `get_inventory_report` | movement date | Sum of `consumption` movement quantities. |
| Inventory purchases | `inventory_movements` | `get_inventory_report` | movement date | Sum of `purchase` quantities and quantity times unit cost. This is purchase movement value, not inventory valuation. |

## Naming

The financial result shown in dashboards and reports is `Resultado de caixa` or `Resultado do periodo`. It is not a formal DRE, net income or fiscal accounting result.

## Comparisons

Period comparison is shown only when the previous equivalent period has a nonzero base. Otherwise the UI shows `Sem base comparavel`.
