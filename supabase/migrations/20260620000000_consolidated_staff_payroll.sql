-- Consolidated Staff Advance and Payroll Management System
-- Version: 3.1 (Fixed DELETE triggers and logic)

-- 1. Tables Creation
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    department TEXT,
    designation TEXT,
    joining_date DATE,
    pan_number TEXT,
    ssf_number TEXT,
    bank_account TEXT,
    basic_salary NUMERIC DEFAULT 0,
    allowance NUMERIC DEFAULT 0,
    other_benefits NUMERIC DEFAULT 0,
    marital_status TEXT DEFAULT 'single',
    is_active BOOLEAN DEFAULT true,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.staff_advances ADD COLUMN IF NOT EXISTS outstanding_amount NUMERIC DEFAULT 0;
ALTER TABLE public.staff_advances ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Ensure columns exist if table was already created without them
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS employee_id TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS designation TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS joining_date DATE;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS pan_number TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS ssf_number TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS bank_account TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS basic_salary NUMERIC DEFAULT 0;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS allowance NUMERIC DEFAULT 0;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS other_benefits NUMERIC DEFAULT 0;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS marital_status TEXT DEFAULT 'single';
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.staff_advances (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    request_date DATE DEFAULT CURRENT_DATE,
    amount NUMERIC NOT NULL,
    outstanding_amount NUMERIC DEFAULT 0,
    reason TEXT,
    settlement_method TEXT,
    expected_settlement_date DATE,
    status TEXT DEFAULT 'Draft',
    approved_by UUID REFERENCES auth.users(id),
    approval_date TIMESTAMPTZ,
    remarks TEXT,
    disbursement_method TEXT,
    bank_name TEXT,
    account_number TEXT,
    transaction_id TEXT,
    transfer_date DATE,
    cash_source TEXT,
    cashier TEXT,
    withdrawal_date DATE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.staff_advance_attachments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    advance_id UUID REFERENCES public.staff_advances(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_name TEXT,
    file_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.advance_settlements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    advance_id UUID REFERENCES public.staff_advances(id) ON DELETE CASCADE,
    settlement_type TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    settlement_date DATE DEFAULT CURRENT_DATE,
    expense_type TEXT,
    description TEXT,
    status TEXT DEFAULT 'Pending Verification',
    verifier_remarks TEXT,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.advance_settlements ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.advance_settlement_attachments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    settlement_id UUID REFERENCES public.advance_settlements(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_name TEXT,
    file_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payroll_records (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    month_year DATE NOT NULL,
    basic_salary NUMERIC DEFAULT 0,
    allowance NUMERIC DEFAULT 0,
    other_benefits NUMERIC DEFAULT 0,
    gross_salary NUMERIC DEFAULT 0,
    employee_ssf NUMERIC DEFAULT 0,
    employer_ssf NUMERIC DEFAULT 0,
    advance_recovery NUMERIC DEFAULT 0,
    tax_deduction NUMERIC DEFAULT 0,
    other_deductions NUMERIC DEFAULT 0,
    net_salary NUMERIC DEFAULT 0,
    ctc NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'Draft',
    payment_date DATE,
    payment_mode TEXT,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, month_year)
);

ALTER TABLE public.payroll_records ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.payroll_settings (
    id SERIAL PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Default Data
INSERT INTO public.payroll_settings (key, value) VALUES
('ssf_rates', '{"employee_ssf_percent": 11, "employer_ssf_percent": 20}'),
('tax_slabs_single', '[
    {"limit": 500000, "rate": 1},
    {"limit": 200000, "rate": 10},
    {"limit": 300000, "rate": 20},
    {"limit": 1000000, "rate": 30},
    {"limit": 3000000, "rate": 36},
    {"limit": 999999999, "rate": 39}
]'),
('tax_slabs_married', '[
    {"limit": 600000, "rate": 1},
    {"limit": 200000, "rate": 10},
    {"limit": 300000, "rate": 20},
    {"limit": 900000, "rate": 30},
    {"limit": 3000000, "rate": 36},
    {"limit": 999999999, "rate": 39}
]')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 3. Daily Summary Columns
ALTER TABLE public.daily_summary
ADD COLUMN IF NOT EXISTS total_staff_advances_disbursed NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_staff_advances_cash NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_staff_advances_bank NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_payroll_paid NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_payroll_cash NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_payroll_bank NUMERIC DEFAULT 0;

-- 4. Logic Functions

-- Nepal Tax Calculation
CREATE OR REPLACE FUNCTION public.calculate_nepal_tax(
    p_annual_gross NUMERIC,
    p_marital_status TEXT,
    p_ssf_deduction NUMERIC
) RETURNS NUMERIC AS $$
DECLARE
    v_taxable_income NUMERIC;
    v_tax NUMERIC := 0;
    v_slabs JSONB;
    v_slab RECORD;
    v_remaining NUMERIC;
    v_taxable_in_slab NUMERIC;
BEGIN
    v_taxable_income := p_annual_gross - p_ssf_deduction;
    IF v_taxable_income <= 0 THEN RETURN 0; END IF;

    IF p_marital_status = 'married' THEN
        SELECT value INTO v_slabs FROM public.payroll_settings WHERE key = 'tax_slabs_married';
    ELSE
        SELECT value INTO v_slabs FROM public.payroll_settings WHERE key = 'tax_slabs_single';
    END IF;

    v_remaining := v_taxable_income;
    FOR v_slab IN SELECT * FROM jsonb_to_recordset(v_slabs) AS x("limit" NUMERIC, rate NUMERIC) LOOP
        v_taxable_in_slab := LEAST(v_remaining, v_slab."limit");
        v_tax := v_tax + (v_taxable_in_slab * v_slab.rate / 100);
        v_remaining := v_remaining - v_taxable_in_slab;
        EXIT WHEN v_remaining <= 0;
    END LOOP;

    RETURN v_tax;
END;
$$ LANGUAGE plpgsql;

-- Monthly Payroll Process
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
        v_ssf_emp := v_gross * (v_ssf_rates->>'employee_ssf_percent')::NUMERIC / 100;
        v_ssf_org := v_gross * (v_ssf_rates->>'employer_ssf_percent')::NUMERIC / 100;
        v_tax := public.calculate_nepal_tax(v_gross * 12, v_emp.marital_status, v_ssf_emp * 12) / 12;

        SELECT COALESCE(SUM(outstanding_amount), 0) INTO v_outstanding_adv
        FROM public.staff_advances
        WHERE employee_id = v_emp.id AND status IN ('Disbursed', 'Partially Settled') AND deleted_at IS NULL;

        v_net := v_gross - v_ssf_emp - v_tax;
        v_advance_deduction := LEAST(v_net, v_outstanding_adv);
        v_net := v_net - v_advance_deduction;

        INSERT INTO public.payroll_records (
            employee_id, month_year, basic_salary, allowance, other_benefits,
            gross_salary, employee_ssf, employer_ssf, tax_deduction,
            advance_recovery, net_salary, ctc, status
        ) VALUES (
            v_emp.id, p_month_year, v_emp.basic_salary, v_emp.allowance, v_emp.other_benefits,
            v_gross, v_ssf_emp, v_ssf_org, v_tax,
            v_advance_deduction, v_net, v_gross + v_ssf_org, 'Calculated'
        )
        ON CONFLICT (employee_id, month_year)
        DO UPDATE SET
            gross_salary = EXCLUDED.gross_salary,
            employee_ssf = EXCLUDED.employee_ssf,
            tax_deduction = EXCLUDED.tax_deduction,
            advance_recovery = EXCLUDED.advance_recovery,
            net_salary = EXCLUDED.net_salary,
            updated_at = NOW();
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Advance Settlement Process
CREATE OR REPLACE FUNCTION public.process_advance_settlement(
    p_settlement_id UUID,
    p_verifier_remarks TEXT,
    p_status TEXT
) RETURNS VOID AS $$
DECLARE
    v_s RECORD;
BEGIN
    SELECT * INTO v_s FROM public.advance_settlements WHERE id = p_settlement_id;
    IF v_s.status != 'Pending Verification' THEN RETURN; END IF;

    IF p_status = 'Approved' THEN
        UPDATE public.staff_advances
        SET outstanding_amount = GREATEST(0, outstanding_amount - v_s.amount),
            status = CASE WHEN outstanding_amount - v_s.amount <= 0 THEN 'Fully Settled' ELSE 'Partially Settled' END,
            updated_at = NOW()
        WHERE id = v_s.advance_id;

        UPDATE public.advance_settlements SET status = 'Approved', verifier_remarks = p_verifier_remarks WHERE id = p_settlement_id;
    ELSE
        UPDATE public.advance_settlements SET status = 'Rejected', verifier_remarks = p_verifier_remarks WHERE id = p_settlement_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Integrated Daily Summary Update
CREATE OR REPLACE FUNCTION public.update_daily_summary(p_summary_date DATE)
RETURNS VOID AS $$
DECLARE
    -- Income from orders
    v_total_income_from_orders NUMERIC;
    v_total_income_fonepay_orders NUMERIC;
    v_total_income_esewa_orders NUMERIC;
    v_total_income_cash_orders NUMERIC;
    -- Income from charging
    v_total_income_from_charging NUMERIC;
    v_total_income_fonepay_charging NUMERIC;
    v_total_income_esewa_charging NUMERIC;
    v_total_income_cash_charging NUMERIC;
    -- Expenses
    v_total_expenses NUMERIC;
    v_total_expenses_cash NUMERIC;
    v_total_expenses_esewa NUMERIC;
    v_total_expenses_fonepay NUMERIC;
    -- Deposits
    v_total_deposits NUMERIC;
    v_total_deposits_cash NUMERIC;
    v_total_deposits_esewa NUMERIC;
    v_total_deposits_from_cash NUMERIC;
    -- Savings
    v_total_savings NUMERIC;
    v_total_savings_cash NUMERIC;
    v_total_savings_fonepay NUMERIC;
    v_total_savings_esewa NUMERIC;
    -- Withdrawals
    v_total_withdrawals NUMERIC;
    v_total_withdrawals_cooperative NUMERIC;
    v_total_withdrawals_bank NUMERIC;
    v_total_withdrawals_cash NUMERIC;
    -- Staff Advance & Payroll
    v_total_staff_advances NUMERIC;
    v_total_staff_advances_cash NUMERIC;
    v_total_staff_advances_bank NUMERIC;
    v_total_payroll NUMERIC;
    v_total_payroll_cash NUMERIC;
    v_total_payroll_bank NUMERIC;
    -- Calculated fields
    v_total_income NUMERIC;
    v_total_cash_income NUMERIC;
    v_total_fonepay_income NUMERIC;
    v_total_esewa_income NUMERIC;
    v_cash_balance NUMERIC;
    v_esewa_balance NUMERIC;
    v_fonepay_balance NUMERIC;
    v_cooperative_balance NUMERIC;
    v_total_balance NUMERIC;
    v_system_cash_calc NUMERIC;
BEGIN
    -- [1] Orders
    SELECT
        COALESCE(SUM(total), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) = 'fonepay' THEN total ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) = 'esewa' THEN total ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) = 'cash' THEN total ELSE 0 END), 0)
    INTO v_total_income_from_orders, v_total_income_fonepay_orders, v_total_income_esewa_orders, v_total_income_cash_orders
    FROM public.orders WHERE order_date = p_summary_date;

    -- [2] Charging
    SELECT
        COALESCE(SUM(total_amount), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) = 'fonepay' THEN total_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) = 'esewa' THEN total_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) = 'cash' THEN total_amount ELSE 0 END), 0)
    INTO v_total_income_from_charging, v_total_income_fonepay_charging, v_total_income_esewa_charging, v_total_income_cash_charging
    FROM public.charging_sessions WHERE session_date = p_summary_date;

    -- [3] Expenses
    SELECT
        COALESCE(SUM(amount), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) = 'cash' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) = 'esewa' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) = 'fonepay' THEN amount ELSE 0 END), 0)
    INTO v_total_expenses, v_total_expenses_cash, v_total_expenses_esewa, v_total_expenses_fonepay
    FROM public.expenses WHERE expense_date = p_summary_date;

    -- [4] Deposits
    SELECT
        COALESCE(SUM(amount), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(deposited_to, 'bank')) = 'cash' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(deposited_to, 'bank')) = 'esewa' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(mode, 'cash')) = 'cash' THEN amount ELSE 0 END), 0)
    INTO v_total_deposits, v_total_deposits_cash, v_total_deposits_esewa, v_total_deposits_from_cash
    FROM public.deposits WHERE deposit_date = p_summary_date;

    -- [5] Savings
    SELECT
        COALESCE(SUM(contribution_amount), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) = 'cash' THEN contribution_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) = 'fonepay' THEN contribution_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) = 'esewa' THEN contribution_amount ELSE 0 END), 0)
    INTO v_total_savings, v_total_savings_cash, v_total_savings_fonepay, v_total_savings_esewa
    FROM public.cooperative_savings WHERE contribution_date = p_summary_date;

    -- [6] Withdrawals
    SELECT
        COALESCE(SUM(amount), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(withdrawal_from, 'cooperative')) = 'cooperative' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(withdrawal_from, 'cooperative')) = 'bank' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) = 'cash' THEN amount ELSE 0 END), 0)
    INTO v_total_withdrawals, v_total_withdrawals_cooperative, v_total_withdrawals_bank, v_total_withdrawals_cash
    FROM public.withdrawals WHERE withdrawal_date = p_summary_date;

    -- [7] Staff Advances
    SELECT
        COALESCE(SUM(amount), 0),
        COALESCE(SUM(CASE WHEN LOWER(disbursement_method) = 'cash withdrawal' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(disbursement_method) = 'bank transfer' THEN amount ELSE 0 END), 0)
    INTO v_total_staff_advances, v_total_staff_advances_cash, v_total_staff_advances_bank
    FROM public.staff_advances
    WHERE (withdrawal_date = p_summary_date OR transfer_date = p_summary_date) AND status = 'Disbursed';

    -- [8] Payroll
    SELECT
        COALESCE(SUM(net_salary), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) = 'cash' THEN net_salary ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) = 'bank' THEN net_salary ELSE 0 END), 0)
    INTO v_total_payroll, v_total_payroll_cash, v_total_payroll_bank
    FROM public.payroll_records
    WHERE payment_date = p_summary_date AND status = 'Paid';

    -- Aggregates
    v_total_income := v_total_income_from_orders + v_total_income_from_charging;
    v_total_cash_income := v_total_income_cash_orders + v_total_income_cash_charging;
    v_total_fonepay_income := v_total_income_fonepay_orders + v_total_income_fonepay_charging;
    v_total_esewa_income := v_total_income_esewa_orders + v_total_income_esewa_charging;

    -- Ledger Balances
    v_cash_balance := (v_total_cash_income + v_total_deposits_cash)
                    - (v_total_expenses_cash + v_total_savings_cash + v_total_withdrawals_cash + v_total_deposits_from_cash + v_total_staff_advances_cash + v_total_payroll_cash);

    v_esewa_balance := (v_total_esewa_income + v_total_deposits_esewa)
                     - (v_total_expenses_esewa + v_total_savings_esewa);

    v_fonepay_balance := (v_total_fonepay_income)
                       - (v_total_expenses_fonepay + v_total_savings_fonepay);

    v_cooperative_balance := v_total_savings - v_total_withdrawals_cooperative;
    v_total_balance := v_cash_balance + v_fonepay_balance + v_cooperative_balance + v_esewa_balance;

    -- Verification Calc
    v_system_cash_calc := (v_total_income_cash_orders + v_total_income_cash_charging + v_total_deposits_cash)
                        - (v_total_expenses_cash + v_total_savings_cash + v_total_withdrawals_cash + v_total_deposits_from_cash + v_total_staff_advances_cash + v_total_payroll_cash);

    -- Insert/Update
    INSERT INTO public.daily_summary (
        summary_date, total_income_from_orders, total_income_from_orders_cash, total_income_from_orders_esewa, total_income_from_orders_fonepay,
        total_income_from_charging, total_income_from_charging_cash, total_income_from_charging_esewa, total_income_from_charging_fonepay,
        total_income_fonepay, total_income_esewa, total_income_cash, total_expenses, total_expenses_cash, total_expenses_esewa, total_expenses_fonepay,
        total_deposits, total_deposits_cash, total_deposits_esewa, total_deposits_from_cash, total_savings, total_savings_cash, total_savings_fonepay, total_savings_esewa,
        total_withdrawals, total_withdrawals_cooperative, total_withdrawals_bank, total_withdrawals_cash,
        total_staff_advances_disbursed, total_staff_advances_cash, total_staff_advances_bank, total_payroll_paid, total_payroll_cash, total_payroll_bank,
        total_income, total_cash_income, total_fonepay_income, total_esewa_income, cash_balance, esewa_balance, fonepay_balance, cooperative_balance, total_balance, system_cash_calculation
    ) VALUES (
        p_summary_date, v_total_income_from_orders, v_total_income_cash_orders, v_total_income_esewa_orders, v_total_income_fonepay_orders,
        v_total_income_from_charging, v_total_income_cash_charging, v_total_income_esewa_charging, v_total_income_fonepay_charging,
        v_total_fonepay_income, v_total_esewa_income, v_total_cash_income, v_total_expenses, v_total_expenses_cash, v_total_expenses_esewa, v_total_expenses_fonepay,
        v_total_deposits, v_total_deposits_cash, v_total_deposits_esewa, v_total_deposits_from_cash, v_total_savings, v_total_savings_cash, v_total_savings_fonepay, v_total_savings_esewa,
        v_total_withdrawals, v_total_withdrawals_cooperative, v_total_withdrawals_bank, v_total_withdrawals_cash,
        v_total_staff_advances, v_total_staff_advances_cash, v_total_staff_advances_bank, v_total_payroll, v_total_payroll_cash, v_total_payroll_bank,
        v_total_income, v_total_cash_income, v_total_fonepay_income, v_total_esewa_income, v_cash_balance, v_esewa_balance, v_fonepay_balance, v_cooperative_balance, v_total_balance, v_system_cash_calc
    )
    ON CONFLICT (summary_date) DO UPDATE SET
        total_staff_advances_disbursed = EXCLUDED.total_staff_advances_disbursed,
        total_staff_advances_cash = EXCLUDED.total_staff_advances_cash,
        total_staff_advances_bank = EXCLUDED.total_staff_advances_bank,
        total_payroll_paid = EXCLUDED.total_payroll_paid,
        total_payroll_cash = EXCLUDED.total_payroll_cash,
        total_payroll_bank = EXCLUDED.total_payroll_bank,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 6. Triggers

