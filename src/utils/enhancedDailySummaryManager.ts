import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface EnhancedDailySummary {
  id?: number;
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
  created_at?: string;
  updated_at?: string;
}

/**
 * Enhanced Daily Summary Manager
 * Provides utilities to manage the enhanced daily summary system
 */
export class EnhancedDailySummaryManager {
  
  /**
   * Initialize the enhanced daily summary system in the database
   */
  static async initializeSystem(): Promise<boolean> {
    try {
      console.log("🔧 Initializing Enhanced Daily Summary System...");
      
      // First, check if the enhanced schema is already in place
      const { data: schemaCheck, error: schemaError } = await supabase
        .from('daily_summary')
        .select('total_income_from_orders_cash')
        .limit(1);

      if (schemaError && schemaError.code === '42703') {
        console.log("📊 Enhanced schema not detected. Please run the SQL migration first.");
        toast.error("Enhanced daily summary schema not found. Please contact admin to run database migration.");
        return false;
      }

      // Execute the enhanced daily summary system setup
      const { error: setupError } = await supabase.rpc('populate_historical_daily_summaries');
      
      if (setupError) {
        console.error("❌ Error initializing enhanced daily summary system:", setupError);
        toast.error("Failed to initialize enhanced daily summary system");
        return false;
      }

      console.log("✅ Enhanced Daily Summary System initialized successfully!");
      toast.success("Enhanced daily summary system initialized successfully!");
      return true;
      
    } catch (error) {
      console.error("❌ Error during system initialization:", error);
      toast.error("Failed to initialize enhanced daily summary system");
      return false;
    }
  }

  /**
   * Update daily summary for a specific date
   */
  static async updateDailySummary(date: string): Promise<boolean> {
    try {
      console.log(`📊 Updating daily summary for ${date}...`);
      
      const { error } = await supabase.rpc('update_enhanced_daily_summary', {
        target_date: date
      });

      if (error) {
        console.error("❌ Error updating daily summary:", error);
        return false;
      }

      console.log(`✅ Daily summary updated for ${date}`);
      return true;
      
    } catch (error) {
      console.error("❌ Error updating daily summary:", error);
      return false;
    }
  }

  /**
   * Get enhanced daily summary for a specific date
   */
  static async getDailySummary(date: string): Promise<EnhancedDailySummary | null> {
    try {
      const { data, error } = await supabase
        .from('daily_summary')
        .select('*')
        .eq('summary_date', date)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No data found for this date
          return null;
        }
        console.error("❌ Error fetching daily summary:", error);
        return null;
      }

      return data as EnhancedDailySummary;
      
    } catch (error) {
      console.error("❌ Error fetching daily summary:", error);
      return null;
    }
  }

  /**
   * Get enhanced daily summaries for a date range
   */
  static async getDailySummariesByRange(
    fromDate: string, 
    toDate: string
  ): Promise<EnhancedDailySummary[]> {
    try {
      const { data, error } = await supabase
        .from('daily_summary')
        .select('*')
        .gte('summary_date', fromDate)
        .lte('summary_date', toDate)
        .order('summary_date', { ascending: true });

      if (error) {
        console.error("❌ Error fetching daily summaries:", error);
        return [];
      }

      return data as EnhancedDailySummary[];
      
    } catch (error) {
      console.error("❌ Error fetching daily summaries:", error);
      return [];
    }
  }

  /**
   * Populate historical data from existing transactions
   */
  static async populateHistoricalData(): Promise<boolean> {
    try {
      console.log("📊 Populating historical daily summaries...");
      toast.info("Populating historical data... This may take a moment.");
      
      const { error } = await supabase.rpc('populate_historical_daily_summaries');

      if (error) {
        console.error("❌ Error populating historical data:", error);
        toast.error("Failed to populate historical data");
        return false;
      }

      console.log("✅ Historical data populated successfully!");
      toast.success("Historical data populated successfully!");
      return true;
      
    } catch (error) {
      console.error("❌ Error populating historical data:", error);
      toast.error("Failed to populate historical data");
      return false;
    }
  }

  /**
   * Check if the enhanced daily summary system is properly set up
   */
  static async isSystemReady(): Promise<boolean> {
    try {
      // Check if enhanced columns exist
      const { data: schemaCheck, error: schemaError } = await supabase
        .from('daily_summary')
        .select('total_income_from_orders_cash, total_income_from_charging_cash')
        .limit(1);

      if (schemaError && schemaError.code === '42703') {
        return false; // Enhanced columns don't exist
      }

      // Check if functions exist
      const { data: functionCheck, error: functionError } = await supabase
        .rpc('calculate_enhanced_daily_summary', { target_date: '2024-01-01' });

      if (functionError && functionError.code === '42883') {
        return false; // Functions don't exist
      }

      return true;
      
    } catch (error) {
      console.error("❌ Error checking system readiness:", error);
      return false;
    }
  }

  /**
   * Force refresh a specific date's summary
   */
  static async refreshDateSummary(date: string): Promise<boolean> {
    try {
      console.log(`🔄 Refreshing daily summary for ${date}...`);
      
      const success = await this.updateDailySummary(date);
      
      if (success) {
        toast.success(`Daily summary refreshed for ${date}`);
      } else {
        toast.error(`Failed to refresh daily summary for ${date}`);
      }
      
      return success;
      
    } catch (error) {
      console.error("❌ Error refreshing daily summary:", error);
      toast.error("Failed to refresh daily summary");
      return false;
    }
  }

  /**
   * Get system status and statistics
   */
  static async getSystemStatus(): Promise<{
    isReady: boolean;
    totalSummaries: number;
    latestSummaryDate: string | null;
    oldestSummaryDate: string | null;
  }> {
    try {
      const isReady = await this.isSystemReady();
      
      if (!isReady) {
        return {
          isReady: false,
          totalSummaries: 0,
          latestSummaryDate: null,
          oldestSummaryDate: null
        };
      }

      const { data: stats, error } = await supabase
        .from('daily_summary')
        .select('summary_date')
        .order('summary_date', { ascending: false });

      if (error) {
        console.error("❌ Error fetching system stats:", error);
        return {
          isReady: true,
          totalSummaries: 0,
          latestSummaryDate: null,
          oldestSummaryDate: null
        };
      }

      return {
        isReady: true,
        totalSummaries: stats.length,
        latestSummaryDate: stats.length > 0 ? stats[0].summary_date : null,
        oldestSummaryDate: stats.length > 0 ? stats[stats.length - 1].summary_date : null
      };
      
    } catch (error) {
      console.error("❌ Error getting system status:", error);
      return {
        isReady: false,
        totalSummaries: 0,
        latestSummaryDate: null,
        oldestSummaryDate: null
      };
    }
  }
}

// Export a default instance for convenience
export const dailySummaryManager = EnhancedDailySummaryManager;
