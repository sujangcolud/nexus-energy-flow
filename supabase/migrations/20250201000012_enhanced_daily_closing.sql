-- Enhanced Daily Closing function with comprehensive calculations and proper error handling

-- Create or update the daily_closing function with complete business logic
CREATE OR REPLACE FUNCTION public.daily_closing(
  p_user_id uuid,
  p_closing_date date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    -- Income variables
    orders_total numeric := 0;
    orders_cash numeric := 0;
    orders_fonepay numeric := 0;
    orders_esewa numeric := 0;
    orders_bank numeric := 0;
    orders_cheque numeric := 0;
    orders_credit numeric := 0;
    
    charging_total numeric := 0;
    charging_cash numeric := 0;
    charging_fonepay numeric := 0;
    charging_esewa numeric := 0;
    charging_bank numeric := 0;
    charging_cheque numeric := 0;
    charging_credit numeric := 0;
    
    -- Expense variables
    expenses_total numeric := 0;
    expenses_cash numeric := 0;
    expenses_bank numeric := 0;
    
    -- Financial movements
    deposits_total numeric := 0;
    deposits_esewa numeric := 0;
    deposits_fonepay numeric := 0;
    deposits_bank numeric := 0;
    
    withdrawals_total numeric := 0;
    withdrawals_cash numeric := 0;
    
    cooperative_total numeric := 0;
    
    -- Calculated balances
    total_income numeric := 0;
    total_cash_income numeric := 0;
    total_digital_income numeric := 0;
    net_cash_balance numeric := 0;
    net_fonepay_balance numeric := 0;
    net_esewa_balance numeric := 0;
    net_bank_balance numeric := 0;
    net_cooperative_balance numeric := 0;
    total_net_balance numeric := 0;
    
    -- Return object
    daily_summary jsonb;
    
BEGIN
    -- Validate input parameters
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID cannot be null';
    END IF;
    
    IF p_closing_date IS NULL THEN
        p_closing_date := CURRENT_DATE;
    END IF;
    
    -- Calculate orders totals by payment mode
    SELECT 
        COALESCE(SUM(total), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) = 'cash' THEN total ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) = 'fonepay' THEN total ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) = 'esewa' THEN total ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) = 'bank' THEN total ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) = 'cheque' THEN total ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) = 'credit' THEN total ELSE 0 END), 0)
    INTO orders_total, orders_cash, orders_fonepay, orders_esewa, orders_bank, orders_cheque, orders_credit
    FROM orders 
    WHERE user_id = p_user_id AND order_date = p_closing_date;
    
    -- Calculate charging totals by payment mode
    SELECT 
        COALESCE(SUM(total_amount), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) = 'cash' THEN total_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) = 'fonepay' THEN total_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) = 'esewa' THEN total_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) = 'bank' THEN total_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) = 'cheque' THEN total_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) = 'credit' THEN total_amount ELSE 0 END), 0)
    INTO charging_total, charging_cash, charging_fonepay, charging_esewa, charging_bank, charging_cheque, charging_credit
    FROM charging_sessions 
    WHERE user_id = p_user_id AND session_date = p_closing_date;
    
    -- Calculate expenses totals by payment mode
    SELECT 
        COALESCE(SUM(amount), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) = 'cash' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) != 'cash' THEN amount ELSE 0 END), 0)
    INTO expenses_total, expenses_cash, expenses_bank
    FROM expenses 
    WHERE user_id = p_user_id AND expense_date = p_closing_date;
    
    -- Calculate deposits by mode
    SELECT 
        COALESCE(SUM(amount), 0),
        COALESCE(SUM(CASE WHEN LOWER(mode) = 'esewa' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(mode) = 'fonepay' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(mode) NOT IN ('esewa', 'fonepay') THEN amount ELSE 0 END), 0)
    INTO deposits_total, deposits_esewa, deposits_fonepay, deposits_bank
    FROM deposits 
    WHERE user_id = p_user_id AND deposit_date = p_closing_date;
    
    -- Calculate withdrawals
    SELECT 
        COALESCE(SUM(amount), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) = 'cash' THEN amount ELSE 0 END), 0)
    INTO withdrawals_total, withdrawals_cash
    FROM withdrawals 
    WHERE user_id = p_user_id AND withdrawal_date = p_closing_date;
    
    -- Calculate cooperative savings
    SELECT COALESCE(SUM(contribution_amount), 0)
    INTO cooperative_total
    FROM cooperative_savings 
    WHERE user_id = p_user_id AND contribution_date = p_closing_date;
    
    -- Calculate aggregate totals
    total_income := orders_total + charging_total;
    total_cash_income := orders_cash + charging_cash;
    total_digital_income := total_income - total_cash_income;
    
    -- Calculate net balances (income - expenses + deposits - withdrawals - savings)
    net_cash_balance := total_cash_income - expenses_cash + withdrawals_cash - cooperative_total;
    net_fonepay_balance := orders_fonepay + charging_fonepay + deposits_fonepay;
    net_esewa_balance := orders_esewa + charging_esewa + deposits_esewa;
    net_bank_balance := orders_bank + charging_bank + orders_cheque + charging_cheque + deposits_bank - expenses_bank - withdrawals_total + withdrawals_cash;
    net_cooperative_balance := cooperative_total;
    
    total_net_balance := net_cash_balance + net_fonepay_balance + net_esewa_balance + net_bank_balance + net_cooperative_balance;
    
    -- Create comprehensive summary
    daily_summary := jsonb_build_object(
        'date', p_closing_date,
        'user_id', p_user_id,
        'income', jsonb_build_object(
            'orders', jsonb_build_object(
                'total', orders_total,
                'cash', orders_cash,
                'fonepay', orders_fonepay,
                'esewa', orders_esewa,
                'bank', orders_bank,
                'cheque', orders_cheque,
                'credit', orders_credit
            ),
            'charging', jsonb_build_object(
                'total', charging_total,
                'cash', charging_cash,
                'fonepay', charging_fonepay,
                'esewa', charging_esewa,
                'bank', charging_bank,
                'cheque', charging_cheque,
                'credit', charging_credit
            ),
            'total_income', total_income,
            'total_cash_income', total_cash_income,
            'total_digital_income', total_digital_income
        ),
        'expenses', jsonb_build_object(
            'total', expenses_total,
            'cash', expenses_cash,
            'bank', expenses_bank
        ),
        'financial_movements', jsonb_build_object(
            'deposits', jsonb_build_object(
                'total', deposits_total,
                'esewa', deposits_esewa,
                'fonepay', deposits_fonepay,
                'bank', deposits_bank
            ),
            'withdrawals', jsonb_build_object(
                'total', withdrawals_total,
                'cash', withdrawals_cash
            ),
            'cooperative_savings', cooperative_total
        ),
        'net_balances', jsonb_build_object(
            'cash', net_cash_balance,
            'fonepay', net_fonepay_balance,
            'esewa', net_esewa_balance,
            'bank', net_bank_balance,
            'cooperative', net_cooperative_balance,
            'total', total_net_balance
        ),
        'summary', jsonb_build_object(
            'net_profit', total_income - expenses_total,
            'total_assets', total_net_balance,
            'cash_flow', total_cash_income - expenses_cash,
            'digital_flow', total_digital_income
        ),
        'processed_at', NOW()
    );
    
    -- Update the daily summary in the database
    PERFORM update_daily_summary(p_closing_date);
    
    RETURN daily_summary;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error and return error information
        RAISE EXCEPTION 'Daily closing failed: %', SQLERRM;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.daily_closing(uuid, date) TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION public.daily_closing(uuid, date) IS 'Comprehensive daily closing function that calculates all financial metrics for a specific date and user';
