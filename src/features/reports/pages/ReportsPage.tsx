import { Download, Printer, RefreshCw } from 'lucide-react'
import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/shared/components/navigation/PageHeader'
import { EmptyState } from '@/shared/components/feedback/EmptyState'
import { ErrorState } from '@/shared/components/feedback/ErrorState'
import { Button } from '@/shared/components/ui/Button'
import { Card } from '@/shared/components/ui/Card'
import { Select } from '@/shared/components/ui/FormControls'
import { Input } from '@/shared/components/ui/Input'
import { TabButton, Tabs } from '@/shared/components/ui/Tabs'
import { formatMoney } from '@/features/finance/utils/financeFormat'
import { buildCsv, downloadCsv } from '@/features/reports/utils/csvExport'
import {
  formatDate,
  formatPercent,
  formatPeriod,
  getComparisonLabel,
  getPeriodFromPreset,
  normalizePeriod,
  periodPresetOptions,
} from '@/features/reports/utils/reportingPeriod'
import type { PeriodPreset, ReportType, ReportsPeriod } from '@/features/reports/types/reportsTypes'
import {
  useAttendanceReport,
  useClassesReport,
  useEventsReport,
  useFinancialReport,
  useInventoryReport,
  useStudentsReport,
} from '@/features/reports/hooks/useReports'

const reportTabs: Array<{ label: string; value: ReportType }> = [
  { label: 'Resumo do mes', value: 'monthly' },
  { label: 'Financeiro', value: 'financial' },
  { label: 'Alunos', value: 'students' },
  { label: 'Turmas', value: 'classes' },
  { label: 'Frequencia', value: 'attendance' },
  { label: 'Eventos', value: 'events' },
  { label: 'Estoque', value: 'inventory' },
]

export default function ReportsPage() {
  const [params, setParams] = useSearchParams()
  const type = getReportType(params.get('tipo'))
  const period = useMemo(() => getPeriodFromParams(params), [params])

  function updateType(nextType: ReportType) {
    const next = new URLSearchParams(params)
    next.set('tipo', nextType)
    setParams(next, { replace: true })
  }

  function updatePeriod(nextPeriod: ReportsPeriod) {
    const normalized = normalizePeriod(nextPeriod)
    const next = new URLSearchParams(params)
    next.set('preset', normalized.preset)
    next.set('inicio', normalized.startDate)
    next.set('fim', normalized.endDate)
    setParams(next, { replace: true })
  }

  return (
    <div className="space-y-5 reports-print">
      <PageHeader
        actions={
          <Button leftIcon={<Printer className="h-4 w-4" aria-hidden />} onClick={() => window.print()} variant="secondary">
            Imprimir
          </Button>
        }
        description="Acompanhe desempenho, operacao e movimentacoes da Casa Criativa."
        title="Relatorios"
      />

      <Card className="print:shadow-none">
        <div className="grid gap-4 xl:grid-cols-[auto_1fr] xl:items-end">
          <Tabs>
            {reportTabs.map((tab) => <TabButton isActive={type === tab.value} key={tab.value} onClick={() => updateType(tab.value)}>{tab.label}</TabButton>)}
          </Tabs>
          <PeriodFilter onChange={updatePeriod} period={period} />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">Periodo: {formatPeriod(period)}</p>
      </Card>

      {type === 'monthly' ? <MonthlyReport period={period} /> : null}
      {type === 'financial' ? <FinancialReportSection period={period} /> : null}
      {type === 'students' ? <StudentsReportSection period={period} /> : null}
      {type === 'classes' ? <ClassesReportSection /> : null}
      {type === 'attendance' ? <AttendanceReportSection period={period} /> : null}
      {type === 'events' ? <EventsReportSection period={period} /> : null}
      {type === 'inventory' ? <InventoryReportSection period={period} /> : null}
    </div>
  )
}

