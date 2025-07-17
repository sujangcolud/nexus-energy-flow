CREATE OR REPLACE FUNCTION get_monthly_financial_summary_v2()
RETURNS TABLE(month TEXT, revenue NUMERIC, expenses NUMERIC, profit NUMERIC) AS $$
BEGIN
  RETURN QUERY
  WITH months AS (
    SELECT TO_CHAR(GENERATE_SERIES(DATE_TRUNC('month', NOW()) - INTERVAL '11 months', DATE_TRUNC('month', NOW()), '1 month'), 'YYYY-MM') AS month
  )
  SELECT
    m.month,
    get_total_revenue(auth.uid(), (m.month || '-01')::DATE, (m.month || '-01')::DATE + INTERVAL '1 month - 1 day') AS revenue,
    get_total_expenses(auth.uid(), (m.month || '-01')::DATE, (m.month || '-01')::DATE + INTERVAL '1 month - 1 day') AS expenses,
    get_net_profit(auth.uid(), (m.month || '-01')::DATE, (m.month || '-01')::DATE + INTERVAL '1 month - 1 day') AS profit
  FROM months m;
END;
$$ LANGUAGE plpgsql;
