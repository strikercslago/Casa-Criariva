export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type UserRole = 'owner' | 'admin' | 'teacher'

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          full_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          user_id: string
          role: UserRole
          created_at: string
        }
        Insert: {
          user_id: string
          role: UserRole
          created_at?: string
        }
        Update: {
          role?: UserRole
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      app_role: UserRole
    }
    CompositeTypes: Record<string, never>
  }
}
