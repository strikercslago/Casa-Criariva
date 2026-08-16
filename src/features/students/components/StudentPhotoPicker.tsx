import { Camera, RefreshCw, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { getUserSafeErrorMessage } from '@/lib/errors/AppError'
import { Button } from '@/shared/components/ui/Button'
import { IconButton } from '@/shared/components/ui/IconButton'
import { cn } from '@/shared/utils/cn'
import { validateStudentPhotoFile, getStudentInitials } from '@/features/students/utils/studentPhoto'

type StudentPhotoPickerProps = {
  className?: string
  file: File | null
  onChange: (file: File | null) => void
  studentName: string
}

export function StudentPhotoPicker({ className, file, onChange, studentName }: StudentPhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }

    const nextPreviewUrl = URL.createObjectURL(file)
    setPreviewUrl(nextPreviewUrl)

    return () => URL.revokeObjectURL(nextPreviewUrl)
  }, [file])

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null
    event.target.value = ''

    if (!selectedFile) {
      return
    }

    try {
      validateStudentPhotoFile(selectedFile)
      setError(null)
      onChange(selectedFile)
    } catch (validationError) {
      setError(getUserSafeErrorMessage(validationError))
      onChange(null)
    }
  }

  function removePhoto() {
    setError(null)
    onChange(null)
  }

  return (
    <section className={cn('rounded-md border border-border bg-background p-4', className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-primary/20 bg-primary/10 text-xl font-semibold text-primary">
          {previewUrl ? (
            <img alt="" className="h-full w-full object-cover" src={previewUrl} />
          ) : (
            getStudentInitials({ full_name: studentName })
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Foto do aluno</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Opcional. Use JPEG, PNG ou WebP. A imagem sera otimizada antes do envio.
          </p>
          {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}

          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              leftIcon={file ? <RefreshCw className="h-4 w-4" aria-hidden /> : <Camera className="h-4 w-4" aria-hidden />}
              onClick={() => inputRef.current?.click()}
              size="sm"
              type="button"
              variant="secondary"
            >
              {file ? 'Trocar' : 'Selecionar foto'}
            </Button>
            {file ? (
              <IconButton className="h-9 w-9" label="Remover foto selecionada" onClick={removePhoto}>
                <Trash2 className="h-4 w-4" aria-hidden />
              </IconButton>
            ) : null}
          </div>
        </div>
      </div>

      <input
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleFileChange}
        ref={inputRef}
        type="file"
      />
    </section>
  )
}
