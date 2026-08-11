import { Check, Search, UserPlus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { getUserSafeErrorMessage } from '@/lib/errors/AppError'
import { useToast } from '@/shared/components/feedback/Toast'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Checkbox, Select, Textarea } from '@/shared/components/ui/FormControls'
import { Input } from '@/shared/components/ui/Input'
import { Overlay } from '@/shared/components/ui/Overlay'
import {
  useCreateEventRegistration,
  useSearchEventGuardians,
  useSearchEventStudents,
} from '@/features/events/hooks/useEvents'
import type {
  EventListRow,
  EventRegistrationStatus,
  EventRegistrationType,
  EventSessionRow,
} from '@/features/events/types/eventsTypes'
import type { GuardianCandidate } from '@/features/events/api/eventsApi'
import type { StudentListItem } from '@/features/students/types/studentTypes'
import { formatDate, formatMoney, formatTime } from '@/features/events/utils/eventsFormat'

type ParticipantMode = 'student' | 'guest'
type GuardianMode = 'existing' | 'new'

type RegistrationDrawerProps = {
  event: EventListRow | null
  isOpen: boolean
  onClose: () => void
  sessions: EventSessionRow[]
}

export function RegistrationDrawer({ event, isOpen, onClose, sessions }: RegistrationDrawerProps) {
  const [participantMode, setParticipantMode] = useState<ParticipantMode>('student')
  const [studentSearch, setStudentSearch] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<StudentListItem | null>(null)
  const [guestFullName, setGuestFullName] = useState('')
  const [guestBirthDate, setGuestBirthDate] = useState('')
  const [guardianMode, setGuardianMode] = useState<GuardianMode>('existing')
  const [guardianSearch, setGuardianSearch] = useState('')
  const [selectedGuardian, setSelectedGuardian] = useState<GuardianCandidate | null>(null)
  const [guardianName, setGuardianName] = useState('')
  const [guardianPhone, setGuardianPhone] = useState('')
  const [guardianEmail, setGuardianEmail] = useState('')
  const [status, setStatus] = useState<EventRegistrationStatus>('confirmed')
  const [registrationType, setRegistrationType] = useState<EventRegistrationType>('full_event')
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([])
  const [baseAmount, setBaseAmount] = useState('0')
  const [discountAmount, setDiscountAmount] = useState('0')
  const [financialDueDate, setFinancialDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const studentQuery = useSearchEventStudents(studentSearch)
  const guardianQuery = useSearchEventGuardians(guardianSearch)
  const mutation = useCreateEventRegistration()
  const { notify } = useToast()
  const numericBase = Number(baseAmount || '0')
  const numericDiscount = Number(discountAmount || '0')
  const finalAmount = Math.max(0, numericBase - numericDiscount)

  useEffect(() => {
    if (!isOpen || !event) return
    setParticipantMode('student')
    setStudentSearch('')
    setSelectedStudent(null)
    setGuestFullName('')
    setGuestBirthDate('')
    setGuardianMode('existing')
    setGuardianSearch('')
    setSelectedGuardian(null)
    setGuardianName('')
    setGuardianPhone('')
    setGuardianEmail('')
    setStatus(event.available_spots <= 0 ? 'waitlisted' : 'confirmed')
    setRegistrationType('full_event')
    setSelectedSessionIds([])
    setBaseAmount(String(Number(event.base_price ?? 0).toFixed(2)))
    setDiscountAmount('0')
    setFinancialDueDate(event.registration_end_date ?? '')
    setNotes('')
  }, [event, isOpen])

  const validationMessage = useMemo(() => {
    if (!event) return 'Selecione um evento.'
    if (participantMode === 'student' && !selectedStudent) return 'Selecione um aluno.'
    if (participantMode === 'guest' && guestFullName.trim().length < 3) return 'Informe o nome do participante externo.'
    if (participantMode === 'guest' && guardianMode === 'existing' && !selectedGuardian) return 'Selecione o responsavel.'
    if (participantMode === 'guest' && guardianMode === 'new' && guardianName.trim().length < 3) return 'Informe o nome do responsavel.'
    if (participantMode === 'guest' && guardianMode === 'new' && guardianPhone.trim().length < 8) return 'Informe o WhatsApp do responsavel.'
    if (registrationType === 'selected_sessions' && selectedSessionIds.length === 0) return 'Selecione ao menos uma sessao.'
    if (numericBase < 0) return 'O valor base nao pode ser negativo.'
    if (numericDiscount < 0 || numericDiscount > numericBase) return 'O desconto deve ficar entre zero e o valor base.'
    if (finalAmount > 0 && !financialDueDate) return 'Informe o vencimento financeiro.'
    return null
  }, [
    event,
    finalAmount,
    financialDueDate,
    guestFullName,
    guardianMode,
    guardianName,
    guardianPhone,
    numericBase,
    numericDiscount,
    participantMode,
    registrationType,
    selectedGuardian,
    selectedSessionIds.length,
    selectedStudent,
  ])

  async function handleSubmit() {
    if (!event || validationMessage) return

    try {
      await mutation.mutateAsync({
        baseAmount: numericBase,
        discountAmount: numericDiscount,
        eventId: event.event_id,
        financialDueDate: finalAmount > 0 ? financialDueDate : null,
        guardian: participantMode === 'guest' && guardianMode === 'new'
          ? { email: guardianEmail || null, fullName: guardianName, phone: guardianPhone }
          : null,
        guardianId: participantMode === 'guest' && guardianMode === 'existing' ? selectedGuardian?.id : null,
        guestBirthDate: participantMode === 'guest' ? guestBirthDate || null : null,
        guestFullName: participantMode === 'guest' ? guestFullName : null,
        notes,
        registrationType,
        sessionIds: registrationType === 'selected_sessions' ? selectedSessionIds : [],
        status,
        studentId: participantMode === 'student' ? selectedStudent?.id : null,
      })
      notify({ title: status === 'waitlisted' ? 'Inscricao na lista de espera.' : 'Inscricao criada.', tone: 'success' })
      onClose()
    } catch (error) {
      notify({ title: 'Nao foi possivel criar a inscricao.', description: getUserSafeErrorMessage(error), tone: 'error' })
    }
  }

  return (
    <Overlay isOpen={isOpen} onClose={onClose} side="wide" title="Nova inscricao">
      <form
        className="grid gap-5"
        onSubmit={(formEvent) => {
          formEvent.preventDefault()
          void handleSubmit()
        }}
      >
        <div className="rounded-md border border-border bg-background p-3">
          <p className="font-semibold text-foreground">{event?.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {event ? `${event.confirmed_count} confirmados, ${event.available_spots} vagas livres` : 'Evento nao selecionado'}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Select label="Participante" onChange={(event) => setParticipantMode(event.target.value as ParticipantMode)} value={participantMode}>
            <option value="student">Aluno cadastrado</option>
            <option value="guest">Participante externo</option>
          </Select>
          <Select label="Status inicial" onChange={(event) => setStatus(event.target.value as EventRegistrationStatus)} value={status}>
            <option value="confirmed">Confirmada</option>
            <option value="pending">Pendente</option>
            <option value="waitlisted">Lista de espera</option>
          </Select>
        </div>

        {participantMode === 'student' ? (
          <SearchPanel
            emptyText="Digite ao menos 2 caracteres para buscar alunos."
            icon={<Search className="h-4 w-4" aria-hidden />}
            inputLabel="Buscar aluno"
            inputValue={studentSearch}
            isLoading={studentQuery.isFetching}
            onInputChange={setStudentSearch}
            selectedLabel={selectedStudent?.full_name}
          >
            {(studentQuery.data ?? []).map((student) => (
              <CandidateButton key={student.id} label={student.full_name} meta={student.preferred_name ?? student.status} onClick={() => setSelectedStudent(student)} />
            ))}
          </SearchPanel>
        ) : (
          <div className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Nome do participante" onChange={(event) => setGuestFullName(event.target.value)} value={guestFullName} />
              <Input label="Nascimento" onChange={(event) => setGuestBirthDate(event.target.value)} type="date" value={guestBirthDate} />
            </div>
            <div className="grid gap-3 rounded-md border border-border bg-background p-3">
              <Select label="Responsavel" onChange={(event) => setGuardianMode(event.target.value as GuardianMode)} value={guardianMode}>
                <option value="existing">Responsavel existente</option>
                <option value="new">Novo responsavel</option>
              </Select>
              {guardianMode === 'existing' ? (
                <SearchPanel
                  emptyText="Digite ao menos 2 caracteres para buscar responsaveis."
                  icon={<Search className="h-4 w-4" aria-hidden />}
                  inputLabel="Buscar responsavel"
                  inputValue={guardianSearch}
                  isLoading={guardianQuery.isFetching}
                  onInputChange={setGuardianSearch}
                  selectedLabel={selectedGuardian?.full_name}
                >
                  {(guardianQuery.data ?? []).map((guardian) => (
                    <CandidateButton key={guardian.id} label={guardian.full_name} meta={guardian.phone ?? guardian.email ?? 'Sem contato'} onClick={() => setSelectedGuardian(guardian)} />
                  ))}
                </SearchPanel>
              ) : (
                <div className="grid gap-3 sm:grid-cols-3">
                  <Input label="Nome" onChange={(event) => setGuardianName(event.target.value)} value={guardianName} />
                  <Input label="WhatsApp" onChange={(event) => setGuardianPhone(event.target.value)} value={guardianPhone} />
                  <Input label="Email" onChange={(event) => setGuardianEmail(event.target.value)} type="email" value={guardianEmail} />
                </div>
              )}
            </div>
          </div>
        )}

        <section className="grid gap-3 rounded-md border border-border bg-background p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Select label="Abrangencia" onChange={(event) => setRegistrationType(event.target.value as EventRegistrationType)} value={registrationType}>
              <option value="full_event">Evento completo</option>
              <option value="selected_sessions">Sessoes especificas</option>
            </Select>
            <div className="flex items-end">
              <Badge tone={finalAmount > 0 ? 'primary' : 'success'}>{finalAmount > 0 ? formatMoney(finalAmount) : 'Gratuita'}</Badge>
            </div>
          </div>
          {registrationType === 'selected_sessions' ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {sessions.map((session) => (
                <Checkbox
                  checked={selectedSessionIds.includes(session.id)}
                  key={session.id}
                  label={`${formatDate(session.session_date)} ${formatTime(session.start_time)}-${formatTime(session.end_time)}`}
                  onChange={(event) => {
                    setSelectedSessionIds((current) =>
                      event.target.checked ? [...current, session.id] : current.filter((sessionId) => sessionId !== session.id),
                    )
                  }}
                />
              ))}
            </div>
          ) : null}
        </section>

        <div className="grid gap-3 sm:grid-cols-3">
          <Input inputMode="decimal" label="Valor base" min={0} onChange={(event) => setBaseAmount(event.target.value)} step="0.01" type="number" value={baseAmount} />
          <Input inputMode="decimal" label="Desconto" min={0} onChange={(event) => setDiscountAmount(event.target.value)} step="0.01" type="number" value={discountAmount} />
          <Input disabled={finalAmount <= 0} label="Vencimento" onChange={(event) => setFinancialDueDate(event.target.value)} type="date" value={financialDueDate} />
        </div>

        <Textarea label="Observacao" onChange={(event) => setNotes(event.target.value)} placeholder="Opcional" value={notes} />

        {validationMessage ? <p className="text-sm font-medium text-danger">{validationMessage}</p> : null}

        <footer className="grid gap-2 sm:grid-cols-2">
          <Button onClick={onClose} type="button" variant="secondary">
            Cancelar
          </Button>
          <Button disabled={Boolean(validationMessage)} isLoading={mutation.isPending} leftIcon={<UserPlus className="h-4 w-4" aria-hidden />} type="submit">
            Criar inscricao
          </Button>
        </footer>
      </form>
    </Overlay>
  )
}

function SearchPanel({
  children,
  emptyText,
  icon,
  inputLabel,
  inputValue,
  isLoading,
  onInputChange,
  selectedLabel,
}: {
  children: React.ReactNode
  emptyText: string
  icon: React.ReactNode
  inputLabel: string
  inputValue: string
  isLoading: boolean
  onInputChange: (value: string) => void
  selectedLabel?: string
}) {
  return (
    <div className="grid gap-3 rounded-md border border-border bg-background p-3">
      <Input label={inputLabel} onChange={(event) => onInputChange(event.target.value)} value={inputValue} />
      {selectedLabel ? (
        <Badge tone="success">
          <Check className="mr-1 h-3.5 w-3.5" aria-hidden />
          {selectedLabel}
        </Badge>
      ) : null}
      <div className="grid gap-2">
        {inputValue.trim().length < 2 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            {icon}
            {emptyText}
          </p>
        ) : isLoading ? (
          <p className="text-sm text-muted-foreground">Buscando...</p>
        ) : (
          children
        )}
      </div>
    </div>
  )
}

function CandidateButton({ label, meta, onClick }: { label: string; meta: string; onClick: () => void }) {
  return (
    <button
      className="rounded border border-border bg-surface px-3 py-2 text-left text-sm shadow-subtle hover:bg-muted"
      onClick={onClick}
      type="button"
    >
      <span className="block font-semibold text-foreground">{label}</span>
      <span className="mt-0.5 block text-muted-foreground">{meta}</span>
    </button>
  )
}
