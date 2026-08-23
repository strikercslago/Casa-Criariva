import { Archive, ArrowRightLeft, Pencil, Plus, RotateCcw, UserRoundCheck, UserRoundX } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUserSafeErrorMessage } from '@/lib/errors/AppError'
import { ErrorState } from '@/shared/components/feedback/ErrorState'
import { useToast } from '@/shared/components/feedback/Toast'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Overlay } from '@/shared/components/ui/Overlay'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import { TabButton, Tabs } from '@/shared/components/ui/Tabs'
import { ClassForm } from '@/features/classes/components/ClassForm'
import { AddStudentToClassForm, TransferStudentForm } from '@/features/classes/components/ClassStudentForms'
import { ClassStatusBadge } from '@/features/classes/components/ClassStatusBadge'
import {
  useClassDetail,
  useEndClassEnrollment,
  useUpdateClass,
  useUpdateClassStatus,
} from '@/features/classes/hooks/useClasses'
import type { ClassFormValues } from '@/features/classes/schemas/classSchema'
import type { ClassDetail, EnrollmentWithStudent } from '@/features/classes/types/classTypes'
import { formatAvailableSpots, formatCapacity, isClassFull } from '@/features/classes/utils/classCapacity'
import {
  sortClassEnrollmentHistory,
  sortCurrentClassEnrollments,
  splitClassEnrollments,
} from '@/features/classes/utils/classEnrollment'
import { formatClassSchedules } from '@/features/classes/utils/classSchedule'
import { getClassStatusLabel } from '@/features/classes/utils/classStatus'
import {
  getEnrollmentStatusLabel,
  getEnrollmentStatusTone,
} from '@/features/classes/utils/enrollmentStatus'
import { StudentAvatar } from '@/features/students/components/StudentAvatar'
import { formatStudentDate, getTodayIsoDate } from '@/features/students/utils/studentDates'

type ClassDetailDrawerProps = {
  classId: string | null
  onClose: () => void
}

