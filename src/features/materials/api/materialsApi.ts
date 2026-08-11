import { AppError } from '@/lib/errors/AppError'
import { createTimeoutError } from '@/app/providers/authErrors'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { Json } from '@/lib/supabase/database.types'
import { withTimeout } from '@/shared/utils/withTimeout'
import type {
  CashAccount,
  CreateMaterialInput,
  CreatePurchaseInput,
  InventoryMovementRow,
  InventoryMovementsFilters,
  InventorySummary,
  MaterialCategory,
  MaterialRow,
  MaterialsFilters,
  PagedResult,
  PurchaseDetailRow,
  PurchaseRow,
  PurchasesFilters,
  ReceivePurchaseInput,
  RecordInventoryMovementInput,
  SupplierInput,
  SupplierRow,
  SuppliersFilters,
  UpdateMaterialInput,
} from '@/features/materials/types/materialsTypes'
import { mapMaterialsError } from '@/features/materials/utils/materialsErrors'

const MATERIALS_TIMEOUT_MS = 12_000

function getClient() {
  const supabase = getSupabaseClient()

  if (!supabase) {
    throw new AppError('auth', 'Supabase ainda nao esta configurado neste ambiente.')
  }

  return supabase
}

export async function listMaterialCategories(): Promise<MaterialCategory[]> {
  const supabase = getClient()
  const { data, error } = await withTimeout(
    supabase.from('material_categories').select('*').eq('is_active', true).order('name'),
    MATERIALS_TIMEOUT_MS,
    createTimeoutError,
  )

  if (error) throw mapMaterialsError(error)
  return (data ?? []) as MaterialCategory[]
}

export async function listCashAccounts(): Promise<CashAccount[]> {
  const supabase = getClient()
  const { data, error } = await withTimeout(
    supabase.from('cash_accounts').select('*').eq('is_active', true).order('name'),
    MATERIALS_TIMEOUT_MS,
    createTimeoutError,
  )

  if (error) throw mapMaterialsError(error)
  return (data ?? []) as CashAccount[]
}

export async function getInventorySummary(): Promise<InventorySummary> {
  const supabase = getClient()
  const { data, error } = await withTimeout(supabase.rpc('get_inventory_summary'), MATERIALS_TIMEOUT_MS, createTimeoutError)

  if (error) throw mapMaterialsError(error)
  return data?.[0] ?? { low_stock_count: 0, materials_count: 0, out_of_stock_count: 0, recent_purchases_count: 0 }
}

export async function listMaterials(filters: MaterialsFilters): Promise<PagedResult<MaterialRow>> {
  const supabase = getClient()
  const { data, error } = await withTimeout(
    supabase.rpc('list_materials', {
      p_active_filter: filters.active,
      p_category_id: filters.categoryId ?? undefined,
      p_page: filters.page,
      p_page_size: filters.pageSize,
      p_search: filters.search.trim(),
      p_stock_filter: filters.stock,
    }),
    MATERIALS_TIMEOUT_MS,
    createTimeoutError,
  )

  if (error) throw mapMaterialsError(error)
  return toPagedResult((data ?? []) as MaterialRow[], filters.pageSize)
}

export async function listInventoryMovements(filters: InventoryMovementsFilters): Promise<PagedResult<InventoryMovementRow>> {
  const supabase = getClient()
  const { data, error } = await withTimeout(
    supabase.rpc('list_inventory_movements', {
      p_material_id: filters.materialId,
      p_page: filters.page,
      p_page_size: filters.pageSize,
    }),
    MATERIALS_TIMEOUT_MS,
    createTimeoutError,
  )

  if (error) throw mapMaterialsError(error)
  return toPagedResult((data ?? []) as InventoryMovementRow[], filters.pageSize)
}

export async function listSuppliers(filters: SuppliersFilters): Promise<PagedResult<SupplierRow>> {
  const supabase = getClient()
  const { data, error } = await withTimeout(
    supabase.rpc('list_suppliers', {
      p_active_filter: filters.active,
      p_page: filters.page,
      p_page_size: filters.pageSize,
      p_search: filters.search.trim(),
    }),
    MATERIALS_TIMEOUT_MS,
    createTimeoutError,
  )

  if (error) throw mapMaterialsError(error)
  return toPagedResult((data ?? []) as SupplierRow[], filters.pageSize)
}

