-- Advanced Business Intelligence View
CREATE OR REPLACE VIEW public.advanced_business_intelligence AS
WITH daily_category_stats AS (
  SELECT
    COALESCE(e.expense_date, o.order_date) as business_date,
    COALESCE(e.category_group, o.category_group) as category_group,
    COALESCE(SUM(e.daily_cost), 0) as daily_cost,
    COALESCE(SUM(o.daily_sales), 0) as daily_sales
  FROM (
    SELECT
      expense_date,
      CASE
        WHEN category = 'Vegetables Item' THEN 'Vegetables'
        WHEN category = 'Meat Item' THEN 'Meat'
        WHEN category = 'Beaverages' THEN 'Beverages'
        WHEN category = 'Others Restaurant Item' THEN 'Others'
        ELSE 'Unmapped'
      END as category_group,
      SUM(amount) as daily_cost
    FROM public.expenses
    GROUP BY expense_date, category_group
  ) e
  FULL OUTER JOIN (
    SELECT
      order_date,
      CASE
        WHEN item_name IN ('Veg Thali', 'Veg khana', 'Sabji') THEN 'Vegetables'
        WHEN item_name IN ('Chicken Thali', 'Chicken Mo:Mo', 'Mutton') THEN 'Meat'
        WHEN item_name IN ('Bottle Cold Drinks', 'Water', 'Tea') THEN 'Beverages'
        WHEN item_name IN ('Grocery', 'Rice', 'Oil') THEN 'Others'
        ELSE 'Unmapped'
      END as category_group,
      SUM(total) as daily_sales
    FROM public.orders
    GROUP BY order_date, category_group
  ) o ON e.expense_date = o.order_date AND e.category_group = o.category_group
  GROUP BY 1, 2
),
rolling_category_stats AS (
  SELECT
    business_date,
    category_group,
    daily_cost,
    daily_sales,
    SUM(daily_cost) OVER (PARTITION BY category_group ORDER BY business_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) as rolling_cost_7d,
    SUM(daily_sales) OVER (PARTITION BY category_group ORDER BY business_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) as rolling_sales_7d
  FROM daily_category_stats
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
  r.business_date,
  r.category_group,
  r.daily_cost,
  r.daily_sales,
  r.rolling_cost_7d,
  r.rolling_sales_7d,
  CASE
    WHEN r.rolling_sales_7d > 0 THEN ROUND(((r.rolling_sales_7d - r.rolling_cost_7d) / r.rolling_sales_7d) * 100, 2)
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
FROM rolling_category_stats r
LEFT JOIN daily_perf p ON r.business_date = p.business_date;

-- AI Auditor: Anomaly Detection View
CREATE OR REPLACE VIEW public.ai_audit_alerts AS
WITH leakage_check AS (
  SELECT
    business_date,
    category_group,
    daily_cost,
    daily_sales,
    CASE WHEN daily_cost > daily_sales THEN 1 ELSE 0 END as is_leakage
  FROM public.advanced_business_intelligence
  WHERE category_group != 'Unmapped'
),
streak_calc AS (
  SELECT
    business_date,
    category_group,
    is_leakage,
    SUM(is_leakage) OVER (PARTITION BY category_group ORDER BY business_date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) as streak_count
  FROM leakage_check
),
withdrawal_audit AS (
  SELECT
    business_date,
    'General' as category_group,
    CASE
      WHEN withdrawals_total > 0 AND expenses_total = 0 THEN 'Unmatched Withdrawal'
      WHEN withdrawals_total > 0 AND expenses_total > 0 THEN 'Withdrawal with Expense'
      ELSE NULL
    END as alert_type,
    CASE
      WHEN withdrawals_total > 0 AND expenses_total = 0 THEN 'Withdrawal of ' || withdrawals_total || ' NRs made but no matching expenses recorded.'
      WHEN withdrawals_total > 0 AND expenses_total > 0 THEN 'Withdrawal of ' || withdrawals_total || ' NRs confirmed by ' || expenses_total || ' NRs in expenses.'
      ELSE NULL
    END as alert_description
  FROM public.daily_business_performance
)
SELECT
  business_date,
  category_group,
  'Potential Waste/Leakage Alert' as alert_type,
  'Cost exceeded revenue for 3+ consecutive days' as alert_description
FROM streak_calc
WHERE streak_count >= 3 AND is_leakage = 1

UNION ALL

SELECT
  business_date,
  category_group,
  alert_type,
  alert_description
FROM withdrawal_audit
WHERE alert_type IS NOT NULL;

-- Security
GRANT SELECT ON public.advanced_business_intelligence TO authenticated;
GRANT SELECT ON public.ai_audit_alerts TO authenticated;

-- Ensure RLS-like safety via security_invoker
ALTER VIEW public.advanced_business_intelligence SET (security_invoker = true);
ALTER VIEW public.ai_audit_alerts SET (security_invoker = true);
