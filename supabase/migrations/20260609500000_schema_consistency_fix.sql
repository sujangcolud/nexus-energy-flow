
-- Schema update for missing columns and consistency
-- This migration adds the required columns for proper accounting tracking.

DO $$
BEGIN
    -- Add payment_mode to cooperative_savings
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'cooperative_savings' AND column_name = 'payment_mode'
    ) THEN
        ALTER TABLE public.cooperative_savings ADD COLUMN payment_mode TEXT DEFAULT 'Cash';
    END IF;

    -- Ensure daily_summary has all required aggregation columns
    -- Some might exist from previous partial migrations, adding IF NOT EXISTS for safety
    ALTER TABLE public.daily_summary
    ADD COLUMN IF NOT EXISTS total_income_from_orders_cash NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_income_from_orders_esewa NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_income_from_orders_fonepay NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_income_from_charging_cash NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_income_from_charging_esewa NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_income_from_charging_fonepay NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_withdrawals_cash NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_deposits_from_cash NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS system_cash_calculation NUMERIC DEFAULT 0;

END $$;
