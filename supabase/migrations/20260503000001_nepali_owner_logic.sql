-- Advanced Business Intelligence View with Weighted Allocation & Nepali Owner Logic
DROP VIEW IF EXISTS public.ai_audit_alerts;
DROP VIEW IF EXISTS public.advanced_business_intelligence;

CREATE OR REPLACE VIEW public.advanced_business_intelligence AS
WITH expense_raw AS (
  -- Shift expenses by -1 day (recorded next day)
  SELECT
    (expense_date - INTERVAL '1 day')::date as business_date,
    CASE
      WHEN category = 'Vegetables Item' THEN 'Vegetables'
      WHEN category = 'Meat Item' AND (description ILIKE '%chicken%' OR description ILIKE '%kukhura%') THEN 'Chicken'
      WHEN category = 'Meat Item' AND (description ILIKE '%mutton%' OR description ILIKE '%khasi%' OR description ILIKE '%goat%') THEN 'Mutton'
      WHEN category = 'Meat Item' AND (description ILIKE '%fish%' OR description ILIKE '%machha%') THEN 'Fish'
      WHEN category = 'Meat Item' THEN 'Chicken' -- Default protein
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
-- Allocation logic
allocated_costs AS (
  -- Handle all Food dish groups
  SELECT
    o.business_date,
    o.dish_group as category_group,
    o.daily_sales,
    -- Protein Direct Cost (for Chicken, Mutton, Fish)
    COALESCE((SELECT daily_cost FROM expense_agg e WHERE e.business_date = o.business_date AND e.cost_category = o.dish_group), 0) as direct_cost,
    -- Distributed Cost (Vegetables & Others) allocated to all Food
    CASE
      WHEN t.total_food_revenue > 0 THEN
        (o.daily_sales / t.total_food_revenue) *
        COALESCE((SELECT SUM(daily_cost) FROM expense_agg e WHERE e.business_date = o.business_date AND e.cost_category IN ('Vegetables', 'Others')), 0)
      ELSE 0
    END as distributed_cost
  FROM order_agg o
  JOIN total_food_sales t ON o.business_date = t.business_date
  WHERE o.dish_group != 'Beverages'

  UNION ALL

  -- Beverages are direct 1:1
  SELECT
    o.business_date,
    'Beverages' as category_group,
    o.daily_sales,
    COALESCE((SELECT daily_cost FROM expense_agg e WHERE e.business_date = o.business_date AND e.cost_category = 'Beverages'), 0) as direct_cost,
    0 as distributed_cost
  FROM order_agg o
  WHERE o.dish_group = 'Beverages'
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
    deposits_total
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
    ELSE 0
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
  CASE
    WHEN p.commission_total > 0 THEN ROUND(p.total_revenue / p.commission_total, 2)
    ELSE 0
  END as revenue_per_commission_rupee
FROM final_metrics f
LEFT JOIN daily_perf p ON f.business_date = p.business_date;

-- AI Auditor: Anomaly Detection View (Persistent Loss Detection)
CREATE OR REPLACE VIEW public.ai_audit_alerts AS
WITH streak_calc AS (
  SELECT
    business_date,
    category_group,
    daily_cost,
    daily_sales,
    CASE WHEN daily_cost > daily_sales THEN 1 ELSE 0 END as is_leakage,
    SUM(CASE WHEN daily_cost > daily_sales THEN 1 ELSE 0 END) OVER (PARTITION BY category_group ORDER BY business_date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) as streak_count
  FROM public.advanced_business_intelligence
),
withdrawal_audit AS (
  SELECT
    business_date,
    'General' as category_group,
    'Cash Audit' as category_items,
    CASE
      WHEN withdrawals_total > 0 AND expenses_total = 0 THEN 'Potential Leakage'
      ELSE NULL
    END as alert_type,
    'Withdrawal of ' || withdrawals_total || ' NRs without corresponding expenses recorded.' as alert_description
  FROM public.daily_business_performance
)
SELECT
  business_date,
  category_group,
  category_group as category_items,
  'Loss Persistence Alert' as alert_type,
  'This category is losing money for 3 days. Mero advice: portion control milauchhu ki price badhauchu, socha!' as alert_description
FROM streak_calc
WHERE streak_count >= 3 AND is_leakage = 1

UNION ALL

SELECT
  business_date,
  category_group,
  category_items,
  alert_type,
  alert_description
FROM withdrawal_audit
WHERE alert_type IS NOT NULL;

-- Permissions
GRANT SELECT ON public.advanced_business_intelligence TO authenticated;
GRANT SELECT ON public.ai_audit_alerts TO authenticated;
ALTER VIEW public.advanced_business_intelligence SET (security_invoker = true);
ALTER VIEW public.ai_audit_alerts SET (security_invoker = true);
