import { z } from 'zod'
import { hasScheduleOverlap } from '@/features/classes/utils/classSchedule'

const nullableTrimmedText = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null))
  .nullable()

export const classScheduleSchema = z.object({
  end_time: z.string().min(1, 'Informe o horario final.'),
  start_time: z.string().min(1, 'Informe o horario inicial.'),
  weekday: z.coerce.number().int().min(1).max(7),
})

export const classFormSchema = z
  .object({
    capacity: z
      .string()
      .trim()
      .refine((value) => value.length === 0 || (Number.isInteger(Number(value)) && Number(value) > 0), {
        message: 'Use um numero inteiro maior que zero.',
      }),
    description: nullableTrimmedText,
    name: z.string().trim().min(2, 'Informe o nome da turma.').max(120),
    schedules: z.array(classScheduleSchema),
    status: z.enum(['active', 'inactive', 'archived']),
  })
  .superRefine((value, context) => {
    value.schedules.forEach((schedule, index) => {
      if (schedule.end_time <= schedule.start_time) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'O fim deve ser depois do inicio.',
          path: ['schedules', index, 'end_time'],
        })
      }
    })

    if (hasScheduleOverlap(value.schedules)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Existe conflito de horario dentro da mesma turma.',
        path: ['schedules'],
      })
    }
  })

export const enrollmentActionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use uma data valida.'),
  student_id: z.string().min(1, 'Selecione um aluno.'),
})

export const transferEnrollmentSchema = z.object({
  target_class_id: z.string().min(1, 'Selecione a nova turma.'),
  transfer_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use uma data valida.'),
})

export type ClassFormValues = z.infer<typeof classFormSchema>
export type EnrollmentActionValues = z.infer<typeof enrollmentActionSchema>
export type TransferEnrollmentValues = z.infer<typeof transferEnrollmentSchema>

export function getClassFormDefaults(): ClassFormValues {
  return {
    capacity: '',
    description: null,
    name: '',
    schedules: [{ end_time: '15:30', start_time: '14:00', weekday: 2 }],
    status: 'active',
  }
}
