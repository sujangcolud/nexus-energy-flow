-- Update the insert_order_safe function to include the date field to avoid trigger conflicts

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
  -- Insert the order directly with SQL including both order_date and date fields
  -- to satisfy any triggers that might expect a 'date' field
  INSERT INTO public.orders (user_id, item_name, quantity, rate, total, payment_mode, order_date, date)
  VALUES (p_user_id, p_item_name, p_quantity, p_rate, p_total, p_payment_mode, p_order_date, p_order_date)
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.insert_order_safe TO authenticated;
