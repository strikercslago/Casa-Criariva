import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, ArrowRight, Check, Plus, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { getUserSafeErrorMessage } from '@/lib/errors/AppError'
import { useToast } from '@/shared/components/feedback/Toast'
import { Button } from '@/shared/components/ui/Button'
import { Textarea, Select } from '@/shared/components/ui/FormControls'
import { IconButton } from '@/shared/components/ui/IconButton'
import { Input } from '@/shared/components/ui/Input'
import { Overlay } from '@/shared/components/ui/Overlay'
import {
  enrollmentWizardSchema,
  getEnrollmentWizardDefaults,
  type EnrollmentWizardValues,
} from '@/features/students/schemas/enrollmentWizardSchema'
import { StudentPhotoPicker } from '@/features/students/components/StudentPhotoPicker'
import {
  useClassesForEnrollment,
  useCompleteStudentEnrollment,
  useGuardianCandidates,
} from '@/features/students/hooks/useStudent360'
import { useUploadStudentPhoto } from '@/features/students/hooks/useStudentPhotos'
import type { GuardianRow } from '@/features/students/types/student360Types'
import { formatMoney, formatSchedules, getWeekdayLabel } from '@/features/students/utils/student360Format'

const steps = ['Aluno', 'Responsaveis', 'Turma', 'Mensalidade', 'Revisar'] as const
const weekdays = [1, 2, 3, 4, 5, 6, 7]

type EnrollmentWizardProps = {
  isOpen: boolean
  onClose: () => void
  onCompleted: (studentId: string) => void
}