function PeriodFilter({ onChange, period }: { onChange: (period: ReportsPeriod) => void; period: ReportsPeriod }) {
  return (
    <div className="grid gap-2 md:grid-cols-[180px_160px_160px]">
      <Select
        label="Periodo"
        onChange={(event) => onChange(getPeriodFromPreset(event.target.value as PeriodPreset))}
        value={period.preset}
      >
        {periodPresetOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </Select>
      <Input label="De" onChange={(event) => onChange({ ...period, preset: 'custom', startDate: event.target.value })} type="date" value={period.startDate} />
      <Input label="Ate" onChange={(event) => onChange({ ...period, preset: 'custom', endDate: event.target.value })} type="date" value={period.endDate} />
    </div>
  )
}

function MonthlyReport({ period }: { period: ReportsPeriod }) {
  const financial = useFinancialReport(period)
  const students = useStudentsReport(period)
  const classes = useClassesReport()
  const attendance = useAttendanceReport(period)
  const events = useEventsReport(period)
  const inventory = useInventoryReport(period)
  const isLoading = [financial, students, classes, attendance, events, inventory].some((query) => query.isLoading)
  const isError = [financial, students, classes, attendance, events, inventory].some((query) => query.isError)

  if (isError) return <ErrorState title="Nao foi possivel carregar o resumo mensal." />
  if (isLoading) return <ReportSkeleton />

  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <SummaryCard title="Financeiro" values={[
        ['Entradas recebidas', formatMoney(financial.data?.cash_in ?? 0)],
        ['Despesas pagas', formatMoney(financial.data?.cash_out ?? 0)],
        ['Resultado de caixa', formatMoney(financial.data?.result_amount ?? 0)],
        ['Vencido / a receber', formatMoney(financial.data?.receivable_amount ?? 0)],
      ]} />
      <SummaryCard title="Alunos" values={[
        ['Ativos', students.data?.active_students_count ?? 0],
        ['Novos no periodo', students.data?.new_students_count ?? 0],
        ['Saidas no periodo', students.data?.archived_students_count ?? 0],
        ['Variacao liquida', signedNumber(students.data?.net_students_change ?? 0)],
      ]} />
      <SummaryCard title="Aulas" values={[
        ['Aulas no periodo', attendance.data?.sessions_count ?? 0],
        ['Frequencia media', formatPercent(attendance.data?.attendance_rate)],
        ['Presencas', attendance.data?.present_count ?? 0],
        ['Pendentes', attendance.data?.pending_sessions_count ?? 0],
      ]} />
      <SummaryCard title="Operacao" values={[
        ['Turmas ativas', classes.data?.active_classes_count ?? 0],
        ['Ocupacao global', formatPercent(classes.data?.class_occupancy_rate)],
        ['Eventos no periodo', events.data?.events_count ?? 0],
        ['Materiais abaixo do minimo', inventory.data?.low_stock_count ?? 0],
      ]} />
    </section>
  )
}

function FinancialReportSection({ period }: { period: ReportsPeriod }) {
  const query = useFinancialReport(period)
  if (query.isLoading) return <ReportSkeleton />
  if (query.isError) return <ErrorState onRetry={() => void query.refetch()} title="Nao foi possivel carregar o relatorio financeiro." />
  const report = query.data
  if (!report) return null

  const csv = () => downloadCsv('relatorio-financeiro.csv', buildCsv(report.cash_flow_rows, [
    { header: 'Data', value: (row) => formatDate(row.date) },
    { header: 'Descricao', value: (row) => row.description },
    { header: 'Tipo', value: (row) => row.direction === 'income' ? 'Entrada' : 'Saida' },
    { header: 'Categoria', value: (row) => row.category_name ?? 'Sem categoria' },
    { header: 'Origem', value: (row) => row.source_type },
    { header: 'Valor', value: (row) => row.amount },
  ]))

  return (
    <section className="space-y-4">
      <ReportActions isFetching={query.isFetching} onCsv={csv} onRefresh={() => void query.refetch()} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Entradas recebidas" value={formatMoney(report.cash_in)} helper={getComparisonLabel(report.cash_in, report.previous_cash_in)} />
        <Metric label="Saidas pagas" value={formatMoney(report.cash_out)} helper={getComparisonLabel(report.cash_out, report.previous_cash_out)} />
        <Metric label="Resultado de caixa" value={formatMoney(report.result_amount)} helper={getComparisonLabel(report.result_amount, report.previous_result_amount)} />
        <Metric label="A receber" value={formatMoney(report.receivable_amount)} />
        <Metric label="A pagar" value={formatMoney(report.payable_amount)} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <h2 className="font-semibold text-foreground">Despesas por categoria</h2>
          <SimpleRows rows={report.expenses_by_category} render={(row) => <RowLine key={row.category_name} label={row.category_name} value={formatMoney(row.amount)} />} />
        </Card>
        <Card>
          <h2 className="font-semibold text-foreground">Movimentacoes</h2>
          <SimpleRows rows={report.cash_flow_rows.slice(0, 20)} render={(row, index) => <RowLine key={`${row.date}-${row.description}-${index}`} label={`${formatDate(row.date)} - ${row.description}`} value={formatMoney(row.amount)} />} />
        </Card>
      </div>
    </section>
  )
}

