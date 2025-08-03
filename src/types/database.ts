// Database types based on the complete schema provided
export interface DailySummary {
  id: number;
  summary_date: string;
  total_income_from_orders: number;
  total_income_from_orders_cash: number;
  total_income_from_orders_fonepay: number;
  total_income_from_orders_esewa: number;
  total_income_from_charging: number;
  total_income_from_charging_fonepay: number;
  total_income_from_charging_esewa: number;
  total_income_from_charging_cash: number;
  total_expenses: number;
  total_expenses_cash: number;
  total_expenses_esewa: number;
  total_expenses_fonepay: number;
  total_deposits: number;
  total_deposits_cash: number;
  total_deposits_esewa: number;
  total_savings: number;
  total_savings_cash: number;
  total_savings_fonepay: number;
  total_savings_esewa: number;
  total_withdrawals: number;
  total_withdrawals_cooperative: number;
  total_withdrawals_cooperative_cash: number;
  total_withdrawals_cooperative_esewa: number;
  total_withdrawals_cooperative_fonepay: number;
  total_withdrawals_bank: number;
  total_withdrawals_bank_cash: number;
  total_withdrawals_bank_esewa: number;
  total_income: number;
  total_cash_income: number;
  total_fonepay_income: number;
  total_esewa_income: number;
  cash_balance: number;
  esewa_balance: number;
  fonepay_balance: number;
  cooperative_balance: number;
  total_balance: number;
  created_at: string;
  updated_at: string;
  total_income_fonepay: number;
}

export interface Order {
  id: string;
  user_id: string;
  item_name: string;
  quantity: number;
  rate: number;
  total: number;
  payment_mode: string;
  order_date: string;
  created_at: string;
  date: string;
  amount?: number;
}

export interface ChargingSession {
  id: string;
  user_id: string;
  start_percentage?: number;
  end_percentage?: number;
  per_percent_rate?: number;
  kcal?: number;
  per_unit_rate?: number;
  total_amount: number;
  payment_mode: string;
  session_date: string;
  created_at: string;
  category?: string;
  amount?: number;
  date: string;
  start_time: string;
}

export interface Expense {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  category: string;
  payment_mode: string;
  remarks?: string;
  expense_date: string;
  created_at: string;
  date: string;
}

export interface Deposit {
  id: string;
  user_id: string;
  amount: number;
  mode: string;
  deposited_by: string;
  deposit_date: string;
  created_at: string;
  remarks?: string;
  sender_name?: string;
  receiver_name?: string;
  payment_mode?: string;
  deposited_to?: string;
  date: string;
  deposited_by_type: 'Customer' | 'Staff';
}

export interface Withdrawal {
  id: string;
  user_id: string;
  amount: number;
  purpose: string;
  recipient?: string;
  withdrawal_date: string;
  created_at: string;
  reference_number?: string;
  remarks?: string;
  payment_mode: 'Cash' | 'Esewa' | 'Fonepay';
  date: string;
  category: string;
  withdrawal_from: 'Esewa' | 'Bank' | 'Cooperative';
}

export interface CooperativeSaving {
  id: string;
  user_id: string;
  member_id: string;
  contribution_amount: number;
  cycle_period?: string;
  contribution_date: string;
  created_at: string;
  date: string;
  payment_mode: 'Cash' | 'Esewa' | 'Fonepay';
  savings_to: 'Bank' | 'Cooperative';
}

export interface Profile {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  created_at: string;
  updated_at: string;
  role?: string;
}

export interface Balance {
  id: string;
  user_id: string;
  cash_in_hand: number;
  esewa_balance: number;
  fonepay_balance: number;
  cooperative_balance: number;
  bank_balance: number;
  created_at: string;
  updated_at: string;
}
