import { zodResolver } from '@hookform/resolvers/zod'
import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { getUserSafeErrorMessage } from '@/lib/errors/AppError'
import { useToast } from '@/shared/components/feedback/Toast'
import { Button } from '@/shared/components/ui/Button'
import { Select } from '@/shared/components/ui/FormControls'
import { useDebouncedValue } from '@/features/students/hooks/useDebouncedValue'
import type { GuardianStudentLink } from '@/features/guardians/types/guardianTypes'
import {
  getGuardianRelationshipDefaults,
  guardianRelationshipSchema,
  type GuardianRelationshipValues,
} from '@/features/guardians/schemas/guardianSchema'
import {
  useStudentSearchForGuardianLink,
  useUpsertGuardianStudentLink,
} from '@/features/guardians/hooks/useGuardians'

type GuardianRelationshipFormProps = {
  guardianId: string
  initialLink?: GuardianStudentLink | null
  onCancel: () => void
  onSaved: () => void
}

export function GuardianRelationshipForm({
  guardianId,
  initialLink,
  onCancel,
  onSaved,
}: GuardianRelationshipFormProps) {
  const [studentSearch, setStudentSearch] = useState('')
  const debouncedSearch = useDebouncedValue(studentSearch, 300)
  const studentsQuery = useStudentSearchForGuardianLink(debouncedSearch)
  const mutation = useUpsertGuardianStudentLink(guardianId)
  const { notify } = useToast()
  const form = useForm<GuardianRelationshipValues>({
    defaultValues: initialLink
      ? {
          can_pick_up: initialLink.can_pick_up,
          is_emergency_contact: initialLink.is_emergency_contact,
          is_financial_responsible: initialLink.is_financial_responsible,
          is_primary_contact: initialLink.is_primary_contact,
          relationship: initialLink.relationship,
          student_id: initialLink.student_id,
        }
      : getGuardianRelationshipDefaults(),
    resolver: zodResolver(guardianRelationshipSchema),
  })
  const selectedStudentId = form.watch('student_id')
  const selectedStudent =
    initialLink?.student ?? studentsQuery.data?.find((student) => student.id === selectedStudentId) ?? null

  useEffect(() => {
    if (initialLink) {
      form.reset({
        can_pick_up: initialLink.can_pick_up,
        is_emergency_contact: initialLink.is_emergency_contact,
        is_financial_responsible: initialLink.is_financial_responsible,
        is_primary_contact: initialLink.is_primary_contact,
        relationship: initialLink.relationship,
        student_id: initialLink.student_id,
      })
    }
  }, [form, initialLink])

  async function handleSubmit(values: GuardianRelationshipValues) {
    try {
      await mutation.mutateAsync(values)
      notify({ title: initialLink ? 'Vinculo atualizado.' : 'Aluno vinculado.', tone: 'success' })
      onSaved()
    } catch (error) {
      notify({
        title: 'Nao foi possivel salvar as alteracoes.',
        description: getUserSafeErrorMessage(error),
        tone: 'error',
      })
    }
  }

  return (
    <form className="grid gap-4" onSubmit={form.handleSubmit(handleSubmit)}>
      {!initialLink ? (
        <section className="grid gap-3">
          <label className="grid gap-1.5 text-sm font-medium text-foreground">
            <span>Pesquisar aluno existente</span>
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
          <div className="grid max-h-48 gap-2 overflow-y-auto">
            {(studentsQuery.data ?? []).map((student) => (
              <button
                className={
                  selectedStudentId === student.id
                    ? 'rounded border border-primary bg-primary/10 p-3 text-left text-sm'
                    : 'rounded border border-border bg-surface p-3 text-left text-sm hover:bg-muted'
                }
                key={student.id}
                onClick={() => form.setValue('student_id', student.id, { shouldDirty: true, shouldValidate: true })}
                type="button"
              >
                <span className="font-medium text-foreground">{student.full_name}</span>
                {student.preferred_name ? (
                  <span className="ml-2 text-muted-foreground">{student.preferred_name}</span>
                ) : null}
              </button>
            ))}
          </div>
          {form.formState.errors.student_id?.message ? (
            <p className="text-xs font-medium text-danger">{form.formState.errors.student_id.message}</p>
          ) : null}
        </section>
      ) : (
        <div className="rounded-md border border-border bg-background p-3 text-sm">
          <p className="text-muted-foreground">Aluno</p>
          <p className="mt-1 font-semibold text-foreground">{selectedStudent?.full_name ?? 'Aluno selecionado'}</p>
        </div>
      )}

      <Select label="Parentesco" {...form.register('relationship')}>
        {['Mae', 'Pai', 'Avo materna', 'Avo paterno', 'Tutor', 'Outro'].map((relationship) => (
          <option key={relationship} value={relationship}>
            {relationship}
          </option>
        ))}
      </Select>

      <div className="grid gap-2 sm:grid-cols-2">
        <FlagCheckbox form={form} name="is_primary_contact" label="Contato principal" />
        <FlagCheckbox form={form} name="is_financial_responsible" label="Responsavel financeiro" />
        <FlagCheckbox form={form} name="can_pick_up" label="Autorizado a buscar" />
        <FlagCheckbox form={form} name="is_emergency_contact" label="Contato de emergencia" />
      </div>

      <footer className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button onClick={onCancel} type="button" variant="secondary">
          Cancelar
        </Button>
        <Button isLoading={mutation.isPending} type="submit">
          Salvar vinculo
        </Button>
      </footer>
    </form>
  )
}

function FlagCheckbox({
  form,
  label,
  name,
}: {
  form: ReturnType<typeof useForm<GuardianRelationshipValues>>
  label: string
  name: 'can_pick_up' | 'is_emergency_contact' | 'is_financial_responsible' | 'is_primary_contact'
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
