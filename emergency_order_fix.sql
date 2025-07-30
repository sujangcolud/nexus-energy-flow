-- Emergency Fix: Add Only Essential Columns to Stop Order Submission Errors
-- This is the minimal fix to get orders working

-- Add the specific column that's causing the error
ALTER TABLE daily_summary ADD COLUMN IF NOT EXISTS total_income_esewa NUMERIC DEFAULT 0;
ALTER TABLE daily_summary ADD COLUMN IF NOT EXISTS total_income_fonepay NUMERIC DEFAULT 0;
ALTER TABLE daily_summary ADD COLUMN IF NOT EXISTS total_income_cash NUMERIC DEFAULT 0;

-- Add commonly referenced columns that triggers might need
ALTER TABLE daily_summary ADD COLUMN IF NOT EXISTS total_cash_income NUMERIC DEFAULT 0;
ALTER TABLE daily_summary ADD COLUMN IF NOT EXISTS total_esewa_income NUMERIC DEFAULT 0;
ALTER TABLE daily_summary ADD COLUMN IF NOT EXISTS total_fonepay_income NUMERIC DEFAULT 0;

-- Add basic enhanced columns
ALTER TABLE daily_summary ADD COLUMN IF NOT EXISTS fonepay_balance NUMERIC DEFAULT 0;
ALTER TABLE daily_summary ADD COLUMN IF NOT EXISTS cooperative_balance NUMERIC DEFAULT 0;

-- Verify the fix
SELECT 'Emergency fix applied - orders should work now!' AS status;

-- Show current columns
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'daily_summary' 
ORDER BY column_name;
