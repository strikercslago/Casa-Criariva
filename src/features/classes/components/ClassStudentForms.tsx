import { zodResolver } from '@hookform/resolvers/zod'
import { Search } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { getUserSafeErrorMessage } from '@/lib/errors/AppError'
import { useToast } from '@/shared/components/feedback/Toast'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { useDebouncedValue } from '@/features/students/hooks/useDebouncedValue'
import { getTodayIsoDate } from '@/features/students/utils/studentDates'
import {
  enrollmentActionSchema,
  transferEnrollmentSchema,
  type EnrollmentActionValues,
  type TransferEnrollmentValues,
} from '@/features/classes/schemas/classSchema'
import type { EnrollmentWithStudent } from '@/features/classes/types/classTypes'
import {
  useAddStudentToClass,
  useClassesList,
  useStudentSearchForClass,
  useTransferStudentClass,
} from '@/features/classes/hooks/useClasses'

export function AddStudentToClassForm({
  classId,
  onCancel,
  onSaved,
}: {
  classId: string
  onCancel: () => void
  onSaved: () => void
}) {
  const [studentSearch, setStudentSearch] = useState('')
  const debouncedSearch = useDebouncedValue(studentSearch, 300)
  const studentsQuery = useStudentSearchForClass(debouncedSearch)
  const mutation = useAddStudentToClass(classId)
  const { notify } = useToast()
  const form = useForm<EnrollmentActionValues>({
    defaultValues: { date: getTodayIsoDate(), student_id: '' },
    resolver: zodResolver(enrollmentActionSchema),
  })
  const selectedStudentId = form.watch('student_id')

  async function handleSubmit(values: EnrollmentActionValues) {
    try {
      await mutation.mutateAsync({ startDate: values.date, studentId: values.student_id })
      notify({ title: 'Aluno adicionado a turma.', tone: 'success' })
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
      <StudentPicker
        onSearchChange={setStudentSearch}
        onSelect={(studentId) => form.setValue('student_id', studentId, { shouldDirty: true, shouldValidate: true })}
        search={studentSearch}
        selectedStudentId={selectedStudentId}
        students={studentsQuery.data ?? []}
      />
      {form.formState.errors.student_id?.message ? (
        <p className="text-xs font-medium text-danger">{form.formState.errors.student_id.message}</p>
      ) : null}
      <Input error={form.formState.errors.date?.message} label="Data de inicio" type="date" {...form.register('date')} />
      <ActionFooter isLoading={mutation.isPending} onCancel={onCancel} submitLabel="Adicionar aluno" />
    </form>
  )
}

export function TransferStudentForm({
  enrollment,
  sourceClassId,
  onCancel,
  onSaved,
}: {
  enrollment: EnrollmentWithStudent
  sourceClassId: string
  onCancel: () => void
  onSaved: () => void
}) {
  const classesQuery = useClassesList({
    capacity: 'with_spots',
    page: 1,
    pageSize: 50,
    search: '',
    status: 'active',
  })
  const mutation = useTransferStudentClass(sourceClassId)
  const { notify } = useToast()
  const form = useForm<TransferEnrollmentValues>({
    defaultValues: { target_class_id: '', transfer_date: getTodayIsoDate() },
    resolver: zodResolver(transferEnrollmentSchema),
  })
  const availableClasses = (classesQuery.data?.classes ?? []).filter((classItem) => classItem.class_id !== sourceClassId)

  async function handleSubmit(values: TransferEnrollmentValues) {
    try {
      await mutation.mutateAsync({
        enrollmentId: enrollment.id,
        studentId: enrollment.student_id,
        targetClassId: values.target_class_id,
        transferDate: values.transfer_date,
      })
      notify({ title: 'Aluno transferido.', tone: 'success' })
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
      <div className="rounded-md border border-border bg-background p-3 text-sm">
        <p className="text-muted-foreground">Aluno</p>
        <p className="mt-1 font-semibold text-foreground">{enrollment.student?.full_name ?? 'Aluno'}</p>
      </div>
      <label className="grid gap-1.5 text-sm font-medium text-foreground">
        <span>Nova turma</span>
        <select className="h-10 rounded border border-border bg-surface px-3 text-sm" {...form.register('target_class_id')}>
          <option value="">Selecionar...</option>
          {availableClasses.map((classItem) => (
            <option key={classItem.class_id} value={classItem.class_id}>
              {classItem.name}
            </option>
          ))}
        </select>
      </label>
      {form.formState.errors.target_class_id?.message ? (
        <p className="text-xs font-medium text-danger">{form.formState.errors.target_class_id.message}</p>
      ) : null}
      <Input
        error={form.formState.errors.transfer_date?.message}
        label="Data da transferencia"
        type="date"
        {...form.register('transfer_date')}
      />
      <ActionFooter isLoading={mutation.isPending} onCancel={onCancel} submitLabel="Transferir aluno" />
    </form>
  )
}

function StudentPicker({
  onSearchChange,
  onSelect,
  search,
  selectedStudentId,
  students,
}: {
  onSearchChange: (value: string) => void
  onSelect: (studentId: string) => void
  search: string
  selectedStudentId: string
  students: Array<{ full_name: string; id: string; preferred_name: string | null }>
}) {
  return (
    <section className="grid gap-3">
      <label className="grid gap-1.5 text-sm font-medium text-foreground">
        <span>Pesquisar aluno ativo</span>
        <span className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            className="h-10 w-full rounded border border-border bg-surface pl-9 pr-3 text-sm"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Nome do aluno"
            type="search"
            value={search}
          />
        </span>
      </label>
      <div className="grid max-h-48 gap-2 overflow-y-auto">
        {students.map((student) => (
          <button
            className={
              selectedStudentId === student.id
                ? 'rounded border border-primary bg-primary/10 p-3 text-left text-sm'
                : 'rounded border border-border bg-surface p-3 text-left text-sm hover:bg-muted'
            }
            key={student.id}
            onClick={() => onSelect(student.id)}
            type="button"
          >
            <span className="font-medium text-foreground">{student.full_name}</span>
            {student.preferred_name ? <span className="ml-2 text-muted-foreground">{student.preferred_name}</span> : null}
          </button>
        ))}
      </div>
    </section>
  )
}

function ActionFooter({
  isLoading,
  onCancel,
  submitLabel,
}: {
  isLoading: boolean
  onCancel: () => void
  submitLabel: string
}) {
  return (
    <footer className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <Button onClick={onCancel} type="button" variant="secondary">
        Cancelar
      </Button>
      <Button isLoading={isLoading} type="submit">
        {submitLabel}
      </Button>
    </footer>
  )
}
