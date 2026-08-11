import type { Database } from '@/lib/supabase/database.types'

export type MaterialUnit = Database['public']['Enums']['material_unit']
export type InventoryMovementType = Database['public']['Enums']['inventory_movement_type']
export type PurchaseStatus = Database['public']['Enums']['purchase_status']
export type PaymentMethod = Database['public']['Enums']['payment_method']

export type MaterialCategory = Database['public']['Tables']['material_categories']['Row']
export type MaterialRow = Database['public']['Functions']['list_materials']['Returns'][number]
export type InventorySummary = Database['public']['Functions']['get_inventory_summary']['Returns'][number]
export type InventoryMovementRow = Database['public']['Functions']['list_inventory_movements']['Returns'][number]
export type SupplierRow = Database['public']['Functions']['list_suppliers']['Returns'][number]
export type PurchaseRow = Database['public']['Functions']['list_purchases']['Returns'][number]
export type PurchaseDetailRow = Database['public']['Functions']['get_purchase_detail']['Returns'][number]
export type CashAccount = Database['public']['Tables']['cash_accounts']['Row']

export type PagedResult<TRow> = {
  rows: TRow[]
  totalCount: number
  totalPages: number
}

export type MaterialsFilters = {
  active: 'active' | 'archived' | 'all'
  categoryId: string | null
  page: number
  pageSize: number
  search: string
  stock: 'all' | 'low' | 'out' | 'ok'
}

export type InventoryMovementsFilters = {
  materialId: string
  page: number
  pageSize: number
}

export type PurchasesFilters = {
  page: number
  pageSize: number
  search: string
  status: PurchaseStatus | 'all'
}

export type SuppliersFilters = {
  active: 'active' | 'archived' | 'all'
  page: number
  pageSize: number
  search: string
}

export type CreateMaterialInput = {
  categoryId?: string | null
  initialStock?: number
  initialStockNotes?: string
  minimumStock: number
  name: string
  notes?: string
  unit: MaterialUnit
}

export type UpdateMaterialInput = Omit<CreateMaterialInput, 'initialStock' | 'initialStockNotes'> & {
  materialId: string
}

export type RecordInventoryMovementInput = {
  materialId: string
  movementType: Exclude<InventoryMovementType, 'purchase'>
  notes?: string
  quantity: number
}

export type SupplierInput = {
  contactName?: string
  email?: string
  isActive?: boolean
  name: string
  notes?: string
  phone?: string
  supplierId?: string | null
}

export type PurchaseItemInput = {
  materialId: string
  quantity: number
  unitCost: number
}

export type CreatePurchaseInput = {
  dueDate?: string | null
  items: PurchaseItemInput[]
  notes?: string
  purchaseDate: string
  supplierId?: string | null
}

export type ReceivePurchaseInput = {
  cashAccountId?: string | null
  paymentMethod?: PaymentMethod
  purchaseId: string
  settleNow: boolean
  settledAt?: string
}
