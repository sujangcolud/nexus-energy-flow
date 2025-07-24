-- Check Database Triggers and Functions
-- This helps identify what's causing the column error during order submission

-- Check all triggers on the orders table
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'orders'
ORDER BY trigger_name;

-- Check all functions that might reference the problematic column
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines
WHERE routine_definition LIKE '%total_income_fonepay%'
ORDER BY routine_name;

-- Check the daily_summary table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'daily_summary'
ORDER BY ordinal_position;

-- Check if there are any views that might be causing issues
SELECT 
    table_name,
    view_definition
FROM information_schema.views
WHERE view_definition LIKE '%total_income_fonepay%';
