CREATE TABLE IF NOT EXISTS balance_sheet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  date_range_start DATE,
  date_range_end DATE,
  report_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
