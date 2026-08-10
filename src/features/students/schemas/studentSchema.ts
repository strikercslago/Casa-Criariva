import { z } from 'zod'
import type { StudentStatus } from '@/features/students/types/studentTypes'
import { getTodayIsoDate } from '@/features/students/utils/studentDates'

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null))
  .nullable()

const optionalDate = z
  .string()
  .transform((value) => (value.trim().length > 0 ? value : null))
  .nullable()
  .refine((value) => value === null || /^\d{4}-\d{2}-\d{2}$/.test(value), {
    message: 'Use uma data valida.',
  })

export const studentFormSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(1, 'Informe o nome do aluno.')
      .min(2, 'Informe pelo menos 2 caracteres.')
      .max(160, 'Use no maximo 160 caracteres.'),
    preferred_name: optionalText.refine((value) => value === null || value.length <= 80, {
      message: 'Use no maximo 80 caracteres.',
    }),
    birth_date: optionalDate,
    enrollment_date: z
      .string()
      .min(1, 'Informe a data de matricula.')
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use uma data valida.'),
    status: z.enum(['active', 'inactive']) satisfies z.ZodType<Exclude<StudentStatus, 'archived'>>,
    notes: optionalText.refine((value) => value === null || value.length <= 2000, {
      message: 'Use no maximo 2000 caracteres.',
    }),
  })
  .refine((value) => value.birth_date === null || value.birth_date <= getTodayIsoDate(), {
    message: 'A data de nascimento nao pode ser futura.',
    path: ['birth_date'],
  })

export type StudentFormValues = z.infer<typeof studentFormSchema>

export function getStudentFormDefaults(): StudentFormValues {
  return {
    birth_date: null,
    enrollment_date: getTodayIsoDate(),
    full_name: '',
    notes: null,
    preferred_name: null,
    status: 'active',
  }
}
