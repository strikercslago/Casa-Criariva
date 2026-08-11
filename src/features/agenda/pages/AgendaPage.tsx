import { CalendarDays, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { getUserSafeErrorMessage } from '@/lib/errors/AppError'
import { EmptyState } from '@/shared/components/feedback/EmptyState'
import { ErrorState } from '@/shared/components/feedback/ErrorState'
import { PageHeader } from '@/shared/components/navigation/PageHeader'
import { Button } from '@/shared/components/ui/Button'
import { IconButton } from '@/shared/components/ui/IconButton'
import { TabButton, Tabs } from '@/shared/components/ui/Tabs'
import { AgendaSessionList } from '@/features/agenda/components/AgendaSessionList'
import { AttendanceDrawer } from '@/features/agenda/components/AttendanceDrawer'
import { useAgendaSessions } from '@/features/agenda/hooks/useAgenda'
import type { AgendaSession } from '@/features/agenda/types/agendaTypes'
import {
  addDays,
  formatAgendaRange,
  formatLongAgendaDate,
  getWeekRange,
  toIsoDate,
} from '@/features/agenda/utils/agendaDates'

type AgendaViewMode = 'day' | 'week'

export default function AgendaPage() {
  const today = useMemo(() => toIsoDate(new Date()), [])
  const [selectedDate, setSelectedDate] = useState(today)
  const [viewMode, setViewMode] = useState<AgendaViewMode>('day')
  const [selectedSession, setSelectedSession] = useState<AgendaSession | null>(null)
  const range = viewMode === 'day' ? { endDate: selectedDate, startDate: selectedDate } : getWeekRange(selectedDate)
  const sessionsQuery = useAgendaSessions(range)
  const sessions = sessionsQuery.data ?? []
  const pendingCount = sessions.filter((session) => session.attendance_state === 'pending').length
  const recordedCount = sessions.filter((session) => session.attendance_state === 'recorded').length

  function moveDate(direction: -1 | 1) {
    setSelectedDate((current) => addDays(current, viewMode === 'day' ? direction : direction * 7))
  }

  return (
    <div className="space-y-5">
      <PageHeader
        actions={
          <Button
            isLoading={sessionsQuery.isFetching}
            leftIcon={<RefreshCw className="h-4 w-4" aria-hidden />}
            onClick={() => void sessionsQuery.refetch()}
            variant="secondary"
          >
            Atualizar
          </Button>
        }
        description="Veja aulas do dia ou da semana, abra a chamada e salve presencas em lote."
        title="Agenda"
      />

      <section className="grid gap-3 rounded-md border border-border bg-surface p-4 shadow-subtle">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CalendarDays className="h-4 w-4" aria-hidden />
              {viewMode === 'day' ? 'Hoje e navegacao diaria' : 'Semana operacional'}
            </p>
            <h2 className="mt-1 text-xl font-semibold text-foreground">
              {viewMode === 'day' ? formatLongAgendaDate(selectedDate) : formatAgendaRange(range.startDate, range.endDate)}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <IconButton label="Periodo anterior" onClick={() => moveDate(-1)}>
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </IconButton>
            <Button onClick={() => setSelectedDate(today)} variant="secondary">
              Hoje
            </Button>
            <IconButton label="Proximo periodo" onClick={() => moveDate(1)}>
              <ChevronRight className="h-4 w-4" aria-hidden />
            </IconButton>
            <Tabs>
              <TabButton isActive={viewMode === 'day'} onClick={() => setViewMode('day')}>
                Dia
              </TabButton>
              <TabButton isActive={viewMode === 'week'} onClick={() => setViewMode('week')}>
                Semana
              </TabButton>
            </Tabs>
          </div>
        </div>

        <dl className="grid gap-2 text-sm sm:grid-cols-3">
          <SummaryItem label="Aulas" value={String(sessions.length)} />
          <SummaryItem label="Pendentes" value={String(pendingCount)} />
          <SummaryItem label="Registradas" value={String(recordedCount)} />
        </dl>
      </section>

      {sessionsQuery.isLoading && !sessionsQuery.data ? <AgendaSkeleton /> : null}

      {sessionsQuery.isError ? (
        <ErrorState
          title="Nao foi possivel carregar a agenda."
          description={getUserSafeErrorMessage(sessionsQuery.error)}
          onRetry={() => void sessionsQuery.refetch()}
        />
      ) : null}

      {!sessionsQuery.isLoading && !sessionsQuery.isError && sessions.length === 0 ? (
        <EmptyState
          title="Nenhuma aula neste periodo."
          description="A agenda materializa apenas aulas recorrentes dentro da janela consultada."
        />
      ) : null}

      {!sessionsQuery.isError && sessions.length > 0 ? (
        <AgendaSessionList
          onOpenSession={(sessionId) => {
            setSelectedSession(sessions.find((session) => session.session_id === sessionId) ?? null)
          }}
          sessions={groupSessionsForView(sessions)}
          showDates={viewMode === 'week'}
        />
      ) : null}

      <AttendanceDrawer
        onClose={() => setSelectedSession(null)}
        sessionId={selectedSession?.session_id ?? null}
        sessionSummary={selectedSession}
      />
    </div>
  )
}

function groupSessionsForView(sessions: AgendaSession[]) {
  return sessions.slice().sort((first, second) => {
    const dateOrder = first.session_date.localeCompare(second.session_date)
    if (dateOrder !== 0) {
      return dateOrder
    }

    return first.start_time.localeCompare(second.start_time) || first.class_name.localeCompare(second.class_name)
  })
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border bg-background p-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold text-foreground">{value}</dd>
    </div>
  )
}

function AgendaSkeleton() {
  return (
    <div className="grid gap-3">
      {Array.from({ length: 4 }, (_, index) => (
        <div className="h-24 rounded-md border border-border bg-surface shadow-subtle" key={index} />
      ))}
    </div>
  )
}
