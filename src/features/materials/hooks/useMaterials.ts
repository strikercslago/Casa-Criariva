import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  archiveMaterial,
  cancelPurchase,
  createMaterial,
  createMaterialCategory,
  createPurchase,
  getInventorySummary,
  getPurchaseDetail,
  listCashAccounts,
  listInventoryMovements,
  listMaterialCategories,
  listMaterials,
  listPurchases,
  listSuppliers,
  receivePurchase,
  recordInventoryMovement,
  updateMaterial,
  upsertSupplier,
} from '@/features/materials/api/materialsApi'
import { inventoryKeys, materialsKeys, purchasesKeys, suppliersKeys } from '@/features/materials/hooks/materialsKeys'
import type {
  CreateMaterialInput,
  CreatePurchaseInput,
  InventoryMovementsFilters,
  MaterialsFilters,
  PurchasesFilters,
  ReceivePurchaseInput,
  RecordInventoryMovementInput,
  SupplierInput,
  SuppliersFilters,
  UpdateMaterialInput,
} from '@/features/materials/types/materialsTypes'
import { financeKeys } from '@/features/finance/hooks/financeKeys'
import { dashboardKeys, reportsKeys } from '@/features/reports/hooks/reportsKeys'

const MATERIALS_STALE_TIME_MS = 45_000

export function useInventorySummary() {
  return useQuery({
    queryFn: getInventorySummary,
    queryKey: inventoryKeys.summary(),
    staleTime: MATERIALS_STALE_TIME_MS,
  })
}

export function useMaterialCategories() {
  return useQuery({
    queryFn: listMaterialCategories,
    queryKey: materialsKeys.categories(),
    staleTime: MATERIALS_STALE_TIME_MS * 5,
  })
}

export function useMaterials(filters: MaterialsFilters) {
  return useQuery({
    placeholderData: keepPreviousData,
    queryFn: () => listMaterials(filters),
    queryKey: materialsKeys.list(filters),
    staleTime: MATERIALS_STALE_TIME_MS,
  })
}

export function useInventoryMovements(filters: InventoryMovementsFilters | null) {
  return useQuery({
    enabled: Boolean(filters?.materialId),
    placeholderData: keepPreviousData,
    queryFn: () => listInventoryMovements(filters as InventoryMovementsFilters),
    queryKey: filters ? materialsKeys.movements(filters.materialId, filters) : [...materialsKeys.all, 'movements', 'none'],
    staleTime: MATERIALS_STALE_TIME_MS,
  })
}

export function useSuppliers(filters: SuppliersFilters) {
  return useQuery({
    placeholderData: keepPreviousData,
    queryFn: () => listSuppliers(filters),
    queryKey: suppliersKeys.list(filters),
    staleTime: MATERIALS_STALE_TIME_MS,
  })
}

export function usePurchases(filters: PurchasesFilters) {
  return useQuery({
    placeholderData: keepPreviousData,
    queryFn: () => listPurchases(filters),
    queryKey: purchasesKeys.list(filters),
    staleTime: MATERIALS_STALE_TIME_MS,
  })
}

export function usePurchaseDetail(purchaseId: string | null) {
  return useQuery({
    enabled: Boolean(purchaseId),
    queryFn: () => getPurchaseDetail(purchaseId ?? ''),
    queryKey: purchaseId ? purchasesKeys.detail(purchaseId) : [...purchasesKeys.all, 'detail', 'none'],
    staleTime: MATERIALS_STALE_TIME_MS,
  })
}

export function useMaterialCashAccounts() {
  return useQuery({
    queryFn: listCashAccounts,
    queryKey: [...materialsKeys.all, 'cash-accounts'] as const,
    staleTime: MATERIALS_STALE_TIME_MS * 5,
  })
}

export function useCreateMaterial() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: (input: CreateMaterialInput) => createMaterial(input), onSuccess: () => invalidateInventory(queryClient) })
}

export function useUpdateMaterial() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: (input: UpdateMaterialInput) => updateMaterial(input), onSuccess: () => invalidateInventory(queryClient) })
}

export function useArchiveMaterial() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: (materialId: string) => archiveMaterial(materialId), onSuccess: () => invalidateInventory(queryClient) })
}

export function useCreateMaterialCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => createMaterialCategory(name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: materialsKeys.categories() })
    },
  })
}

export function useRecordInventoryMovement() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: (input: RecordInventoryMovementInput) => recordInventoryMovement(input), onSuccess: () => invalidateInventory(queryClient) })
}

export function useUpsertSupplier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: SupplierInput) => upsertSupplier(input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: suppliersKeys.all }),
  })
}

export function useCreatePurchase() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreatePurchaseInput) => createPurchase(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: purchasesKeys.all })
      void queryClient.invalidateQueries({ queryKey: suppliersKeys.all })
    },
  })
}

export function useReceivePurchase() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ReceivePurchaseInput) => receivePurchase(input),
    onSuccess: () => {
      invalidateInventory(queryClient)
      void queryClient.invalidateQueries({ queryKey: purchasesKeys.all })
      void queryClient.invalidateQueries({ queryKey: financeKeys.all })
    },
  })
}

export function useCancelPurchase() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ purchaseId, reason }: { purchaseId: string; reason: string }) => cancelPurchase(purchaseId, reason),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: purchasesKeys.all }),
  })
}

function invalidateInventory(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: materialsKeys.all })
  void queryClient.invalidateQueries({ queryKey: inventoryKeys.all })
  void queryClient.invalidateQueries({ queryKey: dashboardKeys.operationsRoot() })
  void queryClient.invalidateQueries({ queryKey: dashboardKeys.attentionRoot() })
  void queryClient.invalidateQueries({ queryKey: reportsKeys.all })
}
