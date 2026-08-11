import { z } from 'zod'

const nullableTrimmedText = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null))
  .nullable()

const optionalPhone = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null))
  .nullable()
  .refine((value) => value === null || (value.length >= 8 && value.length <= 32), {
    message: 'Informe um telefone valido.',
  })

const optionalEmail = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value.toLowerCase() : null))
  .nullable()
  .refine((value) => value === null || z.string().email().safeParse(value).success, {
    message: 'Informe um e-mail valido.',
  })

export const guardianContactSchema = z.object({
  email: optionalEmail,
  full_name: z
    .string()
    .trim()
    .min(1, 'Informe o nome do responsavel.')
    .min(2, 'Informe pelo menos 2 caracteres.')
    .max(160, 'Use no maximo 160 caracteres.'),
  notes: nullableTrimmedText,
  phone: optionalPhone,
})

export const guardianRelationshipSchema = z.object({
  can_pick_up: z.boolean(),
  is_emergency_contact: z.boolean(),
  is_financial_responsible: z.boolean(),
  is_primary_contact: z.boolean(),
  relationship: z.string().trim().min(2, 'Informe o parentesco.').max(60),
  student_id: z.string().min(1, 'Selecione um aluno.'),
})

const optionalGuardianRelationshipSchema = guardianRelationshipSchema.extend({
  student_id: z.string(),
})

export const createGuardianSchema = guardianContactSchema.extend({
  link_now: z.boolean(),
  student_link: optionalGuardianRelationshipSchema,
}).superRefine((value, context) => {
  if (!value.link_now) {
    return
  }

  const result = guardianRelationshipSchema.safeParse(value.student_link)

  if (!result.success) {
    result.error.issues.forEach((issue) => {
      context.addIssue({ ...issue, path: ['student_link', ...issue.path] })
    })
  }
})

export type GuardianContactValues = z.infer<typeof guardianContactSchema>
export type GuardianRelationshipValues = z.infer<typeof guardianRelationshipSchema>
export type CreateGuardianValues = z.infer<typeof createGuardianSchema>

export function getGuardianContactDefaults(): GuardianContactValues {
  return {
    email: null,
    full_name: '',
    notes: null,
    phone: null,
  }
}

export function getGuardianRelationshipDefaults(): GuardianRelationshipValues {
  return {
    can_pick_up: true,
    is_emergency_contact: true,
    is_financial_responsible: false,
    is_primary_contact: true,
    relationship: 'Mae',
    student_id: '',
  }
}

export function getCreateGuardianDefaults(): CreateGuardianValues {
  return {
    ...getGuardianContactDefaults(),
    link_now: false,
    student_link: getGuardianRelationshipDefaults(),
  }
}
