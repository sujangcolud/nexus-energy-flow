import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.26.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { question } = await req.json();

    if (!question) {
      throw new Error("Missing question");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get database schema and recent data for context
    const databaseContext = await getDatabaseContext(supabase);

    // Create enhanced prompt with database context
    const enhancedPrompt = `
You are a helpful business analytics assistant for an Energy Palace Nexus management system. You have access to the following business data:

DATABASE CONTEXT:
${databaseContext}

CAPABILITIES:
- Analyze financial data (orders, charging sessions, expenses, deposits, withdrawals)
- Calculate business metrics like revenue, profit, cash flow
- Provide insights about charging vs restaurant income correlation
- Explain bank balance, cash in hand, and cooperative savings
- Answer questions about daily, weekly, or monthly trends
- Suggest business improvements based on data

USER QUESTION: ${question}

Provide a detailed, helpful answer based on the available data. If the question requires specific calculations, show your work. If data is not available, suggest what data would be needed to answer the question properly.
`;

    // Call OpenAI API with enhanced prompt
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are a business analytics assistant specializing in energy and restaurant business data analysis.",
          },
          {
            role: "user",
            content: enhancedPrompt,
          },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "OpenAI API error");
    }

    const data = await response.json();
    const answer = data.choices[0].message.content.trim();

    return new Response(JSON.stringify({ answer }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Chatbot error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

async function getDatabaseContext(supabase: any): Promise<string> {
  try {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get recent data from each table
    const [orders, charging, expenses, deposits, withdrawals, cooperative] =
      await Promise.all([
        supabase
          .from("orders")
          .select("*")
          .gte("created_at", weekAgo.toISOString())
          .limit(50),
        supabase
          .from("charging_sessions")
          .select("*")
          .gte("created_at", weekAgo.toISOString())
          .limit(50),
        supabase
          .from("expenses")
          .select("*")
          .gte("created_at", weekAgo.toISOString())
          .limit(50),
        supabase
          .from("deposits")
          .select("*")
          .gte("created_at", weekAgo.toISOString())
          .limit(50),
        supabase
          .from("withdrawals")
          .select("*")
          .gte("created_at", weekAgo.toISOString())
          .limit(50),
        supabase
          .from("cooperative_savings")
          .select("*")
          .gte("created_at", weekAgo.toISOString())
          .limit(50),
      ]);

    // Calculate summary statistics
    const orderData = orders.data || [];
    const chargingData = charging.data || [];
    const expenseData = expenses.data || [];
    const depositData = deposits.data || [];
    const withdrawalData = withdrawals.data || [];
    const cooperativeData = cooperative.data || [];

    const totalOrders = orderData.length;
    const totalRevenue = orderData.reduce(
      (sum: number, order: any) => sum + (order.total_amount || 0),
      0,
    );
    const totalChargingRevenue = chargingData.reduce(
      (sum: number, session: any) => sum + (session.amount_charged || 0),
      0,
    );
    const totalExpenses = expenseData.reduce(
      (sum: number, expense: any) => sum + (expense.amount || 0),
      0,
    );
    const totalDeposits = depositData.reduce(
      (sum: number, deposit: any) => sum + (deposit.amount || 0),
      0,
    );
    const totalWithdrawals = withdrawalData.reduce(
      (sum: number, withdrawal: any) => sum + (withdrawal.amount || 0),
      0,
    );
    const totalCooperative = cooperativeData.reduce(
      (sum: number, saving: any) => sum + (saving.amount || 0),
      0,
    );

    // Calculate financial metrics
    const bankBalance =
      totalDeposits -
      totalWithdrawals -
      expenseData
        .filter((e: any) => e.payment_method !== "cash")
        .reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
    const cashExpenses = expenseData
      .filter((e: any) => e.payment_method === "cash")
      .reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
    const cashOrders = orderData
      .filter((o: any) => o.payment_method === "cash")
      .reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0);
    const cashFromCharging = chargingData
      .filter((c: any) => c.payment_method === "cash")
      .reduce((sum: number, c: any) => sum + (c.amount_charged || 0), 0);
    const cashInHand = cashOrders + cashFromCharging - cashExpenses;

    return `
RECENT BUSINESS DATA (Last 7 days):

ORDERS & RESTAURANT:
- Total Orders: ${totalOrders}
- Restaurant Revenue: $${totalRevenue.toFixed(2)}
- Average Order Value: $${totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : "0"}

CHARGING SESSIONS:
- Total Charging Sessions: ${chargingData.length}
- Charging Revenue: $${totalChargingRevenue.toFixed(2)}
- Average Session Value: $${chargingData.length > 0 ? (totalChargingRevenue / chargingData.length).toFixed(2) : "0"}

FINANCIAL SUMMARY:
- Total Revenue: $${(totalRevenue + totalChargingRevenue).toFixed(2)}
- Total Expenses: $${totalExpenses.toFixed(2)}
- Net Profit: $${(totalRevenue + totalChargingRevenue - totalExpenses).toFixed(2)}
- Bank Balance: $${bankBalance.toFixed(2)}
- Cash in Hand: $${cashInHand.toFixed(2)}
- Cooperative Savings: $${totalCooperative.toFixed(2)}

PAYMENT METHODS:
- Cash Orders: ${orderData.filter((o: any) => o.payment_method === "cash").length}
- Non-Cash Orders: ${orderData.filter((o: any) => o.payment_method !== "cash").length}
- Cash Expenses: $${cashExpenses.toFixed(2)}
- Non-Cash Expenses: $${(totalExpenses - cashExpenses).toFixed(2)}

TRENDS:
- Revenue Growth: ${totalRevenue + totalChargingRevenue > 0 ? "Positive" : "Needs Attention"}
- Expense Control: ${totalExpenses < totalRevenue + totalChargingRevenue ? "Good" : "Review Needed"}
- Cash Flow: ${cashInHand + bankBalance > 0 ? "Healthy" : "Monitor Closely"}

Note: This data represents the last 7 days of activity. For older data or specific date ranges, please specify in your question.
`;
  } catch (error) {
    console.error("Error getting database context:", error);
    return "Database context unavailable. I can still help with general business questions.";
  }
}
