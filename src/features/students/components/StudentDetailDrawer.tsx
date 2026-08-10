import { useState } from 'react'
import { getUserSafeErrorMessage } from '@/lib/errors/AppError'
import { ErrorState } from '@/shared/components/feedback/ErrorState'
import { useToast } from '@/shared/components/feedback/Toast'
import { Button } from '@/shared/components/ui/Button'
import { Overlay } from '@/shared/components/ui/Overlay'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import { Student360Profile } from '@/features/students/components/Student360Profile'
import {
  useArchiveStudent,
  useStudentDetail,
} from '@/features/students/hooks/useStudents'

type StudentDetailDrawerProps = {
  studentId: string | null
  onClose: () => void
}

export function StudentDetailDrawer({ studentId, onClose }: StudentDetailDrawerProps) {
  const [isConfirmingArchive, setIsConfirmingArchive] = useState(false)
  const studentQuery = useStudentDetail(studentId)
  const archiveMutation = useArchiveStudent()
  const { notify } = useToast()
  const student = studentQuery.data

  function handleClose() {
    setIsConfirmingArchive(false)
    onClose()
  }

  async function handleArchive() {
    if (!studentId) {
      return
    }

    try {
      await archiveMutation.mutateAsync(studentId)
      setIsConfirmingArchive(false)
      notify({ title: 'Aluno arquivado.', tone: 'success' })
    } catch (error) {
      notify({ title: 'Nao foi possivel arquivar.', description: getUserSafeErrorMessage(error), tone: 'error' })
    }
  }

  return (
    <>
      <Overlay isOpen={Boolean(studentId)} onClose={handleClose} side="right" title="Aluno">
        {studentQuery.isLoading ? (
          <div className="grid gap-4">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : null}

        {studentQuery.isError ? (
          <ErrorState
            title="Nao foi possivel carregar o aluno."
            description={getUserSafeErrorMessage(studentQuery.error)}
            onRetry={() => void studentQuery.refetch()}
          />
        ) : null}

        {student ? (
          <Student360Profile
            onArchiveRequest={() => setIsConfirmingArchive(true)}
            student={student}
          />
        ) : null}
      </Overlay>

      <Overlay
        isOpen={isConfirmingArchive}
        onClose={() => setIsConfirmingArchive(false)}
        title="Arquivar aluno"
      >
        <div className="grid gap-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Arquivar este aluno?</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Ele deixara de aparecer entre os alunos ativos, mas seu historico sera preservado.
            </p>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button onClick={() => setIsConfirmingArchive(false)} variant="secondary">
              Cancelar
            </Button>
            <Button isLoading={archiveMutation.isPending} onClick={handleArchive} variant="danger">
              Arquivar
            </Button>
          </div>
        </div>
      </Overlay>
    </>
  )
}
