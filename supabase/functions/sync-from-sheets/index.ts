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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { table, operation, data, id }: SyncData = await req.json();

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
