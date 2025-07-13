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

  if (question.toLowerCase().includes("monthly financial summary")) {
    const { data, error } = await supabase.rpc("get_monthly_financial_summary");
    if (error) {
      response = "Sorry, I couldn't fetch the monthly financial summary.";
    } else {
      response = JSON.stringify(data, null, 2);
    }
  } else if (question.toLowerCase().includes("income breakdown")) {
    const { data, error } = await supabase.rpc("get_income_breakdown");
    if (error) {
      response = "Sorry, I couldn't fetch the income breakdown.";
    } else {
      response = JSON.stringify(data, null, 2);
    }
  } else if (question.toLowerCase().includes("expense categorization")) {
    const { data, error } = await supabase.rpc("get_expense_categorization");
    if (error) {
      response = "Sorry, I couldn't fetch the expense categorization.";
    } else {
      response = JSON.stringify(data, null, 2);
    }
  } else if (question.toLowerCase().includes("monthly deposits and withdrawals")) {
    const { data, error } = await supabase.rpc("get_monthly_deposits_withdrawals");
    if (error) {
      response = "Sorry, I couldn't fetch the monthly deposits and withdrawals.";
    } else {
      response = JSON.stringify(data, null, 2);
    }
  } else if (question.toLowerCase().includes("new user growth")) {
    const { data, error } = await supabase.rpc("get_new_user_growth");
    if (error) {
      response = "Sorry, I couldn't fetch the new user growth.";
    } else {
      response = JSON.stringify(data, null, 2);
    }
  } else if (question.toLowerCase().includes("user role distribution")) {
    const { data, error } = await supabase.rpc("get_user_role_distribution");
    if (error) {
      response = "Sorry, I couldn't fetch the user role distribution.";
    } else {
      response = JSON.stringify(data, null, 2);
    }
  } else if (question.toLowerCase().includes("top spenders")) {
    const { data, error } = await supabase.rpc("get_top_spenders", { limit_count: 5 });
    if (error) {
      response = "Sorry, I couldn't fetch the top spenders.";
    } else {
      response = JSON.stringify(data, null, 2);
    }
  } else if (question.toLowerCase().includes("popular products")) {
    const { data, error } = await supabase.rpc("get_popular_products");
    if (error) {
      response = "Sorry, I couldn't fetch the popular products.";
    } else {
      response = JSON.stringify(data, null, 2);
    }
  } else if (question.toLowerCase().includes("sales by payment mode")) {
    const { data, error } = await supabase.rpc("get_sales_by_payment_mode");
    if (error) {
      response = "Sorry, I couldn't fetch the sales by payment mode.";
    } else {
      response = JSON.stringify(data, null, 2);
    }
  } else if (question.toLowerCase().includes("cooperative savings trend")) {
    const { data, error } = await supabase.rpc("get_cooperative_savings_trend");
    if (error) {
      response = "Sorry, I couldn't fetch the cooperative savings trend.";
    } else {
      response = JSON.stringify(data, null, 2);
    }
  } else if (question.toLowerCase().includes("menu item availability")) {
    const { data, error } = await supabase.rpc("get_menu_item_availability");
    if (error) {
      response = "Sorry, I couldn't fetch the menu item availability.";
    } else {
      response = JSON.stringify(data, null, 2);
    }
  } else {
    response = "Sorry, I don't understand that question.";
  }

  return new Response(JSON.stringify({ response }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
