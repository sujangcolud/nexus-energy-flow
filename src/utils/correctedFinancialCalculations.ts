// Corrected Financial Calculations based on Proper Accounting Principles
// This module provides the CORRECT formulas for calculating balances

export interface CorrectedBalanceCalculation {
  // Account balances (what you actually have)
  cashInHand: number;
  esewaBalance: number;
  fonepayBalance: number;
  bankBalance: number;
  cooperativeBalance: number;
  totalBalance: number;
  
  // Verification totals
  totalIncome: number;
  totalExpenses: number;
  totalSavings: number;
  totalWithdrawals: number;
  totalDeposits: number;
  
  // Net calculations
  netProfit: number; // Income - Expenses
  netCashFlow: number; // All inflows - All outflows
}

export interface TransactionSummary {
  // Income (money coming in)
  income: {
    cash: number;
    esewa: number;
    fonepay: number;
    bank: number;
    total: number;
  };
  
  // Expenses (money going out)
  expenses: {
    cash: number;
    esewa: number;
    fonepay: number;
    bank: number;
    total: number;  
  };
  
  // Savings (money moved to cooperative/bank for future)
  savings: {
    cash: number; // Cash savings moved to cooperative
    esewa: number; // eSewa savings moved to cooperative
    fonepay: number; // Fonepay savings moved to cooperative
    total: number;
  };
  
  // Deposits (money moved between accounts)
  deposits: {
    toEsewa: number; // Money deposited to eSewa
    toBank: number; // Money deposited to bank
    toFonepay: number; // Money deposited to fonepay
    total: number;
  };
  
  // Withdrawals (money taken out)
  withdrawals: {
    fromBank: number;
    fromCooperative: number;
    fromEsewa: number;
    fromFonepay: number;
    inCash: number; // Withdrawals received as cash
    inEsewa: number; // Withdrawals received as esewa
    inFonepay: number; // Withdrawals received as fonepay
    total: number;
  };
}

/**
 * Calculate corrected balances using proper accounting principles
 */
export function calculateCorrectedBalances(summary: TransactionSummary): CorrectedBalanceCalculation {
  
  // CASH IN HAND = Starting Cash + Cash Income - Cash Expenses - Cash Savings - Deposits from Cash + Cash Withdrawals
  const cashInHand = 
    summary.income.cash - 
    summary.expenses.cash - 
    summary.savings.cash - 
    summary.deposits.toEsewa - // Money moved from cash to eSewa
    summary.deposits.toBank - // Money moved from cash to bank
    summary.deposits.toFonepay + // Money moved from cash to fonepay
    summary.withdrawals.inCash; // Withdrawals received as cash

  // ESEWA BALANCE = eSewa Income - eSewa Expenses - eSewa Savings + Deposits to eSewa - Withdrawals from eSewa
  const esewaBalance = 
    summary.income.esewa -
    summary.expenses.esewa -
    summary.savings.esewa +
    summary.deposits.toEsewa - // Deposits TO eSewa increase balance
    summary.withdrawals.fromEsewa; // Withdrawals FROM eSewa decrease balance

  // FONEPAY BALANCE = Fonepay Income - Fonepay Expenses - Fonepay Savings + Deposits to Fonepay - Withdrawals from Fonepay
  const fonepayBalance = 
    summary.income.fonepay -
    summary.expenses.fonepay -
    summary.savings.fonepay +
    summary.deposits.toFonepay +
    summary.withdrawals.inFonepay; // Withdrawals received as fonepay

  // BANK BALANCE = Bank Income - Bank Expenses + Deposits to Bank - Withdrawals from Bank
  const bankBalance = 
    summary.income.bank -
    summary.expenses.bank +
    summary.deposits.toBank -
    summary.withdrawals.fromBank;

  // COOPERATIVE BALANCE = Total Savings - Total Withdrawals from Cooperative
  const cooperativeBalance = 
    summary.savings.total -
    summary.withdrawals.fromCooperative;

  const totalBalance = cashInHand + esewaBalance + fonepayBalance + bankBalance + cooperativeBalance;

  // Net calculations
  const netProfit = summary.income.total - summary.expenses.total;
  const netCashFlow = summary.income.total + summary.withdrawals.total - summary.expenses.total - summary.savings.total;

  return {
    cashInHand: Math.round(cashInHand * 100) / 100,
    esewaBalance: Math.round(esewaBalance * 100) / 100,
    fonepayBalance: Math.round(fonepayBalance * 100) / 100,
    bankBalance: Math.round(bankBalance * 100) / 100,
    cooperativeBalance: Math.round(cooperativeBalance * 100) / 100,
    totalBalance: Math.round(totalBalance * 100) / 100,
    
    totalIncome: summary.income.total,
    totalExpenses: summary.expenses.total,
    totalSavings: summary.savings.total,
    totalWithdrawals: summary.withdrawals.total,
    totalDeposits: summary.deposits.total,
    
    netProfit: Math.round(netProfit * 100) / 100,
    netCashFlow: Math.round(netCashFlow * 100) / 100,
  };
}

