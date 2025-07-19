// Daily Summary Calculation Logic
// Based on the specification provided by the user

export interface DailySummaryData {
  orders: Array<{ total: number; payment_mode: string; order_date: string }>;
  charging: Array<{
    total_amount: number;
    payment_mode: string;
    session_date: string;
  }>;
  expenses: Array<{
    amount: number;
    payment_mode: string;
    expense_date: string;
  }>;
  deposits: Array<{ amount: number; mode: string; deposit_date: string }>;
  savings: Array<{
    contribution_amount: number;
    contribution_date: string;
    cycle_period?: string;
  }>;
  withdrawals: Array<{
    amount: number;
    withdrawal_date: string;
    purpose: string;
  }>;
}

export interface DailySummaryCalculations {
  // S.N.: Auto-incrementing integer.
  sn?: number;
  // Date: The date for the summary.
  date: string;

  // Income calculations
  total_income_from_orders: number;
  total_income_from_charging: number;
  total_income_fonepay: number;
  total_income_esewa: number;
  total_income_cash: number;

  // Expense calculations
  total_expenses: number;
  total_expenses_cash: number;
  total_expenses_esewa: number;
  total_expenses_fonepay: number;

  // Deposit calculations
  total_deposits: number;
  total_deposits_cash: number;
  total_deposits_esewa: number;

  // Savings calculations
  total_savings: number;
  total_savings_cash: number;
  total_savings_fonepay: number;
  total_savings_esewa: number;

  // Withdrawal calculations
  total_withdrawals: number;
  total_withdrawals_cooperative: number;
  total_withdrawals_bank: number;

  // Derived totals
  total_income: number;
  total_cash_income: number;
  total_fonepay_income: number;
  total_esewa_income: number;

  // Balance calculations
  cash_balance: number;
  esewa_balance: number;
  fonepay_balance: number;
  cooperative_balance: number;
  total_balance: number;

  // Helper fields for deposits (these need to be provided or calculated separately)
  deposits_to_esewa?: number;
  deposits_to_fonepay?: number;
  total_withdrawals_cash?: number;
}

/**
 * Calculate daily summary based on the provided data
 */
