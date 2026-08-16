import { Archive, Camera, Copy, MessageCircle, Pencil, RotateCcw, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { getUserSafeErrorMessage } from '@/lib/errors/AppError'
import { ErrorState } from '@/shared/components/feedback/ErrorState'
import { useToast } from '@/shared/components/feedback/Toast'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Overlay } from '@/shared/components/ui/Overlay'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import { TabButton, Tabs } from '@/shared/components/ui/Tabs'
import { StudentAvatar } from '@/features/students/components/StudentAvatar'
import { StudentForm } from '@/features/students/components/StudentForm'
import { StudentStatusBadge } from '@/features/students/components/StudentStatusBadge'
import { useStudent360Data } from '@/features/students/hooks/useStudent360'
import { useRemoveStudentPhoto, useUploadStudentPhoto } from '@/features/students/hooks/useStudentPhotos'
import {
  useArchiveStudent,
  useRestoreStudent,
  useUpdateStudent,
} from '@/features/students/hooks/useStudents'
import type { StudentFormValues } from '@/features/students/schemas/studentSchema'
import type {
  AuditEventRow,
  AttendanceRecordWithSession,
  BillingPlanWithGuardian,
  EnrollmentWithClass,
  StudentGuardianLink,
} from '@/features/students/types/student360Types'
import type { StudentRow } from '@/features/students/types/studentTypes'
import { formatStudentDate } from '@/features/students/utils/studentDates'
import { validateStudentPhotoFile } from '@/features/students/utils/studentPhoto'
import {
  calculateAge,
  formatMoney,
  formatSchedules,
  getBillingPlanStatusLabel,
  getBillingPlanStatusTone,
  normalizePhoneForWhatsApp,
} from '@/features/students/utils/student360Format'
import { attendanceStatusLabels } from '@/features/agenda/utils/agendaFormat'
import { formatTimeRange } from '@/features/agenda/utils/agendaDates'
import { PaymentDrawer } from '@/features/billing/components/PaymentDrawer'
import { useStudentBillingSnapshot } from '@/features/billing/hooks/useBilling'
import type { MonthlyFeeListRow } from '@/features/billing/types/billingTypes'
import { getCurrentReferenceMonth } from '@/features/billing/utils/billingDates'
import {
  getEnrollmentStatusLabel,
  getEnrollmentStatusTone,
} from '@/features/classes/utils/enrollmentStatus'
import {
  formatMoney as formatBillingMoney,
  getMonthlyFeeStatusLabel,
  getMonthlyFeeStatusTone,
} from '@/features/billing/utils/billingFormat'

type Student360ProfileProps = {
  student: StudentRow
  onArchiveRequest: () => void
}

