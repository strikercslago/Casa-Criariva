import { ArrowRight } from 'lucide-react'
import { IconButton } from '@/shared/components/ui/IconButton'
import { Table, Td, Th } from '@/shared/components/ui/Table'
import type { StudentListItem } from '@/features/students/types/studentTypes'
import { formatStudentDate } from '@/features/students/utils/studentDates'
import { StudentStatusBadge } from './StudentStatusBadge'

type StudentsListProps = {
  students: StudentListItem[]
  onOpenStudent: (id: string) => void
  onPrefetchStudent?: (id: string) => void
}

export function StudentsList({ students, onOpenStudent, onPrefetchStudent }: StudentsListProps) {
  return (
    <>
      <div className="hidden md:block">
        <Table>
          <thead>
            <tr>
              <Th>Aluno</Th>
              <Th>Matricula</Th>
              <Th>Nascimento</Th>
              <Th>Status</Th>
              <Th className="w-16 text-right">Abrir</Th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr
                className="transition-colors hover:bg-muted/60"
                key={student.id}
                onMouseEnter={() => onPrefetchStudent?.(student.id)}
              >
                <Td className="text-foreground">
                  <button
                    className="text-left font-medium text-foreground hover:text-primary"
                    onFocus={() => onPrefetchStudent?.(student.id)}
                    onClick={() => onOpenStudent(student.id)}
                    type="button"
                  >
                    {student.full_name}
                  </button>
                  {student.preferred_name ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Nome preferido: {student.preferred_name}
                    </p>
                  ) : null}
                </Td>
                <Td>{formatStudentDate(student.enrollment_date)}</Td>
                <Td>{formatStudentDate(student.birth_date)}</Td>
                <Td>
                  <StudentStatusBadge status={student.status} />
                </Td>
                <Td className="text-right">
                  <IconButton
                    className="ml-auto h-9 w-9"
                    label={`Abrir ${student.full_name}`}
                    onFocus={() => onPrefetchStudent?.(student.id)}
                    onClick={() => onOpenStudent(student.id)}
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
        {students.map((student) => (
          <article
            className="rounded-md border border-border bg-surface p-4 shadow-subtle"
            key={student.id}
            onMouseEnter={() => onPrefetchStudent?.(student.id)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold text-foreground">{student.full_name}</h2>
                {student.preferred_name ? (
                  <p className="mt-1 text-sm text-muted-foreground">{student.preferred_name}</p>
                ) : null}
              </div>
              <StudentStatusBadge status={student.status} />
            </div>

            <dl className="mt-4 grid gap-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Matricula</dt>
                <dd className="font-medium text-foreground">{formatStudentDate(student.enrollment_date)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Nascimento</dt>
                <dd className="font-medium text-foreground">{formatStudentDate(student.birth_date)}</dd>
              </div>
            </dl>

            <button
              className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded border border-border bg-background px-3 text-sm font-medium"
              onFocus={() => onPrefetchStudent?.(student.id)}
              onClick={() => onOpenStudent(student.id)}
              type="button"
            >
              Abrir
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          </article>
        ))}
      </div>
    </>
  )
}