export function EnrollmentWizard({ isOpen, onClose, onCompleted }: EnrollmentWizardProps) {
  const [step, setStep] = useState(0)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const classesQuery = useClassesForEnrollment()
  const completeMutation = useCompleteStudentEnrollment()
  const uploadPhotoMutation = useUploadStudentPhoto()
  const { notify } = useToast()
  const form = useForm<EnrollmentWizardValues>({
    defaultValues: getEnrollmentWizardDefaults(),
    resolver: zodResolver(enrollmentWizardSchema),
  })
  const guardiansArray = useFieldArray({ control: form.control, name: 'guardians' })
  const values = form.watch()
  const selectedClass = classesQuery.data?.find((classItem) => classItem.id === values.class_step.class_id)
  const financialGuardianOptions = values.guardians.filter(
    (guardian) => guardian.full_name.trim().length > 0,
  )

  useEffect(() => {
    if (isOpen) {
      setStep(0)
      setSubmitError(null)
      setPhotoFile(null)
      form.reset(getEnrollmentWizardDefaults())
    }
  }, [form, isOpen])

  function requestClose() {
    if (form.formState.isDirty && !window.confirm('Descartar a matricula em andamento?')) {
      return
    }

    onClose()
  }

  async function goNext() {
    const fieldsByStep: Array<Array<keyof EnrollmentWizardValues>> = [
      ['student'],
      ['guardians'],
      ['class_step'],
      ['billing'],
      [],
    ]
    const fields = fieldsByStep[step]
    const isValid = fields.length === 0 ? true : await form.trigger(fields)

    if (isValid) {
      setStep((current) => Math.min(steps.length - 1, current + 1))
    }
  }

  async function submitEnrollment() {
    const isValid = await form.trigger()

    if (!isValid) {
      setStep(0)
      return
    }

    setSubmitError(null)

    try {
      const result = await completeMutation.mutateAsync(form.getValues())

      if (photoFile) {
        try {
          await uploadPhotoMutation.mutateAsync({ file: photoFile, studentId: result.studentId })
        } catch (photoError) {
          notify({
            title: 'Aluno cadastrado, mas nao foi possivel enviar a foto.',
            description: 'Voce pode adiciona-la depois.',
            tone: 'info',
          })
          console.warn('[student-photo] post-enrollment upload failed', {
            reason: getUserSafeErrorMessage(photoError),
          })
        }
      }

      notify({ title: 'Matricula concluida com sucesso.', tone: 'success' })
      onCompleted(result.studentId)
      onClose()
    } catch (error) {
      setSubmitError(getUserSafeErrorMessage(error))
    }
  }

  function addGuardian() {
    guardiansArray.append({
      can_pick_up: true,
      email: null,
      full_name: '',
      guardian_id: null,
      is_emergency_contact: true,
      is_financial_responsible: guardiansArray.fields.length === 0,
      is_primary_contact: guardiansArray.fields.length === 0,
      notes: null,
      phone: '',
      relationship: 'Mae',
    })
  }

  return (
    <Overlay isOpen={isOpen} onClose={requestClose} side="wide" title="Matricula completa">
      <div className="grid gap-5">
        <ol className="grid grid-cols-5 gap-1 text-xs font-semibold text-muted-foreground">
          {steps.map((label, index) => (
            <li
              className={index === step ? 'rounded bg-primary px-2 py-2 text-center text-primary-foreground' : 'rounded bg-muted px-2 py-2 text-center'}
              key={label}
            >
              {index + 1}. {label}
            </li>
          ))}
        </ol>

        <div className="min-h-[420px]">
          {step === 0 ? <StudentStep form={form} photoFile={photoFile} setPhotoFile={setPhotoFile} /> : null}
          {step === 1 ? (
            <GuardiansStep
              addGuardian={addGuardian}
              form={form}
              guardiansArray={guardiansArray}
            />
          ) : null}
          {step === 2 ? (
            <ClassStep
              classes={classesQuery.data ?? []}
              form={form}
              isLoading={classesQuery.isLoading}
              selectedClass={selectedClass}
            />
          ) : null}
          {step === 3 ? (
            <BillingStep
              financialGuardianOptions={financialGuardianOptions}
              form={form}
            />
          ) : null}
          {step === 4 ? (
            <ReviewStep
              selectedClass={selectedClass}
              values={values}
            />
          ) : null}
        </div>

        {submitError ? (
          <div className="rounded-md border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
            Nao foi possivel concluir a matricula. {submitError}
          </div>
        ) : null}

        <footer className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <Button onClick={requestClose} type="button" variant="secondary">
            Cancelar
          </Button>

          <div className="flex gap-2">
            <Button
              disabled={step === 0}
              leftIcon={<ArrowLeft className="h-4 w-4" aria-hidden />}
              onClick={() => setStep((current) => Math.max(0, current - 1))}
              type="button"
              variant="secondary"
            >
              Voltar
            </Button>
            {step < steps.length - 1 ? (
              <Button
                onClick={() => void goNext()}
                rightIcon={<ArrowRight className="h-4 w-4" aria-hidden />}
                type="button"
              >
                Proximo
              </Button>
            ) : (
              <Button
                isLoading={completeMutation.isPending || uploadPhotoMutation.isPending}
                leftIcon={<Check className="h-4 w-4" aria-hidden />}
                onClick={() => void submitEnrollment()}
                type="button"
              >
                {completeMutation.isPending || uploadPhotoMutation.isPending ? 'Concluindo matricula...' : 'Concluir matricula'}
              </Button>
            )}
          </div>
        </footer>
      </div>
    </Overlay>
  )
}

