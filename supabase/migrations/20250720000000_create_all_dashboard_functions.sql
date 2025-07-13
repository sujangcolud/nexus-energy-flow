CREATE OR REPLACE FUNCTION get_monthly_financial_summary()
RETURNS TABLE(month TEXT, revenue NUMERIC, expenses NUMERIC, profit NUMERIC) AS $$
BEGIN
    RETURN QUERY
    WITH monthly_revenue AS (
        SELECT
            to_char(order_date, 'YYYY-MM') AS month,
            SUM(total) AS monthly_revenue
        FROM orders
        GROUP BY to_char(order_date, 'YYYY-MM')
    ),
    monthly_charging_revenue AS (
        SELECT
            to_char(session_date, 'YYYY-MM') AS month,
            SUM(total_amount) AS monthly_charging_revenue
        FROM charging_sessions
        GROUP BY to_char(session_date, 'YYYY-MM')
    ),
    monthly_expenses AS (
        SELECT
            to_char(expense_date, 'YYYY-MM') AS month,
            SUM(amount) AS monthly_expenses
        FROM expenses
        GROUP BY to_char(expense_date, 'YYYY-MM')
    )
    SELECT
        m.month,
        COALESCE(mr.monthly_revenue, 0) + COALESCE(mcr.monthly_charging_revenue, 0) AS revenue,
        COALESCE(me.monthly_expenses, 0) AS expenses,
        (COALESCE(mr.monthly_revenue, 0) + COALESCE(mcr.monthly_charging_revenue, 0)) - COALESCE(me.monthly_expenses, 0) AS profit
    FROM (
        SELECT to_char(date_series, 'YYYY-MM') AS month
        FROM generate_series(
            (SELECT MIN(order_date) FROM orders),
            (SELECT MAX(order_date) FROM orders),
            '1 month'
        ) AS date_series
    ) m
    LEFT JOIN monthly_revenue mr ON m.month = mr.month
    LEFT JOIN monthly_charging_revenue mcr ON m.month = mcr.month
    LEFT JOIN monthly_expenses me ON m.month = me.month
    ORDER BY m.month;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_income_breakdown()
RETURNS TABLE(source TEXT, amount NUMERIC) AS $$
BEGIN
    RETURN QUERY
    SELECT 'Orders' AS source, SUM(total) AS amount FROM orders
    UNION ALL
    SELECT 'Charging' AS source, SUM(total_amount) AS amount FROM charging_sessions;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_expense_categorization()
RETURNS TABLE(category TEXT, amount NUMERIC) AS $$
BEGIN
    RETURN QUERY
    SELECT
        category,
        SUM(amount) AS amount
    FROM expenses
    GROUP BY category;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_monthly_deposits_withdrawals()
RETURNS TABLE(month TEXT, deposits NUMERIC, withdrawals NUMERIC) AS $$
BEGIN
    RETURN QUERY
    WITH monthly_deposits AS (
        SELECT
            to_char(deposit_date, 'YYYY-MM') AS month,
            SUM(amount) AS monthly_deposits
        FROM deposits
        GROUP BY to_char(deposit_date, 'YYYY-MM')
    ),
    monthly_withdrawals AS (
        SELECT
            to_char(withdrawal_date, 'YYYY-MM') AS month,
            SUM(amount) AS monthly_withdrawals
        FROM withdrawals
        GROUP BY to_char(withdrawal_date, 'YYYY-MM')
    )
    SELECT
        m.month,
        COALESCE(md.monthly_deposits, 0) AS deposits,
        COALESCE(mw.monthly_withdrawals, 0) AS withdrawals
    FROM (
        SELECT to_char(date_series, 'YYYY-MM') AS month
        FROM generate_series(
            (SELECT MIN(deposit_date) FROM deposits),
            (SELECT MAX(deposit_date) FROM deposits),
            '1 month'
        ) AS date_series
    ) m
    LEFT JOIN monthly_deposits md ON m.month = md.month
    LEFT JOIN monthly_withdrawals mw ON m.month = mw.month
    ORDER BY m.month;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_new_user_growth()
RETURNS TABLE(month TEXT, new_users BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT
        to_char(created_at, 'YYYY-MM') AS month,
        COUNT(*) AS new_users
    FROM auth.users
    GROUP BY to_char(created_at, 'YYYY-MM')
    ORDER BY month;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_user_role_distribution()
RETURNS TABLE(role app_role, user_count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT
        role,
        COUNT(*) AS user_count
    FROM user_roles
    GROUP BY role;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_top_spenders(limit_count INT)
RETURNS TABLE(email TEXT, total_spent NUMERIC) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.email,
        SUM(o.total) AS total_spent
    FROM orders o
    JOIN profiles p ON o.user_id = p.id
    GROUP BY p.email
    ORDER BY total_spent DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_popular_products()
RETURNS TABLE(item_name TEXT, purchase_count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT
        item_name,
        COUNT(*) AS purchase_count
    FROM orders
    GROUP BY item_name
    ORDER BY purchase_count DESC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_sales_by_payment_mode()
RETURNS TABLE(payment_mode TEXT, total_sales NUMERIC) AS $$
BEGIN
    RETURN QUERY
    SELECT
        payment_mode,
        SUM(total) AS total_sales
    FROM orders
    GROUP BY payment_mode;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_cooperative_savings_trend()
RETURNS TABLE(month TEXT, total_savings NUMERIC) AS $$
BEGIN
    RETURN QUERY
    SELECT
        to_char(contribution_date, 'YYYY-MM') AS month,
        SUM(contribution_amount) AS total_savings
    FROM cooperative_savings
    GROUP BY to_char(contribution_date, 'YYYY-MM')
    ORDER BY month;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_menu_item_availability()
RETURNS TABLE(status TEXT, item_count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT
        CASE
            WHEN is_available THEN 'Available'
            ELSE 'Unavailable'
        END AS status,
        COUNT(*) AS item_count
    FROM menu_items
    GROUP BY is_available;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_monthly_financial_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION get_income_breakdown() TO authenticated;
GRANT EXECUTE ON FUNCTION get_expense_categorization() TO authenticated;
GRANT EXECUTE ON FUNCTION get_monthly_deposits_withdrawals() TO authenticated;
GRANT EXECUTE ON FUNCTION get_new_user_growth() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_role_distribution() TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_spenders(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_popular_products() TO authenticated;
GRANT EXECUTE ON FUNCTION get_sales_by_payment_mode() TO authenticated;
GRANT EXECUTE ON FUNCTION get_cooperative_savings_trend() TO authenticated;
GRANT EXECUTE ON FUNCTION get_menu_item_availability() TO authenticated;

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
