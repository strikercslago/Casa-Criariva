import { z } from 'zod'
import { getTodayIsoDate } from '@/features/students/utils/studentDates'

const nullableTrimmedText = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null))
  .nullable()

const optionalEmail = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value.toLowerCase() : null))
  .nullable()
  .refine((value) => value === null || z.string().email().safeParse(value).success, {
    message: 'Informe um e-mail valido.',
  })

const optionalDate = z
  .string()
  .transform((value) => (value.trim().length > 0 ? value : null))
  .nullable()
  .refine((value) => value === null || /^\d{4}-\d{2}-\d{2}$/.test(value), {
    message: 'Use uma data valida.',
  })

export const enrollmentWizardSchema = z
  .object({
    student: z.object({
      birth_date: optionalDate,
      enrollment_date: z
        .string()
        .min(1, 'Informe a data de matricula.')
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use uma data valida.'),
      full_name: z
        .string()
        .trim()
        .min(1, 'Informe o nome do aluno.')
        .min(2, 'Informe pelo menos 2 caracteres.')
        .max(160, 'Use no maximo 160 caracteres.'),
      notes: nullableTrimmedText,
      preferred_name: nullableTrimmedText.refine(
        (value) => value === null || value.length <= 80,
        'Use no maximo 80 caracteres.',
      ),
    }),
    guardians: z.array(
      z.object({
        can_pick_up: z.boolean(),
        email: optionalEmail,
        full_name: z.string().trim().min(2, 'Informe o nome do responsavel.'),
        guardian_id: z.string().nullable(),
        is_emergency_contact: z.boolean(),
        is_financial_responsible: z.boolean(),
        is_primary_contact: z.boolean(),
        notes: nullableTrimmedText,
        phone: z
          .string()
          .trim()
          .min(8, 'Informe um celular valido.')
          .max(32, 'Use no maximo 32 caracteres.'),
        relationship: z.string().trim().min(2, 'Informe o parentesco.').max(60),
      }),
    ),
    class_step: z.object({
      class_id: z.string().nullable(),
      mode: z.enum(['none', 'existing', 'quick']),
      quick_capacity: z.string(),
      quick_end_time: z.string(),
      quick_name: z.string(),
      quick_start_time: z.string(),
      quick_weekdays: z.array(z.string()),
      start_date: z.string(),
    }),
    billing: z.object({
      auto_generate_fees: z.boolean(),
      base_amount: z.string(),
      billing_start_date: z.string(),
      discount_amount: z.string(),
      discount_reason: nullableTrimmedText,
      due_day: z.string(),
      enabled: z.boolean(),
      financial_guardian_id: z.string().nullable(),
    }),
  })
  .refine((value) => value.student.birth_date === null || value.student.birth_date <= getTodayIsoDate(), {
    message: 'A data de nascimento nao pode ser futura.',
    path: ['student', 'birth_date'],
  })
  .superRefine((value, context) => {
    if (value.class_step.mode === 'existing' && !value.class_step.class_id) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Selecione uma turma.',
        path: ['class_step', 'class_id'],
      })
    }

    if (value.class_step.mode === 'quick') {
      if (value.class_step.quick_name.trim().length < 2) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Informe o nome da turma.',
          path: ['class_step', 'quick_name'],
        })
      }

      if (value.class_step.quick_weekdays.length === 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Escolha pelo menos um dia.',
          path: ['class_step', 'quick_weekdays'],
        })
      }

      if (!value.class_step.quick_start_time || !value.class_step.quick_end_time) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Informe os horarios.',
          path: ['class_step', 'quick_start_time'],
        })
      }

      if (
        value.class_step.quick_start_time &&
        value.class_step.quick_end_time &&
        value.class_step.quick_end_time <= value.class_step.quick_start_time
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'O horario final deve ser depois do inicial.',
          path: ['class_step', 'quick_end_time'],
        })
      }
    }

    if (value.billing.enabled) {
      const baseAmount = Number(value.billing.base_amount)
      const discountAmount = Number(value.billing.discount_amount || '0')
      const dueDay = Number(value.billing.due_day)

      if (Number.isNaN(baseAmount) || baseAmount < 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Informe um valor valido.',
          path: ['billing', 'base_amount'],
        })
      }

      if (Number.isNaN(discountAmount) || discountAmount < 0 || discountAmount > baseAmount) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'O desconto nao pode ser maior que o valor.',
          path: ['billing', 'discount_amount'],
        })
      }

      if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Informe um dia entre 1 e 31.',
          path: ['billing', 'due_day'],
        })
      }

      if (!/^\d{4}-\d{2}-\d{2}$/.test(value.billing.billing_start_date)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Informe o inicio da cobranca.',
          path: ['billing', 'billing_start_date'],
        })
      }
    }
  })

export type EnrollmentWizardValues = z.infer<typeof enrollmentWizardSchema>

export function getEnrollmentWizardDefaults(): EnrollmentWizardValues {
  const today = getTodayIsoDate()

  return {
    billing: {
      auto_generate_fees: true,
      base_amount: '',
      billing_start_date: today,
      discount_amount: '0',
      discount_reason: null,
      due_day: '10',
      enabled: false,
      financial_guardian_id: null,
    },
    class_step: {
      class_id: null,
      mode: 'none',
      quick_capacity: '',
      quick_end_time: '15:30',
      quick_name: '',
      quick_start_time: '14:00',
      quick_weekdays: [],
      start_date: today,
    },
    guardians: [],
    student: {
      birth_date: null,
      enrollment_date: today,
      full_name: '',
      notes: null,
      preferred_name: null,
    },
  }
}
