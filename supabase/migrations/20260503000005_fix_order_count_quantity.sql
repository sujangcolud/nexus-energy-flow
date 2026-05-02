-- Update daily_business_performance to count actual dish quantities (Main Meals/Thalis)
-- representing "Order Flow" or "People Flow" instead of raw receipt counts.
DROP VIEW IF EXISTS public.daily_business_performance CASCADE;

CREATE OR REPLACE VIEW public.daily_business_performance AS
WITH dates AS (
  SELECT DISTINCT d::date AS business_date FROM (
    SELECT order_date AS d FROM public.orders WHERE order_date IS NOT NULL
    UNION SELECT session_date FROM public.charging_sessions WHERE session_date IS NOT NULL
    UNION SELECT expense_date FROM public.expenses WHERE expense_date IS NOT NULL
    UNION SELECT deposit_date FROM public.deposits WHERE deposit_date IS NOT NULL
    UNION SELECT withdrawal_date FROM public.withdrawals WHERE withdrawal_date IS NOT NULL
  ) s
),
o AS (
  -- Sum of item quantities for "Main Dishes" (Khana, Thali, Mo:Mo, etc.)
  -- This acts as a proxy for customer volume (Order Flow).
  SELECT
    o.order_date AS business_date,
    COALESCE(SUM(o.total), 0) AS orders_revenue,
    COALESCE(SUM(oi.quantity) FILTER (
      WHERE oi.item_name ILIKE '%Khana%'
         OR oi.item_name ILIKE '%Thali%'
         OR oi.item_name ILIKE '%Mo:Mo%'
         OR oi.item_name ILIKE '%Khaja%'
         OR oi.item_name ILIKE '%Set%'
         OR oi.item_name ILIKE '%Mutton%'
         OR oi.item_name ILIKE '%Chicken%'
         OR oi.item_name ILIKE '%Fish%'
         OR oi.item_name ILIKE '%Buff%'
         OR oi.item_name ILIKE '%Veg%'
         OR oi.item_name ILIKE '%Paneer%'
         OR oi.item_name ILIKE '%Chowmein%'
    ), 0) AS orders_count
  FROM public.orders o
  LEFT JOIN public.order_items oi ON o.id = oi.order_id
  GROUP BY o.order_date
),
c AS (
  SELECT session_date AS business_date,
         COALESCE(SUM(total_amount),0) AS charging_revenue,
         COUNT(*) AS charging_count
  FROM public.charging_sessions GROUP BY session_date
),
e AS (
  SELECT expense_date AS business_date,
         COALESCE(SUM(amount),0) AS expenses_total,
         COALESCE(SUM(amount) FILTER (WHERE LOWER(category) LIKE '%commission%'),0) AS commission_total
  FROM public.expenses GROUP BY expense_date
),
d AS (
  SELECT deposit_date AS business_date,
         COALESCE(SUM(amount),0) AS deposits_total
  FROM public.deposits GROUP BY deposit_date
),
w AS (
  SELECT withdrawal_date AS business_date,
         COALESCE(SUM(amount),0) AS withdrawals_total
  FROM public.withdrawals GROUP BY withdrawal_date
)
SELECT
  dates.business_date,
  TO_CHAR(dates.business_date, 'Day') AS day_of_week,
  EXTRACT(DOW FROM dates.business_date)::int AS dow,
  COALESCE(o.orders_revenue,0)    AS orders_revenue,
  COALESCE(o.orders_count,0)      AS orders_count,
  COALESCE(c.charging_revenue,0)  AS charging_revenue,
  COALESCE(c.charging_count,0)    AS charging_count,
  COALESCE(o.orders_revenue,0) + COALESCE(c.charging_revenue,0) AS total_revenue,
  COALESCE(e.expenses_total,0)    AS expenses_total,
  COALESCE(e.commission_total,0)  AS commission_total,
  COALESCE(d.deposits_total,0)    AS deposits_total,
  COALESCE(w.withdrawals_total,0) AS withdrawals_total,
  CASE WHEN COALESCE(o.orders_revenue,0) + COALESCE(c.charging_revenue,0) > 0
       THEN ROUND((COALESCE(c.charging_revenue,0)::numeric / (COALESCE(o.orders_revenue,0) + COALESCE(c.charging_revenue,0))) * 100, 2)
       ELSE 0 END AS energy_revenue_share_pct,
  CASE WHEN COALESCE(o.orders_revenue,0) + COALESCE(c.charging_revenue,0) > 0
       THEN ROUND((COALESCE(e.commission_total,0)::numeric / (COALESCE(o.orders_revenue,0) + COALESCE(c.charging_revenue,0))) * 100, 2)
       ELSE 0 END AS commission_burden_pct
FROM dates
LEFT JOIN o ON o.business_date = dates.business_date
LEFT JOIN c ON c.business_date = dates.business_date
LEFT JOIN e ON e.business_date = dates.business_date
LEFT JOIN d ON d.business_date = dates.business_date
LEFT JOIN w ON w.business_date = dates.business_date
ORDER BY dates.business_date DESC;

GRANT SELECT ON public.daily_business_performance TO authenticated;
ALTER VIEW public.daily_business_performance SET (security_invoker = true);
