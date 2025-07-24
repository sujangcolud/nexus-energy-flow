-- Immediate Fix for Column Error During Order Submission
-- This adds the missing column to stop the 42703 error

-- Add the missing column that database triggers are trying to access
DO $$
BEGIN
    -- Check if the column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'daily_summary' 
        AND column_name = 'total_income_fonepay'
    ) THEN
        ALTER TABLE daily_summary ADD COLUMN total_income_fonepay NUMERIC DEFAULT 0;
        RAISE NOTICE 'Added missing column total_income_fonepay to daily_summary table';
    ELSE
        RAISE NOTICE 'Column total_income_fonepay already exists in daily_summary table';
    END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'daily_summary' 
AND column_name = 'total_income_fonepay';

-- Test message
SELECT 'Column error fix applied successfully! Orders should now work normally.' as status;
