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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      alarms: {
        Row: {
          created_at: string | null
          description: string | null
          guard_id: string | null
          id: string
          latitude: number | null
          longitude: number | null
          photos: string[] | null
          report_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string | null
          site_id: string | null
          status: string | null
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          guard_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          photos?: string[] | null
          report_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          site_id?: string | null
          status?: string | null
          title: string
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          guard_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          photos?: string[] | null
          report_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          site_id?: string | null
          status?: string | null
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alarms_guard_id_fkey"
            columns: ["guard_id"]
            isOneToOne: false
            referencedRelation: "guards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alarms_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "patrol_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alarms_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          check_in_time: string | null
          check_out_time: string | null
          created_at: string | null
          date: string
          guard_id: string
          id: string
          notes: string | null
          project_id: string
          shift_type: string
          status: string | null
        }
        Insert: {
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string | null
          date: string
          guard_id: string
          id?: string
          notes?: string | null
          project_id: string
          shift_type: string
          status?: string | null
        }
        Update: {
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string | null
          date?: string
          guard_id?: string
          id?: string
          notes?: string | null
          project_id?: string
          shift_type?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_guard_id_fkey"
            columns: ["guard_id"]
            isOneToOne: false
            referencedRelation: "guards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      checkpoints: {
        Row: {
          code: string | null
          created_at: string | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          nfc_code: string | null
          order_index: number | null
          qr_code: string | null
          site_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          nfc_code?: string | null
          order_index?: number | null
          qr_code?: string | null
          site_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          nfc_code?: string | null
          order_index?: number | null
          qr_code?: string | null
          site_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checkpoints_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          code: string | null
          contact_person: string | null
          contact_phone: string | null
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          code?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          code?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      guards: {
        Row: {
          company_id: string | null
          created_at: string | null
          employee_id: string | null
          id: string
          name: string
          phone: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          employee_id?: string | null
          id?: string
          name: string
          phone?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          employee_id?: string | null
          id?: string
          name?: string
          phone?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guards_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      notices: {
        Row: {
          content: string | null
          created_at: string | null
          created_by: string | null
          end_date: string
          id: string
          priority: string | null
          start_date: string
          status: string | null
          target_companies: string[] | null
          target_guards: string[] | null
          target_roles: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          end_date: string
          id?: string
          priority?: string | null
          start_date: string
          status?: string | null
          target_companies?: string[] | null
          target_guards?: string[] | null
          target_roles?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          end_date?: string
          id?: string
          priority?: string | null
          start_date?: string
          status?: string | null
          target_companies?: string[] | null
          target_guards?: string[] | null
          target_roles?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      patrol_plan_checkpoints: {
        Row: {
          checkpoint_id: string
          created_at: string | null
          id: string
          order_index: number | null
          plan_id: string
          required: boolean | null
        }
        Insert: {
          checkpoint_id: string
          created_at?: string | null
          id?: string
          order_index?: number | null
          plan_id: string
          required?: boolean | null
        }
        Update: {
          checkpoint_id?: string
          created_at?: string | null
          id?: string
          order_index?: number | null
          plan_id?: string
          required?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "patrol_plan_checkpoints_checkpoint_id_fkey"
            columns: ["checkpoint_id"]
            isOneToOne: false
            referencedRelation: "checkpoints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patrol_plan_checkpoints_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "patrol_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      patrol_plans: {
        Row: {
          created_at: string | null
          created_by: string | null
          end_date: string
          end_time: string | null
          frequency: string | null
          guard_id: string | null
          id: string
          name: string
          notes: string | null
          site_id: string
          start_date: string
          start_time: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          end_date: string
          end_time?: string | null
          frequency?: string | null
          guard_id?: string | null
          id?: string
          name: string
          notes?: string | null
          site_id: string
          start_date: string
          start_time?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          end_date?: string
          end_time?: string | null
          frequency?: string | null
          guard_id?: string | null
          id?: string
          name?: string
          notes?: string | null
          site_id?: string
          start_date?: string
          start_time?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patrol_plans_guard_id_fkey"
            columns: ["guard_id"]
            isOneToOne: false
            referencedRelation: "guards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patrol_plans_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      patrol_report_checkpoints: {
        Row: {
          checkpoint_id: string
          created_at: string | null
          id: string
          latitude: number | null
          longitude: number | null
          notes: string | null
          photos: string[] | null
          report_id: string
          status: string | null
          visited_at: string
        }
        Insert: {
          checkpoint_id: string
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          photos?: string[] | null
          report_id: string
          status?: string | null
          visited_at: string
        }
        Update: {
          checkpoint_id?: string
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          photos?: string[] | null
          report_id?: string
          status?: string | null
          visited_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patrol_report_checkpoints_checkpoint_id_fkey"
            columns: ["checkpoint_id"]
            isOneToOne: false
            referencedRelation: "checkpoints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patrol_report_checkpoints_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "patrol_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      patrol_reports: {
        Row: {
          created_at: string | null
          end_time: string | null
          guard_id: string | null
          id: string
          notes: string | null
          plan_id: string | null
          site_id: string | null
          start_time: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_time?: string | null
          guard_id?: string | null
          id?: string
          notes?: string | null
          plan_id?: string | null
          site_id?: string | null
          start_time: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_time?: string | null
          guard_id?: string | null
          id?: string
          notes?: string | null
          plan_id?: string | null
          site_id?: string | null
          start_time?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patrol_reports_guard_id_fkey"
            columns: ["guard_id"]
            isOneToOne: false
            referencedRelation: "guards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patrol_reports_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "patrol_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patrol_reports_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          created_at: string | null
          email: string | null
          employee_id: string | null
          full_name: string
          id: string
          id_number: string | null
          is_first_login: boolean | null
          is_foreign_employee: boolean | null
          passport_expiry_date: string | null
          phone: string | null
          updated_at: string | null
          work_permit_expiry_date: string | null
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string | null
          email?: string | null
          employee_id?: string | null
          full_name: string
          id: string
          id_number?: string | null
          is_first_login?: boolean | null
          is_foreign_employee?: boolean | null
          passport_expiry_date?: string | null
          phone?: string | null
          updated_at?: string | null
          work_permit_expiry_date?: string | null
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string | null
          email?: string | null
          employee_id?: string | null
          full_name?: string
          id?: string
          id_number?: string | null
          is_first_login?: boolean | null
          is_foreign_employee?: boolean | null
          passport_expiry_date?: string | null
          phone?: string | null
          updated_at?: string | null
          work_permit_expiry_date?: string | null
        }
        Relationships: []
      }
      project_assignments: {
        Row: {
          created_at: string | null
          guard_id: string
          id: string
          project_id: string
          shift_type: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          guard_id: string
          id?: string
          project_id: string
          shift_type: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          guard_id?: string
          id?: string
          project_id?: string
          shift_type?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_assignments_guard_id_fkey"
            columns: ["guard_id"]
            isOneToOne: false
            referencedRelation: "guards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          address: string | null
          code: string | null
          company_id: string | null
          contact_person: string | null
          contact_phone: string | null
          created_at: string | null
          evening_shift_count: number | null
          id: string
          morning_shift_count: number | null
          name: string
          notes: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          code?: string | null
          company_id?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string | null
          evening_shift_count?: number | null
          id?: string
          morning_shift_count?: number | null
          name: string
          notes?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          code?: string | null
          company_id?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string | null
          evening_shift_count?: number | null
          id?: string
          morning_shift_count?: number | null
          name?: string
          notes?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          address: string | null
          code: string | null
          company_id: string | null
          created_at: string | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          status: string | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          code?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          status?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          code?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          status?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
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
      generate_next_staff_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      setup_guard_profile: {
        Args: {
          _email?: string
          _full_name: string
          _phone?: string
          _user_id: string
        }
        Returns: {
          employee_id: string
          full_name: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "supervisor" | "guard"
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
      app_role: ["admin", "manager", "supervisor", "guard"],
    },
  },
} as const