export function ClassDetailDrawer({ classId, onClose }: ClassDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [isEditing, setIsEditing] = useState(false)
  const [isAddingStudent, setIsAddingStudent] = useState(false)
  const [isConfirmingArchive, setIsConfirmingArchive] = useState(false)
  const [pendingEditValues, setPendingEditValues] = useState<ClassFormValues | null>(null)
  const [endingEnrollment, setEndingEnrollment] = useState<EnrollmentWithStudent | null>(null)
  const [transferringEnrollment, setTransferringEnrollment] = useState<EnrollmentWithStudent | null>(null)
  const detailQuery = useClassDetail(classId)
  const updateMutation = useUpdateClass(classId ?? '')
  const statusMutation = useUpdateClassStatus(classId ?? '')
  const endMutation = useEndClassEnrollment(classId ?? '')
  const navigate = useNavigate()
  const { notify } = useToast()
  const classData = detailQuery.data
  const todayIso = useMemo(() => getTodayIsoDate(), [])
  const enrollmentGroups = useMemo(
    () => splitClassEnrollments(classData?.enrollments ?? [], todayIso),
    [classData?.enrollments, todayIso],
  )
  const activeEnrollments = enrollmentGroups.current

  function handleClose() {
    setActiveTab('overview')
    setIsEditing(false)
    setIsAddingStudent(false)
    setIsConfirmingArchive(false)
    setPendingEditValues(null)
    setEndingEnrollment(null)
    setTransferringEnrollment(null)
    onClose()
  }

  async function saveEdit(values: ClassFormValues) {
    if (!classData) {
      return
    }

    const nextCapacity = values.capacity.trim().length > 0 ? Number(values.capacity) : null
    if (nextCapacity !== null && nextCapacity < activeEnrollments.length) {
      setPendingEditValues(values)
      return
    }

    await persistEdit(values)
  }

  async function persistEdit(values: ClassFormValues) {
    try {
      await updateMutation.mutateAsync(values)
      setIsEditing(false)
      setPendingEditValues(null)
      notify({ title: 'Turma atualizada.', tone: 'success' })
    } catch (error) {
      notify({
        title: 'Nao foi possivel salvar as alteracoes.',
        description: getUserSafeErrorMessage(error),
        tone: 'error',
      })
    }
  }

  async function updateStatus(status: 'active' | 'archived') {
    try {
      await statusMutation.mutateAsync(status)
      setIsConfirmingArchive(false)
      notify({ title: status === 'archived' ? 'Turma arquivada.' : 'Turma restaurada.', tone: 'success' })
    } catch (error) {
      notify({
        title: 'Nao foi possivel alterar o status.',
        description: getUserSafeErrorMessage(error),
        tone: 'error',
      })
    }
  }

  async function endEnrollment(enrollment: EnrollmentWithStudent, endDate: string) {
    try {
      await endMutation.mutateAsync({ endDate, enrollmentId: enrollment.id, studentId: enrollment.student_id })
      setEndingEnrollment(null)
      notify({ title: 'Matricula encerrada.', tone: 'success' })
    } catch (error) {
      notify({
        title: 'Nao foi possivel encerrar a matricula.',
        description: getUserSafeErrorMessage(error),
        tone: 'error',
      })
    }
  }

  return (
    <>
      <Overlay isOpen={Boolean(classId)} onClose={handleClose} side="wide" title="Ficha da turma">
        {detailQuery.isLoading ? (
          <div className="grid gap-4">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-56 w-full" />
          </div>
        ) : null}

        {detailQuery.isError ? (
          <ErrorState
            title="Nao foi possivel carregar a turma."
            description={getUserSafeErrorMessage(detailQuery.error)}
            onRetry={() => void detailQuery.refetch()}
          />
        ) : null}

        {classData && !isEditing ? (
          <div className="grid gap-5">
            <ClassHeader
              activeEnrollments={activeEnrollments.length}
              classData={classData}
              onAddStudent={() => setIsAddingStudent(true)}
              onArchive={() => setIsConfirmingArchive(true)}
              onEdit={() => setIsEditing(true)}
              onRestore={() => void updateStatus('active')}
              isStatusLoading={statusMutation.isPending}
            />

            <div className="overflow-x-auto">
              <Tabs>
                {[
                  { label: 'Visao geral', value: 'overview' },
                  { label: 'Alunos matriculados', value: 'students' },
                  { label: 'Historico', value: 'history' },
                ].map((tab) => (
                  <TabButton isActive={activeTab === tab.value} key={tab.value} onClick={() => setActiveTab(tab.value)}>
                    {tab.label}
                  </TabButton>
                ))}
              </Tabs>
            </div>

            {activeTab === 'overview' ? (
              <ClassOverview activeEnrollments={activeEnrollments.length} classData={classData} />
            ) : null}
            {activeTab === 'students' ? (
              <ClassStudentsTab
                activeEnrollments={enrollmentGroups.current}
                historicalEnrollments={enrollmentGroups.history}
                onEnd={setEndingEnrollment}
                onOpenStudent={(studentId) => navigate(`/alunos?aluno=${studentId}`)}
                onTransfer={setTransferringEnrollment}
              />
            ) : null}
            {activeTab === 'history' ? <ClassHistoryTab events={classData.auditEvents} /> : null}
          </div>
        ) : null}

        {classData && isEditing ? (
          <div className="grid gap-3">
            <CapacityWarning activeEnrollments={activeEnrollments.length} classData={classData} />
            <ClassForm
              classData={classData}
              isSubmitting={updateMutation.isPending}
              mode="edit"
              onCancel={() => setIsEditing(false)}
              onSubmit={saveEdit}
            />
          </div>
        ) : null}
      </Overlay>

      <Overlay isOpen={isAddingStudent} onClose={() => setIsAddingStudent(false)} title="Adicionar aluno">
        {classId ? (
          <AddStudentToClassForm
            classId={classId}
            onCancel={() => setIsAddingStudent(false)}
            onSaved={() => setIsAddingStudent(false)}
          />
        ) : null}
      </Overlay>

      <Overlay
        isOpen={Boolean(transferringEnrollment)}
        onClose={() => setTransferringEnrollment(null)}
        title="Transferir aluno"
      >
        {classId && transferringEnrollment ? (
          <TransferStudentForm
            enrollment={transferringEnrollment}
            onCancel={() => setTransferringEnrollment(null)}
            onSaved={() => setTransferringEnrollment(null)}
            sourceClassId={classId}
          />
        ) : null}
      </Overlay>

      <EndEnrollmentDialog
        enrollment={endingEnrollment}
        isLoading={endMutation.isPending}
        onCancel={() => setEndingEnrollment(null)}
        onConfirm={endEnrollment}
      />

      <ArchiveClassDialog
        activeEnrollments={activeEnrollments.length}
        className={classData?.name ?? 'turma'}
        isLoading={statusMutation.isPending}
        isOpen={isConfirmingArchive}
        onCancel={() => setIsConfirmingArchive(false)}
        onConfirm={() => void updateStatus('archived')}
      />

      <Overlay
        isOpen={Boolean(pendingEditValues)}
        onClose={() => setPendingEditValues(null)}
        title="Confirmar capacidade"
      >
        <div className="grid gap-4">
          <p className="text-sm leading-6 text-muted-foreground">
            A nova capacidade fica menor que os {activeEnrollments.length} alunos ativos. A alteracao sera salva, mas a
            turma aparecera como cheia ate haver vagas novamente.
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button onClick={() => setPendingEditValues(null)} variant="secondary">
              Revisar
            </Button>
            <Button
              isLoading={updateMutation.isPending}
              onClick={() => pendingEditValues && void persistEdit(pendingEditValues)}
            >
              Confirmar
            </Button>
          </div>
        </div>
      </Overlay>
    </>
  )
}

