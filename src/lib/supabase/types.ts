import type { Database } from './database.types'

export type AppRole = Database['public']['Enums']['app_role']
export type Profile = Database['public']['Tables']['profiles']['Row']
