-- Category Usage Analysis View - robust version
DROP VIEW IF EXISTS public.category_usage_analysis;

CREATE OR REPLACE VIEW public.category_usage_analysis AS
WITH exp AS (
  SELECT
    (expense_date - INTERVAL '1 day')::date as business_date,
    CASE
        WHEN category = 'Beaverages' THEN 'Beverages'
        WHEN category = 'Vegetables Item' THEN 'Vegetables'
        WHEN category = 'Meat Item' THEN 'Meat'
        WHEN category = 'Junk Food Item' THEN 'Junk Food'
        WHEN category = 'Others Restaurant Item' THEN 'Grocery/Base'
        ELSE category
    END as exp_category,
    SUM(amount) as total_expense
  FROM public.expenses
  GROUP BY 1, 2
),
inc AS (
  -- Beverages
  SELECT order_date as business_date, 'Beverages' as exp_category, SUM(total) as total_income
  FROM public.orders WHERE item_name IN ('Bottle Cold Drinks', 'Water', 'Tea') GROUP BY 1, 2
  UNION ALL
  -- Meat
  SELECT order_date as business_date, 'Meat' as exp_category, SUM(total) as total_income
  FROM public.orders WHERE item_name ILIKE '%Chicken%' OR item_name ILIKE '%Mutton%' OR item_name ILIKE '%Fish%' OR item_name ILIKE '%Buff%' GROUP BY 1, 2
  UNION ALL
  -- Vegetables
  SELECT order_date as business_date, 'Vegetables' as exp_category, SUM(total) as total_income
  FROM public.orders WHERE item_name IN ('Veg Thali', 'Veg khana', 'Sabji') GROUP BY 1, 2
  UNION ALL
  -- Grocery/Base
  SELECT order_date as business_date, 'Grocery/Base' as exp_category, SUM(total) as total_income
  FROM public.orders WHERE item_name IN ('Grocery', 'Rice', 'Oil', 'Dal') GROUP BY 1, 2
  UNION ALL
  -- Junk Food
  SELECT order_date as business_date, 'Junk Food' as exp_category, SUM(total) as total_income
  FROM public.orders WHERE item_name ILIKE '%Mo:Mo%' AND item_name NOT ILIKE '%Chicken%' GROUP BY 1, 2
),
categories AS (
  SELECT 'Beverages' as cat
  UNION SELECT 'Commission'
  UNION SELECT 'Electricity Restaurant'
  UNION SELECT 'Fuel/Travel'
  UNION SELECT 'Junk Food'
  UNION SELECT 'Meat'
  UNION SELECT 'Others'
  UNION SELECT 'Grocery/Base'
  UNION SELECT 'Recharge'
  UNION SELECT 'Vegetables'
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