export async function listPurchases(filters: PurchasesFilters): Promise<PagedResult<PurchaseRow>> {
  const supabase = getClient()
  const { data, error } = await withTimeout(
    supabase.rpc('list_purchases', {
      p_page: filters.page,
      p_page_size: filters.pageSize,
      p_search: filters.search.trim(),
      p_status_filter: filters.status,
    }),
    MATERIALS_TIMEOUT_MS,
    createTimeoutError,
  )

  if (error) throw mapMaterialsError(error)
  return toPagedResult((data ?? []) as PurchaseRow[], filters.pageSize)
}

export async function getPurchaseDetail(purchaseId: string): Promise<PurchaseDetailRow> {
  const supabase = getClient()
  const { data, error } = await withTimeout(
    supabase.rpc('get_purchase_detail', { p_purchase_id: purchaseId }),
    MATERIALS_TIMEOUT_MS,
    createTimeoutError,
  )

  if (error) throw mapMaterialsError(error)
  if (!data?.[0]) throw new AppError('not-found', 'Compra nao encontrada.')
  return data[0] as PurchaseDetailRow
}

export async function createMaterial(input: CreateMaterialInput) {
  return runPayloadRpc<string>('create_material', {
    category_id: input.categoryId ?? null,
    initial_stock: input.initialStock ?? 0,
    initial_stock_notes: input.initialStockNotes ?? null,
    minimum_stock: input.minimumStock,
    name: input.name.trim(),
    notes: input.notes?.trim() || null,
    unit: input.unit,
  })
}

export async function updateMaterial(input: UpdateMaterialInput) {
  return runPayloadRpc<string>('update_material', {
    category_id: input.categoryId ?? null,
    material_id: input.materialId,
    minimum_stock: input.minimumStock,
    name: input.name.trim(),
    notes: input.notes?.trim() || null,
    unit: input.unit,
  })
}

export async function archiveMaterial(materialId: string) {
  return runPayloadRpc<string>('archive_material', { material_id: materialId })
}

export async function createMaterialCategory(name: string) {
  return runPayloadRpc<string>('create_material_category', { name: name.trim() })
}

export async function recordInventoryMovement(input: RecordInventoryMovementInput) {
  return runPayloadRpc('record_inventory_movement', {
    material_id: input.materialId,
    movement_type: input.movementType,
    notes: input.notes?.trim() || null,
    quantity: input.quantity,
  })
}

export async function upsertSupplier(input: SupplierInput) {
  return runPayloadRpc<string>('upsert_supplier', {
    contact_name: input.contactName?.trim() || null,
    email: input.email?.trim() || null,
    is_active: input.isActive ?? true,
    name: input.name.trim(),
    notes: input.notes?.trim() || null,
    phone: input.phone?.trim() || null,
    supplier_id: input.supplierId ?? null,
  })
}

export async function createPurchase(input: CreatePurchaseInput) {
  return runPayloadRpc<string>('create_purchase', {
    due_date: input.dueDate ?? null,
    items: input.items,
    notes: input.notes?.trim() || null,
    purchase_date: input.purchaseDate,
    supplier_id: input.supplierId ?? null,
  })
}

export async function receivePurchase(input: ReceivePurchaseInput) {
  return runPayloadRpc('receive_purchase', {
    cash_account_id: input.cashAccountId ?? null,
    payment_method: input.paymentMethod ?? 'pix',
    purchase_id: input.purchaseId,
    settle_now: input.settleNow,
    settled_at: input.settledAt ?? null,
  })
}

export async function cancelPurchase(purchaseId: string, reason: string) {
  return runPayloadRpc<string>('cancel_purchase', { purchase_id: purchaseId, reason: reason.trim() })
}

async function runPayloadRpc<TReturn>(rpcName: string, payload: Record<string, unknown>): Promise<TReturn> {
  const supabase = getClient()
  const rpc = supabase.rpc.bind(supabase) as unknown as (
    name: string,
    args: { payload: Json },
  ) => PromiseLike<{ data: unknown; error: { code?: string; message?: string } | null }>
  const { data, error } = await withTimeout(rpc(rpcName, { payload: payload as unknown as Json }), MATERIALS_TIMEOUT_MS, createTimeoutError)

  if (error) throw mapMaterialsError(error)
  return data as TReturn
}

function toPagedResult<TRow extends { total_count: number }>(rows: TRow[], pageSize: number): PagedResult<TRow> {
  const totalCount = rows[0]?.total_count ?? 0
  return {
    rows,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
  }
}
