export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)";
  };
  public: {
    Tables: {
      analytics_cache: {
        Row: {
          cache_key: string;
          created_at: string | null;
          data: Json;
          expires_at: string;
          id: string;
        };
        Insert: {
          cache_key: string;
          created_at?: string | null;
          data: Json;
          expires_at: string;
          id?: string;
        };
        Update: {
          cache_key?: string;
          created_at?: string | null;
          data?: Json;
          expires_at?: string;
          id?: string;
        };
        Relationships: [];
      };
      balances: {
        Row: {
          id: string;
          user_id: string;
          cash_in_hand: number | null;
          bank_balance: number | null;
          esewa_balance: number | null;
          fonepay_balance: number | null;
          cooperative_balance: number | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          cash_in_hand?: number | null;
          bank_balance?: number | null;
          esewa_balance?: number | null;
          fonepay_balance?: number | null;
          cooperative_balance?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          cash_in_hand?: number | null;
          bank_balance?: number | null;
          esewa_balance?: number | null;
          fonepay_balance?: number | null;
          cooperative_balance?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          name: string;
          table_type: string;
          description: string | null;
          is_active: boolean | null;
          created_at: string | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          table_type: string;
          description?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          table_type?: string;
          description?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      charging_sessions: {
        Row: {
          created_at: string | null;
          end_percentage: number | null;
          id: string;
          kcal: number | null;
          payment_mode: string;
          per_percent_rate: number | null;
          per_unit_rate: number | null;
          session_date: string | null;
          start_percentage: number | null;
          total_amount: number;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          end_percentage?: number | null;
          id?: string;
          kcal?: number | null;
          payment_mode: string;
          per_percent_rate?: number | null;
          per_unit_rate?: number | null;
          session_date?: string | null;
          start_percentage?: number | null;
          total_amount: number;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          end_percentage?: number | null;
          id?: string;
          kcal?: number | null;
          payment_mode?: string;
          per_percent_rate?: number | null;
          per_unit_rate?: number | null;
          session_date?: string | null;
          start_percentage?: number | null;
          total_amount?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      custom_calculations: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          calculation_config: Json;
          result_cache: Json | null;
          is_active: boolean | null;
          created_at: string | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          calculation_config: Json;
          result_cache?: Json | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          calculation_config?: Json;
          result_cache?: Json | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      cooperative_savings: {
        Row: {
          contribution_amount: number;
          contribution_date: string | null;
          created_at: string | null;
          cycle_period: string | null;
          id: string;
          member_id: string;
          user_id: string;
        };
        Insert: {
          contribution_amount: number;
          contribution_date?: string | null;
          created_at?: string | null;
          cycle_period?: string | null;
          id?: string;
          member_id: string;
          user_id: string;
        };
        Update: {
          contribution_amount?: number;
          contribution_date?: string | null;
          created_at?: string | null;
          cycle_period?: string | null;
          id?: string;
          member_id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      deposits: {
        Row: {
          amount: number;
          created_at: string | null;
          deposit_date: string | null;
          deposited_by: string;
          id: string;
          mode: string;
          remarks: string | null;
          user_id: string;
        };
        Insert: {
          amount: number;
          created_at?: string | null;
          deposit_date?: string | null;
          deposited_by: string;
          id?: string;
          mode: string;
          remarks?: string | null;
          user_id: string;
        };
        Update: {
          amount?: number;
          created_at?: string | null;
          deposit_date?: string | null;
          deposited_by?: string;
          id?: string;
          mode?: string;
          remarks?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      expenses: {
        Row: {
          amount: number;
          category: string;
          created_at: string | null;
          description: string;
          expense_date: string | null;
          id: string;
          payment_mode: string;
          remarks: string | null;
          user_id: string;
        };
        Insert: {
          amount: number;
          category: string;
          created_at?: string | null;
          description: string;
          expense_date?: string | null;
          id?: string;
          payment_mode: string;
          remarks?: string | null;
          user_id: string;
        };
        Update: {
          amount?: number;
          category?: string;
          created_at?: string | null;
          description?: string;
          expense_date?: string | null;
          id?: string;
          payment_mode?: string;
          remarks?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      logs: {
        Row: {
          id: string;
          user_id: string;
          action: string;
          table_name: string;
          record_id: string;
          details: Json | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          action: string;
          table_name: string;
          record_id: string;
          details?: Json | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          action?: string;
          table_name?: string;
          record_id?: string;
          details?: Json | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      menu_items: {
        Row: {
          category: string;
          created_at: string | null;
          description: string | null;
          id: string;
          is_available: boolean | null;
          name: string;
          price: number;
          updated_at: string | null;
        };
        Insert: {
          category: string;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_available?: boolean | null;
          name: string;
          price: number;
          updated_at?: string | null;
        };
        Update: {
          category?: string;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_available?: boolean | null;
          name?: string;
          price?: number;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          created_at: string | null;
          date: string | null;
          id: string;
          item_name: string;
          order_date: string | null;
          payment_mode: string;
          quantity: number;
          rate: number;
          total: number;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          date?: string | null;
          id?: string;
          item_name: string;
          order_date?: string | null;
          payment_mode: string;
          quantity?: number;
          rate: number;
          total: number;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          date?: string | null;
          id?: string;
          item_name?: string;
          order_date?: string | null;
          payment_mode?: string;
          quantity?: number;
          rate?: number;
          total?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string | null;
          email: string | null;
          first_name: string | null;
          id: string;
          last_name: string | null;
          role: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          email?: string | null;
          first_name?: string | null;
          id: string;
          last_name?: string | null;
          role?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          email?: string | null;
          first_name?: string | null;
          id?: string;
          last_name?: string | null;
          role?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      reports: {
        Row: {
          created_at: string | null;
          date_range_end: string | null;
          date_range_start: string | null;
          id: string;
          report_data: Json;
          report_type: string;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          date_range_end?: string | null;
          date_range_start?: string | null;
          id?: string;
          report_data: Json;
          report_type: string;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          date_range_end?: string | null;
          date_range_start?: string | null;
          id?: string;
          report_data?: Json;
          report_type?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      static_expenses: {
        Row: {
          amount: number;
          created_at: string;
          id: string;
          is_recurring: boolean;
          name: string;
          user_id: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          id?: string;
          is_recurring?: boolean;
          name: string;
          user_id: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          id?: string;
          is_recurring?: boolean;
          name?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string | null;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      withdrawals: {
        Row: {
          amount: number;
          created_at: string | null;
          id: string;
          purpose: string;
          recipient: string | null;
          reference_number: string | null;
          remarks: string | null;
          user_id: string;
          withdrawal_date: string | null;
        };
        Insert: {
          amount: number;
          created_at?: string | null;
          id?: string;
          purpose: string;
          recipient?: string | null;
          reference_number?: string | null;
          remarks?: string | null;
          user_id: string;
          withdrawal_date?: string | null;
        };
        Update: {
          amount?: number;
          created_at?: string | null;
          id?: string;
          purpose?: string;
          recipient?: string | null;
          reference_number?: string | null;
          remarks?: string | null;
          user_id?: string;
          withdrawal_date?: string | null;
        };
        Relationships: [];
      };
      opening_balances: {
        Row: {
          created_at: string | null;
          cutoff_date: string;
          id: string;
          opening_balance_amount: number;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          cutoff_date: string;
          id?: string;
          opening_balance_amount?: number;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          cutoff_date?: string;
          id?: string;
          opening_balance_amount?: number;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      share_investments: {
        Row: {
          contribution_amount: number;
          created_at: string | null;
          id: string;
          investment_date: string | null;
          payment_mode: string;
          shareholder_name: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          contribution_amount: number;
          created_at?: string | null;
          id?: string;
          investment_date?: string | null;
          payment_mode: string;
          shareholder_name: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          contribution_amount?: number;
          created_at?: string | null;
          id?: string;
          investment_date?: string | null;
          payment_mode?: string;
          shareholder_name?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_all_users_with_roles: {
        Args: Record<PropertyKey, never>;
        Returns: {
          id: string;
          email: string;
          role: Database["public"]["Enums"]["app_role"];
        }[];
      };
      get_cooperative_savings_trend: {
        Args: Record<PropertyKey, never>;
        Returns: {
          month: string;
          total_savings: number;
        }[];
      };
      get_current_user_role: {
        Args: Record<PropertyKey, never>;
        Returns: Database["public"]["Enums"]["app_role"];
      };
      get_expense_categorization: {
        Args: Record<PropertyKey, never>;
        Returns: {
          category: string;
          amount: number;
        }[];
      };
      get_income_breakdown: {
        Args: Record<PropertyKey, never>;
        Returns: {
          source: string;
          amount: number;
        }[];
      };
      get_menu_item_availability: {
        Args: Record<PropertyKey, never>;
        Returns: {
          status: string;
          item_count: number;
        }[];
      };
      get_monthly_deposits_withdrawals: {
        Args: Record<PropertyKey, never>;
        Returns: {
          month: string;
          deposits: number;
          withdrawals: number;
        }[];
      };
      get_monthly_financial_summary: {
        Args: Record<PropertyKey, never>;
        Returns: {
          month: string;
          revenue: number;
          expenses: number;
          profit: number;
        }[];
      };
      get_new_user_growth: {
        Args: Record<PropertyKey, never>;
        Returns: {
          month: string;
          new_users: number;
        }[];
      };
      get_popular_products: {
        Args: Record<PropertyKey, never>;
        Returns: {
          item_name: string;
          purchase_count: number;
        }[];
      };
      get_sales_by_payment_mode: {
        Args: Record<PropertyKey, never>;
        Returns: {
          payment_mode: string;
          total_sales: number;
        }[];
      };
      get_top_spenders: {
        Args: { limit_count?: number };
        Returns: {
          email: string;
          total_spent: number;
        }[];
      };
      get_user_role_distribution: {
        Args: Record<PropertyKey, never>;
        Returns: {
          role: string;
          user_count: number;
        }[];
      };
      has_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"] };
        Returns: boolean;
      };
      is_super_admin: {
        Args: { user_id?: string };
        Returns: boolean;
      };
      update_user_role: {
        Args: {
          user_id_to_update: string;
          new_role: Database["public"]["Enums"]["app_role"];
        };
        Returns: undefined;
      };
      insert_order_safe: {
        Args: {
          p_user_id: string;
          p_item_name: string;
          p_quantity: number;
          p_rate: number;
          p_total: number;
          p_payment_mode: string;
          p_order_date: string;
        };
        Returns: {
          id: string;
          user_id: string;
          item_name: string;
          quantity: number;
          rate: number;
          total: number;
          payment_mode: string;
          order_date: string;
          created_at: string;
        }[];
      };
    };
    Enums: {
      app_role:
        | "user"
        | "super_user"
        | "super_admin"
        | "data_entry"
        | "reports_viewer";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "user",
        "super_user",
        "super_admin",
        "data_entry",
        "reports_viewer",
      ],
    },
  },
} as const;
