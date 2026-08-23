import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addStudentToClass,
  createClass,
  endClassEnrollment,
  getClassDetail,
  listClasses,
  searchStudentsForClassEnrollment,
  transferStudentClass,
  updateClass,
  updateClassStatus,
} from '@/features/classes/api/classesApi'
import { classesKeys } from '@/features/classes/hooks/classesKeys'
import type { ClassListFilters } from '@/features/classes/types/classTypes'
import type { ClassDetail } from '@/features/classes/types/classTypes'
import type { ClassFormValues } from '@/features/classes/schemas/classSchema'
import { dashboardKeys, reportsKeys } from '@/features/reports/hooks/reportsKeys'
import { student360Keys } from '@/features/students/hooks/student360Keys'
import { studentsKeys } from '@/features/students/hooks/studentsKeys'

const CLASSES_STALE_TIME_MS = 90_000

export function useClassesList(filters: ClassListFilters) {
  return useQuery({
    placeholderData: keepPreviousData,
    queryFn: () => listClasses(filters),
    queryKey: classesKeys.list(filters),
    staleTime: CLASSES_STALE_TIME_MS,
  })
}

export function useClassDetail(classId: string | null) {
  return useQuery({
    enabled: Boolean(classId),
    queryFn: () => getClassDetail(classId ?? ''),
    queryKey: classesKeys.detail(classId ?? 'none'),
    staleTime: CLASSES_STALE_TIME_MS,
  })
}

export function useStudentSearchForClass(search: string) {
  return useQuery({
    queryFn: () => searchStudentsForClassEnrollment(search),
    queryKey: classesKeys.searchStudents(search),
    staleTime: CLASSES_STALE_TIME_MS,
  })
}

export function useCreateClass() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createClass,
    onSuccess: (classId) => {
      void queryClient.invalidateQueries({ queryKey: classesKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: classesKeys.detail(classId) })
    },
  })
}

export function useUpdateClass(classId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (values: ClassFormValues) => updateClass(classId, values),
    onSuccess: () => invalidateClass(queryClient, classId),
  })
}

export function useUpdateClassStatus(classId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (status: 'active' | 'inactive' | 'archived') => updateClassStatus(classId, status),
    onSuccess: () => invalidateClass(queryClient, classId),
  })
}

export function useAddStudentToClass(classId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ startDate, studentId }: { startDate: string; studentId: string }) =>
      addStudentToClass(classId, studentId, startDate),
    onSuccess: (_enrollmentId, variables) => {
      invalidateClass(queryClient, classId)
      invalidateStudent(queryClient, variables.studentId)
    },
  })
}

export function useEndClassEnrollment(classId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ endDate, enrollmentId }: { endDate: string; enrollmentId: string; studentId: string }) =>
      endClassEnrollment(enrollmentId, endDate),
    onSuccess: (_enrollmentId, variables) => {
      queryClient.setQueryData<ClassDetail>(classesKeys.detail(classId), (current) => {
        if (!current) {
          return current
        }

        return {
          ...current,
          enrollments: current.enrollments.map((enrollment) =>
            enrollment.id === variables.enrollmentId
              ? {
                  ...enrollment,
                  end_date: variables.endDate,
                  status: 'ended',
                  updated_at: new Date().toISOString(),
                }
              : enrollment,
          ),
        }
      })
      invalidateClass(queryClient, classId)
      invalidateStudent(queryClient, variables.studentId)
    },
  })
}

export function useTransferStudentClass(sourceClassId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      enrollmentId,
      targetClassId,
      transferDate,
    }: {
      enrollmentId: string
      studentId: string
      targetClassId: string
      transferDate: string
    }) => transferStudentClass(enrollmentId, targetClassId, transferDate),
    onSuccess: (_newEnrollmentId, variables) => {
      invalidateClass(queryClient, sourceClassId)
      invalidateClass(queryClient, variables.targetClassId)
      invalidateStudent(queryClient, variables.studentId)
    },
  })
}

function invalidateClass(queryClient: ReturnType<typeof useQueryClient>, classId: string) {
  void queryClient.invalidateQueries({ queryKey: classesKeys.lists() })
  void queryClient.invalidateQueries({ queryKey: classesKeys.detail(classId) })
  void queryClient.invalidateQueries({ queryKey: dashboardKeys.todayRoot() })
  void queryClient.invalidateQueries({ queryKey: dashboardKeys.operationsRoot() })
  void queryClient.invalidateQueries({ queryKey: dashboardKeys.attentionRoot() })
  void queryClient.invalidateQueries({ queryKey: reportsKeys.all })
}

function invalidateStudent(queryClient: ReturnType<typeof useQueryClient>, studentId: string) {
  void queryClient.invalidateQueries({ queryKey: studentsKeys.detail(studentId) })
  void queryClient.invalidateQueries({ queryKey: student360Keys.relations.detail(studentId) })
}
