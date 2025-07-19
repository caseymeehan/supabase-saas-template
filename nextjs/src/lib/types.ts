export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      factory_user: {
        Row: {
          created_at: string
          id: number
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      global_system_settings: {
        Row: {
          created_at: string
          id: number
          organisation_limit: number
          populate_apikeys: boolean
          populate_organisation: boolean
          register_enabled: boolean
          user_can_create_organisation: boolean
        }
        Insert: {
          created_at?: string
          id?: number
          organisation_limit?: number
          populate_apikeys?: boolean
          populate_organisation?: boolean
          register_enabled?: boolean
          user_can_create_organisation?: boolean
        }
        Update: {
          created_at?: string
          id?: number
          organisation_limit?: number
          populate_apikeys?: boolean
          populate_organisation?: boolean
          register_enabled?: boolean
          user_can_create_organisation?: boolean
        }
        Relationships: []
      }
      organisation: {
        Row: {
          created_at: string
          id: number
          name: string
          uuid: string
        }
        Insert: {
          created_at?: string
          id?: number
          name: string
          uuid?: string
        }
        Update: {
          created_at?: string
          id?: number
          name?: string
          uuid?: string
        }
        Relationships: []
      }
      organisation_apikey: {
        Row: {
          created_at: string
          id: number
          key: string
          org_id: number | null
        }
        Insert: {
          created_at?: string
          id?: number
          key?: string
          org_id?: number | null
        }
        Update: {
          created_at?: string
          id?: number
          key?: string
          org_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "public_organisation_apikey_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisation"
            referencedColumns: ["id"]
          },
        ]
      }
      organisation_billing_admin: {
        Row: {
          email: string
          org_id: number
        }
        Insert: {
          email: string
          org_id: number
        }
        Update: {
          email?: string
          org_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "organisation_billing_admin_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organisation"
            referencedColumns: ["id"]
          },
        ]
      }
      organisation_information: {
        Row: {
          created_at: string
          id: number
          note: string | null
          org_id: number | null
        }
        Insert: {
          created_at?: string
          id?: number
          note?: string | null
          org_id?: number | null
        }
        Update: {
          created_at?: string
          id?: number
          note?: string | null
          org_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "public_organisation_information_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organisation"
            referencedColumns: ["id"]
          },
        ]
      }
      paddle_customer_products: {
        Row: {
          by_price_id: string
          created_at: string
          customer_id: string
          id: number
          product_id: string
        }
        Insert: {
          by_price_id: string
          created_at?: string
          customer_id: string
          id?: number
          product_id: string
        }
        Update: {
          by_price_id?: string
          created_at?: string
          customer_id?: string
          id?: number
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "paddle_customer_products_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "paddle_customers"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      paddle_customer_subscriptions: {
        Row: {
          created_at: string
          customer_id: string
          org_id: number | null
          price_id: string | null
          product_id: string | null
          scheduled_change: string | null
          subscription_id: string
          subscription_status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          org_id?: number | null
          price_id?: string | null
          product_id?: string | null
          scheduled_change?: string | null
          subscription_id: string
          subscription_status: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          org_id?: number | null
          price_id?: string | null
          product_id?: string | null
          scheduled_change?: string | null
          subscription_id?: string
          subscription_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "paddle_customer_subscriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "paddle_customers"
            referencedColumns: ["customer_id"]
          },
        ]
      }
      paddle_customers: {
        Row: {
          created_at: string
          customer_id: string
          email: string
          marketing_consent: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          email: string
          marketing_consent?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          email?: string
          marketing_consent?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      paddle_events: {
        Row: {
          created_at: string
          id: number
          item: Json
          type: string
        }
        Insert: {
          created_at?: string
          id?: number
          item: Json
          type: string
        }
        Update: {
          created_at?: string
          id?: number
          item?: Json
          type?: string
        }
        Relationships: []
      }
      paddle_product_tier: {
        Row: {
          id: number
          product_id: string
          properties: Json
          tier_level: number
        }
        Insert: {
          id?: number
          product_id: string
          properties?: Json
          tier_level: number
        }
        Update: {
          id?: number
          product_id?: string
          properties?: Json
          tier_level?: number
        }
        Relationships: []
      }
      user_information: {
        Row: {
          created_at: string
          email: string
          id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: number
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: number
          user_id?: string
        }
        Relationships: []
      }
      user_invite_code: {
        Row: {
          created_at: string
          enabled: boolean
          id: number
          user_code: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: number
          user_code?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: number
          user_code?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          created_at: string
          id: number
          subscription: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          subscription: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          subscription?: Json
          user_id?: string
        }
        Relationships: []
      }
      user_organisation: {
        Row: {
          created_at: string
          id: number
          organisation_id: number
          role: Database["public"]["Enums"]["organisation_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          organisation_id: number
          role: Database["public"]["Enums"]["organisation_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          organisation_id?: number
          role?: Database["public"]["Enums"]["organisation_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_user_organisation_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisation"
            referencedColumns: ["id"]
          },
        ]
      }
      user_personal: {
        Row: {
          created_at: string
          language: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          language?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          language?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_user_with_code: {
        Args: {
          _organisation_id: number
          _code: string
        }
        Returns: string
      }
      create_organisation: {
        Args: {
          org_name: string
        }
        Returns: string
      }
      do_i_have_password_set: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      generate_authorization_key: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_random_apikey: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_random_string: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_all_auth_users: {
        Args: {
          p_limit: number
          p_offset: number
        }
        Returns: unknown[]
      }
      get_customer_email_for_organisation: {
        Args: {
          _organisation_id: number
        }
        Returns: string
      }
      get_organisation_subscription_status: {
        Args: {
          _org_id: number
        }
        Returns: {
          subscription_id: string
          subscription_status: string
          product_id: string
          price_id: string
        }[]
      }
      get_user_by_email: {
        Args: {
          p_email: string
        }
        Returns: unknown[]
      }
      get_user_organisation_details: {
        Args: {
          _organisation_id: number
        }
        Returns: {
          created_at: string
          user_id: string
          role: Database["public"]["Enums"]["organisation_role"]
          email: string
        }[]
      }
      update_organisation_billing_admin: {
        Args: {
          _org_id: number
          _new_admin_email: string
        }
        Returns: string
      }
      update_organisation_name: {
        Args: {
          _org_id: number
          _new_name: string
        }
        Returns: string
      }
      update_user_role: {
        Args: {
          _organisation_id: number
          _user_id: string
          _new_role: Database["public"]["Enums"]["organisation_role"]
        }
        Returns: string
      }
    }
    Enums: {
      organisation_role: "ADMIN" | "EDITOR" | "VIEWER"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
