-- Safe Migration Script to Fix Daily Summary Schema Mismatch
-- This script safely adds missing columns without breaking existing data

-- Add missing enhanced columns to existing daily_summary table
DO $$
BEGIN
    -- Check if daily_summary table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'daily_summary') THEN
        
        -- Add enhanced orders income columns
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'daily_summary' AND column_name = 'total_income_from_orders_cash') THEN
            ALTER TABLE daily_summary ADD COLUMN total_income_from_orders_cash NUMERIC DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'daily_summary' AND column_name = 'total_income_from_orders_fonepay') THEN
            ALTER TABLE daily_summary ADD COLUMN total_income_from_orders_fonepay NUMERIC DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'daily_summary' AND column_name = 'total_income_from_orders_esewa') THEN
            ALTER TABLE daily_summary ADD COLUMN total_income_from_orders_esewa NUMERIC DEFAULT 0;
        END IF;

        -- Add enhanced charging income columns
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'daily_summary' AND column_name = 'total_income_from_charging_cash') THEN
            ALTER TABLE daily_summary ADD COLUMN total_income_from_charging_cash NUMERIC DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'daily_summary' AND column_name = 'total_income_from_charging_fonepay') THEN
            ALTER TABLE daily_summary ADD COLUMN total_income_from_charging_fonepay NUMERIC DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'daily_summary' AND column_name = 'total_income_from_charging_esewa') THEN
            ALTER TABLE daily_summary ADD COLUMN total_income_from_charging_esewa NUMERIC DEFAULT 0;
        END IF;

        -- Add enhanced expense columns
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'daily_summary' AND column_name = 'total_expenses_cash') THEN
            ALTER TABLE daily_summary ADD COLUMN total_expenses_cash NUMERIC DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'daily_summary' AND column_name = 'total_expenses_esewa') THEN
            ALTER TABLE daily_summary ADD COLUMN total_expenses_esewa NUMERIC DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'daily_summary' AND column_name = 'total_expenses_fonepay') THEN
            ALTER TABLE daily_summary ADD COLUMN total_expenses_fonepay NUMERIC DEFAULT 0;
        END IF;

        -- Add enhanced deposit columns
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'daily_summary' AND column_name = 'total_deposits_cash') THEN
            ALTER TABLE daily_summary ADD COLUMN total_deposits_cash NUMERIC DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'daily_summary' AND column_name = 'total_deposits_esewa') THEN
            ALTER TABLE daily_summary ADD COLUMN total_deposits_esewa NUMERIC DEFAULT 0;
        END IF;

        -- Add enhanced savings columns
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'daily_summary' AND column_name = 'total_savings_cash') THEN
            ALTER TABLE daily_summary ADD COLUMN total_savings_cash NUMERIC DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'daily_summary' AND column_name = 'total_savings_fonepay') THEN
            ALTER TABLE daily_summary ADD COLUMN total_savings_fonepay NUMERIC DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'daily_summary' AND column_name = 'total_savings_esewa') THEN
            ALTER TABLE daily_summary ADD COLUMN total_savings_esewa NUMERIC DEFAULT 0;
        END IF;

        -- Add enhanced withdrawal columns
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'daily_summary' AND column_name = 'total_withdrawals_cooperative') THEN
            ALTER TABLE daily_summary ADD COLUMN total_withdrawals_cooperative NUMERIC DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'daily_summary' AND column_name = 'total_withdrawals_cooperative_cash') THEN
            ALTER TABLE daily_summary ADD COLUMN total_withdrawals_cooperative_cash NUMERIC DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'daily_summary' AND column_name = 'total_withdrawals_cooperative_esewa') THEN
            ALTER TABLE daily_summary ADD COLUMN total_withdrawals_cooperative_esewa NUMERIC DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'daily_summary' AND column_name = 'total_withdrawals_cooperative_fonepay') THEN
            ALTER TABLE daily_summary ADD COLUMN total_withdrawals_cooperative_fonepay NUMERIC DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'daily_summary' AND column_name = 'total_withdrawals_bank') THEN
            ALTER TABLE daily_summary ADD COLUMN total_withdrawals_bank NUMERIC DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'daily_summary' AND column_name = 'total_withdrawals_bank_cash') THEN
            ALTER TABLE daily_summary ADD COLUMN total_withdrawals_bank_cash NUMERIC DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'daily_summary' AND column_name = 'total_withdrawals_bank_esewa') THEN
            ALTER TABLE daily_summary ADD COLUMN total_withdrawals_bank_esewa NUMERIC DEFAULT 0;
        END IF;

        -- Add enhanced total income columns
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'daily_summary' AND column_name = 'total_cash_income') THEN
            ALTER TABLE daily_summary ADD COLUMN total_cash_income NUMERIC DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'daily_summary' AND column_name = 'total_fonepay_income') THEN
            ALTER TABLE daily_summary ADD COLUMN total_fonepay_income NUMERIC DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'daily_summary' AND column_name = 'total_esewa_income') THEN
            ALTER TABLE daily_summary ADD COLUMN total_esewa_income NUMERIC DEFAULT 0;
        END IF;

        -- Add enhanced balance columns
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'daily_summary' AND column_name = 'fonepay_balance') THEN
            ALTER TABLE daily_summary ADD COLUMN fonepay_balance NUMERIC DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'daily_summary' AND column_name = 'cooperative_balance') THEN
            ALTER TABLE daily_summary ADD COLUMN cooperative_balance NUMERIC DEFAULT 0;
        END IF;

        RAISE NOTICE 'Enhanced daily_summary columns added successfully';
    ELSE
        RAISE NOTICE 'daily_summary table does not exist';
    END IF;
END $$;

-- Create a function to safely get column values with fallbacks
CREATE OR REPLACE FUNCTION safe_get_daily_summary_value(
    summary_row daily_summary,
    primary_column text,
    fallback_column text DEFAULT NULL
) RETURNS NUMERIC AS $$
BEGIN
    -- This function will be implemented in application code
    -- For now, just return 0 as default
    RETURN 0;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION safe_get_daily_summary_value(daily_summary, text, text) TO authenticated;

RAISE NOTICE 'Daily summary schema mismatch fixed! Enhanced columns are now available.';
