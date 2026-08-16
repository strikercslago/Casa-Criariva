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
    onSuccess: (nextPath, variables) => {
      void queryClient.invalidateQueries({ queryKey: studentPhotoKeys.path(nextPath) })
      if (variables.previousPath) {
        void queryClient.removeQueries({ queryKey: studentPhotoKeys.path(variables.previousPath) })
      }
      invalidateStudentPhotoSurfaces(queryClient, variables.studentId)
    },
  })
}

export function useRemoveStudentPhoto() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: removeStudentPhoto,
    onSuccess: (_, variables) => {
      if (variables.path) {
        void queryClient.removeQueries({ queryKey: studentPhotoKeys.path(variables.path) })
      }
      invalidateStudentPhotoSurfaces(queryClient, variables.studentId)
    },
  })
}

function invalidateStudentPhotoSurfaces(queryClient: ReturnType<typeof useQueryClient>, studentId: string) {
  void queryClient.invalidateQueries({ queryKey: studentsKeys.lists() })
  void queryClient.invalidateQueries({ queryKey: studentsKeys.detail(studentId) })
  void queryClient.invalidateQueries({ queryKey: student360Keys.relations.detail(studentId) })
  void queryClient.invalidateQueries({ queryKey: classesKeys.all })
  void queryClient.invalidateQueries({ queryKey: agendaKeys.all })
}
