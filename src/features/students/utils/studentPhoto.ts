import { AppError } from '@/lib/errors/AppError'

export const STUDENT_PHOTO_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const STUDENT_PHOTO_MAX_INPUT_BYTES = 5 * 1024 * 1024
export const STUDENT_PHOTO_OUTPUT_SIZE = 512
export const STUDENT_PHOTO_WEBP_QUALITY = 0.86

type StudentNameLike = {
  full_name?: string | null
  preferred_name?: string | null
}

export function getStudentDisplayName(student: StudentNameLike) {
  return student.preferred_name?.trim() || student.full_name?.trim() || 'Aluno'
}

export function getStudentInitials(student: StudentNameLike) {
  const name = getStudentDisplayName(student)
  const words = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/\s+/)
    .filter(Boolean)

  if (words.length === 0) {
    return 'AL'
  }

  const first = words[0]?.[0] ?? 'A'
  const last = words.length > 1 ? words[words.length - 1]?.[0] : words[0]?.[1]

  return `${first}${last ?? ''}`.toUpperCase()
}

export function validateStudentPhotoFile(file: File) {
  if (!STUDENT_PHOTO_ALLOWED_TYPES.includes(file.type as (typeof STUDENT_PHOTO_ALLOWED_TYPES)[number])) {
    throw new AppError('validation', 'Formato de imagem nao suportado.')
  }

  if (file.size > STUDENT_PHOTO_MAX_INPUT_BYTES) {
    throw new AppError('validation', 'A imagem e muito grande.')
  }
}

export async function createStudentPhotoWebpBlob(file: File): Promise<Blob> {
  validateStudentPhotoFile(file)

  const image = await loadImage(file)
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  if (!context) {
    throw new AppError('validation', 'Nao foi possivel processar a foto.')
  }

  canvas.width = STUDENT_PHOTO_OUTPUT_SIZE
  canvas.height = STUDENT_PHOTO_OUTPUT_SIZE

  const sourceSize = Math.min(image.naturalWidth, image.naturalHeight)
  const sourceX = Math.max(0, (image.naturalWidth - sourceSize) / 2)
  const sourceY = Math.max(0, (image.naturalHeight - sourceSize) / 2)

  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceSize,
    sourceSize,
    0,
    0,
    STUDENT_PHOTO_OUTPUT_SIZE,
    STUDENT_PHOTO_OUTPUT_SIZE,
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new AppError('validation', 'Nao foi possivel processar a foto.'))
          return
        }

        resolve(blob)
      },
      'image/webp',
      STUDENT_PHOTO_WEBP_QUALITY,
    )
  })
}

async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file)
  const image = new Image()

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new AppError('validation', 'Nao foi possivel processar a foto.'))
      image.src = url
    })

    return image
  } finally {
    URL.revokeObjectURL(url)
  }
}
