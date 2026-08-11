import { useEffect } from 'react'
import { getUserSafeErrorMessage } from '@/lib/errors/AppError'
import { useToast } from '@/shared/components/feedback/Toast'
import { Overlay } from '@/shared/components/ui/Overlay'
import { ClassForm } from '@/features/classes/components/ClassForm'
import type { ClassFormValues } from '@/features/classes/schemas/classSchema'
import { useCreateClass } from '@/features/classes/hooks/useClasses'

type CreateClassDrawerProps = {
  isOpen: boolean
  onClose: () => void
  onCreated: (classId: string) => void
}

export function CreateClassDrawer({ isOpen, onClose, onCreated }: CreateClassDrawerProps) {
  const mutation = useCreateClass()
  const { notify } = useToast()

  useEffect(() => {
    if (!isOpen) {
      mutation.reset()
    }
  }, [isOpen, mutation])

  async function handleSubmit(values: ClassFormValues) {
    try {
      const classId = await mutation.mutateAsync(values)
      notify({ title: 'Turma criada.', tone: 'success' })
      onCreated(classId)
      onClose()
    } catch (error) {
      notify({
        title: 'Nao foi possivel salvar as alteracoes.',
        description: getUserSafeErrorMessage(error),
        tone: 'error',
      })
    }
  }

  return (
    <Overlay isOpen={isOpen} onClose={onClose} side="wide" title="Nova turma">
      <ClassForm isSubmitting={mutation.isPending} mode="create" onCancel={onClose} onSubmit={handleSubmit} />
    </Overlay>
  )
}
