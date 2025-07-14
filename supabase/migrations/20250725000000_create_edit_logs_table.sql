CREATE TABLE edit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  transaction_type TEXT NOT NULL,
  transaction_id UUID NOT NULL,
  previous_data JSONB NOT NULL,
  new_data JSONB NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
