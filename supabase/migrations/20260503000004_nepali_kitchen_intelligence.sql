-- Nepali Kitchen Intelligence View - Fixed Record Type Error
DROP VIEW IF EXISTS public.nepali_kitchen_intelligence;

CREATE OR REPLACE VIEW public.nepali_kitchen_intelligence AS
WITH dates AS (
  SELECT DISTINCT business_date FROM public.daily_business_performance
),
expense_base AS (
  SELECT
    (expense_date - INTERVAL '1 day')::date as business_date,
    category as exp_category,
    description,
    amount
  FROM public.expenses
),
expense_categorized AS (
  SELECT
    business_date,
    CASE
      WHEN exp_category = 'Vegetables Item' THEN 'Vegetables'
      WHEN exp_category = 'Others Restaurant Item' THEN 'Base Items'
      WHEN exp_category = 'Meat Item' AND (description ILIKE '%mutton%' OR description ILIKE '%khasi%') THEN 'Mutton'
      WHEN exp_category = 'Meat Item' AND (description ILIKE '%fish%' OR description ILIKE '%machha%') THEN 'Fish'
      WHEN exp_category = 'Meat Item' THEN 'Chicken'
      WHEN exp_category ILIKE '%egg%' OR description ILIKE '%egg%' OR description ILIKE '%anda%' THEN 'Eggs'
      WHEN exp_category = 'Junk Food Item' THEN 'Junk Food'
      WHEN exp_category = 'Beaverages' THEN 'Beverages'
      WHEN exp_category = 'Bar & Counter' THEN 'Bar'
      ELSE 'Overhead'
    END as cost_type,
    amount
  FROM expense_base
),
sales_base AS (
  SELECT
    order_date as business_date,
    CASE
      WHEN item_name ILIKE '%Thali%' OR item_name ILIKE '%Khana%' OR item_name ILIKE '%Sabji%' OR item_name ILIKE '%Rice%' OR item_name ILIKE '%Dal%' THEN 'Main Meals'
      WHEN item_name ILIKE '%Mo:Mo%' OR item_name ILIKE '%Chowmein%' OR item_name ILIKE '%Snacks%' OR item_name ILIKE '%Khaja%' OR item_name ILIKE '%Fry%' THEN 'Snacks & Khaja'
      WHEN item_name ILIKE '%Egg%' OR item_name ILIKE '%Omlette%' OR item_name ILIKE '%Anda%' THEN 'Egg Items'
      WHEN item_name IN ('Bottle Cold Drinks', 'Water', 'Tea') THEN 'Beverages'
      WHEN item_name ILIKE '%Beer%' OR item_name ILIKE '%Whisky%' OR item_name ILIKE '%Vodka%' OR item_name ILIKE '%Bar%' THEN 'Bar & Counter'
      ELSE 'Others'
    END as sale_category,
    total as amount
  FROM public.orders
),
sales_agg AS (
  SELECT business_date, sale_category, SUM(amount) as sales_amount
  FROM sales_base
  GROUP BY 1, 2
),
-- Distribution logic using explicit mapping to avoid RECORD type issues
flattened_costs AS (
  SELECT
    e.business_date,
    m.target_category as sale_category,
    e.amount * m.weight as allocated_cost
  FROM expense_categorized e
  JOIN LATERAL (
    VALUES
      ('Vegetables', 'Main Meals', 0.40), ('Vegetables', 'Snacks & Khaja', 0.35), ('Vegetables', 'Egg Items', 0.10), ('Vegetables', 'Others', 0.15),
      ('Base Items', 'Main Meals', 0.60), ('Base Items', 'Snacks & Khaja', 0.25), ('Base Items', 'Egg Items', 0.10), ('Base Items', 'Others', 0.05),
      ('Chicken', 'Main Meals', 0.70), ('Chicken', 'Snacks & Khaja', 0.30),
      ('Mutton', 'Main Meals', 1.00),
      ('Fish', 'Main Meals', 0.70), ('Fish', 'Snacks & Khaja', 0.30),
      ('Eggs', 'Egg Items', 0.70), ('Eggs', 'Main Meals', 0.30),
      ('Junk Food', 'Snacks & Khaja', 0.80), ('Junk Food', 'Egg Items', 0.10), ('Junk Food', 'Others', 0.10),
      ('Beverages', 'Beverages', 1.00),
      ('Bar', 'Bar & Counter', 1.00)
  ) AS m(cost_type, target_category, weight) ON e.cost_type = m.cost_type
  WHERE e.cost_type != 'Overhead'
),
cost_agg AS (
  SELECT business_date, sale_category, SUM(allocated_cost) as cost_amount
  FROM flattened_costs
  GROUP BY 1, 2
),
category_list AS (
  SELECT 'Main Meals' as cat UNION SELECT 'Snacks & Khaja' UNION SELECT 'Egg Items' UNION SELECT 'Beverages' UNION SELECT 'Bar & Counter' UNION SELECT 'Others'
),
grid AS (
  SELECT d.business_date, c.cat as sale_category
  FROM dates d CROSS JOIN category_list c
),
daily_metrics AS (
  SELECT
    g.business_date,
    g.sale_category,
    COALESCE(c.cost_amount, 0) as daily_expense,
    COALESCE(s.sales_amount, 0) as daily_sales
  FROM grid g
  LEFT JOIN cost_agg c ON g.business_date = c.business_date AND g.sale_category = c.sale_category
  LEFT JOIN sales_agg s ON g.business_date = s.business_date AND g.sale_category = s.sale_category
),
rolling_metrics AS (
  SELECT
    *,
    SUM(daily_expense) OVER (PARTITION BY sale_category ORDER BY business_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) as rolling_expense_7d,
    SUM(daily_sales) OVER (PARTITION BY sale_category ORDER BY business_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) as rolling_sales_7d
  FROM daily_metrics
)
SELECT
  business_date,
  sale_category as category,
  daily_expense,
  daily_sales,
  rolling_expense_7d,
  rolling_sales_7d,
  CASE
    WHEN rolling_sales_7d > 0 THEN ROUND(((rolling_sales_7d - rolling_expense_7d) / rolling_sales_7d) * 100, 2)
    ELSE CASE WHEN rolling_expense_7d > 0 THEN -100 ELSE 0 END
  END as gross_margin_pct_7d,
  CASE
    WHEN rolling_expense_7d > 0 THEN ROUND(rolling_sales_7d / rolling_expense_7d, 2)
    ELSE 0
  END as efficiency_ratio
FROM rolling_metrics;

GRANT SELECT ON public.nepali_kitchen_intelligence TO authenticated;
ALTER VIEW public.nepali_kitchen_intelligence SET (security_invoker = true);
