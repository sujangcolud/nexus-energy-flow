-- Functions to calculate financial metrics

-- Total Revenue
CREATE OR REPLACE FUNCTION get_total_revenue(user_id_param UUID, from_date DATE, to_date DATE)
RETURNS NUMERIC AS $$
BEGIN
  RETURN (
    SELECT COALESCE(SUM(total), 0) FROM orders WHERE user_id = user_id_param AND order_date BETWEEN from_date AND to_date
  ) + (
    SELECT COALESCE(SUM(total_amount), 0) FROM charging_sessions WHERE user_id = user_id_param AND session_date BETWEEN from_date AND to_date
  );
END;
$$ LANGUAGE plpgsql;

-- Total Expenses
CREATE OR REPLACE FUNCTION get_total_expenses(user_id_param UUID, from_date DATE, to_date DATE)
RETURNS NUMERIC AS $$
BEGIN
  RETURN (
    SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE user_id = user_id_param AND expense_date BETWEEN from_date AND to_date
  );
END;
$$ LANGUAGE plpgsql;

-- Net Profit
CREATE OR REPLACE FUNCTION get_net_profit(user_id_param UUID, from_date DATE, to_date DATE)
RETURNS NUMERIC AS $$
BEGIN
  RETURN (
    SELECT get_total_revenue(user_id_param, from_date, to_date) - get_total_expenses(user_id_param, from_date, to_date)
  );
END;
$$ LANGUAGE plpgsql;

-- Cash in Hand
CREATE OR REPLACE FUNCTION get_cash_in_hand(user_id_param UUID, from_date DATE, to_date DATE)
RETURNS NUMERIC AS $$
BEGIN
  RETURN (
    (SELECT COALESCE(SUM(total), 0) FROM orders WHERE user_id = user_id_param AND payment_mode = 'Cash' AND order_date BETWEEN from_date AND to_date) +
    (SELECT COALESCE(SUM(total_amount), 0) FROM charging_sessions WHERE user_id = user_id_param AND payment_mode = 'Cash' AND session_date BETWEEN from_date AND to_date) -
    (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE user_id = user_id_param AND payment_mode = 'Cash' AND expense_date BETWEEN from_date AND to_date) -
    (SELECT COALESCE(SUM(contribution_amount), 0) FROM cooperative_savings WHERE user_id = user_id_param AND contribution_method = 'Cash' AND contribution_date BETWEEN from_date AND to_date) -
    (SELECT COALESCE(SUM(amount), 0) FROM deposits WHERE user_id = user_id_param AND deposit_method = 'Cash' AND deposit_date BETWEEN from_date AND to_date)
  );
END;
$$ LANGUAGE plpgsql;

-- Esewa Balance
CREATE OR REPLACE FUNCTION get_esewa_balance(user_id_param UUID, from_date DATE, to_date DATE)
RETURNS NUMERIC AS $$
BEGIN
  RETURN (
    (SELECT COALESCE(SUM(total), 0) FROM orders WHERE user_id = user_id_param AND payment_mode = 'Esewa' AND order_date BETWEEN from_date AND to_date) +
    (SELECT COALESCE(SUM(total_amount), 0) FROM charging_sessions WHERE user_id = user_id_param AND payment_mode = 'Esewa' AND session_date BETWEEN from_date AND to_date) -
    (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE user_id = user_id_param AND payment_mode = 'Esewa' AND expense_date BETWEEN from_date AND to_date) -
    (SELECT COALESCE(SUM(contribution_amount), 0) FROM cooperative_savings WHERE user_id = user_id_param AND contribution_method = 'Esewa' AND contribution_date BETWEEN from_date AND to_date) -
    (SELECT COALESCE(SUM(amount), 0) FROM deposits WHERE user_id = user_id_param AND deposit_method = 'Esewa' AND deposit_date BETWEEN from_date AND to_date) +
    (SELECT COALESCE(SUM(amount), 0) FROM withdrawals WHERE user_id = user_id_param AND withdrawal_method = 'Esewa' AND withdrawal_date BETWEEN from_date AND to_date)
  );
END;
$$ LANGUAGE plpgsql;

-- Fonepay Balance
CREATE OR REPLACE FUNCTION get_fonepay_balance(user_id_param UUID, from_date DATE, to_date DATE)
RETURNS NUMERIC AS $$
BEGIN
  RETURN (
    (SELECT COALESCE(SUM(total), 0) FROM orders WHERE user_id = user_id_param AND payment_mode = 'Fonepay' AND order_date BETWEEN from_date AND to_date) +
    (SELECT COALESCE(SUM(total_amount), 0) FROM charging_sessions WHERE user_id = user_id_param AND payment_mode = 'Fonepay' AND session_date BETWEEN from_date AND to_date) -
    (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE user_id = user_id_param AND payment_mode = 'Fonepay' AND expense_date BETWEEN from_date AND to_date) -
    (SELECT COALESCE(SUM(contribution_amount), 0) FROM cooperative_savings WHERE user_id = user_id_param AND contribution_method = 'Fonepay' AND contribution_date BETWEEN from_date AND to_date) -
    (SELECT COALESCE(SUM(amount), 0) FROM deposits WHERE user_id = user_id_param AND deposit_method = 'Fonepay' AND deposit_date BETWEEN from_date AND to_date) +
    (SELECT COALESCE(SUM(amount), 0) FROM withdrawals WHERE user_id = user_id_param AND withdrawal_method = 'Fonepay' AND withdrawal_date BETWEEN from_date AND to_date)
  );
END;
$$ LANGUAGE plpgsql;

-- Bank Balance
CREATE OR REPLACE FUNCTION get_bank_balance(user_id_param UUID, from_date DATE, to_date DATE)
RETURNS NUMERIC AS $$
BEGIN
  RETURN (
    (SELECT COALESCE(SUM(amount), 0) FROM deposits WHERE user_id = user_id_param AND deposit_method = 'Bank' AND deposit_date BETWEEN from_date AND to_date) -
    (SELECT COALESCE(SUM(amount), 0) FROM withdrawals WHERE user_id = user_id_param AND withdrawal_method = 'Bank' AND withdrawal_date BETWEEN from_date AND to_date) -
    (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE user_id = user_id_param AND payment_mode IN ('Cheque', 'Bank') AND expense_date BETWEEN from_date AND to_date)
  );
END;
$$ LANGUAGE plpgsql;

-- Cooperative Savings
CREATE OR REPLACE FUNCTION get_cooperative_savings(user_id_param UUID, from_date DATE, to_date DATE)
RETURNS NUMERIC AS $$
BEGIN
  RETURN (
    SELECT COALESCE(SUM(contribution_amount), 0) FROM cooperative_savings WHERE user_id = user_id_param AND contribution_date BETWEEN from_date AND to_date
  );
END;
$$ LANGUAGE plpgsql;
