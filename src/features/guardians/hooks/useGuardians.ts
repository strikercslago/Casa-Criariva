import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createGuardian,
  getGuardianDetail,
  listGuardians,
  searchGuardianDuplicates,
  searchStudentsForGuardianLink,
  unlinkGuardianStudent,
  updateGuardianContact,
  upsertGuardianStudentLink,
} from '@/features/guardians/api/guardiansApi'
import { guardiansKeys } from '@/features/guardians/hooks/guardiansKeys'
import type {
  GuardianDetail,
  GuardianListFilters,
  GuardianRelationshipPayload,
} from '@/features/guardians/types/guardianTypes'
import type {
  GuardianContactValues,
  GuardianRelationshipValues,
} from '@/features/guardians/schemas/guardianSchema'
import { student360Keys } from '@/features/students/hooks/student360Keys'
import { studentsKeys } from '@/features/students/hooks/studentsKeys'

const GUARDIANS_STALE_TIME_MS = 90_000

export function useGuardiansList(filters: GuardianListFilters) {
  return useQuery({
    placeholderData: keepPreviousData,
    queryFn: () => listGuardians(filters),
    queryKey: guardiansKeys.list(filters),
    staleTime: GUARDIANS_STALE_TIME_MS,
  })
}

export function useGuardianDetail(guardianId: string | null) {
  return useQuery({
    enabled: Boolean(guardianId),
    queryFn: () => getGuardianDetail(guardianId ?? ''),
    queryKey: guardiansKeys.detail(guardianId ?? 'none'),
    staleTime: GUARDIANS_STALE_TIME_MS,
  })
}

export function useGuardianDuplicateCandidates(params: {
  currentGuardianId?: string | null
  email?: string | null
  phone?: string | null
}) {
  const hasLookup =
    Boolean(params.phone && params.phone.replace(/\D/g, '').length >= 8) ||
    Boolean(params.email && params.email.trim().length > 0)

  return useQuery({
    enabled: hasLookup,
    queryFn: () => searchGuardianDuplicates(params),
    queryKey: guardiansKeys.duplicates(params.phone ?? null, params.email ?? null),
    staleTime: GUARDIANS_STALE_TIME_MS,
  })
}

export function useStudentSearchForGuardianLink(search: string) {
  return useQuery({
    queryFn: () => searchStudentsForGuardianLink(search),
    queryKey: guardiansKeys.students.search(search),
    staleTime: GUARDIANS_STALE_TIME_MS,
  })
}

export function useCreateGuardian() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createGuardian,
    onSuccess: (guardianId, values) => {
      void queryClient.invalidateQueries({ queryKey: guardiansKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: guardiansKeys.detail(guardianId) })

      if (values.link_now && values.student_link.student_id) {
        invalidateStudentRelations(queryClient, values.student_link.student_id)
      }
    },
  })
}

export function useUpdateGuardianContact(guardianId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (values: GuardianContactValues) => updateGuardianContact(guardianId, values),
    onSuccess: () => {
      const cachedGuardian = queryClient.getQueryData<GuardianDetail>(guardiansKeys.detail(guardianId))

      void queryClient.invalidateQueries({ queryKey: guardiansKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: guardiansKeys.detail(guardianId) })

      cachedGuardian?.links.forEach((link) => invalidateStudentRelations(queryClient, link.student_id))
    },
  })
}

export function useUpsertGuardianStudentLink(guardianId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (values: GuardianRelationshipValues) => upsertGuardianStudentLink(guardianId, values),
    onSuccess: (_result, values) => {
      void queryClient.invalidateQueries({ queryKey: guardiansKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: guardiansKeys.detail(guardianId) })
      invalidateStudentRelations(queryClient, values.student_id)
    },
  })
}

export function useUnlinkGuardianStudent(guardianId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (studentId: string) => unlinkGuardianStudent(guardianId, studentId),
    onSuccess: (_result, studentId) => {
      void queryClient.invalidateQueries({ queryKey: guardiansKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: guardiansKeys.detail(guardianId) })
      invalidateStudentRelations(queryClient, studentId)
    },
  })
}

function invalidateStudentRelations(
  queryClient: ReturnType<typeof useQueryClient>,
  studentId: GuardianRelationshipPayload['student_id'],
) {
  void queryClient.invalidateQueries({ queryKey: studentsKeys.detail(studentId) })
  void queryClient.invalidateQueries({ queryKey: student360Keys.relations.detail(studentId) })
}
