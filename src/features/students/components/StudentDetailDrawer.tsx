import { Archive, Pencil, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { getUserSafeErrorMessage } from '@/lib/errors/AppError'
import { ErrorState } from '@/shared/components/feedback/ErrorState'
import { useToast } from '@/shared/components/feedback/Toast'
import { Button } from '@/shared/components/ui/Button'
import { Overlay } from '@/shared/components/ui/Overlay'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import { StudentForm } from '@/features/students/components/StudentForm'
import { StudentStatusBadge } from '@/features/students/components/StudentStatusBadge'
import {
  useArchiveStudent,
  useRestoreStudent,
  useStudentDetail,
  useUpdateStudent,
} from '@/features/students/hooks/useStudents'
import type { StudentFormValues } from '@/features/students/schemas/studentSchema'
import { formatStudentDate } from '@/features/students/utils/studentDates'

type StudentDetailDrawerProps = {
  studentId: string | null
  onClose: () => void
}

export function StudentDetailDrawer({ studentId, onClose }: StudentDetailDrawerProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isConfirmingArchive, setIsConfirmingArchive] = useState(false)
  const studentQuery = useStudentDetail(studentId)
  const updateMutation = useUpdateStudent()
  const archiveMutation = useArchiveStudent()
  const restoreMutation = useRestoreStudent()
  const { notify } = useToast()
  const student = studentQuery.data

  function handleClose() {
    setIsEditing(false)
    setIsConfirmingArchive(false)
    onClose()
  }

  async function handleUpdate(values: StudentFormValues) {
    if (!studentId) {
      return
    }

    try {
      await updateMutation.mutateAsync({ id: studentId, values })
      setIsEditing(false)
      notify({ title: 'Aluno atualizado.', tone: 'success' })
    } catch (error) {
      notify({ title: 'Nao foi possivel salvar.', description: getUserSafeErrorMessage(error), tone: 'error' })
    }
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

  async function handleRestore() {
    if (!studentId) {
      return
    }

    try {
      await restoreMutation.mutateAsync(studentId)
      notify({ title: 'Aluno restaurado.', tone: 'success' })
    } catch (error) {
      notify({ title: 'Nao foi possivel restaurar.', description: getUserSafeErrorMessage(error), tone: 'error' })
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

        {student && !isEditing ? (
          <div className="grid gap-5">
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-xl font-semibold text-foreground">{student.full_name}</h2>
                  {student.preferred_name ? (
                    <p className="mt-1 text-sm text-muted-foreground">{student.preferred_name}</p>
                  ) : null}
                </div>
                <StudentStatusBadge status={student.status} />
              </div>
            </div>

            <dl className="grid gap-3 rounded-md border border-border bg-background p-3 text-sm">
              <DetailRow label="Matricula" value={formatStudentDate(student.enrollment_date)} />
              <DetailRow label="Nascimento" value={formatStudentDate(student.birth_date)} />
              <DetailRow label="Criado em" value={formatStudentDate(student.created_at.slice(0, 10))} />
              {student.archived_at ? (
                <DetailRow label="Arquivado em" value={formatStudentDate(student.archived_at.slice(0, 10))} />
              ) : null}
            </dl>

            <section>
              <h3 className="text-sm font-semibold text-foreground">Observacoes</h3>
              <p className="mt-2 min-h-20 rounded-md border border-border bg-background p-3 text-sm leading-6 text-muted-foreground">
                {student.notes ?? 'Nenhuma observacao registrada.'}
              </p>
            </section>

            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                leftIcon={<Pencil className="h-4 w-4" aria-hidden />}
                onClick={() => setIsEditing(true)}
                variant="secondary"
              >
                Editar
              </Button>

              {student.status === 'archived' ? (
                <Button
                  isLoading={restoreMutation.isPending}
                  leftIcon={<RotateCcw className="h-4 w-4" aria-hidden />}
                  onClick={handleRestore}
                  variant="secondary"
                >
                  Restaurar aluno
                </Button>
              ) : (
                <Button
                  leftIcon={<Archive className="h-4 w-4" aria-hidden />}
                  onClick={() => setIsConfirmingArchive(true)}
                  variant="danger"
                >
                  Arquivar aluno
                </Button>
              )}
            </div>
          </div>
        ) : null}

        {student && isEditing ? (
          <StudentForm
            isSubmitting={updateMutation.isPending}
            mode="edit"
            onCancel={() => setIsEditing(false)}
            onSubmit={handleUpdate}
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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-foreground">{value}</dd>
    </div>
  )
}
