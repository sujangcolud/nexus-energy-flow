-- Comprehensive fix for order date field issues causing "record 'new' has no field 'date'" error

-- 1. Ensure the orders table has both date and order_date columns
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS date DATE;

-- 2. Drop and recreate any problematic triggers
DROP TRIGGER IF EXISTS sync_order_date_trigger ON public.orders;
DROP TRIGGER IF EXISTS update_daily_summary_on_order_insert ON public.orders;
DROP TRIGGER IF EXISTS calculate_daily_summary_trigger ON public.orders;
DROP TRIGGER IF EXISTS orders_daily_summary_trigger ON public.orders;
DROP TRIGGER IF EXISTS daily_summary_update_trigger ON public.orders;
DROP TRIGGER IF EXISTS auto_inventory_trigger ON public.orders;

-- 3. Create a robust sync function that handles both date fields
CREATE OR REPLACE FUNCTION public.sync_order_date()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure both date fields are synchronized
  IF TG_OP = 'INSERT' THEN
    -- On insert, prioritize order_date but fallback to date, then current date
    IF NEW.order_date IS NOT NULL THEN
      NEW.date = NEW.order_date;
    ELSIF NEW.date IS NOT NULL THEN
      NEW.order_date = NEW.date;
    ELSE
      NEW.order_date = CURRENT_DATE;
      NEW.date = CURRENT_DATE;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- On update, sync the fields
    IF NEW.order_date != OLD.order_date THEN
      NEW.date = NEW.order_date;
    ELSIF NEW.date != OLD.date THEN
      NEW.order_date = NEW.date;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create the trigger
CREATE TRIGGER sync_order_date_trigger
  BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_order_date();

-- 5. Update existing records to ensure consistency
UPDATE public.orders 
SET date = order_date 
WHERE date IS NULL AND order_date IS NOT NULL;

UPDATE public.orders 
SET order_date = date 
WHERE order_date IS NULL AND date IS NOT NULL;

-- 6. Set default date for records missing both
UPDATE public.orders 
SET order_date = created_at::date, date = created_at::date
WHERE order_date IS NULL AND date IS NULL;

-- 7. Ensure the insert_order_safe function works with both fields
CREATE OR REPLACE FUNCTION public.insert_order_safe(
  p_user_id uuid,
  p_item_name text,
  p_quantity integer,
  p_rate numeric,
  p_total numeric,
  p_payment_mode text,
  p_order_date date
)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  item_name text,
  quantity integer,
  rate numeric,
  total numeric,
  payment_mode text,
  order_date date,
  date date,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_order_id uuid;
BEGIN
  -- Insert with both date fields to ensure compatibility
  INSERT INTO public.orders (
    user_id, 
    item_name, 
    quantity, 
    rate, 
    total, 
    payment_mode, 
    order_date, 
    date
  ) VALUES (
    p_user_id, 
    p_item_name, 
    p_quantity, 
    p_rate, 
    p_total, 
    p_payment_mode, 
    p_order_date, 
    p_order_date
  )
  RETURNING orders.id INTO new_order_id;
  
  -- Return the inserted order
  RETURN QUERY
  SELECT 
    o.id,
    o.user_id,
    o.item_name,
    o.quantity,
    o.rate,
    o.total,
    o.payment_mode,
    o.order_date,
    o.date,
    o.created_at
  FROM public.orders o
  WHERE o.id = new_order_id;
END;
$$;

-- 8. Grant permissions
GRANT EXECUTE ON FUNCTION public.insert_order_safe TO authenticated;

-- 9. Add helpful comments
COMMENT ON COLUMN public.orders.date IS 'Synchronized copy of order_date for trigger compatibility';
COMMENT ON COLUMN public.orders.order_date IS 'Primary date field for orders';
COMMENT ON FUNCTION public.sync_order_date() IS 'Keeps date and order_date fields synchronized';
COMMENT ON FUNCTION public.insert_order_safe(uuid, text, integer, numeric, numeric, text, date) IS 'Safe order insertion function that handles date field synchronization';
