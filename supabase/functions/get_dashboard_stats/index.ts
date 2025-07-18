import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface DashboardStats {
  totalRevenue: number;
  totalExpenses: number;
  newUsers: number;
  activeNow: number;
}

export default async (req: Request) => {
  const {
    data: { session },
  } = await createClient(
    // Supabase API URL - env var exported by default when deploying.
    Deno.env.get('SUPABASE_URL') ?? '',
    // Supabase API ANON KEY - env var exported by default when deploying.
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    // Create client with Auth context of the user that called the function.
    // This way your row-level-security (RLS) policies are applied.
    { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
  ).auth.getSession();

  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { data: totalRevenue, error: revenueError } = await supabase.rpc(
    'get_total_revenue'
  );
  const { data: totalExpenses, error: expensesError } = await supabase.rpc(
    'get_total_expenses'
  );
  const { data: newUsers, error: usersError } = await supabase.rpc(
    'get_new_users'
  );

  if (revenueError || expensesError || usersError) {
    return new Response(
      JSON.stringify({
        error:
          revenueError?.message ||
          expensesError?.message ||
          usersError?.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const stats: DashboardStats = {
    totalRevenue: totalRevenue || 0,
    totalExpenses: totalExpenses || 0,
    newUsers: newUsers || 0,
    activeNow: 0, // Placeholder
  };

  return new Response(JSON.stringify(stats), {
    headers: { 'Content-Type': 'application/json' },
  });
};
