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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_security: {
        Row: {
          created_at: string
          failed_attempts: number
          id: string
          locked_until: string | null
          pin_hash: string
          pin_salt: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          failed_attempts?: number
          id?: string
          locked_until?: string | null
          pin_hash: string
          pin_salt: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          failed_attempts?: number
          id?: string
          locked_until?: string | null
          pin_hash?: string
          pin_salt?: string
          updated_at?: string
        }
        Relationships: []
      }
      barbers: {
        Row: {
          address: string | null
          commission_percent: number
          created_at: string
          date_joined: string
          full_name: string
          id: string
          last_salary_paid_date: string | null
          notes: string | null
          phone: string | null
          photo_url: string | null
          salary: number
          salary_day: number
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          commission_percent?: number
          created_at?: string
          date_joined?: string
          full_name: string
          id?: string
          last_salary_paid_date?: string | null
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          salary?: number
          salary_day?: number
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          commission_percent?: number
          created_at?: string
          date_joined?: string
          full_name?: string
          id?: string
          last_salary_paid_date?: string | null
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          salary?: number
          salary_day?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string | null
          id: string
          receipt_url: string | null
          spent_at: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          receipt_url?: string | null
          spent_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          receipt_url?: string | null
          spent_at?: string
        }
        Relationships: []
      }
      inventory: {
        Row: {
          barcode: string | null
          category: string | null
          created_at: string
          id: string
          minimum_stock: number
          name: string
          notes: string | null
          purchase_price: number
          quantity: number
          selling_price: number | null
          supplier_id: string | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          category?: string | null
          created_at?: string
          id?: string
          minimum_stock?: number
          name: string
          notes?: string | null
          purchase_price?: number
          quantity?: number
          selling_price?: number | null
          supplier_id?: string | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          category?: string | null
          created_at?: string
          id?: string
          minimum_stock?: number
          name?: string
          notes?: string | null
          purchase_price?: number
          quantity?: number
          selling_price?: number | null
          supplier_id?: string | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_reads: {
        Row: {
          alert_id: string
          created_at: string
          id: string
          read_at: string
          updated_at: string
        }
        Insert: {
          alert_id: string
          created_at?: string
          id?: string
          read_at?: string
          updated_at?: string
        }
        Update: {
          alert_id?: string
          created_at?: string
          id?: string
          read_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      payroll: {
        Row: {
          advance: number
          barber_id: string
          bonus: number
          commission: number
          created_at: string
          deduction: number
          id: string
          net_salary: number
          notes: string | null
          paid: boolean
          paid_at: string | null
          period: string
          salary: number
          tips: number
          updated_at: string
        }
        Insert: {
          advance?: number
          barber_id: string
          bonus?: number
          commission?: number
          created_at?: string
          deduction?: number
          id?: string
          net_salary?: number
          notes?: string | null
          paid?: boolean
          paid_at?: string | null
          period: string
          salary?: number
          tips?: number
          updated_at?: string
        }
        Update: {
          advance?: number
          barber_id?: string
          bonus?: number
          commission?: number
          created_at?: string
          deduction?: number
          id?: string
          net_salary?: number
          notes?: string | null
          paid?: boolean
          paid_at?: string | null
          period?: string
          salary?: number
          tips?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
        ]
      }
      pin_change_log: {
        Row: {
          changed_at: string
          id: string
        }
        Insert: {
          changed_at?: string
          id?: string
        }
        Update: {
          changed_at?: string
          id?: string
        }
        Relationships: []
      }
      salary_payments: {
        Row: {
          advance: number
          amount: number
          barber_id: string
          bonus: number
          commission: number
          created_at: string
          deduction: number
          id: string
          notes: string | null
          paid_at: string
          payroll_id: string | null
          period: string | null
          salary: number
          tips: number
        }
        Insert: {
          advance?: number
          amount?: number
          barber_id: string
          bonus?: number
          commission?: number
          created_at?: string
          deduction?: number
          id?: string
          notes?: string | null
          paid_at?: string
          payroll_id?: string | null
          period?: string | null
          salary?: number
          tips?: number
        }
        Update: {
          advance?: number
          amount?: number
          barber_id?: string
          bonus?: number
          commission?: number
          created_at?: string
          deduction?: number
          id?: string
          notes?: string | null
          paid_at?: string
          payroll_id?: string | null
          period?: string | null
          salary?: number
          tips?: number
        }
        Relationships: [
          {
            foreignKeyName: "salary_payments_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_payments_payroll_id_fkey"
            columns: ["payroll_id"]
            isOneToOne: false
            referencedRelation: "payroll"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          created_at: string
          id: string
          price: number
          quantity: number
          sale_id: string
          service_id: string | null
          service_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          price?: number
          quantity?: number
          sale_id: string
          service_id?: string | null
          service_name: string
        }
        Update: {
          created_at?: string
          id?: string
          price?: number
          quantity?: number
          sale_id?: string
          service_id?: string | null
          service_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          barber_id: string | null
          created_at: string
          id: string
          notes: string | null
          payment_method: string
          sold_at: string
          tip: number
          total: number
        }
        Insert: {
          barber_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          payment_method?: string
          sold_at?: string
          tip?: number
          total?: number
        }
        Update: {
          barber_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          payment_method?: string
          sold_at?: string
          tip?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          name: string
          name_am: string | null
          price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          name: string
          name_am?: string | null
          price?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          name?: string
          name_am?: string | null
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          address: string | null
          business_info: string | null
          currency: string
          daily_target: number
          id: string
          language: string
          logo_url: string | null
          phone: string | null
          shop_name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          business_info?: string | null
          currency?: string
          daily_target?: number
          id?: string
          language?: string
          logo_url?: string | null
          phone?: string | null
          shop_name?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          business_info?: string | null
          currency?: string
          daily_target?: number
          id?: string
          language?: string
          logo_url?: string | null
          phone?: string | null
          shop_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      stock_in: {
        Row: {
          created_at: string
          id: string
          inventory_id: string | null
          invoice_number: string | null
          notes: string | null
          product_name: string | null
          purchase_price: number
          quantity: number
          received_at: string
          supplier_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_id?: string | null
          invoice_number?: string | null
          notes?: string | null
          product_name?: string | null
          purchase_price?: number
          quantity?: number
          received_at?: string
          supplier_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          inventory_id?: string | null
          invoice_number?: string | null
          notes?: string | null
          product_name?: string | null
          purchase_price?: number
          quantity?: number
          received_at?: string
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_in_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_in_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_usage: {
        Row: {
          barber_id: string | null
          created_at: string
          id: string
          inventory_id: string | null
          product_name: string | null
          quantity: number
          reason: string | null
          used_at: string
        }
        Insert: {
          barber_id?: string | null
          created_at?: string
          id?: string
          inventory_id?: string | null
          product_name?: string | null
          quantity?: number
          reason?: string | null
          used_at?: string
        }
        Update: {
          barber_id?: string | null
          created_at?: string
          id?: string
          inventory_id?: string | null
          product_name?: string | null
          quantity?: number
          reason?: string | null
          used_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_usage_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_usage_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          company: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          products: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          products?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          products?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      [_ in never]: never
    }
    Enums: {
      app_role: "admin"
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
      app_role: ["admin"],
    },
  },
} as const
