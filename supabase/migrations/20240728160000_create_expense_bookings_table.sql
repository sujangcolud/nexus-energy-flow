CREATE TABLE expense_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id)
);

CREATE TABLE expense_booking_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
