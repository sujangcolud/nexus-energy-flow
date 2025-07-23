// Database-Schema-Aware Financial Calculations Service
// This service handles calculations based on the actual database structure

export interface DatabaseTransactionData {
  // Orders
  orders: Array<{
    id: string;
    total: number;
    amount?: number; // Alternative field
    payment_mode: string;
    order_date: string;
    user_id: string;
  }>;

  // Charging Sessions  
  charging_sessions: Array<{
    id: string;
    total_amount: number;
    amount?: number; // Alternative field
    payment_mode: string;
    session_date: string;
    user_id: string;
  }>;

  // Expenses
  expenses: Array<{
    id: string;
    amount: number;
    payment_mode: string;
    expense_date: string;
    user_id: string;
    category: string;
  }>;

  // Deposits
  deposits: Array<{
    id: string;
    amount: number;
    mode: string; // Note: uses 'mode' not 'payment_mode'
    payment_mode?: string; // Alternative field
    deposited_to?: string;
    deposit_date: string;
    user_id: string;
  }>;

  // Withdrawals
  withdrawals: Array<{
    id: string;
    amount: number;
    payment_mode: string;
    withdrawal_from: 'Esewa' | 'Bank' | 'Cooperative';
    withdrawal_date: string;
    user_id: string;
    purpose: string;
  }>;

  // Cooperative Savings
  cooperative_savings: Array<{
    id: string;
    contribution_amount: number;
    payment_mode: string;
    savings_to: 'Bank' | 'Cooperative';
    contribution_date: string;
    user_id: string;
  }>;
}

export interface CalculatedFinancialSummary {
  // Income totals
  totalIncome: number;
  incomeFromOrders: number;
  incomeFromCharging: number;

  // Income by payment method
  incomeByPaymentMode: {
    cash: number;
    esewa: number;
    fonepay: number;
    bank: number;
  };

  // Expenses
  totalExpenses: number;
  expensesByPaymentMode: {
    cash: number;
    esewa: number;
    fonepay: number;
    bank: number;
  };

  // Deposits
  totalDeposits: number;
  depositsByDestination: {
    cash: number;
    esewa: number;
    fonepay: number;
    bank: number;
  };

  // Withdrawals
  totalWithdrawals: number;
  withdrawalsBySource: {
    fromEsewa: number;
    fromBank: number;
    fromCooperative: number;
  };
  withdrawalsByPaymentMode: {
    cash: number;
    esewa: number;
    fonepay: number;
  };

  // Savings
  totalSavings: number;
  savingsByDestination: {
    toBank: number;
    toCooperative: number;
  };
  savingsByPaymentMode: {
    cash: number;
    esewa: number;
    fonepay: number;
  };

  // Calculated balances based on database schema logic
  balances: {
    cash: number;
    esewa: number;
    fonepay: number;
    bank: number;
    cooperative: number;
    total: number;
  };

  // Summary metrics
  netProfit: number;
  netCashFlow: number;
  totalTransactions: number;
}

/**
 * Normalize payment mode strings based on database values
 */
export function normalizePaymentMode(mode: string): string {
  if (!mode) return 'cash';
  
  const lower = mode.toLowerCase().trim();
  
  if (lower.includes('esewa') || lower.includes('e-sewa')) return 'esewa';
  if (lower.includes('fonepay') || lower.includes('fone-pay')) return 'fonepay';
  if (lower.includes('cash') || lower.includes('money')) return 'cash';
  if (lower.includes('bank') || lower.includes('transfer') || lower.includes('cheque')) return 'bank';
  
  // Default to cash if unknown
  return 'cash';
}

/**
 * Process income transactions (orders + charging)
 */
