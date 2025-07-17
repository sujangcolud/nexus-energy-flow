CREATE OR REPLACE FUNCTION get_report_data(user_id_param UUID, from_date DATE, to_date DATE)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_revenue', (SELECT get_total_revenue(user_id_param, from_date, to_date)),
    'total_expenses', (SELECT get_total_expenses(user_id_param, from_date, to_date)),
    'net_profit', (SELECT get_net_profit(user_id_param, from_date, to_date)),
    'cash_in_hand', (SELECT get_cash_in_hand(user_id_param, from_date, to_date)),
    'esewa_balance', (SELECT get_esewa_balance(user_id_param, from_date, to_date)),
    'fonepay_balance', (SELECT get_fonepay_balance(user_id_param, from_date, to_date)),
    'bank_balance', (SELECT get_bank_balance(user_id_param, from_date, to_date)),
    'total_cooperative_savings', (SELECT get_cooperative_savings(user_id_param, from_date, to_date)),
    'orders', (SELECT json_agg(t) FROM (SELECT * FROM orders WHERE user_id = user_id_param AND order_date BETWEEN from_date AND to_date) t),
    'charging', (SELECT json_agg(t) FROM (SELECT * FROM charging_sessions WHERE user_id = user_id_param AND session_date BETWEEN from_date AND to_date) t),
    'expenses', (SELECT json_agg(t) FROM (SELECT * FROM expenses WHERE user_id = user_id_param AND expense_date BETWEEN from_date AND to_date) t),
    'deposits', (SELECT json_agg(t) FROM (SELECT * FROM deposits WHERE user_id = user_id_param AND deposit_date BETWEEN from_date AND to_date) t),
    'withdrawals', (SELECT json_agg(t) FROM (SELECT * FROM withdrawals WHERE user_id = user_id_param AND withdrawal_date BETWEEN from_date AND to_date) t),
    'savings', (SELECT json_agg(t) FROM (SELECT * FROM cooperative_savings WHERE user_id = user_id_param AND contribution_date BETWEEN from_date AND to_date) t)
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;
