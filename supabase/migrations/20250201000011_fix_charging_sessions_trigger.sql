-- Fix the charging_sessions trigger that's causing column "amount" does not exist error
-- The trigger is looking for 'amount' but charging_sessions table uses 'total_amount'

-- First, let's drop the problematic trigger and function
DROP TRIGGER IF EXISTS trigger_update_daily_summary ON charging_sessions;
DROP FUNCTION IF EXISTS update_daily_summary(date);
DROP FUNCTION IF EXISTS trigger_update_daily_summary();

-- Create corrected update_daily_summary function that uses proper column names
CREATE OR REPLACE FUNCTION update_daily_summary(summary_date date)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    orders_total numeric := 0;
    orders_cash numeric := 0;
    orders_fonepay numeric := 0;
    orders_esewa numeric := 0;
    
    charging_total numeric := 0;
    charging_cash numeric := 0;
    charging_fonepay numeric := 0;
    charging_esewa numeric := 0;
    
    expenses_total numeric := 0;
    expenses_cash numeric := 0;
    
    deposits_total numeric := 0;
    withdrawals_total numeric := 0;
    cooperative_total numeric := 0;
BEGIN
    -- Calculate orders totals using 'total' column
    SELECT 
        COALESCE(SUM(total), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) = 'cash' THEN total ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) = 'fonepay' THEN total ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) = 'esewa' THEN total ELSE 0 END), 0)
    INTO orders_total, orders_cash, orders_fonepay, orders_esewa
    FROM orders 
    WHERE order_date = summary_date;
    
    -- Calculate charging totals using 'total_amount' column (NOT 'amount')
    SELECT 
        COALESCE(SUM(total_amount), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) = 'cash' THEN total_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) = 'fonepay' THEN total_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) = 'esewa' THEN total_amount ELSE 0 END), 0)
    INTO charging_total, charging_cash, charging_fonepay, charging_esewa
    FROM charging_sessions 
    WHERE session_date = summary_date;
    
    -- Calculate expenses totals using 'amount' column
    SELECT 
        COALESCE(SUM(amount), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) = 'cash' THEN amount ELSE 0 END), 0)
    INTO expenses_total, expenses_cash
    FROM expenses 
    WHERE expense_date = summary_date;
    
    -- Calculate deposits using 'amount' column
    SELECT COALESCE(SUM(amount), 0)
    INTO deposits_total
    FROM deposits 
    WHERE deposit_date = summary_date;
    
    -- Calculate withdrawals using 'amount' column
    SELECT COALESCE(SUM(amount), 0)
    INTO withdrawals_total
    FROM withdrawals 
    WHERE withdrawal_date = summary_date;
    
    -- Calculate cooperative savings using 'contribution_amount' column
    SELECT COALESCE(SUM(contribution_amount), 0)
    INTO cooperative_total
    FROM cooperative_savings 
    WHERE contribution_date = summary_date;
    
    -- Insert or update daily summary in balances table
    INSERT INTO balances (
        date,
        cash_balance,
        fonepay_balance, 
        esewa_balance,
        bank_balance,
        cooperative_balance,
        total_income,
        total_expenses,
        net_balance,
        orders_total,
        charging_total,
        expenses_total,
        deposits_total,
        withdrawals_total,
        cooperative_total,
        created_at,
        updated_at
    ) VALUES (
        summary_date,
        (orders_cash + charging_cash - expenses_cash),
        (orders_fonepay + charging_fonepay + deposits_total),
        (orders_esewa + charging_esewa),
        (deposits_total - withdrawals_total),
        cooperative_total,
        (orders_total + charging_total),
        expenses_total,
        (orders_total + charging_total - expenses_total),
        orders_total,
        charging_total,
        expenses_total,
        deposits_total,
        withdrawals_total,
        cooperative_total,
        NOW(),
        NOW()
    )
    ON CONFLICT (date) 
    DO UPDATE SET
        cash_balance = (orders_cash + charging_cash - expenses_cash),
        fonepay_balance = (orders_fonepay + charging_fonepay + deposits_total),
        esewa_balance = (orders_esewa + charging_esewa),
        bank_balance = (deposits_total - withdrawals_total),
        cooperative_balance = cooperative_total,
        total_income = (orders_total + charging_total),
        total_expenses = expenses_total,
        net_balance = (orders_total + charging_total - expenses_total),
        orders_total = orders_total,
        charging_total = charging_total,
        expenses_total = expenses_total,
        deposits_total = deposits_total,
        withdrawals_total = withdrawals_total,
        cooperative_total = cooperative_total,
        updated_at = NOW();
        
END;
$$;

-- Create trigger function that calls the update_daily_summary
CREATE OR REPLACE FUNCTION trigger_update_daily_summary()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Update summary for the affected date
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        PERFORM update_daily_summary(NEW.date);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM update_daily_summary(OLD.date);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

-- Create triggers for all relevant tables
CREATE TRIGGER trigger_update_daily_summary_orders
    AFTER INSERT OR UPDATE OR DELETE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_daily_summary();

CREATE TRIGGER trigger_update_daily_summary_charging
    AFTER INSERT OR UPDATE OR DELETE ON charging_sessions
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_daily_summary();

CREATE TRIGGER trigger_update_daily_summary_expenses
    AFTER INSERT OR UPDATE OR DELETE ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_daily_summary();

CREATE TRIGGER trigger_update_daily_summary_deposits
    AFTER INSERT OR UPDATE OR DELETE ON deposits
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_daily_summary();

CREATE TRIGGER trigger_update_daily_summary_withdrawals
    AFTER INSERT OR UPDATE OR DELETE ON withdrawals
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_daily_summary();

CREATE TRIGGER trigger_update_daily_summary_cooperative
    AFTER INSERT OR UPDATE OR DELETE ON cooperative_savings
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_daily_summary();

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_daily_summary(date) TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_update_daily_summary() TO authenticated;