export function calculateIncomeData(data: DatabaseTransactionData) {
  const processIncome = (transactions: any[], amountField: string) => {
    let total = 0;
    const byPaymentMode = { cash: 0, esewa: 0, fonepay: 0, bank: 0 };
    
    transactions.forEach(t => {
      const amount = Number(t[amountField]) || 0;
      const paymentMode = normalizePaymentMode(t.payment_mode);
      
      total += amount;
      byPaymentMode[paymentMode] += amount;
    });
    
    return { total, byPaymentMode };
  };

  const orders = processIncome(data.orders, 'total');
  const charging = processIncome(data.charging_sessions, 'total_amount');

  return {
    totalIncome: orders.total + charging.total,
    incomeFromOrders: orders.total,
    incomeFromCharging: charging.total,
    incomeByPaymentMode: {
      cash: orders.byPaymentMode.cash + charging.byPaymentMode.cash,
      esewa: orders.byPaymentMode.esewa + charging.byPaymentMode.esewa,
      fonepay: orders.byPaymentMode.fonepay + charging.byPaymentMode.fonepay,
      bank: orders.byPaymentMode.bank + charging.byPaymentMode.bank,
    }
  };
}

/**
 * Process expenses with payment mode breakdown
 */
export function calculateExpenseData(data: DatabaseTransactionData) {
  let totalExpenses = 0;
  const expensesByPaymentMode = { cash: 0, esewa: 0, fonepay: 0, bank: 0 };

  data.expenses.forEach(expense => {
    const amount = Number(expense.amount) || 0;
    const paymentMode = normalizePaymentMode(expense.payment_mode);
    
    totalExpenses += amount;
    expensesByPaymentMode[paymentMode] += amount;
  });

  return { totalExpenses, expensesByPaymentMode };
}

/**
 * Process deposits with destination tracking
 */
export function calculateDepositData(data: DatabaseTransactionData) {
  let totalDeposits = 0;
  const depositsByDestination = { cash: 0, esewa: 0, fonepay: 0, bank: 0 };

  data.deposits.forEach(deposit => {
    const amount = Number(deposit.amount) || 0;
    // Use 'mode' field first, then 'payment_mode' as fallback
    const paymentMode = normalizePaymentMode(deposit.mode || deposit.payment_mode || '');
    
    totalDeposits += amount;
    
    // Map deposits to destination based on deposited_to or payment mode
    if (deposit.deposited_to) {
      const destination = normalizePaymentMode(deposit.deposited_to);
      depositsByDestination[destination] += amount;
    } else {
      // Default to payment mode if no specific destination
      depositsByDestination[paymentMode] += amount;
    }
  });

  return { totalDeposits, depositsByDestination };
}

/**
 * Process withdrawals with source and payment mode tracking
 */
export function calculateWithdrawalData(data: DatabaseTransactionData) {
  let totalWithdrawals = 0;
  const withdrawalsBySource = { fromEsewa: 0, fromBank: 0, fromCooperative: 0 };
  const withdrawalsByPaymentMode = { cash: 0, esewa: 0, fonepay: 0 };

  data.withdrawals.forEach(withdrawal => {
    const amount = Number(withdrawal.amount) || 0;
    const paymentMode = normalizePaymentMode(withdrawal.payment_mode);
    const source = withdrawal.withdrawal_from;
    
    totalWithdrawals += amount;
    withdrawalsByPaymentMode[paymentMode] += amount;
    
    // Track by source
    switch (source) {
      case 'Esewa':
        withdrawalsBySource.fromEsewa += amount;
        break;
      case 'Bank':
        withdrawalsBySource.fromBank += amount;
        break;
      case 'Cooperative':
      default:
        withdrawalsBySource.fromCooperative += amount;
        break;
    }
  });

  return { totalWithdrawals, withdrawalsBySource, withdrawalsByPaymentMode };
}

/**
 * Process savings with destination tracking
 */
