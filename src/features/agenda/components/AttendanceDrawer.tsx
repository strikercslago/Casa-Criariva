import { Check, RotateCcw, XCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { getUserSafeErrorMessage } from '@/lib/errors/AppError'
import { ErrorState } from '@/shared/components/feedback/ErrorState'
import { useToast } from '@/shared/components/feedback/Toast'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Textarea } from '@/shared/components/ui/FormControls'
import { Overlay } from '@/shared/components/ui/Overlay'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import {
  useSaveSessionAttendance,
  useSessionAttendance,
  useUpdateSessionStatus,
} from '@/features/agenda/hooks/useAgenda'
import type {
  AgendaSession,
  AttendanceDraftRecord,
  AttendanceSaveRecord,
  AttendanceStatus,
  SessionAttendanceRow,
} from '@/features/agenda/types/agendaTypes'
import { attendanceStatusLabels, calculateAttendanceRate } from '@/features/agenda/utils/agendaFormat'
import { formatLongAgendaDate, formatTimeRange } from '@/features/agenda/utils/agendaDates'
import { StudentAvatar } from '@/features/students/components/StudentAvatar'

type AttendanceDrawerProps = {
  onClose: () => void
  sessionSummary: AgendaSession | null
  sessionId: string | null
}

const statusOptions: Array<{ label: string; value: AttendanceStatus }> = [
  { label: 'Presente', value: 'present' },
  { label: 'Faltou', value: 'absent' },
  { label: 'Justificada', value: 'excused' },
]

