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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      analytics_cache: {
        Row: {
          cache_key: string
          created_at: string | null
          data: Json
          expires_at: string
          id: string
        }
        Insert: {
          cache_key: string
          created_at?: string | null
          data: Json
          expires_at: string
          id?: string
        }
        Update: {
          cache_key?: string
          created_at?: string | null
          data?: Json
          expires_at?: string
          id?: string
        }
        Relationships: []
      }
      balance_sheet: {
        Row: {
          created_at: string | null
          date_range_end: string | null
          date_range_start: string | null
          id: string
          report_data: Json
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          date_range_end?: string | null
          date_range_start?: string | null
          id?: string
          report_data: Json
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          date_range_end?: string | null
          date_range_start?: string | null
          id?: string
          report_data?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      balances: {
        Row: {
          bank_balance: number
          cash_in_hand: number
          cooperative_balance: number
          created_at: string
          esewa_balance: number
          fonepay_balance: number
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bank_balance?: number
          cash_in_hand?: number
          cooperative_balance?: number
          created_at?: string
          esewa_balance?: number
          fonepay_balance?: number
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bank_balance?: number
          cash_in_hand?: number
          cooperative_balance?: number
          created_at?: string
          esewa_balance?: number
          fonepay_balance?: number
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      charging_categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      charging_sessions: {
        Row: {
          amount: number | null
          category: string | null
          created_at: string | null
          date: string | null
          end_percentage: number | null
          id: string
          kcal: number | null
          payment_mode: string
          per_percent_rate: number | null
          per_unit_rate: number | null
          session_date: string | null
          start_percentage: number | null
          start_time: string | null
          total_amount: number
          user_id: string
        }
        Insert: {
          amount?: number | null
          category?: string | null
          created_at?: string | null
          date?: string | null
          end_percentage?: number | null
          id?: string
          kcal?: number | null
          payment_mode: string
          per_percent_rate?: number | null
          per_unit_rate?: number | null
          session_date?: string | null
          start_percentage?: number | null
          start_time?: string | null
          total_amount: number
          user_id: string
        }
        Update: {
          amount?: number | null
          category?: string | null
          created_at?: string | null
          date?: string | null
          end_percentage?: number | null
          id?: string
          kcal?: number | null
          payment_mode?: string
          per_percent_rate?: number | null
          per_unit_rate?: number | null
          session_date?: string | null
          start_percentage?: number | null
          start_time?: string | null
          total_amount?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_charging_category"
            columns: ["category"]
            isOneToOne: false
            referencedRelation: "charging_categories"
            referencedColumns: ["name"]
          },
        ]
      }
      cooperative_savings: {
        Row: {
          contribution_amount: number
          contribution_date: string | null
          created_at: string | null
          cycle_period: string | null
          date: string | null
          id: string
          member_id: string
          payment_mode: string | null
          savings_to: string | null
          user_id: string
        }
        Insert: {
          contribution_amount: number
          contribution_date?: string | null
          created_at?: string | null
          cycle_period?: string | null
          date?: string | null
          id?: string
          member_id: string
          payment_mode?: string | null
          savings_to?: string | null
          user_id: string
        }
        Update: {
          contribution_amount?: number
          contribution_date?: string | null
          created_at?: string | null
          cycle_period?: string | null
          date?: string | null
          id?: string
          member_id?: string
          payment_mode?: string | null
          savings_to?: string | null
          user_id?: string
        }
        Relationships: []
      }
      daily_summary: {
        Row: {
          cash_balance: number | null
          cooperative_balance: number | null
          created_at: string | null
          esewa_balance: number | null
          fonepay_balance: number | null
          id: number
          summary_date: string
          total_balance: number | null
          total_cash_income: number | null
          total_deposits: number | null
          total_deposits_cash: number | null
          total_deposits_esewa: number | null
          total_esewa_income: number | null
          total_expenses: number | null
          total_expenses_cash: number | null
          total_expenses_esewa: number | null
          total_expenses_fonepay: number | null
          total_fonepay_income: number | null
          total_income: number | null
          total_income_cash: number | null
          total_income_esewa: number | null
          total_income_fonepay: number | null
          total_income_from_charging: number | null
          total_income_from_charging_cash: number | null
          total_income_from_charging_esewa: number | null
          total_income_from_charging_fonepay: number | null
          total_income_from_orders: number | null
          total_income_from_orders_cash: number | null
          total_income_from_orders_esewa: number | null
          total_income_from_orders_fonepay: number | null
          total_savings: number | null
          total_savings_cash: number | null
          total_savings_esewa: number | null
          total_savings_fonepay: number | null
          total_withdrawals: number | null
          total_withdrawals_bank: number | null
          total_withdrawals_bank_cash: number | null
          total_withdrawals_bank_esewa: number | null
          total_withdrawals_cooperative: number | null
          total_withdrawals_cooperative_cash: number | null
          total_withdrawals_cooperative_esewa: number | null
          total_withdrawals_cooperative_fonepay: number | null
          updated_at: string | null
        }
        Insert: {
          cash_balance?: number | null
          cooperative_balance?: number | null
          created_at?: string | null
          esewa_balance?: number | null
          fonepay_balance?: number | null
          id?: number
          summary_date: string
          total_balance?: number | null
          total_cash_income?: number | null
          total_deposits?: number | null
          total_deposits_cash?: number | null
          total_deposits_esewa?: number | null
          total_esewa_income?: number | null
          total_expenses?: number | null
          total_expenses_cash?: number | null
          total_expenses_esewa?: number | null
          total_expenses_fonepay?: number | null
          total_fonepay_income?: number | null
          total_income?: number | null
          total_income_cash?: number | null
          total_income_esewa?: number | null
          total_income_fonepay?: number | null
          total_income_from_charging?: number | null
          total_income_from_charging_cash?: number | null
          total_income_from_charging_esewa?: number | null
          total_income_from_charging_fonepay?: number | null
          total_income_from_orders?: number | null
          total_income_from_orders_cash?: number | null
          total_income_from_orders_esewa?: number | null
          total_income_from_orders_fonepay?: number | null
          total_savings?: number | null
          total_savings_cash?: number | null
          total_savings_esewa?: number | null
          total_savings_fonepay?: number | null
          total_withdrawals?: number | null
          total_withdrawals_bank?: number | null
          total_withdrawals_bank_cash?: number | null
          total_withdrawals_bank_esewa?: number | null
          total_withdrawals_cooperative?: number | null
          total_withdrawals_cooperative_cash?: number | null
          total_withdrawals_cooperative_esewa?: number | null
          total_withdrawals_cooperative_fonepay?: number | null
          updated_at?: string | null
        }
        Update: {
          cash_balance?: number | null
          cooperative_balance?: number | null
          created_at?: string | null
          esewa_balance?: number | null
          fonepay_balance?: number | null
          id?: number
          summary_date?: string
          total_balance?: number | null
          total_cash_income?: number | null
          total_deposits?: number | null
          total_deposits_cash?: number | null
          total_deposits_esewa?: number | null
          total_esewa_income?: number | null
          total_expenses?: number | null
          total_expenses_cash?: number | null
          total_expenses_esewa?: number | null
          total_expenses_fonepay?: number | null
          total_fonepay_income?: number | null
          total_income?: number | null
          total_income_cash?: number | null
          total_income_esewa?: number | null
          total_income_fonepay?: number | null
          total_income_from_charging?: number | null
          total_income_from_charging_cash?: number | null
          total_income_from_charging_esewa?: number | null
          total_income_from_charging_fonepay?: number | null
          total_income_from_orders?: number | null
          total_income_from_orders_cash?: number | null
          total_income_from_orders_esewa?: number | null
          total_income_from_orders_fonepay?: number | null
          total_savings?: number | null
          total_savings_cash?: number | null
          total_savings_esewa?: number | null
          total_savings_fonepay?: number | null
          total_withdrawals?: number | null
          total_withdrawals_bank?: number | null
          total_withdrawals_bank_cash?: number | null
          total_withdrawals_bank_esewa?: number | null
          total_withdrawals_cooperative?: number | null
          total_withdrawals_cooperative_cash?: number | null
          total_withdrawals_cooperative_esewa?: number | null
          total_withdrawals_cooperative_fonepay?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      deposit_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      deposits: {
        Row: {
          amount: number
          created_at: string | null
          date: string | null
          deposit_date: string | null
          deposited_by: string
          deposited_by_type: string | null
          deposited_to: string | null
          id: string
          mode: string
          payment_mode: string | null
          receiver_name: string | null
          remarks: string | null
          sender_name: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          date?: string | null
          deposit_date?: string | null
          deposited_by: string
          deposited_by_type?: string | null
          deposited_to?: string | null
          id?: string
          mode: string
          payment_mode?: string | null
          receiver_name?: string | null
          remarks?: string | null
          sender_name?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          date?: string | null
          deposit_date?: string | null
          deposited_by?: string
          deposited_by_type?: string | null
          deposited_to?: string | null
          id?: string
          mode?: string
          payment_mode?: string | null
          receiver_name?: string | null
          remarks?: string | null
          sender_name?: string | null
          user_id?: string
        }
        Relationships: []
      }
      edit_logs: {
        Row: {
          changed_at: string
          id: string
          new_data: Json
          previous_data: Json
          transaction_id: string
          transaction_type: string
          user_id: string
        }
        Insert: {
          changed_at?: string
          id?: string
          new_data: Json
          previous_data: Json
          transaction_id: string
          transaction_type: string
          user_id: string
        }
        Update: {
          changed_at?: string
          id?: string
          new_data?: Json
          previous_data?: Json
          transaction_id?: string
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      expense_booking_categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      expense_bookings: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          id: string
          party_name: string
          remarks: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string | null
          id?: string
          party_name: string
          remarks?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          id?: string
          party_name?: string
          remarks?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      expense_categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          date: string | null
          description: string
          expense_date: string | null
          id: string
          payment_mode: string
          remarks: string | null
          user_id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string | null
          date?: string | null
          description: string
          expense_date?: string | null
          id?: string
          payment_mode: string
          remarks?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          date?: string | null
          description?: string
          expense_date?: string | null
          id?: string
          payment_mode?: string
          remarks?: string | null
          user_id?: string
        }
        Relationships: []
      }
      inventory: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          expense_id: string | null
          expiry_date: string | null
          id: string
          is_active: boolean | null
          item_name: string
          location: string | null
          minimum_stock: number | null
          purchase_date: string | null
          quantity: number | null
          supplier: string | null
          total_cost: number | null
          unit_cost: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          expense_id?: string | null
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          item_name: string
          location?: string | null
          minimum_stock?: number | null
          purchase_date?: string | null
          quantity?: number | null
          supplier?: string | null
          total_cost?: number | null
          unit_cost?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          expense_id?: string | null
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          item_name?: string
          location?: string | null
          minimum_stock?: number | null
          purchase_date?: string | null
          quantity?: number | null
          supplier?: string | null
          total_cost?: number | null
          unit_cost?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      inventory_transactions: {
        Row: {
          created_at: string | null
          id: string
          inventory_id: string | null
          notes: string | null
          quantity: number
          reference_id: string | null
          reference_type: string | null
          total_cost: number | null
          transaction_date: string | null
          transaction_type: string
          unit_cost: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          inventory_id?: string | null
          notes?: string | null
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          total_cost?: number | null
          transaction_date?: string | null
          transaction_type?: string
          unit_cost?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          inventory_id?: string | null
          notes?: string | null
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          total_cost?: number | null
          transaction_date?: string | null
          transaction_type?: string
          unit_cost?: number | null
          user_id?: string
        }
        Relationships: []
      }
      logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          record_id: string
          table_name: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          record_id: string
          table_name: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          record_id?: string
          table_name?: string
          user_id?: string
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          is_available: boolean | null
          name: string
          price: number
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_available?: boolean | null
          name: string
          price: number
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_available?: boolean | null
          name?: string
          price?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      opening_balances: {
        Row: {
          created_at: string | null
          cutoff_date: string
          id: string
          opening_balance_amount: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          cutoff_date: string
          id?: string
          opening_balance_amount?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          cutoff_date?: string
          id?: string
          opening_balance_amount?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          item_name: string
          order_id: string
          price: number
          quantity: number
          unit: string | null
        }
        Insert: {
          id?: string
          item_name: string
          order_id: string
          price: number
          quantity: number
          unit?: string | null
        }
        Update: {
          id?: string
          item_name?: string
          order_id?: string
          price?: number
          quantity?: number
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount: number | null
          created_at: string | null
          date: string | null
          id: string
          item_name: string
          order_date: string | null
          payment_mode: string
          quantity: number
          rate: number
          total: number
          user_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          date?: string | null
          id?: string
          item_name: string
          order_date?: string | null
          payment_mode: string
          quantity?: number
          rate: number
          total: number
          user_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          date?: string | null
          id?: string
          item_name?: string
          order_date?: string | null
          payment_mode?: string
          quantity?: number
          rate?: number
          total?: number
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string | null
          date_range_end: string | null
          date_range_start: string | null
          id: string
          report_data: Json
          report_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date_range_end?: string | null
          date_range_start?: string | null
          id?: string
          report_data: Json
          report_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          date_range_end?: string | null
          date_range_start?: string | null
          id?: string
          report_data?: Json
          report_type?: string
          user_id?: string
        }
        Relationships: []
      }
      savings_categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      share_investments: {
        Row: {
          contribution_amount: number
          created_at: string | null
          id: string
          investment_date: string | null
          payment_mode: string
          shareholder_name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          contribution_amount: number
          created_at?: string | null
          id?: string
          investment_date?: string | null
          payment_mode: string
          shareholder_name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          contribution_amount?: number
          created_at?: string | null
          id?: string
          investment_date?: string | null
          payment_mode?: string
          shareholder_name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      static_expenses: {
        Row: {
          amount: number
          created_at: string
          id: string
          is_recurring: boolean
          name: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          is_recurring?: boolean
          name: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          is_recurring?: boolean
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_tab_permissions: {
        Row: {
          created_at: string | null
          enabled: boolean
          id: string
          tab_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean
          id?: string
          tab_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          enabled?: boolean
          id?: string
          tab_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      vat_entries: {
        Row: {
          amount: number
          amount_due: number
          amount_paid: number
          approved_by: string | null
          buyer_address: string
          buyer_contact_number: string | null
          buyer_email: string | null
          buyer_name: string
          buyer_pan: string
          buyer_vat_registration_number: string
          created_at: string | null
          entry_id: string
          entry_type: string
          grand_total: number
          id: string
          invoice_date: string
          invoice_number: string
          irn: string | null
          item_name: string
          items: Json
          payment_mode: string
          prepared_by: string | null
          qr_code_data: string | null
          remarks: string | null
          seller_address: string
          seller_contact_number: string | null
          seller_email: string | null
          seller_name: string
          seller_pan: string
          seller_vat_registration_number: string
          sub_total: number
          total_discount: number | null
          total_with_vat: number
          user_id: string
          vat_amount: number
          vat_rate: number
          vat_total: number
        }
        Insert: {
          amount?: number
          amount_due: number
          amount_paid: number
          approved_by?: string | null
          buyer_address: string
          buyer_contact_number?: string | null
          buyer_email?: string | null
          buyer_name: string
          buyer_pan: string
          buyer_vat_registration_number: string
          created_at?: string | null
          entry_id?: string
          entry_type?: string
          grand_total: number
          id?: string
          invoice_date: string
          invoice_number: string
          irn?: string | null
          item_name?: string
          items: Json
          payment_mode: string
          prepared_by?: string | null
          qr_code_data?: string | null
          remarks?: string | null
          seller_address: string
          seller_contact_number?: string | null
          seller_email?: string | null
          seller_name: string
          seller_pan: string
          seller_vat_registration_number: string
          sub_total: number
          total_discount?: number | null
          total_with_vat?: number
          user_id: string
          vat_amount?: number
          vat_rate?: number
          vat_total: number
        }
        Update: {
          amount?: number
          amount_due?: number
          amount_paid?: number
          approved_by?: string | null
          buyer_address?: string
          buyer_contact_number?: string | null
          buyer_email?: string | null
          buyer_name?: string
          buyer_pan?: string
          buyer_vat_registration_number?: string
          created_at?: string | null
          entry_id?: string
          entry_type?: string
          grand_total?: number
          id?: string
          invoice_date?: string
          invoice_number?: string
          irn?: string | null
          item_name?: string
          items?: Json
          payment_mode?: string
          prepared_by?: string | null
          qr_code_data?: string | null
          remarks?: string | null
          seller_address?: string
          seller_contact_number?: string | null
          seller_email?: string | null
          seller_name?: string
          seller_pan?: string
          seller_vat_registration_number?: string
          sub_total?: number
          total_discount?: number | null
          total_with_vat?: number
          user_id?: string
          vat_amount?: number
          vat_rate?: number
          vat_total?: number
        }
        Relationships: []
      }
      withdrawal_categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          amount: number
          category: string | null
          created_at: string | null
          date: string | null
          id: string
          payment_mode: string | null
          purpose: string
          recipient: string | null
          reference_number: string | null
          remarks: string | null
          user_id: string
          withdrawal_date: string | null
          withdrawal_from: string | null
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string | null
          date?: string | null
          id?: string
          payment_mode?: string | null
          purpose: string
          recipient?: string | null
          reference_number?: string | null
          remarks?: string | null
          user_id: string
          withdrawal_date?: string | null
          withdrawal_from?: string | null
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string | null
          date?: string | null
          id?: string
          payment_mode?: string | null
          purpose?: string
          recipient?: string | null
          reference_number?: string | null
          remarks?: string | null
          user_id?: string
          withdrawal_date?: string | null
          withdrawal_from?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_daily_summary_fixed: {
        Args: { target_date: string; target_user_id: string }
        Returns: {
          cash_balance: number
          cooperative_balance: number
          esewa_balance: number
          fonepay_balance: number
          summary_date: string
          total_balance: number
          total_cash_income: number
          total_deposits: number
          total_deposits_cash: number
          total_deposits_esewa: number
          total_esewa_income: number
          total_expenses: number
          total_expenses_cash: number
          total_expenses_esewa: number
          total_expenses_fonepay: number
          total_fonepay_income: number
          total_income: number
          total_income_cash: number
          total_income_esewa: number
          total_income_fonepay: number
          total_income_from_charging: number
          total_income_from_orders: number
          total_savings: number
          total_savings_cash: number
          total_savings_esewa: number
          total_savings_fonepay: number
          total_withdrawals: number
          total_withdrawals_bank: number
          total_withdrawals_cash: number
          total_withdrawals_cooperative: number
          total_withdrawals_esewa: number
          total_withdrawals_fonepay: number
        }[]
      }
      calculate_enhanced_daily_summary: {
        Args: { target_date: string }
        Returns: {
          cash_balance: number
          cooperative_balance: number
          esewa_balance: number
          fonepay_balance: number
          summary_date: string
          total_balance: number
          total_cash_income: number
          total_deposits: number
          total_deposits_cash: number
          total_deposits_esewa: number
          total_esewa_income: number
          total_expenses: number
          total_expenses_cash: number
          total_expenses_esewa: number
          total_expenses_fonepay: number
          total_fonepay_income: number
          total_income: number
          total_income_from_charging: number
          total_income_from_charging_cash: number
          total_income_from_charging_esewa: number
          total_income_from_charging_fonepay: number
          total_income_from_orders: number
          total_income_from_orders_cash: number
          total_income_from_orders_esewa: number
          total_income_from_orders_fonepay: number
          total_savings: number
          total_savings_cash: number
          total_savings_esewa: number
          total_savings_fonepay: number
          total_withdrawals: number
          total_withdrawals_bank: number
          total_withdrawals_bank_cash: number
          total_withdrawals_bank_esewa: number
          total_withdrawals_cooperative: number
          total_withdrawals_cooperative_cash: number
          total_withdrawals_cooperative_esewa: number
          total_withdrawals_cooperative_fonepay: number
        }[]
      }
      daily_closing: {
        Args:
          | { closing_date: string; user_id_param: string }
          | { p_closing_date: string; p_user_id: string }
        Returns: undefined
      }
      execute_dynamic_report: {
        Args: { custom_calculations: Json; filters: Json }
        Returns: Json
      }
      generate_balance_sheet: {
        Args: { date_from: string; date_to: string; user_id_param: string }
        Returns: undefined
      }
      get_all_table_columns: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_all_users_with_roles: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          role: string
        }[]
      }
      get_cooperative_savings_trend: {
        Args: Record<PropertyKey, never>
        Returns: {
          month: string
          total_savings: number
        }[]
      }
      get_cooperative_savings_weekly_10weeks: {
        Args: Record<PropertyKey, never>
        Returns: {
          total_savings: number
          week: string
        }[]
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_daily_charging_sessions_30days: {
        Args: Record<PropertyKey, never>
        Returns: {
          day: string
          session_count: number
          total_amount: number
        }[]
      }
      get_daily_expenses_30days: {
        Args: Record<PropertyKey, never>
        Returns: {
          day: string
          expense_count: number
          total_expenses: number
        }[]
      }
      get_daily_orders_30days: {
        Args: Record<PropertyKey, never>
        Returns: {
          day: string
          order_count: number
          total_revenue: number
        }[]
      }
      get_expense_categorization: {
        Args: Record<PropertyKey, never>
        Returns: {
          amount: number
          category: string
        }[]
      }
      get_income_breakdown: {
        Args: Record<PropertyKey, never>
        Returns: {
          amount: number
          source: string
        }[]
      }
      get_menu_item_availability: {
        Args: Record<PropertyKey, never>
        Returns: {
          item_count: number
          status: string
        }[]
      }
      get_monthly_deposits_withdrawals: {
        Args: Record<PropertyKey, never>
        Returns: {
          deposits: number
          month: string
          withdrawals: number
        }[]
      }
      get_monthly_financial_summary: {
        Args: Record<PropertyKey, never>
        Returns: {
          expenses: number
          month: string
          profit: number
          revenue: number
        }[]
      }
      get_new_user_growth: {
        Args: Record<PropertyKey, never>
        Returns: {
          month: string
          new_users: number
        }[]
      }
      get_popular_products: {
        Args: Record<PropertyKey, never>
        Returns: {
          item_name: string
          purchase_count: number
        }[]
      }
      get_profitability_trend_3months: {
        Args: Record<PropertyKey, never>
        Returns: {
          month: string
          profit: number
        }[]
      }
      get_revenue_vs_expenses_3months: {
        Args: Record<PropertyKey, never>
        Returns: {
          expenses: number
          month: string
          revenue: number
        }[]
      }
      get_sales_by_payment_mode: {
        Args: Record<PropertyKey, never>
        Returns: {
          payment_mode: string
          total_sales: number
        }[]
      }
      get_top_spenders: {
        Args: { limit_count?: number }
        Returns: {
          email: string
          total_spent: number
        }[]
      }
      get_user_profiles_with_roles: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          role: string
        }[]
      }
      get_user_role_distribution: {
        Args: Record<PropertyKey, never>
        Returns: {
          role: string
          user_count: number
        }[]
      }
      has_role: {
        Args: { required_role: string }
        Returns: boolean
      }
      insert_order_safe: {
        Args: {
          p_item_name: string
          p_order_date: string
          p_payment_mode: string
          p_quantity: number
          p_rate: number
          p_total: number
          p_user_id: string
        }
        Returns: {
          created_at: string
          id: string
          item_name: string
          order_date: string
          payment_mode: string
          quantity: number
          rate: number
          total: number
          user_id: string
        }[]
      }
      recalculate_historical_daily_summaries: {
        Args: { target_user_id: string }
        Returns: number
      }
      refresh_schema_cache: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      safe_get_daily_summary_value: {
        Args: {
          fallback_column?: string
          primary_column: string
          summary_row: Database["public"]["Tables"]["daily_summary"]["Row"]
        }
        Returns: number
      }
      sync_daily_summary_for_date: {
        Args: { target_date: string }
        Returns: undefined
      }
      sync_daily_summary_for_date_v2: {
        Args: { target_date: string }
        Returns: undefined
      }
      sync_daily_summary_for_date_v6: {
        Args: { target_date: string }
        Returns: undefined
      }
      sync_daily_summary_for_date_v8: {
        Args: { target_date: string }
        Returns: undefined
      }
      sync_daily_summary_for_date_v9: {
        Args: { target_date: string }
        Returns: undefined
      }
      update_all_daily_summaries: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_daily_summary: {
        Args: { p_summary_date: string }
        Returns: undefined
      }
      update_enhanced_daily_summary: {
        Args: { target_date: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "user"
        | "super_user"
        | "super_admin"
        | "data_entry"
        | "reports_viewer"
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
      app_role: [
        "user",
        "super_user",
        "super_admin",
        "data_entry",
        "reports_viewer",
      ],
    },
  },
} as const
