import { Badge } from '@/shared/components/ui/Badge'
import type { ClassStatus } from '@/features/classes/types/classTypes'
import { getClassStatusLabel } from '@/features/classes/utils/classStatus'

export function ClassStatusBadge({ status }: { status: ClassStatus }) {
  return <Badge tone={status === 'active' ? 'success' : status === 'archived' ? 'danger' : 'neutral'}>{getClassStatusLabel(status)}</Badge>
}