-- Init Advance Outstanding
CREATE OR REPLACE FUNCTION public.handle_advance_init()
RETURNS TRIGGER AS $$
BEGIN
    NEW.outstanding_amount := NEW.amount;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_advance_created ON public.staff_advances;
CREATE TRIGGER on_advance_created
    BEFORE INSERT ON public.staff_advances
    FOR EACH ROW EXECUTE FUNCTION public.handle_advance_init();

-- Balance Updates on Disbursement/Payment
CREATE OR REPLACE FUNCTION public.handle_staff_financial_impact()
RETURNS TRIGGER AS $$
DECLARE
    v_mode TEXT;
    v_amount NUMERIC;
    v_col TEXT;
BEGIN
    IF TG_TABLE_NAME = 'staff_advances' THEN
        IF (NEW.status = 'Disbursed' AND (OLD.status IS DISTINCT FROM 'Disbursed')) THEN
            v_mode := LOWER(NEW.disbursement_method);
            v_amount := NEW.amount;
            v_col := CASE WHEN v_mode = 'cash withdrawal' THEN 'cash_in_hand' WHEN v_mode = 'bank transfer' THEN 'bank_balance' END;
        END IF;
    ELSIF TG_TABLE_NAME = 'payroll_records' THEN
        IF (NEW.status = 'Paid' AND (OLD.status IS DISTINCT FROM 'Paid')) THEN
            v_mode := LOWER(NEW.payment_mode);
            v_amount := NEW.net_salary;
            v_col := CASE WHEN v_mode = 'cash' THEN 'cash_in_hand' WHEN v_mode = 'bank' THEN 'bank_balance' END;
        END IF;
    END IF;

    IF v_col IS NOT NULL THEN
        UPDATE public.balances SET
            cash_in_hand = CASE WHEN v_col = 'cash_in_hand' THEN cash_in_hand - v_amount ELSE cash_in_hand END,
            bank_balance = CASE WHEN v_col = 'bank_balance' THEN bank_balance - v_amount ELSE bank_balance END,
            updated_at = NOW()
        WHERE user_id = auth.uid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_staff_advance_disbursed ON public.staff_advances;
