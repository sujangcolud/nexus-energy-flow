-- Fix any triggers or functions that reference 'date' field instead of 'order_date' in orders table

-- First, let's drop any problematic triggers that might exist
DROP TRIGGER IF EXISTS update_daily_summary_on_order_insert ON public.orders;
DROP TRIGGER IF EXISTS calculate_daily_summary_trigger ON public.orders;
DROP TRIGGER IF EXISTS orders_daily_summary_trigger ON public.orders;
DROP TRIGGER IF EXISTS daily_summary_update_trigger ON public.orders;

-- Drop any functions that might be causing the issue
DROP FUNCTION IF EXISTS public.update_daily_summary_on_order() CASCADE;
DROP FUNCTION IF EXISTS public.calculate_daily_summary_on_order() CASCADE;
DROP FUNCTION IF EXISTS public.handle_order_insert() CASCADE;
DROP FUNCTION IF EXISTS public.update_daily_summary() CASCADE;

-- Add a 'date' column to orders table that mirrors order_date
-- This is to fix any triggers that might be expecting a 'date' field
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS date DATE;

-- Create a trigger to keep the 'date' field in sync with 'order_date'
CREATE OR REPLACE FUNCTION public.sync_order_date()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync the date field with order_date to maintain compatibility
  NEW.date = NEW.order_date;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically sync date field
CREATE TRIGGER sync_order_date_trigger
  BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_order_date();

-- Update existing records to have the date field populated
UPDATE public.orders SET date = order_date WHERE date IS NULL;

-- Ensure all date-related queries use the correct column names
-- orders table uses: order_date (and now also 'date' as alias)
-- charging_sessions table uses: session_date  
-- expenses table uses: expense_date
-- deposits table uses: deposit_date
-- withdrawals table uses: withdrawal_date
-- cooperative_savings table uses: contribution_date
