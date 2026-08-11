import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2 } from 'lucide-react'
import { useEffect } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { Button } from '@/shared/components/ui/Button'
import { Select, Textarea } from '@/shared/components/ui/FormControls'
import { IconButton } from '@/shared/components/ui/IconButton'
import { Input } from '@/shared/components/ui/Input'
import {
  classFormSchema,
  getClassFormDefaults,
  type ClassFormValues,
} from '@/features/classes/schemas/classSchema'
import type { ClassDetail } from '@/features/classes/types/classTypes'
import { weekdayOptions } from '@/features/classes/utils/classSchedule'

type ClassFormProps = {
  classData?: ClassDetail | null
  isSubmitting: boolean
  mode: 'create' | 'edit'
  onCancel: () => void
  onSubmit: (values: ClassFormValues) => void | Promise<void>
}

export function ClassForm({ classData, isSubmitting, mode, onCancel, onSubmit }: ClassFormProps) {
  const form = useForm<ClassFormValues>({
    defaultValues: classData ? toFormValues(classData) : getClassFormDefaults(),
    resolver: zodResolver(classFormSchema),
  })
  const schedulesArray = useFieldArray({ control: form.control, name: 'schedules' })
  const errors = form.formState.errors

  useEffect(() => {
    form.reset(classData ? toFormValues(classData) : getClassFormDefaults())
  }, [classData, form])

  return (
    <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
      <Input error={errors.name?.message} label="Nome da turma *" {...form.register('name')} />
      <Textarea label="Descricao" {...form.register('description')} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          error={errors.capacity?.message}
          label="Capacidade"
          min={1}
          type="number"
          {...form.register('capacity')}
        />
        <Select label="Status" {...form.register('status')}>
          <option value="active">Ativa</option>
          <option value="inactive">Inativa</option>
          <option value="archived">Arquivada</option>
        </Select>
      </div>

      <section className="grid gap-3 rounded-md border border-border bg-background p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Horarios recorrentes</h3>
            <p className="mt-1 text-sm text-muted-foreground">Semana ISO: segunda=1, domingo=7.</p>
          </div>
          <Button
            leftIcon={<Plus className="h-4 w-4" aria-hidden />}
            onClick={() => schedulesArray.append({ end_time: '15:30', start_time: '14:00', weekday: 2 })}
            type="button"
            variant="secondary"
          >
            Adicionar horario
          </Button>
        </div>

        {errors.schedules?.message ? (
          <p className="text-sm font-medium text-danger">{errors.schedules.message}</p>
        ) : null}

        {schedulesArray.fields.length === 0 ? (
          <div className="rounded border border-dashed border-border p-4 text-sm text-muted-foreground">
            Nenhum horario recorrente informado.
          </div>
        ) : null}

        <div className="grid gap-3">
          {schedulesArray.fields.map((field, index) => (
            <div className="grid gap-3 rounded border border-border bg-surface p-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end" key={field.id}>
              <Select label="Dia" {...form.register(`schedules.${index}.weekday`)}>
                {weekdayOptions.map((weekday) => (
                  <option key={weekday.value} value={weekday.value}>
                    {weekday.label}
                  </option>
                ))}
              </Select>
              <Input
                error={errors.schedules?.[index]?.start_time?.message}
                label="Inicio"
                type="time"
                {...form.register(`schedules.${index}.start_time`)}
              />
              <Input
                error={errors.schedules?.[index]?.end_time?.message}
                label="Fim"
                type="time"
                {...form.register(`schedules.${index}.end_time`)}
              />
              <IconButton className="h-10 w-10" label="Remover horario" onClick={() => schedulesArray.remove(index)}>
                <Trash2 className="h-4 w-4" aria-hidden />
              </IconButton>
            </div>
          ))}
        </div>
      </section>

      <footer className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button onClick={onCancel} type="button" variant="secondary">
          Cancelar
        </Button>
        <Button isLoading={isSubmitting} type="submit">
          {mode === 'create' ? 'Criar turma' : 'Salvar turma'}
        </Button>
      </footer>
    </form>
  )
}

function toFormValues(classData: ClassDetail): ClassFormValues {
  return {
    capacity: classData.capacity === null ? '' : String(classData.capacity),
    description: classData.description,
    name: classData.name,
    schedules: classData.class_schedules.map((schedule) => ({
      end_time: schedule.end_time.slice(0, 5),
      start_time: schedule.start_time.slice(0, 5),
      weekday: schedule.weekday,
    })),
    status: classData.status,
  }
}
