import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncData {
  table: string;
  operation: 'insert' | 'update' | 'delete';
  data: any;
  id?: string;
}

const ALLOWED_SYNC_TABLES = new Set([
  'orders',
  'expenses',
  'deposits',
  'withdrawals',
  'charging_sessions',
  'cooperative_savings',
  'share_investments',
  'share_expenses',
  'expense_bookings',
  'inventory',
  'inventory_transactions',
  'static_expenses',
  'vat_entries',
]);

const isValidUuid = (value: unknown) =>
  typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: roleRow, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'super_admin')
      .maybeSingle();

    if (roleError || !roleRow) {
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    const { table, operation, data, id }: SyncData = await req.json();

    if (!ALLOWED_SYNC_TABLES.has(table)) {
      return new Response(
        JSON.stringify({ error: 'Table is not allowed for sync' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!['insert', 'update', 'delete'].includes(operation)) {
      return new Response(
        JSON.stringify({ error: 'Invalid operation' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if ((operation === 'insert' || operation === 'update') && (!data || typeof data !== 'object' || Array.isArray(data))) {
      return new Response(
        JSON.stringify({ error: 'Valid row data is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if ((operation === 'update' || operation === 'delete') && !isValidUuid(id)) {
      return new Response(
        JSON.stringify({ error: 'Valid row ID is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Syncing ${operation} operation on ${table}`);

    let result;

    // Ensure user_id is set for all operations
    if (operation === 'insert' || operation === 'update') {
      data.user_id = user.id;
    }

    switch (operation) {
      case 'insert':
        result = await supabase.from(table).insert(data).select();
        break;
      
      case 'update':
        if (!id) {
          throw new Error('ID required for update operation');
        }
        result = await supabase.from(table).update(data).eq('id', id).eq('user_id', user.id).select();
        break;
      
      case 'delete':
        if (!id) {
          throw new Error('ID required for delete operation');
        }
        result = await supabase.from(table).delete().eq('id', id).eq('user_id', user.id);
        break;
      
      default:
        throw new Error('Invalid operation');
    }

    if (result.error) {
      throw result.error;
    }

    // Trigger daily summary recalculation if needed
    const summaryTriggerTables = ['orders', 'expenses', 'deposits', 'withdrawals', 'charging_sessions', 'cooperative_savings'];
    if (summaryTriggerTables.includes(table)) {
      const dateColumn = getDateColumn(table);
      const targetDate = data[dateColumn] || new Date().toISOString().split('T')[0];
      
      await supabase.rpc('sync_daily_summary_for_date_v2', { target_date: targetDate });
    }

    return new Response(
      JSON.stringify({ success: true, data: result.data }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in sync-from-sheets:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});

function getDateColumn(table: string): string {
  const dateColumns: Record<string, string> = {
    'orders': 'order_date',
    'expenses': 'expense_date',
    'deposits': 'deposit_date',
    'withdrawals': 'withdrawal_date',
    'charging_sessions': 'session_date',
    'cooperative_savings': 'contribution_date',
    'share_investments': 'investment_date',
  };
  return dateColumns[table] || 'created_at';
}
