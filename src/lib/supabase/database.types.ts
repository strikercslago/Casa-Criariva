export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      attendance_records: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          recorded_by: string | null
          session_id: string
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          recorded_by?: string | null
          session_id: string
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          recorded_by?: string | null
          session_id?: string
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "class_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          metadata: Json
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json
        }
        Relationships: []
      }
      cash_accounts: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          type: Database["public"]["Enums"]["cash_account_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          type?: Database["public"]["Enums"]["cash_account_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          type?: Database["public"]["Enums"]["cash_account_type"]
          updated_at?: string
        }
        Relationships: []
      }
      class_schedules: {
        Row: {
          class_id: string
          created_at: string
          end_time: string
          id: string
          start_time: string
          weekday: number
        }
        Insert: {
          class_id: string
          created_at?: string
          end_time: string
          id?: string
          start_time: string
          weekday: number
        }
        Update: {
          class_id?: string
          created_at?: string
          end_time?: string
          id?: string
          start_time?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "class_schedules_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      class_sessions: {
        Row: {
          class_id: string
          created_at: string
          end_time: string
          id: string
          notes: string | null
          schedule_id: string | null
          session_date: string
          start_time: string
          status: Database["public"]["Enums"]["class_session_status"]
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          end_time: string
          id?: string
          notes?: string | null
          schedule_id?: string | null
          session_date: string
          start_time: string
          status?: Database["public"]["Enums"]["class_session_status"]
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          end_time?: string
          id?: string
          notes?: string | null
          schedule_id?: string | null
          session_date?: string
          start_time?: string
          status?: Database["public"]["Enums"]["class_session_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_sessions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_sessions_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "class_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          capacity: number | null
          created_at: string
          description: string | null
          id: string
          name: string
          status: Database["public"]["Enums"]["class_status"]
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          status?: Database["public"]["Enums"]["class_status"]
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["class_status"]
          updated_at?: string
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          class_id: string
          created_at: string
          end_date: string | null
          id: string
          start_date: string
          status: Database["public"]["Enums"]["enrollment_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          end_date?: string | null
          id?: string
          start_date: string
          status?: Database["public"]["Enums"]["enrollment_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          end_date?: string | null
          id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["enrollment_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      event_registration_sessions: {
        Row: {
          created_at: string
          registration_id: string
          session_id: string
        }
        Insert: {
          created_at?: string
          registration_id: string
          session_id: string
        }
        Update: {
          created_at?: string
          registration_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_registration_sessions_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "event_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registration_sessions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "event_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      event_registrations: {
        Row: {
          base_amount: number
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          discount_amount: number
          event_id: string
          final_amount: number | null
          financial_due_date: string | null
          financial_entry_id: string | null
          guardian_id: string | null
          guest_birth_date: string | null
          guest_full_name: string | null
          id: string
          notes: string | null
          registered_by: string | null
          registration_type: Database["public"]["Enums"]["event_registration_type"]
          status: Database["public"]["Enums"]["event_registration_status"]
          student_id: string | null
          updated_at: string
        }
        Insert: {
          base_amount: number
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          discount_amount?: number
          event_id: string
          final_amount?: number | null
          financial_due_date?: string | null
          financial_entry_id?: string | null
          guardian_id?: string | null
          guest_birth_date?: string | null
          guest_full_name?: string | null
          id?: string
          notes?: string | null
          registered_by?: string | null
          registration_type?: Database["public"]["Enums"]["event_registration_type"]
          status?: Database["public"]["Enums"]["event_registration_status"]
          student_id?: string | null
          updated_at?: string
        }
        Update: {
          base_amount?: number
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          discount_amount?: number
          event_id?: string
          final_amount?: number | null
          financial_due_date?: string | null
          financial_entry_id?: string | null
          guardian_id?: string | null
          guest_birth_date?: string | null
          guest_full_name?: string | null
          id?: string
          notes?: string | null
          registered_by?: string | null
          registration_type?: Database["public"]["Enums"]["event_registration_type"]
          status?: Database["public"]["Enums"]["event_registration_status"]
          student_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_financial_entry_id_fkey"
            columns: ["financial_entry_id"]
            isOneToOne: true
            referencedRelation: "financial_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      event_sessions: {
        Row: {
          capacity_override: number | null
          created_at: string
          end_time: string
          event_id: string
          id: string
          notes: string | null
          price_override: number | null
          session_date: string
          start_time: string
          updated_at: string
        }
        Insert: {
          capacity_override?: number | null
          created_at?: string
          end_time: string
          event_id: string
          id?: string
          notes?: string | null
          price_override?: number | null
          session_date: string
          start_time: string
          updated_at?: string
        }
        Update: {
          capacity_override?: number | null
          created_at?: string
          end_time?: string
          event_id?: string
          id?: string
          notes?: string | null
          price_override?: number | null
          session_date?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_sessions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          base_price: number
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          capacity: number | null
          created_at: string
          created_by: string | null
          description: string | null
          event_type: Database["public"]["Enums"]["event_type"]
          id: string
          name: string
          notes: string | null
          registration_end_date: string | null
          registration_start_date: string | null
          status: Database["public"]["Enums"]["event_status"]
          updated_at: string
        }
        Insert: {
          base_price?: number
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          capacity?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          name: string
          notes?: string | null
          registration_end_date?: string | null
          registration_start_date?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          updated_at?: string
        }
        Update: {
          base_price?: number
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          capacity?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          name?: string
          notes?: string | null
          registration_end_date?: string | null
          registration_start_date?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          updated_at?: string
        }
        Relationships: []
      }
      financial_categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          type: Database["public"]["Enums"]["financial_entry_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          type: Database["public"]["Enums"]["financial_entry_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          type?: Database["public"]["Enums"]["financial_entry_type"]
          updated_at?: string
        }
        Relationships: []
      }
      financial_entries: {
        Row: {
          amount: number
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          category_id: string | null
          competence_date: string
          created_at: string
          created_by: string | null
          description: string
          due_date: string | null
          id: string
          lifecycle_status: Database["public"]["Enums"]["financial_lifecycle_status"]
          notes: string | null
          recurring_rule_id: string | null
          type: Database["public"]["Enums"]["financial_entry_type"]
          updated_at: string
        }
        Insert: {
          amount: number
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          category_id?: string | null
          competence_date: string
          created_at?: string
          created_by?: string | null
          description: string
          due_date?: string | null
          id?: string
          lifecycle_status?: Database["public"]["Enums"]["financial_lifecycle_status"]
          notes?: string | null
          recurring_rule_id?: string | null
          type: Database["public"]["Enums"]["financial_entry_type"]
          updated_at?: string
        }
        Update: {
          amount?: number
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          category_id?: string | null
          competence_date?: string
          created_at?: string
          created_by?: string | null
          description?: string
          due_date?: string | null
          id?: string
          lifecycle_status?: Database["public"]["Enums"]["financial_lifecycle_status"]
          notes?: string | null
          recurring_rule_id?: string | null
          type?: Database["public"]["Enums"]["financial_entry_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_entries_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_recurring_rule_id_fkey"
            columns: ["recurring_rule_id"]
            isOneToOne: false
            referencedRelation: "recurring_financial_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_settlements: {
        Row: {
          amount: number
          cash_account_id: string | null
          created_at: string
          financial_entry_id: string
          id: string
          notes: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          recorded_by: string
          reversal_reason: string | null
          reversed_at: string | null
          reversed_by: string | null
          settled_at: string
          status: Database["public"]["Enums"]["financial_settlement_status"]
        }
        Insert: {
          amount: number
          cash_account_id?: string | null
          created_at?: string
          financial_entry_id: string
          id?: string
          notes?: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          recorded_by: string
          reversal_reason?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          settled_at: string
          status?: Database["public"]["Enums"]["financial_settlement_status"]
        }
        Update: {
          amount?: number
          cash_account_id?: string | null
          created_at?: string
          financial_entry_id?: string
          id?: string
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          recorded_by?: string
          reversal_reason?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          settled_at?: string
          status?: Database["public"]["Enums"]["financial_settlement_status"]
        }
        Relationships: [
          {
            foreignKeyName: "financial_settlements_cash_account_id_fkey"
            columns: ["cash_account_id"]
            isOneToOne: false
            referencedRelation: "cash_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_settlements_financial_entry_id_fkey"
            columns: ["financial_entry_id"]
            isOneToOne: false
            referencedRelation: "financial_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      guardians: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      inventory_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          material_id: string
          movement_type: Database["public"]["Enums"]["inventory_movement_type"]
          notes: string | null
          occurred_at: string
          quantity: number
          reference_id: string | null
          reference_type: string | null
          unit_cost: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          material_id: string
          movement_type: Database["public"]["Enums"]["inventory_movement_type"]
          notes?: string | null
          occurred_at?: string
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          unit_cost?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          material_id?: string
          movement_type?: Database["public"]["Enums"]["inventory_movement_type"]
          notes?: string | null
          occurred_at?: string
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      material_categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      materials: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          category_id: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          minimum_stock: number
          name: string
          notes: string | null
          unit: Database["public"]["Enums"]["material_unit"]
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          minimum_stock?: number
          name: string
          notes?: string | null
          unit: Database["public"]["Enums"]["material_unit"]
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          minimum_stock?: number
          name?: string
          notes?: string | null
          unit?: Database["public"]["Enums"]["material_unit"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "materials_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "material_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_fees: {
        Row: {
          base_amount: number
          billing_plan_id: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          discount_amount: number
          due_date: string
          final_amount: number | null
          id: string
          lifecycle_status: Database["public"]["Enums"]["monthly_fee_lifecycle_status"]
          notes: string | null
          reference_month: string
          student_id: string
          updated_at: string
        }
        Insert: {
          base_amount: number
          billing_plan_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          discount_amount?: number
          due_date: string
          final_amount?: number | null
          id?: string
          lifecycle_status?: Database["public"]["Enums"]["monthly_fee_lifecycle_status"]
          notes?: string | null
          reference_month: string
          student_id: string
          updated_at?: string
        }
        Update: {
          base_amount?: number
          billing_plan_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          discount_amount?: number
          due_date?: string
          final_amount?: number | null
          id?: string
          lifecycle_status?: Database["public"]["Enums"]["monthly_fee_lifecycle_status"]
          notes?: string | null
          reference_month?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_fees_billing_plan_id_fkey"
            columns: ["billing_plan_id"]
            isOneToOne: false
            referencedRelation: "student_billing_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_fees_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_allocations: {
        Row: {
          amount: number
          created_at: string
          id: string
          monthly_fee_id: string
          payment_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          monthly_fee_id: string
          payment_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          monthly_fee_id?: string
          payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_allocations_monthly_fee_id_fkey"
            columns: ["monthly_fee_id"]
            isOneToOne: false
            referencedRelation: "monthly_fees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          paid_at: string
          payer_guardian_id: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          received_by: string
          reversal_reason: string | null
          reversed_at: string | null
          reversed_by: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          notes?: string | null
          paid_at: string
          payer_guardian_id?: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          received_by: string
          reversal_reason?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string
          payer_guardian_id?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          received_by?: string
          reversal_reason?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_payer_guardian_id_fkey"
            columns: ["payer_guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      purchase_items: {
        Row: {
          created_at: string
          id: string
          material_id: string
          purchase_id: string
          quantity: number
          total_amount: number | null
          unit_cost: number
        }
        Insert: {
          created_at?: string
          id?: string
          material_id: string
          purchase_id: string
          quantity: number
          total_amount?: number | null
          unit_cost: number
        }
        Update: {
          created_at?: string
          id?: string
          material_id?: string
          purchase_id?: string
          quantity?: number
          total_amount?: number | null
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          created_by: string | null
          due_date: string | null
          financial_entry_id: string | null
          id: string
          notes: string | null
          purchase_date: string
          received_at: string | null
          received_by: string | null
          status: Database["public"]["Enums"]["purchase_status"]
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          financial_entry_id?: string | null
          id?: string
          notes?: string | null
          purchase_date?: string
          received_at?: string | null
          received_by?: string | null
          status?: Database["public"]["Enums"]["purchase_status"]
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          financial_entry_id?: string | null
          id?: string
          notes?: string | null
          purchase_date?: string
          received_at?: string | null
          received_by?: string | null
          status?: Database["public"]["Enums"]["purchase_status"]
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_financial_entry_id_fkey"
            columns: ["financial_entry_id"]
            isOneToOne: true
            referencedRelation: "financial_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_financial_rules: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          created_by: string | null
          description: string
          due_day: number
          end_date: string | null
          frequency: Database["public"]["Enums"]["recurring_financial_frequency"]
          id: string
          is_active: boolean
          start_date: string
          type: Database["public"]["Enums"]["financial_entry_type"]
          updated_at: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          due_day: number
          end_date?: string | null
          frequency?: Database["public"]["Enums"]["recurring_financial_frequency"]
          id?: string
          is_active?: boolean
          start_date: string
          type: Database["public"]["Enums"]["financial_entry_type"]
          updated_at?: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          due_day?: number
          end_date?: string | null
          frequency?: Database["public"]["Enums"]["recurring_financial_frequency"]
          id?: string
          is_active?: boolean
          start_date?: string
          type?: Database["public"]["Enums"]["financial_entry_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_financial_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      student_billing_plans: {
        Row: {
          auto_generate_fees: boolean
          base_amount: number
          billing_start_date: string
          created_at: string
          discount_amount: number
          discount_reason: string | null
          due_day: number
          financial_guardian_id: string | null
          id: string
          status: Database["public"]["Enums"]["billing_plan_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          auto_generate_fees?: boolean
          base_amount: number
          billing_start_date: string
          created_at?: string
          discount_amount?: number
          discount_reason?: string | null
          due_day: number
          financial_guardian_id?: string | null
          id?: string
          status?: Database["public"]["Enums"]["billing_plan_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          auto_generate_fees?: boolean
          base_amount?: number
          billing_start_date?: string
          created_at?: string
          discount_amount?: number
          discount_reason?: string | null
          due_day?: number
          financial_guardian_id?: string | null
          id?: string
          status?: Database["public"]["Enums"]["billing_plan_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_billing_plans_financial_guardian_id_fkey"
            columns: ["financial_guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_billing_plans_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_guardians: {
        Row: {
          can_pick_up: boolean
          created_at: string
          guardian_id: string
          is_emergency_contact: boolean
          is_financial_responsible: boolean
          is_primary_contact: boolean
          relationship: string
          student_id: string
        }
        Insert: {
          can_pick_up?: boolean
          created_at?: string
          guardian_id: string
          is_emergency_contact?: boolean
          is_financial_responsible?: boolean
          is_primary_contact?: boolean
          relationship: string
          student_id: string
        }
        Update: {
          can_pick_up?: boolean
          created_at?: string
          guardian_id?: string
          is_emergency_contact?: boolean
          is_financial_responsible?: boolean
          is_primary_contact?: boolean
          relationship?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_guardians_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_guardians_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          archived_at: string | null
          birth_date: string | null
          created_at: string
          created_by: string | null
          enrollment_date: string
          full_name: string
          id: string
          notes: string | null
          preferred_name: string | null
          status: Database["public"]["Enums"]["student_status"]
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          birth_date?: string | null
          created_at?: string
          created_by?: string | null
          enrollment_date?: string
          full_name: string
          id?: string
          notes?: string | null
          preferred_name?: string | null
          status?: Database["public"]["Enums"]["student_status"]
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          birth_date?: string | null
          created_at?: string
          created_by?: string | null
          enrollment_date?: string
          full_name?: string
          id?: string
          notes?: string | null
          preferred_name?: string | null
          status?: Database["public"]["Enums"]["student_status"]
          updated_at?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_student_to_class: { Args: { payload: Json }; Returns: string }
      archive_material: { Args: { payload: Json }; Returns: string }
      assert_attendance_window: {
        Args: { end_date: string; start_date: string }
        Returns: undefined
      }
      assert_class_schedules_valid: {
        Args: { schedules: Json }
        Returns: undefined
      }
      assert_event_capacity_available: {
        Args: {
          p_event_id: string
          p_excluding_registration_id?: string
          p_registration_type: Database["public"]["Enums"]["event_registration_type"]
          p_session_ids?: string[]
        }
        Returns: undefined
      }
      cancel_event_registration: { Args: { payload: Json }; Returns: string }
      cancel_financial_entry: { Args: { payload: Json }; Returns: string }
      cancel_monthly_fee: { Args: { payload: Json }; Returns: string }
      cancel_purchase: { Args: { payload: Json }; Returns: string }
      complete_student_enrollment: { Args: { payload: Json }; Returns: string }
      confirm_event_registration: { Args: { payload: Json }; Returns: string }
      create_cash_account: { Args: { payload: Json }; Returns: string }
      create_class_with_schedules: { Args: { payload: Json }; Returns: string }
      create_event: { Args: { payload: Json }; Returns: string }
      create_event_registration: { Args: { payload: Json }; Returns: string }
      create_extra_class_session: { Args: { payload: Json }; Returns: string }
      create_financial_category: { Args: { payload: Json }; Returns: string }
      create_financial_entry: { Args: { payload: Json }; Returns: string }
      create_guardian_with_optional_student: {
        Args: { payload: Json }
        Returns: string
      }
      create_material: { Args: { payload: Json }; Returns: string }
      create_material_category: { Args: { payload: Json }; Returns: string }
      create_purchase: { Args: { payload: Json }; Returns: string }
      create_recurring_financial_rule: {
        Args: { payload: Json }
        Returns: string
      }
      current_user_is_owner: { Args: never; Returns: boolean }
      disable_recurring_financial_rule: {
        Args: { payload: Json }
        Returns: string
      }
      end_class_enrollment: { Args: { payload: Json }; Returns: string }
      ensure_class_sessions: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: number
      }
      ensure_event_registration_financial_entry: {
        Args: { p_registration_id: string }
        Returns: string
      }
      ensure_monthly_fees: {
        Args: { p_reference_month: string }
        Returns: {
          existing_count: number
          generated_count: number
          reference_month: string
        }[]
      }
      ensure_recurring_financial_entries: {
        Args: { p_reference_month: string }
        Returns: {
          existing_count: number
          generated_count: number
          reference_month: string
        }[]
      }
      event_participant_name: {
        Args: { p_guest_full_name: string; p_student_id: string }
        Returns: string
      }
      finance_cash_flow_rows: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: {
          amount: number
          cash_account_id: string
          cash_account_name: string
          category_id: string
          category_name: string
          description: string
          direction: string
          movement_id: string
          occurred_at: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          related_entry_id: string
          source_id: string
          source_type: string
        }[]
      }
      finance_entry_financial_rows: {
        Args: {
          p_end_date?: string
          p_entry_type?: Database["public"]["Enums"]["financial_entry_type"]
          p_start_date?: string
        }
        Returns: {
          amount: number
          balance: number
          category_id: string
          category_name: string
          competence_date: string
          computed_status: string
          created_at: string
          days_overdue: number
          description: string
          due_date: string
          entry_id: string
          is_partial: boolean
          lifecycle_status: Database["public"]["Enums"]["financial_lifecycle_status"]
          notes: string
          recurring_rule_id: string
          settled_amount: number
          type: Database["public"]["Enums"]["financial_entry_type"]
        }[]
      }
      finance_month_bounds: {
        Args: { p_reference_month: string }
        Returns: {
          end_date: string
          start_date: string
        }[]
      }
      get_billing_month_summary: {
        Args: { p_reference_month: string }
        Returns: {
          active_fees_count: number
          cancelled_fees_count: number
          expected_amount: number
          overdue_amount: number
          overdue_fees_count: number
          paid_fees_count: number
          partial_fees_count: number
          pending_amount: number
          received_amount: number
          reference_month: string
        }[]
      }
      get_event_finance_summary: {
        Args: { p_event_id: string }
        Returns: {
          event_id: string
          expected_revenue: number
          free_count: number
          paid_count: number
          partial_count: number
          pending_count: number
          receivable_amount: number
          received_amount: number
        }[]
      }
      get_finance_month_summary: {
        Args: { p_reference_month: string }
        Returns: {
          cash_in: number
          cash_movements_count: number
          cash_out: number
          payable_amount: number
          receivable_amount: number
          reference_month: string
          result_amount: number
        }[]
      }
      get_inventory_summary: {
        Args: never
        Returns: {
          low_stock_count: number
          materials_count: number
          out_of_stock_count: number
          recent_purchases_count: number
        }[]
      }
      get_material_stock: { Args: { p_material_id: string }; Returns: number }
      get_monthly_fee_detail: {
        Args: { p_monthly_fee_id: string }
        Returns: {
          amount_paid: number
          balance: number
          base_amount: number
          computed_status: string
          days_overdue: number
          discount_amount: number
          due_date: string
          final_amount: number
          financial_guardian_id: string
          financial_guardian_name: string
          financial_guardian_phone: string
          is_partial: boolean
          lifecycle_status: Database["public"]["Enums"]["monthly_fee_lifecycle_status"]
          monthly_fee_id: string
          notes: string
          payments: Json
          reference_month: string
          student_id: string
          student_name: string
        }[]
      }
      get_purchase_detail: {
        Args: { p_purchase_id: string }
        Returns: {
          balance: number
          due_date: string
          finance_status: string
          financial_entry_id: string
          items: Json
          notes: string
          paid_amount: number
          purchase_date: string
          purchase_id: string
          status: Database["public"]["Enums"]["purchase_status"]
          supplier_id: string
          supplier_name: string
          total_amount: number
        }[]
      }
      get_session_attendance: {
        Args: { p_session_id: string }
        Returns: {
          attendance_id: string
          attendance_notes: string
          attendance_status: Database["public"]["Enums"]["attendance_status"]
          class_id: string
          class_name: string
          end_time: string
          enrollment_id: string
          preferred_name: string
          recorded_at: string
          recorded_by: string
          session_date: string
          session_id: string
          session_notes: string
          session_status: Database["public"]["Enums"]["class_session_status"]
          start_time: string
          student_id: string
          student_name: string
        }[]
      }
      get_student_billing_snapshot: {
        Args: {
          p_page?: number
          p_page_size?: number
          p_reference_month?: string
          p_student_id: string
        }
        Returns: {
          billing_plan: Json
          current_fee: Json
          recent_fees: Json
          student_id: string
          total_count: number
        }[]
      }
      has_role: {
        Args: {
          check_role: Database["public"]["Enums"]["app_role"]
          check_user_id: string
        }
        Returns: boolean
      }
      inventory_movement_signed_quantity: {
        Args: {
          p_movement_type: Database["public"]["Enums"]["inventory_movement_type"]
          p_quantity: number
        }
        Returns: number
      }
      list_agenda_sessions: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: {
          absent_count: number
          attendance_state: string
          class_id: string
          class_name: string
          end_time: string
          excused_count: number
          expected_students: number
          notes: string
          present_count: number
          recorded_count: number
          schedule_id: string
          session_date: string
          session_id: string
          start_time: string
          status: Database["public"]["Enums"]["class_session_status"]
        }[]
      }
      list_classes: {
        Args: {
          p_capacity_filter?: string
          p_page?: number
          p_page_size?: number
          p_search?: string
          p_status_filter?: string
        }
        Returns: {
          active_enrollments: number
          available_spots: number
          capacity: number
          class_id: string
          created_at: string
          description: string
          is_full: boolean
          name: string
          schedules: Json
          status: Database["public"]["Enums"]["class_status"]
          total_count: number
          updated_at: string
        }[]
      }
      list_event_registrations: {
        Args: {
          p_event_id: string
          p_finance_filter?: string
          p_page?: number
          p_page_size?: number
          p_search?: string
          p_status_filter?: string
        }
        Returns: {
          balance: number
          base_amount: number
          created_at: string
          discount_amount: number
          event_id: string
          final_amount: number
          finance_status: string
          financial_due_date: string
          financial_entry_id: string
          guardian_email: string
          guardian_id: string
          guardian_name: string
          guardian_phone: string
          guest_birth_date: string
          guest_full_name: string
          notes: string
          participant_name: string
          received_amount: number
          registration_id: string
          registration_type: Database["public"]["Enums"]["event_registration_type"]
          selected_sessions: Json
          selected_sessions_count: number
          status: Database["public"]["Enums"]["event_registration_status"]
          student_id: string
          total_count: number
        }[]
      }
      list_events: {
        Args: {
          p_page?: number
          p_page_size?: number
          p_search?: string
          p_status_filter?: string
          p_type_filter?: string
        }
        Returns: {
          available_spots: number
          base_price: number
          capacity: number
          confirmed_count: number
          event_id: string
          event_type: Database["public"]["Enums"]["event_type"]
          expected_revenue: number
          first_session_date: string
          last_session_date: string
          name: string
          receivable_amount: number
          received_amount: number
          registration_end_date: string
          registration_start_date: string
          session_count: number
          status: Database["public"]["Enums"]["event_status"]
          total_count: number
          waitlisted_count: number
        }[]
      }
      list_finance_cash_flow: {
        Args: {
          p_cash_account_id?: string
          p_category_id?: string
          p_direction_filter?: string
          p_end_date: string
          p_page?: number
          p_page_size?: number
          p_start_date: string
        }
        Returns: {
          amount: number
          cash_account_id: string
          cash_account_name: string
          category_id: string
          category_name: string
          description: string
          direction: string
          movement_id: string
          occurred_at: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          related_entry_id: string
          source_id: string
          source_type: string
          total_count: number
        }[]
      }
      list_finance_payables: {
        Args: {
          p_page?: number
          p_page_size?: number
          p_reference_month: string
        }
        Returns: {
          amount: number
          balance: number
          computed_status: string
          days_overdue: number
          description: string
          due_date: string
          item_id: string
          settled_amount: number
          source_id: string
          source_type: string
          total_count: number
        }[]
      }
      list_finance_receivables: {
        Args: {
          p_page?: number
          p_page_size?: number
          p_reference_month: string
        }
        Returns: {
          amount: number
          balance: number
          computed_status: string
          days_overdue: number
          description: string
          due_date: string
          item_id: string
          settled_amount: number
          source_id: string
          source_type: string
          total_count: number
        }[]
      }
      list_financial_entries: {
        Args: {
          p_category_id?: string
          p_end_date: string
          p_page?: number
          p_page_size?: number
          p_search?: string
          p_start_date: string
          p_status_filter?: string
          p_type_filter?: string
        }
        Returns: {
          amount: number
          balance: number
          category_id: string
          category_name: string
          competence_date: string
          computed_status: string
          created_at: string
          days_overdue: number
          description: string
          due_date: string
          entry_id: string
          is_partial: boolean
          lifecycle_status: Database["public"]["Enums"]["financial_lifecycle_status"]
          notes: string
          recurring_rule_id: string
          settled_amount: number
          total_count: number
          type: Database["public"]["Enums"]["financial_entry_type"]
        }[]
      }
      list_guardians: {
        Args: {
          p_page?: number
          p_page_size?: number
          p_role_filter?: string
          p_search?: string
        }
        Returns: {
          can_pick_up: boolean
          created_at: string
          email: string
          full_name: string
          guardian_id: string
          is_emergency_contact: boolean
          is_financial_responsible: boolean
          is_primary_contact: boolean
          linked_students: Json
          notes: string
          phone: string
          students_count: number
          total_count: number
          updated_at: string
        }[]
      }
      list_inventory_movements: {
        Args: { p_material_id: string; p_page?: number; p_page_size?: number }
        Returns: {
          created_at: string
          material_id: string
          movement_id: string
          movement_type: Database["public"]["Enums"]["inventory_movement_type"]
          notes: string
          occurred_at: string
          quantity: number
          reference_id: string
          reference_type: string
          signed_quantity: number
          total_count: number
          unit_cost: number
        }[]
      }
      list_materials: {
        Args: {
          p_active_filter?: string
          p_category_id?: string
          p_page?: number
          p_page_size?: number
          p_search?: string
          p_stock_filter?: string
        }
        Returns: {
          category_id: string
          category_name: string
          created_at: string
          current_stock: number
          is_active: boolean
          last_unit_cost: number
          material_id: string
          minimum_stock: number
          name: string
          notes: string
          stock_status: string
          total_count: number
          unit: Database["public"]["Enums"]["material_unit"]
          updated_at: string
        }[]
      }
      list_monthly_fees: {
        Args: {
          p_page?: number
          p_page_size?: number
          p_reference_month: string
          p_search?: string
          p_status_filter?: string
        }
        Returns: {
          amount_paid: number
          balance: number
          base_amount: number
          computed_status: string
          days_overdue: number
          discount_amount: number
          due_date: string
          final_amount: number
          financial_guardian_id: string
          financial_guardian_name: string
          financial_guardian_phone: string
          is_partial: boolean
          lifecycle_status: Database["public"]["Enums"]["monthly_fee_lifecycle_status"]
          monthly_fee_id: string
          payment_count: number
          reference_month: string
          student_id: string
          student_name: string
          total_count: number
        }[]
      }
      list_purchases: {
        Args: {
          p_page?: number
          p_page_size?: number
          p_search?: string
          p_status_filter?: string
        }
        Returns: {
          balance: number
          due_date: string
          finance_status: string
          financial_entry_id: string
          items_count: number
          notes: string
          paid_amount: number
          purchase_date: string
          purchase_id: string
          received_at: string
          status: Database["public"]["Enums"]["purchase_status"]
          supplier_id: string
          supplier_name: string
          total_amount: number
          total_count: number
        }[]
      }
      list_suppliers: {
        Args: {
          p_active_filter?: string
          p_page?: number
          p_page_size?: number
          p_search?: string
        }
        Returns: {
          contact_name: string
          email: string
          is_active: boolean
          last_purchase_date: string
          name: string
          notes: string
          phone: string
          supplier_id: string
          total_count: number
        }[]
      }
      material_stock_rows: {
        Args: never
        Returns: {
          current_stock: number
          last_unit_cost: number
          material_id: string
        }[]
      }
      monthly_fee_due_date: {
        Args: { due_day: number; reference_month: string }
        Returns: string
      }
      monthly_fee_financial_rows: {
        Args: { p_reference_month?: string; p_student_id?: string }
        Returns: {
          amount_paid: number
          balance: number
          base_amount: number
          computed_status: string
          days_overdue: number
          discount_amount: number
          due_date: string
          final_amount: number
          financial_guardian_id: string
          financial_guardian_name: string
          financial_guardian_phone: string
          is_partial: boolean
          lifecycle_status: Database["public"]["Enums"]["monthly_fee_lifecycle_status"]
          monthly_fee_id: string
          notes: string
          payment_count: number
          reference_month: string
          student_id: string
          student_name: string
        }[]
      }
      normalize_phone_digits: { Args: { phone_value: string }; Returns: string }
      normalize_reference_month: { Args: { value: string }; Returns: string }
      receive_purchase: {
        Args: { payload: Json }
        Returns: {
          financial_entry_id: string
          purchase_id: string
          total_amount: number
        }[]
      }
      record_inventory_movement: {
        Args: { payload: Json }
        Returns: {
          current_stock: number
          material_id: string
          movement_id: string
        }[]
      }
      register_payment: {
        Args: { payload: Json }
        Returns: {
          amount_paid: number
          balance: number
          computed_status: string
          monthly_fee_id: string
          payment_id: string
        }[]
      }
      reverse_financial_settlement: { Args: { payload: Json }; Returns: string }
      reverse_payment: {
        Args: { payload: Json }
        Returns: {
          monthly_fee_id: string
          payment_id: string
        }[]
      }
      save_session_attendance: { Args: { payload: Json }; Returns: string }
      settle_event_registration: {
        Args: { payload: Json }
        Returns: {
          balance: number
          computed_status: string
          financial_entry_id: string
          settled_amount: number
          settlement_id: string
        }[]
      }
      settle_financial_entry: {
        Args: { payload: Json }
        Returns: {
          balance: number
          computed_status: string
          financial_entry_id: string
          settled_amount: number
          settlement_id: string
        }[]
      }
      transfer_student_class: { Args: { payload: Json }; Returns: string }
      unlink_guardian_student: { Args: { payload: Json }; Returns: undefined }
      update_class_session_status: { Args: { payload: Json }; Returns: string }
      update_class_status: { Args: { payload: Json }; Returns: string }
      update_class_with_schedules: { Args: { payload: Json }; Returns: string }
      update_event_status: { Args: { payload: Json }; Returns: string }
      update_financial_category: { Args: { payload: Json }; Returns: string }
      update_financial_entry: { Args: { payload: Json }; Returns: string }
      update_guardian_contact: { Args: { payload: Json }; Returns: string }
      update_material: { Args: { payload: Json }; Returns: string }
      update_monthly_fee_amount: { Args: { payload: Json }; Returns: string }
      update_recurring_financial_rule: {
        Args: { payload: Json }
        Returns: string
      }
      upsert_guardian_student_link: {
        Args: { payload: Json }
        Returns: undefined
      }
      upsert_supplier: { Args: { payload: Json }; Returns: string }
    }
    Enums: {
      app_role: "owner" | "admin" | "teacher"
      attendance_status: "present" | "absent" | "excused"
      billing_plan_status: "active" | "paused" | "ended"
      cash_account_type: "cash" | "bank" | "other"
      class_session_status: "planned" | "completed" | "cancelled"
      class_status: "active" | "inactive" | "archived"
      enrollment_status: "active" | "paused" | "ended"
      event_registration_status:
        | "pending"
        | "confirmed"
        | "waitlisted"
        | "cancelled"
      event_registration_type: "full_event" | "selected_sessions"
      event_status: "draft" | "open" | "closed" | "completed" | "cancelled"
      event_type: "colony" | "workshop" | "special_activity" | "other"
      financial_entry_type: "income" | "expense"
      financial_lifecycle_status: "active" | "cancelled"
      financial_settlement_status: "active" | "reversed"
      inventory_movement_type:
        | "initial_stock"
        | "purchase"
        | "consumption"
        | "loss"
        | "adjustment_in"
        | "adjustment_out"
        | "return"
      material_unit:
        | "unit"
        | "package"
        | "box"
        | "sheet"
        | "roll"
        | "liter"
        | "milliliter"
        | "kilogram"
        | "gram"
        | "meter"
        | "bottle"
        | "other"
      monthly_fee_lifecycle_status: "active" | "cancelled"
      payment_method: "pix" | "cash" | "card" | "bank_transfer" | "other"
      payment_status: "received" | "reversed"
      purchase_status: "draft" | "received" | "cancelled"
      recurring_financial_frequency: "monthly"
      student_status: "active" | "inactive" | "archived"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["owner", "admin", "teacher"],
      attendance_status: ["present", "absent", "excused"],
      billing_plan_status: ["active", "paused", "ended"],
      cash_account_type: ["cash", "bank", "other"],
      class_session_status: ["planned", "completed", "cancelled"],
      class_status: ["active", "inactive", "archived"],
      enrollment_status: ["active", "paused", "ended"],
      event_registration_status: [
        "pending",
        "confirmed",
        "waitlisted",
        "cancelled",
      ],
      event_registration_type: ["full_event", "selected_sessions"],
      event_status: ["draft", "open", "closed", "completed", "cancelled"],
      event_type: ["colony", "workshop", "special_activity", "other"],
      financial_entry_type: ["income", "expense"],
      financial_lifecycle_status: ["active", "cancelled"],
      financial_settlement_status: ["active", "reversed"],
      inventory_movement_type: [
        "initial_stock",
        "purchase",
        "consumption",
        "loss",
        "adjustment_in",
        "adjustment_out",
        "return",
      ],
      material_unit: [
        "unit",
        "package",
        "box",
        "sheet",
        "roll",
        "liter",
        "milliliter",
        "kilogram",
        "gram",
        "meter",
        "bottle",
        "other",
      ],
      monthly_fee_lifecycle_status: ["active", "cancelled"],
      payment_method: ["pix", "cash", "card", "bank_transfer", "other"],
      payment_status: ["received", "reversed"],
      purchase_status: ["draft", "received", "cancelled"],
      recurring_financial_frequency: ["monthly"],
      student_status: ["active", "inactive", "archived"],
    },
  },
} as const
