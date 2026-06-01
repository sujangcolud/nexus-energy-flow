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
      advance_approvals: {
        Row: {
          acted_at: string
          acted_by: string
          action: string
          advance_id: string
          id: string
          remarks: string | null
        }
        Insert: {
          acted_at?: string
          acted_by: string
          action: string
          advance_id: string
          id?: string
          remarks?: string | null
        }
        Update: {
          acted_at?: string
          acted_by?: string
          action?: string
          advance_id?: string
          id?: string
          remarks?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advance_approvals_advance_id_fkey"
            columns: ["advance_id"]
            isOneToOne: false
            referencedRelation: "staff_advances"
            referencedColumns: ["id"]
          },
        ]
      }
      advance_disbursements: {
        Row: {
          advance_id: string
          amount: number
          bank_account: string | null
          bank_name: string | null
          cashier: string | null
          created_at: string
          disbursed_by: string
          disbursement_date: string
          id: string
          journal_entry_id: string | null
          method: string
          payment_mode: string
          remarks: string | null
          transaction_id: string | null
        }
        Insert: {
          advance_id: string
          amount: number
          bank_account?: string | null
          bank_name?: string | null
          cashier?: string | null
          created_at?: string
          disbursed_by: string
          disbursement_date?: string
          id?: string
          journal_entry_id?: string | null
          method: string
          payment_mode: string
          remarks?: string | null
          transaction_id?: string | null
        }
        Update: {
          advance_id?: string
          amount?: number
          bank_account?: string | null
          bank_name?: string | null
          cashier?: string | null
          created_at?: string
          disbursed_by?: string
          disbursement_date?: string
          id?: string
          journal_entry_id?: string | null
          method?: string
          payment_mode?: string
          remarks?: string | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advance_disbursements_advance_id_fkey"
            columns: ["advance_id"]
            isOneToOne: false
            referencedRelation: "staff_advances"
            referencedColumns: ["id"]
          },
        ]
      }
      advance_settlements: {
        Row: {
          advance_id: string
          amount: number
          created_at: string
          description: string | null
          employee_id: string
          expense_date: string | null
          expense_type: string | null
          id: string
          journal_entry_id: string | null
          settlement_type: string
          submitted_by: string
          updated_at: string
          verification_status: string
          verified_at: string | null
          verified_by: string | null
          verifier_remarks: string | null
        }
        Insert: {
          advance_id: string
          amount: number
          created_at?: string
          description?: string | null
          employee_id: string
          expense_date?: string | null
          expense_type?: string | null
          id?: string
          journal_entry_id?: string | null
          settlement_type?: string
          submitted_by: string
          updated_at?: string
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
          verifier_remarks?: string | null
        }
        Update: {
          advance_id?: string
          amount?: number
          created_at?: string
          description?: string | null
          employee_id?: string
          expense_date?: string | null
          expense_type?: string | null
          id?: string
          journal_entry_id?: string | null
          settlement_type?: string
          submitted_by?: string
          updated_at?: string
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
          verifier_remarks?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advance_settlements_advance_id_fkey"
            columns: ["advance_id"]
            isOneToOne: false
            referencedRelation: "staff_advances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advance_settlements_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_audit_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          latency_ms: number | null
          plan: Json | null
          question: string
          row_count: number | null
          success: boolean
          target_table: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          plan?: Json | null
          question: string
          row_count?: number | null
          success?: boolean
          target_table?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          plan?: Json | null
          question?: string
          row_count?: number | null
          success?: boolean
          target_table?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          payload: Json | null
          role: string
          session_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          payload?: Json | null
          role: string
          session_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          payload?: Json | null
          role?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_sessions: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
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
          cash_balance: number | null
          cash_in_hand: number
          cooperative_balance: number
          created_at: string
          esewa_balance: number
          fonepay_balance: number
          id: string
          last_updated: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bank_balance?: number
          cash_balance?: number | null
          cash_in_hand?: number
          cooperative_balance?: number
          created_at?: string
          esewa_balance?: number
          fonepay_balance?: number
          id?: string
          last_updated?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bank_balance?: number
          cash_balance?: number | null
          cash_in_hand?: number
          cooperative_balance?: number
          created_at?: string
          esewa_balance?: number
          fonepay_balance?: number
          id?: string
          last_updated?: string | null
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
      charger_connectors: {
        Row: {
          charger_id: string
          connector_id: number
          current: number | null
          power_kw: number | null
          soc: number | null
          status: string | null
          updated_at: string | null
          voltage: number | null
        }
        Insert: {
          charger_id: string
          connector_id: number
          current?: number | null
          power_kw?: number | null
          soc?: number | null
          status?: string | null
          updated_at?: string | null
          voltage?: number | null
        }
        Update: {
          charger_id?: string
          connector_id?: number
          current?: number | null
          power_kw?: number | null
          soc?: number | null
          status?: string | null
          updated_at?: string | null
          voltage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "charger_connectors_charger_id_fkey"
            columns: ["charger_id"]
            isOneToOne: false
            referencedRelation: "charger_status"
            referencedColumns: ["charger_id"]
          },
        ]
      }
      charger_meter_values: {
        Row: {
          charger_id: string
          connector_id: number | null
          current: number | null
          id: string
          power_kw: number | null
          soc: number | null
          timestamp: string | null
          transaction_id: string | null
          voltage: number | null
        }
        Insert: {
          charger_id: string
          connector_id?: number | null
          current?: number | null
          id?: string
          power_kw?: number | null
          soc?: number | null
          timestamp?: string | null
          transaction_id?: string | null
          voltage?: number | null
        }
        Update: {
          charger_id?: string
          connector_id?: number | null
          current?: number | null
          id?: string
          power_kw?: number | null
          soc?: number | null
          timestamp?: string | null
          transaction_id?: string | null
          voltage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "charger_meter_values_charger_id_fkey"
            columns: ["charger_id"]
            isOneToOne: false
            referencedRelation: "charger_status"
            referencedColumns: ["charger_id"]
          },
        ]
      }
      charger_status: {
        Row: {
          charger_id: string
          charger_name: string | null
          current: number
          model: string | null
          power_kw: number
          price_per_kwh: number | null
          soc: number
          status: string
          updated_at: string | null
          vendor: string | null
          voltage: number
        }
        Insert: {
          charger_id: string
          charger_name?: string | null
          current?: number
          model?: string | null
          power_kw?: number
          price_per_kwh?: number | null
          soc?: number
          status?: string
          updated_at?: string | null
          vendor?: string | null
          voltage?: number
        }
        Update: {
          charger_id?: string
          charger_name?: string | null
          current?: number
          model?: string | null
          power_kw?: number
          price_per_kwh?: number | null
          soc?: number
          status?: string
          updated_at?: string | null
          vendor?: string | null
          voltage?: number
        }
        Relationships: []
      }
      charger_transactions: {
        Row: {
          charger_id: string
          created_at: string | null
          id_tag: string | null
          is_active: boolean | null
          start_meter: number
          start_time: string | null
          transaction_id: string
        }
        Insert: {
          charger_id: string
          created_at?: string | null
          id_tag?: string | null
          is_active?: boolean | null
          start_meter: number
          start_time?: string | null
          transaction_id: string
        }
        Update: {
          charger_id?: string
          created_at?: string | null
          id_tag?: string | null
          is_active?: boolean | null
          start_meter?: number
          start_time?: string | null
          transaction_id?: string
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
          charger_id: string | null
          connector_id: number | null
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
          charger_id?: string | null
          connector_id?: number | null
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
          charger_id?: string | null
          connector_id?: number | null
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
          actual_cash_in_hand: number | null
          actual_fonepay_total: number | null
          cash_balance: number | null
          cash_diff: number | null
          cooperative_balance: number | null
          created_at: string | null
          esewa_balance: number | null
          expenses_total: number | null
          fonepay_balance: number | null
          fonepay_diff: number | null
          id: number
          summary_date: string
          system_cash_calculation: number | null
          total_balance: number | null
          total_cash_income: number | null
          total_deposits: number | null
          total_deposits_cash: number | null
          total_deposits_esewa: number | null
          total_deposits_from_cash: number | null
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
          total_withdrawals_cash: number | null
          total_withdrawals_cooperative: number | null
          total_withdrawals_cooperative_cash: number | null
          total_withdrawals_cooperative_esewa: number | null
          total_withdrawals_cooperative_fonepay: number | null
          updated_at: string | null
        }
        Insert: {
          actual_cash_in_hand?: number | null
          actual_fonepay_total?: number | null
          cash_balance?: number | null
          cash_diff?: number | null
          cooperative_balance?: number | null
          created_at?: string | null
          esewa_balance?: number | null
          expenses_total?: number | null
          fonepay_balance?: number | null
          fonepay_diff?: number | null
          id?: number
          summary_date: string
          system_cash_calculation?: number | null
          total_balance?: number | null
          total_cash_income?: number | null
          total_deposits?: number | null
          total_deposits_cash?: number | null
          total_deposits_esewa?: number | null
          total_deposits_from_cash?: number | null
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
          total_withdrawals_cash?: number | null
          total_withdrawals_cooperative?: number | null
          total_withdrawals_cooperative_cash?: number | null
          total_withdrawals_cooperative_esewa?: number | null
          total_withdrawals_cooperative_fonepay?: number | null
          updated_at?: string | null
        }
        Update: {
          actual_cash_in_hand?: number | null
          actual_fonepay_total?: number | null
          cash_balance?: number | null
          cash_diff?: number | null
          cooperative_balance?: number | null
          created_at?: string | null
          esewa_balance?: number | null
          expenses_total?: number | null
          fonepay_balance?: number | null
          fonepay_diff?: number | null
          id?: number
          summary_date?: string
          system_cash_calculation?: number | null
          total_balance?: number | null
          total_cash_income?: number | null
          total_deposits?: number | null
          total_deposits_cash?: number | null
          total_deposits_esewa?: number | null
          total_deposits_from_cash?: number | null
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
          total_withdrawals_cash?: number | null
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
      employees: {
        Row: {
          bank_account: string | null
          bank_name: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          department: string | null
          designation: string | null
          employee_code: string
          full_name: string
          id: string
          is_active: boolean
          joining_date: string | null
          marital_status: string
          pan_number: string | null
          ssf_number: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          bank_account?: string | null
          bank_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          department?: string | null
          designation?: string | null
          employee_code: string
          full_name: string
          id?: string
          is_active?: boolean
          joining_date?: string | null
          marital_status?: string
          pan_number?: string | null
          ssf_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          bank_account?: string | null
          bank_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          department?: string | null
          designation?: string | null
          employee_code?: string
          full_name?: string
          id?: string
          is_active?: boolean
          joining_date?: string | null
          marital_status?: string
          pan_number?: string | null
          ssf_number?: string | null
          updated_at?: string
          user_id?: string | null
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
          booking_date: string | null
          category: string
          cost_per_unit: number | null
          created_at: string | null
          description: string
          id: string
          inventory_item_id: string | null
          invoice_number: string | null
          is_inventory_purchase: boolean | null
          payment_date: string | null
          payment_mode: string | null
          quantity: number | null
          remarks: string | null
          status: string | null
          supplier: string | null
          unit: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          booking_date?: string | null
          category: string
          cost_per_unit?: number | null
          created_at?: string | null
          description: string
          id?: string
          inventory_item_id?: string | null
          invoice_number?: string | null
          is_inventory_purchase?: boolean | null
          payment_date?: string | null
          payment_mode?: string | null
          quantity?: number | null
          remarks?: string | null
          status?: string | null
          supplier?: string | null
          unit?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          booking_date?: string | null
          category?: string
          cost_per_unit?: number | null
          created_at?: string | null
          description?: string
          id?: string
          inventory_item_id?: string | null
          invoice_number?: string | null
          is_inventory_purchase?: boolean | null
          payment_date?: string | null
          payment_mode?: string | null
          quantity?: number | null
          remarks?: string | null
          status?: string | null
          supplier?: string | null
          unit?: string | null
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
          converted_base_quantity: number | null
          cost_per_unit: number | null
          created_at: string | null
          date: string | null
          description: string
          expense_date: string | null
          id: string
          inventory_item_id: string | null
          invoice_number: string | null
          is_credit: boolean | null
          is_inventory_purchase: boolean | null
          payment_mode: string
          purchase_unit: string | null
          quantity: number | null
          remarks: string | null
          supplier: string | null
          unit: string | null
          user_id: string
        }
        Insert: {
          amount: number
          category: string
          converted_base_quantity?: number | null
          cost_per_unit?: number | null
          created_at?: string | null
          date?: string | null
          description: string
          expense_date?: string | null
          id?: string
          inventory_item_id?: string | null
          invoice_number?: string | null
          is_credit?: boolean | null
          is_inventory_purchase?: boolean | null
          payment_mode: string
          purchase_unit?: string | null
          quantity?: number | null
          remarks?: string | null
          supplier?: string | null
          unit?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          converted_base_quantity?: number | null
          cost_per_unit?: number | null
          created_at?: string | null
          date?: string | null
          description?: string
          expense_date?: string | null
          id?: string
          inventory_item_id?: string | null
          invoice_number?: string | null
          is_credit?: boolean | null
          is_inventory_purchase?: boolean | null
          payment_mode?: string
          purchase_unit?: string | null
          quantity?: number | null
          remarks?: string | null
          supplier?: string | null
          unit?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "current_inventory_levels"
            referencedColumns: ["inventory_item_id"]
          },
          {
            foreignKeyName: "expenses_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          average_cost_per_base_unit: number | null
          base_unit: string
          base_unit_id: string | null
          category: string | null
          created_at: string | null
          current_stock_base: number | null
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
          unit_category: string | null
          unit_cost: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          average_cost_per_base_unit?: number | null
          base_unit?: string
          base_unit_id?: string | null
          category?: string | null
          created_at?: string | null
          current_stock_base?: number | null
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
          unit_category?: string | null
          unit_cost?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          average_cost_per_base_unit?: number | null
          base_unit?: string
          base_unit_id?: string | null
          category?: string | null
          created_at?: string | null
          current_stock_base?: number | null
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
          unit_category?: string | null
          unit_cost?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_base_unit_id_fkey"
            columns: ["base_unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string | null
          id: string
          inventory_item_id: string | null
          movement_type: string
          quantity_base: number
          reference_id: string | null
          reference_type: string | null
          unit_cost_base: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          inventory_item_id?: string | null
          movement_type: string
          quantity_base: number
          reference_id?: string | null
          reference_type?: string | null
          unit_cost_base?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          inventory_item_id?: string | null
          movement_type?: string
          quantity_base?: number
          reference_id?: string | null
          reference_type?: string | null
          unit_cost_base?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "current_inventory_levels"
            referencedColumns: ["inventory_item_id"]
          },
          {
            foreignKeyName: "inventory_movements_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_stock_ledger: {
        Row: {
          created_at: string
          id: string
          inventory_item_id: string
          notes: string | null
          quantity_change: number
          reference_id: string | null
          reference_type: string | null
          source_qty: number | null
          source_unit_id: string | null
          total_cost: number | null
          transaction_timestamp: string
          transaction_type: string
          unit_cost_base: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_item_id: string
          notes?: string | null
          quantity_change: number
          reference_id?: string | null
          reference_type?: string | null
          source_qty?: number | null
          source_unit_id?: string | null
          total_cost?: number | null
          transaction_timestamp?: string
          transaction_type: string
          unit_cost_base?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          inventory_item_id?: string
          notes?: string | null
          quantity_change?: number
          reference_id?: string | null
          reference_type?: string | null
          source_qty?: number | null
          source_unit_id?: string | null
          total_cost?: number | null
          transaction_timestamp?: string
          transaction_type?: string
          unit_cost_base?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_stock_ledger_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "current_inventory_levels"
            referencedColumns: ["inventory_item_id"]
          },
          {
            foreignKeyName: "inventory_stock_ledger_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_stock_ledger_source_unit_id_fkey"
            columns: ["source_unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
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
      inventory_unit_conversions: {
        Row: {
          conversion_to_base: number
          created_at: string | null
          id: string
          inventory_item_id: string | null
          is_base_unit: boolean | null
          is_purchase_unit: boolean | null
          unit_category: string | null
          unit_name: string
        }
        Insert: {
          conversion_to_base: number
          created_at?: string | null
          id?: string
          inventory_item_id?: string | null
          is_base_unit?: boolean | null
          is_purchase_unit?: boolean | null
          unit_category?: string | null
          unit_name: string
        }
        Update: {
          conversion_to_base?: number
          created_at?: string | null
          id?: string
          inventory_item_id?: string | null
          is_base_unit?: boolean | null
          is_purchase_unit?: boolean | null
          unit_category?: string | null
          unit_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_unit_conversions_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "current_inventory_levels"
            referencedColumns: ["inventory_item_id"]
          },
          {
            foreignKeyName: "inventory_unit_conversions_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          created_at: string
          entry_date: string
          id: string
          is_reversed: boolean
          narration: string | null
          posted_by: string
          reference_id: string | null
          reference_type: string
          reversed_by_entry_id: string | null
          total_amount: number
        }
        Insert: {
          created_at?: string
          entry_date?: string
          id?: string
          is_reversed?: boolean
          narration?: string | null
          posted_by: string
          reference_id?: string | null
          reference_type: string
          reversed_by_entry_id?: string | null
          total_amount?: number
        }
        Update: {
          created_at?: string
          entry_date?: string
          id?: string
          is_reversed?: boolean
          narration?: string | null
          posted_by?: string
          reference_id?: string | null
          reference_type?: string
          reversed_by_entry_id?: string | null
          total_amount?: number
        }
        Relationships: []
      }
      journal_lines: {
        Row: {
          account: string
          credit: number
          debit: number
          entry_id: string
          id: string
          memo: string | null
        }
        Insert: {
          account: string
          credit?: number
          debit?: number
          entry_id: string
          id?: string
          memo?: string | null
        }
        Update: {
          account?: string
          credit?: number
          debit?: number
          entry_id?: string
          id?: string
          memo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      loan_repayments: {
        Row: {
          amount_paid: number
          created_at: string | null
          id: string
          interest_paid: number
          loan_id: string | null
          payment_mode: string
          principal_paid: number
          remarks: string | null
          repayment_date: string | null
          user_id: string | null
        }
        Insert: {
          amount_paid: number
          created_at?: string | null
          id?: string
          interest_paid: number
          loan_id?: string | null
          payment_mode: string
          principal_paid: number
          remarks?: string | null
          repayment_date?: string | null
          user_id?: string | null
        }
        Update: {
          amount_paid?: number
          created_at?: string | null
          id?: string
          interest_paid?: number
          loan_id?: string | null
          payment_mode?: string
          principal_paid?: number
          remarks?: string | null
          repayment_date?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loan_repayments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loan_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loan_repayments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      loans: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          interest_rate: number
          lender_name: string
          loan_date: string | null
          loan_name: string
          loan_type: Database["public"]["Enums"]["loan_type"]
          maturity_date: string | null
          payment_mode: string | null
          principal_amount: number
          repayment_frequency: Database["public"]["Enums"]["repayment_frequency"]
          status: Database["public"]["Enums"]["loan_status"] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          interest_rate: number
          lender_name: string
          loan_date?: string | null
          loan_name: string
          loan_type: Database["public"]["Enums"]["loan_type"]
          maturity_date?: string | null
          payment_mode?: string | null
          principal_amount: number
          repayment_frequency: Database["public"]["Enums"]["repayment_frequency"]
          status?: Database["public"]["Enums"]["loan_status"] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          interest_rate?: number
          lender_name?: string
          loan_date?: string | null
          loan_name?: string
          loan_type?: Database["public"]["Enums"]["loan_type"]
          maturity_date?: string | null
          payment_mode?: string | null
          principal_amount?: number
          repayment_frequency?: Database["public"]["Enums"]["repayment_frequency"]
          status?: Database["public"]["Enums"]["loan_status"] | null
          updated_at?: string | null
          user_id?: string | null
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
          recipe_yield: number | null
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
          recipe_yield?: number | null
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
          recipe_yield?: number | null
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
      payroll_config: {
        Row: {
          created_at: string
          default_currency: string
          employee_ssf_pct: number
          employer_ssf_pct: number
          fiscal_year: string
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_currency?: string
          employee_ssf_pct?: number
          employer_ssf_pct?: number
          fiscal_year: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_currency?: string
          employee_ssf_pct?: number
          employer_ssf_pct?: number
          fiscal_year?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      payroll_periods: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          fiscal_year: string
          id: string
          notes: string | null
          paid_at: string | null
          period_end: string
          period_label: string
          period_start: string
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          fiscal_year: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          period_end: string
          period_label: string
          period_start: string
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          fiscal_year?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          period_end?: string
          period_label?: string
          period_start?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      payslips: {
        Row: {
          advance_recovery: number
          allowance: number
          basic_salary: number
          created_at: string
          ctc: number
          employee_id: string
          employee_ssf: number
          employer_ssf: number
          filing_status: string
          gross_salary: number
          id: string
          journal_entry_id: string | null
          net_pay: number
          notes: string | null
          other_benefits: number
          other_deductions: number
          paid_at: string | null
          payment_mode: string | null
          period_id: string
          status: string
          tax_deduction: number
          updated_at: string
        }
        Insert: {
          advance_recovery?: number
          allowance?: number
          basic_salary?: number
          created_at?: string
          ctc?: number
          employee_id: string
          employee_ssf?: number
          employer_ssf?: number
          filing_status?: string
          gross_salary?: number
          id?: string
          journal_entry_id?: string | null
          net_pay?: number
          notes?: string | null
          other_benefits?: number
          other_deductions?: number
          paid_at?: string | null
          payment_mode?: string | null
          period_id: string
          status?: string
          tax_deduction?: number
          updated_at?: string
        }
        Update: {
          advance_recovery?: number
          allowance?: number
          basic_salary?: number
          created_at?: string
          ctc?: number
          employee_id?: string
          employee_ssf?: number
          employer_ssf?: number
          filing_status?: string
          gross_salary?: number
          id?: string
          journal_entry_id?: string | null
          net_pay?: number
          notes?: string | null
          other_benefits?: number
          other_deductions?: number
          paid_at?: string | null
          payment_mode?: string | null
          period_id?: string
          status?: string
          tax_deduction?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payslips_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslips_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
        ]
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
      recipe_items: {
        Row: {
          created_at: string
          id: string
          inventory_item_id: string
          menu_item_id: string
          quantity_used: number
          unit_type: string
          waste_percentage: number
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_item_id: string
          menu_item_id: string
          quantity_used: number
          unit_type?: string
          waste_percentage?: number
        }
        Update: {
          created_at?: string
          id?: string
          inventory_item_id?: string
          menu_item_id?: string
          quantity_used?: number
          unit_type?: string
          waste_percentage?: number
        }
        Relationships: [
          {
            foreignKeyName: "recipe_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "current_inventory_levels"
            referencedColumns: ["inventory_item_id"]
          },
          {
            foreignKeyName: "recipe_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      record_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          id: string
          mime_type: string | null
          record_id: string
          record_type: string
          size_bytes: number | null
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          id?: string
          mime_type?: string | null
          record_id: string
          record_type: string
          size_bytes?: number | null
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          id?: string
          mime_type?: string | null
          record_id?: string
          record_type?: string
          size_bytes?: number | null
          uploaded_by?: string
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
      share_expenses: {
        Row: {
          amount: number
          category: string | null
          created_at: string | null
          description: string
          expense_date: string | null
          id: string
          payment_mode: string
          remarks: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string | null
          description: string
          expense_date?: string | null
          id?: string
          payment_mode?: string
          remarks?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string | null
          description?: string
          expense_date?: string | null
          id?: string
          payment_mode?: string
          remarks?: string | null
          updated_at?: string | null
          user_id?: string
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
          remarks: string | null
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
          remarks?: string | null
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
          remarks?: string | null
          shareholder_name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      staff_advances: {
        Row: {
          amount_approved: number | null
          amount_disbursed: number
          amount_requested: number
          amount_settled: number
          created_at: string
          employee_id: string
          expected_settlement_date: string | null
          id: string
          is_deleted: boolean
          outstanding_amount: number | null
          reason: string | null
          request_date: string
          requested_by: string
          settlement_method: string
          status: string
          updated_at: string
        }
        Insert: {
          amount_approved?: number | null
          amount_disbursed?: number
          amount_requested: number
          amount_settled?: number
          created_at?: string
          employee_id: string
          expected_settlement_date?: string | null
          id?: string
          is_deleted?: boolean
          outstanding_amount?: number | null
          reason?: string | null
          request_date?: string
          requested_by: string
          settlement_method?: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount_approved?: number | null
          amount_disbursed?: number
          amount_requested?: number
          amount_settled?: number
          created_at?: string
          employee_id?: string
          expected_settlement_date?: string | null
          id?: string
          is_deleted?: boolean
          outstanding_amount?: number | null
          reason?: string | null
          request_date?: string
          requested_by?: string
          settlement_method?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_advances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
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
      tax_slabs: {
        Row: {
          created_at: string
          filing_status: string
          fiscal_year: string
          from_amount: number
          id: string
          notes: string | null
          rate_pct: number
          slab_order: number
          to_amount: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          filing_status: string
          fiscal_year: string
          from_amount: number
          id?: string
          notes?: string | null
          rate_pct: number
          slab_order: number
          to_amount?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          filing_status?: string
          fiscal_year?: string
          from_amount?: number
          id?: string
          notes?: string | null
          rate_pct?: number
          slab_order?: number
          to_amount?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      unit_conversions: {
        Row: {
          created_at: string
          factor: number
          from_unit_id: string
          id: string
          to_unit_id: string
        }
        Insert: {
          created_at?: string
          factor: number
          from_unit_id: string
          id?: string
          to_unit_id: string
        }
        Update: {
          created_at?: string
          factor?: number
          from_unit_id?: string
          id?: string
          to_unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_conversions_from_unit_id_fkey"
            columns: ["from_unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_conversions_to_unit_id_fkey"
            columns: ["to_unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          created_at: string
          id: string
          is_base_unit: boolean
          name: string
          symbol: string
          unit_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_base_unit?: boolean
          name: string
          symbol: string
          unit_type: string
        }
        Update: {
          created_at?: string
          id?: string
          is_base_unit?: boolean
          name?: string
          symbol?: string
          unit_type?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"] | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"] | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"] | null
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
      verification_settings: {
        Row: {
          cutoff_date: string | null
          id: number
          opening_cash_balance: number | null
          updated_at: string | null
        }
        Insert: {
          cutoff_date?: string | null
          id?: number
          opening_cash_balance?: number | null
          updated_at?: string | null
        }
        Update: {
          cutoff_date?: string | null
          id?: number
          opening_cash_balance?: number | null
          updated_at?: string | null
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
          source_cooperative: string | null
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
          source_cooperative?: string | null
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
          source_cooperative?: string | null
          user_id?: string
          withdrawal_date?: string | null
          withdrawal_from?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      advanced_business_intelligence: {
        Row: {
          business_date: string | null
          category_group: string | null
          charging_count: number | null
          charging_revenue: number | null
          charging_to_food_conversion: number | null
          commission_total: number | null
          daily_cost: number | null
          daily_sales: number | null
          deposits_total: number | null
          expenses_total: number | null
          gross_margin_pct_7d: number | null
          orders_count: number | null
          orders_revenue: number | null
          revenue_per_commission_rupee: number | null
          rolling_cost_7d: number | null
          rolling_expenses_7d: number | null
          rolling_sales_7d: number | null
          rolling_withdrawals_7d: number | null
          total_revenue: number | null
          withdrawals_total: number | null
        }
        Relationships: []
      }
      ai_audit_alerts: {
        Row: {
          alert_description: string | null
          alert_type: string | null
          business_date: string | null
          category_group: string | null
          category_items: string | null
          daily_cost: number | null
          daily_sales: number | null
          margin: number | null
        }
        Relationships: []
      }
      category_usage_analysis: {
        Row: {
          business_date: string | null
          category: string | null
          margin_pct: number | null
          net_profit: number | null
          total_expense: number | null
          total_income: number | null
        }
        Relationships: []
      }
      current_inventory_levels: {
        Row: {
          base_unit_id: string | null
          base_unit_symbol: string | null
          inventory_item_id: string | null
          item_name: string | null
          quantity_on_hand: number | null
          stock_value: number | null
          weighted_avg_cost_per_base_unit: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_base_unit_id_fkey"
            columns: ["base_unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_business_performance: {
        Row: {
          business_date: string | null
          charging_count: number | null
          charging_revenue: number | null
          commission_burden_pct: number | null
          commission_total: number | null
          day_of_week: string | null
          deposits_total: number | null
          dow: number | null
          energy_revenue_share_pct: number | null
          expenses_total: number | null
          orders_count: number | null
          orders_revenue: number | null
          total_revenue: number | null
          withdrawals_total: number | null
        }
        Relationships: []
      }
      inventory_purchase_history: {
        Row: {
          cost_per_unit: number | null
          expense_date: string | null
          expense_description: string | null
          expense_id: string | null
          inventory_item_name: string | null
          invoice_number: string | null
          payment_mode: string | null
          quantity: number | null
          supplier: string | null
          total_cost: number | null
          unit: string | null
          user_id: string | null
        }
        Relationships: []
      }
      loan_summaries: {
        Row: {
          created_at: string | null
          description: string | null
          id: string | null
          interest_paid: number | null
          interest_rate: number | null
          last_repayment_date: string | null
          lender_name: string | null
          loan_date: string | null
          loan_name: string | null
          loan_type: Database["public"]["Enums"]["loan_type"] | null
          maturity_date: string | null
          outstanding_principal: number | null
          payment_mode: string | null
          principal_amount: number | null
          principal_paid: number | null
          repayment_frequency:
            | Database["public"]["Enums"]["repayment_frequency"]
            | null
          status: Database["public"]["Enums"]["loan_status"] | null
          total_paid: number | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: []
      }
      nepali_kitchen_intelligence: {
        Row: {
          business_date: string | null
          category: string | null
          daily_expense: number | null
          daily_sales: number | null
          efficiency_ratio: number | null
          gross_margin_pct_7d: number | null
          rolling_expense_7d: number | null
          rolling_sales_7d: number | null
        }
        Relationships: []
      }
      supplier_purchase_analytics: {
        Row: {
          first_purchase: string | null
          items_purchased: Json | null
          last_purchase: string | null
          supplier: string | null
          total_purchases: number | null
          total_spent: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_base_quantity: {
        Args: {
          p_inventory_item_id: string
          p_quantity: number
          p_unit: string
        }
        Returns: number
      }
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
      calculate_payroll_tax: {
        Args: {
          p_annual_taxable: number
          p_filing_status: string
          p_fiscal_year: string
        }
        Returns: number
      }
      convert_unit: {
        Args: { p_from: string; p_qty: number; p_to: string }
        Returns: number
      }
      convert_unit_v2: {
        Args: { p_from_unit: string; p_qty: number; p_to_unit: string }
        Returns: number
      }
      daily_closing: {
        Args: { p_closing_date: string; p_user_id: string }
        Returns: Json
      }
      disburse_advance: {
        Args: {
          p_advance_id: string
          p_amount: number
          p_bank_account?: string
          p_bank_name?: string
          p_cashier?: string
          p_disbursement_date?: string
          p_method: string
          p_payment_mode: string
          p_remarks?: string
          p_transaction_id?: string
        }
        Returns: string
      }
      generate_balance_sheet: {
        Args: { date_from: string; date_to: string; user_id_param: string }
        Returns: undefined
      }
      get_all_table_columns: { Args: never; Returns: Json }
      get_all_users_with_roles: {
        Args: never
        Returns: {
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          role: string
        }[]
      }
      get_balance_integrity: {
        Args: { p_from: string; p_to: string }
        Returns: {
          business_date: string
          deposits: number
          expenses: number
          net_change: number
          revenue: number
          withdrawals: number
        }[]
      }
      get_cooperative_savings_trend: {
        Args: never
        Returns: {
          month: string
          total_savings: number
        }[]
      }
      get_cooperative_savings_weekly_10weeks: {
        Args: never
        Returns: {
          total_savings: number
          week: string
        }[]
      }
      get_current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_daily_charging_sessions_30days: {
        Args: never
        Returns: {
          day: string
          session_count: number
          total_amount: number
        }[]
      }
      get_daily_expenses_30days: {
        Args: never
        Returns: {
          day: string
          expense_count: number
          total_expenses: number
        }[]
      }
      get_daily_orders_30days: {
        Args: never
        Returns: {
          day: string
          order_count: number
          total_revenue: number
        }[]
      }
      get_expense_categorization: {
        Args: never
        Returns: {
          amount: number
          category: string
        }[]
      }
      get_income_breakdown: {
        Args: never
        Returns: {
          amount: number
          source: string
        }[]
      }
      get_menu_item_availability: {
        Args: never
        Returns: {
          item_count: number
          status: string
        }[]
      }
      get_monthly_deposits_withdrawals: {
        Args: never
        Returns: {
          deposits: number
          month: string
          withdrawals: number
        }[]
      }
      get_monthly_financial_summary: {
        Args: never
        Returns: {
          expenses: number
          month: string
          profit: number
          revenue: number
        }[]
      }
      get_new_user_growth: {
        Args: never
        Returns: {
          month: string
          new_users: number
        }[]
      }
      get_popular_products: {
        Args: never
        Returns: {
          item_name: string
          purchase_count: number
        }[]
      }
      get_profitability_trend_3months: {
        Args: never
        Returns: {
          month: string
          profit: number
        }[]
      }
      get_revenue_vs_expenses_3months: {
        Args: never
        Returns: {
          expenses: number
          month: string
          revenue: number
        }[]
      }
      get_sales_by_payment_mode: {
        Args: never
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
      get_unit_category: { Args: { p_unit: string }; Returns: string }
      get_user_profiles_with_roles: {
        Args: never
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
        Args: never
        Returns: {
          role: string
          user_count: number
        }[]
      }
      has_role: { Args: { required_role: string }; Returns: boolean }
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
      is_super_admin: { Args: never; Returns: boolean }
      nexus_alert_thresholds: {
        Args: {
          cash_min?: number
          cooperative_min?: number
          esewa_min?: number
          fonepay_min?: number
        }
        Returns: {
          account: string
          breached: boolean
          current_balance: number
          threshold: number
        }[]
      }
      nexus_anomalies: {
        Args: { days_back?: number }
        Returns: {
          amount: number
          description: string
          mean_amount: number
          source: string
          stddev_amount: number
          txn_date: string
          txn_id: string
          z_score: number
        }[]
      }
      nexus_behavioral_insights: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: Json
      }
      nexus_cashflow_map: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: Json
      }
      nexus_detect_anomalies: {
        Args: { p_lookback_days?: number; p_z_threshold?: number }
        Returns: Json
      }
      nexus_forecast: {
        Args: { days_ahead?: number; days_back?: number }
        Returns: {
          expenses: number
          is_forecast: boolean
          net: number
          revenue: number
          series_date: string
        }[]
      }
      nexus_forecast_cashflow: {
        Args: { p_forecast_days?: number; p_lookback_days?: number }
        Returns: Json
      }
      nexus_kpi_summary: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: Json
      }
      nexus_reconcile: { Args: { p_check_date?: string }; Returns: Json }
      pay_payroll_period: {
        Args: {
          p_pay_date?: string
          p_payment_mode?: string
          p_period_id: string
        }
        Returns: number
      }
      process_inventory_expense:
        | {
            Args: {
              p_amount: number
              p_category: string
              p_cost_per_unit?: number
              p_description: string
              p_expense_date: string
              p_inventory_item_id?: string
              p_invoice_number?: string
              p_is_inventory_purchase?: boolean
              p_payment_mode: string
              p_quantity?: number
              p_remarks: string
              p_supplier?: string
              p_unit?: string
              p_user_id: string
            }
            Returns: string
          }
        | {
            Args: {
              p_amount: number
              p_category: string
              p_cost_per_unit?: number
              p_description: string
              p_expense_date: string
              p_inventory_item_id?: string
              p_invoice_number?: string
              p_is_inventory_purchase?: boolean
              p_manual_conversion_factor?: number
              p_payment_mode: string
              p_quantity?: number
              p_remarks: string
              p_supplier?: string
              p_unit?: string
              p_user_id: string
            }
            Returns: string
          }
        | {
            Args: {
              p_amount: number
              p_category: string
              p_cost_per_unit?: number
              p_description: string
              p_expense_date: string
              p_inventory_item_id?: string
              p_invoice_number?: string
              p_is_credit?: boolean
              p_is_inventory_purchase?: boolean
              p_manual_conversion_factor?: number
              p_payment_mode: string
              p_quantity?: number
              p_remarks: string
              p_supplier?: string
              p_unit?: string
              p_user_id: string
            }
            Returns: string
          }
        | {
            Args: {
              p_amount: number
              p_category: string
              p_cost_per_unit?: number
              p_description: string
              p_expense_date: string
              p_id?: string
              p_inventory_item_id?: string
              p_invoice_number?: string
              p_is_credit?: boolean
              p_is_inventory_purchase?: boolean
              p_manual_conversion_factor?: number
              p_payment_mode: string
              p_quantity?: number
              p_remarks: string
              p_supplier?: string
              p_unit?: string
              p_user_id: string
            }
            Returns: string
          }
      process_loan_repayment: {
        Args: {
          p_amount_paid: number
          p_interest_paid: number
          p_loan_id: string
          p_payment_mode: string
          p_principal_paid: number
          p_remarks: string
          p_repayment_date: string
          p_user_id: string
        }
        Returns: string
      }
      process_new_loan: {
        Args: {
          p_description: string
          p_interest_rate: number
          p_lender_name: string
          p_loan_date: string
          p_loan_name: string
          p_loan_type: Database["public"]["Enums"]["loan_type"]
          p_maturity_date: string
          p_payment_mode: string
          p_principal_amount: number
          p_repayment_frequency: Database["public"]["Enums"]["repayment_frequency"]
          p_user_id: string
        }
        Returns: string
      }
      process_pos_order: {
        Args: { p_items: Json; p_order_date: string; p_payment_mode: string }
        Returns: Json
      }
      recalculate_historical_daily_summaries: {
        Args: { target_user_id: string }
        Returns: number
      }
      refresh_schema_cache: { Args: never; Returns: boolean }
      run_payroll_for_employee: {
        Args: {
          p_advance_recovery?: number
          p_allowance?: number
          p_basic: number
          p_employee_id: string
          p_filing_status?: string
          p_other_benefits?: number
          p_other_deductions?: number
          p_period_id: string
        }
        Returns: string
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
      update_all_daily_summaries: { Args: never; Returns: undefined }
      update_daily_summary: {
        Args: { p_summary_date: string }
        Returns: undefined
      }
      update_enhanced_daily_summary: {
        Args: { target_date: string }
        Returns: undefined
      }
      verify_advance_settlement: {
        Args: {
          p_decision: string
          p_settlement_id: string
          p_verifier_remarks?: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role:
        | "user"
        | "super_user"
        | "super_admin"
        | "data_entry"
        | "reports_viewer"
      loan_status: "active" | "closed" | "defaulted"
      loan_type: "banking" | "cooperative" | "local"
      repayment_frequency: "daily" | "weekly" | "monthly"
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
      loan_status: ["active", "closed", "defaulted"],
      loan_type: ["banking", "cooperative", "local"],
      repayment_frequency: ["daily", "weekly", "monthly"],
    },
  },
} as const