CREATE TRIGGER on_staff_advance_disbursed AFTER UPDATE ON public.staff_advances FOR EACH ROW EXECUTE FUNCTION public.handle_staff_financial_impact();

DROP TRIGGER IF EXISTS on_payroll_paid ON public.payroll_records;
CREATE TRIGGER on_payroll_paid AFTER UPDATE ON public.payroll_records FOR EACH ROW EXECUTE FUNCTION public.handle_staff_financial_impact();

-- Advance Recovery on Payroll Payment
CREATE OR REPLACE FUNCTION public.handle_payroll_advance_recovery()
RETURNS TRIGGER AS $$
DECLARE
    v_rem NUMERIC := NEW.advance_recovery;
    v_adv RECORD;
BEGIN
    IF (NEW.status = 'Paid' AND OLD.status != 'Paid' AND v_rem > 0) THEN
        FOR v_adv IN SELECT * FROM public.staff_advances WHERE employee_id = NEW.employee_id AND status IN ('Disbursed', 'Partially Settled') ORDER BY request_date ASC LOOP
            IF v_rem <= 0 THEN EXIT; END IF;
            IF v_adv.outstanding_amount <= v_rem THEN
                v_rem := v_rem - v_adv.outstanding_amount;
                UPDATE public.staff_advances SET outstanding_amount = 0, status = 'Fully Settled', updated_at = NOW() WHERE id = v_adv.id;
            ELSE
                UPDATE public.staff_advances SET outstanding_amount = outstanding_amount - v_rem, status = 'Partially Settled', updated_at = NOW() WHERE id = v_adv.id;
                v_rem := 0;
            END IF;
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_payroll_paid_recovery ON public.payroll_records;
CREATE TRIGGER on_payroll_paid_recovery AFTER UPDATE ON public.payroll_records FOR EACH ROW EXECUTE FUNCTION public.handle_payroll_advance_recovery();

