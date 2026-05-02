-- Daily Business Performance view: aggregates by activity (business) date
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
  SELECT order_date AS business_date,
         COALESCE(SUM(total),0) AS orders_revenue,
         COUNT(*) AS orders_count
  FROM public.orders GROUP BY order_date
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

-- Balance integrity RPC: closing X should equal opening X+1
CREATE OR REPLACE FUNCTION public.get_balance_integrity(p_from date, p_to date)
RETURNS TABLE (
  business_date date,
  revenue numeric,
  expenses numeric,
  deposits numeric,
  withdrawals numeric,
  net_change numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    business_date,
    total_revenue AS revenue,
    expenses_total AS expenses,
    deposits_total AS deposits,
    withdrawals_total AS withdrawals,
    (total_revenue - expenses_total - withdrawals_total + deposits_total) AS net_change
  FROM public.daily_business_performance
  WHERE business_date BETWEEN p_from AND p_to
  ORDER BY business_date ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_balance_integrity(date, date) TO authenticated;