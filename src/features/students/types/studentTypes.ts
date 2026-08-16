import type { Database } from '@/lib/supabase/database.types'

export type StudentStatus = Database['public']['Enums']['student_status']
export type StudentRow = Database['public']['Tables']['students']['Row']
export type StudentInsert = Database['public']['Tables']['students']['Insert']
export type StudentUpdate = Database['public']['Tables']['students']['Update']

export type StudentListItem = Pick<
  StudentRow,
  'birth_date' | 'enrollment_date' | 'full_name' | 'id' | 'photo_path' | 'preferred_name' | 'status'
>

export type StudentStatusFilter = 'all' | StudentStatus

export type StudentListFilters = {
  page: number
  pageSize: number
  search: string
  status: StudentStatusFilter
}

export type StudentListResult = {
  students: StudentListItem[]
  totalCount: number
  totalPages: number
}
