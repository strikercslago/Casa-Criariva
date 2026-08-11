import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import type { EventListRow } from '@/features/events/types/eventsTypes'
import {
  formatDateRange,
  formatMoney,
  getEventStatusLabel,
  getEventStatusTone,
  getEventTypeLabel,
} from '@/features/events/utils/eventsFormat'

type EventsListProps = {
  events: EventListRow[]
  onSelect: (event: EventListRow) => void
  selectedEventId: string | null
}

export function EventsList({ events, onSelect, selectedEventId }: EventsListProps) {
  return (
    <div className="grid gap-3">
      <div className="hidden rounded-md border border-border bg-surface shadow-subtle xl:block">
        <div className="grid grid-cols-[minmax(240px,1.4fr)_120px_130px_150px_130px_130px_110px] gap-3 border-b border-border px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">
          <span>Evento</span>
          <span>Tipo</span>
          <span>Status</span>
          <span>Periodo</span>
          <span>Vagas</span>
          <span>Recebido</span>
          <span className="text-right">Acoes</span>
        </div>
        {events.map((event) => (
          <article
            className={`grid grid-cols-[minmax(240px,1.4fr)_120px_130px_150px_130px_130px_110px] items-center gap-3 border-b border-border px-4 py-3 last:border-b-0 ${selectedEventId === event.event_id ? 'bg-primary/5' : ''}`}
            key={event.event_id}
          >
            <div className="min-w-0">
              <h2 className="truncate font-semibold text-foreground">{event.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {event.session_count} sessoes - {formatMoney(event.base_price)}
              </p>
            </div>
            <span className="text-sm text-muted-foreground">{getEventTypeLabel(event.event_type)}</span>
            <Badge tone={getEventStatusTone(event.status)}>{getEventStatusLabel(event.status)}</Badge>
            <span className="text-sm text-foreground">{formatDateRange(event.first_session_date, event.last_session_date)}</span>
            <span className="text-sm text-foreground">
              {event.confirmed_count}/{event.capacity ?? '-'} {event.available_spots >= 0 ? `(${event.available_spots})` : ''}
            </span>
            <span className="text-sm font-semibold text-success">{formatMoney(event.received_amount)}</span>
            <div className="flex justify-end">
              <Button onClick={() => onSelect(event)} size="sm" variant={selectedEventId === event.event_id ? 'primary' : 'secondary'}>
                Abrir
              </Button>
            </div>
          </article>
        ))}
      </div>

      <div className="grid gap-3 xl:hidden">
        {events.map((event) => (
          <article className="rounded-md border border-border bg-surface p-4 shadow-subtle" key={event.event_id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate font-semibold text-foreground">{event.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{formatDateRange(event.first_session_date, event.last_session_date)}</p>
              </div>
              <Badge tone={getEventStatusTone(event.status)}>{getEventStatusLabel(event.status)}</Badge>
            </div>
            <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
              <Summary label="Tipo" value={getEventTypeLabel(event.event_type)} />
              <Summary label="Vagas" value={`${event.confirmed_count}/${event.capacity ?? '-'}`} />
              <Summary label="Recebido" value={formatMoney(event.received_amount)} />
            </dl>
            <Button className="mt-4 w-full" onClick={() => onSelect(event)} variant={selectedEventId === event.event_id ? 'primary' : 'secondary'}>
              Abrir evento
            </Button>
          </article>
        ))}
      </div>
    </div>
  )
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border bg-background p-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 truncate font-semibold text-foreground">{value}</dd>
    </div>
  )
}
