import { PackagePlus, Plus, RefreshCw, Save, ShoppingCart } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { getUserSafeErrorMessage } from '@/lib/errors/AppError'
import { EmptyState } from '@/shared/components/feedback/EmptyState'
import { ErrorState } from '@/shared/components/feedback/ErrorState'
import { useToast } from '@/shared/components/feedback/Toast'
import { PageHeader } from '@/shared/components/navigation/PageHeader'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Checkbox, Select, Textarea } from '@/shared/components/ui/FormControls'
import { Input } from '@/shared/components/ui/Input'
import { Overlay } from '@/shared/components/ui/Overlay'
import { Pagination } from '@/shared/components/ui/Pagination'
import { SearchInput } from '@/shared/components/ui/SearchInput'
import { TabButton, Tabs } from '@/shared/components/ui/Tabs'
import {
  useArchiveMaterial,
  useCancelPurchase,
  useCreateMaterial,
  useCreateMaterialCategory,
  useCreatePurchase,
  useInventoryMovements,
  useInventorySummary,
  useMaterialCashAccounts,
  useMaterialCategories,
  useMaterials,
  usePurchaseDetail,
  usePurchases,
  useReceivePurchase,
  useRecordInventoryMovement,
  useSuppliers,
  useUpdateMaterial,
  useUpsertSupplier,
} from '@/features/materials/hooks/useMaterials'
import type {
  InventoryMovementType,
  MaterialCategory,
  MaterialRow,
  MaterialUnit,
  PaymentMethod,
  PurchaseRow,
  PurchaseStatus,
  SupplierRow,
} from '@/features/materials/types/materialsTypes'
import {
  formatDate,
  formatDateTime,
  formatMoney,
  formatQuantity,
  getFinanceStatusLabel,
  getFinanceStatusTone,
  getMovementLabel,
  getPurchaseStatusLabel,
  getPurchaseStatusTone,
  getStockStatusLabel,
  getStockStatusTone,
  getUnitLabel,
  materialUnitOptions,
  paymentMethodOptions,
  purchaseStatusOptions,
} from '@/features/materials/utils/materialsFormat'
import { useDebouncedValue } from '@/features/students/hooks/useDebouncedValue'
import { toIsoDate } from '@/features/billing/utils/billingDates'
import { toLocalDateTimeInputValue, toPaymentTimestamp } from '@/features/finance/utils/financeDates'

const PAGE_SIZE = 12
const MOVEMENT_PAGE_SIZE = 10

type MaterialsTab = 'stock' | 'purchases' | 'suppliers'

