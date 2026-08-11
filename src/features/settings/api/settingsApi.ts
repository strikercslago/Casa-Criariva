import { getSupabaseClient } from '@/lib/supabase/client'
import type { AppRole } from '@/lib/supabase/types'

type UntypedRpcClient = {
  rpc: (
    fn: string,
    args?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: Error | null }>
}

export type ApplicationSettings = {
  organization_name: string
  display_name: string
  phone: string | null
  email: string | null
  timezone: string
  locale: string
  currency_code: string
  default_class_duration_minutes: number
  default_due_day: number
  default_page_size: number
  low_stock_threshold: number
  updated_at: string
}

export type AdminUser = {
  id: string
  email: string
  full_name: string
  is_active: boolean
  roles: AppRole[]
  last_sign_in_at: string | null
  created_at: string | null
}

export type AuditLogRow = {
  id: string
  created_at: string
  actor_user_id: string | null
  actor_name: string
  entity_type: string
  entity_id: string
  action: string
  summary: string
  total_count: number
}

function requireClient() {
  const supabase = getSupabaseClient()

  if (!supabase) {
    throw new Error('Supabase nao configurado.')
  }

  return supabase
}

export async function getApplicationSettings() {
  const supabase = requireClient() as unknown as UntypedRpcClient
  const { data, error } = await supabase.rpc('get_application_settings')

  if (error) {
    throw error
  }

  return data as ApplicationSettings
}

export async function updateApplicationSettings(payload: Partial<ApplicationSettings>) {
  const supabase = requireClient() as unknown as UntypedRpcClient
  const { data, error } = await supabase.rpc('update_application_settings', { payload })

  if (error) {
    throw error
  }

  return data as ApplicationSettings
}

export async function listAuditEvents(filters: {
  action?: string
  entityType?: string
  page?: number
  pageSize?: number
}) {
  const supabase = requireClient() as unknown as UntypedRpcClient
  const { data, error } = await supabase.rpc('list_admin_audit_events', {
    p_action: filters.action || null,
    p_actor_user_id: null,
    p_end_date: null,
    p_entity_type: filters.entityType || null,
    p_page: filters.page ?? 1,
    p_page_size: filters.pageSize ?? 20,
    p_start_date: null,
  })

  if (error) {
    throw error
  }

  return (data ?? []) as AuditLogRow[]
}

async function invokeAdminUsers<T>(action: string, payload: Record<string, unknown> = {}) {
  const supabase = requireClient()
  const { data, error } = await supabase.functions.invoke('admin-users', {
    body: { action, ...payload },
  })

  if (error) {
    throw error
  }

  return data as T
}

export function listAdminUsers() {
  return invokeAdminUsers<{ users: AdminUser[] }>('list')
}

export function inviteAdminUser(payload: { email: string; fullName: string; role: AppRole }) {
  return invokeAdminUsers<{ user: AdminUser }>('invite', payload)
}

export function updateAdminUserRole(payload: { userId: string; role: AppRole }) {
  return invokeAdminUsers<{ user: AdminUser }>('set-role', payload)
}

export function deactivateAdminUser(userId: string) {
  return invokeAdminUsers<{ user: AdminUser }>('deactivate', { userId })
}