export function Student360Profile({ student, onArchiveRequest }: Student360ProfileProps) {
  const [isEditingStudent, setIsEditingStudent] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [paymentFee, setPaymentFee] = useState<MonthlyFeeListRow | null>(null)
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const relationsQuery = useStudent360Data(student.id)
  const updateMutation = useUpdateStudent()
  const archiveMutation = useArchiveStudent()
  const restoreMutation = useRestoreStudent()
  const uploadPhotoMutation = useUploadStudentPhoto()
  const removePhotoMutation = useRemoveStudentPhoto()
  const { notify } = useToast()
  const age = calculateAge(student.birth_date)
  const relations = relationsQuery.data

  async function handleUpdate(values: StudentFormValues) {
    try {
      await updateMutation.mutateAsync({ id: student.id, values })
      setIsEditingStudent(false)
      notify({ title: 'Aluno atualizado.', tone: 'success' })
    } catch (error) {
      notify({ title: 'Nao foi possivel salvar.', description: getUserSafeErrorMessage(error), tone: 'error' })
    }
  }

  function handlePhotoInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    event.target.value = ''

    if (!file) {
      return
    }

    try {
      validateStudentPhotoFile(file)
      setPendingPhotoFile(file)
    } catch (error) {
      notify({
        title: 'Nao foi possivel selecionar a foto.',
        description: getUserSafeErrorMessage(error),
        tone: 'error',
      })
    }
  }

  async function confirmPhotoUpload() {
    if (!pendingPhotoFile) {
      return
    }

    try {
      await uploadPhotoMutation.mutateAsync({
        file: pendingPhotoFile,
        previousPath: student.photo_path,
        studentId: student.id,
      })
      setPendingPhotoFile(null)
      notify({ title: 'Foto do aluno atualizada.', tone: 'success' })
    } catch (error) {
      notify({
        title: 'Nao foi possivel enviar a foto.',
        description: getUserSafeErrorMessage(error),
        tone: 'error',
      })
    }
  }

  async function handleRemovePhoto() {
    if (!student.photo_path || !window.confirm('Remover a foto deste aluno?')) {
      return
    }

    try {
      await removePhotoMutation.mutateAsync({ path: student.photo_path, studentId: student.id })
      notify({ title: 'Foto removida.', tone: 'success' })
    } catch (error) {
      notify({
        title: 'Nao foi possivel remover a foto.',
        description: getUserSafeErrorMessage(error),
        tone: 'error',
      })
    }
  }

  async function handleRestore() {
    try {
      await restoreMutation.mutateAsync(student.id)
      notify({ title: 'Aluno restaurado.', tone: 'success' })
    } catch (error) {
      notify({ title: 'Nao foi possivel restaurar.', description: getUserSafeErrorMessage(error), tone: 'error' })
    }
  }

  if (isEditingStudent) {
    return (
      <StudentForm
        isSubmitting={updateMutation.isPending}
        mode="edit"
        onCancel={() => setIsEditingStudent(false)}
        onSubmit={handleUpdate}
        student={student}
      />
    )
  }

  return (
    <div className="grid gap-5">
      <header className="grid gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-4">
            <StudentAvatar size="lg" student={student} />
            <div className="min-w-0">
              <h2 className="text-2xl font-semibold text-foreground">{student.full_name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {student.preferred_name ? `Nome preferido: ${student.preferred_name}` : 'Nome preferido nao informado'}
                {age !== null ? ` - ${age} anos` : ''}
              </p>
            </div>
          </div>
          <StudentStatusBadge status={student.status} />
        </div>

        <dl className="grid gap-2 rounded-md border border-border bg-background p-3 text-sm sm:grid-cols-3">
          <SummaryItem label="Matricula" value={formatStudentDate(student.enrollment_date)} />
          <SummaryItem label="Nascimento" value={formatStudentDate(student.birth_date)} />
          <SummaryItem label="Atualizado" value={formatStudentDate(student.updated_at.slice(0, 10))} />
        </dl>

        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            leftIcon={<Pencil className="h-4 w-4" aria-hidden />}
            onClick={() => setIsEditingStudent(true)}
            variant="secondary"
          >
            Editar dados do aluno
          </Button>
          {student.status === 'archived' ? (
            <Button
              isLoading={restoreMutation.isPending}
              leftIcon={<RotateCcw className="h-4 w-4" aria-hidden />}
              onClick={handleRestore}
              variant="secondary"
            >
              Restaurar aluno
            </Button>
          ) : (
            <Button
              isLoading={archiveMutation.isPending}
              leftIcon={<Archive className="h-4 w-4" aria-hidden />}
              onClick={onArchiveRequest}
              variant="danger"
            >
              Arquivar aluno
            </Button>
          )}
          <Button
            isLoading={uploadPhotoMutation.isPending}
            leftIcon={<Camera className="h-4 w-4" aria-hidden />}
            onClick={() => photoInputRef.current?.click()}
            variant="secondary"
          >
            {student.photo_path ? 'Alterar foto' : 'Adicionar foto'}
          </Button>
          <Button
            disabled={!student.photo_path}
            isLoading={removePhotoMutation.isPending}
            leftIcon={<Trash2 className="h-4 w-4" aria-hidden />}
            onClick={() => void handleRemovePhoto()}
            variant="secondary"
          >
            Remover foto
          </Button>
        </div>
        <input
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={handlePhotoInputChange}
          ref={photoInputRef}
          type="file"
        />
      </header>

      {relationsQuery.isLoading ? (
        <div className="grid gap-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      ) : null}

      {relationsQuery.isError ? (
        <ErrorState
          title="Nao foi possivel carregar a ficha completa."
          description={getUserSafeErrorMessage(relationsQuery.error)}
          onRetry={() => void relationsQuery.refetch()}
        />
      ) : null}

      {relations ? (
        <div className="grid gap-4">
          <div className="overflow-x-auto">
            <Tabs>
              {[
                { label: 'Visao geral', value: 'overview' },
                { label: 'Responsaveis', value: 'guardians' },
                { label: 'Matriculas', value: 'enrollments' },
                { label: 'Frequencia', value: 'attendance' },
                { label: 'Financeiro', value: 'billing' },
                { label: 'Historico', value: 'history' },
              ].map((tab) => (
                <TabButton
                  isActive={activeTab === tab.value}
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                >
                  {tab.label}
                </TabButton>
              ))}
            </Tabs>
          </div>

          {activeTab === 'overview' ? <OverviewTab relations={relations} student={student} /> : null}
          {activeTab === 'guardians' ? <GuardiansTab guardians={relations.guardians} /> : null}
          {activeTab === 'enrollments' ? <EnrollmentsTab enrollments={relations.enrollments} /> : null}
          {activeTab === 'attendance' ? <AttendanceTab records={relations.attendanceRecords} /> : null}
          {activeTab === 'billing' ? (
            <BillingTab
              billingPlans={relations.billingPlans}
              onRegisterPayment={setPaymentFee}
              studentId={student.id}
            />
          ) : null}
          {activeTab === 'history' ? <HistoryTab events={relations.auditEvents} /> : null}
        </div>
      ) : null}

      <PaymentDrawer fee={paymentFee} onClose={() => setPaymentFee(null)} />

      <PhotoConfirmOverlay
        file={pendingPhotoFile}
        isLoading={uploadPhotoMutation.isPending}
        onCancel={() => setPendingPhotoFile(null)}
        onConfirm={() => void confirmPhotoUpload()}
        student={student}
      />
    </div>
  )
}

function PhotoConfirmOverlay({
  file,
  isLoading,
  onCancel,
  onConfirm,
  student,
}: {
  file: File | null
  isLoading: boolean
  onCancel: () => void
  onConfirm: () => void
  student: StudentRow
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }

    const nextPreviewUrl = URL.createObjectURL(file)
    setPreviewUrl(nextPreviewUrl)

    return () => URL.revokeObjectURL(nextPreviewUrl)
  }, [file])

  return (
    <Overlay isOpen={Boolean(file)} onClose={onCancel} title="Alterar foto">
      {file ? (
        <div className="grid gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="h-28 w-28 shrink-0 overflow-hidden rounded-full border border-primary/20 bg-primary/10">
              {previewUrl ? <img alt="" className="h-full w-full object-cover" src={previewUrl} /> : null}
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{student.full_name}</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                A foto sera recortada em formato quadrado e otimizada antes de salvar.
              </p>
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button onClick={onCancel} variant="secondary">
              Cancelar
            </Button>
            <Button isLoading={isLoading} onClick={onConfirm}>
              Confirmar foto
            </Button>
          </div>
        </div>
      ) : null}
    </Overlay>
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

function OverviewTab({
  relations,
  student,
}: {
  relations: {
    billingPlans: BillingPlanWithGuardian[]
    enrollments: EnrollmentWithClass[]
    guardians: StudentGuardianLink[]
  }
  student: StudentRow
}) {
  const currentEnrollment = relations.enrollments.find((enrollment) => enrollment.status === 'active')
  const primaryGuardian = relations.guardians.find((guardian) => guardian.is_primary_contact)
  const billingPlan = relations.billingPlans.find((plan) => plan.status === 'active')
  const netAmount = billingPlan
    ? Number(billingPlan.base_amount) - Number(billingPlan.discount_amount)
    : null

  return (
    <section className="grid gap-4 rounded-md border border-border bg-background p-4 text-sm">
      <InfoRow
        label="Turma atual"
        value={
          currentEnrollment?.class
            ? `${currentEnrollment.class.name} - ${formatSchedules(currentEnrollment.class.class_schedules)}`
            : 'Turma nao vinculada'
        }
      />
      <InfoRow
        label="Responsavel principal"
        value={
          primaryGuardian?.guardian
            ? `${primaryGuardian.guardian.full_name}${primaryGuardian.guardian.phone ? ` - ${primaryGuardian.guardian.phone}` : ''}`
            : 'Responsavel nao informado'
        }
      />
      <InfoRow
        label="Mensalidade"
        value={
          billingPlan && netAmount !== null
            ? `${formatMoney(netAmount)} - vencimento dia ${billingPlan.due_day}`
            : 'Mensalidade nao configurada'
        }
      />
      <InfoRow label="Data de matricula" value={formatStudentDate(student.enrollment_date)} />
      <div>
        <p className="font-medium text-foreground">Observacoes</p>
        <p className="mt-1 leading-6 text-muted-foreground">{student.notes ?? 'Nenhuma observacao registrada.'}</p>
      </div>
    </section>
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

function GuardiansTab({ guardians }: { guardians: StudentGuardianLink[] }) {
  if (guardians.length === 0) {
    return <EmptyPanel title="Responsavel nao informado" description="Este aluno ainda nao possui responsavel vinculado." />
  }

  return (
    <div className="grid gap-3">
      {guardians.map((link) => {
        const whatsapp = normalizePhoneForWhatsApp(link.guardian?.phone ?? null)

        return (
          <article className="rounded-md border border-border bg-background p-4" key={link.guardian_id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-foreground">{link.guardian?.full_name ?? 'Responsavel'}</h3>
                <p className="text-sm text-muted-foreground">{link.relationship}</p>
              </div>
              <div className="flex flex-wrap justify-end gap-1">
                {link.is_primary_contact ? <Badge tone="primary">Principal</Badge> : null}
                {link.is_financial_responsible ? <Badge tone="success">Financeiro</Badge> : null}
                {link.can_pick_up ? <Badge tone="neutral">Pode buscar</Badge> : null}
                {link.is_emergency_contact ? <Badge tone="warning">Emergencia</Badge> : null}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              {link.guardian?.phone ? (
                <>
                  <Button
                    leftIcon={<Copy className="h-4 w-4" aria-hidden />}
                    onClick={() => void navigator.clipboard?.writeText(link.guardian?.phone ?? '')}
                    size="sm"
                    variant="secondary"
                  >
                    Copiar telefone
                  </Button>
                  {whatsapp ? (
                    <Button
                      leftIcon={<MessageCircle className="h-4 w-4" aria-hidden />}
                      onClick={() => window.open(`https://wa.me/${whatsapp}`, '_blank', 'noopener,noreferrer')}
                      size="sm"
                      variant="secondary"
                    >
                      WhatsApp
                    </Button>
                  ) : null}
                </>
              ) : null}
              {link.guardian?.email ? <span className="text-muted-foreground">{link.guardian.email}</span> : null}
            </div>
          </article>
        )
      })}
    </div>
  )
}

function EnrollmentsTab({ enrollments }: { enrollments: EnrollmentWithClass[] }) {
  if (enrollments.length === 0) {
    return <EmptyPanel title="Turma nao vinculada" description="Este aluno ainda nao possui matricula em turma." />
  }

  return (
    <div className="grid gap-3">
      {enrollments.map((enrollment) => (
        <article className="rounded-md border border-border bg-background p-4" key={enrollment.id}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-foreground">{enrollment.class?.name ?? 'Turma'}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {enrollment.class ? formatSchedules(enrollment.class.class_schedules) : 'Horario nao informado'}
              </p>
            </div>
            <Badge tone={getEnrollmentStatusTone(enrollment.status)}>
              {getEnrollmentStatusLabel(enrollment.status)}
            </Badge>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">Inicio: {formatStudentDate(enrollment.start_date)}</p>
        </article>
      ))}
    </div>
  )
}

function BillingTab({
  billingPlans,
  onRegisterPayment,
  studentId,
}: {
  billingPlans: BillingPlanWithGuardian[]
  onRegisterPayment: (fee: MonthlyFeeListRow) => void
  studentId: string
}) {
  const [page, setPage] = useState(1)
  const referenceMonth = useMemo(() => getCurrentReferenceMonth(), [])
  const snapshotQuery = useStudentBillingSnapshot({ page, pageSize: 5, referenceMonth, studentId })
  const snapshot = snapshotQuery.data

  if (billingPlans.length === 0) {
    return <EmptyPanel title="Mensalidade nao configurada" description="Este aluno ainda nao possui plano financeiro." />
  }

  if (snapshotQuery.isLoading && !snapshotQuery.data) {
    return (
      <div className="grid gap-3">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-44 w-full" />
      </div>
    )
  }

  if (snapshotQuery.isError) {
    return (
      <ErrorState
        title="Nao foi possivel carregar o financeiro."
        description={getUserSafeErrorMessage(snapshotQuery.error)}
        onRetry={() => void snapshotQuery.refetch()}
      />
    )
  }

  const currentFee = snapshot?.current_fee
  const recentFees = snapshot?.recent_fees ?? []
  const totalPages = Math.max(1, Math.ceil((snapshot?.total_count ?? 0) / 5))

  return (
    <div className="grid gap-3">
      {billingPlans.map((plan, index) => {
        const netAmount = Number(plan.base_amount) - Number(plan.discount_amount)

        return (
          <article className="rounded-md border border-border bg-background p-4" key={plan.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-foreground">{index === 0 ? 'Plano financeiro atual' : 'Plano financeiro anterior'}</h3>
                <p className="mt-1 text-2xl font-semibold text-primary">{formatMoney(netAmount)}</p>
              </div>
              <Badge tone={getBillingPlanStatusTone(plan.status)}>
                {getBillingPlanStatusLabel(plan.status)}
              </Badge>
            </div>
            <dl className="mt-4 grid gap-2 text-sm">
              <InfoRow label="Valor base" value={formatMoney(plan.base_amount)} />
              <InfoRow label="Desconto" value={formatMoney(plan.discount_amount)} />
              <InfoRow label="Vencimento" value={`Dia ${plan.due_day}`} />
              <InfoRow label="Responsavel financeiro" value={plan.financial_guardian?.full_name ?? 'Nao informado'} />
              <InfoRow label="Inicio" value={formatStudentDate(plan.billing_start_date)} />
            </dl>
          </article>
        )
      })}

      <section className="grid gap-3 rounded-md border border-border bg-background p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="font-semibold text-foreground">Mensalidade do mes atual</h3>
            <p className="mt-1 text-sm text-muted-foreground">Status calculado a partir dos pagamentos confirmados.</p>
          </div>
          <Button onClick={() => { window.location.href = '/mensalidades' }} size="sm" variant="secondary">
            Ver todas
          </Button>
        </div>

        {currentFee ? (
          <div className="grid gap-3">
            <div className="flex flex-col gap-3 rounded border border-border bg-surface p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-foreground">{formatBillingMoney(currentFee.final_amount)}</p>
                  <Badge tone={getMonthlyFeeStatusTone(currentFee)}>{getMonthlyFeeStatusLabel(currentFee)}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pago {formatBillingMoney(currentFee.amount_paid)} - Saldo {formatBillingMoney(currentFee.balance)}
                </p>
              </div>
              <Button
                disabled={currentFee.balance <= 0 || currentFee.lifecycle_status === 'cancelled'}
                onClick={() => onRegisterPayment(currentFee)}
                size="sm"
                variant="secondary"
              >
                Registrar pagamento
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded border border-dashed border-border bg-surface p-4 text-sm">
            <p className="font-semibold text-foreground">Mensalidade do mes ainda nao gerada</p>
            <p className="mt-1 text-muted-foreground">Use a tela Mensalidades para gerar as cobrancas do mes.</p>
          </div>
        )}
      </section>

      <section className="grid gap-3 rounded-md border border-border bg-background p-4">
        <h3 className="font-semibold text-foreground">Ultimas mensalidades</h3>
        {recentFees.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma mensalidade gerada para este aluno.</p>
        ) : (
          <ol className="grid gap-2">
            {recentFees.map((fee) => (
              <li className="flex items-center justify-between gap-3 rounded border border-border bg-surface p-3" key={fee.monthly_fee_id}>
                <div>
                  <p className="font-medium text-foreground">
                    {fee.reference_month.slice(5, 7)}/{fee.reference_month.slice(0, 4)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatBillingMoney(fee.final_amount)} - saldo {formatBillingMoney(fee.balance)}
                  </p>
                </div>
                <Badge tone={getMonthlyFeeStatusTone(fee)}>{getMonthlyFeeStatusLabel(fee)}</Badge>
              </li>
            ))}
          </ol>
        )}
        {totalPages > 1 ? (
          <div className="flex items-center justify-between gap-3 text-sm">
            <Button disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} size="sm" variant="secondary">
              Anteriores
            </Button>
            <span className="text-muted-foreground">{page} de {totalPages}</span>
            <Button disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} size="sm" variant="secondary">
              Proximas
            </Button>
          </div>
        ) : null}
      </section>
    </div>
  )
}

function AttendanceTab({ records }: { records: AttendanceRecordWithSession[] }) {
  if (records.length === 0) {
    return <EmptyPanel title="Frequencia nao registrada" description="Este aluno ainda nao possui chamadas salvas." />
  }

  const present = records.filter((record) => record.status === 'present').length
  const attendanceRate = Math.round((present / records.length) * 100)

  return (
    <section className="grid gap-4">
      <div className="rounded-md border border-border bg-background p-4 text-sm">
        <p className="text-muted-foreground">Taxa de presenca</p>
        <p className="mt-1 text-3xl font-semibold text-foreground">{attendanceRate}%</p>
        <p className="mt-1 text-muted-foreground">
          {present} presenca{present === 1 ? '' : 's'} em {records.length} chamada{records.length === 1 ? '' : 's'} registrada{records.length === 1 ? '' : 's'}.
        </p>
      </div>

      <div className="grid gap-3">
        {records.map((record) => (
          <article className="rounded-md border border-border bg-background p-4" key={record.id}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="font-semibold text-foreground">{record.session?.class?.name ?? 'Turma'}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {record.session
                    ? `${formatStudentDate(record.session.session_date)} - ${formatTimeRange(record.session.start_time, record.session.end_time)}`
                    : 'Aula nao encontrada'}
                </p>
              </div>
              <Badge tone={record.status === 'present' ? 'success' : record.status === 'excused' ? 'warning' : 'danger'}>
                {attendanceStatusLabels[record.status]}
              </Badge>
            </div>
            {record.notes ? <p className="mt-3 text-sm text-muted-foreground">{record.notes}</p> : null}
          </article>
        ))}
      </div>
    </section>
  )
}

function HistoryTab({ events }: { events: AuditEventRow[] }) {
  const labels = useMemo(
    () => ({
      'billing_plan.created': 'Mensalidade configurada',
      'enrollment.created': 'Matricula em turma criada',
      'enrollment.ended': 'Matricula encerrada',
      'enrollment.transferred': 'Matricula transferida',
      'attendance.recorded': 'Frequencia registrada',
      'attendance.updated': 'Frequencia atualizada',
      'guardian.linked': 'Responsavel vinculado',
      'guardian.linked_to_student': 'Responsavel vinculado',
      'guardian.relationship_updated': 'Vinculo com responsavel atualizado',
      'guardian.unlinked_from_student': 'Responsavel desvinculado',
      'student.created': 'Aluno cadastrado',
      'student.updated': 'Aluno atualizado',
      'student.archived': 'Aluno arquivado',
      'student.restored': 'Aluno restaurado',
    }),
    [],
  )

  if (events.length === 0) {
    return <EmptyPanel title="Historico vazio" description="Nenhum evento administrativo registrado para este aluno." />
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

function EmptyPanel({ description, title }: { description: string; title: string }) {
  return (
    <div className="rounded-md border border-dashed border-border bg-background p-6 text-sm">
      <h3 className="font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-muted-foreground">{description}</p>
    </div>
  )
}