-- Summary Triggers
CREATE OR REPLACE FUNCTION public.trigger_staff_summary_sync()
RETURNS TRIGGER AS $$
DECLARE
    v_date DATE;
    v_rec RECORD;
BEGIN
    v_rec := COALESCE(NEW, OLD);
    IF TG_TABLE_NAME = 'staff_advances' THEN
        v_date := COALESCE(v_rec.withdrawal_date, v_rec.transfer_date, v_rec.request_date);
    ELSIF TG_TABLE_NAME = 'payroll_records' THEN
        v_date := v_rec.payment_date;
    END IF;

    IF v_date IS NOT NULL THEN PERFORM public.update_daily_summary(v_date); END IF;

    IF TG_OP = 'UPDATE' THEN
        IF TG_TABLE_NAME = 'staff_advances' THEN
            IF (OLD.withdrawal_date IS DISTINCT FROM NEW.withdrawal_date OR
                OLD.transfer_date IS DISTINCT FROM NEW.transfer_date OR
                OLD.request_date IS DISTINCT FROM NEW.request_date) THEN
                v_date := COALESCE(OLD.withdrawal_date, OLD.transfer_date, OLD.request_date);
                IF v_date IS NOT NULL THEN PERFORM public.update_daily_summary(v_date); END IF;
            END IF;
        ELSIF TG_TABLE_NAME = 'payroll_records' THEN
            IF (OLD.payment_date IS DISTINCT FROM NEW.payment_date) THEN
                v_date := OLD.payment_date;
                IF v_date IS NOT NULL THEN PERFORM public.update_daily_summary(v_date); END IF;
            END IF;
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS staff_advances_summary_trigger ON public.staff_advances;
CREATE TRIGGER staff_advances_summary_trigger AFTER INSERT OR UPDATE OR DELETE ON public.staff_advances FOR EACH ROW EXECUTE FUNCTION public.trigger_staff_summary_sync();

DROP TRIGGER IF EXISTS payroll_summary_trigger ON public.payroll_records;
CREATE TRIGGER payroll_summary_trigger AFTER INSERT OR UPDATE OR DELETE ON public.payroll_records FOR EACH ROW EXECUTE FUNCTION public.trigger_staff_summary_sync();

-- 7. Force Schema Cache Refresh
NOTIFY pgrst, 'reload schema';
