import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getStudentPhotoSignedUrl,
  removeStudentPhoto,
  uploadStudentPhoto,
} from '@/features/students/api/studentPhotosApi'
import { agendaKeys } from '@/features/agenda/hooks/agendaKeys'
import { classesKeys } from '@/features/classes/hooks/classesKeys'
import { student360Keys } from '@/features/students/hooks/student360Keys'
import { studentPhotoKeys } from '@/features/students/hooks/studentPhotoKeys'
import { studentsKeys } from '@/features/students/hooks/studentsKeys'
import { logStudentPhotoDiagnostic } from '@/features/students/utils/studentPhotoDiagnostics'
import type { StudentListResult, StudentRow } from '@/features/students/types/studentTypes'

const STUDENT_PHOTO_STALE_TIME_MS = 50 * 60 * 1000

export function useStudentPhotoUrl(path: string | null | undefined) {
  return useQuery({
    enabled: Boolean(path),
    queryFn: () => getStudentPhotoSignedUrl(path ?? ''),
    queryKey: studentPhotoKeys.path(path ?? 'none'),
    staleTime: STUDENT_PHOTO_STALE_TIME_MS,
    gcTime: STUDENT_PHOTO_STALE_TIME_MS,
    retry: 1,
  })
}

export function useUploadStudentPhoto() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: uploadStudentPhoto,
    onSuccess: ({ path: nextPath, studentId }, variables) => {
      updateStudentPhotoPathCache(queryClient, studentId, nextPath)
      void queryClient.invalidateQueries({ queryKey: studentPhotoKeys.path(nextPath) })
      if (variables.previousPath) {
        void queryClient.removeQueries({ queryKey: studentPhotoKeys.path(variables.previousPath) })
      }
      invalidateStudentPhotoSurfaces(queryClient, studentId)
      logStudentPhotoDiagnostic('cache-invalidated', { path: nextPath, studentId })
    },
  })
}

export function useRemoveStudentPhoto() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: removeStudentPhoto,
    onSuccess: (_, variables) => {
      updateStudentPhotoPathCache(queryClient, variables.studentId, null)
      if (variables.path) {
        void queryClient.removeQueries({ queryKey: studentPhotoKeys.path(variables.path) })
      }
      invalidateStudentPhotoSurfaces(queryClient, variables.studentId)
      logStudentPhotoDiagnostic('cache-invalidated', { action: 'remove', studentId: variables.studentId })
    },
  })
}

function updateStudentPhotoPathCache(
  queryClient: ReturnType<typeof useQueryClient>,
  studentId: string,
  photoPath: string | null,
) {
  queryClient.setQueryData<StudentRow | undefined>(studentsKeys.detail(studentId), (current) =>
    current ? { ...current, photo_path: photoPath } : current,
  )

  queryClient.setQueriesData<StudentListResult>(
    { queryKey: studentsKeys.lists() },
    (current) =>
      current
        ? {
            ...current,
            students: current.students.map((student) =>
              student.id === studentId ? { ...student, photo_path: photoPath } : student,
            ),
          }
        : current,
  )
}

function invalidateStudentPhotoSurfaces(queryClient: ReturnType<typeof useQueryClient>, studentId: string) {
  void queryClient.invalidateQueries({ queryKey: studentsKeys.lists() })
  void queryClient.invalidateQueries({ queryKey: studentsKeys.detail(studentId) })
  void queryClient.invalidateQueries({ queryKey: student360Keys.relations.detail(studentId) })
  void queryClient.invalidateQueries({ queryKey: classesKeys.all })
  void queryClient.invalidateQueries({ queryKey: agendaKeys.all })
}
