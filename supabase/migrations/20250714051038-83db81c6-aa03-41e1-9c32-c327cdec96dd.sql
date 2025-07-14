-- Create dashboard analytics functions for SuperAdminDashboard

-- Function for monthly financial summary
CREATE OR REPLACE FUNCTION public.get_monthly_financial_summary()
RETURNS TABLE(month text, revenue numeric, expenses numeric, profit numeric)
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH monthly_data AS (
    SELECT 
      TO_CHAR(date_trunc('month', COALESCE(order_date, created_at)), 'YYYY-MM') as month,
      SUM(total) as revenue
    FROM orders
    WHERE order_date >= CURRENT_DATE - INTERVAL '12 months'
    GROUP BY TO_CHAR(date_trunc('month', COALESCE(order_date, created_at)), 'YYYY-MM')
  ),
  monthly_expenses AS (
    SELECT 
      TO_CHAR(date_trunc('month', COALESCE(expense_date, created_at)), 'YYYY-MM') as month,
      SUM(amount) as expenses
    FROM expenses
    WHERE expense_date >= CURRENT_DATE - INTERVAL '12 months'
    GROUP BY TO_CHAR(date_trunc('month', COALESCE(expense_date, created_at)), 'YYYY-MM')
  )
  SELECT 
    COALESCE(md.month, me.month) as month,
    COALESCE(md.revenue, 0) as revenue,
    COALESCE(me.expenses, 0) as expenses,
    COALESCE(md.revenue, 0) - COALESCE(me.expenses, 0) as profit
  FROM monthly_data md
  FULL OUTER JOIN monthly_expenses me ON md.month = me.month
  ORDER BY month;
$$;

-- Function for income breakdown
CREATE OR REPLACE FUNCTION public.get_income_breakdown()
RETURNS TABLE(source text, amount numeric)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    CASE 
      WHEN payment_mode = 'cash' THEN 'Cash Orders'
      WHEN payment_mode = 'esewa' THEN 'Esewa Orders'
      WHEN payment_mode = 'fonepay' THEN 'Fonepay Orders'
      ELSE 'Other Orders'
    END as source,
    SUM(total) as amount
  FROM orders
  WHERE order_date >= CURRENT_DATE - INTERVAL '12 months'
  GROUP BY payment_mode
  UNION ALL
  SELECT 
    CASE 
      WHEN payment_mode = 'cash' THEN 'Cash Charging'
      WHEN payment_mode = 'esewa' THEN 'Esewa Charging'
      WHEN payment_mode = 'fonepay' THEN 'Fonepay Charging'
      ELSE 'Other Charging'
    END as source,
    SUM(total_amount) as amount
  FROM charging_sessions
  WHERE session_date >= CURRENT_DATE - INTERVAL '12 months'
  GROUP BY payment_mode;
$$;

-- Function for expense categorization
CREATE OR REPLACE FUNCTION public.get_expense_categorization()
RETURNS TABLE(category text, amount numeric)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    category,
    SUM(amount) as amount
  FROM expenses
  WHERE expense_date >= CURRENT_DATE - INTERVAL '12 months'
  GROUP BY category
  ORDER BY amount DESC;
$$;

-- Function for monthly deposits and withdrawals
CREATE OR REPLACE FUNCTION public.get_monthly_deposits_withdrawals()
RETURNS TABLE(month text, deposits numeric, withdrawals numeric)
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH monthly_deposits AS (
    SELECT 
      TO_CHAR(date_trunc('month', COALESCE(deposit_date, created_at)), 'YYYY-MM') as month,
      SUM(amount) as deposits
    FROM deposits
    WHERE deposit_date >= CURRENT_DATE - INTERVAL '12 months'
    GROUP BY TO_CHAR(date_trunc('month', COALESCE(deposit_date, created_at)), 'YYYY-MM')
  ),
  monthly_withdrawals AS (
    SELECT 
      TO_CHAR(date_trunc('month', COALESCE(withdrawal_date, created_at)), 'YYYY-MM') as month,
      SUM(amount) as withdrawals
    FROM withdrawals
    WHERE withdrawal_date >= CURRENT_DATE - INTERVAL '12 months'
    GROUP BY TO_CHAR(date_trunc('month', COALESCE(withdrawal_date, created_at)), 'YYYY-MM')
  )
  SELECT 
    COALESCE(md.month, mw.month) as month,
    COALESCE(md.deposits, 0) as deposits,
    COALESCE(mw.withdrawals, 0) as withdrawals
  FROM monthly_deposits md
  FULL OUTER JOIN monthly_withdrawals mw ON md.month = mw.month
  ORDER BY month;
