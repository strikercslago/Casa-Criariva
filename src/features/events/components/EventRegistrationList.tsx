import { CheckCircle, MessageCircle, Receipt, XCircle } from 'lucide-react'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import type { EventRegistrationRow } from '@/features/events/types/eventsTypes'
import {
  formatDate,
  formatMoney,
  formatTime,
  getFinanceStatusLabel,
  getFinanceStatusTone,
  getRegistrationStatusLabel,
  getRegistrationStatusTone,
} from '@/features/events/utils/eventsFormat'
import { normalizePhoneForWhatsApp } from '@/features/guardians/utils/guardianFormat'

type EventRegistrationListProps = {
  onCancel: (registration: EventRegistrationRow) => void
  onConfirm: (registration: EventRegistrationRow) => void
  onPay: (registration: EventRegistrationRow) => void
  registrations: EventRegistrationRow[]
}

export function EventRegistrationList({ onCancel, onConfirm, onPay, registrations }: EventRegistrationListProps) {
  return (
    <div className="grid gap-3">
      <div className="hidden rounded-md border border-border bg-surface shadow-subtle xl:block">
        <div className="grid grid-cols-[minmax(220px,1.2fr)_180px_130px_130px_130px_210px] gap-3 border-b border-border px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">
          <span>Participante</span>
          <span>Responsavel</span>
          <span>Status</span>
          <span>Financeiro</span>
          <span>Valor</span>
          <span className="text-right">Acoes</span>
        </div>
        {registrations.map((registration) => (
          <article
            className="grid grid-cols-[minmax(220px,1.2fr)_180px_130px_130px_130px_210px] items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
            key={registration.registration_id}
          >
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-foreground">{registration.participant_name}</h3>
              <p className="mt-1 truncate text-sm text-muted-foreground">{getSessionsLabel(registration.selected_sessions)}</p>
            </div>
            <div className="min-w-0 text-sm text-muted-foreground">
              <p className="truncate">{registration.guardian_name ?? '-'}</p>
              <p className="truncate">{registration.guardian_phone ?? registration.guardian_email ?? ''}</p>
            </div>
            <Badge tone={getRegistrationStatusTone(registration.status)}>{getRegistrationStatusLabel(registration.status)}</Badge>
            <Badge tone={getFinanceStatusTone(registration.finance_status)}>{getFinanceStatusLabel(registration.finance_status)}</Badge>
            <div className="text-sm">
              <p className="font-semibold text-foreground">{formatMoney(registration.final_amount)}</p>
              <p className="text-muted-foreground">Saldo {formatMoney(registration.balance)}</p>
            </div>
            <Actions onCancel={onCancel} onConfirm={onConfirm} onPay={onPay} registration={registration} />
          </article>
        ))}
      </div>

      <div className="grid gap-3 xl:hidden">
        {registrations.map((registration) => (
          <article className="rounded-md border border-border bg-surface p-4 shadow-subtle" key={registration.registration_id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate font-semibold text-foreground">{registration.participant_name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{registration.guardian_name ?? 'Sem responsavel'}</p>
              </div>
              <Badge tone={getRegistrationStatusTone(registration.status)}>{getRegistrationStatusLabel(registration.status)}</Badge>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{getSessionsLabel(registration.selected_sessions)}</p>
            <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
              <Summary label="Financeiro" value={getFinanceStatusLabel(registration.finance_status)} />
              <Summary label="Valor" value={formatMoney(registration.final_amount)} />
              <Summary label="Saldo" value={formatMoney(registration.balance)} />
            </dl>
            <div className="mt-4">
              <Actions onCancel={onCancel} onConfirm={onConfirm} onPay={onPay} registration={registration} />
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

function Actions({
  onCancel,
  onConfirm,
  onPay,
  registration,
}: {
  onCancel: (registration: EventRegistrationRow) => void
  onConfirm: (registration: EventRegistrationRow) => void
  onPay: (registration: EventRegistrationRow) => void
  registration: EventRegistrationRow
}) {
  const whatsapp = normalizePhoneForWhatsApp(registration.guardian_phone)
  const canConfirm = registration.status === 'pending' || registration.status === 'waitlisted'
  const canPay = registration.status === 'confirmed' && Number(registration.balance) > 0 && Boolean(registration.financial_entry_id)
  const canCancel = registration.status !== 'cancelled'

  return (
    <div className="flex flex-wrap justify-end gap-2">
      {canConfirm ? (
        <Button leftIcon={<CheckCircle className="h-4 w-4" aria-hidden />} onClick={() => onConfirm(registration)} size="sm" variant="secondary">
          Confirmar
        </Button>
      ) : null}
      {canPay ? (
        <Button leftIcon={<Receipt className="h-4 w-4" aria-hidden />} onClick={() => onPay(registration)} size="sm" variant="secondary">
          Receber
        </Button>
      ) : null}
      {whatsapp ? (
        <Button leftIcon={<MessageCircle className="h-4 w-4" aria-hidden />} onClick={() => window.open(`https://wa.me/${whatsapp}`, '_blank', 'noopener,noreferrer')} size="sm" variant="secondary">
          WhatsApp
        </Button>
      ) : null}
      {canCancel ? (
        <Button leftIcon={<XCircle className="h-4 w-4" aria-hidden />} onClick={() => onCancel(registration)} size="sm" variant="danger">
          Cancelar
        </Button>
      ) : null}
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

function getSessionsLabel(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) {
    return 'Evento completo'
  }

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const session = item as { session_date?: string; start_time?: string; end_time?: string }
      if (!session.session_date || !session.start_time || !session.end_time) return null
      return `${formatDate(session.session_date)} ${formatTime(session.start_time)}-${formatTime(session.end_time)}`
    })
    .filter(Boolean)
    .join(', ')
}
