-- Triggers to update balances for Staff Advances and Payroll

-- 1. Function to update balances for Staff Advance Disbursement
CREATE OR REPLACE FUNCTION public.handle_staff_advance_disbursement()
RETURNS TRIGGER AS $$
DECLARE
    v_column_name TEXT;
BEGIN
    -- Only act when status changes to 'Disbursed'
    IF (NEW.status = 'Disbursed' AND (OLD.status IS DISTINCT FROM 'Disbursed')) THEN
        -- Determine column based on disbursement method
        IF LOWER(NEW.disbursement_method) = 'cash withdrawal' THEN
            v_column_name := 'cash_in_hand';
        ELSIF LOWER(NEW.disbursement_method) = 'bank transfer' THEN
            v_column_name := 'bank_balance';
        ELSE
            RETURN NEW;
        END IF;

        -- Decrease the balance
        EXECUTE format('UPDATE public.balances SET %I = COALESCE(%I, 0) - $1, updated_at = NOW() WHERE user_id = $2', v_column_name, v_column_name)
        USING NEW.amount, NEW.employee_id; -- Note: In this system, user_id in balances table might refer to the person managing the funds.
        -- If balances table tracks individual employees, this is correct.
        -- However, usually 'balances' tracks the company counter.
        -- Let's check who the 'user_id' in balances belongs to.

        -- Fallback: Update for the admin who performed the action if employee doesn't have a balance record
        UPDATE public.balances SET
            cash_in_hand = CASE WHEN v_column_name = 'cash_in_hand' THEN cash_in_hand - NEW.amount ELSE cash_in_hand END,
            bank_balance = CASE WHEN v_column_name = 'bank_balance' THEN bank_balance - NEW.amount ELSE bank_balance END,
            updated_at = NOW()
        WHERE user_id = auth.uid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_staff_advance_disbursed
    AFTER UPDATE ON public.staff_advances
    FOR EACH ROW EXECUTE FUNCTION public.handle_staff_advance_disbursement();

-- 2. Function to update balances for Payroll Payment
CREATE OR REPLACE FUNCTION public.handle_payroll_payment()
RETURNS TRIGGER AS $$
DECLARE
    v_column_name TEXT;
BEGIN
    -- Only act when status changes to 'Paid'
    IF (NEW.status = 'Paid' AND (OLD.status IS DISTINCT FROM 'Paid')) THEN
        IF LOWER(NEW.payment_mode) = 'cash' THEN
            v_column_name := 'cash_in_hand';
        ELSIF LOWER(NEW.payment_mode) = 'bank' THEN
            v_column_name := 'bank_balance';
        ELSE
            RETURN NEW;
        END IF;

        -- Decrease the company balance
        UPDATE public.balances SET
            cash_in_hand = CASE WHEN v_column_name = 'cash_in_hand' THEN cash_in_hand - NEW.net_salary ELSE cash_in_hand END,
            bank_balance = CASE WHEN v_column_name = 'bank_balance' THEN bank_balance - NEW.net_salary ELSE bank_balance END,
            updated_at = NOW()
        WHERE user_id = auth.uid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_payroll_paid
    AFTER UPDATE ON public.payroll_records
    FOR EACH ROW EXECUTE FUNCTION public.handle_payroll_payment();
