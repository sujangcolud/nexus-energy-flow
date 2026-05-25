
-- Correct advanced_business_intelligence view to use actual expense_date
-- The previous logic was subtracting 1 day from expense_date, which caused misalignment
-- with the daily summaries and the Verification Module.

DROP VIEW IF EXISTS public.ai_audit_alerts;
DROP VIEW IF EXISTS public.advanced_business_intelligence;

CREATE OR REPLACE VIEW public.advanced_business_intelligence AS
WITH dates AS (
  SELECT DISTINCT business_date FROM public.daily_business_performance
),
expense_raw AS (
  SELECT
    expense_date::date as business_date,
    CASE
      WHEN category = 'Vegetables Item' THEN 'Vegetables'
      WHEN category = 'Meat Item' AND (description ILIKE '%chicken%' OR description ILIKE '%kukhura%') THEN 'Chicken'
      WHEN category = 'Meat Item' AND (description ILIKE '%mutton%' OR description ILIKE '%khasi%' OR description ILIKE '%goat%') THEN 'Mutton'
      WHEN category = 'Meat Item' AND (description ILIKE '%fish%' OR description ILIKE '%machha%') THEN 'Fish'
      WHEN category = 'Meat Item' THEN 'Chicken'
      WHEN category = 'Beaverages' THEN 'Beverages'
      WHEN category = 'Others Restaurant Item' THEN 'Others'
      ELSE 'General'
    END as cost_category,
    amount
  FROM public.expenses
),
expense_agg AS (
  SELECT business_date, cost_category, SUM(amount) as daily_cost
  FROM expense_raw
  GROUP BY 1, 2
),
order_raw AS (
  SELECT
    order_date as business_date,
    CASE
      WHEN item_name IN ('Chicken Khana', 'Chicken Curry', 'Chicken Mo:Mo', 'Chicken Snacks') THEN 'Chicken'
      WHEN item_name IN ('Mutton Khana', 'Mutton Curry') THEN 'Mutton'
      WHEN item_name IN ('Fish Khana', 'Fish Fry', 'Khaja Set') THEN 'Fish'
      WHEN item_name IN ('Bottle Cold Drinks', 'Water', 'Tea') THEN 'Beverages'
      ELSE 'Food (Veg/General)'
    END as dish_group,
    total as daily_sales
  FROM public.orders
),
order_agg AS (
  SELECT business_date, dish_group, SUM(daily_sales) as daily_sales
  FROM order_raw
  GROUP BY 1, 2
),
total_food_sales AS (
  SELECT business_date, SUM(daily_sales) as total_food_revenue
  FROM order_agg
  WHERE dish_group != 'Beverages'
  GROUP BY 1
),
-- All possible combinations of date and category
categories AS (
  SELECT 'Chicken' as cat UNION SELECT 'Mutton' UNION SELECT 'Fish' UNION SELECT 'Food (Veg/General)' UNION SELECT 'Beverages'
),
date_cat AS (
  SELECT d.business_date, c.cat as category_group
  FROM dates d CROSS JOIN categories c
),
allocated_costs AS (
  SELECT
    dc.business_date,
    dc.category_group,
    COALESCE(o.daily_sales, 0) as daily_sales,
    COALESCE((SELECT daily_cost FROM expense_agg e WHERE e.business_date = dc.business_date AND e.cost_category = dc.category_group), 0) as direct_cost,
    CASE
      WHEN dc.category_group = 'Beverages' THEN 0
      WHEN t.total_food_revenue > 0 THEN
        (COALESCE(o.daily_sales, 0) / t.total_food_revenue) *
        COALESCE((SELECT SUM(daily_cost) FROM expense_agg e WHERE e.business_date = dc.business_date AND e.cost_category IN ('Vegetables', 'Others')), 0)
      WHEN dc.category_group = 'Food (Veg/General)' THEN
        COALESCE((SELECT SUM(daily_cost) FROM expense_agg e WHERE e.business_date = dc.business_date AND e.cost_category IN ('Vegetables', 'Others')), 0)
      ELSE 0
    END as distributed_cost
  FROM date_cat dc
  LEFT JOIN order_agg o ON dc.business_date = o.business_date AND dc.category_group = o.dish_group
  LEFT JOIN total_food_sales t ON dc.business_date = t.business_date
),
final_metrics AS (
  SELECT
    business_date,
    category_group,
    daily_sales,
    (direct_cost + distributed_cost) as total_allocated_cost,
    SUM(daily_sales) OVER (PARTITION BY category_group ORDER BY business_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) as rolling_sales_7d,
    SUM(direct_cost + distributed_cost) OVER (PARTITION BY category_group ORDER BY business_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) as rolling_cost_7d
  FROM allocated_costs
),
daily_perf AS (
  SELECT
    business_date,
    orders_revenue,
    orders_count,
    charging_revenue,
    charging_count,
    total_revenue,
    expenses_total,
    commission_total,
    withdrawals_total,
    deposits_total,
    SUM(withdrawals_total) OVER (ORDER BY business_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) as rolling_withdrawals_7d,
    SUM(expenses_total) OVER (ORDER BY business_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) as rolling_expenses_7d
  FROM public.daily_business_performance
)
SELECT
  f.business_date,
  f.category_group,
  f.total_allocated_cost as daily_cost,
  f.daily_sales,
  f.rolling_cost_7d,
  f.rolling_sales_7d,
  CASE
    WHEN f.rolling_sales_7d > 0 THEN ROUND(((f.rolling_sales_7d - f.rolling_cost_7d) / f.rolling_sales_7d) * 100, 2)
    ELSE CASE WHEN f.rolling_cost_7d > 0 THEN -100 ELSE 0 END
  END as gross_margin_pct_7d,
  p.charging_revenue,
  p.charging_count,
  p.orders_revenue,
  p.orders_count,
  CASE
    WHEN p.charging_count > 0 THEN ROUND(p.orders_count::numeric / p.charging_count, 2)
    ELSE 0
  END as charging_to_food_conversion,
  p.total_revenue,
  p.expenses_total,
  p.commission_total,
  p.withdrawals_total,
  p.deposits_total,
  p.rolling_withdrawals_7d,
  p.rolling_expenses_7d,
  CASE
    WHEN p.commission_total > 0 THEN ROUND(p.total_revenue / p.commission_total, 2)
    ELSE 0
  END as revenue_per_commission_rupee
