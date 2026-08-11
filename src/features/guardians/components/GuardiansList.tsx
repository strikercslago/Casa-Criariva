import { ArrowRight } from 'lucide-react'
import { Button } from '@/shared/components/ui/Button'
import { IconButton } from '@/shared/components/ui/IconButton'
import { Table, Td, Th } from '@/shared/components/ui/Table'
import type { GuardianListItem } from '@/features/guardians/types/guardianTypes'
import { GuardianRoleBadges } from '@/features/guardians/components/GuardianRoleBadges'
import { getGuardianContactLabel } from '@/features/guardians/utils/guardianFormat'

type GuardiansListProps = {
  guardians: GuardianListItem[]
  onOpenGuardian: (id: string) => void
  onPrefetchGuardian?: (id: string) => void
}

export function GuardiansList({ guardians, onOpenGuardian, onPrefetchGuardian }: GuardiansListProps) {
  return (
    <>
      <div className="hidden md:block">
        <Table>
          <thead>
            <tr>
              <Th>Responsavel</Th>
              <Th>Contato</Th>
              <Th>Alunos vinculados</Th>
              <Th>Papeis principais</Th>
              <Th className="w-16 text-right">Abrir</Th>
            </tr>
          </thead>
          <tbody>
            {guardians.map((guardian) => (
              <tr
                className="transition-colors hover:bg-muted/60"
                key={guardian.guardian_id}
                onMouseEnter={() => onPrefetchGuardian?.(guardian.guardian_id)}
              >
                <Td className="text-foreground">
                  <button
                    className="text-left font-medium text-foreground hover:text-primary"
                    onClick={() => onOpenGuardian(guardian.guardian_id)}
                    onFocus={() => onPrefetchGuardian?.(guardian.guardian_id)}
                    type="button"
                  >
                    {guardian.full_name}
                  </button>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {guardian.students_count} aluno{guardian.students_count === 1 ? '' : 's'} vinculado{guardian.students_count === 1 ? '' : 's'}
                  </p>
                </Td>
                <Td>
                  <p>{guardian.phone ?? 'Telefone nao informado'}</p>
                  {guardian.email ? <p className="mt-1 text-xs text-muted-foreground">{guardian.email}</p> : null}
                </Td>
                <Td>
                  {guardian.linked_students.length > 0 ? (
                    <div className="grid gap-1">
                      {guardian.linked_students.slice(0, 3).map((student) => (
                        <span key={student.id}>{student.full_name}</span>
                      ))}
                      {guardian.linked_students.length > 3 ? (
                        <span className="text-xs text-muted-foreground">+{guardian.linked_students.length - 3}</span>
                      ) : null}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Nenhum aluno</span>
                  )}
                </Td>
                <Td>
                  <GuardianRoleBadges source={guardian} />
                </Td>
                <Td className="text-right">
                  <IconButton
                    className="ml-auto h-9 w-9"
                    label={`Abrir ${guardian.full_name}`}
                    onClick={() => onOpenGuardian(guardian.guardian_id)}
                    onFocus={() => onPrefetchGuardian?.(guardian.guardian_id)}
                  >
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </IconButton>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      <div className="grid gap-3 md:hidden">
        {guardians.map((guardian) => (
          <article
            className="rounded-md border border-border bg-surface p-4 shadow-subtle"
            key={guardian.guardian_id}
            onMouseEnter={() => onPrefetchGuardian?.(guardian.guardian_id)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold text-foreground">{guardian.full_name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {getGuardianContactLabel(guardian.phone, guardian.email)}
                </p>
              </div>
            </div>
            <div className="mt-3">
              <GuardianRoleBadges source={guardian} />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {guardian.students_count} aluno{guardian.students_count === 1 ? '' : 's'} vinculado{guardian.students_count === 1 ? '' : 's'}
            </p>
            <Button
              className="mt-4 w-full"
              onClick={() => onOpenGuardian(guardian.guardian_id)}
              onFocus={() => onPrefetchGuardian?.(guardian.guardian_id)}
              rightIcon={<ArrowRight className="h-4 w-4" aria-hidden />}
              variant="secondary"
            >
              Ver responsavel
            </Button>
          </article>
        ))}
      </div>
    </>
  )
}
