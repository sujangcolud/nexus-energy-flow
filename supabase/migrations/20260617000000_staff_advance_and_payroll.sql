-- Staff Advance and Payroll Management System

-- 1. Employees Table
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
    marital_status TEXT DEFAULT 'single', -- 'single' or 'married'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Staff Advances Table
CREATE TABLE IF NOT EXISTS public.staff_advances (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    request_date DATE DEFAULT CURRENT_DATE,
    amount NUMERIC NOT NULL,
    reason TEXT,
    settlement_method TEXT, -- 'Salary Deduction', 'Expense Settlement', 'Mixed Settlement'
    expected_settlement_date DATE,
    status TEXT DEFAULT 'Draft', -- 'Draft', 'Submitted', 'Approved', 'Rejected', 'Disbursed', 'Partially Settled', 'Fully Settled'
    approved_by UUID REFERENCES auth.users(id),
    approval_date TIMESTAMPTZ,
    remarks TEXT,

    -- Disbursement Info
    disbursement_method TEXT, -- 'Bank Transfer', 'Cash Withdrawal'
    bank_name TEXT,
    account_number TEXT,
    transaction_id TEXT,
    transfer_date DATE,
    cash_source TEXT,
    cashier TEXT,
    withdrawal_date DATE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Staff Advance Attachments
CREATE TABLE IF NOT EXISTS public.staff_advance_attachments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    advance_id UUID REFERENCES public.staff_advances(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_name TEXT,
    file_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Advance Settlements Table
CREATE TABLE IF NOT EXISTS public.advance_settlements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    advance_id UUID REFERENCES public.staff_advances(id) ON DELETE CASCADE,
    settlement_type TEXT NOT NULL, -- 'Expense Bill', 'Salary Deduction'
    amount NUMERIC NOT NULL,
    settlement_date DATE DEFAULT CURRENT_DATE,
    expense_type TEXT, -- For Expense Bill
    description TEXT,
    status TEXT DEFAULT 'Pending Verification', -- 'Pending Verification', 'Approved', 'Rejected'
    verifier_remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Advance Settlement Attachments
CREATE TABLE IF NOT EXISTS public.advance_settlement_attachments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    settlement_id UUID REFERENCES public.advance_settlements(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_name TEXT,
    file_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Payroll Records Table
CREATE TABLE IF NOT EXISTS public.payroll_records (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    month_year DATE NOT NULL, -- First of the month
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
    status TEXT DEFAULT 'Draft', -- 'Draft', 'Calculated', 'Approved', 'Paid'
    payment_date DATE,
    payment_mode TEXT, -- 'Bank', 'Cash'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Payroll Settings
CREATE TABLE IF NOT EXISTS public.payroll_settings (
    id SERIAL PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value JSONB,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default payroll settings
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
ON CONFLICT (key) DO NOTHING;

-- 8. Add Audit Logs support for new tables
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_advance_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advance_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advance_settlement_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_settings ENABLE ROW LEVEL SECURITY;

-- Simple RLS policies
CREATE POLICY "Authenticated users can read employees" ON public.employees FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can read staff_advances" ON public.staff_advances FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can read payroll" ON public.payroll_records FOR SELECT USING (auth.role() = 'authenticated');

-- 9. Accounting Triggers & Functions Integration

-- Function to calculate Nepal Tax (Simplified logic for SQL)
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
    FOR v_slab IN SELECT * FROM jsonb_to_recordset(v_slabs) AS x(limit NUMERIC, rate NUMERIC) LOOP
        v_taxable_in_slab := LEAST(v_remaining, v_slab.limit);
        v_tax := v_tax + (v_taxable_in_slab * v_slab.rate / 100);
        v_remaining := v_remaining - v_taxable_in_slab;
        EXIT WHEN v_remaining <= 0;
    END LOOP;

    RETURN v_tax;
END;
$$ LANGUAGE plpgsql;

-- 10. Update Daily Summary to include Staff Advances and Payroll
-- We need to modify the existing update_daily_summary function.
-- I will add columns to daily_summary first.

ALTER TABLE public.daily_summary
ADD COLUMN IF NOT EXISTS total_staff_advances_disbursed NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_staff_advances_cash NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_staff_advances_bank NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_payroll_paid NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_payroll_cash NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_payroll_bank NUMERIC DEFAULT 0;

-- Redefine update_daily_summary to include new fields
CREATE OR REPLACE FUNCTION public.update_daily_summary(p_summary_date DATE)
RETURNS VOID AS $$
DECLARE
    -- ... (previous variables)
    v_total_income_from_orders NUMERIC;
    v_total_income_fonepay_orders NUMERIC;
    v_total_income_esewa_orders NUMERIC;
    v_total_income_cash_orders NUMERIC;
    v_total_income_from_charging NUMERIC;
    v_total_income_fonepay_charging NUMERIC;
    v_total_income_esewa_charging NUMERIC;
    v_total_income_cash_charging NUMERIC;
    v_total_expenses NUMERIC;
    v_total_expenses_cash NUMERIC;
    v_total_expenses_esewa NUMERIC;
    v_total_expenses_fonepay NUMERIC;
    v_total_deposits NUMERIC;
    v_total_deposits_cash NUMERIC;
    v_total_deposits_esewa NUMERIC;
    v_total_deposits_from_cash NUMERIC;
    v_total_savings NUMERIC;
    v_total_savings_cash NUMERIC;
    v_total_savings_fonepay NUMERIC;
    v_total_savings_esewa NUMERIC;
    v_total_withdrawals NUMERIC;
    v_total_withdrawals_cooperative NUMERIC;
    v_total_withdrawals_bank NUMERIC;
    v_total_withdrawals_cash NUMERIC;

    -- New variables for Staff Advance and Payroll
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
    -- [1-6] previous calculations ...

    -- 1. Calculate income from orders
    SELECT
        COALESCE(SUM(total), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) = 'fonepay' THEN total ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) = 'esewa' THEN total ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) = 'cash' THEN total ELSE 0 END), 0)
    INTO
        v_total_income_from_orders,
        v_total_income_fonepay_orders,
        v_total_income_esewa_orders,
        v_total_income_cash_orders
    FROM public.orders
    WHERE order_date = p_summary_date;

    -- 2. Calculate income from charging
    SELECT
        COALESCE(SUM(total_amount), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) = 'fonepay' THEN total_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) = 'esewa' THEN total_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) = 'cash' THEN total_amount ELSE 0 END), 0)
    INTO
        v_total_income_from_charging,
        v_total_income_fonepay_charging,
        v_total_income_esewa_charging,
        v_total_income_cash_charging
    FROM public.charging_sessions
    WHERE session_date = p_summary_date;

    -- 3. Calculate expenses (Outflow)
    SELECT
        COALESCE(SUM(amount), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) = 'cash' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) = 'esewa' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) = 'fonepay' THEN amount ELSE 0 END), 0)
    INTO
        v_total_expenses,
        v_total_expenses_cash,
        v_total_expenses_esewa,
        v_total_expenses_fonepay
    FROM public.expenses
    WHERE expense_date = p_summary_date;

    -- 4. Calculate deposits (Movement)
    SELECT
        COALESCE(SUM(amount), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(deposited_to, 'bank')) = 'cash' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(deposited_to, 'bank')) = 'esewa' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(mode, 'cash')) = 'cash' THEN amount ELSE 0 END), 0)
    INTO
        v_total_deposits,
        v_total_deposits_cash,
        v_total_deposits_esewa,
        v_total_deposits_from_cash
    FROM public.deposits
    WHERE deposit_date = p_summary_date;

    -- 5. Calculate cooperative savings
    SELECT
        COALESCE(SUM(contribution_amount), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) = 'cash' THEN contribution_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) = 'fonepay' THEN contribution_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) = 'esewa' THEN contribution_amount ELSE 0 END), 0)
    INTO
        v_total_savings,
        v_total_savings_cash,
        v_total_savings_fonepay,
        v_total_savings_esewa
    FROM public.cooperative_savings
    WHERE contribution_date = p_summary_date;

    -- 6. Calculate withdrawals
    SELECT
        COALESCE(SUM(amount), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(withdrawal_from, 'cooperative')) = 'cooperative' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(withdrawal_from, 'cooperative')) = 'bank' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(COALESCE(payment_mode, 'cash')) = 'cash' THEN amount ELSE 0 END), 0)
    INTO
        v_total_withdrawals,
        v_total_withdrawals_cooperative,
        v_total_withdrawals_bank,
        v_total_withdrawals_cash
    FROM public.withdrawals
    WHERE withdrawal_date = p_summary_date;

    -- 7. Calculate Staff Advances Disbursed (Outflow from Cash or Bank)
    SELECT
        COALESCE(SUM(amount), 0),
        COALESCE(SUM(CASE WHEN LOWER(disbursement_method) = 'cash withdrawal' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(disbursement_method) = 'bank transfer' THEN amount ELSE 0 END), 0)
    INTO
        v_total_staff_advances,
        v_total_staff_advances_cash,
        v_total_staff_advances_bank
    FROM public.staff_advances
    WHERE (withdrawal_date = p_summary_date OR transfer_date = p_summary_date)
    AND status = 'Disbursed';

    -- 8. Calculate Payroll Paid (Outflow from Cash or Bank)
    SELECT
        COALESCE(SUM(net_salary), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) = 'cash' THEN net_salary ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_mode) = 'bank' THEN net_salary ELSE 0 END), 0)
    INTO
        v_total_payroll,
        v_total_payroll_cash,
        v_total_payroll_bank
    FROM public.payroll_records
    WHERE payment_date = p_summary_date
    AND status = 'Paid';

    -- 9. Calculated Aggregate Totals
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

    -- Physical Cash Calculation
    v_system_cash_calc := (v_total_income_cash_orders + v_total_income_cash_charging + v_total_deposits_cash)
                        - (v_total_expenses_cash + v_total_savings_cash + v_total_withdrawals_cash + v_total_deposits_from_cash + v_total_staff_advances_cash + v_total_payroll_cash);

    -- Insert or update the summary table
    INSERT INTO public.daily_summary (
        summary_date,
        total_income_from_orders,
        total_income_from_orders_cash,
        total_income_from_orders_esewa,
        total_income_from_orders_fonepay,
        total_income_from_charging,
        total_income_from_charging_cash,
        total_income_from_charging_esewa,
        total_income_from_charging_fonepay,
        total_income_fonepay,
        total_income_esewa,
        total_income_cash,
        total_expenses,
        total_expenses_cash,
        total_expenses_esewa,
        total_expenses_fonepay,
        total_deposits,
        total_deposits_cash,
        total_deposits_esewa,
        total_deposits_from_cash,
        total_savings,
        total_savings_cash,
        total_savings_fonepay,
        total_savings_esewa,
        total_withdrawals,
        total_withdrawals_cooperative,
        total_withdrawals_bank,
        total_withdrawals_cash,
        total_staff_advances_disbursed,
        total_staff_advances_cash,
        total_staff_advances_bank,
        total_payroll_paid,
        total_payroll_cash,
        total_payroll_bank,
        total_income,
        total_cash_income,
        total_fonepay_income,
        total_esewa_income,
        cash_balance,
        esewa_balance,
        fonepay_balance,
        cooperative_balance,
        total_balance,
        system_cash_calculation
    ) VALUES (
        p_summary_date,
        v_total_income_from_orders,
        v_total_income_cash_orders,
        v_total_income_esewa_orders,
        v_total_income_fonepay_orders,
        v_total_income_from_charging,
        v_total_income_cash_charging,
        v_total_income_esewa_charging,
        v_total_income_fonepay_charging,
        v_total_fonepay_income,
        v_total_esewa_income,
        v_total_cash_income,
        v_total_expenses,
        v_total_expenses_cash,
        v_total_expenses_esewa,
        v_total_expenses_fonepay,
        v_total_deposits,
        v_total_deposits_cash,
        v_total_deposits_esewa,
        v_total_deposits_from_cash,
        v_total_savings,
        v_total_savings_cash,
        v_total_savings_fonepay,
        v_total_savings_esewa,
        v_total_withdrawals,
        v_total_withdrawals_cooperative,
        v_total_withdrawals_bank,
        v_total_withdrawals_cash,
        v_total_staff_advances,
        v_total_staff_advances_cash,
        v_total_staff_advances_bank,
        v_total_payroll,
        v_total_payroll_cash,
        v_total_payroll_bank,
        v_total_income,
        v_total_cash_income,
        v_total_fonepay_income,
        v_total_esewa_income,
        v_cash_balance,
        v_esewa_balance,
        v_fonepay_balance,
        v_cooperative_balance,
        v_total_balance,
        v_system_cash_calc
    )
    ON CONFLICT (summary_date) DO UPDATE SET
        total_income_from_orders = EXCLUDED.total_income_from_orders,
        total_income_from_orders_cash = EXCLUDED.total_income_from_orders_cash,
        total_income_from_orders_esewa = EXCLUDED.total_income_from_orders_esewa,
        total_income_from_orders_fonepay = EXCLUDED.total_income_from_orders_fonepay,
        total_income_from_charging = EXCLUDED.total_income_from_charging,
        total_income_from_charging_cash = EXCLUDED.total_income_from_charging_cash,
        total_income_from_charging_esewa = EXCLUDED.total_income_from_charging_esewa,
        total_income_from_charging_fonepay = EXCLUDED.total_income_from_charging_fonepay,
        total_income_fonepay = EXCLUDED.total_income_fonepay,
        total_income_esewa = EXCLUDED.total_income_esewa,
        total_income_cash = EXCLUDED.total_income_cash,
        total_expenses = EXCLUDED.total_expenses,
        total_expenses_cash = EXCLUDED.total_expenses_cash,
        total_expenses_esewa = EXCLUDED.total_expenses_esewa,
        total_expenses_fonepay = EXCLUDED.total_expenses_fonepay,
        total_deposits = EXCLUDED.total_deposits,
        total_deposits_cash = EXCLUDED.total_deposits_cash,
        total_deposits_esewa = EXCLUDED.total_deposits_esewa,
        total_deposits_from_cash = EXCLUDED.total_deposits_from_cash,
        total_savings = EXCLUDED.total_savings,
        total_savings_cash = EXCLUDED.total_savings_cash,
        total_savings_fonepay = EXCLUDED.total_savings_fonepay,
        total_savings_esewa = EXCLUDED.total_savings_esewa,
        total_withdrawals = EXCLUDED.total_withdrawals,
        total_withdrawals_cooperative = EXCLUDED.total_withdrawals_cooperative,
        total_withdrawals_bank = EXCLUDED.total_withdrawals_bank,
        total_withdrawals_cash = EXCLUDED.total_withdrawals_cash,
        total_staff_advances_disbursed = EXCLUDED.total_staff_advances_disbursed,
        total_staff_advances_cash = EXCLUDED.total_staff_advances_cash,
        total_staff_advances_bank = EXCLUDED.total_staff_advances_bank,
        total_payroll_paid = EXCLUDED.total_payroll_paid,
        total_payroll_cash = EXCLUDED.total_payroll_cash,
        total_payroll_bank = EXCLUDED.total_payroll_bank,
        total_income = EXCLUDED.total_income,
        total_cash_income = EXCLUDED.total_cash_income,
        total_fonepay_income = EXCLUDED.total_fonepay_income,
        total_esewa_income = EXCLUDED.total_esewa_income,
        cash_balance = EXCLUDED.cash_balance,
        esewa_balance = EXCLUDED.esewa_balance,
        fonepay_balance = EXCLUDED.fonepay_balance,
        cooperative_balance = EXCLUDED.cooperative_balance,
        total_balance = EXCLUDED.total_balance,
        system_cash_calculation = EXCLUDED.system_cash_calculation,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Trigger for staff_advances to update daily_summary
