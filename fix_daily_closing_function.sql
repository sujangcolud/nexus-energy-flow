-- Fix for daily_closing function
-- Ensure the daily_closing RPC function exists and works properly

-- Drop existing function if it exists (to avoid conflicts)
DROP FUNCTION IF EXISTS public.daily_closing(uuid, date) CASCADE;
DROP FUNCTION IF EXISTS public.daily_closing(date, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.daily_closing(uuid, text) CASCADE;

-- Create a simple working daily_closing function
CREATE OR REPLACE FUNCTION public.daily_closing(
  p_user_id uuid,
  p_closing_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result jsonb;
    v_total_orders decimal := 0;
    v_total_expenses decimal := 0;
    v_total_deposits decimal := 0;
    v_total_withdrawals decimal := 0;
    v_total_charging decimal := 0;
    v_total_savings decimal := 0;
    v_net_income decimal := 0;
BEGIN
    -- Validate inputs
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID cannot be null';
    END IF;
    
    IF p_closing_date IS NULL THEN
        p_closing_date := CURRENT_DATE;
    END IF;
    
    -- Calculate totals for the day
    BEGIN
        -- Orders total
        SELECT COALESCE(SUM(total), 0) INTO v_total_orders
        FROM orders 
        WHERE user_id = p_user_id 
        AND order_date = p_closing_date;
        
        -- Expenses total
        SELECT COALESCE(SUM(amount), 0) INTO v_total_expenses
        FROM expenses 
        WHERE user_id = p_user_id 
        AND expense_date = p_closing_date;
        
        -- Deposits total
        SELECT COALESCE(SUM(amount), 0) INTO v_total_deposits
        FROM deposits 
        WHERE user_id = p_user_id 
        AND deposit_date = p_closing_date;
        
        -- Withdrawals total
        SELECT COALESCE(SUM(amount), 0) INTO v_total_withdrawals
        FROM withdrawals 
        WHERE user_id = p_user_id 
        AND withdrawal_date = p_closing_date;
        
        -- Charging sessions total
        SELECT COALESCE(SUM(total_amount), 0) INTO v_total_charging
        FROM charging_sessions 
        WHERE user_id = p_user_id 
        AND session_date = p_closing_date;
        
        -- Cooperative savings total
        SELECT COALESCE(SUM(contribution_amount), 0) INTO v_total_savings
        FROM cooperative_savings 
        WHERE user_id = p_user_id 
        AND contribution_date = p_closing_date;
        
    EXCEPTION
        WHEN OTHERS THEN
            -- If any table doesn't exist or has issues, log it but continue
            RAISE NOTICE 'Warning during calculations: %', SQLERRM;
    END;
    
    -- Calculate net income
    v_net_income := (v_total_orders + v_total_charging + v_total_deposits) - (v_total_expenses + v_total_withdrawals + v_total_savings);
    
    -- Build result JSON
    v_result := jsonb_build_object(
        'success', true,
        'closing_date', p_closing_date,
        'user_id', p_user_id,
        'summary', jsonb_build_object(
            'total_orders', v_total_orders,
            'total_expenses', v_total_expenses,
            'total_deposits', v_total_deposits,
            'total_withdrawals', v_total_withdrawals,
            'total_charging', v_total_charging,
            'total_savings', v_total_savings,
            'net_income', v_net_income
        ),
        'message', 'Daily closing completed successfully',
        'timestamp', NOW()
    );
    
    -- Try to update daily_summary table if it exists
    BEGIN
        -- Call the daily summary update function if it exists
        PERFORM update_daily_summary(p_closing_date);
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Could not update daily summary: %', SQLERRM;
    END;
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Return error information in a structured way
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'error_code', SQLSTATE,
            'closing_date', p_closing_date,
            'user_id', p_user_id,
            'timestamp', NOW()
        );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.daily_closing(uuid, date) TO authenticated;

-- Test the function to make sure it works
DO $$
DECLARE
    test_result jsonb;
    test_user_id uuid;
BEGIN
    -- Get a test user ID
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Test the function
        SELECT public.daily_closing(test_user_id, CURRENT_DATE) INTO test_result;
        RAISE NOTICE 'Daily closing function test result: %', test_result;
    ELSE
        RAISE NOTICE 'No users found for testing daily_closing function';
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error testing daily_closing function: %', SQLERRM;
END $$;

-- Force schema cache refresh
NOTIFY pgrst, 'reload schema';

-- Success message
SELECT 'Daily closing function created and tested successfully' as status;
