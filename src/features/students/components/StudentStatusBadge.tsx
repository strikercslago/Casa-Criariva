import { Badge } from '@/shared/components/ui/Badge'
import type { StudentStatus } from '@/features/students/types/studentTypes'
import {
  getStudentStatusLabel,
  getStudentStatusTone,
} from '@/features/students/utils/studentStatus'

export function StudentStatusBadge({ status }: { status: StudentStatus }) {
  return <Badge tone={getStudentStatusTone(status)}>{getStudentStatusLabel(status)}</Badge>
}
