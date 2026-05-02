-- Category Usage Analysis View
DROP VIEW IF EXISTS public.category_usage_analysis;

CREATE OR REPLACE VIEW public.category_usage_analysis AS
WITH exp AS (
  SELECT
    (expense_date - INTERVAL '1 day')::date as business_date,
    category as exp_category,
    SUM(amount) as total_expense
  FROM public.expenses
  GROUP BY 1, 2
),
inc AS (
  -- Beverages
  SELECT order_date as business_date, 'Beaverages' as exp_category, SUM(total) as total_income
  FROM public.orders WHERE item_name IN ('Bottle Cold Drinks', 'Water', 'Tea') GROUP BY 1, 2
  UNION ALL
  -- Meat Item
  SELECT order_date as business_date, 'Meat Item' as exp_category, SUM(total) as total_income
  FROM public.orders WHERE item_name IN ('Chicken Khana', 'Chicken Curry', 'Chicken Mo:Mo', 'Chicken Snacks', 'Mutton Khana', 'Mutton Curry', 'Fish Khana', 'Fish Fry', 'Khaja Set') GROUP BY 1, 2
  UNION ALL
  -- Vegetables Item
  SELECT order_date as business_date, 'Vegetables Item' as exp_category, SUM(total) as total_income
  FROM public.orders WHERE item_name IN ('Veg Thali', 'Veg khana', 'Sabji') GROUP BY 1, 2
),
categories AS (
  SELECT 'Beaverages' as cat
  UNION SELECT 'Commission'
  UNION SELECT 'Electricity Restaurant'
  UNION SELECT 'Fuel/Travel'
  UNION SELECT 'Junk Food Item'
  UNION SELECT 'Meat Item'
  UNION SELECT 'Others'
  UNION SELECT 'Others Restaurant Item'
  UNION SELECT 'Recharge'
  UNION SELECT 'Vegetables Item'
),
dates AS (
  SELECT DISTINCT (expense_date - INTERVAL '1 day')::date as business_date FROM public.expenses
  UNION
  SELECT DISTINCT order_date FROM public.orders
),
grid AS (
  SELECT d.business_date, c.cat as category
  FROM dates d CROSS JOIN categories c
)
SELECT
  g.business_date,
  g.category,
  COALESCE(e.total_expense, 0) as total_expense,
  COALESCE(i.total_income, 0) as total_income,
  COALESCE(i.total_income, 0) - COALESCE(e.total_expense, 0) as net_profit,
  CASE
    WHEN COALESCE(i.total_income, 0) > 0 THEN ROUND(((COALESCE(i.total_income, 0) - COALESCE(e.total_expense, 0)) / i.total_income) * 100, 2)
    ELSE CASE WHEN COALESCE(e.total_expense, 0) > 0 THEN -100 ELSE 0 END
  END as margin_pct
FROM grid g
LEFT JOIN exp e ON g.business_date = e.business_date AND g.category = e.exp_category
LEFT JOIN inc i ON g.business_date = i.business_date AND g.category = i.exp_category;

GRANT SELECT ON public.category_usage_analysis TO authenticated;
ALTER VIEW public.category_usage_analysis SET (security_invoker = true);
