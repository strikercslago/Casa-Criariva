import type {
  InventoryMovementsFilters,
  MaterialsFilters,
  PurchasesFilters,
  SuppliersFilters,
} from '@/features/materials/types/materialsTypes'

export const materialsKeys = {
  all: ['materials'] as const,
  categories: () => [...materialsKeys.all, 'categories'] as const,
  detail: (id: string) => [...materialsKeys.all, 'detail', id] as const,
  list: (filters: MaterialsFilters) => [...materialsKeys.all, 'list', filters] as const,
  movements: (id: string, filters: InventoryMovementsFilters) => [...materialsKeys.all, 'movements', id, filters] as const,
}

export const inventoryKeys = {
  all: ['inventory'] as const,
  summary: () => [...inventoryKeys.all, 'summary'] as const,
}

export const purchasesKeys = {
  all: ['purchases'] as const,
  detail: (id: string) => [...purchasesKeys.all, 'detail', id] as const,
  list: (filters: PurchasesFilters) => [...purchasesKeys.all, 'list', filters] as const,
}

export const suppliersKeys = {
  all: ['suppliers'] as const,
  list: (filters: SuppliersFilters) => [...suppliersKeys.all, 'list', filters] as const,
}
