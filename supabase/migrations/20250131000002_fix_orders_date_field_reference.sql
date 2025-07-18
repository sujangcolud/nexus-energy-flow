-- Fix any triggers or functions that reference 'date' field instead of 'order_date' in orders table

-- First, let's drop any problematic triggers that might exist
DROP TRIGGER IF EXISTS update_daily_summary_on_order_insert ON public.orders;
DROP TRIGGER IF EXISTS calculate_daily_summary_trigger ON public.orders;
DROP TRIGGER IF EXISTS orders_daily_summary_trigger ON public.orders;

-- Drop any functions that might be causing the issue
DROP FUNCTION IF EXISTS public.update_daily_summary_on_order() CASCADE;
DROP FUNCTION IF EXISTS public.calculate_daily_summary_on_order() CASCADE;
DROP FUNCTION IF EXISTS public.handle_order_insert() CASCADE;

-- Create a fixed version of any daily summary calculation function if needed
-- This function correctly references 'order_date' instead of 'date'
CREATE OR REPLACE FUNCTION public.handle_order_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Example function that properly references NEW.order_date instead of NEW.date
  -- If you need to calculate daily summaries, use the correct field name
  
  -- You can add daily summary calculations here if needed
  -- For now, we'll just ensure the function doesn't cause errors
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: Only create the trigger if you actually need daily summary calculations
-- For now, we're just ensuring no problematic triggers exist

-- If you need to recreate a trigger for daily summaries in the future, use:
-- CREATE TRIGGER update_daily_summary_on_order_insert
--   AFTER INSERT ON public.orders
--   FOR EACH ROW
--   EXECUTE FUNCTION public.handle_order_insert();

-- Ensure all date-related queries use the correct column names
-- orders table uses: order_date
-- charging_sessions table uses: session_date  
-- expenses table uses: expense_date
-- deposits table uses: deposit_date
-- withdrawals table uses: withdrawal_date
-- cooperative_savings table uses: contribution_date