CREATE OR REPLACE FUNCTION public.trigger_update_staff_advance_summary()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        PERFORM public.update_daily_summary(COALESCE(OLD.withdrawal_date, OLD.transfer_date, OLD.request_date));
    ELSE
        PERFORM public.update_daily_summary(COALESCE(NEW.withdrawal_date, NEW.transfer_date, NEW.request_date));
        IF (OLD.withdrawal_date IS DISTINCT FROM NEW.withdrawal_date OR OLD.transfer_date IS DISTINCT FROM NEW.transfer_date) THEN
             PERFORM public.update_daily_summary(COALESCE(OLD.withdrawal_date, OLD.transfer_date));
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER staff_advances_summary_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.staff_advances
FOR EACH ROW EXECUTE FUNCTION public.trigger_update_staff_advance_summary();

-- Trigger for payroll_records to update daily_summary
CREATE OR REPLACE FUNCTION public.trigger_update_payroll_summary()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        PERFORM public.update_daily_summary(OLD.payment_date);
    ELSE
        PERFORM public.update_daily_summary(NEW.payment_date);
        IF (OLD.payment_date IS DISTINCT FROM NEW.payment_date) THEN
             PERFORM public.update_daily_summary(OLD.payment_date);
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payroll_summary_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.payroll_records
FOR EACH ROW EXECUTE FUNCTION public.trigger_update_payroll_summary();
