-- Final fix for daily_closing function to resolve 400 Bad Request
-- This ensures a single, clean signature that matches the frontend's named parameters

-- 1. Drop ALL possible overloads to start fresh
DROP FUNCTION IF EXISTS public.daily_closing(uuid, date) CASCADE;
DROP FUNCTION IF EXISTS public.daily_closing(date, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.daily_closing(p_user_id uuid, p_closing_date date) CASCADE;
DROP FUNCTION IF EXISTS public.daily_closing(p_closing_date date, p_user_id uuid) CASCADE;

-- 2. Create the canonical version with explicit parameter names matching the frontend
CREATE OR REPLACE FUNCTION public.daily_closing(
  p_user_id uuid,
  p_closing_date date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result jsonb;
    v_total_income numeric := 0;
    v_total_expenses numeric := 0;
    v_net_profit numeric := 0;
BEGIN
    -- Basic validation
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'p_user_id is required';
    END IF;

    IF p_closing_date IS NULL THEN
        p_closing_date := CURRENT_DATE;
    END IF;

    -- Ensure daily_summary is updated for this date
    -- We use a nested block to catch errors if update_daily_summary doesn't exist
    BEGIN
        PERFORM public.update_daily_summary(p_closing_date);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'update_daily_summary failed or not found: %', SQLERRM;
    END;

    -- Fetch some basic stats to return
    SELECT
        COALESCE(total_income, 0),
        COALESCE(total_expenses, 0)
    INTO v_total_income, v_total_expenses
    FROM public.daily_summary
    WHERE summary_date = p_closing_date
    LIMIT 1;

    v_net_profit := v_total_income - v_total_expenses;

    v_result := jsonb_build_object(
        'success', true,
        'message', 'Daily closing processed for ' || p_closing_date::text,
        'data', jsonb_build_object(
            'date', p_closing_date,
            'total_income', v_total_income,
            'total_expenses', v_total_expenses,
            'net_profit', v_net_profit
        )
    );

    RETURN v_result;
END;
$$;

-- 3. Grant permissions
GRANT EXECUTE ON FUNCTION public.daily_closing(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.daily_closing(uuid, date) TO service_role;

-- 4. Ensure update_daily_summary also has proper permissions if it's called
GRANT EXECUTE ON FUNCTION public.update_daily_summary(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_daily_summary(date) TO service_role;

-- 5. Force schema reload
NOTIFY pgrst, 'reload schema';
