import { zodResolver } from '@hookform/resolvers/zod'
import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { getUserSafeErrorMessage } from '@/lib/errors/AppError'
import { useToast } from '@/shared/components/feedback/Toast'
import { Button } from '@/shared/components/ui/Button'
import { Select } from '@/shared/components/ui/FormControls'
import { Overlay } from '@/shared/components/ui/Overlay'
import { useDebouncedValue } from '@/features/students/hooks/useDebouncedValue'
import { GuardianContactFields } from '@/features/guardians/components/GuardianContactFields'
import {
  createGuardianSchema,
  getCreateGuardianDefaults,
  type CreateGuardianValues,
} from '@/features/guardians/schemas/guardianSchema'
import {
  useCreateGuardian,
  useGuardianDuplicateCandidates,
  useStudentSearchForGuardianLink,
} from '@/features/guardians/hooks/useGuardians'

type CreateGuardianDrawerProps = {
  isOpen: boolean
  onClose: () => void
  onCreated: (guardianId: string) => void
  onUseExisting: (guardianId: string) => void
}

export function CreateGuardianDrawer({
  isOpen,
  onClose,
  onCreated,
  onUseExisting,
}: CreateGuardianDrawerProps) {
  const [isLinkingNow, setIsLinkingNow] = useState(false)
  const [ignoreDuplicates, setIgnoreDuplicates] = useState(false)
  const mutation = useCreateGuardian()
  const { notify } = useToast()
  const form = useForm<CreateGuardianValues>({
    defaultValues: getCreateGuardianDefaults(),
    resolver: zodResolver(createGuardianSchema),
  })
  const values = form.watch()
  const duplicateQuery = useGuardianDuplicateCandidates({
    email: values.email,
    phone: values.phone,
  })
  const duplicateCandidates = ignoreDuplicates ? [] : duplicateQuery.data ?? []

  useEffect(() => {
    if (isOpen) {
      form.reset(getCreateGuardianDefaults())
      setIgnoreDuplicates(false)
      setIsLinkingNow(false)
    }
  }, [form, isOpen])

  function requestClose() {
    if (form.formState.isDirty && !window.confirm('Descartar o responsavel em andamento?')) {
      return
    }

    onClose()
  }

  async function handleSubmit(submittedValues: CreateGuardianValues) {
    try {
      const guardianId = await mutation.mutateAsync({
        ...submittedValues,
        link_now: isLinkingNow,
      })
      notify({ title: 'Responsavel cadastrado.', tone: 'success' })
      onCreated(guardianId)
      onClose()
    } catch (error) {
      notify({
        title: 'Nao foi possivel salvar as alteracoes.',
        description: getUserSafeErrorMessage(error),
        tone: 'error',
      })
    }
  }

  return (
    <Overlay isOpen={isOpen} onClose={requestClose} side="wide" title="Novo responsavel">
      <form className="grid gap-5" onSubmit={form.handleSubmit(handleSubmit)}>
        <GuardianContactFields form={form} />

        {duplicateCandidates.length > 0 ? (
          <section className="rounded-md border border-warning/30 bg-warning/10 p-4">
            <h3 className="text-sm font-semibold text-foreground">
              Encontramos um possivel responsavel ja cadastrado.
            </h3>
            <div className="mt-3 grid gap-2">
              {duplicateCandidates.map((guardian) => (
                <div className="flex flex-col gap-3 rounded border border-border bg-surface p-3 sm:flex-row sm:items-center sm:justify-between" key={guardian.guardian_id}>
                  <div>
                    <p className="font-medium text-foreground">{guardian.full_name}</p>
                    <p className="text-sm text-muted-foreground">{guardian.phone ?? guardian.email ?? 'Contato nao informado'}</p>
                  </div>
                  <Button onClick={() => onUseExisting(guardian.guardian_id)} size="sm" type="button" variant="secondary">
                    Usar existente
                  </Button>
                </div>
              ))}
            </div>
            <Button className="mt-3" onClick={() => setIgnoreDuplicates(true)} size="sm" type="button" variant="ghost">
              Continuar novo cadastro
            </Button>
          </section>
        ) : null}

        <section className="grid gap-3 rounded-md border border-border bg-background p-4">
          <label className="inline-flex min-h-10 items-center gap-2 text-sm font-medium">
            <input
              checked={isLinkingNow}
              className="h-4 w-4 accent-primary"
              onChange={(event) => {
                setIsLinkingNow(event.target.checked)
                form.setValue('link_now', event.target.checked, { shouldDirty: true })
              }}
              type="checkbox"
            />
            Vincular a aluno agora
          </label>
          {isLinkingNow ? (
            <PendingStudentLinkFields form={form} />
          ) : (
            <p className="text-sm text-muted-foreground">O responsavel pode ser vinculado depois pela ficha.</p>
          )}
        </section>

        <footer className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
          <Button onClick={requestClose} type="button" variant="secondary">
            Cancelar
          </Button>
          <Button isLoading={mutation.isPending} type="submit">
            Cadastrar responsavel
          </Button>
        </footer>
      </form>
    </Overlay>
  )
}