export function calculateSavingsData(data: DatabaseTransactionData) {
  let totalSavings = 0;
  const savingsByDestination = { toBank: 0, toCooperative: 0 };
  const savingsByPaymentMode = { cash: 0, esewa: 0, fonepay: 0 };

  data.cooperative_savings.forEach(saving => {
    const amount = Number(saving.contribution_amount) || 0;
    const paymentMode = normalizePaymentMode(saving.payment_mode);
    const destination = saving.savings_to;
    
    totalSavings += amount;
    savingsByPaymentMode[paymentMode] += amount;
    
    // Track by destination
    switch (destination) {
      case 'Bank':
        savingsByDestination.toBank += amount;
        break;
      case 'Cooperative':
      default:
        savingsByDestination.toCooperative += amount;
        break;
    }
  });

  return { totalSavings, savingsByDestination, savingsByPaymentMode };
}

/**
 * Calculate accurate balances based on database schema
 */
export function calculateAccurateBalances(
  income: ReturnType<typeof calculateIncomeData>,
  expenses: ReturnType<typeof calculateExpenseData>,
  deposits: ReturnType<typeof calculateDepositData>,
  withdrawals: ReturnType<typeof calculateWithdrawalData>,
  savings: ReturnType<typeof calculateSavingsData>
) {
  // Cash Balance = Cash Income + Cash Withdrawals - Cash Expenses - Cash Savings - Cash Deposits
  const cashBalance = 
    income.incomeByPaymentMode.cash +
    withdrawals.withdrawalsByPaymentMode.cash -
    expenses.expensesByPaymentMode.cash -
    savings.savingsByPaymentMode.cash -
    deposits.depositsByDestination.cash;

  // eSewa Balance = eSewa Income + Deposits to eSewa - eSewa Expenses - eSewa Savings - Withdrawals from eSewa
  const esewaBalance = 
    income.incomeByPaymentMode.esewa +
    deposits.depositsByDestination.esewa -
    expenses.expensesByPaymentMode.esewa -
    savings.savingsByPaymentMode.esewa -
    withdrawals.withdrawalsBySource.fromEsewa;

  // Fonepay/Bank Balance = Fonepay Income + Bank Income + Bank Deposits - Fonepay Expenses - Bank Expenses - Bank Withdrawals
  const fonepayBalance = 
    income.incomeByPaymentMode.fonepay +
    income.incomeByPaymentMode.bank +
    deposits.depositsByDestination.fonepay +
    deposits.depositsByDestination.bank -
    expenses.expensesByPaymentMode.fonepay -
    expenses.expensesByPaymentMode.bank -
    withdrawals.withdrawalsBySource.fromBank;

  // Cooperative Balance = Savings to Cooperative - Withdrawals from Cooperative
  const cooperativeBalance = 
    savings.savingsByDestination.toCooperative -
    withdrawals.withdrawalsBySource.fromCooperative;

  // Bank Balance (separate from Fonepay) = Savings to Bank
  const bankBalance = savings.savingsByDestination.toBank;

  const totalBalance = cashBalance + esewaBalance + fonepayBalance + cooperativeBalance + bankBalance;

  return {
    cash: Math.round(cashBalance * 100) / 100,
    esewa: Math.round(esewaBalance * 100) / 100,
    fonepay: Math.round(fonepayBalance * 100) / 100,
    bank: Math.round(bankBalance * 100) / 100,
    cooperative: Math.round(cooperativeBalance * 100) / 100,
    total: Math.round(totalBalance * 100) / 100,
  };
}

/**
 * Main calculation function that processes all data
 */
