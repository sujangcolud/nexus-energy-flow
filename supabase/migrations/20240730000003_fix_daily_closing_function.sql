CREATE OR REPLACE FUNCTION daily_closing(
  p_user_id UUID,
  p_closing_date DATE
)
RETURNS VOID AS $$
DECLARE
  cash_balance_val NUMERIC;
  cooperative_savings_balance_val NUMERIC;
  esewa_balance_val NUMERIC;
BEGIN
  -- Calculate cash balance
  SELECT
    COALESCE(SUM(CASE WHEN payment_mode = 'cash' THEN amount ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN type = 'expense' AND payment_mode = 'cash' THEN amount ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN type = 'withdrawal' AND payment_mode = 'cash' THEN amount ELSE 0 END), 0)
  INTO cash_balance_val
  FROM (
    SELECT amount, 'deposit' as type, payment_mode FROM deposits WHERE user_id = p_user_id AND deposit_date = p_closing_date
    UNION ALL
    SELECT amount, 'expense' as type, payment_mode FROM expenses WHERE user_id = p_user_id AND expense_date = p_closing_date
    UNION ALL
    SELECT amount, 'withdrawal' as type, payment_mode FROM withdrawals WHERE user_id = p_user_id AND withdrawal_date = p_closing_date
  ) as transactions;

  -- Calculate cooperative savings balance
  SELECT
    COALESCE(SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN type = 'withdrawal' THEN amount ELSE 0 END), 0)
  INTO cooperative_savings_balance_val
  FROM cooperative_savings
  WHERE user_id = p_user_id AND date = p_closing_date;

  -- Calculate esewa balance
  SELECT
    COALESCE(SUM(CASE WHEN payment_mode = 'esewa' THEN amount ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN type = 'expense' AND payment_mode = 'esewa' THEN amount ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN type = 'withdrawal' AND payment_mode = 'esewa' THEN amount ELSE 0 END), 0)
  INTO esewa_balance_val
  FROM (
    SELECT amount, 'deposit' as type, payment_mode FROM deposits WHERE user_id = p_user_id AND deposit_date = p_closing_date
    UNION ALL
    SELECT amount, 'expense' as type, payment_mode FROM expenses WHERE user_id = p_user_id AND expense_date = p_closing_date
    UNION ALL
    SELECT amount, 'withdrawal' as type, payment_mode FROM withdrawals WHERE user_id = p_user_id AND withdrawal_date = p_closing_date
  ) as transactions;


  -- Insert the daily closing balances into the balances table
  INSERT INTO balances (user_id, date, cash_balance, cooperative_savings_balance, esewa_balance)
  VALUES (p_user_id, p_closing_date, cash_balance_val, cooperative_savings_balance_val, esewa_balance_val)
  ON CONFLICT (user_id, date) DO UPDATE
  SET
    cash_balance = excluded.cash_balance,
    cooperative_savings_balance = excluded.cooperative_savings_balance,
    esewa_balance = excluded.esewa_balance;
END;
$$ LANGUAGE plpgsql;
