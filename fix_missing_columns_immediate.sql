-- Immediate Fix for Missing Columns in daily_summary Table
-- This adds all the columns that database triggers are trying to access

DO $$
BEGIN
    -- Add missing columns one by one, checking if they exist first
    
    -- Income columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_summary' AND column_name = 'total_income_esewa') THEN
        ALTER TABLE daily_summary ADD COLUMN total_income_esewa NUMERIC DEFAULT 0;
        RAISE NOTICE 'Added column: total_income_esewa';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_summary' AND column_name = 'total_income_fonepay') THEN
        ALTER TABLE daily_summary ADD COLUMN total_income_fonepay NUMERIC DEFAULT 0;
        RAISE NOTICE 'Added column: total_income_fonepay';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_summary' AND column_name = 'total_income_cash') THEN
        ALTER TABLE daily_summary ADD COLUMN total_income_cash NUMERIC DEFAULT 0;
        RAISE NOTICE 'Added column: total_income_cash';
    END IF;
    
    -- Enhanced income breakdown columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_summary' AND column_name = 'total_income_from_orders_cash') THEN
        ALTER TABLE daily_summary ADD COLUMN total_income_from_orders_cash NUMERIC DEFAULT 0;
        RAISE NOTICE 'Added column: total_income_from_orders_cash';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_summary' AND column_name = 'total_income_from_orders_esewa') THEN
        ALTER TABLE daily_summary ADD COLUMN total_income_from_orders_esewa NUMERIC DEFAULT 0;
        RAISE NOTICE 'Added column: total_income_from_orders_esewa';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_summary' AND column_name = 'total_income_from_orders_fonepay') THEN
        ALTER TABLE daily_summary ADD COLUMN total_income_from_orders_fonepay NUMERIC DEFAULT 0;
        RAISE NOTICE 'Added column: total_income_from_orders_fonepay';
    END IF;
    
    -- Charging income breakdown
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_summary' AND column_name = 'total_income_from_charging_cash') THEN
        ALTER TABLE daily_summary ADD COLUMN total_income_from_charging_cash NUMERIC DEFAULT 0;
        RAISE NOTICE 'Added column: total_income_from_charging_cash';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_summary' AND column_name = 'total_income_from_charging_esewa') THEN
        ALTER TABLE daily_summary ADD COLUMN total_income_from_charging_esewa NUMERIC DEFAULT 0;
        RAISE NOTICE 'Added column: total_income_from_charging_esewa';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_summary' AND column_name = 'total_income_from_charging_fonepay') THEN
        ALTER TABLE daily_summary ADD COLUMN total_income_from_charging_fonepay NUMERIC DEFAULT 0;
        RAISE NOTICE 'Added column: total_income_from_charging_fonepay';
    END IF;
    
    -- Expense breakdown columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_summary' AND column_name = 'total_expenses_cash') THEN
        ALTER TABLE daily_summary ADD COLUMN total_expenses_cash NUMERIC DEFAULT 0;
        RAISE NOTICE 'Added column: total_expenses_cash';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_summary' AND column_name = 'total_expenses_esewa') THEN
        ALTER TABLE daily_summary ADD COLUMN total_expenses_esewa NUMERIC DEFAULT 0;
        RAISE NOTICE 'Added column: total_expenses_esewa';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_summary' AND column_name = 'total_expenses_fonepay') THEN
        ALTER TABLE daily_summary ADD COLUMN total_expenses_fonepay NUMERIC DEFAULT 0;
        RAISE NOTICE 'Added column: total_expenses_fonepay';
    END IF;
    
    -- Additional balance columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_summary' AND column_name = 'fonepay_balance') THEN
        ALTER TABLE daily_summary ADD COLUMN fonepay_balance NUMERIC DEFAULT 0;
        RAISE NOTICE 'Added column: fonepay_balance';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_summary' AND column_name = 'cooperative_balance') THEN
        ALTER TABLE daily_summary ADD COLUMN cooperative_balance NUMERIC DEFAULT 0;
        RAISE NOTICE 'Added column: cooperative_balance';
    END IF;
    
    -- Total income alternatives
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_summary' AND column_name = 'total_cash_income') THEN
        ALTER TABLE daily_summary ADD COLUMN total_cash_income NUMERIC DEFAULT 0;
        RAISE NOTICE 'Added column: total_cash_income';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_summary' AND column_name = 'total_esewa_income') THEN
        ALTER TABLE daily_summary ADD COLUMN total_esewa_income NUMERIC DEFAULT 0;
        RAISE NOTICE 'Added column: total_esewa_income';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_summary' AND column_name = 'total_fonepay_income') THEN
        ALTER TABLE daily_summary ADD COLUMN total_fonepay_income NUMERIC DEFAULT 0;
        RAISE NOTICE 'Added column: total_fonepay_income';
    END IF;
    
    RAISE NOTICE 'All missing columns have been added to daily_summary table';
    
END $$;

-- Verify what columns now exist
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'daily_summary' 
AND column_name LIKE '%income%'
ORDER BY column_name;

-- Test message
SELECT 'Column fix complete! Order submission should work now.' as status;
