import type { AppRole } from '@/lib/supabase/types'

export type PermissionLevel = '-' | 'READ' | 'CRUD' | 'LIMITED' | 'OPERATIONAL' | 'OWNER'

export type PermissionModule =
  | 'dashboard'
  | 'students'
  | 'guardians'
  | 'classes'
  | 'agenda'
  | 'attendance'
  | 'billing'
  | 'finance'
  | 'events'
  | 'materials'
  | 'reports'
  | 'settings'
  | 'users'
  | 'audit'
  | 'security'

export const roleLabels: Record<AppRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  teacher: 'Professor',
}

export const permissionMatrix: Record<PermissionModule, Record<AppRole, PermissionLevel>> = {
  dashboard: { owner: 'CRUD', admin: 'READ', teacher: 'LIMITED' },
  students: { owner: 'CRUD', admin: 'CRUD', teacher: 'READ' },
  guardians: { owner: 'CRUD', admin: 'CRUD', teacher: '-' },
  classes: { owner: 'CRUD', admin: 'CRUD', teacher: 'READ' },
  agenda: { owner: 'CRUD', admin: 'CRUD', teacher: 'OPERATIONAL' },
  attendance: { owner: 'CRUD', admin: 'CRUD', teacher: 'OPERATIONAL' },
  billing: { owner: 'CRUD', admin: 'CRUD', teacher: '-' },
  finance: { owner: 'CRUD', admin: '-', teacher: '-' },
  events: { owner: 'CRUD', admin: 'CRUD', teacher: '-' },
  materials: { owner: 'CRUD', admin: 'CRUD', teacher: '-' },
  reports: { owner: 'CRUD', admin: '-', teacher: '-' },
  settings: { owner: 'CRUD', admin: 'READ', teacher: 'READ' },
  users: { owner: 'OWNER', admin: '-', teacher: '-' },
  audit: { owner: 'OWNER', admin: '-', teacher: '-' },
  security: { owner: 'OWNER', admin: 'READ', teacher: 'READ' },
}

export function hasAnyRole(userRoles: AppRole[], allowedRoles: AppRole[]) {
  return allowedRoles.some((role) => userRoles.includes(role))
}

export function canAccessModule(userRoles: AppRole[], module: PermissionModule) {
  return userRoles.some((role) => permissionMatrix[module][role] !== '-')
}

export function allowedRolesForModule(module: PermissionModule): AppRole[] {
  return (Object.keys(permissionMatrix[module]) as AppRole[]).filter(
    (role) => permissionMatrix[module][role] !== '-',
  )
}
