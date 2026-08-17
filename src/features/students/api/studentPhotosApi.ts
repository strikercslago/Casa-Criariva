import { AppError } from '@/lib/errors/AppError'
import { createTimeoutError } from '@/app/providers/authErrors'
import { getSupabaseClient } from '@/lib/supabase/client'
import { withTimeout } from '@/shared/utils/withTimeout'
import { createStudentPhotoWebpBlob } from '@/features/students/utils/studentPhoto'
import {
  logStudentPhotoDiagnostic,
  warnStudentPhotoDiagnostic,
} from '@/features/students/utils/studentPhotoDiagnostics'

const STUDENT_PHOTOS_BUCKET = 'student-photos'
const STUDENT_PHOTO_TIMEOUT_MS = 15_000
const STUDENT_PHOTO_SIGNED_URL_SECONDS = 60 * 60

type StudentPhotoMutationResult = {
  path: string
  studentId: string
}

function getClient() {
  const supabase = getSupabaseClient()

  if (!supabase) {
    throw new AppError('auth', 'Supabase ainda nao esta configurado neste ambiente.')
  }

  return supabase
}

export async function getStudentPhotoSignedUrl(path: string) {
  const supabase = getClient()

  logStudentPhotoDiagnostic('signed-url-start', { path })

  const { data, error } = await withTimeout(
    supabase.storage.from(STUDENT_PHOTOS_BUCKET).createSignedUrl(path, STUDENT_PHOTO_SIGNED_URL_SECONDS),
    STUDENT_PHOTO_TIMEOUT_MS,
    createTimeoutError,
  )

  if (error || !data?.signedUrl) {
    warnStudentPhotoDiagnostic('signed-url-failed', { message: error?.message ?? 'missing signed url', path })
    throw new AppError('unknown', 'Nao foi possivel carregar a foto.', error?.message)
  }

  logStudentPhotoDiagnostic('signed-url-success', { expiresInSeconds: STUDENT_PHOTO_SIGNED_URL_SECONDS, path })

  return data.signedUrl
}

export async function uploadStudentPhoto({
  file,
  previousPath,
  studentId,
}: {
  file: File
  previousPath?: string | null
  studentId: string
}): Promise<StudentPhotoMutationResult> {
  const supabase = getClient()

  logStudentPhotoDiagnostic('processing-start', {
    inputSize: file.size,
    inputType: file.type,
    studentId,
  })

  const blob = await createStudentPhotoWebpBlob(file)
  const path = `${studentId}/avatar-${Date.now()}.webp`

  logStudentPhotoDiagnostic('processing-success', {
    outputSize: blob.size,
    outputType: blob.type,
    path,
    studentId,
  })
  logStudentPhotoDiagnostic('upload-start', { path, studentId })

  const { error: uploadError } = await withTimeout(
    supabase.storage.from(STUDENT_PHOTOS_BUCKET).upload(path, blob, {
      cacheControl: '3600',
      contentType: 'image/webp',
      upsert: false,
    }),
    STUDENT_PHOTO_TIMEOUT_MS,
    createTimeoutError,
  )

  if (uploadError) {
    warnStudentPhotoDiagnostic('upload-failed', { message: uploadError.message, path, studentId })
    throw new AppError('unknown', 'Nao foi possivel enviar a foto.', uploadError.message)
  }

  logStudentPhotoDiagnostic('upload-success', { path, studentId })
  logStudentPhotoDiagnostic('database-update-start', { path, studentId })

  const { data: updatedStudent, error: updateError } = await withTimeout(
    supabase.from('students').update({ photo_path: path }).eq('id', studentId).select('id, photo_path').single(),
    STUDENT_PHOTO_TIMEOUT_MS,
    createTimeoutError,
  )

  if (updateError || updatedStudent?.photo_path !== path) {
    await removeObjectBestEffort(path)
    warnStudentPhotoDiagnostic('database-update-failed', {
      message: updateError?.message ?? 'photo_path confirmation failed',
      path,
      studentId,
    })
    throw new AppError(
      'unknown',
      'Nao foi possivel vincular a nova foto ao aluno.',
      updateError?.message ?? 'photo_path confirmation failed',
    )
  }

  logStudentPhotoDiagnostic('database-update-success', { path, studentId })

  if (previousPath && previousPath !== path) {
    await removeObjectBestEffort(previousPath)
  }

  return { path, studentId }
}

export async function removeStudentPhoto({
  path,
  studentId,
}: {
  path: string | null
  studentId: string
}) {
  const supabase = getClient()

  logStudentPhotoDiagnostic('database-update-start', { action: 'remove', path, studentId })

  const { data: updatedStudent, error: updateError } = await withTimeout(
    supabase.from('students').update({ photo_path: null }).eq('id', studentId).select('id, photo_path').single(),
    STUDENT_PHOTO_TIMEOUT_MS,
    createTimeoutError,
  )

  if (updateError || updatedStudent?.photo_path !== null) {
    warnStudentPhotoDiagnostic('database-update-failed', {
      action: 'remove',
      message: updateError?.message ?? 'photo_path null confirmation failed',
      path,
      studentId,
    })
    throw new AppError(
      'unknown',
      'Nao foi possivel remover a foto.',
      updateError?.message ?? 'photo_path null confirmation failed',
    )
  }

  logStudentPhotoDiagnostic('database-update-success', { action: 'remove', studentId })

  if (path) {
    await removeObjectBestEffort(path)
  }
}

async function removeObjectBestEffort(path: string) {
  const supabase = getClient()
  const { error } = await supabase.storage.from(STUDENT_PHOTOS_BUCKET).remove([path])

  if (error) {
    warnStudentPhotoDiagnostic('object-cleanup-failed', { message: error.message, path })
  }
}
