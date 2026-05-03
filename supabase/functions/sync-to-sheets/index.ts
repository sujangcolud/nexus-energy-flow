import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncRequest {
  table: string;
  startDate?: string;
  endDate?: string;
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

const isValidDate = (value: unknown) =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

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

    const { table, startDate, endDate }: SyncRequest = await req.json();

    if (!ALLOWED_SYNC_TABLES.has(table)) {
      return new Response(
        JSON.stringify({ error: 'Table is not allowed for sync' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if ((startDate && !isValidDate(startDate)) || (endDate && !isValidDate(endDate))) {
      return new Response(
        JSON.stringify({ error: 'Dates must use YYYY-MM-DD format' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    let query = supabase.from(table).select('*', { count: 'exact' });
    
    // Apply date filters based on table
    if (startDate && endDate) {
      const dateColumn = getDateColumn(table);
      if (dateColumn) {
        query = query.gte(dateColumn, startDate).lte(dateColumn, endDate);
      }
    }

    // Fetch all rows without limit - paginate if needed
    let allData: any[] = [];
    let from = 0;
    const pageSize = 1000;
    
    while (true) {
      const { data, error, count } = await query.range(from, from + pageSize - 1);
      
      if (error) {
        throw error;
      }
      
      if (data && data.length > 0) {
        allData = [...allData, ...data];
        from += pageSize;
        
        // Break if we've fetched all rows
        if (count && allData.length >= count) {
          break;
        }
        
        // Break if we got less than pageSize (last page)
        if (data.length < pageSize) {
          break;
        }
      } else {
        break;
      }
    }

    return new Response(
      JSON.stringify({ data: allData, table }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in sync-to-sheets:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});

function getDateColumn(table: string): string | null {
  const dateColumns: Record<string, string> = {
    'orders': 'order_date',
    'expenses': 'expense_date',
    'deposits': 'deposit_date',
    'withdrawals': 'withdrawal_date',
    'charging_sessions': 'session_date',
    'cooperative_savings': 'contribution_date',
    'share_investments': 'investment_date',
  };
  return dateColumns[table] || null;
}
