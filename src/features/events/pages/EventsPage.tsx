import { CalendarClock, Plus, RefreshCw, UserPlus } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { getUserSafeErrorMessage } from '@/lib/errors/AppError'
import { EmptyState } from '@/shared/components/feedback/EmptyState'
import { ErrorState } from '@/shared/components/feedback/ErrorState'
import { useToast } from '@/shared/components/feedback/Toast'
import { PageHeader } from '@/shared/components/navigation/PageHeader'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Select } from '@/shared/components/ui/FormControls'
import { Pagination } from '@/shared/components/ui/Pagination'
import { SearchInput } from '@/shared/components/ui/SearchInput'
import { EventFormDrawer } from '@/features/events/components/EventFormDrawer'
import { EventPaymentDrawer } from '@/features/events/components/EventPaymentDrawer'
import { EventRegistrationList } from '@/features/events/components/EventRegistrationList'
import { EventsList } from '@/features/events/components/EventsList'
import { RegistrationDrawer } from '@/features/events/components/RegistrationDrawer'
import {
  useCancelEventRegistration,
  useConfirmEventRegistration,
  useEvent,
  useEventCashAccounts,
  useEventFinanceSummary,
  useEventRegistrations,
  useEvents,
  useEventSessions,
  useUpdateEventStatus,
} from '@/features/events/hooks/useEvents'
import type {
  EventListRow,
  EventRegistrationRow,
  EventRegistrationStatus,
  EventStatus,
  EventType,
} from '@/features/events/types/eventsTypes'
import {
  eventStatusOptions,
  eventTypeOptions,
  formatDate,
  formatMoney,
  formatTime,
  getEventStatusLabel,
  getEventStatusTone,
  getEventTypeLabel,
  registrationStatusOptions,
} from '@/features/events/utils/eventsFormat'
import { useDebouncedValue } from '@/features/students/hooks/useDebouncedValue'

const PAGE_SIZE = 10
const REGISTRATION_PAGE_SIZE = 10