FROM final_metrics f
JOIN daily_perf p ON f.business_date = p.business_date;

-- Recreate AI Auditor alerts view
CREATE OR REPLACE VIEW public.ai_audit_alerts AS
WITH leakage_check AS (
  SELECT
    business_date,
    category_group,
    daily_cost,
    daily_sales,
    gross_margin_pct_7d,
    CASE WHEN daily_cost > daily_sales THEN 1 ELSE 0 END as is_leakage
  FROM public.advanced_business_intelligence
),
streak_calc AS (
  SELECT
    *,
    SUM(is_leakage) OVER (PARTITION BY category_group ORDER BY business_date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) as streak_count
  FROM leakage_check
),
withdrawal_audit AS (
  SELECT DISTINCT
    business_date,
    'Cash Audit' as category_group,
    'Weekly Cash Flow' as category_items,
    rolling_withdrawals_7d as daily_cost,
    rolling_expenses_7d as daily_sales,
    CASE
      WHEN rolling_withdrawals_7d > rolling_expenses_7d * 1.05 THEN 'Cash Leakage (Weekly)'
      ELSE 'Flow Verified'
    END as alert_type,
    '7d Gap: Rs ' || ROUND((rolling_withdrawals_7d - rolling_expenses_7d)::numeric, 2) || '. (Withdrawn: ' || ROUND(rolling_withdrawals_7d::numeric, 2) || ', Exp: ' || ROUND(rolling_expenses_7d::numeric, 2) || ')' as alert_description,
    CASE WHEN rolling_withdrawals_7d > 0 THEN ROUND(((rolling_expenses_7d - rolling_withdrawals_7d) / rolling_withdrawals_7d) * 100, 2) ELSE 0 END as margin
  FROM public.advanced_business_intelligence
)
SELECT
  business_date,
  category_group,
  category_group as category_items,
  daily_cost,
  daily_sales,
  'Loss Streak' as alert_type,
  '3-day loss. Cost: Rs ' || ROUND(daily_cost::numeric, 2) || ', Sales: Rs ' || ROUND(daily_sales::numeric, 2) as alert_description,
  gross_margin_pct_7d as margin
FROM streak_calc
WHERE streak_count >= 3 AND is_leakage = 1

UNION ALL

SELECT
  business_date,
  category_group,
  category_items,
  daily_cost,
  daily_sales,
  alert_type,
  alert_description,
  margin
FROM withdrawal_audit
WHERE alert_type = 'Cash Leakage (Weekly)';

GRANT SELECT ON public.advanced_business_intelligence TO authenticated;
GRANT SELECT ON public.ai_audit_alerts TO authenticated;
ALTER VIEW public.advanced_business_intelligence SET (security_invoker = true);
ALTER VIEW public.ai_audit_alerts SET (security_invoker = true);