function ClassHeader({
  activeEnrollments,
  classData,
  isStatusLoading,
  onAddStudent,
  onArchive,
  onEdit,
  onRestore,
}: {
  activeEnrollments: number
  classData: ClassDetail
  isStatusLoading: boolean
  onAddStudent: () => void
  onArchive: () => void
  onEdit: () => void
  onRestore: () => void
}) {
  return (
    <header className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold text-foreground">{classData.name}</h2>
            <ClassStatusBadge status={classData.status} />
            {isClassFull(classData.capacity, activeEnrollments) ? <Badge tone="warning">Turma cheia</Badge> : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{formatClassSchedules(classData.class_schedules)}</p>
        </div>
      </div>

      <dl className="grid gap-2 rounded-md border border-border bg-background p-3 text-sm sm:grid-cols-3">
        <SummaryItem label="Ocupacao" value={formatCapacity({ active_enrollments: activeEnrollments, capacity: classData.capacity })} />
        <SummaryItem label="Vagas" value={formatAvailableSpots(classData.capacity, activeEnrollments)} />
        <SummaryItem label="Atualizada" value={formatStudentDate(classData.updated_at.slice(0, 10))} />
      </dl>

      <div className="grid gap-2 sm:grid-cols-3">
        <Button disabled={classData.status === 'archived'} leftIcon={<Plus className="h-4 w-4" aria-hidden />} onClick={onAddStudent}>
          Adicionar aluno
        </Button>
        <Button leftIcon={<Pencil className="h-4 w-4" aria-hidden />} onClick={onEdit} variant="secondary">
          Editar turma
        </Button>
        {classData.status === 'archived' ? (
          <Button
            isLoading={isStatusLoading}
            leftIcon={<RotateCcw className="h-4 w-4" aria-hidden />}
            onClick={onRestore}
            variant="secondary"
          >
            Restaurar turma
          </Button>
        ) : (
          <Button
            isLoading={isStatusLoading}
            leftIcon={<Archive className="h-4 w-4" aria-hidden />}
            onClick={onArchive}
            variant="danger"
          >
            Arquivar turma
          </Button>
        )}
      </div>
    </header>
  )
}

function ClassOverview({ activeEnrollments, classData }: { activeEnrollments: number; classData: ClassDetail }) {
  return (
    <section className="grid gap-4 rounded-md border border-border bg-background p-4 text-sm">
      <InfoRow label="Horarios" value={formatClassSchedules(classData.class_schedules)} />
      <InfoRow label="Capacidade" value={formatCapacity({ active_enrollments: activeEnrollments, capacity: classData.capacity })} />
      <InfoRow label="Vagas" value={formatAvailableSpots(classData.capacity, activeEnrollments)} />
      <InfoRow label="Status" value={getClassStatusLabel(classData.status)} />
      <div>
        <p className="font-medium text-foreground">Descricao</p>
        <p className="mt-1 leading-6 text-muted-foreground">{classData.description ?? 'Nenhuma descricao registrada.'}</p>
      </div>
    </section>
  )
}

function ClassStudentsTab({
  activeEnrollments,
  historicalEnrollments,
  onEnd,
  onOpenStudent,
  onTransfer,
}: {
  activeEnrollments: EnrollmentWithStudent[]
  historicalEnrollments: EnrollmentWithStudent[]
  onEnd: (enrollment: EnrollmentWithStudent) => void
  onOpenStudent: (studentId: string) => void
  onTransfer: (enrollment: EnrollmentWithStudent) => void
}) {
  const [showHistory, setShowHistory] = useState(false)
  const sortedActiveEnrollments = useMemo(() => sortCurrentClassEnrollments(activeEnrollments), [activeEnrollments])
  const sortedHistoricalEnrollments = useMemo(
    () => sortClassEnrollmentHistory(historicalEnrollments),
    [historicalEnrollments],
  )

  return (
    <div className="grid gap-3">
      {sortedActiveEnrollments.length === 0 ? (
        <EmptyPanel title="Nenhum aluno ativo" description="Adicione alunos ativos para ocupar esta turma." />
      ) : (
        sortedActiveEnrollments.map((enrollment) => (
          <EnrollmentCard
            enrollment={enrollment}
            key={enrollment.id}
            onEnd={onEnd}
            onOpenStudent={onOpenStudent}
            onTransfer={onTransfer}
            variant="active"
          />
        ))
      )}

      {sortedHistoricalEnrollments.length > 0 ? (
        <section className="mt-2 rounded-md border border-border bg-background p-3">
          <button
            className="flex w-full items-center justify-between gap-3 text-left text-sm font-semibold text-foreground"
            onClick={() => setShowHistory((current) => !current)}
            type="button"
          >
            <span>Historico de matriculas</span>
            <span className="text-muted-foreground">
              {showHistory ? 'Ocultar' : `Ver encerrados (${sortedHistoricalEnrollments.length})`}
            </span>
          </button>

          {showHistory ? (
            <div className="mt-3 grid gap-2">
              {sortedHistoricalEnrollments.map((enrollment) => (
                <EnrollmentCard
                  enrollment={enrollment}
                  key={enrollment.id}
                  onEnd={onEnd}
                  onOpenStudent={onOpenStudent}
                  onTransfer={onTransfer}
                  variant="history"
                />
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}

function EnrollmentCard({
  enrollment,
  onEnd,
  onOpenStudent,
  onTransfer,
  variant,
}: {
  enrollment: EnrollmentWithStudent
  onEnd: (enrollment: EnrollmentWithStudent) => void
  onOpenStudent: (studentId: string) => void
  onTransfer: (enrollment: EnrollmentWithStudent) => void
  variant: 'active' | 'history'
}) {
  const isHistorical = variant === 'history'
  const canManage = !isHistorical && enrollment.status === 'active'

  return (
    <article className="rounded-md border border-border bg-background p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <StudentAvatar
            size="sm"
            student={enrollment.student ?? { full_name: 'Aluno', photo_path: null, preferred_name: null }}
          />
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground">{enrollment.student?.full_name ?? 'Aluno'}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Inicio: {formatStudentDate(enrollment.start_date)}
              {enrollment.end_date ? ` - Encerramento: ${formatStudentDate(enrollment.end_date)}` : ''}
            </p>
          </div>
        </div>
        <Badge tone={getEnrollmentStatusTone(enrollment.status)}>
          {getEnrollmentStatusLabel(enrollment.status)}
        </Badge>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={() => onOpenStudent(enrollment.student_id)} size="sm" variant="secondary">
          Abrir aluno
        </Button>
        {!isHistorical ? (
          <>
            <Button
              disabled={!canManage}
              leftIcon={<ArrowRightLeft className="h-4 w-4" aria-hidden />}
              onClick={() => onTransfer(enrollment)}
              size="sm"
              variant="secondary"
            >
              Transferir
            </Button>
            <Button
              disabled={!canManage}
              leftIcon={<UserRoundX className="h-4 w-4" aria-hidden />}
              onClick={() => onEnd(enrollment)}
              size="sm"
              variant="danger"
            >
              Encerrar
            </Button>
          </>
        ) : null}
      </div>
    </article>
  )
}

function ClassHistoryTab({ events }: { events: ClassDetail['auditEvents'] }) {
  const labels = useMemo(
    () => ({
      'class.archived': 'Turma arquivada',
      'class.created': 'Turma criada',
      'class.restored': 'Turma restaurada',
      'class.schedule_changed': 'Horarios alterados',
      'class.updated': 'Turma atualizada',
      'enrollment.created': 'Aluno adicionado',
      'enrollment.ended': 'Matricula encerrada',
      'enrollment.transferred': 'Matricula transferida',
    }),
    [],
  )

  if (events.length === 0) {
    return <EmptyPanel title="Historico vazio" description="Nenhum evento administrativo registrado para esta turma." />
  }

  return (
    <ol className="grid gap-3">
      {events.map((event) => (
        <li className="rounded-md border border-border bg-background p-4" key={event.id}>
          <p className="text-sm font-semibold text-foreground">
            {labels[event.action as keyof typeof labels] ?? event.action}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{formatStudentDate(event.created_at.slice(0, 10))}</p>
        </li>
      ))}
    </ol>
  )
}

function EndEnrollmentDialog({
  enrollment,
  isLoading,
  onCancel,
  onConfirm,
}: {
  enrollment: EnrollmentWithStudent | null
  isLoading: boolean
  onCancel: () => void
  onConfirm: (enrollment: EnrollmentWithStudent, endDate: string) => void
}) {
  const [endDate, setEndDate] = useState(getTodayIsoDate())

  return (
    <Overlay isOpen={Boolean(enrollment)} onClose={onCancel} title="Encerrar matricula">
      {enrollment ? (
        <div className="grid gap-4">
          <p className="text-sm leading-6 text-muted-foreground">
            Encerrar a matricula de {enrollment.student?.full_name ?? 'aluno'} nesta turma. O historico sera mantido na
            turma e na ficha do aluno.
          </p>
          <Input label="Data de encerramento" onChange={(event) => setEndDate(event.target.value)} type="date" value={endDate} />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button onClick={onCancel} variant="secondary">
              Cancelar
            </Button>
            <Button
              isLoading={isLoading}
              leftIcon={<UserRoundCheck className="h-4 w-4" aria-hidden />}
              onClick={() => onConfirm(enrollment, endDate)}
              variant="danger"
            >
              Encerrar
            </Button>
          </div>
        </div>
      ) : null}
    </Overlay>
  )
}

function ArchiveClassDialog({
  activeEnrollments,
  className,
  isLoading,
  isOpen,
  onCancel,
  onConfirm,
}: {
  activeEnrollments: number
  className: string
  isLoading: boolean
  isOpen: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const hasActiveEnrollments = activeEnrollments > 0

  return (
    <Overlay isOpen={isOpen} onClose={onCancel} title="Arquivar turma">
      <div className="grid gap-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Arquivar {className}?</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {hasActiveEnrollments
              ? `Esta turma tem ${activeEnrollments} matricula${activeEnrollments === 1 ? '' : 's'} ativa${activeEnrollments === 1 ? '' : 's'}. Encerre ou transfira os alunos antes de arquivar.`
              : 'A turma sera removida da operacao ativa, mantendo historico e auditoria.'}
          </p>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button onClick={onCancel} variant="secondary">
            Cancelar
          </Button>
          <Button disabled={hasActiveEnrollments} isLoading={isLoading} onClick={onConfirm} variant="danger">
            Arquivar
          </Button>
        </div>
      </div>
    </Overlay>
  )
}

function CapacityWarning({ activeEnrollments, classData }: { activeEnrollments: number; classData: ClassDetail }) {
  if (classData.capacity === null || classData.capacity >= activeEnrollments) {
    return null
  }

  return (
    <div className="rounded-md border border-warning/30 bg-warning/15 p-3 text-sm text-amber-800">
      A capacidade atual esta abaixo da ocupacao ativa. Ajustes continuam permitidos, mas novas matriculas serao
      bloqueadas ate haver vagas.
    </div>
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-medium text-foreground">{label}</p>
      <p className="mt-1 text-muted-foreground">{value}</p>
    </div>
  )
}

function EmptyPanel({ description, title }: { description: string; title: string }) {
  return (
    <div className="rounded-md border border-dashed border-border bg-background p-6 text-sm">
      <h3 className="font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-muted-foreground">{description}</p>
    </div>
  )
}
