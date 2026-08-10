import type { Database } from './database.types'

export type AppRole = Database['public']['Enums']['app_role']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Student = Database['public']['Tables']['students']['Row']
export type StudentStatus = Database['public']['Enums']['student_status']
