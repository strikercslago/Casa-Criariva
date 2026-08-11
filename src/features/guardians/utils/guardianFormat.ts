import type { GuardianLinkedStudentSummary, GuardianStudentLink } from '@/features/guardians/types/guardianTypes'

export function normalizePhoneDigits(phone: string | null) {
  return phone?.replace(/\D/g, '') ?? ''
}

export function normalizePhoneForWhatsApp(phone: string | null) {
  const digits = normalizePhoneDigits(phone)

  if (digits.length < 10) {
    return null
  }

  return digits.startsWith('55') ? digits : `55${digits}`
}

export function getGuardianRoleLabels(
  source: Pick<
    GuardianLinkedStudentSummary | GuardianStudentLink,
    'can_pick_up' | 'is_emergency_contact' | 'is_financial_responsible' | 'is_primary_contact'
  >,
) {
  const labels: string[] = []

  if (source.is_primary_contact) {
    labels.push('Principal')
  }

  if (source.is_financial_responsible) {
    labels.push('Financeiro')
  }

  if (source.can_pick_up) {
    labels.push('Retirada autorizada')
  }

  if (source.is_emergency_contact) {
    labels.push('Emergencia')
  }

  return labels
}

export function getGuardianContactLabel(phone: string | null, email: string | null) {
  if (phone && email) {
    return `${phone} - ${email}`
  }

  return phone ?? email ?? 'Contato nao informado'
}
