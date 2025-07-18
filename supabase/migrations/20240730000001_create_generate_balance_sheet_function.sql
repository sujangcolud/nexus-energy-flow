CREATE OR REPLACE FUNCTION generate_balance_sheet(
  user_id_param UUID,
  date_from DATE,
  date_to DATE
)
RETURNS VOID AS $$
DECLARE
  report_data JSONB;
  cash_in_hand NUMERIC;
  cash_at_bank NUMERIC;
  esewa_balance NUMERIC;
  cooperative_savings NUMERIC;
  total_orders NUMERIC;
  total_expenses NUMERIC;
  total_deposits NUMERIC;
  total_withdrawals NUMERIC;
  total_charging NUMERIC;
BEGIN
  -- Calculate total orders
  SELECT COALESCE(SUM(total), 0) INTO total_orders
  FROM orders
  WHERE user_id = user_id_param
  AND order_date BETWEEN date_from AND date_to;

  -- Calculate total expenses
  SELECT COALESCE(SUM(amount), 0) INTO total_expenses
  FROM expenses
  WHERE user_id = user_id_param
  AND expense_date BETWEEN date_from AND date_to;

  -- Calculate total deposits
  SELECT COALESCE(SUM(amount), 0) INTO total_deposits
  FROM deposits
  WHERE user_id = user_id_param
  AND deposit_date BETWEEN date_from AND date_to;

  -- Calculate total withdrawals
  SELECT COALESCE(SUM(amount), 0) INTO total_withdrawals
  FROM withdrawals
  WHERE user_id = user_id_param
  AND withdrawal_date BETWEEN date_from AND date_to;

  -- Calculate total charging
  SELECT COALESCE(SUM(total_amount), 0) INTO total_charging
  FROM charging_sessions
  WHERE user_id = user_id_param
  AND session_date BETWEEN date_from AND date_to;

  -- Calculate balances
  cash_in_hand := total_deposits - total_withdrawals - total_expenses;
  cash_at_bank := 0; -- Assuming no bank transactions for now
  esewa_balance := 0; -- Assuming no esewa transactions for now
  cooperative_savings := 0; -- Assuming no cooperative savings for now

  -- Create the report data
  report_data := jsonb_build_object(
    'cash_in_hand', cash_in_hand,
    'cash_at_bank', cash_at_bank,
    'esewa_balance', esewa_balance,
    'cooperative_savings', cooperative_savings,
    'total_orders', total_orders,
    'total_expenses', total_expenses,
    'total_deposits', total_deposits,
    'total_withdrawals', total_withdrawals,
    'total_charging', total_charging
  );

  -- Insert the report into the balance_sheet table
  INSERT INTO balance_sheet (user_id, date_range_start, date_range_end, report_data)
  VALUES (user_id_param, date_from, date_to, report_data);
END;
$$ LANGUAGE plpgsql;
