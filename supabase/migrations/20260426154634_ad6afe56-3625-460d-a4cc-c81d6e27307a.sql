
-- ============================================
-- Nexus Energy Flow: Analytics RPC Functions
-- KPIs, Anomaly Detection, Forecasting, Reconciliation
-- ============================================

-- 1. KPI summary for a date range (revenue, expenses, net profit, burn rate, runway)
CREATE OR REPLACE FUNCTION public.nexus_kpi_summary(
  p_start_date date,
  p_end_date date
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days int;
  v_revenue numeric := 0;
  v_orders_revenue numeric := 0;
  v_charging_revenue numeric := 0;
  v_expenses numeric := 0;
  v_savings numeric := 0;
  v_withdrawals numeric := 0;
  v_deposits numeric := 0;
  v_net_profit numeric := 0;
  v_burn_rate numeric := 0;
  v_avg_daily_revenue numeric := 0;
  v_total_balance numeric := 0;
  v_runway_days numeric := 0;
BEGIN
  v_days := GREATEST(1, (p_end_date - p_start_date) + 1);

  SELECT COALESCE(SUM(total_income_from_orders), 0),
         COALESCE(SUM(total_income_from_charging), 0),
         COALESCE(SUM(total_expenses), 0),
         COALESCE(SUM(total_savings), 0),
         COALESCE(SUM(total_withdrawals), 0),
         COALESCE(SUM(total_deposits), 0)
    INTO v_orders_revenue, v_charging_revenue, v_expenses, v_savings, v_withdrawals, v_deposits
  FROM daily_summary
  WHERE summary_date BETWEEN p_start_date AND p_end_date;

  v_revenue := v_orders_revenue + v_charging_revenue;
  v_net_profit := v_revenue - v_expenses;
  v_burn_rate := v_expenses / v_days;
  v_avg_daily_revenue := v_revenue / v_days;

  -- Latest total balance (most recent summary <= end date)
  SELECT COALESCE(total_balance, 0) INTO v_total_balance
  FROM daily_summary
  WHERE summary_date <= p_end_date
  ORDER BY summary_date DESC
  LIMIT 1;

  -- Runway: how many days current balance lasts at current burn (if no income)
  IF v_burn_rate > 0 THEN
    v_runway_days := v_total_balance / v_burn_rate;
  ELSE
    v_runway_days := 999;
  END IF;

  RETURN jsonb_build_object(
    'period_days', v_days,
    'total_revenue', v_revenue,
    'orders_revenue', v_orders_revenue,
    'charging_revenue', v_charging_revenue,
    'total_expenses', v_expenses,
    'total_savings', v_savings,
    'total_withdrawals', v_withdrawals,
    'total_deposits', v_deposits,
    'net_profit', v_net_profit,
    'profit_margin', CASE WHEN v_revenue > 0 THEN ROUND((v_net_profit / v_revenue) * 100, 2) ELSE 0 END,
    'burn_rate_daily', ROUND(v_burn_rate, 2),
    'avg_daily_revenue', ROUND(v_avg_daily_revenue, 2),
    'current_balance', v_total_balance,
    'cash_runway_days', ROUND(v_runway_days, 1)
  );
END;
$$;

-- 2. Cashflow map - aggregated flows between accounts (for Sankey diagram)
CREATE OR REPLACE FUNCTION public.nexus_cashflow_map(
  p_start_date date,
  p_end_date date
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v jsonb;
BEGIN
  SELECT jsonb_build_object(
    'income_to_cash', COALESCE(SUM(total_income_cash), 0),
    'income_to_esewa', COALESCE(SUM(total_income_esewa), 0),
    'income_to_fonepay', COALESCE(SUM(total_income_fonepay), 0),
    'expense_from_cash', COALESCE(SUM(total_expenses_cash), 0),
    'expense_from_esewa', COALESCE(SUM(total_expenses_esewa), 0),
    'expense_from_fonepay', COALESCE(SUM(total_expenses_fonepay), 0),
    'savings_from_cash', COALESCE(SUM(total_savings_cash), 0),
    'savings_from_esewa', COALESCE(SUM(total_savings_esewa), 0),
    'savings_from_fonepay', COALESCE(SUM(total_savings_fonepay), 0),
    'deposit_to_esewa', COALESCE(SUM(total_deposits_esewa), 0),
    'deposit_to_cash', COALESCE(SUM(total_deposits_cash), 0),
    'withdraw_from_cooperative', COALESCE(SUM(total_withdrawals_cooperative), 0),
    'withdraw_from_bank', COALESCE(SUM(total_withdrawals_bank), 0),
    'orders_total', COALESCE(SUM(total_income_from_orders), 0),
    'charging_total', COALESCE(SUM(total_income_from_charging), 0)
  )
  INTO v
  FROM daily_summary
  WHERE summary_date BETWEEN p_start_date AND p_end_date;

  RETURN v;
END;
$$;

-- 3. Anomaly detection - transactions deviating > 2 std dev from mean
CREATE OR REPLACE FUNCTION public.nexus_detect_anomalies(
  p_lookback_days int DEFAULT 90,
  p_z_threshold numeric DEFAULT 2.0
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_anomalies jsonb := '[]'::jsonb;
  v_start date := CURRENT_DATE - p_lookback_days;
BEGIN
  -- Anomalous orders
  WITH stats AS (
    SELECT AVG(total) AS mean_amt, STDDEV_POP(total) AS sd_amt
    FROM orders WHERE order_date >= v_start
  ),
  flagged AS (
    SELECT 'order' AS kind, o.id::text AS id, o.order_date AS txn_date,
           o.total AS amount, o.payment_mode, o.item_name AS label,
           CASE WHEN s.sd_amt > 0 THEN ABS((o.total - s.mean_amt) / s.sd_amt) ELSE 0 END AS z_score
    FROM orders o, stats s
    WHERE o.order_date >= v_start
      AND s.sd_amt > 0
      AND ABS((o.total - s.mean_amt) / s.sd_amt) > p_z_threshold
    ORDER BY z_score DESC
    LIMIT 50
  )
  SELECT COALESCE(jsonb_agg(row_to_json(flagged)), '[]'::jsonb) INTO v_anomalies FROM flagged;

  RETURN jsonb_build_object(
    'lookback_days', p_lookback_days,
    'threshold', p_z_threshold,
    'orders', v_anomalies,
    'expenses', (
      WITH stats AS (
        SELECT AVG(amount) AS mean_amt, STDDEV_POP(amount) AS sd_amt
        FROM expenses WHERE expense_date >= v_start
      ),
      flagged AS (
        SELECT 'expense' AS kind, e.id::text AS id, e.expense_date AS txn_date,
               e.amount, e.payment_mode, e.description AS label, e.category,
               CASE WHEN s.sd_amt > 0 THEN ABS((e.amount - s.mean_amt) / s.sd_amt) ELSE 0 END AS z_score
        FROM expenses e, stats s
        WHERE e.expense_date >= v_start AND s.sd_amt > 0
          AND ABS((e.amount - s.mean_amt) / s.sd_amt) > p_z_threshold
        ORDER BY z_score DESC LIMIT 50
      )
      SELECT COALESCE(jsonb_agg(row_to_json(flagged)), '[]'::jsonb) FROM flagged
    ),
    'withdrawals', (
      WITH stats AS (
        SELECT AVG(amount) AS mean_amt, STDDEV_POP(amount) AS sd_amt
        FROM withdrawals WHERE withdrawal_date >= v_start
      ),
      flagged AS (
        SELECT 'withdrawal' AS kind, w.id::text AS id, w.withdrawal_date AS txn_date,
               w.amount, w.payment_mode, w.purpose AS label, w.withdrawal_from AS source,
               CASE WHEN s.sd_amt > 0 THEN ABS((w.amount - s.mean_amt) / s.sd_amt) ELSE 0 END AS z_score
        FROM withdrawals w, stats s
        WHERE w.withdrawal_date >= v_start AND s.sd_amt > 0
          AND ABS((w.amount - s.mean_amt) / s.sd_amt) > p_z_threshold
        ORDER BY z_score DESC LIMIT 50
      )
      SELECT COALESCE(jsonb_agg(row_to_json(flagged)), '[]'::jsonb) FROM flagged
    )
  );
END;
$$;

-- 4. Predictive cashflow - 30-day forecast based on historical daily averages
CREATE OR REPLACE FUNCTION public.nexus_forecast_cashflow(
  p_lookback_days int DEFAULT 60,
  p_forecast_days int DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_avg_income numeric := 0;
  v_avg_expense numeric := 0;
  v_current_balance numeric := 0;
  v_forecast jsonb := '[]'::jsonb;
  v_day int;
  v_projected_balance numeric;
  v_arr jsonb[] := ARRAY[]::jsonb[];
BEGIN
  SELECT COALESCE(AVG(total_income), 0),
         COALESCE(AVG(total_expenses), 0)
    INTO v_avg_income, v_avg_expense
  FROM daily_summary
  WHERE summary_date >= CURRENT_DATE - p_lookback_days;

  SELECT COALESCE(total_balance, 0) INTO v_current_balance
  FROM daily_summary
  ORDER BY summary_date DESC
  LIMIT 1;

  v_projected_balance := v_current_balance;
  FOR v_day IN 1..p_forecast_days LOOP
    v_projected_balance := v_projected_balance + v_avg_income - v_avg_expense;
    v_arr := array_append(v_arr, jsonb_build_object(
      'date', (CURRENT_DATE + v_day)::text,
      'projected_income', ROUND(v_avg_income, 2),
      'projected_expense', ROUND(v_avg_expense, 2),
      'projected_balance', ROUND(v_projected_balance, 2),
      'projected_net', ROUND(v_avg_income - v_avg_expense, 2)
    ));
  END LOOP;

  RETURN jsonb_build_object(
    'avg_daily_income', ROUND(v_avg_income, 2),
    'avg_daily_expense', ROUND(v_avg_expense, 2),
    'avg_daily_net', ROUND(v_avg_income - v_avg_expense, 2),
    'current_balance', v_current_balance,
    'forecast_30d_balance', ROUND(v_projected_balance, 2),
    'forecast', array_to_json(v_arr)::jsonb
  );
END;
$$;

-- 5. Reconciliation check - compare wallet flows to recorded balance
CREATE OR REPLACE FUNCTION public.nexus_reconcile(
  p_check_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_summary daily_summary%ROWTYPE;
  v_calc_cash numeric := 0;
  v_calc_esewa numeric := 0;
  v_calc_fonepay numeric := 0;
  v_calc_coop numeric := 0;
BEGIN
  SELECT * INTO v_summary FROM daily_summary WHERE summary_date = p_check_date LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false, 'message', 'No daily_summary row for date');
  END IF;

  -- Recompute expected balances (simplified: in - out)
  v_calc_cash := COALESCE(v_summary.total_income_cash,0)
                 - COALESCE(v_summary.total_expenses_cash,0)
                 - COALESCE(v_summary.total_savings_cash,0)
                 - COALESCE(v_summary.total_deposits_cash,0)
                 + COALESCE(v_summary.total_withdrawals_bank_cash,0)
                 + COALESCE(v_summary.total_withdrawals_cooperative_cash,0);

  v_calc_esewa := COALESCE(v_summary.total_income_esewa,0)
                  - COALESCE(v_summary.total_expenses_esewa,0)
                  - COALESCE(v_summary.total_savings_esewa,0)
                  + COALESCE(v_summary.total_deposits_esewa,0)
                  + COALESCE(v_summary.total_withdrawals_bank_esewa,0)
                  + COALESCE(v_summary.total_withdrawals_cooperative_esewa,0);

  v_calc_fonepay := COALESCE(v_summary.total_income_fonepay,0)
                    - COALESCE(v_summary.total_expenses_fonepay,0)
                    - COALESCE(v_summary.total_savings_fonepay,0)
                    + COALESCE(v_summary.total_withdrawals_cooperative_fonepay,0);

  v_calc_coop := COALESCE(v_summary.total_savings,0) - COALESCE(v_summary.total_withdrawals_cooperative,0);

  RETURN jsonb_build_object(
    'found', true,
    'check_date', p_check_date,
    'recorded', jsonb_build_object(
      'cash', v_summary.cash_balance,
      'esewa', v_summary.esewa_balance,
      'fonepay', v_summary.fonepay_balance,
      'cooperative', v_summary.cooperative_balance,
      'total', v_summary.total_balance
    ),
    'computed', jsonb_build_object(
      'cash', ROUND(v_calc_cash, 2),
      'esewa', ROUND(v_calc_esewa, 2),
      'fonepay', ROUND(v_calc_fonepay, 2),
      'cooperative', ROUND(v_calc_coop, 2)
    ),
    'variance', jsonb_build_object(
      'cash', ROUND(COALESCE(v_summary.cash_balance,0) - v_calc_cash, 2),
      'esewa', ROUND(COALESCE(v_summary.esewa_balance,0) - v_calc_esewa, 2),
      'fonepay', ROUND(COALESCE(v_summary.fonepay_balance,0) - v_calc_fonepay, 2),
      'cooperative', ROUND(COALESCE(v_summary.cooperative_balance,0) - v_calc_coop, 2)
    )
  );
END;
$$;

-- 6. Top selling items + peak charging hours
CREATE OR REPLACE FUNCTION public.nexus_behavioral_insights(
  p_start_date date,
  p_end_date date
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object(
    'top_items', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      FROM (
        SELECT item_name, SUM(quantity)::int AS qty, SUM(total)::numeric AS revenue
        FROM orders
        WHERE order_date BETWEEN p_start_date AND p_end_date
        GROUP BY item_name
        ORDER BY revenue DESC
        LIMIT 10
      ) t
    ),
    'peak_charging_hours', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      FROM (
        SELECT EXTRACT(HOUR FROM start_time)::int AS hour,
               COUNT(*)::int AS sessions,
               COALESCE(SUM(total_amount),0)::numeric AS revenue
        FROM charging_sessions
        WHERE session_date BETWEEN p_start_date AND p_end_date
          AND start_time IS NOT NULL
        GROUP BY hour
        ORDER BY sessions DESC
      ) t
    ),
    'low_stock', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      FROM (
        SELECT item_name, quantity, minimum_stock, category
        FROM inventory
        WHERE is_active = true AND quantity <= COALESCE(minimum_stock, 0)
        ORDER BY (quantity - COALESCE(minimum_stock,0)) ASC
        LIMIT 20
      ) t
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.nexus_kpi_summary(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.nexus_cashflow_map(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.nexus_detect_anomalies(int, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.nexus_forecast_cashflow(int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.nexus_reconcile(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.nexus_behavioral_insights(date, date) TO authenticated;
