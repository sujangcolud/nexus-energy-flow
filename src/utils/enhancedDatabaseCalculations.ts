// Enhanced Database Calculations - Handles Missing Payment Mode Data
// This service fixes the historical calculation issues identified

export interface EnhancedDatabaseTransactionData {
  orders: Array<{
    id: string;
    total: number;
    payment_mode: string;
    order_date: string;
    user_id: string;
  }>;

  charging_sessions: Array<{
    id: string;
    total_amount: number;
    payment_mode: string;
    session_date: string;
    user_id: string;
  }>;

  expenses: Array<{
    id: string;
    amount: number;
    payment_mode: string;
    expense_date: string;
    user_id: string;
  }>;

  deposits: Array<{
    id: string;
    amount: number;
    mode: string;
    payment_mode?: string;
    deposited_to?: string;
    deposit_date: string;
    user_id: string;
  }>;

  withdrawals: Array<{
    id: string;
    amount: number;
    payment_mode: string;
    withdrawal_from: 'Esewa' | 'Bank' | 'Cooperative';
    withdrawal_date: string;
    user_id: string;
  }>;

  cooperative_savings: Array<{
    id: string;
    contribution_amount: number;
    payment_mode: string;
    savings_to: 'Bank' | 'Cooperative';
    contribution_date: string;
    user_id: string;
  }>;
}

export interface EnhancedFinancialSummary {
  // Income
  totalIncome: number;
  incomeFromOrders: number;
  incomeFromCharging: number;
  incomeByPaymentMode: {
    cash: number;
    esewa: number;
    fonepay: number;
  };

  // Expenses with proper payment mode breakdown
  totalExpenses: number;
  expensesByPaymentMode: {
    cash: number;
    esewa: number;
    fonepay: number;
  };

  // Deposits
  totalDeposits: number;
  depositsByDestination: {
    cash: number;
    esewa: number;
    fonepay: number;
  };

  // Enhanced withdrawals with payment mode tracking
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

  // Enhanced balances
  balances: {
    cash: number;
    esewa: number;
    fonepay: number;
    cooperative: number;
    total: number;
  };

  // Additional fields for daily_summary table compatibility
  dailySummaryData: {
    total_income_from_orders: number;
    total_income_from_charging: number;
    total_income_cash: number;
    total_income_esewa: number;
    total_income_fonepay: number;
    total_expenses: number;
    total_expenses_cash: number;
    total_expenses_esewa: number;
    total_expenses_fonepay: number;
    total_deposits: number;
    total_deposits_cash: number;
    total_deposits_esewa: number;
    total_savings: number;
    total_savings_cash: number;
    total_savings_esewa: number;
    total_savings_fonepay: number;
    total_withdrawals: number;
    total_withdrawals_cooperative: number;
    total_withdrawals_bank: number;
    total_withdrawals_cash: number;
    total_withdrawals_esewa: number;
    total_withdrawals_fonepay: number;
    total_income: number;
    total_cash_income: number;
    total_esewa_income: number;
    total_fonepay_income: number;
    cash_balance: number;
    esewa_balance: number;
    fonepay_balance: number;
    cooperative_balance: number;
    total_balance: number;
  };

  netProfit: number;
  totalTransactions: number;
}

/**
 * Enhanced payment mode normalization that handles edge cases
 */
export function enhancedNormalizePaymentMode(mode: string): 'cash' | 'esewa' | 'fonepay' {
  if (!mode) return 'cash';
  
  const lower = mode.toLowerCase().trim();
  
  if (lower.includes('esewa') || lower.includes('e-sewa') || lower.includes('e_sewa')) {
    return 'esewa';
  }
  
  if (lower.includes('fonepay') || lower.includes('fone-pay') || lower.includes('fone_pay') || 
      lower.includes('bank') || lower.includes('transfer')) {
    return 'fonepay';
  }
  
  // Default to cash for anything else (including 'cash', 'money', unknown, etc.)
  return 'cash';
}