function PendingStudentLinkFields({ form }: { form: ReturnType<typeof useForm<CreateGuardianValues>> }) {
  const [studentSearch, setStudentSearch] = useState('')
  const debouncedSearch = useDebouncedValue(studentSearch, 300)
  const studentsQuery = useStudentSearchForGuardianLink(debouncedSearch)
  const selectedStudentId = form.watch('student_link.student_id')
  const selectedStudent = studentsQuery.data?.find((student) => student.id === selectedStudentId)
  const errors = form.formState.errors.student_link

  return (
    <div className="grid gap-4 border-t border-border pt-4">
      <label className="grid gap-1.5 text-sm font-medium text-foreground">
        <span>Selecionar aluno</span>
        <span className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            className="h-10 w-full rounded border border-border bg-surface pl-9 pr-3 text-sm"
            onChange={(event) => setStudentSearch(event.target.value)}
            placeholder="Nome do aluno"
            type="search"
            value={studentSearch}
          />
        </span>
      </label>

      <div className="grid max-h-44 gap-2 overflow-y-auto">
        {(studentsQuery.data ?? []).map((student) => (
          <button
            className={
              selectedStudentId === student.id
                ? 'rounded border border-primary bg-primary/10 p-3 text-left text-sm'
                : 'rounded border border-border bg-surface p-3 text-left text-sm hover:bg-muted'
            }
            key={student.id}
            onClick={() => form.setValue('student_link.student_id', student.id, { shouldDirty: true, shouldValidate: true })}
            type="button"
          >
            <span className="font-medium text-foreground">{student.full_name}</span>
            {student.preferred_name ? <span className="ml-2 text-muted-foreground">{student.preferred_name}</span> : null}
          </button>
        ))}
      </div>

      {selectedStudent ? (
        <p className="text-sm text-muted-foreground">Selecionado: {selectedStudent.full_name}</p>
      ) : null}
      {errors?.student_id?.message ? <p className="text-xs font-medium text-danger">{errors.student_id.message}</p> : null}

      <Select label="Parentesco" {...form.register('student_link.relationship')}>
        {['Mae', 'Pai', 'Avo materna', 'Avo paterno', 'Tutor', 'Outro'].map((relationship) => (
          <option key={relationship} value={relationship}>
            {relationship}
          </option>
        ))}
      </Select>

      <div className="grid gap-2 sm:grid-cols-2">
        <PendingFlag form={form} name="student_link.is_primary_contact" label="Contato principal" />
        <PendingFlag form={form} name="student_link.is_financial_responsible" label="Responsavel financeiro" />
        <PendingFlag form={form} name="student_link.can_pick_up" label="Autorizado a buscar" />
        <PendingFlag form={form} name="student_link.is_emergency_contact" label="Contato de emergencia" />
      </div>
    </div>
  )
}

function PendingFlag({
  form,
  label,
  name,
}: {
  form: ReturnType<typeof useForm<CreateGuardianValues>>
  label: string
  name:
    | 'student_link.can_pick_up'
    | 'student_link.is_emergency_contact'
    | 'student_link.is_financial_responsible'
    | 'student_link.is_primary_contact'
}) {
  const checked = form.watch(name)

  return (
    <label className="inline-flex min-h-10 items-center gap-2 rounded border border-border bg-surface px-3 text-sm font-medium">
      <input
        checked={checked}
        className="h-4 w-4 accent-primary"
        onChange={(event) => form.setValue(name, event.target.checked, { shouldDirty: true })}
        type="checkbox"
      />
      {label}
    </label>
  )
}
