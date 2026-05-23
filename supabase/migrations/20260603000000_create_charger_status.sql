CREATE TABLE IF NOT EXISTS charger_status (
    charger_id TEXT PRIMARY KEY,
    status TEXT DEFAULT 'Offline',
    power_kw FLOAT DEFAULT 0.0,
    voltage FLOAT DEFAULT 0.0,
    current FLOAT DEFAULT 0.0,
    soc FLOAT DEFAULT 0.0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS charger_transactions (
    transaction_id TEXT PRIMARY KEY,
    charger_id TEXT NOT NULL,
    id_tag TEXT,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    start_meter INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Realtime
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'charger_status'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE charger_status;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'charger_transactions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE charger_transactions;
    END IF;
END
$$;
