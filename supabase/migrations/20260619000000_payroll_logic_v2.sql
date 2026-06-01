-- Staff Advance and Payroll Logic Enhancement

-- 1. Add Soft Delete and Tracking Columns
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.staff_advances ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.staff_advances ADD COLUMN IF NOT EXISTS outstanding_amount NUMERIC DEFAULT 0;
ALTER TABLE public.advance_settlements ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.payroll_records ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 2. Function to Initialize Outstanding Amount
CREATE OR REPLACE FUNCTION public.sync_advance_outstanding()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        NEW.outstanding_amount := NEW.amount;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_advance_created
    BEFORE INSERT ON public.staff_advances
    FOR EACH ROW EXECUTE FUNCTION public.sync_advance_outstanding();

-- 3. Robust Payroll Processing RPC
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
BEGIN
    SELECT value INTO v_ssf_rates FROM public.payroll_settings WHERE key = 'ssf_rates';

    FOR v_emp IN SELECT * FROM public.employees WHERE deleted_at IS NULL AND is_active = true LOOP
        v_gross := v_emp.basic_salary + COALESCE(v_emp.allowance, 0) + COALESCE(v_emp.other_benefits, 0);

        -- SSF
        v_ssf_emp := v_gross * (v_ssf_rates->>'employee_ssf_percent')::NUMERIC / 100;
        v_ssf_org := v_gross * (v_ssf_rates->>'employer_ssf_percent')::NUMERIC / 100;

        -- Tax (Annualized Projection)
        v_tax := public.calculate_nepal_tax(v_gross * 12, v_emp.marital_status, v_ssf_emp * 12) / 12;

        -- Advance Recovery
        SELECT COALESCE(SUM(outstanding_amount), 0) INTO v_outstanding_adv
        FROM public.staff_advances
        WHERE employee_id = v_emp.id AND status IN ('Disbursed', 'Partially Settled') AND deleted_at IS NULL;

        v_net := v_gross - v_ssf_emp - v_tax;
        v_advance_deduction := LEAST(v_net, v_outstanding_adv);
        v_net := v_net - v_advance_deduction;

        -- Insert or Update Record
        INSERT INTO public.payroll_records (
            employee_id, month_year, basic_salary, allowance, other_benefits,
            gross_salary, employee_ssf, employer_ssf, tax_deduction,
            advance_recovery, net_salary, ctc, status
        ) VALUES (
            v_emp.id, p_month_year, v_emp.basic_salary, v_emp.allowance, v_emp.other_benefits,
            v_gross, v_ssf_emp, v_ssf_org, v_tax,
            v_advance_deduction, v_net, v_gross + v_ssf_org, 'Calculated'
        )
        ON CONFLICT (employee_id, month_year) -- Assuming we add a unique constraint
        DO UPDATE SET
            gross_salary = EXCLUDED.gross_salary,
            net_salary = EXCLUDED.net_salary,
            advance_recovery = EXCLUDED.advance_recovery,
            updated_at = NOW();

        -- Note: Actual advance reduction happens when status is 'Paid'
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Advance Settlement RPC
CREATE OR REPLACE FUNCTION public.process_advance_settlement(
    p_settlement_id UUID,
    p_verifier_remarks TEXT,
    p_status TEXT -- 'Approved' or 'Rejected'
) RETURNS VOID AS $$
DECLARE
    v_s RECORD;
    v_adv_status TEXT;
BEGIN
    SELECT * INTO v_s FROM public.advance_settlements WHERE id = p_settlement_id;
    IF v_s.status != 'Pending Verification' THEN RETURN; END IF;

    IF p_status = 'Approved' THEN
        -- Update Advance Outstanding
        UPDATE public.staff_advances
        SET outstanding_amount = outstanding_amount - v_s.amount,
            status = CASE WHEN outstanding_amount - v_s.amount <= 0 THEN 'Fully Settled' ELSE 'Partially Settled' END,
            updated_at = NOW()
        WHERE id = v_s.advance_id;

        -- Update Settlement
        UPDATE public.advance_settlements SET status = 'Approved', verifier_remarks = p_verifier_remarks WHERE id = p_settlement_id;
    ELSE
        UPDATE public.advance_settlements SET status = 'Rejected', verifier_remarks = p_verifier_remarks WHERE id = p_settlement_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Advance Recovery via Salary (When Paid)
CREATE OR REPLACE FUNCTION public.handle_advance_recovery_on_payment()
RETURNS TRIGGER AS $$
DECLARE
    v_rem NUMERIC := NEW.advance_recovery;
    v_adv RECORD;
BEGIN
    IF (NEW.status = 'Paid' AND OLD.status != 'Paid' AND v_rem > 0) THEN
        FOR v_adv IN
            SELECT * FROM public.staff_advances
            WHERE employee_id = NEW.employee_id
            AND status IN ('Disbursed', 'Partially Settled')
            ORDER BY request_date ASC
        LOOP
            IF v_rem <= 0 THEN EXIT; END IF;

            IF v_adv.outstanding_amount <= v_rem THEN
                UPDATE public.staff_advances SET
                    outstanding_amount = 0,
                    status = 'Fully Settled',
                    updated_at = NOW()
                WHERE id = v_adv.id;
                v_rem := v_rem - v_adv.outstanding_amount;
            ELSE
                UPDATE public.staff_advances SET
                    outstanding_amount = outstanding_amount - v_rem,
                    status = 'Partially Settled',
                    updated_at = NOW()
                WHERE id = v_adv.id;
                v_rem := 0;
            END IF;
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_payroll_paid_recovery
    AFTER UPDATE ON public.payroll_records
    FOR EACH ROW EXECUTE FUNCTION public.handle_advance_recovery_on_payment();

-- Add Unique Constraint to payroll
ALTER TABLE public.payroll_records DROP CONSTRAINT IF EXISTS payroll_records_emp_month_key;
ALTER TABLE public.payroll_records ADD CONSTRAINT payroll_records_emp_month_key UNIQUE (employee_id, month_year);
