import { useQueryClient } from '@tanstack/react-query'
import { Plus, RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getUserSafeErrorMessage } from '@/lib/errors/AppError'
import { EmptyState } from '@/shared/components/feedback/EmptyState'
import { ErrorState } from '@/shared/components/feedback/ErrorState'
import { PageHeader } from '@/shared/components/navigation/PageHeader'
import { Button } from '@/shared/components/ui/Button'
import { Pagination } from '@/shared/components/ui/Pagination'
import { getClassDetail } from '@/features/classes/api/classesApi'
import { ClassDetailDrawer } from '@/features/classes/components/ClassDetailDrawer'
import { ClassesFilters } from '@/features/classes/components/ClassesFilters'
import { ClassesList } from '@/features/classes/components/ClassesList'
import { CreateClassDrawer } from '@/features/classes/components/CreateClassDrawer'
import { classesKeys } from '@/features/classes/hooks/classesKeys'
import { useClassesList } from '@/features/classes/hooks/useClasses'
import type { ClassCapacityFilter, ClassStatusFilter } from '@/features/classes/types/classTypes'
import { useDebouncedValue } from '@/features/students/hooks/useDebouncedValue'

const PAGE_SIZE = 20

export default function ClassesPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<ClassStatusFilter>('active')
  const [capacity, setCapacity] = useState<ClassCapacityFilter>('all')
  const [page, setPage] = useState(1)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const debouncedSearch = useDebouncedValue(search, 320)
  const navigate = useNavigate()
  const params = useParams()
  const queryClient = useQueryClient()
  const selectedClassId = params.classId ?? null
  const filters = useMemo(
    () => ({
      capacity,
      page,
      pageSize: PAGE_SIZE,
      search: debouncedSearch,
      status,
    }),
    [capacity, debouncedSearch, page, status],
  )
  const classesQuery = useClassesList(filters)
  const classes = classesQuery.data?.classes ?? []
  const totalCount = classesQuery.data?.totalCount ?? 0
  const totalPages = classesQuery.data?.totalPages ?? 1
  const isInitialLoading = classesQuery.isLoading && !classesQuery.data
  const hasSearch = debouncedSearch.trim().length > 0
  const hasFilters = hasSearch || status !== 'active' || capacity !== 'all'

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handleStatusChange(value: ClassStatusFilter) {
    setStatus(value)
    setPage(1)
  }

  function handleCapacityChange(value: ClassCapacityFilter) {
    setCapacity(value)
    setPage(1)
  }

  function openClass(classId: string) {
    navigate(`/turmas/${classId}`)
  }

  function closeClass() {
    navigate('/turmas')
  }

  function prefetchClass(classId: string) {
    void queryClient.prefetchQuery({
      queryFn: () => getClassDetail(classId),
      queryKey: classesKeys.detail(classId),
      staleTime: 90_000,
    })
  }

  return (
    <div className="space-y-5">
      <PageHeader
        actions={
          <Button leftIcon={<Plus className="h-4 w-4" aria-hidden />} onClick={() => setIsCreateOpen(true)}>
            Nova turma
          </Button>
        }
        description="Gerencie turmas, horarios recorrentes, capacidade, alunos ativos e historico operacional."
        title="Turmas"
      />

      <section className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
        <div className="rounded-md border border-border bg-surface p-4 shadow-subtle">
          <p className="text-sm text-muted-foreground">Encontradas</p>
          <p className="mt-1 text-3xl font-semibold text-foreground">{totalCount}</p>
        </div>
        <Button
          isLoading={classesQuery.isFetching}
          leftIcon={<RefreshCw className="h-4 w-4" aria-hidden />}
          onClick={() => void classesQuery.refetch()}
          variant="secondary"
        >
          Atualizar
        </Button>
      </section>

      <ClassesFilters
        capacity={capacity}
        onCapacityChange={handleCapacityChange}
        onSearchChange={handleSearchChange}
        onStatusChange={handleStatusChange}
        search={search}
        status={status}
      />

      {isInitialLoading ? <ClassesSkeleton /> : null}

      {classesQuery.isError ? (
        <ErrorState
          title="Nao foi possivel carregar turmas."
          description={getUserSafeErrorMessage(classesQuery.error)}
          onRetry={() => void classesQuery.refetch()}
        />
      ) : null}

      {!isInitialLoading && !classesQuery.isError && classes.length === 0 ? (
        <EmptyState
          action={
            hasFilters ? null : (
              <Button leftIcon={<Plus className="h-4 w-4" aria-hidden />} onClick={() => setIsCreateOpen(true)}>
                Criar primeira turma
              </Button>
            )
          }
          description={
            hasFilters
              ? 'Ajuste a busca, o status ou o filtro de vagas para ver outras turmas.'
              : 'Crie uma turma com horarios e capacidade para organizar matriculas.'
          }
          title={hasFilters ? 'Nenhuma turma encontrada.' : 'Nenhuma turma cadastrada.'}
        />
      ) : null}

      {!isInitialLoading && !classesQuery.isError && classes.length > 0 ? (
        <div className="space-y-3">
          <ClassesList classes={classes} onOpenClass={openClass} onPrefetchClass={prefetchClass} />
          <div className="flex flex-col gap-3 rounded-md border border-border bg-surface p-3 shadow-subtle sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Pagina {page} de {totalPages}, {totalCount} turma{totalCount === 1 ? '' : 's'}.
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

      <CreateClassDrawer isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onCreated={openClass} />

      <ClassDetailDrawer classId={selectedClassId} onClose={closeClass} />
    </div>
  )
}

function ClassesSkeleton() {
  return (
    <div className="grid gap-3">
      {Array.from({ length: 5 }, (_, index) => (
        <div className="h-24 rounded-md border border-border bg-surface shadow-subtle" key={index} />
      ))}
    </div>
  )
}