$$;

-- Function for new user growth
CREATE OR REPLACE FUNCTION public.get_new_user_growth()
RETURNS TABLE(month text, new_users numeric)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    TO_CHAR(date_trunc('month', created_at), 'YYYY-MM') as month,
    COUNT(*)::numeric as new_users
  FROM profiles
  WHERE created_at >= CURRENT_DATE - INTERVAL '12 months'
  GROUP BY TO_CHAR(date_trunc('month', created_at), 'YYYY-MM')
  ORDER BY month;
$$;

-- Function for user role distribution
CREATE OR REPLACE FUNCTION public.get_user_role_distribution()
RETURNS TABLE(role text, user_count numeric)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    COALESCE(ur.role::text, 'user') as role,
    COUNT(*)::numeric as user_count
  FROM profiles p
  LEFT JOIN user_roles ur ON p.id = ur.user_id
  GROUP BY COALESCE(ur.role::text, 'user');
$$;

-- Function for top spenders
CREATE OR REPLACE FUNCTION public.get_top_spenders(limit_count int DEFAULT 5)
RETURNS TABLE(email text, total_spent numeric)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    p.email,
    COALESCE(order_total, 0) + COALESCE(charging_total, 0) as total_spent
  FROM profiles p
  LEFT JOIN (
    SELECT 
      user_id,
      SUM(total) as order_total
    FROM orders
    WHERE order_date >= CURRENT_DATE - INTERVAL '12 months'
    GROUP BY user_id
  ) o ON p.id = o.user_id
  LEFT JOIN (
    SELECT 
      user_id,
      SUM(total_amount) as charging_total
    FROM charging_sessions
    WHERE session_date >= CURRENT_DATE - INTERVAL '12 months'
    GROUP BY user_id
  ) c ON p.id = c.user_id
  WHERE COALESCE(order_total, 0) + COALESCE(charging_total, 0) > 0
  ORDER BY total_spent DESC
  LIMIT limit_count;
$$;

-- Function for popular products
CREATE OR REPLACE FUNCTION public.get_popular_products()
RETURNS TABLE(item_name text, purchase_count numeric)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    item_name,
    SUM(quantity)::numeric as purchase_count
  FROM orders
  WHERE order_date >= CURRENT_DATE - INTERVAL '12 months'
  GROUP BY item_name
  ORDER BY purchase_count DESC
  LIMIT 10;
$$;

-- Function for sales by payment mode
CREATE OR REPLACE FUNCTION public.get_sales_by_payment_mode()
RETURNS TABLE(payment_mode text, total_sales numeric)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    payment_mode,
    SUM(total) as total_sales
  FROM orders
  WHERE order_date >= CURRENT_DATE - INTERVAL '12 months'
  GROUP BY payment_mode
  UNION ALL
  SELECT 
    payment_mode,
    SUM(total_amount) as total_sales
  FROM charging_sessions
  WHERE session_date >= CURRENT_DATE - INTERVAL '12 months'
  GROUP BY payment_mode;
$$;

-- Function for cooperative savings trend
CREATE OR REPLACE FUNCTION public.get_cooperative_savings_trend()
RETURNS TABLE(month text, total_savings numeric)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    TO_CHAR(date_trunc('month', COALESCE(contribution_date, created_at)), 'YYYY-MM') as month,
    SUM(contribution_amount) as total_savings
  FROM cooperative_savings
  WHERE contribution_date >= CURRENT_DATE - INTERVAL '12 months'
  GROUP BY TO_CHAR(date_trunc('month', COALESCE(contribution_date, created_at)), 'YYYY-MM')
  ORDER BY month;
$$;

-- Function for menu item availability
CREATE OR REPLACE FUNCTION public.get_menu_item_availability()
RETURNS TABLE(status text, item_count numeric)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    CASE 
      WHEN is_available THEN 'Available'
      ELSE 'Unavailable'
    END as status,
    COUNT(*)::numeric as item_count
  FROM menu_items
  GROUP BY is_available;
$$;