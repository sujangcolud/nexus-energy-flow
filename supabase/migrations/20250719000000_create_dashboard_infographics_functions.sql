-- Function to get monthly financial summary
CREATE OR REPLACE FUNCTION public.get_monthly_financial_summary()
RETURNS TABLE (
  month TEXT,
  revenue NUMERIC,
  expenses NUMERIC,
  profit NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH months AS (
    SELECT TO_CHAR(d, 'YYYY-MM') AS month
    FROM GENERATE_SERIES(
      DATE_TRUNC('month', NOW() - INTERVAL '11 months'),
      DATE_TRUNC('month', NOW()),
      '1 month'
    ) AS d
  ),
  monthly_revenue AS (
    SELECT
      TO_CHAR(order_date, 'YYYY-MM') AS month,
      SUM(total) AS total_revenue
    FROM public.orders
    GROUP BY 1
    UNION ALL
    SELECT
      TO_CHAR(session_date, 'YYYY-MM') AS month,
      SUM(total_amount) AS total_revenue
    FROM public.charging_sessions
    GROUP BY 1
  ),
  monthly_expenses AS (
    SELECT
      TO_CHAR(expense_date, 'YYYY-MM') AS month,
      SUM(amount) AS total_expenses
    FROM public.expenses
    GROUP BY 1
  )
  SELECT
    m.month,
    COALESCE(SUM(r.total_revenue), 0) AS revenue,
    COALESCE(SUM(e.total_expenses), 0) AS expenses,
    COALESCE(SUM(r.total_revenue), 0) - COALESCE(SUM(e.total_expenses), 0) AS profit
  FROM months m
  LEFT JOIN monthly_revenue r ON m.month = r.month
  LEFT JOIN monthly_expenses e ON m.month = e.month
  GROUP BY m.month
  ORDER BY m.month;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get income breakdown
CREATE OR REPLACE FUNCTION public.get_income_breakdown()
RETURNS TABLE (
  source TEXT,
  amount NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 'Orders' AS source, COALESCE(SUM(total), 0) AS amount FROM public.orders
  UNION ALL
  SELECT 'Charging Sessions' AS source, COALESCE(SUM(total_amount), 0) AS amount FROM public.charging_sessions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get expense categorization
CREATE OR REPLACE FUNCTION public.get_expense_categorization()
RETURNS TABLE (
  category TEXT,
  amount NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.category,
    SUM(e.amount) AS amount
  FROM public.expenses e
  GROUP BY e.category
  ORDER BY amount DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get monthly deposits and withdrawals
CREATE OR REPLACE FUNCTION public.get_monthly_deposits_withdrawals()
RETURNS TABLE (
  month TEXT,
  deposits NUMERIC,
  withdrawals NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH months AS (
    SELECT TO_CHAR(d, 'YYYY-MM') AS month
    FROM GENERATE_SERIES(
      DATE_TRUNC('month', NOW() - INTERVAL '11 months'),
      DATE_TRUNC('month', NOW()),
      '1 month'
    ) AS d
  ),
  monthly_deposits AS (
    SELECT
      TO_CHAR(deposit_date, 'YYYY-MM') AS month,
      SUM(amount) AS total_deposits
    FROM public.deposits
    GROUP BY 1
  ),
  monthly_withdrawals AS (
    SELECT
      TO_CHAR(withdrawal_date, 'YYYY-MM') AS month,
      SUM(amount) AS total_withdrawals
    FROM public.withdrawals
    GROUP BY 1
  )
  SELECT
    m.month,
    COALESCE(SUM(d.total_deposits), 0) AS deposits,
    COALESCE(SUM(w.total_withdrawals), 0) AS withdrawals
  FROM months m
  LEFT JOIN monthly_deposits d ON m.month = d.month
  LEFT JOIN monthly_withdrawals w ON m.month = w.month
  GROUP BY m.month
  ORDER BY m.month;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get new user growth
CREATE OR REPLACE FUNCTION public.get_new_user_growth()
RETURNS TABLE (
  month TEXT,
  new_users BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH months AS (
    SELECT TO_CHAR(d, 'YYYY-MM') AS month
    FROM GENERATE_SERIES(
      DATE_TRUNC('month', NOW() - INTERVAL '11 months'),
      DATE_TRUNC('month', NOW()),
      '1 month'
    ) AS d
  )
  SELECT
    m.month,
    COUNT(u.id) AS new_users
  FROM months m
  LEFT JOIN auth.users u ON TO_CHAR(u.created_at, 'YYYY-MM') = m.month
  GROUP BY m.month
  ORDER BY m.month;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user role distribution
CREATE OR REPLACE FUNCTION public.get_user_role_distribution()
RETURNS TABLE (
  role public.app_role,
  user_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.role,
    COUNT(r.user_id) AS user_count
  FROM public.user_roles r
  GROUP BY r.role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get top spenders
CREATE OR REPLACE FUNCTION public.get_top_spenders(
  limit_count INT DEFAULT 5
)
RETURNS TABLE (
  email TEXT,
  total_spent NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH user_spending AS (
    SELECT
      user_id,
      SUM(total) AS spent
    FROM public.orders
    GROUP BY user_id
    UNION ALL
    SELECT
      user_id,
      SUM(total_amount) AS spent
    FROM public.charging_sessions
    GROUP BY user_id
  )
  SELECT
    p.email,
    SUM(us.spent) AS total_spent
  FROM user_spending us
  JOIN public.profiles p ON us.user_id = p.id
  GROUP BY p.email
  ORDER BY total_spent DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_monthly_financial_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_income_breakdown() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_expense_categorization() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_monthly_deposits_withdrawals() TO authenticated;
-- Function to get popular products/services
CREATE OR REPLACE FUNCTION public.get_popular_products()
RETURNS TABLE (
  item_name TEXT,
  purchase_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.item_name,
    COUNT(*) AS purchase_count
  FROM public.orders o
  GROUP BY o.item_name
  ORDER BY purchase_count DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get sales by payment mode
CREATE OR REPLACE FUNCTION public.get_sales_by_payment_mode()
RETURNS TABLE (
  payment_mode TEXT,
  total_sales NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH all_sales AS (
    SELECT payment_mode, total AS sales_amount FROM public.orders
    UNION ALL
    SELECT payment_mode, total_amount AS sales_amount FROM public.charging_sessions
  )
  SELECT
    s.payment_mode,
    SUM(s.sales_amount) AS total_sales
  FROM all_sales s
  GROUP BY s.payment_mode;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get cooperative savings trend
CREATE OR REPLACE FUNCTION public.get_cooperative_savings_trend()
RETURNS TABLE (
  month TEXT,
  total_savings NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH months AS (
    SELECT TO_CHAR(d, 'YYYY-MM') AS month
    FROM GENERATE_SERIES(
      DATE_TRUNC('month', NOW() - INTERVAL '11 months'),
      DATE_TRUNC('month', NOW()),
      '1 month'
    ) AS d
  )
  SELECT
    m.month,
    COALESCE(SUM(cs.contribution_amount), 0) AS total_savings
  FROM months m
  LEFT JOIN public.cooperative_savings cs ON TO_CHAR(cs.contribution_date, 'YYYY-MM') = m.month
  GROUP BY m.month
  ORDER BY m.month;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get menu item availability
CREATE OR REPLACE FUNCTION public.get_menu_item_availability()
RETURNS TABLE (
  status TEXT,
  item_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE WHEN is_available THEN 'Available' ELSE 'Unavailable' END AS status,
    COUNT(*) AS item_count
  FROM public.menu_items
  GROUP BY is_available;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_new_user_growth() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role_distribution() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_top_spenders() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_popular_products() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sales_by_payment_mode() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cooperative_savings_trend() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_menu_item_availability() TO authenticated;
