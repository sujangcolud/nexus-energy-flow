-- =========================================================================
-- AI ANALYST TABLES
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.ai_chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'New conversation',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own sessions"
  ON public.ai_chat_sessions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_user ON public.ai_chat_sessions(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.ai_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.ai_chat_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user','assistant','system')),
  content text NOT NULL,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own messages"
  ON public.ai_chat_messages FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session ON public.ai_chat_messages(session_id, created_at);

CREATE TABLE IF NOT EXISTS public.ai_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  question text NOT NULL,
  plan jsonb,
  target_table text,
  row_count integer,
  latency_ms integer,
  success boolean NOT NULL DEFAULT true,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can insert audit"
  ON public.ai_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Super admins read audit"
  ON public.ai_audit_log FOR SELECT
  USING (public.has_role('super_admin'));

CREATE INDEX IF NOT EXISTS idx_ai_audit_log_user ON public.ai_audit_log(user_id, created_at DESC);

-- =========================================================================
-- ANALYTICS RPCs
-- =========================================================================

CREATE OR REPLACE FUNCTION public.nexus_anomalies(days_back integer DEFAULT 30)
RETURNS TABLE(
  source text,
  txn_id uuid,
  txn_date date,
  amount numeric,
  mean_amount numeric,
  stddev_amount numeric,
  z_score numeric,
  description text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cutoff date := CURRENT_DATE - days_back;
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT 'orders'::text src, AVG(total)::numeric m, COALESCE(STDDEV(total),0)::numeric s FROM orders WHERE order_date >= cutoff
    UNION ALL
    SELECT 'charging', AVG(total_amount), COALESCE(STDDEV(total_amount),0) FROM charging_sessions WHERE session_date >= cutoff
    UNION ALL
    SELECT 'expenses', AVG(amount), COALESCE(STDDEV(amount),0) FROM expenses WHERE expense_date >= cutoff
  )
  SELECT 'orders', o.id, o.order_date, o.total::numeric, st.m, st.s,
         CASE WHEN st.s > 0 THEN ((o.total - st.m) / st.s)::numeric ELSE 0 END,
         COALESCE(o.item_name, 'Order ' || o.payment_mode)
  FROM orders o, stats st
  WHERE st.src = 'orders' AND o.order_date >= cutoff
    AND st.s > 0 AND ABS((o.total - st.m) / st.s) > 2
  UNION ALL
  SELECT 'charging', c.id, c.session_date, c.total_amount::numeric, st.m, st.s,
         CASE WHEN st.s > 0 THEN ((c.total_amount - st.m) / st.s)::numeric ELSE 0 END,
         'Charging ' || c.payment_mode
  FROM charging_sessions c, stats st
  WHERE st.src = 'charging' AND c.session_date >= cutoff
    AND st.s > 0 AND ABS((c.total_amount - st.m) / st.s) > 2
  UNION ALL
  SELECT 'expenses', e.id, e.expense_date, e.amount::numeric, st.m, st.s,
         CASE WHEN st.s > 0 THEN ((e.amount - st.m) / st.s)::numeric ELSE 0 END,
         COALESCE(e.description, e.category)
  FROM expenses e, stats st
  WHERE st.src = 'expenses' AND e.expense_date >= cutoff
    AND st.s > 0 AND ABS((e.amount - st.m) / st.s) > 2
  ORDER BY txn_date DESC
  LIMIT 100;
END;
$$;

CREATE OR REPLACE FUNCTION public.nexus_forecast(days_back integer DEFAULT 60, days_ahead integer DEFAULT 30)
RETURNS TABLE(
  series_date date,
  is_forecast boolean,
  revenue numeric,
  expenses numeric,
  net numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  start_date date := CURRENT_DATE - days_back;
  avg_rev numeric;
  avg_exp numeric;
  i integer;
BEGIN
  RETURN QUERY
  WITH days AS (
    SELECT generate_series(start_date, CURRENT_DATE, '1 day'::interval)::date d
  ),
  rev AS (
    SELECT order_date d, SUM(total)::numeric v FROM orders WHERE order_date >= start_date GROUP BY 1
    UNION ALL
    SELECT session_date, SUM(total_amount)::numeric FROM charging_sessions WHERE session_date >= start_date GROUP BY 1
  ),
  rev_d AS (SELECT d, SUM(v) v FROM rev GROUP BY d),
  exp_d AS (SELECT expense_date d, SUM(amount)::numeric v FROM expenses WHERE expense_date >= start_date GROUP BY 1)
  SELECT d.d, false,
         COALESCE(rev_d.v, 0),
         COALESCE(exp_d.v, 0),
         COALESCE(rev_d.v, 0) - COALESCE(exp_d.v, 0)
  FROM days d
  LEFT JOIN rev_d ON rev_d.d = d.d
  LEFT JOIN exp_d ON exp_d.d = d.d;

  SELECT COALESCE(AVG(v), 0) INTO avg_rev FROM (
    SELECT SUM(total) v FROM orders WHERE order_date >= start_date GROUP BY order_date
    UNION ALL
    SELECT SUM(total_amount) FROM charging_sessions WHERE session_date >= start_date GROUP BY session_date
  ) r;
  SELECT COALESCE(AVG(v), 0) INTO avg_exp FROM (
    SELECT SUM(amount) v FROM expenses WHERE expense_date >= start_date GROUP BY expense_date
  ) e;

  FOR i IN 1..days_ahead LOOP
    series_date := CURRENT_DATE + i;
    is_forecast := true;
    revenue := avg_rev;
    expenses := avg_exp;
    net := avg_rev - avg_exp;
    RETURN NEXT;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.nexus_alert_thresholds(
  cash_min numeric DEFAULT 5000,
  esewa_min numeric DEFAULT 5000,
  fonepay_min numeric DEFAULT 5000,
  cooperative_min numeric DEFAULT 10000
)
RETURNS TABLE(
  account text,
  current_balance numeric,
  threshold numeric,
  breached boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  b RECORD;
BEGIN
  SELECT
    COALESCE(SUM(cash_in_hand), 0) AS cash,
    COALESCE(SUM(esewa_balance), 0) AS esewa,
    COALESCE(SUM(fonepay_balance), 0) AS fonepay,
    COALESCE(SUM(cooperative_balance), 0) AS cooperative,
    COALESCE(SUM(bank_balance), 0) AS bank
  INTO b FROM balances;

  account := 'Cash'; current_balance := b.cash; threshold := cash_min; breached := b.cash < cash_min; RETURN NEXT;
  account := 'eSewa'; current_balance := b.esewa; threshold := esewa_min; breached := b.esewa < esewa_min; RETURN NEXT;
  account := 'Fonepay'; current_balance := b.fonepay; threshold := fonepay_min; breached := b.fonepay < fonepay_min; RETURN NEXT;
  account := 'Cooperative'; current_balance := b.cooperative; threshold := cooperative_min; breached := b.cooperative < cooperative_min; RETURN NEXT;
END;
$$;

-- timestamps trigger for sessions
CREATE OR REPLACE FUNCTION public.touch_ai_session()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE public.ai_chat_sessions SET updated_at = now() WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_ai_session ON public.ai_chat_messages;
CREATE TRIGGER trg_touch_ai_session
AFTER INSERT ON public.ai_chat_messages
FOR EACH ROW EXECUTE FUNCTION public.touch_ai_session();