function StudentStep({
  form,
  photoFile,
  setPhotoFile,
}: {
  form: ReturnType<typeof useForm<EnrollmentWizardValues>>
  photoFile: File | null
  setPhotoFile: (file: File | null) => void
}) {
  const errors = form.formState.errors.student
  const studentName = form.watch('student.full_name')

  return (
    <section className="grid gap-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Aluno</h2>
        <p className="mt-1 text-sm text-muted-foreground">Dados minimos para abrir uma matricula.</p>
      </div>

      <StudentPhotoPicker file={photoFile} onChange={setPhotoFile} studentName={studentName} />

      <Input
        error={errors?.full_name?.message}
        label="Nome completo *"
        {...form.register('student.full_name')}
      />
      <Input
        error={errors?.preferred_name?.message}
        label="Nome preferido"
        {...form.register('student.preferred_name')}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          error={errors?.birth_date?.message}
          label="Data de nascimento"
          type="date"
          {...form.register('student.birth_date')}
        />
        <Input
          error={errors?.enrollment_date?.message}
          label="Data de matricula *"
          type="date"
          {...form.register('student.enrollment_date')}
        />
      </div>
      <Textarea label="Observacoes internas" {...form.register('student.notes')} />
    </section>
  )
}

function GuardiansStep({
  addGuardian,
  form,
  guardiansArray,
}: {
  addGuardian: () => void
  form: ReturnType<typeof useForm<EnrollmentWizardValues>>
  guardiansArray: ReturnType<typeof useFieldArray<EnrollmentWizardValues, 'guardians'>>
}) {
  return (
    <section className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Responsaveis</h2>
          <p className="mt-1 text-sm text-muted-foreground">Adicione um ou mais responsaveis quando houver dados.</p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" aria-hidden />} onClick={addGuardian} type="button" variant="secondary">
          Adicionar responsavel
        </Button>
      </div>

      {guardiansArray.fields.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
          Responsavel ainda nao informado. Voce pode concluir a matricula mesmo assim.
        </div>
      ) : null}

      {guardiansArray.fields.map((field, index) => (
        <GuardianEditor
          form={form}
          index={index}
          key={field.id}
          onRemove={() => guardiansArray.remove(index)}
        />
      ))}
    </section>
  )
}