/**
 * Validate balance calculations for accuracy
 */
export function validateBalanceCalculations(
  calculation: CorrectedBalanceCalculation,
  summary: TransactionSummary
): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for impossible negative balances
  if (calculation.cashInHand < -1000) {
    errors.push(`Cash in hand is heavily negative: ${calculation.cashInHand}. Check expense/withdrawal calculations.`);
  }
  
  if (calculation.esewaBalance < -100) {
    errors.push(`eSewa balance is negative: ${calculation.esewaBalance}. Check eSewa transactions.`);
  }
  
  if (calculation.cooperativeBalance < 0) {
    errors.push(`Cooperative balance is negative: ${calculation.cooperativeBalance}. Withdrawals exceed savings.`);
  }

  // Check income calculation
  const expectedIncomeTotal = summary.income.cash + summary.income.esewa + summary.income.fonepay + summary.income.bank;
  if (Math.abs(expectedIncomeTotal - summary.income.total) > 0.01) {
    errors.push(`Income breakdown doesn't match total: Expected ${expectedIncomeTotal}, got ${summary.income.total}`);
  }

  // Check expense calculation  
  const expectedExpenseTotal = summary.expenses.cash + summary.expenses.esewa + summary.expenses.fonepay + summary.expenses.bank;
  if (Math.abs(expectedExpenseTotal - summary.expenses.total) > 0.01) {
    errors.push(`Expense breakdown doesn't match total: Expected ${expectedExpenseTotal}, got ${summary.expenses.total}`);
  }

  // Warnings for unusual situations
  if (calculation.cashInHand < 0) {
    warnings.push(`Cash in hand is negative: ${calculation.cashInHand}. This might indicate overdraft or calculation error.`);
  }
  
  if (calculation.netProfit < 0) {
    warnings.push(`Net profit is negative: ${calculation.netProfit}. Expenses exceed income.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Debug function to log detailed balance breakdown
 */
export function debugBalanceCalculation(calculation: CorrectedBalanceCalculation, summary: TransactionSummary) {
  console.log('🔍 CORRECTED BALANCE CALCULATION DEBUG:');
  console.log('='.repeat(50));
  
  console.log('📊 INCOME BREAKDOWN:');
  console.log(`  Cash: ${summary.income.cash}`);
  console.log(`  eSewa: ${summary.income.esewa}`);
  console.log(`  Fonepay: ${summary.income.fonepay}`);
  console.log(`  Bank: ${summary.income.bank}`);
  console.log(`  TOTAL: ${summary.income.total}`);
  
  console.log('💸 EXPENSE BREAKDOWN:');
  console.log(`  Cash: ${summary.expenses.cash}`);
  console.log(`  eSewa: ${summary.expenses.esewa}`);
  console.log(`  Fonepay: ${summary.expenses.fonepay}`);
  console.log(`  Bank: ${summary.expenses.bank}`);
  console.log(`  TOTAL: ${summary.expenses.total}`);
  
  console.log('🏦 CALCULATED BALANCES:');
  console.log(`  Cash in Hand: ${calculation.cashInHand}`);
  console.log(`  eSewa Balance: ${calculation.esewaBalance}`);
  console.log(`  Fonepay Balance: ${calculation.fonepayBalance}`);
  console.log(`  Bank Balance: ${calculation.bankBalance}`);
  console.log(`  Cooperative Balance: ${calculation.cooperativeBalance}`);
  console.log(`  TOTAL BALANCE: ${calculation.totalBalance}`);
  
  console.log('📈 SUMMARY:');
  console.log(`  Net Profit: ${calculation.netProfit}`);
  console.log(`  Net Cash Flow: ${calculation.netCashFlow}`);
  
  const validation = validateBalanceCalculations(calculation, summary);
  if (!validation.isValid) {
    console.log('❌ VALIDATION ERRORS:');
    validation.errors.forEach(error => console.log(`  - ${error}`));
  }
  
  if (validation.warnings.length > 0) {
    console.log('⚠️ WARNINGS:');
    validation.warnings.forEach(warning => console.log(`  - ${warning}`));
  }
  
  console.log('='.repeat(50));
}