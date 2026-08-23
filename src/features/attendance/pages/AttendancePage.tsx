import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  RefreshCw,
  Save,
  UsersRound,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useBlocker, useSearchParams } from 'react-router-dom'
import { getUserSafeErrorMessage } from '@/lib/errors/AppError'
import { EmptyState } from '@/shared/components/feedback/EmptyState'
import { ErrorState } from '@/shared/components/feedback/ErrorState'
import { useToast } from '@/shared/components/feedback/Toast'
import { PageHeader } from '@/shared/components/navigation/PageHeader'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { IconButton } from '@/shared/components/ui/IconButton'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import {
  useAgendaSessions,
  useSaveSessionAttendance,
  useSessionAttendance,
} from '@/features/agenda/hooks/useAgenda'
import type {
  AgendaSession,
  AttendanceStatus,
  SessionAttendanceRow,
} from '@/features/agenda/types/agendaTypes'
import {
  addDays,
  formatLongAgendaDate,
  formatTimeRange,
  parseIsoDate,
  toIsoDate,
} from '@/features/agenda/utils/agendaDates'
import {
  createAttendanceDrafts,
  createAttendanceSnapshot,
  getAttendanceSummary,
  hasAttendanceChanges,
  markUnrecordedPresent,
  setAttendanceNotes,
  setAttendanceStatus,
  toAttendanceSaveRecords,
  type AttendanceDrafts,
} from '@/features/attendance/utils/attendanceDrafts'
import { StudentAvatar } from '@/features/students/components/StudentAvatar'
import { cn } from '@/shared/utils/cn'

const UNSAVED_MESSAGE = 'Existem alteracoes nao salvas nesta chamada. Deseja sair mesmo assim?'

const statusOptions: Array<{
  activeClassName: string
  description: string
  label: string
  value: AttendanceStatus
}> = [
  {
    activeClassName: 'border-success bg-success/10 text-success shadow-subtle',
    description: 'Aluno presente na aula',
    label: 'Presente',
    value: 'present',
  },
  {
    activeClassName: 'border-danger bg-danger/10 text-danger shadow-subtle',
    description: 'Aluno ausente sem justificativa',
    label: 'Falta',
    value: 'absent',
  },
  {
    activeClassName: 'border-warning bg-warning/20 text-amber-800 shadow-subtle',
    description: 'Ausencia justificada',
    label: 'Justificada',
    value: 'excused',
  },
]