/**
 * Enhanced date parsing that handles various date formats
 */
export function enhancedDateParsing(dateString: string): string {
  try {
    // Handle various date formats that might exist in the database
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date format: ${dateString}`);
      return new Date().toISOString().split('T')[0]; // Fallback to today
    }
    
    // Return in YYYY-MM-DD format
    return date.toISOString().split('T')[0];
  } catch (error) {
    console.error(`Date parsing error for ${dateString}:`, error);
    return new Date().toISOString().split('T')[0]; // Fallback to today
  }
}

/**
 * Process expense data with proper payment mode breakdown
 * This fixes the historical issue where expense payment modes weren't calculated
 */
export function calculateEnhancedExpenseData(expenses: EnhancedDatabaseTransactionData['expenses']) {
  let totalExpenses = 0;
  const expensesByPaymentMode = { cash: 0, esewa: 0, fonepay: 0 };

  expenses.forEach(expense => {
    const amount = Number(expense.amount) || 0;
    const paymentMode = enhancedNormalizePaymentMode(expense.payment_mode);
    
    totalExpenses += amount;
    expensesByPaymentMode[paymentMode] += amount;
  });

  console.log(`📊 Expenses breakdown:`, {
    total: totalExpenses,
    byPaymentMode: expensesByPaymentMode,
    rawData: expenses.length
  });

  return { totalExpenses, expensesByPaymentMode };
}

/**
 * Enhanced withdrawal calculation that handles missing payment mode data
 */
export function calculateEnhancedWithdrawalData(withdrawals: EnhancedDatabaseTransactionData['withdrawals']) {
  let totalWithdrawals = 0;
  const withdrawalsBySource = { fromEsewa: 0, fromBank: 0, fromCooperative: 0 };
  const withdrawalsByPaymentMode = { cash: 0, esewa: 0, fonepay: 0 };

  withdrawals.forEach(withdrawal => {
    const amount = Number(withdrawal.amount) || 0;
    const paymentMode = enhancedNormalizePaymentMode(withdrawal.payment_mode);
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

  console.log(`📊 Withdrawals breakdown:`, {
    total: totalWithdrawals,
    bySource: withdrawalsBySource,
    byPaymentMode: withdrawalsByPaymentMode,
    rawData: withdrawals.length
  });

  return { totalWithdrawals, withdrawalsBySource, withdrawalsByPaymentMode };
}

/**
 * Calculate income data with enhanced payment mode tracking
 */
export function calculateEnhancedIncomeData(data: EnhancedDatabaseTransactionData) {
  const processIncomeWithLog = (transactions: any[], amountField: string, type: string) => {
    let total = 0;
    const byPaymentMode = { cash: 0, esewa: 0, fonepay: 0 };
    
    transactions.forEach(t => {
      const amount = Number(t[amountField]) || 0;
      const paymentMode = enhancedNormalizePaymentMode(t.payment_mode);
      
      total += amount;
      byPaymentMode[paymentMode] += amount;
    });
    
    console.log(`📊 ${type} income breakdown:`, {
      total,
      byPaymentMode,
      rawData: transactions.length
    });
    
    return { total, byPaymentMode };
  };

  const orders = processIncomeWithLog(data.orders, 'total', 'Orders');
  const charging = processIncomeWithLog(data.charging_sessions, 'total_amount', 'Charging');

  return {
    totalIncome: orders.total + charging.total,
    incomeFromOrders: orders.total,
    incomeFromCharging: charging.total,
    incomeByPaymentMode: {
      cash: orders.byPaymentMode.cash + charging.byPaymentMode.cash,
      esewa: orders.byPaymentMode.esewa + charging.byPaymentMode.esewa,
      fonepay: orders.byPaymentMode.fonepay + charging.byPaymentMode.fonepay,
    }
  };
}

/**
 * Calculate deposits with enhanced destination tracking
 */
export function calculateEnhancedDepositData(deposits: EnhancedDatabaseTransactionData['deposits']) {
  let totalDeposits = 0;
  const depositsByDestination = { cash: 0, esewa: 0, fonepay: 0 };

  deposits.forEach(deposit => {
    const amount = Number(deposit.amount) || 0;
    // Use deposited_to first, then mode, then payment_mode
    const destination = enhancedNormalizePaymentMode(
      deposit.deposited_to || deposit.mode || deposit.payment_mode || 'cash'
    );
    
    totalDeposits += amount;
    depositsByDestination[destination] += amount;
  });

  console.log(`📊 Deposits breakdown:`, {
    total: totalDeposits,
    byDestination: depositsByDestination,
    rawData: deposits.length
  });

  return { totalDeposits, depositsByDestination };
}

/**
 * Calculate savings with enhanced tracking
 */
export function calculateEnhancedSavingsData(savings: EnhancedDatabaseTransactionData['cooperative_savings']) {
  let totalSavings = 0;
  const savingsByDestination = { toBank: 0, toCooperative: 0 };
  const savingsByPaymentMode = { cash: 0, esewa: 0, fonepay: 0 };

  savings.forEach(saving => {
    const amount = Number(saving.contribution_amount) || 0;
    const paymentMode = enhancedNormalizePaymentMode(saving.payment_mode || 'cash');
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

  console.log(`📊 Savings breakdown:`, {
    total: totalSavings,
    byDestination: savingsByDestination,
    byPaymentMode: savingsByPaymentMode,
    rawData: savings.length
  });

  return { totalSavings, savingsByDestination, savingsByPaymentMode };
}

/**
 * Enhanced balance calculation with detailed logging
 */
export function calculateEnhancedBalances(
  income: ReturnType<typeof calculateEnhancedIncomeData>,
  expenses: ReturnType<typeof calculateEnhancedExpenseData>,
  deposits: ReturnType<typeof calculateEnhancedDepositData>,
  withdrawals: ReturnType<typeof calculateEnhancedWithdrawalData>,
  savings: ReturnType<typeof calculateEnhancedSavingsData>
) {
  // Balances based on user-provided logic
  // cash_balance = total_cash_income - total_expenses_cash - total_savings_cash + total_withdrawals_cash - deposits_to_esewa - deposits_to_fonepay
  const cashBalance =
    income.incomeByPaymentMode.cash -
    expenses.expensesByPaymentMode.cash -
    savings.savingsByPaymentMode.cash +
    withdrawals.withdrawalsByPaymentMode.cash -
    deposits.depositsByDestination.esewa -
    deposits.depositsByDestination.fonepay;

  // esewa_balance = total_income_esewa - total_expenses_esewa - total_savings_esewa + deposits_to_esewa - total_deposits_from_esewa
  const esewaBalance =
    income.incomeByPaymentMode.esewa -
    expenses.expensesByPaymentMode.esewa -
    savings.savingsByPaymentMode.esewa +
    deposits.depositsByDestination.esewa -
    withdrawals.withdrawalsBySource.fromEsewa;

  // fonepay_balance = total_income_fonepay - total_expenses_fonepay - total_savings_fonepay + deposits_to_fonepay - total_withdrawal_bank
  const fonepayBalance =
    income.incomeByPaymentMode.fonepay -
    expenses.expensesByPaymentMode.fonepay -
    savings.savingsByPaymentMode.fonepay +
    deposits.depositsByDestination.fonepay -
    withdrawals.withdrawalsBySource.fromBank;

  // cooperative_balance = total_savings - total_withdrawals_cooperative
  const cooperativeBalance =
    savings.totalSavings -
    withdrawals.withdrawalsBySource.fromCooperative;

  // total_balance = cash_balance + fonepay_balance + cooperative_balance + esewa_balance
  const totalBalance = cashBalance + fonepayBalance + cooperativeBalance + esewaBalance;

  console.log(`📊 Enhanced balance calculation (user logic):`, {
    cash: cashBalance,
    esewa: esewaBalance,
    fonepay: fonepayBalance,
    cooperative: cooperativeBalance,
    total: totalBalance,
    inputs: {
      income: income.incomeByPaymentMode,
      expenses: expenses.expensesByPaymentMode,
      deposits: deposits.depositsByDestination,
      withdrawals: withdrawals,
      savings: savings,
    }
  });

  return {
    cash: Math.round(cashBalance * 100) / 100,
    esewa: Math.round(esewaBalance * 100) / 100,
    fonepay: Math.round(fonepayBalance * 100) / 100,
    cooperative: Math.round(cooperativeBalance * 100) / 100,
    total: Math.round(totalBalance * 100) / 100,
  };
}

/**
 * Main enhanced calculation function
 */
export function calculateEnhancedFinancialSummary(
  data: EnhancedDatabaseTransactionData,
  targetDate?: string
): EnhancedFinancialSummary {
  console.log(`🔍 Calculating enhanced financial summary for ${targetDate || 'all-time'}:`, {
    orders: data.orders.length,
    charging: data.charging_sessions.length,
    expenses: data.expenses.length,
    deposits: data.deposits.length,
    withdrawals: data.withdrawals.length,
    savings: data.cooperative_savings.length
  });

  const income = calculateEnhancedIncomeData(data);
  const expenses = calculateEnhancedExpenseData(data.expenses);
  const deposits = calculateEnhancedDepositData(data.deposits);
  const withdrawals = calculateEnhancedWithdrawalData(data.withdrawals);
  const savings = calculateEnhancedSavingsData(data.cooperative_savings);
  const balances = calculateEnhancedBalances(income, expenses, deposits, withdrawals, savings);

  const netProfit = income.totalIncome - expenses.totalExpenses;
  const totalTransactions = 
    data.orders.length +
    data.charging_sessions.length +
    data.expenses.length +
    data.deposits.length +
    data.withdrawals.length +
    data.cooperative_savings.length;

  // Create daily_summary table compatible data
  const dailySummaryData = {
    total_income_from_orders: income.incomeFromOrders,
    total_income_from_charging: income.incomeFromCharging,
    total_income_cash: income.incomeByPaymentMode.cash,
    total_income_esewa: income.incomeByPaymentMode.esewa,
    total_income_fonepay: income.incomeByPaymentMode.fonepay,
    total_expenses: expenses.totalExpenses,
    total_expenses_cash: expenses.expensesByPaymentMode.cash,
    total_expenses_esewa: expenses.expensesByPaymentMode.esewa,
    total_expenses_fonepay: expenses.expensesByPaymentMode.fonepay,
    total_deposits: deposits.totalDeposits,
    total_deposits_cash: deposits.depositsByDestination.cash,
    total_deposits_esewa: deposits.depositsByDestination.esewa,
    total_savings: savings.totalSavings,
    total_savings_cash: savings.savingsByPaymentMode.cash,
    total_savings_esewa: savings.savingsByPaymentMode.esewa,
    total_savings_fonepay: savings.savingsByPaymentMode.fonepay,
    total_withdrawals: withdrawals.totalWithdrawals,
    total_withdrawals_cooperative: withdrawals.withdrawalsBySource.fromCooperative,
    total_withdrawals_bank: withdrawals.withdrawalsBySource.fromBank,
    total_withdrawals_cash: withdrawals.withdrawalsByPaymentMode.cash,
    total_withdrawals_esewa: withdrawals.withdrawalsBySource.fromEsewa,
    total_withdrawals_fonepay: withdrawals.withdrawalsByPaymentMode.fonepay,
    total_income: income.totalIncome,
    total_cash_income: income.incomeByPaymentMode.cash,
    total_esewa_income: income.incomeByPaymentMode.esewa,
    total_fonepay_income: income.incomeByPaymentMode.fonepay,
    cash_balance: balances.cash,
    esewa_balance: balances.esewa,
    fonepay_balance: balances.fonepay,
    cooperative_balance: balances.cooperative,
    total_balance: balances.total,
  };

  console.log(`✅ Enhanced calculation complete:`, {
    netProfit,
    totalTransactions,
    balanceValidation: {
      totalIncome: income.totalIncome,
      totalExpenses: expenses.totalExpenses,
      totalBalance: balances.total
    }
  });

  return {
    totalIncome: income.totalIncome,
    incomeFromOrders: income.incomeFromOrders,
    incomeFromCharging: income.incomeFromCharging,
    incomeByPaymentMode: income.incomeByPaymentMode,
    totalExpenses: expenses.totalExpenses,
    expensesByPaymentMode: expenses.expensesByPaymentMode,
    totalDeposits: deposits.totalDeposits,
    depositsByDestination: deposits.depositsByDestination,
    totalWithdrawals: withdrawals.totalWithdrawals,
    withdrawalsBySource: withdrawals.withdrawalsBySource,
    withdrawalsByPaymentMode: withdrawals.withdrawalsByPaymentMode,
    totalSavings: savings.totalSavings,
    savingsByDestination: savings.savingsByDestination,
    savingsByPaymentMode: savings.savingsByPaymentMode,
    balances,
    dailySummaryData,
    netProfit,
    totalTransactions,
  };
}

/**
 * Validate enhanced calculations
 */
export function validateEnhancedCalculations(summary: EnhancedFinancialSummary): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check income breakdown
  const expectedIncomeTotal = summary.incomeFromOrders + summary.incomeFromCharging;
  if (Math.abs(expectedIncomeTotal - summary.totalIncome) > 0.01) {
    errors.push(`Income breakdown mismatch: Expected ${expectedIncomeTotal}, got ${summary.totalIncome}`);
  }
  
  // Check payment mode totals for income
  const incomePaymentTotal = Object.values(summary.incomeByPaymentMode).reduce((a, b) => a + b, 0);
  if (Math.abs(incomePaymentTotal - summary.totalIncome) > 0.01) {
    errors.push(`Income payment mode breakdown doesn't match total: Expected ${summary.totalIncome}, got ${incomePaymentTotal}`);
  }
  
  // Check payment mode totals for expenses
  const expensePaymentTotal = Object.values(summary.expensesByPaymentMode).reduce((a, b) => a + b, 0);
  if (Math.abs(expensePaymentTotal - summary.totalExpenses) > 0.01) {
    errors.push(`Expense payment mode breakdown doesn't match total: Expected ${summary.totalExpenses}, got ${expensePaymentTotal}`);
  }
  
  // Check withdrawal sources
  const withdrawalSourceTotal = Object.values(summary.withdrawalsBySource).reduce((a, b) => a + b, 0);
  if (Math.abs(withdrawalSourceTotal - summary.totalWithdrawals) > 0.01) {
    errors.push(`Withdrawal source breakdown doesn't match total: Expected ${summary.totalWithdrawals}, got ${withdrawalSourceTotal}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Debug enhanced calculations
 */
export function debugEnhancedCalculations(summary: EnhancedFinancialSummary, targetDate?: string) {
  console.log(`📊 Enhanced Financial Summary Debug ${targetDate ? `for ${targetDate}` : '(All-Time)'}:`);
  console.log('Income:', summary.totalIncome, summary.incomeByPaymentMode);
  console.log('Expenses:', summary.totalExpenses, summary.expensesByPaymentMode);
  console.log('Deposits:', summary.totalDeposits, summary.depositsByDestination);
  console.log('Withdrawals:', summary.totalWithdrawals, summary.withdrawalsBySource, summary.withdrawalsByPaymentMode);
  console.log('Savings:', summary.totalSavings, summary.savingsByDestination, summary.savingsByPaymentMode);
  console.log('Balances:', summary.balances);
  console.log('Daily Summary Data:', summary.dailySummaryData);
  console.log('Validation:', validateEnhancedCalculations(summary));
}

/**
 * Format currency consistently
 */
export function formatCurrency(amount: number, currency: string = "NRs."): string {
  return `${currency} ${Math.abs(amount).toFixed(2)}`;
}
