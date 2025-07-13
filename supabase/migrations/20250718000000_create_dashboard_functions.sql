CREATE OR REPLACE FUNCTION public.get_total_revenue()
RETURNS NUMERIC AS $$
DECLARE
  total_revenue NUMERIC;
BEGIN
  SELECT
    (
      (SELECT COALESCE(SUM(total), 0) FROM public.orders) +
      (SELECT COALESCE(SUM(total_amount), 0) FROM public.charging_sessions)
    )
  INTO total_revenue;

  RETURN total_revenue;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_total_expenses()
RETURNS NUMERIC AS $$
DECLARE
  total_expenses NUMERIC;
BEGIN
  SELECT
    (
      (SELECT COALESCE(SUM(amount), 0) FROM public.expenses) +
      (SELECT COALESCE(SUM(amount), 0) FROM public.static_expenses WHERE is_recurring = false) +
      (SELECT COALESCE(SUM(amount), 0) FROM public.static_expenses WHERE is_recurring = true) -- This should be handled more carefully for monthly recurring expenses
    )
  INTO total_expenses;

  RETURN total_expenses;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_new_users()
RETURNS INTEGER AS $$
DECLARE
  new_users_count INTEGER;
BEGIN
  SELECT
    COUNT(*)
  INTO new_users_count
  FROM auth.users
  WHERE created_at >= NOW() - INTERVAL '30 days';

  RETURN new_users_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_total_revenue() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_total_expenses() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_new_users() TO authenticated;
