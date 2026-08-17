import { useEffect, useState } from 'react'
import { cn } from '@/shared/utils/cn'
import { useStudentPhotoUrl } from '@/features/students/hooks/useStudentPhotos'
import { getStudentDisplayName, getStudentInitials } from '@/features/students/utils/studentPhoto'
import { warnStudentPhotoDiagnostic } from '@/features/students/utils/studentPhotoDiagnostics'

type StudentAvatarSize = 'xs' | 'sm' | 'md' | 'lg'

type StudentAvatarProps = {
  className?: string
  size?: StudentAvatarSize
  student: {
    full_name?: string | null
    photo_path?: string | null
    preferred_name?: string | null
  }
}

const sizeClasses: Record<StudentAvatarSize, string> = {
  xs: 'h-7 w-7 text-[10px]',
  sm: 'h-9 w-9 text-xs',
  md: 'h-12 w-12 text-sm',
  lg: 'h-20 w-20 text-xl',
}

export function StudentAvatar({ className, size = 'md', student }: StudentAvatarProps) {
  const [hasImageError, setHasImageError] = useState(false)
  const signedUrlQuery = useStudentPhotoUrl(student.photo_path)
  const signedUrl = signedUrlQuery.data
  const displayName = getStudentDisplayName(student)

  useEffect(() => {
    setHasImageError(false)
  }, [student.photo_path, signedUrl])

  useEffect(() => {
    if (signedUrlQuery.isError && student.photo_path) {
      warnStudentPhotoDiagnostic('signed-url-query-failed', {
        message: signedUrlQuery.error instanceof Error ? signedUrlQuery.error.message : 'unknown error',
        path: student.photo_path,
      })
    }
  }, [signedUrlQuery.error, signedUrlQuery.isError, student.photo_path])

  return (
    <span
      aria-label={`Avatar de ${displayName}`}
      className={cn(
        'relative inline-flex shrink-0 overflow-hidden rounded-full border border-primary/20 bg-primary/10 text-primary shadow-subtle',
        sizeClasses[size],
        className,
      )}
      role="img"
    >
      {signedUrl && !hasImageError ? (
        <img
          alt=""
          className="h-full w-full object-cover"
          decoding="async"
          loading={size === 'lg' ? 'eager' : 'lazy'}
          onError={() => {
            warnStudentPhotoDiagnostic('image-render-failed', { path: student.photo_path })
            setHasImageError(true)
          }}
          src={signedUrl}
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center font-semibold">
          {getStudentInitials(student)}
        </span>
      )}
    </span>
  )
}