export default function MaterialsPage() {
  const [activeTab, setActiveTab] = useState<MaterialsTab>('stock')
  const [materialsPage, setMaterialsPage] = useState(1)
  const [purchasesPage, setPurchasesPage] = useState(1)
  const [suppliersPage, setSuppliersPage] = useState(1)
  const [movementPage, setMovementPage] = useState(1)
  const [search, setSearch] = useState('')
  const [purchaseSearch, setPurchaseSearch] = useState('')
  const [supplierSearch, setSupplierSearch] = useState('')
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out' | 'ok'>('all')
  const [activeFilter, setActiveFilter] = useState<'active' | 'archived' | 'all'>('active')
  const [categoryId, setCategoryId] = useState('')
  const [purchaseStatus, setPurchaseStatus] = useState<PurchaseStatus | 'all'>('all')
  const [isMaterialDrawerOpen, setIsMaterialDrawerOpen] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<MaterialRow | null>(null)
  const [movementMaterial, setMovementMaterial] = useState<MaterialRow | null>(null)
  const [movementType, setMovementType] = useState<Exclude<InventoryMovementType, 'purchase'>>('consumption')
  const [isPurchaseDrawerOpen, setIsPurchaseDrawerOpen] = useState(false)
  const [isSupplierDrawerOpen, setIsSupplierDrawerOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<SupplierRow | null>(null)
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialRow | null>(null)
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string | null>(null)
  const debouncedSearch = useDebouncedValue(search, 320)
  const debouncedPurchaseSearch = useDebouncedValue(purchaseSearch, 320)
  const debouncedSupplierSearch = useDebouncedValue(supplierSearch, 320)
  const { notify } = useToast()

  const categoriesQuery = useMaterialCategories()
  const summaryQuery = useInventorySummary()
  const accountsQuery = useMaterialCashAccounts()
  const materialsFilters = useMemo(
    () => ({
      active: activeFilter,
      categoryId: categoryId || null,
      page: materialsPage,
      pageSize: PAGE_SIZE,
      search: debouncedSearch,
      stock: stockFilter,
    }),
    [activeFilter, categoryId, debouncedSearch, materialsPage, stockFilter],
  )
  const purchasesFilters = useMemo(
    () => ({
      page: purchasesPage,
      pageSize: PAGE_SIZE,
      search: debouncedPurchaseSearch,
      status: purchaseStatus,
    }),
    [debouncedPurchaseSearch, purchaseStatus, purchasesPage],
  )
  const suppliersFilters = useMemo(
    () => ({
      active: 'active' as const,
      page: suppliersPage,
      pageSize: PAGE_SIZE,
      search: debouncedSupplierSearch,
    }),
    [debouncedSupplierSearch, suppliersPage],
  )
  const movementsFilters = selectedMaterial ? { materialId: selectedMaterial.material_id, page: movementPage, pageSize: MOVEMENT_PAGE_SIZE } : null
  const materialsQuery = useMaterials(materialsFilters)
  const purchasesQuery = usePurchases(purchasesFilters)
  const suppliersQuery = useSuppliers(suppliersFilters)
  const movementsQuery = useInventoryMovements(movementsFilters)
  const receiveMutation = useReceivePurchase()
  const cancelPurchaseMutation = useCancelPurchase()
  const archiveMutation = useArchiveMaterial()
  const categories = categoriesQuery.data ?? []
  const materials = useMemo(() => materialsQuery.data?.rows ?? [], [materialsQuery.data?.rows])
  const suppliers = suppliersQuery.data?.rows ?? []
  const accounts = accountsQuery.data ?? []
  const summary = summaryQuery.data

  useEffect(() => {
    setMaterialsPage(1)
  }, [activeFilter, categoryId, debouncedSearch, stockFilter])

  useEffect(() => {
    if (!selectedMaterial) return

    const updatedMaterial = materials.find((material) => material.material_id === selectedMaterial.material_id)
    if (updatedMaterial && updatedMaterial !== selectedMaterial) {
      setSelectedMaterial(updatedMaterial)
    }
  }, [materials, selectedMaterial])

  function openMovement(material: MaterialRow, type: Exclude<InventoryMovementType, 'purchase'>) {
    setMovementMaterial(material)
    setMovementType(type)
  }

  async function archive(material: MaterialRow) {
    const confirmed = window.confirm(`Arquivar ${material.name}? O historico de estoque sera preservado.`)
    if (!confirmed) return

    try {
      await archiveMutation.mutateAsync(material.material_id)
      notify({ title: 'Material arquivado.', tone: 'success' })
    } catch (error) {
      notify({ title: 'Nao foi possivel arquivar.', description: getUserSafeErrorMessage(error), tone: 'error' })
    }
  }

  async function receive(purchase: PurchaseRow, settleNow: boolean) {
    try {
      await receiveMutation.mutateAsync({
        cashAccountId: accounts[0]?.id ?? null,
        paymentMethod: 'pix',
        purchaseId: purchase.purchase_id,
        settledAt: toPaymentTimestamp(toLocalDateTimeInputValue()),
        settleNow,
      })
      notify({ title: settleNow ? 'Compra recebida e paga.' : 'Compra recebida.', tone: 'success' })
    } catch (error) {
      notify({ title: 'Nao foi possivel receber a compra.', description: getUserSafeErrorMessage(error), tone: 'error' })
    }
  }

  async function cancelPurchase(purchase: PurchaseRow) {
    const reason = window.prompt('Motivo do cancelamento da compra')
    if (!reason?.trim()) return

    try {
      await cancelPurchaseMutation.mutateAsync({ purchaseId: purchase.purchase_id, reason })
      notify({ title: 'Compra cancelada.', tone: 'success' })
    } catch (error) {
      notify({ title: 'Nao foi possivel cancelar.', description: getUserSafeErrorMessage(error), tone: 'error' })
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            <Button leftIcon={<Plus className="h-4 w-4" aria-hidden />} onClick={() => setIsMaterialDrawerOpen(true)}>
              Novo material
            </Button>
            <Button leftIcon={<PackagePlus className="h-4 w-4" aria-hidden />} onClick={() => setIsPurchaseDrawerOpen(true)} variant="secondary">
              Nova compra
            </Button>
            <Button
              isLoading={summaryQuery.isFetching || materialsQuery.isFetching || purchasesQuery.isFetching}
              leftIcon={<RefreshCw className="h-4 w-4" aria-hidden />}
              onClick={() => {
                void summaryQuery.refetch()
                void materialsQuery.refetch()
                void purchasesQuery.refetch()
                void suppliersQuery.refetch()
              }}
              variant="secondary"
            >
              Atualizar
            </Button>
          </div>
        }
        description="Materiais, estoque derivado por movimentacoes, compras e fornecedores."
        title="Materiais"
      />

      <dl className="grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-4">
        <SummaryItem label="Materiais cadastrados" value={String(summary?.materials_count ?? 0)} />
        <SummaryItem label="Estoque baixo" tone={(summary?.low_stock_count ?? 0) > 0 ? 'warning' : undefined} value={String(summary?.low_stock_count ?? 0)} />
        <SummaryItem label="Sem estoque" tone={(summary?.out_of_stock_count ?? 0) > 0 ? 'danger' : undefined} value={String(summary?.out_of_stock_count ?? 0)} />
        <SummaryItem label="Compras recentes" value={String(summary?.recent_purchases_count ?? 0)} />
      </dl>

      <Tabs>
        <TabButton isActive={activeTab === 'stock'} onClick={() => setActiveTab('stock')}>Estoque</TabButton>
        <TabButton isActive={activeTab === 'purchases'} onClick={() => setActiveTab('purchases')}>Compras</TabButton>
        <TabButton isActive={activeTab === 'suppliers'} onClick={() => setActiveTab('suppliers')}>Fornecedores</TabButton>
      </Tabs>

      {activeTab === 'stock' ? (
        <section className="space-y-4">
          <div className="grid gap-2 lg:grid-cols-[minmax(220px,1fr)_160px_160px_180px]">
            <SearchInput label="Buscar materiais" onChange={(event) => setSearch(event.target.value)} placeholder="Buscar material ou categoria" value={search} />
            <Select label="Estoque" onChange={(event) => setStockFilter(event.target.value as typeof stockFilter)} value={stockFilter}>
              <option value="all">Todos</option>
              <option value="low">Estoque baixo</option>
              <option value="out">Sem estoque</option>
              <option value="ok">OK</option>
            </Select>
            <Select label="Situacao" onChange={(event) => setActiveFilter(event.target.value as typeof activeFilter)} value={activeFilter}>
              <option value="active">Ativos</option>
              <option value="archived">Arquivados</option>
              <option value="all">Todos</option>
            </Select>
            <Select label="Categoria" onChange={(event) => setCategoryId(event.target.value)} value={categoryId}>
              <option value="">Todas</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </Select>
          </div>

          <MainPanel error={materialsQuery.error} isError={materialsQuery.isError} isLoading={materialsQuery.isLoading && !materialsQuery.data} onRetry={() => void materialsQuery.refetch()} title="Nao foi possivel carregar materiais.">
            {materials.length ? (
              <>
                <MaterialsList
                  materials={materials}
                  onAdjust={(material) => openMovement(material, 'adjustment_in')}
                  onArchive={(material) => void archive(material)}
                  onConsume={(material) => openMovement(material, 'consumption')}
                  onEdit={(material) => {
                    setEditingMaterial(material)
                    setIsMaterialDrawerOpen(true)
                  }}
                  onLoss={(material) => openMovement(material, 'loss')}
                  onSelect={(material) => {
                    setSelectedMaterial(material)
                    setMovementPage(1)
                  }}
                  selectedMaterialId={selectedMaterial?.material_id ?? null}
                />
                <PagedFooter page={materialsPage} setPage={setMaterialsPage} totalCount={materialsQuery.data?.totalCount ?? 0} totalPages={materialsQuery.data?.totalPages ?? 1} unit="material" />
              </>
            ) : (
              <EmptyState action={<Button leftIcon={<Plus className="h-4 w-4" aria-hidden />} onClick={() => setIsMaterialDrawerOpen(true)}>Novo material</Button>} description="Cadastre materiais e registre estoque inicial por movimentacao." title="Nenhum material encontrado." />
            )}
          </MainPanel>

          {selectedMaterial ? (
            <section className="rounded-md border border-border bg-surface p-4 shadow-subtle">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{selectedMaterial.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Estoque atual: {formatQuantity(selectedMaterial.current_stock)} {getUnitLabel(selectedMaterial.unit).toLowerCase()} - minimo {formatQuantity(selectedMaterial.minimum_stock)}
                  </p>
                </div>
                <Badge tone={getStockStatusTone(selectedMaterial.stock_status)}>{getStockStatusLabel(selectedMaterial.stock_status)}</Badge>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={() => openMovement(selectedMaterial, 'consumption')} size="sm" variant="secondary">Registrar consumo</Button>
                <Button onClick={() => openMovement(selectedMaterial, 'loss')} size="sm" variant="secondary">Registrar perda</Button>
                <Button onClick={() => openMovement(selectedMaterial, 'adjustment_in')} size="sm" variant="secondary">Ajustar estoque</Button>
              </div>
              <div className="mt-4">
                <MovementHistory isLoading={movementsQuery.isLoading && !movementsQuery.data} movements={movementsQuery.data?.rows ?? []} />
              </div>
            </section>
          ) : null}
        </section>
      ) : null}

      {activeTab === 'purchases' ? (
        <section className="space-y-4">
          <div className="grid gap-2 lg:grid-cols-[minmax(220px,1fr)_180px]">
            <SearchInput label="Buscar compras" onChange={(event) => setPurchaseSearch(event.target.value)} placeholder="Buscar fornecedor ou observacao" value={purchaseSearch} />
            <Select label="Status" onChange={(event) => setPurchaseStatus(event.target.value as PurchaseStatus | 'all')} value={purchaseStatus}>
              {purchaseStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
          </div>
          <MainPanel error={purchasesQuery.error} isError={purchasesQuery.isError} isLoading={purchasesQuery.isLoading && !purchasesQuery.data} onRetry={() => void purchasesQuery.refetch()} title="Nao foi possivel carregar compras.">
            {purchasesQuery.data?.rows.length ? (
              <>
                <PurchaseList purchases={purchasesQuery.data.rows} onCancel={(purchase) => void cancelPurchase(purchase)} onOpen={setSelectedPurchaseId} onReceive={(purchase) => void receive(purchase, false)} onReceiveAndPay={(purchase) => void receive(purchase, true)} />
                <PagedFooter page={purchasesPage} setPage={setPurchasesPage} totalCount={purchasesQuery.data.totalCount} totalPages={purchasesQuery.data.totalPages} unit="compra" />
              </>
            ) : (
              <EmptyState action={<Button leftIcon={<ShoppingCart className="h-4 w-4" aria-hidden />} onClick={() => setIsPurchaseDrawerOpen(true)}>Nova compra</Button>} description="Compras em rascunho nao alteram estoque nem financeiro ate o recebimento." title="Nenhuma compra encontrada." />
            )}
          </MainPanel>
        </section>
      ) : null}

      {activeTab === 'suppliers' ? (
        <section className="space-y-4">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <SearchInput className="lg:w-96" label="Buscar fornecedores" onChange={(event) => setSupplierSearch(event.target.value)} placeholder="Buscar fornecedor" value={supplierSearch} />
            <Button leftIcon={<Plus className="h-4 w-4" aria-hidden />} onClick={() => setIsSupplierDrawerOpen(true)}>Novo fornecedor</Button>
          </div>
          <SupplierList suppliers={suppliers} onEdit={(supplier) => {
            setEditingSupplier(supplier)
            setIsSupplierDrawerOpen(true)
          }} />
          {suppliersQuery.data ? <PagedFooter page={suppliersPage} setPage={setSuppliersPage} totalCount={suppliersQuery.data.totalCount} totalPages={suppliersQuery.data.totalPages} unit="fornecedor" /> : null}
        </section>
      ) : null}

      <MaterialDrawer categories={categories} editingMaterial={editingMaterial} isOpen={isMaterialDrawerOpen} onClose={() => {
        setIsMaterialDrawerOpen(false)
        setEditingMaterial(null)
      }} />
      <MovementDrawer material={movementMaterial} movementType={movementType} onClose={() => setMovementMaterial(null)} />
      <SupplierDrawer editingSupplier={editingSupplier} isOpen={isSupplierDrawerOpen} onClose={() => {
        setIsSupplierDrawerOpen(false)
        setEditingSupplier(null)
      }} />
      <PurchaseDrawer categories={categories} isOpen={isPurchaseDrawerOpen} key={isPurchaseDrawerOpen ? 'purchase-open' : 'purchase-closed'} materials={materials} onClose={() => setIsPurchaseDrawerOpen(false)} suppliers={suppliers} />
      <PurchaseDetailDrawer onClose={() => setSelectedPurchaseId(null)} purchaseId={selectedPurchaseId} />
    </div>
  )
}

function MaterialsList({
  materials,
  onAdjust,
  onArchive,
  onConsume,
  onEdit,
  onLoss,
  onSelect,
  selectedMaterialId,
}: {
  materials: MaterialRow[]
  onAdjust: (material: MaterialRow) => void
  onArchive: (material: MaterialRow) => void
  onConsume: (material: MaterialRow) => void
  onEdit: (material: MaterialRow) => void
  onLoss: (material: MaterialRow) => void
  onSelect: (material: MaterialRow) => void
  selectedMaterialId: string | null
}) {
  return (
    <div className="grid gap-3">
      <div className="hidden rounded-md border border-border bg-surface shadow-subtle xl:block">
        <div className="grid grid-cols-[minmax(220px,1.4fr)_150px_140px_140px_130px_260px] gap-3 border-b border-border px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">
          <span>Material</span><span>Categoria</span><span>Estoque</span><span>Minimo</span><span>Status</span><span className="text-right">Acoes</span>
        </div>
        {materials.map((material) => (
          <article className={`grid grid-cols-[minmax(220px,1.4fr)_150px_140px_140px_130px_260px] items-center gap-3 border-b border-border px-4 py-3 last:border-b-0 ${selectedMaterialId === material.material_id ? 'bg-primary/5' : ''}`} key={material.material_id}>
            <div className="min-w-0"><h2 className="truncate font-semibold text-foreground">{material.name}</h2><p className="mt-1 text-sm text-muted-foreground">{getUnitLabel(material.unit)} - ultimo custo {material.last_unit_cost ? formatMoney(material.last_unit_cost) : '-'}</p></div>
            <span className="truncate text-sm text-muted-foreground">{material.category_name ?? '-'}</span>
            <span className="text-sm font-semibold text-foreground">{formatQuantity(material.current_stock)} {getUnitLabel(material.unit).toLowerCase()}</span>
            <span className="text-sm text-muted-foreground">{formatQuantity(material.minimum_stock)}</span>
            <Badge tone={getStockStatusTone(material.stock_status)}>{getStockStatusLabel(material.stock_status)}</Badge>
            <div className="flex flex-wrap justify-end gap-2">
              <Button onClick={() => onConsume(material)} size="sm" variant="secondary">Consumo</Button>
              <Button onClick={() => onSelect(material)} size="sm" variant="secondary">Ver</Button>
              <Button onClick={() => onEdit(material)} size="sm" variant="secondary">Editar</Button>
              <Button onClick={() => onArchive(material)} size="sm" variant="danger">Arquivar</Button>
            </div>
          </article>
        ))}
      </div>
      <div className="grid gap-3 xl:hidden">
        {materials.map((material) => (
          <article className="rounded-md border border-border bg-surface p-4 shadow-subtle" key={material.material_id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><h2 className="truncate font-semibold text-foreground">{material.name}</h2><p className="mt-1 text-sm text-muted-foreground">{material.category_name ?? 'Sem categoria'}</p></div>
              <Badge tone={getStockStatusTone(material.stock_status)}>{getStockStatusLabel(material.stock_status)}</Badge>
            </div>
            <p className="mt-3 text-sm text-foreground">{formatQuantity(material.current_stock)} {getUnitLabel(material.unit).toLowerCase()} disponiveis</p>
            <p className="mt-1 text-sm text-muted-foreground">Minimo: {formatQuantity(material.minimum_stock)}</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Button onClick={() => onConsume(material)} variant="secondary">Registrar consumo</Button>
              <Button onClick={() => onLoss(material)} variant="secondary">Registrar perda</Button>
              <Button onClick={() => onAdjust(material)} variant="secondary">Ajustar estoque</Button>
              <Button onClick={() => onSelect(material)} variant="secondary">Ver material</Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

function MovementHistory({ isLoading, movements }: { isLoading: boolean; movements: Array<{ movement_id: string; movement_type: InventoryMovementType; notes: string | null; occurred_at: string; quantity: number; signed_quantity: number; unit_cost: number | null }> }) {
  if (isLoading) return <div className="h-40 rounded-md border border-border bg-background" />
  if (!movements.length) return <EmptyState description="Nenhuma movimentacao registrada para este material." title="Sem historico." />

  return (
    <div className="grid gap-2">
      {movements.map((movement) => (
        <article className="grid gap-2 rounded border border-border bg-background p-3 text-sm sm:grid-cols-[120px_1fr_120px]" key={movement.movement_id}>
          <span className="text-muted-foreground">{formatDateTime(movement.occurred_at)}</span>
          <div><p className="font-semibold text-foreground">{getMovementLabel(movement.movement_type)}</p><p className="text-muted-foreground">{movement.notes ?? '-'}</p></div>
          <span className={movement.signed_quantity >= 0 ? 'font-semibold text-success' : 'font-semibold text-danger'}>{movement.signed_quantity >= 0 ? '+' : ''}{formatQuantity(movement.signed_quantity)}</span>
        </article>
      ))}
    </div>
  )
}

function PurchaseList({ onCancel, onOpen, onReceive, onReceiveAndPay, purchases }: { onCancel: (purchase: PurchaseRow) => void; onOpen: (id: string) => void; onReceive: (purchase: PurchaseRow) => void; onReceiveAndPay: (purchase: PurchaseRow) => void; purchases: PurchaseRow[] }) {
  return (
    <div className="grid gap-3">
      {purchases.map((purchase) => (
        <article className="rounded-md border border-border bg-surface p-4 shadow-subtle" key={purchase.purchase_id}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div><h2 className="font-semibold text-foreground">{purchase.supplier_name ?? 'Sem fornecedor'}</h2><p className="mt-1 text-sm text-muted-foreground">{formatDate(purchase.purchase_date)} - {purchase.items_count} itens</p></div>
            <div className="flex flex-wrap gap-2"><Badge tone={getPurchaseStatusTone(purchase.status)}>{getPurchaseStatusLabel(purchase.status)}</Badge><Badge tone={getFinanceStatusTone(purchase.finance_status)}>{getFinanceStatusLabel(purchase.finance_status)}</Badge></div>
          </div>
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3"><SummaryBox label="Total" value={formatMoney(purchase.total_amount)} /><SummaryBox label="Pago" value={formatMoney(purchase.paid_amount)} /><SummaryBox label="Saldo" value={formatMoney(purchase.balance)} /></dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => onOpen(purchase.purchase_id)} size="sm" variant="secondary">Ficha</Button>
            {purchase.status === 'draft' ? <Button onClick={() => onReceive(purchase)} size="sm" variant="secondary">Confirmar recebimento</Button> : null}
            {purchase.status === 'draft' ? <Button onClick={() => onReceiveAndPay(purchase)} size="sm" variant="secondary">Receber e pagar</Button> : null}
            {purchase.status === 'draft' ? <Button onClick={() => onCancel(purchase)} size="sm" variant="danger">Cancelar</Button> : null}
          </div>
        </article>
      ))}
    </div>
  )
}

function SupplierList({ onEdit, suppliers }: { onEdit: (supplier: SupplierRow) => void; suppliers: SupplierRow[] }) {
  if (!suppliers.length) return <EmptyState description="Cadastre fornecedores simples para compras de materiais." title="Nenhum fornecedor." />
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {suppliers.map((supplier) => (
        <article className="rounded-md border border-border bg-surface p-4 shadow-subtle" key={supplier.supplier_id}>
          <h2 className="font-semibold text-foreground">{supplier.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{supplier.phone ?? supplier.email ?? 'Sem contato'}</p>
          <p className="mt-2 text-sm text-muted-foreground">Ultima compra: {formatDate(supplier.last_purchase_date)}</p>
          <Button className="mt-4 w-full" onClick={() => onEdit(supplier)} variant="secondary">Editar</Button>
        </article>
      ))}
    </div>
  )
}

function MaterialDrawer({ categories, editingMaterial, isOpen, onClose }: { categories: MaterialCategory[]; editingMaterial: MaterialRow | null; isOpen: boolean; onClose: () => void }) {
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [unit, setUnit] = useState<MaterialUnit>('unit')
  const [minimumStock, setMinimumStock] = useState('0')
  const [initialStock, setInitialStock] = useState('0')
  const [notes, setNotes] = useState('')
  const createMutation = useCreateMaterial()
  const updateMutation = useUpdateMaterial()
  const categoryMutation = useCreateMaterialCategory()
  const { notify } = useToast()
  const isEditing = Boolean(editingMaterial)

  useEffect(() => {
    if (!isOpen) return
    setName(editingMaterial?.name ?? '')
    setCategoryId(editingMaterial?.category_id ?? '')
    setUnit(editingMaterial?.unit ?? 'unit')
    setMinimumStock(String(editingMaterial?.minimum_stock ?? 0))
    setInitialStock('0')
    setNotes(editingMaterial?.notes ?? '')
  }, [editingMaterial, isOpen])

  async function addCategory() {
    const categoryName = window.prompt('Nome da categoria')
    if (!categoryName?.trim()) return
    try {
      const id = await categoryMutation.mutateAsync(categoryName)
      setCategoryId(id)
      notify({ title: 'Categoria criada.', tone: 'success' })
    } catch (error) {
      notify({ title: 'Nao foi possivel criar categoria.', description: getUserSafeErrorMessage(error), tone: 'error' })
    }
  }

  async function submit() {
    if (name.trim().length < 2) return
    try {
      if (editingMaterial) {
        await updateMutation.mutateAsync({ categoryId, materialId: editingMaterial.material_id, minimumStock: Number(minimumStock || 0), name, notes, unit })
        notify({ title: 'Material atualizado.', tone: 'success' })
      } else {
        await createMutation.mutateAsync({ categoryId, initialStock: Number(initialStock || 0), minimumStock: Number(minimumStock || 0), name, notes, unit })
        notify({ title: 'Material criado.', tone: 'success' })
      }
      onClose()
    } catch (error) {
      notify({ title: 'Nao foi possivel salvar material.', description: getUserSafeErrorMessage(error), tone: 'error' })
    }
  }

  return (
    <Overlay isOpen={isOpen} onClose={onClose} side="right" title={isEditing ? 'Editar material' : 'Novo material'}>
      <FormShell onSubmit={() => void submit()}>
        <Input label="Nome" onChange={(event) => setName(event.target.value)} value={name} />
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <Select label="Categoria" onChange={(event) => setCategoryId(event.target.value)} value={categoryId}>
            <option value="">Sem categoria</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </Select>
          <div className="flex items-end"><Button onClick={() => void addCategory()} type="button" variant="secondary">Nova</Button></div>
        </div>
        <Select label="Unidade" onChange={(event) => setUnit(event.target.value as MaterialUnit)} value={unit}>{materialUnitOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select>
        <Input inputMode="decimal" label="Estoque minimo" min={0} onChange={(event) => setMinimumStock(event.target.value)} step="0.001" type="number" value={minimumStock} />
        {!isEditing ? <Input inputMode="decimal" label="Estoque inicial" min={0} onChange={(event) => setInitialStock(event.target.value)} step="0.001" type="number" value={initialStock} /> : null}
        <Textarea label="Observacoes" onChange={(event) => setNotes(event.target.value)} value={notes} />
        <DrawerFooter isLoading={createMutation.isPending || updateMutation.isPending} onClose={onClose} submitLabel="Salvar" />
      </FormShell>
    </Overlay>
  )
}

function MovementDrawer({ material, movementType, onClose }: { material: MaterialRow | null; movementType: Exclude<InventoryMovementType, 'purchase'>; onClose: () => void }) {
  const [type, setType] = useState<Exclude<InventoryMovementType, 'purchase'>>(movementType)
  const [quantity, setQuantity] = useState('')
  const [countedStock, setCountedStock] = useState('')
  const [notes, setNotes] = useState('')
  const mutation = useRecordInventoryMovement()
  const { notify } = useToast()

  useEffect(() => {
    if (!material) return
    setType(movementType)
    setQuantity('')
    setCountedStock(String(material.current_stock))
    setNotes('')
  }, [material, movementType])

  const computedQuantity = type === 'adjustment_in' || type === 'adjustment_out'
    ? Math.abs(Number(countedStock || 0) - Number(material?.current_stock ?? 0))
    : Number(quantity || 0)
  const computedType = type === 'adjustment_in' || type === 'adjustment_out'
    ? Number(countedStock || 0) >= Number(material?.current_stock ?? 0) ? 'adjustment_in' : 'adjustment_out'
    : type
  const requiresReason = computedType === 'loss' || computedType === 'adjustment_out'

  async function submit() {
    if (!material || computedQuantity <= 0 || (requiresReason && notes.trim().length < 4)) return
    try {
      await mutation.mutateAsync({ materialId: material.material_id, movementType: computedType, notes, quantity: computedQuantity })
      notify({ title: 'Movimentacao registrada.', tone: 'success' })
      onClose()
    } catch (error) {
      notify({ title: 'Nao foi possivel movimentar estoque.', description: getUserSafeErrorMessage(error), tone: 'error' })
    }
  }

  return (
    <Overlay isOpen={Boolean(material)} onClose={onClose} side="right" title="Movimentar estoque">
      <FormShell onSubmit={() => void submit()}>
        <div className="rounded-md border border-border bg-background p-3"><p className="font-semibold text-foreground">{material?.name}</p><p className="mt-1 text-sm text-muted-foreground">Disponivel: {formatQuantity(material?.current_stock)} {material ? getUnitLabel(material.unit).toLowerCase() : ''}</p></div>
        <Select label="Tipo" onChange={(event) => setType(event.target.value as Exclude<InventoryMovementType, 'purchase'>)} value={type}>
          <option value="consumption">Consumo</option>
          <option value="loss">Perda</option>
          <option value="adjustment_in">Ajuste por contagem</option>
          <option value="return">Devolucao</option>
        </Select>
        {type === 'adjustment_in' || type === 'adjustment_out' ? <Input inputMode="decimal" label="Estoque contado" min={0} onChange={(event) => setCountedStock(event.target.value)} step="0.001" type="number" value={countedStock} /> : <Input inputMode="decimal" label="Quantidade" min={0} onChange={(event) => setQuantity(event.target.value)} step="0.001" type="number" value={quantity} />}
        <Textarea label={requiresReason ? 'Motivo' : 'Observacao'} onChange={(event) => setNotes(event.target.value)} value={notes} />
        <p className="text-sm text-muted-foreground">Movimento gerado: {getMovementLabel(computedType)} de {formatQuantity(computedQuantity)}.</p>
        <DrawerFooter isLoading={mutation.isPending} onClose={onClose} submitLabel="Registrar" />
      </FormShell>
    </Overlay>
  )
}

function SupplierDrawer({ editingSupplier, isOpen, onClose }: { editingSupplier: SupplierRow | null; isOpen: boolean; onClose: () => void }) {
  const [name, setName] = useState('')
  const [contactName, setContactName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const mutation = useUpsertSupplier()
  const { notify } = useToast()

  useEffect(() => {
    if (!isOpen) return
    setName(editingSupplier?.name ?? '')
    setContactName(editingSupplier?.contact_name ?? '')
    setPhone(editingSupplier?.phone ?? '')
    setEmail(editingSupplier?.email ?? '')
    setNotes(editingSupplier?.notes ?? '')
  }, [editingSupplier, isOpen])

  async function submit() {
    if (name.trim().length < 2) return
    try {
      await mutation.mutateAsync({ contactName, email, name, notes, phone, supplierId: editingSupplier?.supplier_id })
      notify({ title: editingSupplier ? 'Fornecedor atualizado.' : 'Fornecedor criado.', tone: 'success' })
      onClose()
    } catch (error) {
      notify({ title: 'Nao foi possivel salvar fornecedor.', description: getUserSafeErrorMessage(error), tone: 'error' })
    }
  }

  return (
    <Overlay isOpen={isOpen} onClose={onClose} side="right" title={editingSupplier ? 'Editar fornecedor' : 'Novo fornecedor'}>
      <FormShell onSubmit={() => void submit()}>
        <Input label="Nome" onChange={(event) => setName(event.target.value)} value={name} />
        <Input label="Contato" onChange={(event) => setContactName(event.target.value)} value={contactName} />
        <Input label="Telefone" onChange={(event) => setPhone(event.target.value)} value={phone} />
        <Input label="Email" onChange={(event) => setEmail(event.target.value)} type="email" value={email} />
        <Textarea label="Observacoes" onChange={(event) => setNotes(event.target.value)} value={notes} />
        <DrawerFooter isLoading={mutation.isPending} onClose={onClose} submitLabel="Salvar" />
      </FormShell>
    </Overlay>
  )
}

function PurchaseDrawer({ isOpen, materials, onClose, suppliers }: { categories: MaterialCategory[]; isOpen: boolean; materials: MaterialRow[]; onClose: () => void; suppliers: SupplierRow[] }) {
  const today = useMemo(() => toIsoDate(new Date()), [])
  const [supplierId, setSupplierId] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(today)
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [settleNow, setSettleNow] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix')
  const [items, setItems] = useState([{ materialId: '', quantity: '1', unitCost: '0' }])
  const createMutation = useCreatePurchase()
  const receiveMutation = useReceivePurchase()
  const accountsQuery = useMaterialCashAccounts()
  const { notify } = useToast()
  const total = items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitCost || 0), 0)

  useEffect(() => {
    if (!isOpen) return
    setSupplierId('')
    setPurchaseDate(today)
    setDueDate('')
    setNotes('')
    setSettleNow(false)
    setPaymentMethod('pix')
    setItems([{ materialId: '', quantity: '1', unitCost: '0' }])
  }, [isOpen, today])

  function updateItem(index: number, patch: Partial<{ materialId: string; quantity: string; unitCost: string }>) {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item))
  }

  async function submit(receiveImmediately: boolean) {
    const validItems = items.filter((item) => item.materialId && Number(item.quantity) > 0)
    if (!validItems.length) return
    try {
      const purchaseId = await createMutation.mutateAsync({
        dueDate: dueDate || null,
        items: validItems.map((item) => ({ materialId: item.materialId, quantity: Number(item.quantity), unitCost: Number(item.unitCost || 0) })),
        notes,
        purchaseDate,
        supplierId,
      })
      if (receiveImmediately) {
        await receiveMutation.mutateAsync({ cashAccountId: accountsQuery.data?.[0]?.id ?? null, paymentMethod, purchaseId, settleNow, settledAt: toPaymentTimestamp(toLocalDateTimeInputValue()) })
      }
      notify({ title: receiveImmediately ? 'Compra recebida.' : 'Compra salva em rascunho.', tone: 'success' })
      onClose()
    } catch (error) {
      notify({ title: 'Nao foi possivel salvar compra.', description: getUserSafeErrorMessage(error), tone: 'error' })
    }
  }

  return (
    <Overlay isOpen={isOpen} onClose={onClose} side="wide" title="Nova compra">
      <FormShell onSubmit={() => void submit(false)}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Select label="Fornecedor" onChange={(event) => setSupplierId(event.target.value)} value={supplierId}><option value="">Sem fornecedor</option>{suppliers.map((supplier) => <option key={supplier.supplier_id} value={supplier.supplier_id}>{supplier.name}</option>)}</Select>
          <Input label="Data" onChange={(event) => setPurchaseDate(event.target.value)} type="date" value={purchaseDate} />
          <Input label="Vencimento" onChange={(event) => setDueDate(event.target.value)} type="date" value={dueDate} />
        </div>
        <section className="grid gap-3">
          <div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-foreground">Itens</h3><Button onClick={() => setItems((current) => [...current, { materialId: '', quantity: '1', unitCost: '0' }])} size="sm" type="button" variant="secondary">Adicionar item</Button></div>
          {items.map((item, index) => (
            <div className="grid gap-3 rounded-md border border-border bg-background p-3 lg:grid-cols-[minmax(220px,1fr)_120px_140px_120px]" key={index}>
              <Select label="Material" onChange={(event) => updateItem(index, { materialId: event.target.value })} value={item.materialId}><option value="">Selecione</option>{materials.map((material) => <option key={material.material_id} value={material.material_id}>{material.name}</option>)}</Select>
              <Input inputMode="decimal" label="Quantidade" min={0} onChange={(event) => updateItem(index, { quantity: event.target.value })} step="0.001" type="number" value={item.quantity} />
              <Input inputMode="decimal" label="Custo unitario" min={0} onChange={(event) => updateItem(index, { unitCost: event.target.value })} step="0.0001" type="number" value={item.unitCost} />
              <div className="flex items-end text-sm font-semibold text-foreground">{formatMoney(Number(item.quantity || 0) * Number(item.unitCost || 0))}</div>
            </div>
          ))}
        </section>
        <div className="rounded-md border border-border bg-background p-3 text-right text-lg font-semibold text-foreground">Total: {formatMoney(total)}</div>
        <Textarea label="Observacoes" onChange={(event) => setNotes(event.target.value)} value={notes} />
        <section className="grid gap-3 rounded-md border border-border bg-background p-3">
          <Checkbox checked={settleNow} label="Registrar pagamento agora ao receber" onChange={(event) => setSettleNow(event.target.checked)} />
          {settleNow ? <Select label="Forma" onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)} value={paymentMethod}>{paymentMethodOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select> : null}
        </section>
        <div className="grid gap-2 sm:grid-cols-3">
          <Button onClick={onClose} type="button" variant="secondary">Cancelar</Button>
          <Button isLoading={createMutation.isPending} type="submit" variant="secondary">Salvar rascunho</Button>
          <Button isLoading={createMutation.isPending || receiveMutation.isPending} leftIcon={<Save className="h-4 w-4" aria-hidden />} onClick={() => void submit(true)} type="button">Confirmar recebimento</Button>
        </div>
      </FormShell>
    </Overlay>
  )
}

function PurchaseDetailDrawer({ onClose, purchaseId }: { onClose: () => void; purchaseId: string | null }) {
  const query = usePurchaseDetail(purchaseId)
  const detail = query.data
  const items = Array.isArray(detail?.items) ? detail.items as Array<{ material_name: string; quantity: number; unit: MaterialUnit; unit_cost: number; total_amount: number }> : []

  return (
    <Overlay isOpen={Boolean(purchaseId)} onClose={onClose} side="right" title="Ficha da compra">
      {query.isLoading ? <div className="h-48 rounded-md border border-border bg-background" /> : detail ? (
        <div className="grid gap-4">
          <div className="rounded-md border border-border bg-background p-3"><p className="font-semibold text-foreground">{detail.supplier_name ?? 'Sem fornecedor'}</p><p className="mt-1 text-sm text-muted-foreground">{formatDate(detail.purchase_date)} - {getPurchaseStatusLabel(detail.status)}</p></div>
          <dl className="grid grid-cols-3 gap-2 text-sm"><SummaryBox label="Total" value={formatMoney(detail.total_amount)} /><SummaryBox label="Pago" value={formatMoney(detail.paid_amount)} /><SummaryBox label="Saldo" value={formatMoney(detail.balance)} /></dl>
          <div className="grid gap-2">
            {items.map((item, index) => <div className="rounded border border-border bg-background p-2 text-sm" key={`${item.material_name}-${index}`}><p className="font-semibold text-foreground">{item.material_name}</p><p className="text-muted-foreground">{formatQuantity(item.quantity)} {getUnitLabel(item.unit).toLowerCase()} x {formatMoney(item.unit_cost)} = {formatMoney(item.total_amount)}</p></div>)}
          </div>
          {detail.financial_entry_id ? <Button onClick={() => window.location.assign('/financeiro')} variant="secondary">Abrir no Financeiro</Button> : null}
        </div>
      ) : <ErrorState title="Compra nao encontrada." />}
    </Overlay>
  )
}

function SummaryItem({ label, tone, value }: { label: string; tone?: 'warning' | 'danger'; value: string }) {
  const toneClass = tone === 'danger' ? 'border-danger/30 bg-danger/5 text-danger' : tone === 'warning' ? 'border-warning/30 bg-warning/10 text-amber-700' : 'border-border bg-surface text-foreground'
  return <div className={`rounded-md border p-3 shadow-subtle ${toneClass}`}><dt className="text-muted-foreground">{label}</dt><dd className="mt-1 text-2xl font-semibold">{value}</dd></div>
}

function SummaryBox({ label, value }: { label: string; value: string }) {
  return <div className="rounded border border-border bg-background p-2"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 truncate font-semibold text-foreground">{value}</dd></div>
}

function DrawerFooter({ isLoading, onClose, submitLabel }: { isLoading: boolean; onClose: () => void; submitLabel: string }) {
  return <footer className="grid gap-2 sm:grid-cols-2"><Button onClick={onClose} type="button" variant="secondary">Cancelar</Button><Button isLoading={isLoading} type="submit">{submitLabel}</Button></footer>
}

function FormShell({ children, onSubmit }: { children: ReactNode; onSubmit: () => void }) {
  return <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); onSubmit() }}>{children}</form>
}

function MainPanel({ children, error, isError, isLoading, onRetry, title }: { children: ReactNode; error: unknown; isError: boolean; isLoading: boolean; onRetry: () => void; title: string }) {
  if (isLoading) return <div className="h-72 rounded-md border border-border bg-surface shadow-subtle" />
  if (isError) return <ErrorState description={getUserSafeErrorMessage(error)} onRetry={onRetry} title={title} />
  return <>{children}</>
}

function PagedFooter({ page, setPage, totalCount, totalPages, unit }: { page: number; setPage: (page: number) => void; totalCount: number; totalPages: number; unit: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-surface p-3 shadow-subtle sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">Pagina {page} de {totalPages}, {totalCount} {unit}{totalCount === 1 ? '' : 's'}.</p>
      <Pagination onNext={() => setPage(Math.min(totalPages, page + 1))} onPrevious={() => setPage(Math.max(1, page - 1))} page={page} totalPages={totalPages} />
    </div>
  )
}