export function calculateDailySummary(
  data: DailySummaryData,
  date: string,
  depositsToEsewa: number = 0,
  depositsToFonepay: number = 0,
  withdrawalsCash: number = 0,
): DailySummaryCalculations {
  // Filter data by date
  const ordersForDate = data.orders.filter((o) => o.order_date === date);
  const chargingForDate = data.charging.filter((c) => c.session_date === date);
  const expensesForDate = data.expenses.filter((e) => e.expense_date === date);
  const depositsForDate = data.deposits.filter((d) => d.deposit_date === date);
  const savingsForDate = data.savings.filter(
    (s) => s.contribution_date === date,
  );
  const withdrawalsForDate = data.withdrawals.filter(
    (w) => w.withdrawal_date === date,
  );

  // Helper function to normalize payment mode strings
  const normalizePaymentMode = (mode: string): string => {
    const lower = mode.toLowerCase();
    if (lower.includes("esewa")) return "esewa";
    if (lower.includes("fonepay")) return "fonepay";
    if (lower.includes("cash")) return "cash";
    if (lower.includes("bank")) return "fonepay"; // Bank transfers counted as fonepay
    return lower;
  };

  // Income from orders
  const total_income_from_orders = ordersForDate.reduce(
    (sum, order) => sum + order.total,
    0,
  );

  // Income from charging
  const total_income_from_charging = chargingForDate.reduce(
    (sum, charge) => sum + charge.total_amount,
    0,
  );

  // Payment mode breakdown for orders
  const ordersEsewa = ordersForDate
    .filter((o) => normalizePaymentMode(o.payment_mode) === "esewa")
    .reduce((sum, o) => sum + o.total, 0);
  const ordersFonepay = ordersForDate
    .filter((o) => normalizePaymentMode(o.payment_mode) === "fonepay")
    .reduce((sum, o) => sum + o.total, 0);
  const ordersCash = ordersForDate
    .filter((o) => normalizePaymentMode(o.payment_mode) === "cash")
    .reduce((sum, o) => sum + o.total, 0);

  // Payment mode breakdown for charging
  const chargingEsewa = chargingForDate
    .filter((c) => normalizePaymentMode(c.payment_mode) === "esewa")
    .reduce((sum, c) => sum + c.total_amount, 0);
  const chargingFonepay = chargingForDate
    .filter((c) => normalizePaymentMode(c.payment_mode) === "fonepay")
    .reduce((sum, c) => sum + c.total_amount, 0);
  const chargingCash = chargingForDate
    .filter((c) => normalizePaymentMode(c.payment_mode) === "cash")
    .reduce((sum, c) => sum + c.total_amount, 0);

  // Total income by payment mode
  const total_income_esewa = ordersEsewa + chargingEsewa;
  const total_income_fonepay = ordersFonepay + chargingFonepay;
  const total_income_cash = ordersCash + chargingCash;

  // Expenses
  const total_expenses = expensesForDate.reduce(
    (sum, expense) => sum + expense.amount,
    0,
  );
  const total_expenses_cash = expensesForDate
    .filter((e) => normalizePaymentMode(e.payment_mode) === "cash")
    .reduce((sum, e) => sum + e.amount, 0);
  const total_expenses_esewa = expensesForDate
    .filter((e) => normalizePaymentMode(e.payment_mode) === "esewa")
    .reduce((sum, e) => sum + e.amount, 0);
  const total_expenses_fonepay = expensesForDate
    .filter((e) => normalizePaymentMode(e.payment_mode) === "fonepay")
    .reduce((sum, e) => sum + e.amount, 0);

  // Deposits
  const total_deposits = depositsForDate.reduce(
    (sum, deposit) => sum + deposit.amount,
    0,
  );
  const total_deposits_cash = depositsForDate
    .filter((d) => normalizePaymentMode(d.mode) === "cash")
    .reduce((sum, d) => sum + d.amount, 0);
  const total_deposits_esewa = depositsForDate
    .filter((d) => normalizePaymentMode(d.mode) === "esewa")
    .reduce((sum, d) => sum + d.amount, 0);

  // Savings
  const total_savings = savingsForDate.reduce(
    (sum, saving) => sum + saving.contribution_amount,
    0,
  );
  // Note: Savings payment modes might need to be added to the cooperative_savings table
  const total_savings_cash = total_savings; // Assuming all savings are cash unless specified
  const total_savings_fonepay = 0; // Would need to be calculated if payment modes are tracked
  const total_savings_esewa = 0; // Would need to be calculated if payment modes are tracked

  // Withdrawals
  const total_withdrawals = withdrawalsForDate.reduce(
    (sum, withdrawal) => sum + withdrawal.amount,
    0,
  );
  const total_withdrawals_cooperative = withdrawalsForDate
    .filter((w) => w.purpose.toLowerCase().includes("cooperative"))
    .reduce((sum, w) => sum + w.amount, 0);
  const total_withdrawals_bank = withdrawalsForDate
    .filter((w) => w.purpose.toLowerCase().includes("bank"))
    .reduce((sum, w) => sum + w.amount, 0);

  // Derived totals
  const total_income = total_income_from_orders + total_income_from_charging;
  const total_cash_income = total_income_cash;
  const total_fonepay_income = total_income_fonepay;
  const total_esewa_income = total_income_esewa;

  // Balance calculations as per the specification
  const cash_balance =
    total_cash_income -
    total_expenses_cash -
    total_savings_cash +
    withdrawalsCash -
    depositsToEsewa -
    depositsToFonepay;
  const esewa_balance =
    total_esewa_income -
    total_expenses_esewa -
    total_savings_esewa +
    depositsToEsewa;
  const fonepay_balance =
    total_fonepay_income -
    total_expenses_fonepay -
    total_savings_fonepay +
    depositsToFonepay;
  const cooperative_balance = total_savings - total_withdrawals_cooperative;
  const total_balance =
    cash_balance + fonepay_balance + cooperative_balance + esewa_balance;

  return {
    date,
    total_income_from_orders,
    total_income_from_charging,
    total_income_fonepay,
    total_income_esewa,
    total_income_cash,
    total_expenses,
    total_expenses_cash,
    total_expenses_esewa,
    total_expenses_fonepay,
    total_deposits,
    total_deposits_cash,
    total_deposits_esewa,
    total_savings,
    total_savings_cash,
    total_savings_fonepay,
    total_savings_esewa,
    total_withdrawals,
    total_withdrawals_cooperative,
    total_withdrawals_bank,
    total_income,
    total_cash_income,
    total_fonepay_income,
    total_esewa_income,
    cash_balance,
    esewa_balance,
    fonepay_balance,
    cooperative_balance,
    total_balance,
    deposits_to_esewa: depositsToEsewa,
    deposits_to_fonepay: depositsToFonepay,
    total_withdrawals_cash: withdrawalsCash,
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return `NRs. ${amount.toFixed(2)}`;
}

/**
 * Calculate percentage of total
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return (value / total) * 100;
}

/**
 * Get payment mode color for UI
 */
export function getPaymentModeColor(mode: string): string {
  const normalized = mode.toLowerCase();
  if (normalized.includes("esewa")) return "bg-green-500";
  if (normalized.includes("fonepay")) return "bg-blue-500";
  if (normalized.includes("cash")) return "bg-orange-500";
  if (normalized.includes("bank")) return "bg-purple-500";
  return "bg-gray-500";
}