function GuardianEditor({
  form,
  index,
  onRemove,
}: {
  form: ReturnType<typeof useForm<EnrollmentWizardValues>>
  index: number
  onRemove: () => void
}) {
  const guardianErrors = form.formState.errors.guardians?.[index]
  const guardianId = form.watch(`guardians.${index}.guardian_id`)

  function useExistingGuardian(guardian: GuardianRow) {
    form.setValue(`guardians.${index}.guardian_id`, guardian.id, { shouldDirty: true })
    form.setValue(`guardians.${index}.full_name`, guardian.full_name, { shouldDirty: true })
    form.setValue(`guardians.${index}.phone`, guardian.phone ?? '', { shouldDirty: true })
    form.setValue(`guardians.${index}.email`, guardian.email, { shouldDirty: true })
  }

  return (
    <article className="grid gap-4 rounded-md border border-border bg-background p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">Responsavel {index + 1}</h3>
        <IconButton className="h-8 w-8" label="Remover responsavel" onClick={onRemove}>
          <Trash2 className="h-4 w-4" aria-hidden />
        </IconButton>
      </div>

      {guardianId ? (
        <div className="rounded border border-primary/30 bg-primary/10 p-3 text-sm text-primary">
          Responsavel existente selecionado.
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Input
          error={guardianErrors?.full_name?.message}
          label="Nome completo *"
          {...form.register(`guardians.${index}.full_name`)}
        />
        <Select label="Parentesco" {...form.register(`guardians.${index}.relationship`)}>
          {['Mae', 'Pai', 'Avo materna', 'Avo paterno', 'Tutor', 'Outro'].map((relationship) => (
            <option key={relationship} value={relationship}>
              {relationship}
            </option>
          ))}
        </Select>
        <Input
          error={guardianErrors?.phone?.message}
          label="Celular / WhatsApp *"
          {...form.register(`guardians.${index}.phone`)}
        />
        <Input
          error={guardianErrors?.email?.message}
          label="E-mail"
          type="email"
          {...form.register(`guardians.${index}.email`)}
        />
      </div>

      <GuardianCandidates form={form} index={index} onUseGuardian={useExistingGuardian} />

      <div className="grid gap-2 sm:grid-cols-2">
        <FlagCheckbox form={form} index={index} name="is_primary_contact" label="Contato principal" />
        <FlagCheckbox form={form} index={index} name="is_financial_responsible" label="Responsavel financeiro" />
        <FlagCheckbox form={form} index={index} name="can_pick_up" label="Autorizado a buscar" />
        <FlagCheckbox form={form} index={index} name="is_emergency_contact" label="Contato de emergencia" />
      </div>
    </article>
  )
}

function GuardianCandidates({
  form,
  index,
  onUseGuardian,
}: {
  form: ReturnType<typeof useForm<EnrollmentWizardValues>>
  index: number
  onUseGuardian: (guardian: GuardianRow) => void
}) {
  const phone = form.watch(`guardians.${index}.phone`)
  const email = form.watch(`guardians.${index}.email`)
  const candidatesQuery = useGuardianCandidates({ email, phone })
  const candidates = candidatesQuery.data ?? []

  if (candidates.length === 0) {
    return null
  }

  return (
    <div className="rounded-md border border-warning/30 bg-warning/10 p-3">
      <p className="text-sm font-semibold text-foreground">Encontramos um responsavel existente</p>
      <div className="mt-2 grid gap-2">
        {candidates.map((guardian) => (
          <div className="flex items-center justify-between gap-3 rounded bg-surface p-2" key={guardian.id}>
            <div className="min-w-0 text-sm">
              <p className="font-medium text-foreground">{guardian.full_name}</p>
              <p className="text-muted-foreground">{guardian.phone ?? guardian.email ?? 'Contato nao informado'}</p>
            </div>
            <Button onClick={() => onUseGuardian(guardian)} size="sm" type="button" variant="secondary">
              Usar este responsavel
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

function FlagCheckbox({
  form,
  index,
  label,
  name,
}: {
  form: ReturnType<typeof useForm<EnrollmentWizardValues>>
  index: number
  label: string
  name: 'can_pick_up' | 'is_emergency_contact' | 'is_financial_responsible' | 'is_primary_contact'
}) {
  const checked = form.watch(`guardians.${index}.${name}`)

  return (
    <label className="inline-flex min-h-10 items-center gap-2 rounded border border-border bg-surface px-3 text-sm font-medium">
      <input
        checked={checked}
        className="h-4 w-4 accent-primary"
        onChange={(event) => form.setValue(`guardians.${index}.${name}`, event.target.checked, { shouldDirty: true })}
        type="checkbox"
      />
      {label}
    </label>
  )
}

function ClassStep({
  classes,
  form,
  isLoading,
  selectedClass,
}: {
  classes: Array<{ id: string; name: string; capacity: number | null; class_schedules: Array<{ weekday: number; start_time: string; end_time: string }> }>
  form: ReturnType<typeof useForm<EnrollmentWizardValues>>
  isLoading: boolean
  selectedClass?: { class_schedules: Array<{ weekday: number; start_time: string; end_time: string }>; capacity: number | null; name: string } | null
}) {
  const mode = form.watch('class_step.mode')
  const selectedWeekdays = form.watch('class_step.quick_weekdays')

  return (
    <section className="grid gap-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Turma</h2>
        <p className="mt-1 text-sm text-muted-foreground">Vincule agora ou deixe para depois.</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {[
          { label: 'Sem turma agora', value: 'none' },
          { label: 'Selecionar turma', value: 'existing' },
          { label: 'Criar turma rapida', value: 'quick' },
        ].map((option) => (
          <button
            className={mode === option.value ? 'min-h-10 rounded border border-primary bg-primary px-3 text-sm font-medium text-primary-foreground' : 'min-h-10 rounded border border-border bg-surface px-3 text-sm font-medium'}
            key={option.value}
            onClick={() => form.setValue('class_step.mode', option.value as EnrollmentWizardValues['class_step']['mode'], { shouldDirty: true })}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>

      {mode === 'existing' ? (
        <div className="grid gap-4">
          <Select disabled={isLoading} label="Turma" {...form.register('class_step.class_id')}>
            <option value="">Selecionar...</option>
            {classes.map((classItem) => (
              <option key={classItem.id} value={classItem.id}>
                {classItem.name}
              </option>
            ))}
          </Select>
          {selectedClass ? (
            <div className="rounded-md border border-border bg-background p-3 text-sm">
              <p className="font-semibold text-foreground">{selectedClass.name}</p>
              <p className="mt-1 text-muted-foreground">{formatSchedules(selectedClass.class_schedules)}</p>
              {selectedClass.capacity ? <p className="mt-1 text-muted-foreground">Capacidade: {selectedClass.capacity}</p> : null}
            </div>
          ) : null}
          <Input label="Data de inicio na turma" type="date" {...form.register('class_step.start_date')} />
        </div>
      ) : null}

      {mode === 'quick' ? (
        <div className="grid gap-4 rounded-md border border-border bg-background p-4">
          <Input label="Nome da turma" {...form.register('class_step.quick_name')} />
          <Input label="Capacidade" min={1} type="number" {...form.register('class_step.quick_capacity')} />
          <div>
            <p className="text-sm font-medium text-foreground">Dias</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {weekdays.map((weekday) => {
                const value = String(weekday)
                const checked = selectedWeekdays.includes(value)

                return (
                  <button
                    className={checked ? 'rounded border border-primary bg-primary px-3 py-2 text-sm font-medium text-primary-foreground' : 'rounded border border-border bg-surface px-3 py-2 text-sm font-medium'}
                    key={weekday}
                    onClick={() => {
                      form.setValue(
                        'class_step.quick_weekdays',
                        checked
                          ? selectedWeekdays.filter((item) => item !== value)
                          : [...selectedWeekdays, value],
                        { shouldDirty: true },
                      )
                    }}
                    type="button"
                  >
                    {getWeekdayLabel(weekday)}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Horario inicial" type="time" {...form.register('class_step.quick_start_time')} />
            <Input label="Horario final" type="time" {...form.register('class_step.quick_end_time')} />
          </div>
          <Input label="Data de inicio na turma" type="date" {...form.register('class_step.start_date')} />
        </div>
      ) : null}
    </section>
  )
}

function BillingStep({
  financialGuardianOptions,
  form,
}: {
  financialGuardianOptions: EnrollmentWizardValues['guardians']
  form: ReturnType<typeof useForm<EnrollmentWizardValues>>
}) {
  const enabled = form.watch('billing.enabled')
  const baseAmount = Number(form.watch('billing.base_amount') || '0')
  const discountAmount = Number(form.watch('billing.discount_amount') || '0')
  const finalAmount = Math.max(0, baseAmount - discountAmount)

  return (
    <section className="grid gap-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Mensalidade</h2>
        <p className="mt-1 text-sm text-muted-foreground">Configure o plano de cobranca, sem gerar mensalidades futuras agora.</p>
      </div>

      <label className="inline-flex min-h-10 items-center gap-2 rounded border border-border bg-surface px-3 text-sm font-medium">
        <input
          checked={enabled}
          className="h-4 w-4 accent-primary"
          onChange={(event) => form.setValue('billing.enabled', event.target.checked, { shouldDirty: true })}
          type="checkbox"
        />
        Configurar mensalidade agora
      </label>

      {enabled ? (
        <div className="grid gap-4 rounded-md border border-border bg-background p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Valor da mensalidade" min={0} step="0.01" type="number" {...form.register('billing.base_amount')} />
            <Input label="Desconto" min={0} step="0.01" type="number" {...form.register('billing.discount_amount')} />
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/10 p-3">
            <p className="text-sm text-muted-foreground">Valor final</p>
            <p className="text-2xl font-semibold text-primary">{formatMoney(finalAmount)}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Dia do vencimento" max={31} min={1} type="number" {...form.register('billing.due_day')} />
            <Input label="Inicio da cobranca" type="date" {...form.register('billing.billing_start_date')} />
          </div>
          <Select label="Responsavel financeiro" {...form.register('billing.financial_guardian_id')}>
            <option value="">Usar responsavel marcado como financeiro</option>
            {financialGuardianOptions.map((guardian, index) => (
              <option key={`${guardian.full_name}-${index}`} value={guardian.guardian_id ?? ''}>
                {guardian.full_name}
              </option>
            ))}
          </Select>
          <Textarea label="Motivo do desconto" {...form.register('billing.discount_reason')} />
          <label className="inline-flex min-h-10 items-center gap-2 text-sm font-medium">
            <input
              checked={form.watch('billing.auto_generate_fees')}
              className="h-4 w-4 accent-primary"
              onChange={(event) => form.setValue('billing.auto_generate_fees', event.target.checked, { shouldDirty: true })}
              type="checkbox"
            />
            Gerar mensalidades automaticamente quando o modulo financeiro estiver ativo
          </label>
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
          Mensalidade ainda nao configurada.
        </div>
      )}
    </section>
  )
}

function ReviewStep({
  selectedClass,
  values,
}: {
  selectedClass?: { class_schedules: Array<{ weekday: number; start_time: string; end_time: string }>; name: string } | null
  values: EnrollmentWizardValues
}) {
  const baseAmount = Number(values.billing.base_amount || '0')
  const discountAmount = Number(values.billing.discount_amount || '0')
  const finalAmount = Math.max(0, baseAmount - discountAmount)
  const classSummary =
    values.class_step.mode === 'existing'
      ? selectedClass?.name
      : values.class_step.mode === 'quick'
        ? values.class_step.quick_name
        : null

  return (
    <section className="grid gap-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Revisar</h2>
        <p className="mt-1 text-sm text-muted-foreground">Confira antes de concluir a matricula.</p>
      </div>

      <ReviewBlock title="Aluno">
        <p className="font-semibold text-foreground">{values.student.full_name || 'Nome nao informado'}</p>
        <p>Nascimento: {values.student.birth_date ?? 'Nao informado'}</p>
        <p>Matricula: {values.student.enrollment_date}</p>
      </ReviewBlock>

      <ReviewBlock title="Responsaveis">
        {values.guardians.length === 0 ? (
          <p>Responsavel ainda nao informado.</p>
        ) : (
          values.guardians.map((guardian, index) => (
            <p key={`${guardian.full_name}-${index}`}>
              {guardian.full_name} - {guardian.relationship}
              {guardian.is_financial_responsible ? ' - Financeiro' : ''}
              {guardian.can_pick_up ? ' - Pode buscar' : ''}
            </p>
          ))
        )}
      </ReviewBlock>

      <ReviewBlock title="Turma">
        {classSummary ? (
          <>
            <p className="font-semibold text-foreground">{classSummary}</p>
            <p>
              {values.class_step.mode === 'existing' && selectedClass
                ? formatSchedules(selectedClass.class_schedules)
                : values.class_step.quick_weekdays.map((weekday) => getWeekdayLabel(Number(weekday))).join(', ')}
            </p>
          </>
        ) : (
          <p>Aluno ainda nao esta vinculado a uma turma.</p>
        )}
      </ReviewBlock>

      <ReviewBlock title="Financeiro">
        {values.billing.enabled ? (
          <>
            <p>{formatMoney(finalAmount)} por mes</p>
            <p>Vencimento: dia {values.billing.due_day}</p>
            <p>Inicio: {values.billing.billing_start_date}</p>
          </>
        ) : (
          <p>Mensalidade ainda nao configurada.</p>
        )}
      </ReviewBlock>
    </section>
  )
}

function ReviewBlock({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="rounded-md border border-border bg-background p-4 text-sm leading-6 text-muted-foreground">
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-normal text-foreground">{title}</h3>
      {children}
    </section>
  )
}