function StudentsReportSection({ period }: { period: ReportsPeriod }) {
  const query = useStudentsReport(period)
  if (query.isLoading) return <ReportSkeleton />
  if (query.isError) return <ErrorState onRetry={() => void query.refetch()} title="Nao foi possivel carregar o relatorio de alunos." />
  const report = query.data
  if (!report) return null
  const csv = () => downloadCsv('relatorio-alunos.csv', buildCsv(report.class_distribution, [
    { header: 'Turma', value: (row) => row.class_name },
    { header: 'Alunos ativos', value: (row) => row.active_students },
  ]))
  return (
    <section className="space-y-4">
      <ReportActions isFetching={query.isFetching} onCsv={csv} onRefresh={() => void query.refetch()} />
      <div className="grid gap-3 sm:grid-cols-4"><Metric label="Ativos" value={report.active_students_count} /><Metric label="Entradas" value={report.new_students_count} /><Metric label="Saidas" value={report.archived_students_count} /><Metric label="Variacao" value={signedNumber(report.net_students_change)} /></div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card><h2 className="font-semibold text-foreground">Distribuicao por turma</h2><SimpleRows rows={report.class_distribution} render={(row) => <RowLine key={row.class_name} label={row.class_name} value={`${row.active_students} alunos`} />} /></Card>
        <Card><h2 className="font-semibold text-foreground">Faixas etarias</h2><SimpleRows rows={report.age_bands} render={(row) => <RowLine key={row.age_band} label={row.age_band} value={row.student_count} />} /></Card>
      </div>
    </section>
  )
}

function ClassesReportSection() {
  const query = useClassesReport()
  if (query.isLoading) return <ReportSkeleton />
  if (query.isError) return <ErrorState onRetry={() => void query.refetch()} title="Nao foi possivel carregar o relatorio de turmas." />
  const report = query.data
  if (!report) return null
  const csv = () => downloadCsv('relatorio-turmas.csv', buildCsv(report.classes, [
    { header: 'Turma', value: (row) => row.name },
    { header: 'Capacidade', value: (row) => row.capacity ?? '' },
    { header: 'Alunos ativos', value: (row) => row.active_enrollments },
    { header: 'Ocupacao', value: (row) => row.occupancy_rate ?? '' },
    { header: 'Vagas', value: (row) => row.available_spots ?? '' },
  ]))
  return (
    <section className="space-y-4">
      <ReportActions isFetching={query.isFetching} onCsv={csv} onRefresh={() => void query.refetch()} />
      <div className="grid gap-3 sm:grid-cols-5"><Metric label="Turmas ativas" value={report.active_classes_count} /><Metric label="Alunos em turmas" value={report.class_active_enrollments} /><Metric label="Capacidade" value={report.class_total_capacity} /><Metric label="Ocupacao" value={formatPercent(report.class_occupancy_rate)} /><Metric label="Vagas" value={report.available_spots} /></div>
      <Card><h2 className="font-semibold text-foreground">Turmas</h2><SimpleRows rows={report.classes} render={(row) => <RowLine key={row.class_id} label={row.name} value={`${row.active_enrollments}/${row.capacity ?? '-'} - ${formatPercent(row.occupancy_rate)}`} />} /></Card>
    </section>
  )
}

