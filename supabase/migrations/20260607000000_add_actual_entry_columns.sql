-- Add analytical columns to daily_summary for actual vs system comparison
ALTER TABLE public.daily_summary
ADD COLUMN IF NOT EXISTS actual_cash_in_hand NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_fonepay_total NUMERIC DEFAULT 0;

-- Add generated columns for differences to simplify BI queries
-- Note: Using COALESCE to handle potential nulls
ALTER TABLE public.daily_summary
ADD COLUMN IF NOT EXISTS cash_diff NUMERIC GENERATED ALWAYS AS (actual_cash_in_hand - COALESCE(cash_balance, 0)) STORED,
ADD COLUMN IF NOT EXISTS fonepay_diff NUMERIC GENERATED ALWAYS AS (actual_fonepay_total - COALESCE(total_income_fonepay, 0)) STORED;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
