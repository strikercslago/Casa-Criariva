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
      assert_attendance_window: {
        Args: { end_date: string; start_date: string }
        Returns: undefined
      }
      assert_class_schedules_valid: {
        Args: { schedules: Json }
        Returns: undefined
      }
      cancel_monthly_fee: { Args: { payload: Json }; Returns: string }
      complete_student_enrollment: { Args: { payload: Json }; Returns: string }
      create_class_with_schedules: { Args: { payload: Json }; Returns: string }
      create_extra_class_session: { Args: { payload: Json }; Returns: string }
      create_guardian_with_optional_student: {
        Args: { payload: Json }
        Returns: string
      }
      current_user_is_owner: { Args: never; Returns: boolean }
      end_class_enrollment: { Args: { payload: Json }; Returns: string }
      ensure_class_sessions: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: number
      }
      ensure_monthly_fees: {
        Args: { p_reference_month: string }
        Returns: {
          existing_count: number
          generated_count: number
          reference_month: string
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
      reverse_payment: {
        Args: { payload: Json }
        Returns: {
          monthly_fee_id: string
          payment_id: string
        }[]
      }
      save_session_attendance: { Args: { payload: Json }; Returns: string }
      transfer_student_class: { Args: { payload: Json }; Returns: string }
      unlink_guardian_student: { Args: { payload: Json }; Returns: undefined }
      update_class_session_status: { Args: { payload: Json }; Returns: string }
      update_class_status: { Args: { payload: Json }; Returns: string }
      update_class_with_schedules: { Args: { payload: Json }; Returns: string }
      update_guardian_contact: { Args: { payload: Json }; Returns: string }
      update_monthly_fee_amount: { Args: { payload: Json }; Returns: string }
      upsert_guardian_student_link: {
        Args: { payload: Json }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "owner" | "admin" | "teacher"
      attendance_status: "present" | "absent" | "excused"
      billing_plan_status: "active" | "paused" | "ended"
      class_session_status: "planned" | "completed" | "cancelled"
      class_status: "active" | "inactive" | "archived"
      enrollment_status: "active" | "paused" | "ended"
      monthly_fee_lifecycle_status: "active" | "cancelled"
      payment_method: "pix" | "cash" | "card" | "bank_transfer" | "other"
      payment_status: "received" | "reversed"
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
      class_session_status: ["planned", "completed", "cancelled"],
      class_status: ["active", "inactive", "archived"],
      enrollment_status: ["active", "paused", "ended"],
      monthly_fee_lifecycle_status: ["active", "cancelled"],
      payment_method: ["pix", "cash", "card", "bank_transfer", "other"],
      payment_status: ["received", "reversed"],
      student_status: ["active", "inactive", "archived"],
    },
  },
} as const