export default function AttendancePage() {
  const today = useMemo(() => toIsoDate(new Date()), [])
  const [searchParams] = useSearchParams()
  const requestedSessionId = searchParams.get('session')
  const [selectedDate, setSelectedDate] = useState(today)
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(requestedSessionId)
  const [drafts, setDrafts] = useState<AttendanceDrafts>({})
  const [savedSnapshot, setSavedSnapshot] = useState(createAttendanceSnapshot({}))
  const sessionsQuery = useAgendaSessions({ endDate: selectedDate, startDate: selectedDate })
  const sessions = useMemo(() => sortSessions(sessionsQuery.data ?? []), [sessionsQuery.data])
  const selectedSession = sessions.find((session) => session.session_id === selectedSessionId) ?? null
  const attendanceQuery = useSessionAttendance(selectedSessionId)
  const saveMutation = useSaveSessionAttendance(selectedSessionId ?? '')
  const { notify } = useToast()
  const rows = useMemo(() => attendanceQuery.data ?? [], [attendanceQuery.data])
  const summary = useMemo(() => getAttendanceSummary(drafts), [drafts])
  const hasRows = rows.length > 0
  const hasUnsavedChanges = hasRows && hasAttendanceChanges(drafts, savedSnapshot)
  const isCancelled = selectedSession?.status === 'cancelled' || rows[0]?.session_status === 'cancelled'
  const saveRecords = useMemo(() => toAttendanceSaveRecords(drafts), [drafts])
  const canSave = hasRows && saveRecords.length > 0 && hasUnsavedChanges && !isCancelled
  const latestRecordedAt = useMemo(() => getLatestRecordedAt(rows), [rows])

  useEffect(() => {
    if (!sessions.length) {
      setSelectedSessionId(null)
      return
    }

    if (selectedSessionId && sessions.some((session) => session.session_id === selectedSessionId)) {
      return
    }

    const requestedSession = requestedSessionId
      ? sessions.find((session) => session.session_id === requestedSessionId)
      : null

    setSelectedSessionId((requestedSession ?? sessions[0]).session_id)
  }, [requestedSessionId, selectedSessionId, sessions])

  useEffect(() => {
    const nextDrafts = createAttendanceDrafts(rows)
    setDrafts(nextDrafts)
    setSavedSnapshot(createAttendanceSnapshot(nextDrafts))
  }, [rows])

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  const blocker = useBlocker(hasUnsavedChanges)

  useEffect(() => {
    if (blocker.state !== 'blocked') {
      return
    }

    if (window.confirm(UNSAVED_MESSAGE)) {
      blocker.proceed()
      return
    }

    blocker.reset()
  }, [blocker])

  function confirmPendingChanges() {
    return !hasUnsavedChanges || window.confirm(UNSAVED_MESSAGE)
  }

  function moveDate(days: -1 | 1) {
    if (!confirmPendingChanges()) {
      return
    }

    setSelectedDate((current) => addDays(current, days))
  }

  function selectDate(date: string) {
    if (!date || date === selectedDate || !confirmPendingChanges()) {
      return
    }

    setSelectedDate(date)
  }

  function selectSession(sessionId: string) {
    if (sessionId === selectedSessionId || !confirmPendingChanges()) {
      return
    }

    setSelectedSessionId(sessionId)
  }

  function updateStatus(studentId: string, status: AttendanceStatus) {
    setDrafts((current) => setAttendanceStatus(current, studentId, status))
  }

  function updateNotes(studentId: string, notes: string) {
    setDrafts((current) => setAttendanceNotes(current, studentId, notes))
  }

  function handleMarkUnrecordedPresent() {
    setDrafts((current) => markUnrecordedPresent(current))
  }

  async function handleSave() {
    try {
      await saveMutation.mutateAsync(saveRecords)
      setSavedSnapshot(createAttendanceSnapshot(drafts))
      notify({ title: 'Frequencia salva.', tone: 'success' })
    } catch (error) {
      notify({
        title: 'Nao foi possivel salvar a frequencia.',
        description: getUserSafeErrorMessage(error),
        tone: 'error',
      })
    }
  }

  return (
    <div className="space-y-5 pb-20 lg:pb-0">
      <PageHeader
        actions={
          <Button
            isLoading={sessionsQuery.isFetching || attendanceQuery.isFetching}
            leftIcon={<RefreshCw className="h-4 w-4" aria-hidden />}
            onClick={() => {
              void sessionsQuery.refetch()
              void attendanceQuery.refetch()
            }}
            variant="secondary"
          >
            Atualizar
          </Button>
        }
        description="Registre presencas por aula, com alunos esperados pela matricula valida do dia."
        title="Frequencia"
      />

      <section className="grid gap-4 rounded-md border border-border bg-surface p-4 shadow-subtle">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CalendarDays className="h-4 w-4" aria-hidden />
              Dia da chamada
            </p>
            <h2 className="mt-1 text-xl font-semibold text-foreground">
              {selectedDate === today ? `Hoje, ${formatDayMonth(selectedDate)}` : formatLongAgendaDate(selectedDate)}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <IconButton label="Dia anterior" onClick={() => moveDate(-1)}>
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </IconButton>
            <Button onClick={() => selectDate(today)} variant="secondary">
              Hoje
            </Button>
            <IconButton label="Proximo dia" onClick={() => moveDate(1)}>
              <ChevronRight className="h-4 w-4" aria-hidden />
            </IconButton>
            <label className="sr-only" htmlFor="attendance-date">
              Data da chamada
            </label>
            <input
              className="h-10 rounded border border-border bg-surface px-3 text-sm text-foreground shadow-subtle outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              id="attendance-date"
              onChange={(event) => selectDate(event.target.value)}
              type="date"
              value={selectedDate}
            />
          </div>
        </div>

        <dl className="grid gap-2 text-sm sm:grid-cols-3">
          <Metric label="Aulas do dia" value={String(sessions.length)} />
          <Metric label="Pendentes" value={String(sessions.filter((session) => session.attendance_state === 'pending').length)} />
          <Metric label="Registradas" value={String(sessions.filter((session) => session.attendance_state === 'recorded').length)} />
        </dl>
      </section>

      {sessionsQuery.isLoading && !sessionsQuery.data ? <AttendanceSkeleton /> : null}

      {sessionsQuery.isError ? (
        <ErrorState
          title="Nao foi possivel carregar as aulas do dia."
          description={getUserSafeErrorMessage(sessionsQuery.error)}
          onRetry={() => void sessionsQuery.refetch()}
        />
      ) : null}

      {!sessionsQuery.isLoading && !sessionsQuery.isError && sessions.length === 0 ? (
        <EmptyState
          title="Nenhuma aula neste dia."
          description="A frequencia aparece somente quando existe aula recorrente materializada para a data selecionada."
        />
      ) : null}

      {sessions.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(260px,360px)_1fr]">
          <aside className="grid content-start gap-3">
            <h2 className="text-sm font-semibold text-muted-foreground">Turmas com aula</h2>
            <div className="grid gap-2">
              {sessions.map((session) => (
                <SessionCard
                  isSelected={session.session_id === selectedSessionId}
                  key={session.session_id}
                  onSelect={() => selectSession(session.session_id)}
                  session={session}
                />
              ))}
            </div>
          </aside>

          <main className="min-w-0">
            {attendanceQuery.isLoading && selectedSessionId ? <AttendanceSkeleton /> : null}

            {attendanceQuery.isError ? (
              <ErrorState
                title="Nao foi possivel carregar a chamada."
                description={getUserSafeErrorMessage(attendanceQuery.error)}
                onRetry={() => void attendanceQuery.refetch()}
              />
            ) : null}

            {!attendanceQuery.isLoading && !attendanceQuery.isError && selectedSession ? (
              <section className="grid gap-4">
                <AttendanceSummaryPanel
                  hasUnsavedChanges={hasUnsavedChanges}
                  isCancelled={isCancelled}
                  latestRecordedAt={latestRecordedAt}
                  onMarkUnrecordedPresent={handleMarkUnrecordedPresent}
                  rowsCount={rows.length}
                  session={selectedSession}
                  summary={summary}
                />

                {rows.length === 0 ? (
                  <EmptyState
                    title="Nenhum aluno esperado."
                    description="As matriculas validas desta turma nao incluem alunos para a data da aula."
                  />
                ) : (
                  <div className="grid gap-3">
                    {rows.map((row) => (
                      <StudentAttendanceCard
                        draft={drafts[row.student_id]}
                        isDisabled={isCancelled}
                        key={row.student_id}
                        onNotesChange={(notes) => updateNotes(row.student_id, notes)}
                        onStatusChange={(status) => updateStatus(row.student_id, status)}
                        row={row}
                      />
                    ))}
                  </div>
                )}

                <SaveBar
                  canSave={canSave}
                  hasUnsavedChanges={hasUnsavedChanges}
                  isLoading={saveMutation.isPending}
                  onSave={() => void handleSave()}
                  summary={summary}
                />
              </section>
            ) : null}
          </main>
        </div>
      ) : null}
    </div>
  )
}

