CREATE TABLE balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  date DATE NOT NULL,
  cash_balance NUMERIC NOT NULL,
  cooperative_savings_balance NUMERIC NOT NULL,
  esewa_balance NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE TABLE balance_sheet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  date_range_start DATE,
  date_range_end DATE,
  report_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
