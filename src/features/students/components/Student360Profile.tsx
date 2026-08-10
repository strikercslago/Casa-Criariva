import { Copy, MessageCircle, Pencil, RotateCcw, Archive } from 'lucide-react'
import { useMemo, useState } from 'react'
import { getUserSafeErrorMessage } from '@/lib/errors/AppError'
import { ErrorState } from '@/shared/components/feedback/ErrorState'
import { useToast } from '@/shared/components/feedback/Toast'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import { TabButton, Tabs } from '@/shared/components/ui/Tabs'
import { StudentForm } from '@/features/students/components/StudentForm'
import { StudentStatusBadge } from '@/features/students/components/StudentStatusBadge'
import { useStudent360Data } from '@/features/students/hooks/useStudent360'
import {
  useArchiveStudent,
  useRestoreStudent,
  useUpdateStudent,
} from '@/features/students/hooks/useStudents'
import type { StudentFormValues } from '@/features/students/schemas/studentSchema'
import type {
  AuditEventRow,
  BillingPlanWithGuardian,
  EnrollmentWithClass,
  StudentGuardianLink,
} from '@/features/students/types/student360Types'
import type { StudentRow } from '@/features/students/types/studentTypes'
import { formatStudentDate } from '@/features/students/utils/studentDates'
import {
  calculateAge,
  formatMoney,
  formatSchedules,
  normalizePhoneForWhatsApp,
} from '@/features/students/utils/student360Format'

type Student360ProfileProps = {
  student: StudentRow
  onArchiveRequest: () => void
}

export function Student360Profile({ student, onArchiveRequest }: Student360ProfileProps) {
  const [isEditingStudent, setIsEditingStudent] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const relationsQuery = useStudent360Data(student.id)
  const updateMutation = useUpdateStudent()
  const archiveMutation = useArchiveStudent()
  const restoreMutation = useRestoreStudent()
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
          <div className="min-w-0">
            <h2 className="text-2xl font-semibold text-foreground">{student.full_name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {student.preferred_name ? `Nome preferido: ${student.preferred_name}` : 'Nome preferido nao informado'}
              {age !== null ? ` - ${age} anos` : ''}
            </p>
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
        </div>
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
          {activeTab === 'billing' ? <BillingTab billingPlans={relations.billingPlans} /> : null}
          {activeTab === 'history' ? <HistoryTab events={relations.auditEvents} /> : null}
        </div>
      ) : null}
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
            <Badge tone={enrollment.status === 'active' ? 'success' : 'neutral'}>{enrollment.status}</Badge>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">Inicio: {formatStudentDate(enrollment.start_date)}</p>
        </article>
      ))}
    </div>
  )
}

function BillingTab({ billingPlans }: { billingPlans: BillingPlanWithGuardian[] }) {
  if (billingPlans.length === 0) {
    return <EmptyPanel title="Mensalidade nao configurada" description="Este aluno ainda nao possui plano financeiro." />
  }

  return (
    <div className="grid gap-3">
      {billingPlans.map((plan) => {
        const netAmount = Number(plan.base_amount) - Number(plan.discount_amount)

        return (
          <article className="rounded-md border border-border bg-background p-4" key={plan.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-foreground">Mensalidade atual</h3>
                <p className="mt-1 text-2xl font-semibold text-primary">{formatMoney(netAmount)}</p>
              </div>
              <Badge tone={plan.status === 'active' ? 'success' : 'neutral'}>{plan.status}</Badge>
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
    </div>
  )
}

function HistoryTab({ events }: { events: AuditEventRow[] }) {
  const labels = useMemo(
    () => ({
      'billing_plan.created': 'Mensalidade configurada',
      'enrollment.created': 'Matricula em turma criada',
      'guardian.linked': 'Responsavel vinculado',
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