function AttendanceReportSection({ period }: { period: ReportsPeriod }) {
  const query = useAttendanceReport(period)
  if (query.isLoading) return <ReportSkeleton />
  if (query.isError) return <ErrorState onRetry={() => void query.refetch()} title="Nao foi possivel carregar o relatorio de frequencia." />
  const report = query.data
  if (!report) return null
  const csv = () => downloadCsv('relatorio-frequencia.csv', buildCsv(report.by_student, [
    { header: 'Aluno', value: (row) => row.student_name },
    { header: 'Aulas registradas', value: (row) => row.recorded_classes },
    { header: 'Presencas', value: (row) => row.present_count },
    { header: 'Faltas', value: (row) => row.absent_count },
    { header: 'Justificadas', value: (row) => row.excused_count },
    { header: 'Frequencia', value: (row) => row.attendance_rate ?? '' },
  ]))
  return (
    <section className="space-y-4">
      <ReportActions isFetching={query.isFetching} onCsv={csv} onRefresh={() => void query.refetch()} />
      <div className="grid gap-3 sm:grid-cols-5"><Metric label="Taxa geral" value={formatPercent(report.attendance_rate)} /><Metric label="Presencas" value={report.present_count} /><Metric label="Faltas" value={report.absent_count} /><Metric label="Justificadas" value={report.excused_count} /><Metric label="Aulas sem registro" value={report.pending_sessions_count} /></div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card><h2 className="font-semibold text-foreground">Por turma</h2><SimpleRows rows={report.by_class} render={(row) => <RowLine key={row.class_id} label={row.class_name} value={`${formatPercent(row.attendance_rate)} - ${row.pending_sessions_count} pendentes`} />} /></Card>
        <Card><h2 className="font-semibold text-foreground">Por aluno</h2><SimpleRows rows={report.by_student.slice(0, 25)} render={(row) => <RowLine key={row.student_id} label={row.student_name} value={`${row.present_count}/${row.recorded_classes} - ${formatPercent(row.attendance_rate)}`} to={`/alunos?aluno=${row.student_id}`} />} /></Card>
      </div>
    </section>
  )
}

function EventsReportSection({ period }: { period: ReportsPeriod }) {
  const query = useEventsReport(period)
  if (query.isLoading) return <ReportSkeleton />
  if (query.isError) return <ErrorState onRetry={() => void query.refetch()} title="Nao foi possivel carregar o relatorio de eventos." />
  const report = query.data
  if (!report) return null
  const csv = () => downloadCsv('relatorio-eventos.csv', buildCsv(report.events, [
    { header: 'Evento', value: (row) => row.name },
    { header: 'Confirmados', value: (row) => row.confirmed_count },
    { header: 'Capacidade', value: (row) => row.capacity ?? '' },
    { header: 'Receita prevista', value: (row) => row.expected_revenue },
    { header: 'Recebido', value: (row) => row.received_amount },
    { header: 'A receber', value: (row) => row.receivable_amount },
  ]))
  return (
    <section className="space-y-4">
      <ReportActions isFetching={query.isFetching} onCsv={csv} onRefresh={() => void query.refetch()} />
      <div className="grid gap-3 sm:grid-cols-5"><Metric label="Eventos" value={report.events_count} /><Metric label="Inscricoes" value={report.registrations_count} /><Metric label="Confirmados" value={report.confirmed_count} /><Metric label="Recebido" value={formatMoney(report.received_amount)} /><Metric label="A receber" value={formatMoney(report.receivable_amount)} /></div>
      <Card><h2 className="font-semibold text-foreground">Eventos no periodo</h2><SimpleRows rows={report.events} render={(row) => <RowLine key={row.event_id} label={`${row.name} - ${formatDate(row.first_session_date)}`} value={`${row.confirmed_count}/${row.capacity ?? '-'} - ${formatMoney(row.received_amount)}`} to="/eventos" />} /></Card>
    </section>
  )
}

