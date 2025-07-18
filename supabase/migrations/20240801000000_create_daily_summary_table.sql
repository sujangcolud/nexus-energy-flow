CREATE TABLE daily_summary (
  id SERIAL PRIMARY KEY,
  summary_date DATE NOT NULL UNIQUE,
  total_income_from_orders NUMERIC,
  total_income_from_charging NUMERIC,
  total_income_fonepay NUMERIC,
  total_income_esewa NUMERIC,
  total_income_cash NUMERIC,
  total_expenses NUMERIC,
  total_expenses_cash NUMERIC,
  total_expenses_esewa NUMERIC,
  total_expenses_fonepay NUMERIC,
  total_deposits NUMERIC,
  total_deposits_cash NUMERIC,
  total_deposits_esewa NUMERIC,
  total_savings NUMERIC,
  total_savings_cash NUMERIC,
  total_savings_fonepay NUMERIC,
  total_savings_esewa NUMERIC,
  total_withdrawals NUMERIC,
  total_withdrawals_cooperative NUMERIC,
  total_withdrawals_bank NUMERIC,
  total_income NUMERIC,
  total_cash_income NUMERIC,
  total_fonepay_income NUMERIC,
  total_esewa_income NUMERIC,
  cash_balance NUMERIC,
  esewa_balance NUMERIC,
  fonepay_balance NUMERIC,
  cooperative_balance NUMERIC,
  total_balance NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_daily_summary(summary_date DATE)
RETURNS VOID AS $$
DECLARE
    -- Income from orders
    v_total_income_from_orders NUMERIC;
    v_total_income_fonepay_orders NUMERIC;
    v_total_income_esewa_orders NUMERIC;
    v_total_income_cash_orders NUMERIC;

    -- Income from charging
    v_total_income_from_charging NUMERIC;
    v_total_income_fonepay_charging NUMERIC;
    v_total_income_esewa_charging NUMERIC;
    v_total_income_cash_charging NUMERIC;

    -- Expenses
    v_total_expenses NUMERIC;
    v_total_expenses_cash NUMERIC;
    v_total_expenses_esewa NUMERIC;
    v_total_expenses_fonepay NUMERIC;

    -- Deposits
    v_total_deposits NUMERIC;
    v_total_deposits_cash NUMERIC;
    v_total_deposits_esewa NUMERIC;

    -- Savings
    v_total_savings NUMERIC;
    v_total_savings_cash NUMERIC;
    v_total_savings_fonepay NUMERIC;
    v_total_savings_esewa NUMERIC;

    -- Withdrawals
    v_total_withdrawals NUMERIC;
    v_total_withdrawals_cooperative NUMERIC;
    v_total_withdrawals_bank NUMERIC;
    v_total_withdrawals_cash NUMERIC;

    -- Calculated fields
    v_total_income NUMERIC;
    v_total_cash_income NUMERIC;
    v_total_fonepay_income NUMERIC;
    v_total_esewa_income NUMERIC;
    v_cash_balance NUMERIC;
    v_esewa_balance NUMERIC;
    v_fonepay_balance NUMERIC;
    v_cooperative_balance NUMERIC;
    v_total_balance NUMERIC;
BEGIN
    -- Calculate income from orders
    SELECT
        COALESCE(SUM(total), 0),
        COALESCE(SUM(CASE WHEN payment_mode = 'fonepay' THEN total ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN payment_mode = 'esewa' THEN total ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN payment_mode = 'cash' THEN total ELSE 0 END), 0)
    INTO
        v_total_income_from_orders,
        v_total_income_fonepay_orders,
        v_total_income_esewa_orders,
        v_total_income_cash_orders
    FROM orders
    WHERE order_date = summary_date;

    -- Calculate income from charging
    SELECT
        COALESCE(SUM(amount), 0),
        COALESCE(SUM(CASE WHEN payment_mode = 'fonepay' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN payment_mode = 'esewa' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN payment_mode = 'cash' THEN amount ELSE 0 END), 0)
    INTO
        v_total_income_from_charging,
        v_total_income_fonepay_charging,
        v_total_income_esewa_charging,
        v_total_income_cash_charging
    FROM charging_sessions
    WHERE DATE(start_time) = summary_date;

    -- Calculate expenses
    SELECT
        COALESCE(SUM(amount), 0),
        COALESCE(SUM(CASE WHEN payment_mode = 'cash' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN payment_mode = 'esewa' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN payment_mode = 'fonepay' THEN amount ELSE 0 END), 0)
    INTO
        v_total_expenses,
        v_total_expenses_cash,
        v_total_expenses_esewa,
        v_total_expenses_fonepay
    FROM expenses
    WHERE date = summary_date;

    -- Calculate deposits
    SELECT
        COALESCE(SUM(amount), 0),
        COALESCE(SUM(CASE WHEN deposited_to = 'cash' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN deposited_to = 'esewa' THEN amount ELSE 0 END), 0)
    INTO
        v_total_deposits,
        v_total_deposits_cash,
        v_total_deposits_esewa
    FROM deposits
    WHERE date = summary_date;

    -- Calculate savings
    SELECT
        COALESCE(SUM(contribution_amount), 0),
        COALESCE(SUM(CASE WHEN payment_mode = 'cash' THEN contribution_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN payment_mode = 'fonepay' THEN contribution_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN payment_mode = 'esewa' THEN contribution_amount ELSE 0 END), 0)
    INTO
        v_total_savings,
        v_total_savings_cash,
        v_total_savings_fonepay,
        v_total_savings_esewa
    FROM cooperative_savings
    WHERE date = summary_date;

    -- Calculate withdrawals
    SELECT
        COALESCE(SUM(amount), 0),
        COALESCE(SUM(CASE WHEN category = 'cooperative' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN category = 'bank' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN payment_mode = 'cash' THEN amount ELSE 0 END), 0)
    INTO
        v_total_withdrawals,
        v_total_withdrawals_cooperative,
        v_total_withdrawals_bank,
        v_total_withdrawals_cash
    FROM withdrawals
    WHERE date = summary_date;

    -- Calculate total income
    v_total_income := v_total_income_from_orders + v_total_income_from_charging;
    v_total_cash_income := v_total_income_cash_orders + v_total_income_cash_charging;
    v_total_fonepay_income := v_total_income_fonepay_orders + v_total_income_fonepay_charging;
    v_total_esewa_income := v_total_income_esewa_orders + v_total_income_esewa_charging;

    -- Calculate balances
    v_cash_balance := v_total_cash_income - v_total_expenses_cash - v_total_savings_cash + v_total_withdrawals_cash - v_total_deposits_esewa - v_total_deposits_fonepay;
    v_esewa_balance := v_total_esewa_income - v_total_expenses_esewa - v_total_savings_esewa + v_total_deposits_esewa;
    v_fonepay_balance := v_total_fonepay_income - v_total_expenses_fonepay - v_total_savings_fonepay + v_total_deposits_fonepay;
    v_cooperative_balance := v_total_savings - v_total_withdrawals_cooperative;
    v_total_balance := v_cash_balance + v_fonepay_balance + v_cooperative_balance + v_esewa_balance;

    -- Insert or update the summary table
    INSERT INTO daily_summary (
        summary_date,
        total_income_from_orders,
        total_income_from_charging,
        total_income_fonepay,
        total_income_esewa,
        total_income_cash,
        total_expenses,
        total_expenses_cash,
        total_expenses_esewa,
        total_expenses_fonepay,
        total_deposits,
        total_deposits_cash,
        total_deposits_esewa,
        total_savings,
        total_savings_cash,
        total_savings_fonepay,
        total_savings_esewa,
        total_withdrawals,
        total_withdrawals_cooperative,
        total_withdrawals_bank,
        total_income,
        total_cash_income,
        total_fonepay_income,
        total_esewa_income,
        cash_balance,
        esewa_balance,
        fonepay_balance,
        cooperative_balance,
        total_balance
    ) VALUES (
        summary_date,
        v_total_income_from_orders,
        v_total_income_from_charging,
        v_total_fonepay_income,
        v_total_esewa_income,
        v_total_cash_income,
        v_total_expenses,
        v_total_expenses_cash,
        v_total_expenses_esewa,
        v_total_expenses_fonepay,
        v_total_deposits,
        v_total_deposits_cash,
        v_total_deposits_esewa,
        v_total_savings,
        v_total_savings_cash,
        v_total_savings_fonepay,
        v_total_savings_esewa,
        v_total_withdrawals,
        v_total_withdrawals_cooperative,
        v_total_withdrawals_bank,
        v_total_income,
        v_total_cash_income,
        v_total_fonepay_income,
        v_total_esewa_income,
        v_cash_balance,
        v_esewa_balance,
        v_fonepay_balance,
        v_cooperative_balance,
        v_total_balance
    )
    ON CONFLICT (summary_date) DO UPDATE SET
        total_income_from_orders = EXCLUDED.total_income_from_orders,
        total_income_from_charging = EXCLUDED.total_income_from_charging,
        total_income_fonepay = EXCLUDED.total_income_fonepay,
        total_income_esewa = EXCLUDED.total_income_esewa,
        total_income_cash = EXCLUDED.total_income_cash,
        total_expenses = EXCLUDED.total_expenses,
        total_expenses_cash = EXCLUDED.total_expenses_cash,
        total_expenses_esewa = EXCLUDED.total_expenses_esewa,
        total_expenses_fonepay = EXCLUDED.total_expenses_fonepay,
        total_deposits = EXCLUDED.total_deposits,
        total_deposits_cash = EXCLUDED.total_deposits_cash,
        total_deposits_esewa = EXCLUDED.total_deposits_esewa,
        total_savings = EXCLUDED.total_savings,
        total_savings_cash = EXCLUDED.total_savings_cash,
        total_savings_fonepay = EXCLUDED.total_savings_fonepay,
        total_savings_esewa = EXCLUDED.total_savings_esewa,
        total_withdrawals = EXCLUDED.total_withdrawals,
        total_withdrawals_cooperative = EXCLUDED.total_withdrawals_cooperative,
        total_withdrawals_bank = EXCLUDED.total_withdrawals_bank,
        total_income = EXCLUDED.total_income,
        total_cash_income = EXCLUDED.total_cash_income,
        total_fonepay_income = EXCLUDED.total_fonepay_income,
        total_esewa_income = EXCLUDED.total_esewa_income,
        cash_balance = EXCLUDED.cash_balance,
        esewa_balance = EXCLUDED.esewa_balance,
        fonepay_balance = EXCLUDED.fonepay_balance,
        cooperative_balance = EXCLUDED.cooperative_balance,
        total_balance = EXCLUDED.total_balance,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_update_daily_summary()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        PERFORM update_daily_summary(OLD.date);
    ELSE
        PERFORM update_daily_summary(NEW.date);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_summary_trigger
AFTER INSERT OR UPDATE OR DELETE ON orders
FOR EACH ROW EXECUTE FUNCTION trigger_update_daily_summary();

CREATE TRIGGER charging_sessions_summary_trigger
AFTER INSERT OR UPDATE OR DELETE ON charging_sessions
FOR EACH ROW EXECUTE FUNCTION trigger_update_daily_summary();

CREATE TRIGGER expenses_summary_trigger
AFTER INSERT OR UPDATE OR DELETE ON expenses
FOR EACH ROW EXECUTE FUNCTION trigger_update_daily_summary();

CREATE TRIGGER deposits_summary_trigger
AFTER INSERT OR UPDATE OR DELETE ON deposits
FOR EACH ROW EXECUTE FUNCTION trigger_update_daily_summary();

CREATE TRIGGER cooperative_savings_summary_trigger
AFTER INSERT OR UPDATE OR DELETE ON cooperative_savings
FOR EACH ROW EXECUTE FUNCTION trigger_update_daily_summary();

CREATE TRIGGER withdrawals_summary_trigger
AFTER INSERT OR UPDATE OR DELETE ON withdrawals
FOR EACH ROW EXECUTE FUNCTION trigger_update_daily_summary();
