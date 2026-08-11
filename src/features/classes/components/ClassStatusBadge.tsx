import { Badge } from '@/shared/components/ui/Badge'
import type { ClassStatus } from '@/features/classes/types/classTypes'

const labels: Record<ClassStatus, string> = {
  active: 'Ativa',
  archived: 'Arquivada',
  inactive: 'Inativa',
}

export function ClassStatusBadge({ status }: { status: ClassStatus }) {
  return <Badge tone={status === 'active' ? 'success' : status === 'archived' ? 'danger' : 'neutral'}>{labels[status]}</Badge>
}