function SessionCard({
  isSelected,
  onSelect,
  session,
}: {
  isSelected: boolean
  onSelect: () => void
  session: AgendaSession
}) {
  const isCancelled = session.status === 'cancelled'

  return (
    <button
      className={cn(
        'grid gap-3 rounded-md border bg-surface p-4 text-left shadow-subtle transition',
        'hover:border-primary/50 hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/25',
        isSelected ? 'border-primary bg-primary/5' : 'border-border',
      )}
      onClick={onSelect}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-foreground">{session.class_name}</h3>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" aria-hidden />
            {formatTimeRange(session.start_time, session.end_time)}
          </p>
        </div>
        <Badge tone={sessionBadgeTone(session)}>{sessionBadgeLabel(session)}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <UsersRound className="h-4 w-4" aria-hidden />
          {session.expected_students} alunos
        </span>
        <span className="text-right">
          {isCancelled ? 'Sem chamada' : `${session.recorded_count}/${session.expected_students} registros`}
        </span>
      </div>
    </button>
  )
}

function AttendanceSummaryPanel({
  hasUnsavedChanges,
  isCancelled,
  latestRecordedAt,
  onMarkUnrecordedPresent,
  rowsCount,
  session,
  summary,
}: {
  hasUnsavedChanges: boolean
  isCancelled: boolean
  latestRecordedAt: string | null
  onMarkUnrecordedPresent: () => void
  rowsCount: number
  session: AgendaSession
  summary: ReturnType<typeof getAttendanceSummary>
}) {
  return (
    <section className="grid gap-4 rounded-md border border-border bg-surface p-4 shadow-subtle">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold text-foreground">{session.class_name}</h2>
            <Badge tone={sessionBadgeTone(session)}>{sessionBadgeLabel(session)}</Badge>
            {hasUnsavedChanges ? <Badge tone="warning">Alteracoes nao salvas</Badge> : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatLongAgendaDate(session.session_date)} - {formatTimeRange(session.start_time, session.end_time)}
          </p>
          {latestRecordedAt ? (
            <p className="mt-1 text-xs text-muted-foreground">Ultima atualizacao: {formatDateTime(latestRecordedAt)}</p>
          ) : null}
        </div>

        <Button
          disabled={isCancelled || rowsCount === 0 || summary.unrecorded === 0}
          leftIcon={<Check className="h-4 w-4" aria-hidden />}
          onClick={onMarkUnrecordedPresent}
          variant="secondary"
        >
          {summary.recorded > 0 ? 'Marcar nao registrados' : 'Marcar todos presentes'}
        </Button>
      </div>

      <dl className="grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Presentes" tone="success" value={String(summary.present)} />
        <Metric label="Faltas" tone="danger" value={String(summary.absent)} />
        <Metric label="Justificadas" tone="warning" value={String(summary.excused)} />
        <Metric label="Nao registrados" value={String(summary.unrecorded)} />
      </dl>
    </section>
  )
}

