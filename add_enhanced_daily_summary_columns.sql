-- Migration script to add enhanced daily summary columns
-- This adds the missing columns from the new schema to the existing table

-- Add missing withdrawal cash tracking columns
ALTER TABLE daily_summary 
ADD COLUMN IF NOT EXISTS total_withdrawals_cash NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_withdrawals_cooperative_cash NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_withdrawals_cooperative_esewa NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_withdrawals_cooperative_fonepay NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_withdrawals_bank_cash NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_withdrawals_bank_esewa NUMERIC DEFAULT 0;

-- Add enhanced income breakdown columns
ALTER TABLE daily_summary 
ADD COLUMN IF NOT EXISTS total_income_from_orders_cash NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_income_from_orders_fonepay NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_income_from_orders_esewa NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_income_from_charging_fonepay NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_income_from_charging_esewa NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_income_from_charging_cash NUMERIC DEFAULT 0;

-- Update calculation function to populate the new columns
CREATE OR REPLACE FUNCTION update_enhanced_daily_summary_columns(target_date DATE)
RETURNS VOID AS $$
DECLARE
    -- Variables for enhanced calculations
    v_orders_cash numeric := 0;
    v_orders_fonepay numeric := 0;
    v_orders_esewa numeric := 0;
    v_charging_cash numeric := 0;
    v_charging_fonepay numeric := 0;
    v_charging_esewa numeric := 0;
    v_withdrawals_cash numeric := 0;
    v_withdrawals_coop_cash numeric := 0;
    v_withdrawals_coop_esewa numeric := 0;
    v_withdrawals_coop_fonepay numeric := 0;
    v_withdrawals_bank_cash numeric := 0;
    v_withdrawals_bank_esewa numeric := 0;
BEGIN
    -- Calculate Orders breakdown by payment mode
    SELECT 
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) LIKE '%cash%' THEN total ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) LIKE '%fonepay%' OR LOWER(payment_mode) LIKE '%bank%' THEN total ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) LIKE '%esewa%' THEN total ELSE 0 END), 0)
    INTO v_orders_cash, v_orders_fonepay, v_orders_esewa
    FROM orders 
    WHERE order_date = target_date;
    
    -- Calculate Charging breakdown by payment mode
    SELECT 
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) LIKE '%cash%' THEN total_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) LIKE '%fonepay%' OR LOWER(payment_mode) LIKE '%bank%' THEN total_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) LIKE '%esewa%' THEN total_amount ELSE 0 END), 0)
    INTO v_charging_cash, v_charging_fonepay, v_charging_esewa
    FROM charging_sessions 
    WHERE session_date = target_date;
    
    -- Calculate Withdrawals breakdown by source and payment mode
    SELECT 
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) LIKE '%cash%' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN withdrawal_from = 'Cooperative' AND LOWER(payment_mode) LIKE '%cash%' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN withdrawal_from = 'Cooperative' AND LOWER(payment_mode) LIKE '%esewa%' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN withdrawal_from = 'Cooperative' AND LOWER(payment_mode) LIKE '%fonepay%' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN withdrawal_from = 'Bank' AND LOWER(payment_mode) LIKE '%cash%' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN withdrawal_from = 'Bank' AND LOWER(payment_mode) LIKE '%esewa%' THEN amount ELSE 0 END), 0)
    INTO v_withdrawals_cash, v_withdrawals_coop_cash, v_withdrawals_coop_esewa, 
         v_withdrawals_coop_fonepay, v_withdrawals_bank_cash, v_withdrawals_bank_esewa
    FROM withdrawals 
    WHERE withdrawal_date = target_date;
    
    -- Update the daily_summary record with enhanced breakdown
    UPDATE daily_summary 
    SET 
        total_income_from_orders_cash = v_orders_cash,
        total_income_from_orders_fonepay = v_orders_fonepay,
        total_income_from_orders_esewa = v_orders_esewa,
        total_income_from_charging_cash = v_charging_cash,
        total_income_from_charging_fonepay = v_charging_fonepay,
        total_income_from_charging_esewa = v_charging_esewa,
        total_withdrawals_cash = v_withdrawals_cash,
        total_withdrawals_cooperative_cash = v_withdrawals_coop_cash,
        total_withdrawals_cooperative_esewa = v_withdrawals_coop_esewa,
        total_withdrawals_cooperative_fonepay = v_withdrawals_coop_fonepay,
        total_withdrawals_bank_cash = v_withdrawals_bank_cash,
        total_withdrawals_bank_esewa = v_withdrawals_bank_esewa,
        updated_at = NOW()
    WHERE summary_date = target_date;
    
    -- If no record exists, create one with the enhanced data
    IF NOT FOUND THEN
        INSERT INTO daily_summary (
            summary_date,
            total_income_from_orders_cash,
            total_income_from_orders_fonepay,
            total_income_from_orders_esewa,
            total_income_from_charging_cash,
            total_income_from_charging_fonepay,
            total_income_from_charging_esewa,
            total_withdrawals_cash,
            total_withdrawals_cooperative_cash,
            total_withdrawals_cooperative_esewa,
            total_withdrawals_cooperative_fonepay,
            total_withdrawals_bank_cash,
            total_withdrawals_bank_esewa
        ) VALUES (
            target_date,
            v_orders_cash,
            v_orders_fonepay,
            v_orders_esewa,
            v_charging_cash,
            v_charging_fonepay,
            v_charging_esewa,
            v_withdrawals_cash,
            v_withdrawals_coop_cash,
            v_withdrawals_coop_esewa,
            v_withdrawals_coop_fonepay,
            v_withdrawals_bank_cash,
            v_withdrawals_bank_esewa
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_enhanced_daily_summary_columns(date) TO authenticated;

-- Add comment
COMMENT ON FUNCTION update_enhanced_daily_summary_columns IS 'Update daily summary with enhanced payment mode breakdowns for orders, charging, and withdrawals';

-- Example: Update all existing daily summaries with enhanced data
-- (Run this after the migration to populate the new columns)
-- DO $$
-- DECLARE
--     rec RECORD;
-- BEGIN
--     FOR rec IN SELECT DISTINCT summary_date FROM daily_summary ORDER BY summary_date
--     LOOP
--         PERFORM update_enhanced_daily_summary_columns(rec.summary_date);
--     END LOOP;
-- END $$;
