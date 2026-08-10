import { zodResolver } from '@hookform/resolvers/zod'
import { Save } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/shared/components/ui/Button'
import { Textarea, Select } from '@/shared/components/ui/FormControls'
import { Input } from '@/shared/components/ui/Input'
import {
  getStudentFormDefaults,
  studentFormSchema,
  type StudentFormValues,
} from '@/features/students/schemas/studentSchema'
import type { StudentRow } from '@/features/students/types/studentTypes'
import { editableStudentStatusOptions } from '@/features/students/utils/studentStatus'

type StudentFormProps = {
  mode: 'create' | 'edit'
  isSubmitting: boolean
  student?: StudentRow | null
  onCancel: () => void
  onSubmit: (values: StudentFormValues) => void
}

export function StudentForm({ mode, isSubmitting, student, onCancel, onSubmit }: StudentFormProps) {
  const form = useForm<StudentFormValues>({
    defaultValues: student ? toFormValues(student) : getStudentFormDefaults(),
    resolver: zodResolver(studentFormSchema),
  })

  useEffect(() => {
    form.reset(student ? toFormValues(student) : getStudentFormDefaults())
  }, [form, student])

  return (
    <form className="grid gap-4" onSubmit={form.handleSubmit((values) => onSubmit(values))}>
      <Input
        autoComplete="off"
        error={form.formState.errors.full_name?.message}
        label="Nome completo *"
        {...form.register('full_name')}
      />

      <Input
        autoComplete="off"
        error={form.formState.errors.preferred_name?.message}
        label="Nome preferido"
        {...form.register('preferred_name')}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          error={form.formState.errors.birth_date?.message}
          label="Data de nascimento"
          type="date"
          {...form.register('birth_date')}
        />
        <Input
          error={form.formState.errors.enrollment_date?.message}
          label="Data de matricula *"
          type="date"
          {...form.register('enrollment_date')}
        />
      </div>

      {mode === 'edit' ? (
        <Select
          disabled={student?.status === 'archived'}
          label="Status"
          {...form.register('status')}
        >
          {editableStudentStatusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      ) : null}

      <Textarea
        label="Observacoes"
        placeholder="Notas internas sobre o aluno"
        {...form.register('notes')}
      />
      {form.formState.errors.notes ? (
        <p className="-mt-2 text-xs font-medium text-danger">{form.formState.errors.notes.message}</p>
      ) : null}

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button onClick={onCancel} type="button" variant="secondary">
          Cancelar
        </Button>
        <Button
          isLoading={isSubmitting}
          leftIcon={<Save className="h-4 w-4" aria-hidden />}
          type="submit"
        >
          {mode === 'create' ? 'Cadastrar' : 'Salvar'}
        </Button>
      </div>
    </form>
  )
}

function toFormValues(student: StudentRow): StudentFormValues {
  return {
    birth_date: student.birth_date,
    enrollment_date: student.enrollment_date,
    full_name: student.full_name,
    notes: student.notes,
    preferred_name: student.preferred_name,
    status: student.status === 'archived' ? 'active' : student.status,
  }
}