function StudentAttendanceCard({
  draft,
  isDisabled,
  onNotesChange,
  onStatusChange,
  row,
}: {
  draft?: AttendanceDrafts[string]
  isDisabled: boolean
  onNotesChange: (notes: string) => void
  onStatusChange: (status: AttendanceStatus) => void
  row: SessionAttendanceRow
}) {
  const selectedStatus = draft?.status ?? ''

  return (
    <article className="grid gap-3 rounded-md border border-border bg-surface p-4 shadow-subtle">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <StudentAvatar
            size="sm"
            student={{
              full_name: row.student_name,
              photo_path: row.student_photo_path,
              preferred_name: row.preferred_name,
            }}
          />
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-foreground">{row.student_name}</h3>
            <p className="truncate text-sm text-muted-foreground">
              {row.preferred_name ? `Nome preferido: ${row.preferred_name}` : 'Aluno esperado'}
            </p>
          </div>
        </div>
        <Badge tone={selectedStatus ? statusBadgeTone(selectedStatus) : 'neutral'}>
          {selectedStatus ? statusLabel(selectedStatus) : 'Sem registro'}
        </Badge>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {statusOptions.map((option) => (
          <button
            aria-pressed={selectedStatus === option.value}
            className={cn(
              'min-h-12 rounded border px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-primary/25',
              selectedStatus === option.value
                ? option.activeClassName
                : 'border-border bg-background text-foreground hover:bg-muted',
            )}
            disabled={isDisabled}
            key={option.value}
            onClick={() => onStatusChange(option.value)}
            title={option.description}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>

      <label className="grid gap-1.5 text-sm font-medium text-foreground">
        <span>Observacao</span>
        <input
          className="h-10 rounded border border-border bg-background px-3 text-sm shadow-subtle placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          disabled={isDisabled}
          onChange={(event) => onNotesChange(event.target.value)}
          placeholder="Opcional"
          value={draft?.notes ?? ''}
        />
      </label>
    </article>
  )
}

function SaveBar({
  canSave,
  hasUnsavedChanges,
  isLoading,
  onSave,
  summary,
}: {
  canSave: boolean
  hasUnsavedChanges: boolean
  isLoading: boolean
  onSave: () => void
  summary: ReturnType<typeof getAttendanceSummary>
}) {
  return (
    <footer className="sticky bottom-3 z-20 rounded-md border border-border bg-surface/95 p-3 shadow-elevated backdrop-blur lg:static lg:shadow-subtle">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {hasUnsavedChanges
            ? `${summary.recorded} registros prontos para salvar.`
            : 'Chamada sincronizada com os registros salvos.'}
        </p>
        <Button
          className="w-full sm:w-auto"
          disabled={!canSave}
          isLoading={isLoading}
          leftIcon={<Save className="h-4 w-4" aria-hidden />}
          onClick={onSave}
        >
          Salvar chamada
        </Button>
      </div>
    </footer>
  )
}

function Metric({
  label,
  tone = 'neutral',
  value,
}: {
  label: string
  tone?: 'danger' | 'neutral' | 'success' | 'warning'
  value: string
}) {
  const toneClassName = {
    danger: 'text-danger',
    neutral: 'text-foreground',
    success: 'text-success',
    warning: 'text-amber-700',
  }[tone]

  return (
    <div className="rounded border border-border bg-background p-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn('mt-1 text-2xl font-semibold', toneClassName)}>{value}</dd>
    </div>
  )
}

function AttendanceSkeleton() {
  return (
    <div className="grid gap-3">
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  )
}

function sortSessions(sessions: AgendaSession[]) {
  return sessions.slice().sort((first, second) => {
    return first.start_time.localeCompare(second.start_time) || first.class_name.localeCompare(second.class_name)
  })
}

function sessionBadgeLabel(session: AgendaSession) {
  if (session.status === 'cancelled') {
    return 'Cancelada'
  }

  if (session.attendance_state === 'recorded') {
    return 'Registrada'
  }

  if (session.attendance_state === 'no_students') {
    return 'Sem alunos'
  }

  return 'Pendente'
}

function sessionBadgeTone(session: AgendaSession) {
  if (session.status === 'cancelled') {
    return 'danger'
  }

  if (session.attendance_state === 'recorded') {
    return 'success'
  }

  if (session.attendance_state === 'no_students') {
    return 'neutral'
  }

  return 'warning'
}

function statusLabel(status: AttendanceStatus) {
  if (status === 'present') {
    return 'Presente'
  }

  if (status === 'absent') {
    return 'Falta'
  }

  return 'Justificada'
}

function statusBadgeTone(status: AttendanceStatus) {
  if (status === 'present') {
    return 'success'
  }

  if (status === 'absent') {
    return 'danger'
  }

  return 'warning'
}

function getLatestRecordedAt(rows: SessionAttendanceRow[]) {
  return rows.reduce<string | null>((latest, row) => {
    if (!row.recorded_at) {
      return latest
    }

    if (!latest || row.recorded_at > latest) {
      return row.recorded_at
    }

    return latest
  }, null)
}

function formatDayMonth(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Sao_Paulo',
  }).format(parseIsoDate(value))
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(value))
}
