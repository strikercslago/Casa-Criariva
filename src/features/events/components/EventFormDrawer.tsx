import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { getUserSafeErrorMessage } from '@/lib/errors/AppError'
import { useToast } from '@/shared/components/feedback/Toast'
import { Button } from '@/shared/components/ui/Button'
import { Select, Textarea } from '@/shared/components/ui/FormControls'
import { IconButton } from '@/shared/components/ui/IconButton'
import { Input } from '@/shared/components/ui/Input'
import { Overlay } from '@/shared/components/ui/Overlay'
import { useCreateEvent } from '@/features/events/hooks/useEvents'
import type { EventStatus, EventType } from '@/features/events/types/eventsTypes'
import { eventTypeOptions } from '@/features/events/utils/eventsFormat'
import { toIsoDate } from '@/features/billing/utils/billingDates'

type SessionDraft = {
  capacityOverride: string
  endTime: string
  priceOverride: string
  sessionDate: string
  startTime: string
}

type EventFormDrawerProps = {
  isOpen: boolean
  onClose: () => void
}

export function EventFormDrawer({ isOpen, onClose }: EventFormDrawerProps) {
  const today = useMemo(() => toIsoDate(new Date()), [])
  const [name, setName] = useState('')
  const [eventType, setEventType] = useState<EventType>('colony')
  const [status, setStatus] = useState<EventStatus>('open')
  const [description, setDescription] = useState('')
  const [capacity, setCapacity] = useState('')
  const [basePrice, setBasePrice] = useState('0')
  const [registrationStartDate, setRegistrationStartDate] = useState(today)
  const [registrationEndDate, setRegistrationEndDate] = useState(today)
  const [notes, setNotes] = useState('')
  const [sessions, setSessions] = useState<SessionDraft[]>([createSessionDraft(today)])
  const createMutation = useCreateEvent()
  const { notify } = useToast()

  useEffect(() => {
    if (!isOpen) return
    setName('')
    setEventType('colony')
    setStatus('open')
    setDescription('')
    setCapacity('')
    setBasePrice('0')
    setRegistrationStartDate(today)
    setRegistrationEndDate(today)
    setNotes('')
    setSessions([createSessionDraft(today)])
  }, [isOpen, today])

  const validationMessage = useMemo(() => {
    if (name.trim().length < 3) return 'Informe um nome com pelo menos 3 caracteres.'
    if (Number(basePrice || '0') < 0) return 'O valor base nao pode ser negativo.'
    if (capacity && Number(capacity) <= 0) return 'A capacidade deve ser maior que zero.'
    if (registrationStartDate && registrationEndDate && registrationEndDate < registrationStartDate) {
      return 'O fim das inscricoes deve ser posterior ao inicio.'
    }
    if (sessions.length === 0) return 'Cadastre pelo menos uma sessao.'

    for (const session of sessions) {
      if (!session.sessionDate || !session.startTime || !session.endTime) return 'Preencha data e horarios de todas as sessoes.'
      if (session.endTime <= session.startTime) return 'O horario final deve ser posterior ao inicio.'
      if (session.capacityOverride && Number(session.capacityOverride) <= 0) return 'A capacidade da sessao deve ser maior que zero.'
      if (session.priceOverride && Number(session.priceOverride) < 0) return 'O valor da sessao nao pode ser negativo.'
    }

    return null
  }, [basePrice, capacity, name, registrationEndDate, registrationStartDate, sessions])

  function updateSession(index: number, patch: Partial<SessionDraft>) {
    setSessions((current) => current.map((session, sessionIndex) => (sessionIndex === index ? { ...session, ...patch } : session)))
  }

  async function handleSubmit() {
    if (validationMessage) return

    try {
      await createMutation.mutateAsync({
        basePrice: Number(basePrice || '0'),
        capacity: capacity ? Number(capacity) : null,
        description,
        eventType,
        name,
        notes,
        registrationEndDate: registrationEndDate || null,
        registrationStartDate: registrationStartDate || null,
        sessions: sessions.map((session) => ({
          capacityOverride: session.capacityOverride ? Number(session.capacityOverride) : null,
          endTime: session.endTime,
          priceOverride: session.priceOverride ? Number(session.priceOverride) : null,
          sessionDate: session.sessionDate,
          startTime: session.startTime,
        })),
        status,
      })
      notify({ title: 'Evento criado.', tone: 'success' })
      onClose()
    } catch (error) {
      notify({ title: 'Nao foi possivel criar o evento.', description: getUserSafeErrorMessage(error), tone: 'error' })
    }
  }

  return (
    <Overlay isOpen={isOpen} onClose={onClose} side="wide" title="Novo evento">
      <form
        className="grid gap-5"
        onSubmit={(event) => {
          event.preventDefault()
          void handleSubmit()
        }}
      >
        <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_180px_160px]">
          <Input label="Nome" onChange={(event) => setName(event.target.value)} value={name} />
          <Select label="Tipo" onChange={(event) => setEventType(event.target.value as EventType)} value={eventType}>
            {eventTypeOptions.filter((option) => option.value !== 'all').map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select label="Status" onChange={(event) => setStatus(event.target.value as EventStatus)} value={status}>
            <option value="draft">Rascunho</option>
            <option value="open">Aberto</option>
            <option value="closed">Fechado</option>
          </Select>
        </div>

        <Textarea label="Descricao" onChange={(event) => setDescription(event.target.value)} placeholder="Opcional" value={description} />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input inputMode="numeric" label="Capacidade geral" min={1} onChange={(event) => setCapacity(event.target.value)} type="number" value={capacity} />
          <Input inputMode="decimal" label="Valor base" min={0} onChange={(event) => setBasePrice(event.target.value)} step="0.01" type="number" value={basePrice} />
          <Input label="Inicio das inscricoes" onChange={(event) => setRegistrationStartDate(event.target.value)} type="date" value={registrationStartDate} />
          <Input label="Fim das inscricoes" onChange={(event) => setRegistrationEndDate(event.target.value)} type="date" value={registrationEndDate} />
        </div>

        <section className="grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-foreground">Sessoes</h3>
            <Button leftIcon={<Plus className="h-4 w-4" aria-hidden />} onClick={() => setSessions((current) => [...current, createSessionDraft(today)])} size="sm" type="button" variant="secondary">
              Sessao
            </Button>
          </div>
          <div className="grid gap-3">
            {sessions.map((session, index) => (
              <div className="grid gap-3 rounded-md border border-border bg-background p-3 lg:grid-cols-[150px_120px_120px_130px_130px_40px]" key={`${index}-${session.sessionDate}`}>
                <Input label="Data" onChange={(event) => updateSession(index, { sessionDate: event.target.value })} type="date" value={session.sessionDate} />
                <Input label="Inicio" onChange={(event) => updateSession(index, { startTime: event.target.value })} type="time" value={session.startTime} />
                <Input label="Fim" onChange={(event) => updateSession(index, { endTime: event.target.value })} type="time" value={session.endTime} />
                <Input inputMode="numeric" label="Vagas" min={1} onChange={(event) => updateSession(index, { capacityOverride: event.target.value })} type="number" value={session.capacityOverride} />
                <Input inputMode="decimal" label="Valor" min={0} onChange={(event) => updateSession(index, { priceOverride: event.target.value })} step="0.01" type="number" value={session.priceOverride} />
                <div className="flex items-end">
                  <IconButton
                    className="h-10 w-10"
                    disabled={sessions.length === 1}
                    label="Remover sessao"
                    onClick={() => setSessions((current) => current.filter((_, sessionIndex) => sessionIndex !== index))}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </IconButton>
                </div>
              </div>
            ))}
          </div>
        </section>

        <Textarea label="Observacao interna" onChange={(event) => setNotes(event.target.value)} placeholder="Opcional" value={notes} />

        {validationMessage ? <p className="text-sm font-medium text-danger">{validationMessage}</p> : null}

        <footer className="grid gap-2 sm:grid-cols-2">
          <Button onClick={onClose} type="button" variant="secondary">
            Cancelar
          </Button>
          <Button disabled={Boolean(validationMessage)} isLoading={createMutation.isPending} type="submit">
            Salvar evento
          </Button>
        </footer>
      </form>
    </Overlay>
  )
}

function createSessionDraft(date: string): SessionDraft {
  return {
    capacityOverride: '',
    endTime: '12:00',
    priceOverride: '',
    sessionDate: date,
    startTime: '09:00',
  }
}
