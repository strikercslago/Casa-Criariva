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
      normalize_phone_digits: { Args: { phone_value: string }; Returns: string }
      save_session_attendance: { Args: { payload: Json }; Returns: string }
      transfer_student_class: { Args: { payload: Json }; Returns: string }
      unlink_guardian_student: { Args: { payload: Json }; Returns: undefined }
      update_class_session_status: { Args: { payload: Json }; Returns: string }
      update_class_status: { Args: { payload: Json }; Returns: string }
      update_class_with_schedules: { Args: { payload: Json }; Returns: string }
      update_guardian_contact: { Args: { payload: Json }; Returns: string }
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
      student_status: ["active", "inactive", "archived"],
    },
  },
} as const
