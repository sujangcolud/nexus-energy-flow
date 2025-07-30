// Unified Financial Calculations Service
// This service provides consistent calculation logic across all components

export interface TransactionData {
  count: number;
  total: number;
  by_payment: Record<string, { count: number; total: number }>;
}

export interface FinancialData {
  orders: TransactionData;
  charging: TransactionData;
  expenses: TransactionData;
  deposits: TransactionData;
  withdrawals: TransactionData;
  cooperative_savings: TransactionData;
}

export interface BalanceBreakdown {
  cash: number;
  esewa: number;
  fonepay: number;
  cooperative: number;
  total: number;
}

export interface PaymentModeBreakdown {
  cash: number;
  esewa: number;
  fonepay: number;
  bank: number;
  total: number;
}

export interface IncomeBreakdown {
  fromOrders: number;
  fromCharging: number;
  total: number;
}

export interface WithdrawalBreakdown {
  fromBank: number;
  fromSavings: number;
  fromEsewa: number;
  fromFonepay: number;
  fromCash: number;
  total: number;
}

/**
 * Normalize payment mode strings for consistent handling
 */
export function normalizePaymentMode(mode: string): string {
  const lower = mode.toLowerCase().trim();
  
  if (lower.includes("esewa") || lower.includes("e-sewa")) return "esewa";
  if (lower.includes("fonepay") || lower.includes("fone-pay")) return "fonepay";
  if (lower.includes("cash") || lower.includes("money")) return "cash";
  if (lower.includes("bank") || lower.includes("transfer")) return "bank";
  if (lower.includes("cheque") || lower.includes("check")) return "bank";
  
  return lower;
}

/**
 * Process transactions and group by payment mode
 */
export function processTransactions(
  transactions: any[],
  amountField: string,
  paymentField: string,
): TransactionData {
  const count = transactions.length;
  const total = transactions.reduce(
    (sum, t) => sum + (Number(t[amountField]) || 0),
    0,
  );
  const by_payment: Record<string, { count: number; total: number }> = {};

  transactions.forEach((t) => {
    const payment = t[paymentField] || "unknown";
    const normalizedPayment = normalizePaymentMode(payment);
    
    if (!by_payment[normalizedPayment]) {
      by_payment[normalizedPayment] = { count: 0, total: 0 };
    }
    by_payment[normalizedPayment].count++;
    by_payment[normalizedPayment].total += Number(t[amountField]) || 0;
  });

  return { count, total, by_payment };
}

/**
 * Calculate income breakdown from orders and charging
 */
export function calculateIncomeBreakdown(
  orders: TransactionData,
  charging: TransactionData,
): IncomeBreakdown {
  return {
    fromOrders: orders.total,
    fromCharging: charging.total,
    total: orders.total + charging.total,
  };
}

/**
 * Calculate payment mode breakdown for income
 */
export function calculatePaymentModeBreakdown(
  orders: TransactionData,
  charging: TransactionData,
): PaymentModeBreakdown {
  const cash = (orders.by_payment.cash?.total || 0) + (charging.by_payment.cash?.total || 0);
  const esewa = (orders.by_payment.esewa?.total || 0) + (charging.by_payment.esewa?.total || 0);
  const fonepay = (orders.by_payment.fonepay?.total || 0) + (charging.by_payment.fonepay?.total || 0);
  const bank = (orders.by_payment.bank?.total || 0) + (charging.by_payment.bank?.total || 0);
  
  return {
    cash,
    esewa,
    fonepay,
    bank,
    total: cash + esewa + fonepay + bank,
  };
}

/**
 * Calculate withdrawal breakdown by source/method
 */
export function calculateWithdrawalBreakdown(
  withdrawals: TransactionData,
  withdrawalDetails: any[] = [], // Raw withdrawal data for source analysis
): WithdrawalBreakdown {
  // If withdrawal details available, analyze by source
  const fromBank = withdrawalDetails
    .filter(w => w.withdrawal_from?.toLowerCase().includes('bank') || w.purpose?.toLowerCase().includes('bank'))
    .reduce((sum, w) => sum + (Number(w.amount) || 0), 0);
    
  const fromSavings = withdrawalDetails
    .filter(w => w.withdrawal_from?.toLowerCase().includes('cooperative') || w.purpose?.toLowerCase().includes('cooperative'))
    .reduce((sum, w) => sum + (Number(w.amount) || 0), 0);
    
  const fromEsewa = withdrawals.by_payment.esewa?.total || 0;
  const fromFonepay = withdrawals.by_payment.fonepay?.total || 0;
  const fromCash = withdrawals.by_payment.cash?.total || 0;

  return {
    fromBank: fromBank || (withdrawals.by_payment.bank?.total || 0),
    fromSavings: fromSavings || (withdrawals.total - fromBank - fromEsewa - fromFonepay - fromCash),
    fromEsewa,
    fromFonepay,
    fromCash,
    total: withdrawals.total,
  };
}

/**
 * Calculate current balances using standardized formulas
 */
