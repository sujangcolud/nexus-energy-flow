import { supabase } from "@/integrations/supabase/client";

// Schema validation utility to check which columns exist in daily_summary table
export async function validateDailySummarySchema(): Promise<{
  availableColumns: string[];
  missingColumns: string[];
  schemaValid: boolean;
}> {
  try {
    console.log("🔍 Validating daily_summary table schema...");

    // Expected columns based on our application logic
    const expectedColumns = [
      'id',
      'summary_date',
      'total_income_from_orders',
      'total_income_from_charging', 
      'total_income_cash',
      'total_income_esewa',
      'total_income_fonepay',
      'total_cash_income',
      'total_esewa_income', 
      'total_fonepay_income',
      'total_expenses',
      'total_expenses_cash',
      'total_expenses_esewa',
      'total_expenses_fonepay',
      'total_deposits',
      'total_deposits_cash',
      'total_deposits_esewa',
      'total_savings',
      'total_savings_cash',
      'total_savings_esewa',
      'total_savings_fonepay',
      'total_withdrawals',
      'total_withdrawals_cooperative',
      'total_withdrawals_bank',
      'total_withdrawals_cash',
      'cash_balance',
      'esewa_balance',
      'fonepay_balance',
      'cooperative_balance',
      'total_balance',
      'created_at',
      'updated_at'
    ];

    // Try to fetch a single record to understand the actual schema
    const { data, error } = await supabase
      .from("daily_summary")
      .select("*")
      .limit(1);

    if (error) {
      console.error("❌ Schema validation error:", error);
      return {
        availableColumns: [],
        missingColumns: expectedColumns,
        schemaValid: false
      };
    }

    // Get available columns from the actual data
    const availableColumns = data && data.length > 0 ? Object.keys(data[0]) : [];
    const missingColumns = expectedColumns.filter(col => !availableColumns.includes(col));

    const schemaValid = missingColumns.length === 0;

    console.log("📊 Schema validation results:", {
      availableColumns: availableColumns.length,
      missingColumns: missingColumns.length,
      schemaValid
    });

    if (missingColumns.length > 0) {
      console.warn("⚠️ Missing columns:", missingColumns);
    }

    return {
      availableColumns,
      missingColumns,
      schemaValid
    };

  } catch (error) {
    console.error("💥 Schema validation failed:", error);
    return {
      availableColumns: [],
      missingColumns: [],
      schemaValid: false
    };
  }
}

// Safe field getter that handles missing columns gracefully
export function createSafeFieldGetter(availableColumns: string[] = []) {
  return function safeGet(obj: any, field: string, fallbackField?: string): number {
    if (!obj) return 0;
    
    // Try the primary field
    if (availableColumns.length === 0 || availableColumns.includes(field)) {
      const value = Number(obj[field]);
      if (!isNaN(value)) return value;
    }
    
    // Try the fallback field if provided
    if (fallbackField && (availableColumns.length === 0 || availableColumns.includes(fallbackField))) {
      const fallbackValue = Number(obj[fallbackField]);
      if (!isNaN(fallbackValue)) return fallbackValue;
    }
    
    return 0;
  };
}

// Initialize schema validation on app start
let schemaValidationPromise: Promise<any> | null = null;

export function initializeSchemaValidation() {
  if (!schemaValidationPromise) {
    schemaValidationPromise = validateDailySummarySchema();
  }
  return schemaValidationPromise;
}
