-- Create missing analytics functions using transaction dates
CREATE OR REPLACE FUNCTION public.get_income_breakdown()
RETURNS TABLE(source text, amount numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 'Orders'::text, COALESCE(SUM(total), 0) FROM orders
    UNION ALL
    SELECT 'Charging'::text, COALESCE(SUM(total_amount), 0) FROM charging_sessions;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_expense_categorization()
RETURNS TABLE(category text, amount numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT e.category, SUM(e.amount)
    FROM expenses e
    GROUP BY e.category
    ORDER BY SUM(e.amount) DESC;
END;
$$;

-- Standardize weekly/monthly trend functions to use proper date columns
CREATE OR REPLACE FUNCTION public.get_daily_orders_30days()
RETURNS TABLE(day date, order_count bigint, total_revenue numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT order_date, COUNT(*), SUM(total)
    FROM orders
    WHERE order_date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY order_date
    ORDER BY order_date;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_daily_expenses_30days()
RETURNS TABLE(day date, expense_count bigint, total_expenses numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT expense_date, COUNT(*), SUM(amount)
    FROM expenses
    WHERE expense_date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY expense_date
    ORDER BY expense_date;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_income_breakdown() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_expense_categorization() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_daily_orders_30days() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_daily_expenses_30days() TO authenticated;