export function calculateDatabaseFinancialSummary(data: DatabaseTransactionData): CalculatedFinancialSummary {
  const income = calculateIncomeData(data);
  const expenses = calculateExpenseData(data);
  const deposits = calculateDepositData(data);
  const withdrawals = calculateWithdrawalData(data);
  const savings = calculateSavingsData(data);
  const balances = calculateAccurateBalances(income, expenses, deposits, withdrawals, savings);

  const netProfit = income.totalIncome - expenses.totalExpenses;
  const netCashFlow = income.totalIncome + deposits.totalDeposits - expenses.totalExpenses - withdrawals.totalWithdrawals;
  
  const totalTransactions = 
    data.orders.length +
    data.charging_sessions.length +
    data.expenses.length +
    data.deposits.length +
    data.withdrawals.length +
    data.cooperative_savings.length;

  return {
    // Income
    totalIncome: income.totalIncome,
    incomeFromOrders: income.incomeFromOrders,
    incomeFromCharging: income.incomeFromCharging,
    incomeByPaymentMode: income.incomeByPaymentMode,

    // Expenses
    totalExpenses: expenses.totalExpenses,
    expensesByPaymentMode: expenses.expensesByPaymentMode,

    // Deposits
    totalDeposits: deposits.totalDeposits,
    depositsByDestination: deposits.depositsByDestination,

    // Withdrawals
    totalWithdrawals: withdrawals.totalWithdrawals,
    withdrawalsBySource: withdrawals.withdrawalsBySource,
    withdrawalsByPaymentMode: withdrawals.withdrawalsByPaymentMode,

    // Savings
    totalSavings: savings.totalSavings,
    savingsByDestination: savings.savingsByDestination,
    savingsByPaymentMode: savings.savingsByPaymentMode,

    // Balances
    balances,

    // Summary
    netProfit,
    netCashFlow,
    totalTransactions,
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency: string = "NRs."): string {
  return `${currency} ${Math.abs(amount).toFixed(2)}`;
}

/**
 * Validate calculation accuracy
 */
export function validateDatabaseCalculations(summary: CalculatedFinancialSummary): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check income breakdown
  const expectedIncomeTotal = summary.incomeFromOrders + summary.incomeFromCharging;
  if (Math.abs(expectedIncomeTotal - summary.totalIncome) > 0.01) {
    errors.push(`Income breakdown mismatch: Expected ${expectedIncomeTotal}, got ${summary.totalIncome}`);
  }
  
  // Check payment mode totals
  const incomePaymentTotal = Object.values(summary.incomeByPaymentMode).reduce((a, b) => a + b, 0);
  if (Math.abs(incomePaymentTotal - summary.totalIncome) > 0.01) {
    errors.push(`Income payment mode breakdown doesn't match total: Expected ${summary.totalIncome}, got ${incomePaymentTotal}`);
  }
  
  // Check withdrawal sources
  const withdrawalSourceTotal = Object.values(summary.withdrawalsBySource).reduce((a, b) => a + b, 0);
  if (Math.abs(withdrawalSourceTotal - summary.totalWithdrawals) > 0.01) {
    errors.push(`Withdrawal source breakdown doesn't match total: Expected ${summary.totalWithdrawals}, got ${withdrawalSourceTotal}`);
  }
  
  // Check savings destinations
  const savingsDestinationTotal = Object.values(summary.savingsByDestination).reduce((a, b) => a + b, 0);
  if (Math.abs(savingsDestinationTotal - summary.totalSavings) > 0.01) {
    errors.push(`Savings destination breakdown doesn't match total: Expected ${summary.totalSavings}, got ${savingsDestinationTotal}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Debug function to log calculation details
 */
export function debugCalculations(summary: CalculatedFinancialSummary) {
  console.log('📊 Database Financial Summary Debug:');
  console.log('Income:', summary.totalIncome, summary.incomeByPaymentMode);
  console.log('Expenses:', summary.totalExpenses, summary.expensesByPaymentMode);
  console.log('Deposits:', summary.totalDeposits, summary.depositsByDestination);
  console.log('Withdrawals:', summary.totalWithdrawals, summary.withdrawalsBySource);
  console.log('Savings:', summary.totalSavings, summary.savingsByDestination);
  console.log('Balances:', summary.balances);
  console.log('Validation:', validateDatabaseCalculations(summary));
}
