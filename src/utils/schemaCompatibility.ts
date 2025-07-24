import { supabase } from "@/integrations/supabase/client";

/**
 * Schema Compatibility Utility
 * Handles graceful fallbacks when enhanced daily_summary columns don't exist
 */

export interface SafeFieldAccessor {
  get: (obj: any, field: string, fallback?: any) => number;
  exists: (field: string) => boolean;
}

let schemaCache: { [key: string]: boolean } = {};
let cacheInitialized = false;

/**
 * Check if specific columns exist in the daily_summary table
 */
export async function checkSchemaColumns(): Promise<{ [key: string]: boolean }> {
  if (cacheInitialized) return schemaCache;
  
  try {
    // Try to select the enhanced columns to see which ones exist
    const { error } = await supabase
      .from('daily_summary')
      .select('total_income_from_orders_cash, total_income_fonepay, total_esewa_income')
      .limit(1);
    
    if (error && error.code === '42703') {
      // Columns don't exist - this is expected for basic schema
      schemaCache = {
        enhanced_orders_breakdown: false,
        enhanced_charging_breakdown: false,
        enhanced_payment_totals: false,
        enhanced_withdrawal_breakdown: false
      };
    } else {
      // Enhanced columns exist
      schemaCache = {
        enhanced_orders_breakdown: true,
        enhanced_charging_breakdown: true,
        enhanced_payment_totals: true,
        enhanced_withdrawal_breakdown: true
      };
    }
    
    cacheInitialized = true;
    return schemaCache;
  } catch (error) {
    console.warn('Schema check failed, assuming basic schema:', error);
    schemaCache = {
      enhanced_orders_breakdown: false,
      enhanced_charging_breakdown: false,
      enhanced_payment_totals: false,
      enhanced_withdrawal_breakdown: false
    };
    cacheInitialized = true;
    return schemaCache;
  }
}

/**
 * Safe field accessor that handles missing columns gracefully
 */
export function createSafeAccessor(): SafeFieldAccessor {
  return {
    get: (obj: any, field: string, fallback: any = 0): number => {
      if (!obj) return Number(fallback) || 0;
      
      // Try to get the field value
      if (typeof obj[field] !== 'undefined' && obj[field] !== null) {
        return Number(obj[field]) || 0;
      }
      
      // Return fallback
      return Number(fallback) || 0;
    },
    
    exists: (field: string): boolean => {
      return schemaCache[field] === true;
    }
  };
}

/**
 * Get compatible field names for different schema versions
 */
export function getCompatibleField(primaryField: string, basicField?: string): string {
  const schema = schemaCache;
  
  // Map enhanced fields to basic fields for compatibility
  const fieldMappings: { [key: string]: string } = {
    'total_income_from_orders_cash': 'cash_balance',
    'total_income_from_orders_esewa': 'esewa_balance', 
    'total_income_from_orders_fonepay': 'fonepay_balance',
    'total_cash_income': 'cash_balance',
    'total_esewa_income': 'esewa_balance',
    'total_fonepay_income': 'fonepay_balance'
  };
  
  // If enhanced schema is available, use primary field
  if (schema.enhanced_orders_breakdown || schema.enhanced_payment_totals) {
    return primaryField;
  }
  
  // Fall back to basic field or mapped field
  return basicField || fieldMappings[primaryField] || primaryField;
}

/**
 * Initialize schema compatibility on app start
 */
export async function initializeSchemaCompatibility(): Promise<void> {
  await checkSchemaColumns();
  console.log('Schema compatibility initialized:', schemaCache);
}
