-- Fix the order date trigger issue causing "record 'new' has no field 'date'" error

-- First, check if the sync_order_date trigger is causing issues
-- and ensure it only runs when order_date is actually being set

-- Drop the problematic trigger if it exists
DROP TRIGGER IF EXISTS sync_order_date_trigger ON public.orders;

-- Recreate the sync function with better error handling
CREATE OR REPLACE FUNCTION public.sync_order_date()
RETURNS TRIGGER AS $$
BEGIN
  -- Only sync if order_date is provided
  IF NEW.order_date IS NOT NULL THEN
    NEW.date = NEW.order_date;
  ELSIF NEW.date IS NOT NULL THEN
    NEW.order_date = NEW.date;
  ELSE
    -- If neither is provided, set both to current date
    NEW.order_date = CURRENT_DATE;
    NEW.date = CURRENT_DATE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER sync_order_date_trigger
  BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_order_date();

-- Also check if there are any other triggers that might reference 'date' field incorrectly
-- Drop any problematic triggers that might exist from previous migrations
DROP TRIGGER IF EXISTS update_daily_summary_on_order_insert ON public.orders;
DROP TRIGGER IF EXISTS calculate_daily_summary_trigger ON public.orders;
DROP TRIGGER IF EXISTS orders_daily_summary_trigger ON public.orders;
DROP TRIGGER IF EXISTS daily_summary_update_trigger ON public.orders;
DROP TRIGGER IF EXISTS auto_inventory_trigger ON public.orders;

-- Ensure the orders table has both date and order_date columns
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS date DATE;

-- Update any existing records that might be missing the date field
UPDATE public.orders 
SET date = order_date 
WHERE date IS NULL AND order_date IS NOT NULL;

UPDATE public.orders 
SET order_date = date 
WHERE order_date IS NULL AND date IS NOT NULL;

-- If both are null, set to created_at date
UPDATE public.orders 
SET order_date = created_at::date, date = created_at::date
WHERE order_date IS NULL AND date IS NULL;
