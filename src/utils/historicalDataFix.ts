// Historical Data Fix Utility
// This fixes the payment mode breakdown issues for dates before July 19, 2025

import { supabase } from "@/integrations/supabase/client";
import { 
  calculateEnhancedFinancialSummary,
  validateEnhancedCalculations,
  type EnhancedDatabaseTransactionData 
} from "./enhancedDatabaseCalculations";

export interface HistoricalFixResult {
  success: boolean;
  updatedDates: string[];
  errors: string[];
  validationResults: Record<string, { isValid: boolean; errors: string[] }>;
}

/**
 * Fix historical daily summaries with missing payment mode data
 */
export async function fixHistoricalDailySummaries(
  userId: string,
  startDate: string = '2025-05-01',
  endDate: string = '2025-07-18'
): Promise<HistoricalFixResult> {
  const result: HistoricalFixResult = {
    success: false,
    updatedDates: [],
    errors: [],
    validationResults: {}
  };

  try {
    console.log(`🔧 Starting historical data fix from ${startDate} to ${endDate}...`);

    // Get all dates that need fixing
    const { data: existingSummaries, error: summaryError } = await supabase
      .from('daily_summary')
      .select('summary_date')
      .gte('summary_date', startDate)
      .lte('summary_date', endDate)
      .order('summary_date');

    if (summaryError) {
      result.errors.push(`Error fetching existing summaries: ${summaryError.message}`);
      return result;
    }

    const datesToFix = existingSummaries?.map(s => s.summary_date) || [];
    console.log(`📅 Found ${datesToFix.length} dates to fix:`, datesToFix);

    // Process each date
    for (const dateStr of datesToFix) {
      try {
        console.log(`🔍 Processing date: ${dateStr}`);

        // Fetch all transaction data for this date
        const [
          { data: orders, error: ordersError },
          { data: charging, error: chargingError },
          { data: expenses, error: expensesError },
          { data: deposits, error: depositsError },
          { data: withdrawals, error: withdrawalsError },
          { data: savings, error: savingsError }
        ] = await Promise.all([
          supabase
            .from('orders')
            .select('*')
            .eq('user_id', userId)
            .eq('order_date', dateStr),
          supabase
            .from('charging_sessions')
            .select('*')
            .eq('user_id', userId)
            .eq('session_date', dateStr),
          supabase
            .from('expenses')
            .select('*')
            .eq('user_id', userId)
            .eq('expense_date', dateStr),
          supabase
            .from('deposits')
            .select('*')
            .eq('user_id', userId)
            .eq('deposit_date', dateStr),
          supabase
            .from('withdrawals')
            .select('*')
            .eq('user_id', userId)
            .eq('withdrawal_date', dateStr),
          supabase
            .from('cooperative_savings')
            .select('*')
            .eq('user_id', userId)
            .eq('contribution_date', dateStr)
        ]);

        // Check for errors
        if (ordersError || chargingError || expensesError || depositsError || withdrawalsError || savingsError) {
          const errorMsg = `Error fetching data for ${dateStr}: ${
            [ordersError, chargingError, expensesError, depositsError, withdrawalsError, savingsError]
              .filter(e => e)
              .map(e => e?.message)
              .join(', ')
          }`;
          result.errors.push(errorMsg);
          continue;
        }

        // Prepare enhanced data
        const enhancedData: EnhancedDatabaseTransactionData = {
          orders: orders || [],
          charging_sessions: charging || [],
          expenses: expenses || [],
          deposits: deposits || [],
          withdrawals: withdrawals || [],
          cooperative_savings: savings || []
        };

        // Calculate corrected summary
        const summary = calculateEnhancedFinancialSummary(enhancedData, dateStr);
        
        // Validate calculations
        const validation = validateEnhancedCalculations(summary);
        result.validationResults[dateStr] = validation;

        if (!validation.isValid) {
          console.warn(`⚠️ Validation failed for ${dateStr}:`, validation.errors);
        }

        // Update daily_summary table with corrected data
        const { error: updateError } = await supabase
          .from('daily_summary')
          .update({
            // Income breakdown (should already be correct)
            total_income_from_orders: summary.dailySummaryData.total_income_from_orders,
            total_income_from_charging: summary.dailySummaryData.total_income_from_charging,
            total_income_cash: summary.dailySummaryData.total_income_cash,
            total_income_esewa: summary.dailySummaryData.total_income_esewa,
            total_income_fonepay: summary.dailySummaryData.total_income_fonepay,
            
            // Expense breakdown (this was missing!)
            total_expenses: summary.dailySummaryData.total_expenses,
            total_expenses_cash: summary.dailySummaryData.total_expenses_cash,
            total_expenses_esewa: summary.dailySummaryData.total_expenses_esewa,
            total_expenses_fonepay: summary.dailySummaryData.total_expenses_fonepay,
            
            // Deposit breakdown
            total_deposits: summary.dailySummaryData.total_deposits,
            total_deposits_cash: summary.dailySummaryData.total_deposits_cash,
            total_deposits_esewa: summary.dailySummaryData.total_deposits_esewa,
            
            // Savings breakdown
            total_savings: summary.dailySummaryData.total_savings,
            total_savings_cash: summary.dailySummaryData.total_savings_cash,
            total_savings_esewa: summary.dailySummaryData.total_savings_esewa,
            total_savings_fonepay: summary.dailySummaryData.total_savings_fonepay,
            
            // Withdrawal breakdown (enhanced!)
            total_withdrawals: summary.dailySummaryData.total_withdrawals,
            total_withdrawals_cooperative: summary.dailySummaryData.total_withdrawals_cooperative,
            total_withdrawals_bank: summary.dailySummaryData.total_withdrawals_bank,
            
            // Income totals
            total_income: summary.dailySummaryData.total_income,
            total_cash_income: summary.dailySummaryData.total_cash_income,
            total_esewa_income: summary.dailySummaryData.total_esewa_income,
            total_fonepay_income: summary.dailySummaryData.total_fonepay_income,
            
            // Balances
            cash_balance: summary.dailySummaryData.cash_balance,
            esewa_balance: summary.dailySummaryData.esewa_balance,
            fonepay_balance: summary.dailySummaryData.fonepay_balance,
            cooperative_balance: summary.dailySummaryData.cooperative_balance,
            total_balance: summary.dailySummaryData.total_balance,
            
            updated_at: new Date().toISOString()
          })
          .eq('summary_date', dateStr);

        if (updateError) {
          result.errors.push(`Error updating ${dateStr}: ${updateError.message}`);
          continue;
        }

        result.updatedDates.push(dateStr);
        console.log(`✅ Successfully updated ${dateStr}`);

        // Log the key fixes applied
        console.log(`📊 Fixed data for ${dateStr}:`, {
          expenses: {
            total: summary.dailySummaryData.total_expenses,
            cash: summary.dailySummaryData.total_expenses_cash,
            esewa: summary.dailySummaryData.total_expenses_esewa,
            fonepay: summary.dailySummaryData.total_expenses_fonepay
          },
          balances: {
            cash: summary.dailySummaryData.cash_balance,
            esewa: summary.dailySummaryData.esewa_balance,
            fonepay: summary.dailySummaryData.fonepay_balance,
            cooperative: summary.dailySummaryData.cooperative_balance,
            total: summary.dailySummaryData.total_balance
          }
        });

      } catch (dateError) {
        const errorMsg = `Error processing ${dateStr}: ${dateError instanceof Error ? dateError.message : String(dateError)}`;
        result.errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    result.success = result.updatedDates.length > 0 && result.errors.length === 0;
    
    console.log(`🏁 Historical data fix complete:`, {
      success: result.success,
      updatedCount: result.updatedDates.length,
      errorCount: result.errors.length
    });

    return result;

  } catch (error) {
    result.errors.push(`Fatal error: ${error instanceof Error ? error.message : String(error)}`);
    return result;
  }
}

/**
 * Check which dates need fixing
 */
export async function identifyDatesNeedingFix(
  userId: string,
  startDate: string = '2025-05-01',
  endDate: string = '2025-07-18'
): Promise<{ datesNeedingFix: string[]; totalDates: number }> {
  try {
    const { data: summaries, error } = await supabase
      .from('daily_summary')
      .select('summary_date, total_expenses, total_expenses_cash, total_expenses_esewa, total_expenses_fonepay')
      .gte('summary_date', startDate)
      .lte('summary_date', endDate)
      .order('summary_date');

    if (error) {
      throw error;
    }

    const datesNeedingFix = summaries?.filter(s => {
      // Check if expense payment mode breakdown is missing
      const hasExpenseBreakdown = 
        (s.total_expenses_cash !== null && s.total_expenses_cash !== undefined) ||
        (s.total_expenses_esewa !== null && s.total_expenses_esewa !== undefined) ||
        (s.total_expenses_fonepay !== null && s.total_expenses_fonepay !== undefined);
      
      // Check if there are expenses but no breakdown
      const hasExpenses = s.total_expenses && s.total_expenses > 0;
      
      return hasExpenses && !hasExpenseBreakdown;
    }).map(s => s.summary_date) || [];

    return {
      datesNeedingFix,
      totalDates: summaries?.length || 0
    };

  } catch (error) {
    console.error('Error identifying dates needing fix:', error);
    return { datesNeedingFix: [], totalDates: 0 };
  }
}

/**
 * Preview what would be fixed without actually updating
 */
export async function previewHistoricalFix(
  userId: string,
  targetDate: string
): Promise<{ current: any; proposed: any; differences: string[] }> {
  try {
    // Get current daily summary
    const { data: currentSummary, error: currentError } = await supabase
      .from('daily_summary')
      .select('*')
      .eq('summary_date', targetDate)
      .single();

    if (currentError) {
      throw currentError;
    }

    // Fetch raw transaction data
    const [
      { data: orders },
      { data: charging },
      { data: expenses },
      { data: deposits },
      { data: withdrawals },
      { data: savings }
    ] = await Promise.all([
      supabase.from('orders').select('*').eq('user_id', userId).eq('order_date', targetDate),
      supabase.from('charging_sessions').select('*').eq('user_id', userId).eq('session_date', targetDate),
      supabase.from('expenses').select('*').eq('user_id', userId).eq('expense_date', targetDate),
      supabase.from('deposits').select('*').eq('user_id', userId).eq('deposit_date', targetDate),
      supabase.from('withdrawals').select('*').eq('user_id', userId).eq('withdrawal_date', targetDate),
      supabase.from('cooperative_savings').select('*').eq('user_id', userId).eq('contribution_date', targetDate)
    ]);

    // Calculate proposed values
    const enhancedData: EnhancedDatabaseTransactionData = {
      orders: orders || [],
      charging_sessions: charging || [],
      expenses: expenses || [],
      deposits: deposits || [],
      withdrawals: withdrawals || [],
      cooperative_savings: savings || []
    };

    const proposedSummary = calculateEnhancedFinancialSummary(enhancedData, targetDate);

    // Identify differences
    const differences: string[] = [];
    
    const checkField = (field: string, current: number, proposed: number) => {
      if (Math.abs((current || 0) - proposed) > 0.01) {
        differences.push(`${field}: ${current || 0} → ${proposed} (${proposed - (current || 0) >= 0 ? '+' : ''}${(proposed - (current || 0)).toFixed(2)})`);
      }
    };

    checkField('total_expenses_cash', currentSummary.total_expenses_cash, proposedSummary.dailySummaryData.total_expenses_cash);
    checkField('total_expenses_esewa', currentSummary.total_expenses_esewa, proposedSummary.dailySummaryData.total_expenses_esewa);
    checkField('total_expenses_fonepay', currentSummary.total_expenses_fonepay, proposedSummary.dailySummaryData.total_expenses_fonepay);
    checkField('cash_balance', currentSummary.cash_balance, proposedSummary.dailySummaryData.cash_balance);
    checkField('esewa_balance', currentSummary.esewa_balance, proposedSummary.dailySummaryData.esewa_balance);
    checkField('fonepay_balance', currentSummary.fonepay_balance, proposedSummary.dailySummaryData.fonepay_balance);
    checkField('total_balance', currentSummary.total_balance, proposedSummary.dailySummaryData.total_balance);

    return {
      current: currentSummary,
      proposed: proposedSummary.dailySummaryData,
      differences
    };

  } catch (error) {
    throw new Error(`Error previewing fix for ${targetDate}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