export default function EventsPage() {
  const [eventPage, setEventPage] = useState(1)
  const [registrationPage, setRegistrationPage] = useState(1)
  const [eventStatus, setEventStatus] = useState<EventStatus | 'all'>('all')
  const [eventType, setEventType] = useState<EventType | 'all'>('all')
  const [registrationStatus, setRegistrationStatus] = useState<EventRegistrationStatus | 'all'>('all')
  const [financeFilter, setFinanceFilter] = useState<'all' | 'paid' | 'partial' | 'pending' | 'free' | 'financial_pending'>('all')
  const [eventSearch, setEventSearch] = useState('')
  const [registrationSearch, setRegistrationSearch] = useState('')
  const [selectedEvent, setSelectedEvent] = useState<EventListRow | null>(null)
  const [isEventDrawerOpen, setIsEventDrawerOpen] = useState(false)
  const [isRegistrationDrawerOpen, setIsRegistrationDrawerOpen] = useState(false)
  const [paymentRegistration, setPaymentRegistration] = useState<EventRegistrationRow | null>(null)
  const debouncedEventSearch = useDebouncedValue(eventSearch, 320)
  const debouncedRegistrationSearch = useDebouncedValue(registrationSearch, 320)
  const { notify } = useToast()

  const eventsFilters = useMemo(
    () => ({
      page: eventPage,
      pageSize: PAGE_SIZE,
      search: debouncedEventSearch,
      status: eventStatus,
      type: eventType,
    }),
    [debouncedEventSearch, eventPage, eventStatus, eventType],
  )
  const eventsQuery = useEvents(eventsFilters)
  const selectedEventId = selectedEvent?.event_id ?? null
  const eventQuery = useEvent(selectedEventId)
  const sessionsQuery = useEventSessions(selectedEventId)
  const financeSummaryQuery = useEventFinanceSummary(selectedEventId)
  const accountsQuery = useEventCashAccounts()
  const registrationsFilters = useMemo(
    () =>
      selectedEventId
        ? {
            eventId: selectedEventId,
            finance: financeFilter,
            page: registrationPage,
            pageSize: REGISTRATION_PAGE_SIZE,
            search: debouncedRegistrationSearch,
            status: registrationStatus,
          }
        : null,
    [debouncedRegistrationSearch, financeFilter, registrationPage, registrationStatus, selectedEventId],
  )
  const registrationsQuery = useEventRegistrations(registrationsFilters)
  const updateStatusMutation = useUpdateEventStatus()
  const confirmMutation = useConfirmEventRegistration(selectedEventId ?? '')
  const cancelMutation = useCancelEventRegistration(selectedEventId ?? '')
  const sessions = sessionsQuery.data ?? []
  const summary = financeSummaryQuery.data
  const accounts = accountsQuery.data ?? []

  useEffect(() => {
    if (selectedEvent) return
    const firstEvent = eventsQuery.data?.rows[0]
    if (firstEvent) setSelectedEvent(firstEvent)
  }, [eventsQuery.data?.rows, selectedEvent])

  useEffect(() => {
    if (!selectedEvent) return
    const updatedEvent = eventsQuery.data?.rows.find((event) => event.event_id === selectedEvent.event_id)
    if (updatedEvent && updatedEvent !== selectedEvent) {
      setSelectedEvent(updatedEvent)
    }
  }, [eventsQuery.data?.rows, selectedEvent])

  useEffect(() => {
    setRegistrationPage(1)
  }, [debouncedRegistrationSearch, financeFilter, registrationStatus, selectedEventId])

  function selectEvent(event: EventListRow) {
    setSelectedEvent(event)
    setRegistrationPage(1)
  }

  async function changeEventStatus(status: EventStatus) {
    if (!selectedEventId) return
    const reason = status === 'cancelled' ? window.prompt('Motivo do cancelamento do evento') : undefined
    if (status === 'cancelled' && !reason?.trim()) return

    try {
      await updateStatusMutation.mutateAsync({ eventId: selectedEventId, reason: reason ?? undefined, status })
      notify({ title: 'Status do evento atualizado.', tone: 'success' })
      await eventsQuery.refetch()
      setSelectedEvent((current) => (current ? { ...current, status } : current))
    } catch (error) {
      notify({ title: 'Nao foi possivel atualizar o evento.', description: getUserSafeErrorMessage(error), tone: 'error' })
    }
  }

  async function confirmRegistration(registration: EventRegistrationRow) {
    try {
      await confirmMutation.mutateAsync(registration.registration_id)
      notify({ title: 'Inscricao confirmada.', tone: 'success' })
    } catch (error) {
      notify({ title: 'Nao foi possivel confirmar.', description: getUserSafeErrorMessage(error), tone: 'error' })
    }
  }

  async function cancelRegistration(registration: EventRegistrationRow) {
    const reason = window.prompt('Motivo do cancelamento da inscricao')
    if (!reason?.trim()) return

    try {
      await cancelMutation.mutateAsync({ reason, registrationId: registration.registration_id })
      notify({ title: 'Inscricao cancelada.', tone: 'success' })
    } catch (error) {
      notify({ title: 'Nao foi possivel cancelar.', description: getUserSafeErrorMessage(error), tone: 'error' })
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            <Button leftIcon={<Plus className="h-4 w-4" aria-hidden />} onClick={() => setIsEventDrawerOpen(true)}>
              Novo evento
            </Button>
            <Button
              isLoading={eventsQuery.isFetching || registrationsQuery.isFetching || financeSummaryQuery.isFetching}
              leftIcon={<RefreshCw className="h-4 w-4" aria-hidden />}
              onClick={() => {
                void eventsQuery.refetch()
                void registrationsQuery.refetch()
                void financeSummaryQuery.refetch()
                void sessionsQuery.refetch()
              }}
              variant="secondary"
            >
              Atualizar
            </Button>
          </div>
        }
        description="Eventos, oficinas e colonias com vagas, inscricoes e recebimentos conectados ao financeiro."
        title="Eventos"
      />

      <section className="grid gap-3 rounded-md border border-border bg-surface p-4 shadow-subtle">
        <div className="grid gap-2 lg:grid-cols-[minmax(220px,1fr)_170px_170px]">
          <SearchInput label="Buscar eventos" onChange={(event) => setEventSearch(event.target.value)} placeholder="Buscar evento" value={eventSearch} />
          <Select label="Status" onChange={(event) => setEventStatus(event.target.value as EventStatus | 'all')} value={eventStatus}>
            {eventStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select label="Tipo" onChange={(event) => setEventType(event.target.value as EventType | 'all')} value={eventType}>
            {eventTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </section>

      <MainPanel
        error={eventsQuery.error}
        isError={eventsQuery.isError}
        isLoading={eventsQuery.isLoading && !eventsQuery.data}
        onRetry={() => void eventsQuery.refetch()}
        title="Nao foi possivel carregar eventos."
      >
        {eventsQuery.data?.rows.length ? (
          <>
            <EventsList events={eventsQuery.data.rows} onSelect={selectEvent} selectedEventId={selectedEventId} />
            <PagedFooter page={eventPage} setPage={setEventPage} totalCount={eventsQuery.data.totalCount} totalPages={eventsQuery.data.totalPages} unit="evento" />
          </>
        ) : (
          <EmptyState
            action={<Button leftIcon={<Plus className="h-4 w-4" aria-hidden />} onClick={() => setIsEventDrawerOpen(true)}>Novo evento</Button>}
            description="Crie uma colonia, oficina ou atividade especial para abrir inscricoes."
            title="Nenhum evento encontrado."
          />
        )}
      </MainPanel>

      {selectedEvent ? (
        <section className="grid gap-4 rounded-md border border-border bg-surface p-4 shadow-subtle">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-xl font-semibold text-foreground">{selectedEvent.name}</h2>
                <Badge tone={getEventStatusTone(eventQuery.data?.status ?? selectedEvent.status)}>
                  {getEventStatusLabel(eventQuery.data?.status ?? selectedEvent.status)}
                </Badge>
                <Badge>{getEventTypeLabel(selectedEvent.event_type)}</Badge>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{eventQuery.data?.description || 'Sem descricao.'}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button leftIcon={<UserPlus className="h-4 w-4" aria-hidden />} onClick={() => setIsRegistrationDrawerOpen(true)} variant="secondary">
                Nova inscricao
              </Button>
              <Select label="Alterar status" onChange={(event) => void changeEventStatus(event.target.value as EventStatus)} value={eventQuery.data?.status ?? selectedEvent.status}>
                <option value="draft">Rascunho</option>
                <option value="open">Aberto</option>
                <option value="closed">Fechado</option>
                <option value="completed">Concluido</option>
                <option value="cancelled">Cancelado</option>
              </Select>
            </div>
          </div>

          <dl className="grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-5">
            <SummaryItem label="Receita prevista" value={formatMoney(summary?.expected_revenue)} />
            <SummaryItem label="Recebido" tone="success" value={formatMoney(summary?.received_amount)} />
            <SummaryItem label="A receber" value={formatMoney(summary?.receivable_amount)} />
            <SummaryItem label="Pagas" value={String(summary?.paid_count ?? 0)} />
            <SummaryItem label="Pendentes" tone={(summary?.pending_count ?? 0) > 0 ? 'warning' : undefined} value={String(summary?.pending_count ?? 0)} />
          </dl>

          <section className="grid gap-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <CalendarClock className="h-4 w-4" aria-hidden />
              Sessoes
            </h3>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {sessions.map((session) => (
                <div className="rounded border border-border bg-background p-3 text-sm" key={session.id}>
                  <p className="font-semibold text-foreground">{formatDate(session.session_date)}</p>
                  <p className="mt-1 text-muted-foreground">
                    {formatTime(session.start_time)}-{formatTime(session.end_time)}
                  </p>
                  <p className="mt-2 text-muted-foreground">
                    Vagas: {session.capacity_override ?? selectedEvent.capacity ?? '-'} - Valor: {session.price_override === null ? formatMoney(selectedEvent.base_price) : formatMoney(session.price_override)}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_180px_180px]">
            <SearchInput label="Buscar inscricoes" onChange={(event) => setRegistrationSearch(event.target.value)} placeholder="Buscar inscricao" value={registrationSearch} />
            <Select label="Status" onChange={(event) => setRegistrationStatus(event.target.value as EventRegistrationStatus | 'all')} value={registrationStatus}>
              {registrationStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Select label="Financeiro" onChange={(event) => setFinanceFilter(event.target.value as typeof financeFilter)} value={financeFilter}>
              <option value="all">Todos</option>
              <option value="paid">Pagos</option>
              <option value="partial">Parciais</option>
              <option value="pending">Pendentes</option>
              <option value="free">Gratuitos</option>
              <option value="financial_pending">Com saldo</option>
            </Select>
          </div>

          <MainPanel
            error={registrationsQuery.error}
            isError={registrationsQuery.isError}
            isLoading={registrationsQuery.isLoading && !registrationsQuery.data}
            onRetry={() => void registrationsQuery.refetch()}
            title="Nao foi possivel carregar inscricoes."
          >
            {registrationsQuery.data?.rows.length ? (
              <>
                <EventRegistrationList
                  onCancel={(registration) => void cancelRegistration(registration)}
                  onConfirm={(registration) => void confirmRegistration(registration)}
                  onPay={setPaymentRegistration}
                  registrations={registrationsQuery.data.rows}
                />
                <PagedFooter
                  page={registrationPage}
                  setPage={setRegistrationPage}
                  totalCount={registrationsQuery.data.totalCount}
                  totalPages={registrationsQuery.data.totalPages}
                  unit="inscricao"
                />
              </>
            ) : (
              <EmptyState
                action={<Button leftIcon={<UserPlus className="h-4 w-4" aria-hidden />} onClick={() => setIsRegistrationDrawerOpen(true)}>Nova inscricao</Button>}
                description="Nenhuma inscricao encontrada para os filtros atuais."
                title="Sem inscricoes."
              />
            )}
          </MainPanel>
        </section>
      ) : null}

      <EventFormDrawer isOpen={isEventDrawerOpen} onClose={() => setIsEventDrawerOpen(false)} />
      <RegistrationDrawer event={selectedEvent} isOpen={isRegistrationDrawerOpen} onClose={() => setIsRegistrationDrawerOpen(false)} sessions={sessions} />
      <EventPaymentDrawer accounts={accounts} eventId={selectedEventId ?? ''} onClose={() => setPaymentRegistration(null)} registration={paymentRegistration} />
    </div>
  )
}

function SummaryItem({
  label,
  tone,
  value,
}: {
  label: string
  tone?: 'success' | 'warning'
  value: string
}) {
  const toneClass =
    tone === 'success'
      ? 'border-success/30 bg-success/5 text-success'
      : tone === 'warning'
        ? 'border-warning/30 bg-warning/10 text-amber-700'
        : 'border-border bg-background text-foreground'

  return (
    <div className={`rounded border p-3 ${toneClass}`}>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold">{value}</dd>
    </div>
  )
}

function MainPanel({
  children,
  error,
  isError,
  isLoading,
  onRetry,
  title,
}: {
  children: ReactNode
  error: unknown
  isError: boolean
  isLoading: boolean
  onRetry: () => void
  title: string
}) {
  if (isLoading) {
    return <div className="h-72 rounded-md border border-border bg-surface shadow-subtle" />
  }

  if (isError) {
    return <ErrorState description={getUserSafeErrorMessage(error)} onRetry={onRetry} title={title} />
  }

  return <>{children}</>
}

function PagedFooter({
  page,
  setPage,
  totalCount,
  totalPages,
  unit,
}: {
  page: number
  setPage: (page: number) => void
  totalCount: number
  totalPages: number
  unit: string
}) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-surface p-3 shadow-subtle sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Pagina {page} de {totalPages}, {totalCount} {unit}
        {totalCount === 1 ? '' : 's'}.
      </p>
      <Pagination
        onNext={() => setPage(Math.min(totalPages, page + 1))}
        onPrevious={() => setPage(Math.max(1, page - 1))}
        page={page}
        totalPages={totalPages}
      />
    </div>
  )
}
