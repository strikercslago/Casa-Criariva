import { AppError } from '@/lib/errors/AppError'
import { createTimeoutError } from '@/app/providers/authErrors'
import { getSupabaseClient } from '@/lib/supabase/client'
import { withTimeout } from '@/shared/utils/withTimeout'
import { createStudentPhotoWebpBlob } from '@/features/students/utils/studentPhoto'

const STUDENT_PHOTOS_BUCKET = 'student-photos'
const STUDENT_PHOTO_TIMEOUT_MS = 15_000
const STUDENT_PHOTO_SIGNED_URL_SECONDS = 60 * 60

function getClient() {
  const supabase = getSupabaseClient()

  if (!supabase) {
    throw new AppError('auth', 'Supabase ainda nao esta configurado neste ambiente.')
  }

  return supabase
}

export async function getStudentPhotoSignedUrl(path: string) {
  const supabase = getClient()

  const { data, error } = await withTimeout(
    supabase.storage.from(STUDENT_PHOTOS_BUCKET).createSignedUrl(path, STUDENT_PHOTO_SIGNED_URL_SECONDS),
    STUDENT_PHOTO_TIMEOUT_MS,
    createTimeoutError,
  )

  if (error || !data?.signedUrl) {
    throw new AppError('unknown', 'Nao foi possivel carregar a foto.', error?.message)
  }

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
}) {
  const supabase = getClient()
  const blob = await createStudentPhotoWebpBlob(file)
  const path = `${studentId}/avatar-${Date.now()}.webp`

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
    throw new AppError('unknown', 'Nao foi possivel enviar a foto.', uploadError.message)
  }

  const { error: updateError } = await withTimeout(
    supabase.from('students').update({ photo_path: path }).eq('id', studentId),
    STUDENT_PHOTO_TIMEOUT_MS,
    createTimeoutError,
  )

  if (updateError) {
    await removeObjectBestEffort(path)
    throw new AppError('unknown', 'Nao foi possivel enviar a foto.', updateError.message)
  }

  if (previousPath && previousPath !== path) {
    await removeObjectBestEffort(previousPath)
  }

  return path
}

export async function removeStudentPhoto({
  path,
  studentId,
}: {
  path: string | null
  studentId: string
}) {
  const supabase = getClient()

  const { error: updateError } = await withTimeout(
    supabase.from('students').update({ photo_path: null }).eq('id', studentId),
    STUDENT_PHOTO_TIMEOUT_MS,
    createTimeoutError,
  )

  if (updateError) {
    throw new AppError('unknown', 'Nao foi possivel remover a foto.', updateError.message)
  }

  if (path) {
    await removeObjectBestEffort(path)
  }
}

async function removeObjectBestEffort(path: string) {
  const supabase = getClient()
  const { error } = await supabase.storage.from(STUDENT_PHOTOS_BUCKET).remove([path])

  if (error) {
    console.warn('[student-photo] object cleanup failed', { path, reason: error.message })
  }
}
