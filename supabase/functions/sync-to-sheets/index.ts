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

    const { table, startDate, endDate }: SyncRequest = await req.json();

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
