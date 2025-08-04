
import { supabase } from "@/integrations/supabase/client";

export interface FormValidationResult {
  tableName: string;
  isValid: boolean;
  missingFields: string[];
  errors: string[];
}

export interface DatabaseSchemaCheck {
  allFormsValid: boolean;
  results: FormValidationResult[];
  summary: {
    validForms: number;
    totalForms: number;
    criticalIssues: string[];
  };
}

/**
 * Validate that all forms are compatible with the current database schema
 */
export async function validateFormDatabaseCompatibility(): Promise<DatabaseSchemaCheck> {
  const results: FormValidationResult[] = [];
  
  // Test each table that has forms
  const tablesToTest = [
    {
      name: 'orders',
      requiredFields: ['user_id', 'item_name', 'quantity', 'rate', 'total', 'payment_mode', 'order_date'],
    },
    {
      name: 'charging_sessions',
      requiredFields: ['user_id', 'total_amount', 'payment_mode', 'session_date'],
    },
    {
      name: 'expenses',
      requiredFields: ['user_id', 'description', 'amount', 'category', 'payment_mode', 'expense_date'],
    },
    {
      name: 'deposits',
      requiredFields: ['user_id', 'amount', 'mode', 'deposited_by', 'deposit_date'],
    },
    {
      name: 'withdrawals',
      requiredFields: ['user_id', 'amount', 'purpose', 'payment_mode', 'withdrawal_from', 'withdrawal_date'],
    },
    {
      name: 'cooperative_savings',
      requiredFields: ['user_id', 'member_id', 'contribution_amount', 'payment_mode', 'savings_to', 'contribution_date'],
    }
  ];

  for (const table of tablesToTest) {
    try {
      // Test if we can describe the table structure by selecting with limit 0
      const { error: infoError } = await supabase
        .from(table.name as any)
        .select('*')
        .limit(0);

      const missingFields: string[] = [];
      const errors: string[] = [];

      if (infoError && infoError.code !== 'PGRST116') {
        errors.push(`Cannot access table: ${infoError.message}`);
      }

      results.push({
        tableName: table.name,
        isValid: errors.length === 0,
        missingFields,
        errors
      });

    } catch (error) {
      results.push({
        tableName: table.name,
        isValid: false,
        missingFields: [],
        errors: [`Validation error: ${error instanceof Error ? error.message : String(error)}`]
      });
    }
  }

  const validForms = results.filter(r => r.isValid).length;
  const criticalIssues: string[] = [];

  // Identify critical issues
  results.forEach(result => {
    if (!result.isValid) {
      if (result.missingFields.length > 0) {
        criticalIssues.push(`${result.tableName}: Missing fields - ${result.missingFields.join(', ')}`);
      }
      if (result.errors.length > 0) {
        criticalIssues.push(`${result.tableName}: ${result.errors.join('; ')}`);
      }
    }
  });

  return {
    allFormsValid: validForms === tablesToTest.length,
    results,
    summary: {
      validForms,
      totalForms: tablesToTest.length,
      criticalIssues
    }
  };
}

/**
 * Quick test to verify key database fields exist
 */
export async function quickSchemaTest(): Promise<{ success: boolean; issues: string[] }> {
  const issues: string[] = [];
  
  try {
    // Test daily_summary table for new columns
    const { error: dailySummaryError } = await supabase
      .from('daily_summary')
      .select('total_expenses_cash, total_expenses_esewa, total_expenses_fonepay')
      .limit(1);
    
    if (dailySummaryError && dailySummaryError.message?.includes('column')) {
      issues.push('Missing expense payment mode columns in daily_summary table');
    }

    // Test withdrawals table for withdrawal_from field
    const { error: withdrawalsError } = await supabase
      .from('withdrawals')
      .select('withdrawal_from')
      .limit(1);
    
    if (withdrawalsError && withdrawalsError.message?.includes('column')) {
      issues.push('Missing withdrawal_from field in withdrawals table');
    }

    // Test cooperative_savings table for savings_to field
    const { error: savingsError } = await supabase
      .from('cooperative_savings')
      .select('savings_to')
      .limit(1);
    
    if (savingsError && savingsError.message?.includes('column')) {
      issues.push('Missing savings_to field in cooperative_savings table');
    }

    return {
      success: issues.length === 0,
      issues
    };

  } catch (error) {
    issues.push(`Schema test failed: ${error instanceof Error ? error.message : String(error)}`);
    return {
      success: false,
      issues
    };
  }
}

/**
 * Validate form data structure matches expected database schema
 */
export function validateFormData(tableName: string, formData: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Define expected schemas for each table
  const expectedSchemas: Record<string, string[]> = {
    orders: ['user_id', 'item_name', 'quantity', 'rate', 'total', 'payment_mode'],
    charging_sessions: ['user_id', 'total_amount', 'payment_mode'],
    expenses: ['user_id', 'description', 'amount', 'category', 'payment_mode'],
    deposits: ['user_id', 'amount', 'mode', 'deposited_by'],
    withdrawals: ['user_id', 'amount', 'purpose', 'payment_mode', 'withdrawal_from'],
    cooperative_savings: ['user_id', 'member_id', 'contribution_amount', 'payment_mode', 'savings_to']
  };

  const expectedFields = expectedSchemas[tableName];
  if (!expectedFields) {
    errors.push(`Unknown table: ${tableName}`);
    return { isValid: false, errors };
  }

  // Check required fields
  expectedFields.forEach(field => {
    if (!(field in formData) || formData[field] === undefined || formData[field] === '') {
      errors.push(`Missing required field: ${field}`);
    }
  });

  // Validate specific field types
  if (tableName === 'withdrawals' && formData.withdrawal_from) {
    const validWithdrawalSources = ['Esewa', 'Bank', 'Cooperative'];
    if (!validWithdrawalSources.includes(formData.withdrawal_from)) {
      errors.push(`Invalid withdrawal_from value: ${formData.withdrawal_from}. Must be one of: ${validWithdrawalSources.join(', ')}`);
    }
  }

  if (tableName === 'cooperative_savings' && formData.savings_to) {
    const validSavingsDestinations = ['Bank', 'Cooperative'];
    if (!validSavingsDestinations.includes(formData.savings_to)) {
      errors.push(`Invalid savings_to value: ${formData.savings_to}. Must be one of: ${validSavingsDestinations.join(', ')}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
