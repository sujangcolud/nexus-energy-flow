import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

  const { question } = await req.json();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  let response: string;

  if (question.toLowerCase().includes("how many users")) {
    const { count, error } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true });
    if (error) {
      response = "Sorry, I couldn't fetch the number of users.";
    } else {
      response = `There are ${count} users.`;
    }
  } else if (question.toLowerCase().includes("total revenue")) {
    const { data, error } = await supabase.rpc("get_total_revenue");
    if (error) {
      response = "Sorry, I couldn't fetch the total revenue.";
    } else {
      response = `The total revenue is $${data.toFixed(2)}.`;
    }
  } else if (question.toLowerCase().includes("total expenses")) {
    const { data, error } = await supabase.rpc("get_total_expenses");
    if (error) {
      response = "Sorry, I couldn't fetch the total expenses.";
    } else {
      response = `The total expenses are $${data.toFixed(2)}.`;
    }
  } else {
    response = "Sorry, I don't understand that question.";
  }

  return new Response(JSON.stringify({ response }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
