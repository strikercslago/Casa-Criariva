import { Badge } from '@/shared/components/ui/Badge'
import type { GuardianLinkedStudentSummary, GuardianStudentLink } from '@/features/guardians/types/guardianTypes'
import { getGuardianRoleLabels } from '@/features/guardians/utils/guardianFormat'

type GuardianRoleBadgesProps = {
  source: Pick<
    GuardianLinkedStudentSummary | GuardianStudentLink,
    'can_pick_up' | 'is_emergency_contact' | 'is_financial_responsible' | 'is_primary_contact'
  >
}

export function GuardianRoleBadges({ source }: GuardianRoleBadgesProps) {
  const labels = getGuardianRoleLabels(source)

  if (labels.length === 0) {
    return <Badge tone="neutral">Sem papel principal</Badge>
  }

  return (
    <div className="flex flex-wrap gap-1">
      {labels.map((label) => (
        <Badge key={label} tone={label === 'Financeiro' ? 'success' : 'primary'}>
          {label}
        </Badge>
      ))}
    </div>
  )
}
