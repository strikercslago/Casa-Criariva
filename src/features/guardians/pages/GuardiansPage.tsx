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
import { CreateGuardianDrawer } from '@/features/guardians/components/CreateGuardianDrawer'
import { GuardianDetailDrawer } from '@/features/guardians/components/GuardianDetailDrawer'
import { GuardiansFilters } from '@/features/guardians/components/GuardiansFilters'
import { GuardiansList } from '@/features/guardians/components/GuardiansList'
import { getGuardianDetail } from '@/features/guardians/api/guardiansApi'
import { guardiansKeys } from '@/features/guardians/hooks/guardiansKeys'
import { useGuardiansList } from '@/features/guardians/hooks/useGuardians'
import type { GuardianRoleFilter } from '@/features/guardians/types/guardianTypes'
import { useDebouncedValue } from '@/features/students/hooks/useDebouncedValue'

export default function GuardiansPage() {
  const [search, setSearch] = useState('')
  const [role, setRole] = useState<GuardianRoleFilter>('all')
  const [page, setPage] = useState(1)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const debouncedSearch = useDebouncedValue(search, 320)
  const navigate = useNavigate()
  const params = useParams()
  const queryClient = useQueryClient()
  const selectedGuardianId = params.guardianId ?? null
  const filters = useMemo(
    () => ({
      page,
      pageSize: 20,
      role,
      search: debouncedSearch,
    }),
    [debouncedSearch, page, role],
  )
  const guardiansQuery = useGuardiansList(filters)
  const guardians = guardiansQuery.data?.guardians ?? []
  const totalCount = guardiansQuery.data?.totalCount ?? 0
  const totalPages = guardiansQuery.data?.totalPages ?? 1
  const isInitialLoading = guardiansQuery.isLoading && !guardiansQuery.data
  const hasSearch = debouncedSearch.trim().length > 0
  const hasFilters = hasSearch || role !== 'all'

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handleRoleChange(value: GuardianRoleFilter) {
    setRole(value)
    setPage(1)
  }

  function openGuardian(guardianId: string) {
    navigate(`/responsaveis/${guardianId}`)
  }

  function closeGuardian() {
    navigate('/responsaveis')
  }

  function prefetchGuardian(guardianId: string) {
    void queryClient.prefetchQuery({
      queryFn: () => getGuardianDetail(guardianId),
      queryKey: guardiansKeys.detail(guardianId),
      staleTime: 90_000,
    })
  }

  return (
    <div className="space-y-5">
      <PageHeader
        actions={
          <Button leftIcon={<Plus className="h-4 w-4" aria-hidden />} onClick={() => setIsCreateOpen(true)}>
            Novo responsavel
          </Button>
        }
        description="Localize contatos, acompanhe vinculos com alunos e reduza duplicidades."
        title="Responsaveis"
      />

      <section className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
        <div className="rounded-md border border-border bg-surface p-4 shadow-subtle">
          <p className="text-sm text-muted-foreground">Encontrados</p>
          <p className="mt-1 text-3xl font-semibold text-foreground">{totalCount}</p>
        </div>
        <Button
          isLoading={guardiansQuery.isFetching}
          leftIcon={<RefreshCw className="h-4 w-4" aria-hidden />}
          onClick={() => void guardiansQuery.refetch()}
          variant="secondary"
        >
          Atualizar
        </Button>
      </section>

      <GuardiansFilters
        onRoleChange={handleRoleChange}
        onSearchChange={handleSearchChange}
        role={role}
        search={search}
      />

      {isInitialLoading ? <GuardiansSkeleton /> : null}

      {guardiansQuery.isError ? (
        <ErrorState
          title="Nao foi possivel carregar responsaveis."
          description={getUserSafeErrorMessage(guardiansQuery.error)}
          onRetry={() => void guardiansQuery.refetch()}
        />
      ) : null}

      {!isInitialLoading && !guardiansQuery.isError && guardians.length === 0 ? (
        <EmptyState
          action={
            hasFilters ? null : (
              <Button leftIcon={<Plus className="h-4 w-4" aria-hidden />} onClick={() => setIsCreateOpen(true)}>
                Cadastrar responsavel
              </Button>
            )
          }
          description={
            hasFilters
              ? 'Ajuste a busca ou os filtros para ver outros responsaveis.'
              : 'Cadastre responsaveis para vincular contatos aos alunos sem duplicar dados.'
          }
          title={hasFilters ? 'Nenhum responsavel encontrado.' : 'Nenhum responsavel cadastrado.'}
        />
      ) : null}

      {!isInitialLoading && !guardiansQuery.isError && guardians.length > 0 ? (
        <div className="space-y-3">
          <GuardiansList
            guardians={guardians}
            onOpenGuardian={openGuardian}
            onPrefetchGuardian={prefetchGuardian}
          />
          <div className="flex flex-col gap-3 rounded-md border border-border bg-surface p-3 shadow-subtle sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Pagina {page} de {totalPages}, {totalCount} responsavel{totalCount === 1 ? '' : 's'}.
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

      <CreateGuardianDrawer
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={openGuardian}
        onUseExisting={(guardianId) => {
          setIsCreateOpen(false)
          openGuardian(guardianId)
        }}
      />

      <GuardianDetailDrawer guardianId={selectedGuardianId} onClose={closeGuardian} />
    </div>
  )
}

function GuardiansSkeleton() {
  return (
    <div className="grid gap-3">
      {Array.from({ length: 5 }, (_, index) => (
        <div className="h-16 rounded-md border border-border bg-surface shadow-subtle" key={index} />
      ))}
    </div>
  )
}