export function AttendanceDrawer({ onClose, sessionId, sessionSummary }: AttendanceDrawerProps) {
  const attendanceQuery = useSessionAttendance(sessionId)
  const saveMutation = useSaveSessionAttendance(sessionId ?? '')
  const statusMutation = useUpdateSessionStatus(sessionId ?? '')
  const { notify } = useToast()
  const rows = useMemo(() => attendanceQuery.data ?? [], [attendanceQuery.data])
  const session = rows[0] ?? toSessionFallback(sessionSummary)
  const [drafts, setDrafts] = useState<Record<string, AttendanceDraftRecord>>({})
  const attendanceRate = calculateAttendanceRate(rows)
  const missingCount = Object.values(drafts).filter((draft) => !draft.status).length
  const canSave = rows.length > 0 && missingCount === 0 && session?.session_status !== 'cancelled'

  useEffect(() => {
    setDrafts(
      Object.fromEntries(
        rows.map((row) => [
          row.student_id,
          {
            notes: row.attendance_notes ?? '',
            status: row.attendance_status ?? '',
            studentId: row.student_id,
          },
        ]),
      ),
    )
  }, [rows])

  function updateDraft(studentId: string, patch: Partial<AttendanceDraftRecord>) {
    setDrafts((current) => ({
      ...current,
      [studentId]: { ...current[studentId], ...patch },
    }))
  }

  function markAllPresent() {
    setDrafts((current) =>
      Object.fromEntries(
        Object.entries(current).map(([studentId, draft]) => [studentId, { ...draft, status: 'present' }]),
      ),
    )
  }

  async function handleSave() {
    const records: AttendanceSaveRecord[] = Object.values(drafts)
      .filter((draft): draft is AttendanceDraftRecord & { status: AttendanceStatus } => Boolean(draft.status))
      .map((draft) => ({
        notes: draft.notes.trim() || null,
        status: draft.status,
        student_id: draft.studentId,
      }))

    try {
      await saveMutation.mutateAsync(records)
      notify({ title: 'Frequencia salva.', tone: 'success' })
    } catch (error) {
      notify({
        title: 'Nao foi possivel salvar a frequencia.',
        description: getUserSafeErrorMessage(error),
        tone: 'error',
      })
    }
  }

  async function changeSessionStatus(status: 'cancelled' | 'planned') {
    try {
      await statusMutation.mutateAsync({ notes: session?.session_notes ?? null, status })
      notify({ title: status === 'cancelled' ? 'Aula cancelada.' : 'Aula restaurada.', tone: 'success' })
    } catch (error) {
      notify({
        title: 'Nao foi possivel atualizar a aula.',
        description: getUserSafeErrorMessage(error),
        tone: 'error',
      })
    }
  }

  return (
    <Overlay isOpen={Boolean(sessionId)} onClose={onClose} side="wide" title="Frequencia da aula">
      {attendanceQuery.isLoading ? (
        <div className="grid gap-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      ) : null}

      {attendanceQuery.isError ? (
        <ErrorState
          title="Nao foi possivel carregar a frequencia."
          description={getUserSafeErrorMessage(attendanceQuery.error)}
          onRetry={() => void attendanceQuery.refetch()}
        />
      ) : null}

      {session ? (
        <div className="grid gap-5">
          <SessionHeader
            attendanceRate={attendanceRate}
            missingCount={missingCount}
            onCancel={() => void changeSessionStatus('cancelled')}
            onMarkAllPresent={markAllPresent}
            onRestore={() => void changeSessionStatus('planned')}
            session={session}
            statusLoading={statusMutation.isPending}
            totalExpected={rows.length}
          />

          {rows.length === 0 ? (
            <div className="rounded-md border border-dashed border-border bg-background p-6 text-sm">
              <h3 className="font-semibold text-foreground">Nenhum aluno esperado</h3>
              <p className="mt-1 text-muted-foreground">
                As matriculas validas para a data desta aula nao incluem alunos.
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {rows.map((row) => (
                <StudentAttendanceRow
                  draft={drafts[row.student_id]}
                  isDisabled={session.session_status === 'cancelled'}
                  key={row.student_id}
                  onUpdate={(patch) => updateDraft(row.student_id, patch)}
                  row={row}
                />
              ))}
            </div>
          )}

          <footer className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
            <Button onClick={onClose} variant="secondary">
              Fechar
            </Button>
            <Button disabled={!canSave} isLoading={saveMutation.isPending} onClick={() => void handleSave()}>
              Salvar frequencia
            </Button>
          </footer>
        </div>
      ) : null}
    </Overlay>
  )
}

function toSessionFallback(session: AgendaSession | null): SessionAttendanceRow | null {
  if (!session) {
    return null
  }

  return {
    attendance_id: null,
    attendance_notes: null,
    attendance_status: null,
    class_id: session.class_id,
    class_name: session.class_name,
    enrollment_id: '',
    end_time: session.end_time,
    preferred_name: null,
    recorded_at: null,
    recorded_by: null,
    session_date: session.session_date,
    session_id: session.session_id,
    session_notes: session.notes,
    session_status: session.status,
    start_time: session.start_time,
    student_photo_path: null,
    student_id: '',
    student_name: '',
  }
}

function SessionHeader({
  attendanceRate,
  missingCount,
  onCancel,
  onMarkAllPresent,
  onRestore,
  session,
  statusLoading,
  totalExpected,
}: {
  attendanceRate: number | null
  missingCount: number
  onCancel: () => void
  onMarkAllPresent: () => void
  onRestore: () => void
  session: SessionAttendanceRow
  statusLoading: boolean
  totalExpected: number
}) {
  const isCancelled = session.session_status === 'cancelled'

  return (
    <header className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold text-foreground">{session.class_name}</h2>
            <Badge tone={isCancelled ? 'danger' : session.session_status === 'completed' ? 'success' : 'warning'}>
              {isCancelled ? 'Cancelada' : session.session_status === 'completed' ? 'Concluida' : 'Planejada'}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatLongAgendaDate(session.session_date)} - {formatTimeRange(session.start_time, session.end_time)}
          </p>
        </div>
      </div>

      <dl className="grid gap-2 rounded-md border border-border bg-background p-3 text-sm sm:grid-cols-3">
        <SummaryItem label="Alunos esperados" value={String(totalExpected)} />
        <SummaryItem label="Pendentes" value={String(missingCount)} />
        <SummaryItem label="Taxa de presenca" value={attendanceRate === null ? 'Nao registrada' : `${attendanceRate}%`} />
      </dl>

      <div className="grid gap-2 sm:grid-cols-3">
        <Button
          disabled={isCancelled}
          leftIcon={<Check className="h-4 w-4" aria-hidden />}
          onClick={onMarkAllPresent}
          variant="secondary"
        >
          Todos presentes
        </Button>
        {isCancelled ? (
          <Button
            isLoading={statusLoading}
            leftIcon={<RotateCcw className="h-4 w-4" aria-hidden />}
            onClick={onRestore}
            variant="secondary"
          >
            Restaurar aula
          </Button>
        ) : (
          <Button
            isLoading={statusLoading}
            leftIcon={<XCircle className="h-4 w-4" aria-hidden />}
            onClick={onCancel}
            variant="danger"
          >
            Cancelar aula
          </Button>
        )}
      </div>
    </header>
  )
}

function StudentAttendanceRow({
  draft,
  isDisabled,
  onUpdate,
  row,
}: {
  draft?: AttendanceDraftRecord
  isDisabled: boolean
  onUpdate: (patch: Partial<AttendanceDraftRecord>) => void
  row: SessionAttendanceRow
}) {
  const selectedStatus = draft?.status ?? ''

  return (
    <article className="grid gap-3 rounded-md border border-border bg-background p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
            <h3 className="font-semibold text-foreground">{row.student_name}</h3>
            <p className="text-sm text-muted-foreground">{row.preferred_name ? `Nome preferido: ${row.preferred_name}` : 'Sem nome preferido'}</p>
          </div>
        </div>
        {row.attendance_status ? <Badge tone="neutral">{attendanceStatusLabels[row.attendance_status]}</Badge> : <Badge tone="warning">Pendente</Badge>}
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {statusOptions.map((option) => (
          <button
            className={
              selectedStatus === option.value
                ? 'h-10 rounded border border-primary bg-primary/10 px-3 text-sm font-semibold text-primary'
                : 'h-10 rounded border border-border bg-surface px-3 text-sm font-medium text-foreground hover:bg-muted'
            }
            disabled={isDisabled}
            key={option.value}
            onClick={() => onUpdate({ status: option.value })}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>

      <Textarea
        disabled={isDisabled}
        label="Observacao"
        onChange={(event) => onUpdate({ notes: event.target.value })}
        placeholder="Opcional"
        value={draft?.notes ?? ''}
      />
    </article>
  )
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-semibold text-foreground">{value}</dd>
    </div>
  )
}
