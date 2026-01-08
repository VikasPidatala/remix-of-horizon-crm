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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: string
          id: string
          module: string
          user_id: string
          user_name: string
          user_role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          action: string
          created_at?: string
          details: string
          id?: string
          module: string
          user_id: string
          user_name: string
          user_role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          action?: string
          created_at?: string
          details?: string
          id?: string
          module?: string
          user_id?: string
          user_name?: string
          user_role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      announcements: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_active: boolean
          message: string
          priority: string
          target_roles: Json
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          message: string
          priority?: string
          target_roles?: Json
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          message?: string
          priority?: string
          target_roles?: Json
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          accent_color: string
          app_name: string
          created_at: string
          custom_css: string | null
          favicon_url: string | null
          id: string
          logo_url: string | null
          primary_color: string
          sidebar_color: string
          updated_at: string
        }
        Insert: {
          accent_color?: string
          app_name?: string
          created_at?: string
          custom_css?: string | null
          favicon_url?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string
          sidebar_color?: string
          updated_at?: string
        }
        Update: {
          accent_color?: string
          app_name?: string
          created_at?: string
          custom_css?: string | null
          favicon_url?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string
          sidebar_color?: string
          updated_at?: string
        }
        Relationships: []
      }
      holiday_settings: {
        Row: {
          id: string
          overview_image_url: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          overview_image_url?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          overview_image_url?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      holidays: {
        Row: {
          created_at: string
          created_by: string
          end_date: string
          id: string
          image_url: string | null
          message: string | null
          start_date: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          end_date?: string
          id?: string
          image_url?: string | null
          message?: string | null
          start_date: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          end_date?: string
          id?: string
          image_url?: string | null
          message?: string | null
          start_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          address: string | null
          assigned_project: string | null
          bhk_requirement: string
          budget_max: number
          budget_min: number
          created_at: string
          created_by: string
          description: string | null
          email: string
          follow_up_date: string | null
          id: string
          name: string
          notes: Json | null
          phone: string
          preferred_location: string | null
          requirement_type: string
          source: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          assigned_project?: string | null
          bhk_requirement: string
          budget_max: number
          budget_min: number
          created_at?: string
          created_by: string
          description?: string | null
          email: string
          follow_up_date?: string | null
          id?: string
          name: string
          notes?: Json | null
          phone: string
          preferred_location?: string | null
          requirement_type: string
          source?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          assigned_project?: string | null
          bhk_requirement?: string
          budget_max?: number
          budget_min?: number
          created_at?: string
          created_by?: string
          description?: string | null
          email?: string
          follow_up_date?: string | null
          id?: string
          name?: string
          notes?: Json | null
          phone?: string
          preferred_location?: string | null
          requirement_type?: string
          source?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_project_fkey"
            columns: ["assigned_project"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      leaves: {
        Row: {
          approved_by: string | null
          created_at: string
          document_url: string | null
          end_date: string
          id: string
          leave_type: string
          reason: string
          rejection_reason: string | null
          start_date: string
          status: string
          updated_at: string
          user_id: string
          user_name: string
          user_role: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          document_url?: string | null
          end_date: string
          id?: string
          leave_type: string
          reason: string
          rejection_reason?: string | null
          start_date: string
          status?: string
          updated_at?: string
          user_id: string
          user_name: string
          user_role: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          document_url?: string | null
          end_date?: string
          id?: string
          leave_type?: string
          reason?: string
          rejection_reason?: string | null
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
          user_name?: string
          user_role?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          manager_id: string | null
          name: string
          phone: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id: string
          manager_id?: string | null
          name: string
          phone?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          manager_id?: string | null
          name?: string
          phone?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          amenities: Json | null
          cover_image: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          launch_date: string
          location: string
          name: string
          nearby_landmarks: Json | null
          photos: Json | null
          possession_date: string
          price_max: number
          price_min: number
          status: string
          tower_details: string | null
          type: string
          updated_at: string
        }
        Insert: {
          amenities?: Json | null
          cover_image?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          launch_date: string
          location: string
          name: string
          nearby_landmarks?: Json | null
          photos?: Json | null
          possession_date: string
          price_max: number
          price_min: number
          status?: string
          tower_details?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          amenities?: Json | null
          cover_image?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          launch_date?: string
          location?: string
          name?: string
          nearby_landmarks?: Json | null
          photos?: Json | null
          possession_date?: string
          price_max?: number
          price_min?: number
          status?: string
          tower_details?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_project: string | null
          assigned_to: string
          attachments: Json | null
          created_at: string
          id: string
          lead_id: string | null
          next_action_date: string | null
          notes: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_project?: string | null
          assigned_to: string
          attachments?: Json | null
          created_at?: string
          id?: string
          lead_id?: string | null
          next_action_date?: string | null
          notes?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_project?: string | null
          assigned_to?: string
          attachments?: Json | null
          created_at?: string
          id?: string
          lead_id?: string | null
          next_action_date?: string | null
          notes?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_project_fkey"
            columns: ["assigned_project"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      admin_exists: { Args: never; Returns: boolean }
      get_actor: {
        Args: never
        Returns: {
          actor_id: string
          actor_name: string
          actor_role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      safe_uuid: { Args: { p_text: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "manager" | "staff"
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
      app_role: ["admin", "manager", "staff"],
    },
  },
} as const
