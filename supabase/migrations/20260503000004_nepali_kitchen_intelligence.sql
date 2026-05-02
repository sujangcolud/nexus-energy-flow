-- Nepali Kitchen Intelligence View - Advanced Allocation Matrix
DROP VIEW IF EXISTS public.nepali_kitchen_intelligence;

CREATE OR REPLACE VIEW public.nepali_kitchen_intelligence AS
WITH dates AS (
  SELECT DISTINCT business_date FROM public.daily_business_performance
),
expense_base AS (
  -- Shift expenses by -1 day (recorded next day)
  SELECT
    (expense_date - INTERVAL '1 day')::date as business_date,
    category as exp_category,
    description,
    amount
  FROM public.expenses
),
-- Map expenses to specific cost types for matrix distribution
expense_categorized AS (
  SELECT
    business_date,
    CASE
      WHEN exp_category = 'Vegetables Item' THEN 'Vegetables'
      WHEN exp_category = 'Others Restaurant Item' THEN 'Base Items' -- Rice, Oil, Dal, Masala
      WHEN exp_category = 'Meat Item' AND (description ILIKE '%mutton%' OR description ILIKE '%khasi%') THEN 'Mutton'
      WHEN exp_category = 'Meat Item' AND (description ILIKE '%fish%' OR description ILIKE '%machha%') THEN 'Fish'
      WHEN exp_category = 'Meat Item' THEN 'Chicken' -- Default protein
      WHEN exp_category ILIKE '%egg%' OR description ILIKE '%egg%' OR description ILIKE '%anda%' THEN 'Eggs'
      WHEN exp_category = 'Junk Food Item' THEN 'Junk Food'
      WHEN exp_category = 'Beaverages' THEN 'Beverages'
      WHEN exp_category = 'Bar & Counter' THEN 'Bar'
      ELSE 'Overhead'
    END as cost_type,
    amount
  FROM expense_base
),
-- Sales categorization based on heuristics
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
-- Distribution Matrix Application
cost_distribution AS (
  SELECT
    business_date,
    -- Map each cost type to sales categories based on the user's rules
    CASE
      -- Vegetables
      WHEN cost_type = 'Vegetables' THEN
        ARRAY[('Main Meals', 0.40), ('Snacks & Khaja', 0.35), ('Egg Items', 0.10), ('Others', 0.15)]::RECORD[]
      -- Base Items (Rice, Dal, Oil, Masala)
      WHEN cost_type = 'Base Items' THEN
        ARRAY[('Main Meals', 0.60), ('Snacks & Khaja', 0.25), ('Egg Items', 0.10), ('Others', 0.05)]::RECORD[]
      -- Chicken
      WHEN cost_type = 'Chicken' THEN
        ARRAY[('Main Meals', 0.70), ('Snacks & Khaja', 0.30)]::RECORD[]
      -- Mutton
      WHEN cost_type = 'Mutton' THEN
        ARRAY[('Main Meals', 1.00)]::RECORD[]
      -- Fish
      WHEN cost_type = 'Fish' THEN
        ARRAY[('Main Meals', 0.70), ('Snacks & Khaja', 0.30)]::RECORD[]
      -- Eggs
      WHEN cost_type = 'Eggs' THEN
        ARRAY[('Egg Items', 0.70), ('Main Meals', 0.30)]::RECORD[]
      -- Junk Food
      WHEN cost_type = 'Junk Food' THEN
        ARRAY[('Snacks & Khaja', 0.80), ('Egg Items', 0.10), ('Others', 0.10)]::RECORD[]
      -- Beverages (Direct)
      WHEN cost_type = 'Beverages' THEN
        ARRAY[('Beverages', 1.00)]::RECORD[]
      -- Bar (Direct)
      WHEN cost_type = 'Bar' THEN
        ARRAY[('Bar & Counter', 1.00)]::RECORD[]
      ELSE ARRAY[]::RECORD[]
    END as distribution,
    amount
  FROM expense_categorized
  WHERE cost_type != 'Overhead'
),
flattened_costs AS (
  SELECT
    business_date,
    (d.v).f1::text as sale_category,
    (d.v).f2::numeric * amount as allocated_cost
  FROM (SELECT business_date, amount, unnest(distribution) as v FROM cost_distribution) d
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
