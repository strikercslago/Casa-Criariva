import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  completeStudentEnrollment,
  getStudent360Data,
  listClassesForEnrollment,
  searchGuardianCandidates,
} from '@/features/students/api/student360Api'
import { student360Keys } from '@/features/students/hooks/student360Keys'
import { studentsKeys } from '@/features/students/hooks/studentsKeys'
import type { EnrollmentWizardValues } from '@/features/students/schemas/enrollmentWizardSchema'

const STUDENT_360_STALE_TIME_MS = 90_000

export function useGuardianCandidates(params: { email?: string | null; phone?: string | null }) {
  const hasLookup =
    Boolean(params.phone && params.phone.trim().length >= 8) ||
    Boolean(params.email && params.email.trim().length > 0)

  return useQuery({
    enabled: hasLookup,
    queryFn: () => searchGuardianCandidates(params),
    queryKey: student360Keys.guardians.candidates(params),
    staleTime: STUDENT_360_STALE_TIME_MS,
  })
}

export function useClassesForEnrollment() {
  return useQuery({
    queryFn: listClassesForEnrollment,
    queryKey: student360Keys.classes.list(),
    staleTime: STUDENT_360_STALE_TIME_MS,
  })
}

export function useStudent360Data(studentId: string | null) {
  return useQuery({
    enabled: Boolean(studentId),
    queryFn: () => getStudent360Data(studentId ?? ''),
    queryKey: student360Keys.relations.detail(studentId ?? 'none'),
    staleTime: STUDENT_360_STALE_TIME_MS,
  })
}

export function useCompleteStudentEnrollment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (values: EnrollmentWizardValues) => completeStudentEnrollment(values),
    onSuccess: ({ studentId }) => {
      void queryClient.invalidateQueries({ queryKey: studentsKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: student360Keys.classes.list() })
      void queryClient.invalidateQueries({ queryKey: student360Keys.relations.detail(studentId) })
    },
  })
}
