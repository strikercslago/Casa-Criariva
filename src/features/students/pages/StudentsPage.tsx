import { useQueryClient } from '@tanstack/react-query'
import { Plus, RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getUserSafeErrorMessage } from '@/lib/errors/AppError'
import { EmptyState } from '@/shared/components/feedback/EmptyState'
import { ErrorState } from '@/shared/components/feedback/ErrorState'
import { PageHeader } from '@/shared/components/navigation/PageHeader'
import { Button } from '@/shared/components/ui/Button'
import { Pagination } from '@/shared/components/ui/Pagination'
import { EnrollmentWizard } from '@/features/students/components/EnrollmentWizard'
import { StudentDetailDrawer } from '@/features/students/components/StudentDetailDrawer'
import { StudentFilters } from '@/features/students/components/StudentFilters'
import { StudentsList } from '@/features/students/components/StudentsList'
import { StudentsSkeleton } from '@/features/students/components/StudentsSkeleton'
import { getStudent } from '@/features/students/api/studentsApi'
import { useDebouncedValue } from '@/features/students/hooks/useDebouncedValue'
import { useStudentsList } from '@/features/students/hooks/useStudents'
import { studentsKeys } from '@/features/students/hooks/studentsKeys'
import type { StudentStatusFilter } from '@/features/students/types/studentTypes'

const PAGE_SIZE = 20

export default function StudentsPage() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StudentStatusFilter>('all')
  const [page, setPage] = useState(1)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const debouncedSearch = useDebouncedValue(search, 320)
  const selectedStudentId = searchParams.get('aluno')

  const filters = useMemo(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      search: debouncedSearch,
      status,
    }),
    [debouncedSearch, page, status],
  )
  const studentsQuery = useStudentsList(filters)
  const totalCount = studentsQuery.data?.totalCount ?? 0
  const totalPages = studentsQuery.data?.totalPages ?? 1
  const students = studentsQuery.data?.students ?? []
  const isInitialLoading = studentsQuery.isLoading && !studentsQuery.data
  const hasSearch = debouncedSearch.trim().length > 0
  const hasFilters = hasSearch || status !== 'all'

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handleStatusChange(value: StudentStatusFilter) {
    setStatus(value)
    setPage(1)
  }

  function handleOpenStudent(id: string) {
    setSearchParams({ aluno: id })
  }

  function handlePrefetchStudent(id: string) {
    void queryClient.prefetchQuery({
      queryFn: () => getStudent(id),
      queryKey: studentsKeys.detail(id),
      staleTime: 90_000,
    })
  }

  function handleCloseStudent() {
    setSearchParams({})
  }

  function handleEnrollmentCompleted(studentId: string) {
    setPage(1)
    setSearchParams({ aluno: studentId })
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Alunos"
        description="Cadastre, acompanhe e organize alunos sem misturar responsaveis, turmas ou financeiro."
        actions={
          <Button leftIcon={<Plus className="h-4 w-4" aria-hidden />} onClick={() => setIsCreateOpen(true)}>
            Novo aluno
          </Button>
        }
      />

      <section className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
        <div className="rounded-md border border-border bg-surface p-4 shadow-subtle">
          <p className="text-sm text-muted-foreground">Total no filtro</p>
          <p className="mt-1 text-3xl font-semibold text-foreground">{totalCount}</p>
        </div>

        <Button
          isLoading={studentsQuery.isFetching}
          leftIcon={<RefreshCw className="h-4 w-4" aria-hidden />}
          onClick={() => void studentsQuery.refetch()}
          variant="secondary"
        >
          Atualizar
        </Button>
      </section>

      <StudentFilters
        onSearchChange={handleSearchChange}
        onStatusChange={handleStatusChange}
        search={search}
        status={status}
      />

      {isInitialLoading ? <StudentsSkeleton /> : null}

      {studentsQuery.isError ? (
        <ErrorState
          title="Nao foi possivel carregar alunos."
          description={getUserSafeErrorMessage(studentsQuery.error)}
          onRetry={() => void studentsQuery.refetch()}
        />
      ) : null}

      {!isInitialLoading && !studentsQuery.isError && students.length === 0 ? (
        <EmptyState
          title={hasFilters ? 'Nenhum aluno encontrado para essa busca.' : 'Nenhum aluno cadastrado ainda.'}
          description={
            hasFilters
              ? 'Ajuste a busca ou o filtro de status para ver outros alunos.'
              : 'Cadastre o primeiro aluno para iniciar o modulo com dados reais.'
          }
          action={
            hasFilters ? null : (
              <Button leftIcon={<Plus className="h-4 w-4" aria-hidden />} onClick={() => setIsCreateOpen(true)}>
                Cadastrar primeiro aluno
              </Button>
            )
          }
        />
      ) : null}

      {!isInitialLoading && !studentsQuery.isError && students.length > 0 ? (
        <div className="space-y-3">
          <StudentsList
            onOpenStudent={handleOpenStudent}
            onPrefetchStudent={handlePrefetchStudent}
            students={students}
          />
          <div className="flex flex-col gap-3 rounded-md border border-border bg-surface p-3 shadow-subtle sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Pagina {page} de {totalPages}, {totalCount} aluno{totalCount === 1 ? '' : 's'}.
            </p>
            <Pagination
              onNext={() => setPage((current) => Math.min(totalPages, current + 1))}
              onPrevious={() => setPage((current) => Math.max(1, current - 1))}
              page={page}
              totalPages={totalPages}
            />
          </div>
        </div>
      ) : null}

      <EnrollmentWizard
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCompleted={handleEnrollmentCompleted}
      />

      <StudentDetailDrawer onClose={handleCloseStudent} studentId={selectedStudentId} />
    </div>
  )
}