export function calculateBalances(
  data: FinancialData,
  paymentBreakdown: PaymentModeBreakdown,
): BalanceBreakdown {
  // Get payment mode totals for expenses
  const cashExpenses = data.expenses.by_payment.cash?.total || 0;
  const esewaExpenses = data.expenses.by_payment.esewa?.total || 0;
  const fonepayExpenses = data.expenses.by_payment.fonepay?.total || 0;
  const bankExpenses = data.expenses.by_payment.bank?.total || 0;

  // Get payment mode totals for deposits
  const cashDeposits = data.deposits.by_payment.cash?.total || 0;
  const esewaDeposits = data.deposits.by_payment.esewa?.total || 0;
  const fonepayDeposits = data.deposits.by_payment.fonepay?.total || 0;
  const bankDeposits = data.deposits.by_payment.bank?.total || 0;

  // Get payment mode totals for savings (assume cash if not specified)
  const cashSavings = data.cooperative_savings.by_payment.cash?.total || 
                     (data.cooperative_savings.total - 
                      (data.cooperative_savings.by_payment.esewa?.total || 0) - 
                      (data.cooperative_savings.by_payment.fonepay?.total || 0) - 
                      (data.cooperative_savings.by_payment.bank?.total || 0));
  const esewaSavings = data.cooperative_savings.by_payment.esewa?.total || 0;
  const fonepaySavings = data.cooperative_savings.by_payment.fonepay?.total || 0;

  // Get withdrawal totals by payment method
  const cashWithdrawals = data.withdrawals.by_payment.cash?.total || 0;
  const esewaWithdrawals = data.withdrawals.by_payment.esewa?.total || 0;
  const fonepayWithdrawals = data.withdrawals.by_payment.fonepay?.total || 0;

  // Calculate balances using standardized formulas
  const cash = paymentBreakdown.cash - cashExpenses - cashSavings - cashDeposits + cashWithdrawals;
  const esewa = paymentBreakdown.esewa - esewaExpenses - esewaSavings + esewaDeposits - esewaWithdrawals;
  const fonepay = paymentBreakdown.fonepay + paymentBreakdown.bank - fonepayExpenses - fonepaySavings + fonepayDeposits + bankDeposits - fonepayWithdrawals;
  const cooperative = data.cooperative_savings.total - data.withdrawals.total;

  return {
    cash: Math.round(cash * 100) / 100, // Round to 2 decimal places
    esewa: Math.round(esewa * 100) / 100,
    fonepay: Math.round(fonepay * 100) / 100,
    cooperative: Math.round(cooperative * 100) / 100,
    total: Math.round((cash + esewa + fonepay + cooperative) * 100) / 100,
  };
}

/**
 * Calculate comprehensive financial summary
 */
export function calculateFinancialSummary(data: FinancialData) {
  const incomeBreakdown = calculateIncomeBreakdown(data.orders, data.charging);
  const paymentModeBreakdown = calculatePaymentModeBreakdown(data.orders, data.charging);
  const balances = calculateBalances(data, paymentModeBreakdown);
  const withdrawalBreakdown = calculateWithdrawalBreakdown(data.withdrawals);

  const netProfit = incomeBreakdown.total - data.expenses.total;
  const netCashFlow = incomeBreakdown.total + data.deposits.total - data.expenses.total - data.withdrawals.total;

  return {
    income: incomeBreakdown,
    expenses: {
      total: data.expenses.total,
      byPayment: {
        cash: data.expenses.by_payment.cash?.total || 0,
        esewa: data.expenses.by_payment.esewa?.total || 0,
        fonepay: data.expenses.by_payment.fonepay?.total || 0,
        bank: data.expenses.by_payment.bank?.total || 0,
      },
    },
    deposits: {
      total: data.deposits.total,
      byPayment: {
        cash: data.deposits.by_payment.cash?.total || 0,
        esewa: data.deposits.by_payment.esewa?.total || 0,
        fonepay: data.deposits.by_payment.fonepay?.total || 0,
        bank: data.deposits.by_payment.bank?.total || 0,
      },
    },
    withdrawals: withdrawalBreakdown,
    savings: {
      total: data.cooperative_savings.total,
      byPayment: {
        cash: data.cooperative_savings.by_payment.cash?.total || 0,
        esewa: data.cooperative_savings.by_payment.esewa?.total || 0,
        fonepay: data.cooperative_savings.by_payment.fonepay?.total || 0,
        bank: data.cooperative_savings.by_payment.bank?.total || 0,
      },
    },
    paymentModes: paymentModeBreakdown,
    balances,
    netProfit,
    netCashFlow,
    totalTransactions: data.orders.count + data.charging.count + data.expenses.count + 
                      data.deposits.count + data.withdrawals.count + data.cooperative_savings.count,
  };
}

/**
 * Format currency for consistent display
 */
export function formatCurrency(amount: number, currency: string = "NRs."): string {
  return `${currency} ${Math.abs(amount).toFixed(2)}`;
}

/**
 * Calculate percentage of total
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100 * 100) / 100; // Round to 2 decimal places
}

/**
 * Get payment mode color for UI consistency
 */
export function getPaymentModeColor(mode: string): string {
  const normalized = normalizePaymentMode(mode);
  
  switch (normalized) {
    case "esewa": return "bg-green-500";
    case "fonepay": return "bg-blue-500";
    case "cash": return "bg-orange-500";
    case "bank": return "bg-purple-500";
    default: return "bg-gray-500";
  }
}

/**
 * Validate calculation results for accuracy
 */
export function validateCalculations(summary: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check for negative balances where they shouldn't occur
  if (summary.balances.cooperative < 0) {
    errors.push("Cooperative balance is negative - check withdrawal calculations");
  }
  
  // Check if income breakdown matches total
  const expectedTotal = summary.income.fromOrders + summary.income.fromCharging;
  if (Math.abs(expectedTotal - summary.income.total) > 0.01) {
    errors.push("Income breakdown doesn't match total income");
  }
  
  // Check if payment mode totals match income total
  const paymentTotal = summary.paymentModes.cash + summary.paymentModes.esewa + 
                      summary.paymentModes.fonepay + summary.paymentModes.bank;
  if (Math.abs(paymentTotal - summary.income.total) > 0.01) {
    errors.push("Payment mode breakdown doesn't match total income");
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}
