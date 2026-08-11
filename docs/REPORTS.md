# Reports

Phase 11 adds `/relatorios` as the analytic center of the system.

## Report Types

Initial reports:

- Resumo do mes.
- Financeiro.
- Alunos.
- Turmas.
- Frequencia.
- Eventos.
- Estoque.

The route does not include custom report builders, advanced BI, automated forecasts or complex PDF generation.

## Period Filter

The shared period control supports:

- Este mes.
- Mes anterior.
- Ultimos 3 meses.
- Este ano.
- Personalizado.

Custom periods validate by normalization: if `startDate > endDate`, the dates are swapped before querying.

URL state:

`/relatorios?tipo=financeiro&inicio=2026-08-01&fim=2026-08-31`

No sensitive state is stored in the URL.

## Data Layer

Reports use read RPCs:

- `get_financial_report(start, end)`;
- `get_students_report(start, end)`;
- `get_classes_report()`;
- `get_attendance_report(start, end)`;
- `get_events_report(start, end)`;
- `get_inventory_report(start, end)`.

These RPCs aggregate in the database and return only the rows needed for the visible report and CSV export. They reuse existing financial, agenda, class and inventory projections.

## CSV

CSV export is implemented for:

- Financeiro;
- Alunos;
- Turmas;
- Frequencia;
- Eventos;
- Estoque.

Exports include UTF-8 BOM, Portuguese headers, semicolon separators, escaped quotes, formatted display dates and no internal metadata such as Auth IDs except where a drill-down URL already needs an entity ID in the UI.

## Print

The app uses a lightweight print stylesheet:

- hides sidebar, topbar and buttons;
- keeps report title, period, numbers and rows;
- avoids PDF-specific dependencies.

## Comparisons

Financial report compares current period with the previous equivalent period for cash in, cash out and cash result. Percentages are hidden when the previous period is zero, using `Sem base comparavel`.

## Empty States

Reports without detail rows show `Nenhum dado encontrado para este periodo.` instead of implying that the operation necessarily had real zero activity.
