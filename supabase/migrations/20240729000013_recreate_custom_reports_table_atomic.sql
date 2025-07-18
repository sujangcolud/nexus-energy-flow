DROP TABLE IF EXISTS custom_reports;

CREATE TABLE custom_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  data_sources TEXT[] NOT NULL,
  joins JSONB,
  calculation_type TEXT NOT NULL,
  calculation_column TEXT NOT NULL,
  filters JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