function InventoryReportSection({ period }: { period: ReportsPeriod }) {
  const query = useInventoryReport(period)
  if (query.isLoading) return <ReportSkeleton />
  if (query.isError) return <ErrorState onRetry={() => void query.refetch()} title="Nao foi possivel carregar o relatorio de estoque." />
  const report = query.data
  if (!report) return null
  const csv = () => downloadCsv('relatorio-estoque.csv', buildCsv(report.movement_rows, [
    { header: 'Data', value: (row) => formatDate(row.date) },
    { header: 'Material', value: (row) => row.material_name },
    { header: 'Movimento', value: (row) => row.movement_type },
    { header: 'Quantidade', value: (row) => row.quantity },
    { header: 'Unidade', value: (row) => row.unit },
    { header: 'Custo unitario', value: (row) => row.unit_cost ?? '' },
  ]))
  return (
    <section className="space-y-4">
      <ReportActions isFetching={query.isFetching} onCsv={csv} onRefresh={() => void query.refetch()} />
      <div className="grid gap-3 sm:grid-cols-5"><Metric label="Materiais ativos" value={report.active_materials_count} /><Metric label="Estoque baixo" value={report.low_stock_count} /><Metric label="Sem estoque" value={report.out_of_stock_count} /><Metric label="Consumo" value={report.consumption_quantity} /><Metric label="Compras" value={formatMoney(report.purchases_amount)} /></div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card><h2 className="font-semibold text-foreground">Criticos</h2><SimpleRows rows={report.low_stock_materials} render={(row) => <RowLine key={row.material_id} label={row.name} value={`${row.current_stock} / minimo ${row.minimum_stock}`} to="/materiais" />} /></Card>
        <Card><h2 className="font-semibold text-foreground">Movimentos no periodo</h2><SimpleRows rows={report.movement_rows.slice(0, 25)} render={(row, index) => <RowLine key={`${row.date}-${row.material_name}-${index}`} label={`${formatDate(row.date)} - ${row.material_name}`} value={`${row.movement_type}: ${row.quantity}`} />} /></Card>
      </div>
    </section>
  )
}

function ReportActions({ isFetching, onCsv, onRefresh }: { isFetching: boolean; onCsv: () => void; onRefresh: () => void }) {
  return (
    <div className="flex flex-wrap justify-end gap-2 print:hidden">
      <Button isLoading={isFetching} leftIcon={<RefreshCw className="h-4 w-4" aria-hidden />} onClick={onRefresh} variant="secondary">Atualizar</Button>
      <Button leftIcon={<Download className="h-4 w-4" aria-hidden />} onClick={onCsv} variant="secondary">CSV</Button>
    </div>
  )
}

function SummaryCard({ title, values }: { title: string; values: Array<[string, ReactNode]> }) {
  return <Card><h2 className="font-semibold text-foreground">{title}</h2><dl className="mt-4 grid gap-2 sm:grid-cols-2">{values.map(([label, value]) => <Metric key={label} label={label} value={value} />)}</dl></Card>
}

function Metric({ helper, label, value }: { helper?: string; label: string; value: ReactNode }) {
  return <div className="rounded border border-border bg-background p-3"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="mt-1 text-lg font-semibold text-foreground">{value}</dd>{helper ? <p className="mt-1 text-xs text-muted-foreground">{helper}</p> : null}</div>
}

function RowLine({ label, to, value }: { label: string; to?: string; value: ReactNode }) {
  const content = <div className="flex items-start justify-between gap-3 rounded border border-border bg-background p-3 text-sm"><span className="font-medium text-foreground">{label}</span><span className="text-right text-muted-foreground">{value}</span></div>
  return to ? <Link to={to}>{content}</Link> : content
}

function SimpleRows<TRow>({ render, rows }: { render: (row: TRow, index: number) => ReactNode; rows: TRow[] }) {
  if (!rows.length) return <EmptyState description="Nenhum dado encontrado para este periodo." title="Sem dados." />
  return <div className="mt-4 grid gap-2">{rows.map(render)}</div>
}

function ReportSkeleton() {
  return <div className="grid gap-4"><div className="h-24 rounded-md bg-muted" /><div className="h-72 rounded-md bg-muted" /></div>
}

function getReportType(value: string | null): ReportType {
  return reportTabs.some((tab) => tab.value === value) ? (value as ReportType) : 'monthly'
}

function getPeriodFromParams(params: URLSearchParams): ReportsPeriod {
  const preset = (params.get('preset') as PeriodPreset | null) ?? 'current_month'
  const base = getPeriodFromPreset(periodPresetOptions.some((option) => option.value === preset) ? preset : 'current_month')
  return normalizePeriod({
    endDate: params.get('fim') ?? base.endDate,
    preset: base.preset,
    startDate: params.get('inicio') ?? base.startDate,
  })
}

function signedNumber(value: number) {
  return value > 0 ? `+${value}` : String(value)
}
