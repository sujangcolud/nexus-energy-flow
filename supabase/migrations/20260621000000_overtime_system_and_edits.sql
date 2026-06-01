-- 1. Enhance Employees with Overtime Rate
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS overtime_rate NUMERIC DEFAULT 0;

-- 2. Enhance Payroll Records with Overtime
ALTER TABLE public.payroll_records ADD COLUMN IF NOT EXISTS overtime_hours NUMERIC DEFAULT 0;
ALTER TABLE public.payroll_records ADD COLUMN IF NOT EXISTS overtime_pay NUMERIC DEFAULT 0;

-- 3. Create Overtime Tracking Table
CREATE TABLE IF NOT EXISTS public.employee_overtime (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    overtime_date DATE NOT NULL,
    hours NUMERIC NOT NULL CHECK (hours > 0),
    rate_at_time NUMERIC NOT NULL,
    total_amount NUMERIC GENERATED ALWAYS AS (hours * rate_at_time) STORED,
    reason TEXT,
    status TEXT DEFAULT 'Pending', -- Pending, Approved, Rejected, Processed
    approved_by UUID REFERENCES auth.users(id),
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Update process_monthly_payroll to include Overtime
CREATE OR REPLACE FUNCTION public.process_monthly_payroll(
    p_month_year DATE,
    p_user_id UUID
) RETURNS VOID AS $$
DECLARE
    v_emp RECORD;
    v_gross NUMERIC;
    v_ssf_emp NUMERIC;
    v_ssf_org NUMERIC;
    v_tax NUMERIC;
    v_advance_deduction NUMERIC;
    v_net NUMERIC;
    v_outstanding_adv NUMERIC;
    v_ssf_rates JSONB;
    v_overtime_pay NUMERIC;
    v_overtime_hours NUMERIC;
BEGIN
    SELECT value INTO v_ssf_rates FROM public.payroll_settings WHERE key = 'ssf_rates';

    FOR v_emp IN SELECT * FROM public.employees WHERE deleted_at IS NULL AND is_active = true LOOP
        -- Calculate Overtime for the month
        SELECT
            COALESCE(SUM(hours), 0),
            COALESCE(SUM(total_amount), 0)
        INTO v_overtime_hours, v_overtime_pay
        FROM public.employee_overtime
        WHERE employee_id = v_emp.id
          AND overtime_date >= p_month_year
          AND overtime_date < (p_month_year + interval '1 month')
          AND status = 'Approved'
          AND deleted_at IS NULL;

        v_gross := v_emp.basic_salary + COALESCE(v_emp.allowance, 0) + COALESCE(v_emp.other_benefits, 0) + v_overtime_pay;
        v_ssf_emp := v_gross * (v_ssf_rates->>'employee_ssf_percent')::NUMERIC / 100;
        v_ssf_org := v_gross * (v_ssf_rates->>'employer_ssf_percent')::NUMERIC / 100;

        -- Tax calculation (Annualized)
        v_tax := public.calculate_nepal_tax(v_gross * 12, v_emp.marital_status, v_ssf_emp * 12) / 12;

        -- Advance Recovery
        SELECT COALESCE(SUM(outstanding_amount), 0) INTO v_outstanding_adv
        FROM public.staff_advances
        WHERE employee_id = v_emp.id AND status IN ('Disbursed', 'Partially Settled') AND deleted_at IS NULL;

        v_net := v_gross - v_ssf_emp - v_tax;
        v_advance_deduction := LEAST(v_net, v_outstanding_adv);
        v_net := v_net - v_advance_deduction;

        INSERT INTO public.payroll_records (
            employee_id, month_year, basic_salary, allowance, other_benefits,
            overtime_hours, overtime_pay,
            gross_salary, employee_ssf, employer_ssf, tax_deduction,
            advance_recovery, net_salary, ctc, status
        ) VALUES (
            v_emp.id, p_month_year, v_emp.basic_salary, v_emp.allowance, v_emp.other_benefits,
            v_overtime_hours, v_overtime_pay,
            v_gross, v_ssf_emp, v_ssf_org, v_tax,
            v_advance_deduction, v_net, v_gross + v_ssf_org, 'Calculated'
        )
        ON CONFLICT (employee_id, month_year)
        DO UPDATE SET
            basic_salary = EXCLUDED.basic_salary,
            allowance = EXCLUDED.allowance,
            other_benefits = EXCLUDED.other_benefits,
            overtime_hours = EXCLUDED.overtime_hours,
            overtime_pay = EXCLUDED.overtime_pay,
            gross_salary = EXCLUDED.gross_salary,
            employee_ssf = EXCLUDED.employee_ssf,
            tax_deduction = EXCLUDED.tax_deduction,
            advance_recovery = EXCLUDED.advance_recovery,
            net_salary = EXCLUDED.net_salary,
            updated_at = NOW();

        -- Mark overtime as processed
        UPDATE public.employee_overtime
        SET status = 'Processed'
        WHERE employee_id = v_emp.id
          AND overtime_date >= p_month_year
          AND overtime_date < (p_month_year + interval '1 month')
          AND status = 'Approved'
          AND deleted_at IS NULL;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Enhanced Trigger for Financial Impact (Handling Updates)
CREATE OR REPLACE FUNCTION public.handle_staff_financial_impact()
RETURNS TRIGGER AS $$
DECLARE
    v_mode TEXT;
    v_amount NUMERIC;
    v_old_amount NUMERIC;
    v_col TEXT;
    v_diff NUMERIC;
BEGIN
    -- Handle Staff Advances
    IF TG_TABLE_NAME = 'staff_advances' THEN
        -- Case 1: Just Disbursed
        IF (NEW.status = 'Disbursed' AND (OLD.status IS NULL OR OLD.status IS DISTINCT FROM 'Disbursed')) THEN
            v_mode := LOWER(NEW.disbursement_method);
            v_amount := NEW.amount;
            v_col := CASE WHEN v_mode = 'cash withdrawal' THEN 'cash_in_hand' WHEN v_mode = 'bank transfer' THEN 'bank_balance' END;

            IF v_col IS NOT NULL THEN
                EXECUTE format('UPDATE public.balances SET %I = %I - $1, updated_at = NOW() WHERE user_id = auth.uid()', v_col, v_col) USING v_amount;
            END IF;

        -- Case 2: Update to an already disbursed advance
        ELSIF (NEW.status = 'Disbursed' AND OLD.status = 'Disbursed') THEN
            IF (NEW.amount != OLD.amount OR NEW.disbursement_method != OLD.disbursement_method) THEN
                -- Revert OLD
                v_mode := LOWER(OLD.disbursement_method);
                v_old_amount := OLD.amount;
                v_col := CASE WHEN v_mode = 'cash withdrawal' THEN 'cash_in_hand' WHEN v_mode = 'bank transfer' THEN 'bank_balance' END;
                IF v_col IS NOT NULL THEN
                    EXECUTE format('UPDATE public.balances SET %I = %I + $1, updated_at = NOW() WHERE user_id = auth.uid()', v_col, v_col) USING v_old_amount;
                END IF;

                -- Apply NEW
                v_mode := LOWER(NEW.disbursement_method);
                v_amount := NEW.amount;
                v_col := CASE WHEN v_mode = 'cash withdrawal' THEN 'cash_in_hand' WHEN v_mode = 'bank transfer' THEN 'bank_balance' END;
                IF v_col IS NOT NULL THEN
                    EXECUTE format('UPDATE public.balances SET %I = %I - $1, updated_at = NOW() WHERE user_id = auth.uid()', v_col, v_col) USING v_amount;
                END IF;
            END IF;

        -- Case 3: Revert Disbursed (if status changed from Disbursed to something else)
        ELSIF (OLD.status = 'Disbursed' AND NEW.status != 'Disbursed') THEN
            v_mode := LOWER(OLD.disbursement_method);
            v_amount := OLD.amount;
            v_col := CASE WHEN v_mode = 'cash withdrawal' THEN 'cash_in_hand' WHEN v_mode = 'bank transfer' THEN 'bank_balance' END;
            IF v_col IS NOT NULL THEN
                EXECUTE format('UPDATE public.balances SET %I = %I + $1, updated_at = NOW() WHERE user_id = auth.uid()', v_col, v_col) USING v_amount;
            END IF;
        END IF;

    -- Handle Payroll Records
    ELSIF TG_TABLE_NAME = 'payroll_records' THEN
        -- Case 1: Just Paid
        IF (NEW.status = 'Paid' AND (OLD.status IS NULL OR OLD.status IS DISTINCT FROM 'Paid')) THEN
            v_mode := LOWER(NEW.payment_mode);
            v_amount := NEW.net_salary;
            v_col := CASE WHEN v_mode = 'cash' THEN 'cash_in_hand' WHEN v_mode = 'bank' THEN 'bank_balance' END;

            IF v_col IS NOT NULL THEN
                EXECUTE format('UPDATE public.balances SET %I = %I - $1, updated_at = NOW() WHERE user_id = auth.uid()', v_col, v_col) USING v_amount;
            END IF;

        -- Case 2: Update to already paid record
        ELSIF (NEW.status = 'Paid' AND OLD.status = 'Paid') THEN
            IF (NEW.net_salary != OLD.net_salary OR NEW.payment_mode != OLD.payment_mode) THEN
                -- Revert OLD
                v_mode := LOWER(OLD.payment_mode);
                v_old_amount := OLD.net_salary;
                v_col := CASE WHEN v_mode = 'cash' THEN 'cash_in_hand' WHEN v_mode = 'bank' THEN 'bank_balance' END;
                IF v_col IS NOT NULL THEN
                    EXECUTE format('UPDATE public.balances SET %I = %I + $1, updated_at = NOW() WHERE user_id = auth.uid()', v_col, v_col) USING v_old_amount;
                END IF;

                -- Apply NEW
                v_mode := LOWER(NEW.payment_mode);
                v_amount := NEW.net_salary;
                v_col := CASE WHEN v_mode = 'cash' THEN 'cash_in_hand' WHEN v_mode = 'bank' THEN 'bank_balance' END;
                IF v_col IS NOT NULL THEN
                    EXECUTE format('UPDATE public.balances SET %I = %I - $1, updated_at = NOW() WHERE user_id = auth.uid()', v_col, v_col) USING v_amount;
                END IF;
            END IF;

        -- Case 3: Revert Paid
        ELSIF (OLD.status = 'Paid' AND NEW.status != 'Paid') THEN
            v_mode := LOWER(OLD.payment_mode);
            v_amount := OLD.net_salary;
            v_col := CASE WHEN v_mode = 'cash' THEN 'cash_in_hand' WHEN v_mode = 'bank' THEN 'bank_balance' END;
            IF v_col IS NOT NULL THEN
                EXECUTE format('UPDATE public.balances SET %I = %I + $1, updated_at = NOW() WHERE user_id = auth.uid()', v_col, v_col) USING v_amount;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Trigger for Overtime Status Update
CREATE OR REPLACE FUNCTION public.handle_overtime_status_sync()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.status = 'Approved' AND OLD.status != 'Approved') THEN
        -- Optional: Logic when overtime is approved
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_overtime_updated
    AFTER UPDATE ON public.employee_overtime
    FOR EACH ROW EXECUTE FUNCTION public.handle_overtime_status_sync();

-- 7. Ensure Daily Summary also handles these updates correctly (Already does via trigger)
NOTIFY pgrst, 'reload schema';
