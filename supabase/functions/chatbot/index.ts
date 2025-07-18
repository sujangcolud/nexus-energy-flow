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
You are a sophisticated business analytics AI assistant for Energy Palace Nexus, a dual-business operation running both a restaurant and EV charging station. You have comprehensive access to all business data and deep knowledge of the operations.

BUSINESS CONTEXT:
Energy Palace Nexus operates:
1. Restaurant business with menu items, orders, and food service
2. EV charging station with charging sessions and energy billing
3. Cooperative savings program for community members
4. Multiple payment methods: Cash, eSewa, FonePay, bank transfers
5. Complete financial management including expenses, deposits, withdrawals

DATABASE CONTEXT:
${databaseContext}

ADVANCED CAPABILITIES:
✅ Financial Analysis & KPIs:
- Revenue analysis (restaurant vs charging breakdown)
- Profit margin calculations and trend analysis
- Cash flow management and forecasting
- ROI calculations for business investments
- Break-even analysis for new initiatives

✅ Operational Intelligence:
- Peak hours analysis for both restaurant and charging
- Menu item performance and profitability
- Charging station utilization rates
- Customer behavior patterns
- Seasonal trend identification

✅ Strategic Insights:
- Business diversification recommendations
- Cost optimization strategies
- Revenue enhancement opportunities
- Market positioning analysis
- Competitive advantage identification

✅ Financial Management:
- Balance sheet analysis across all accounts
- Expense categorization and control
- Payment method optimization
- Cooperative savings program performance
- Tax planning and compliance insights

✅ Predictive Analytics:
- Revenue forecasting based on historical data
- Expense trend predictions
- Cash flow projections
- Business growth modeling
- Risk assessment and mitigation

✅ Reporting & Visualization:
- Custom KPI calculations
- Performance benchmarking
- Variance analysis (actual vs budget/forecast)
- Trend identification and explanation
- Data-driven recommendations

RESPONSE STYLE:
- Provide specific numbers and calculations when available
- Show step-by-step analysis for complex calculations
- Offer actionable business insights and recommendations
- Highlight both opportunities and risks
- Use data to support all conclusions
- Suggest follow-up questions or deeper analysis when relevant

USER QUESTION: ${question}

Analyze the question and provide a comprehensive, data-driven response. Include relevant calculations, insights, and actionable recommendations based on the available business data.
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
            content: `You are an expert business analytics AI for Energy Palace Nexus, specializing in:

            1. DUAL BUSINESS OPERATIONS: Restaurant + EV Charging Station
            2. FINANCIAL ANALYSIS: Multi-source revenue, expense management, profit optimization
            3. DATA INTERPRETATION: Real-time business metrics, trend analysis, forecasting
            4. STRATEGIC PLANNING: Growth recommendations, risk assessment, market positioning
            5. OPERATIONAL EFFICIENCY: Process optimization, resource allocation, performance tracking

            Always provide:
            - Specific numerical analysis when data is available
            - Clear explanations of calculations and methodology
            - Actionable business recommendations
            - Context about business implications
            - Follow-up suggestions for deeper analysis

            Your responses should be professional, insightful, and directly applicable to business decision-making.`,
          },
          {
            role: "user",
            content: enhancedPrompt,
          },
        ],
        max_tokens: 800,
        temperature: 0.3,
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

    // Get recent data from each table with corrected column names
    const [
      orders,
      charging,
      expenses,
      deposits,
      withdrawals,
      cooperative,
      balances,
      menuItems,
      staticExpenses,
    ] = await Promise.all([
      supabase
        .from("orders")
        .select("*")
        .gte("created_at", weekAgo.toISOString())
        .limit(100),
      supabase
        .from("charging_sessions")
        .select("*")
        .gte("created_at", weekAgo.toISOString())
        .limit(100),
      supabase
        .from("expenses")
        .select("*")
        .gte("created_at", weekAgo.toISOString())
        .limit(100),
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
      supabase
        .from("balances")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1),
      supabase
        .from("menu_items")
        .select("*")
        .eq("is_available", true)
        .limit(20),
      supabase.from("static_expenses").select("*").limit(20),
    ]);

    // Get data arrays safely
    const orderData = orders.data || [];
    const chargingData = charging.data || [];
    const expenseData = expenses.data || [];
    const depositData = deposits.data || [];
    const withdrawalData = withdrawals.data || [];
    const cooperativeData = cooperative.data || [];
    const balanceData = balances.data?.[0] || null;
    const menuData = menuItems.data || [];
    const staticExpenseData = staticExpenses.data || [];

    // Calculate summary statistics with correct column names
    const totalOrders = orderData.length;
    const totalRevenue = orderData.reduce(
      (sum: number, order: any) => sum + (parseFloat(order.total) || 0),
      0,
    );
    const totalChargingRevenue = chargingData.reduce(
      (sum: number, session: any) =>
        sum + (parseFloat(session.total_amount) || 0),
      0,
    );
    const totalExpenses = expenseData.reduce(
      (sum: number, expense: any) => sum + (parseFloat(expense.amount) || 0),
      0,
    );
    const totalDeposits = depositData.reduce(
      (sum: number, deposit: any) => sum + (parseFloat(deposit.amount) || 0),
      0,
    );
    const totalWithdrawals = withdrawalData.reduce(
      (sum: number, withdrawal: any) =>
        sum + (parseFloat(withdrawal.amount) || 0),
      0,
    );
    const totalCooperative = cooperativeData.reduce(
      (sum: number, saving: any) =>
        sum + (parseFloat(saving.contribution_amount) || 0),
      0,
    );
    const totalStaticExpenses = staticExpenseData.reduce(
      (sum: number, expense: any) => sum + (parseFloat(expense.amount) || 0),
      0,
    );

    // Calculate financial metrics with corrected payment_mode column
    const bankExpenses = expenseData
      .filter((e: any) => e.payment_mode !== "cash")
      .reduce((sum: number, e: any) => sum + (parseFloat(e.amount) || 0), 0);
    const cashExpenses = expenseData
      .filter((e: any) => e.payment_mode === "cash")
      .reduce((sum: number, e: any) => sum + (parseFloat(e.amount) || 0), 0);
    const cashOrders = orderData
      .filter((o: any) => o.payment_mode === "cash")
      .reduce((sum: number, o: any) => sum + (parseFloat(o.total) || 0), 0);
    const digitalOrders = orderData
      .filter((o: any) => o.payment_mode !== "cash")
      .reduce((sum: number, o: any) => sum + (parseFloat(o.total) || 0), 0);
    const cashFromCharging = chargingData
      .filter((c: any) => c.payment_mode === "cash")
      .reduce(
        (sum: number, c: any) => sum + (parseFloat(c.total_amount) || 0),
        0,
      );
    const digitalFromCharging = chargingData
      .filter((c: any) => c.payment_mode !== "cash")
      .reduce(
        (sum: number, c: any) => sum + (parseFloat(c.total_amount) || 0),
        0,
      );

    // Use actual balances if available, otherwise calculate
    const actualBankBalance = balanceData?.bank_balance
      ? parseFloat(balanceData.bank_balance)
      : totalDeposits - totalWithdrawals - bankExpenses;
    const actualCashInHand = balanceData?.cash_in_hand
      ? parseFloat(balanceData.cash_in_hand)
      : cashOrders + cashFromCharging - cashExpenses;
    const actualCooperativeBalance = balanceData?.cooperative_balance
      ? parseFloat(balanceData.cooperative_balance)
      : totalCooperative;
    const actualEsewaBalance = balanceData?.esewa_balance
      ? parseFloat(balanceData.esewa_balance)
      : 0;
    const actualFonepayBalance = balanceData?.fonepay_balance
      ? parseFloat(balanceData.fonepay_balance)
      : 0;

    // Category breakdown for expenses
    const expensesByCategory = expenseData.reduce((acc: any, expense: any) => {
      const category = expense.category || "Other";
      acc[category] = (acc[category] || 0) + (parseFloat(expense.amount) || 0);
      return acc;
    }, {});

    // Popular menu items
    const ordersByItem = orderData.reduce((acc: any, order: any) => {
      const item = order.item_name || "Unknown";
      acc[item] = (acc[item] || 0) + (parseFloat(order.quantity) || 1);
      return acc;
    }, {});

    // Daily trends for the last 7 days
    const dailyTrends = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toDateString();

      const dayOrders = orderData.filter(
        (o: any) => new Date(o.created_at).toDateString() === dateStr,
      );
      const dayCharging = chargingData.filter(
        (c: any) => new Date(c.created_at).toDateString() === dateStr,
      );
      const dayExpenses = expenseData.filter(
        (e: any) => new Date(e.created_at).toDateString() === dateStr,
      );

      const dayRevenue =
        dayOrders.reduce(
          (sum: number, o: any) => sum + (parseFloat(o.total) || 0),
          0,
        ) +
        dayCharging.reduce(
          (sum: number, c: any) => sum + (parseFloat(c.total_amount) || 0),
          0,
        );
      const dayExpenseTotal = dayExpenses.reduce(
        (sum: number, e: any) => sum + (parseFloat(e.amount) || 0),
        0,
      );

      dailyTrends.push({
        date: date.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
        revenue: dayRevenue.toFixed(2),
        expenses: dayExpenseTotal.toFixed(2),
        profit: (dayRevenue - dayExpenseTotal).toFixed(2),
        orders: dayOrders.length,
        charging_sessions: dayCharging.length,
      });
    }

    return `
COMPREHENSIVE BUSINESS DATA ANALYSIS (Energy Palace Nexus)

=== DATABASE SCHEMA OVERVIEW ===
Tables Available:
- orders: Restaurant orders (columns: item_name, quantity, rate, total, payment_mode, order_date)
- charging_sessions: EV charging sessions (columns: start_percentage, end_percentage, per_percent_rate, total_amount, payment_mode, session_date)
- expenses: Business expenses (columns: description, amount, category, payment_mode, expense_date, remarks)
- deposits: Bank deposits (columns: amount, mode, deposited_by, deposit_date, deposited_to, payment_mode)
- withdrawals: Bank withdrawals (columns: amount, purpose, recipient, withdrawal_date, payment_mode)
- cooperative_savings: Cooperative member savings (columns: member_id, contribution_amount, cycle_period, contribution_date)
- balances: Current account balances (columns: cash_in_hand, esewa_balance, fonepay_balance, cooperative_balance, bank_balance)
- menu_items: Restaurant menu (columns: name, description, price, category, is_available)
- static_expenses: Recurring expenses (columns: name, amount, is_recurring)

=== RECENT BUSINESS DATA (Last 7 days) ===

RESTAURANT OPERATIONS:
- Total Orders: ${totalOrders}
- Restaurant Revenue: $${totalRevenue.toFixed(2)}
- Average Order Value: $${totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : "0"}
- Cash Orders: ${orderData.filter((o: any) => o.payment_mode === "cash").length} ($${cashOrders.toFixed(2)})
- Digital Orders: ${orderData.filter((o: any) => o.payment_mode !== "cash").length} ($${digitalOrders.toFixed(2)})

CHARGING OPERATIONS:
- Total Charging Sessions: ${chargingData.length}
- Charging Revenue: $${totalChargingRevenue.toFixed(2)}
- Average Session Value: $${chargingData.length > 0 ? (totalChargingRevenue / chargingData.length).toFixed(2) : "0"}
- Cash Charging: ${chargingData.filter((c: any) => c.payment_mode === "cash").length} ($${cashFromCharging.toFixed(2)})
- Digital Charging: ${chargingData.filter((c: any) => c.payment_mode !== "cash").length} ($${digitalFromCharging.toFixed(2)})

FINANCIAL SUMMARY:
- Total Revenue: $${(totalRevenue + totalChargingRevenue).toFixed(2)}
- Total Expenses: $${totalExpenses.toFixed(2)}
- Net Profit: $${(totalRevenue + totalChargingRevenue - totalExpenses).toFixed(2)}
- Static Monthly Expenses: $${totalStaticExpenses.toFixed(2)}

CURRENT BALANCES:
- Bank Balance: $${actualBankBalance.toFixed(2)}
- Cash in Hand: $${actualCashInHand.toFixed(2)}
- Cooperative Balance: $${actualCooperativeBalance.toFixed(2)}
- eSewa Balance: $${actualEsewaBalance.toFixed(2)}
- FonePay Balance: $${actualFonepayBalance.toFixed(2)}
- Total Assets: $${(actualBankBalance + actualCashInHand + actualCooperativeBalance + actualEsewaBalance + actualFonepayBalance).toFixed(2)}

EXPENSE BREAKDOWN BY CATEGORY:
${Object.entries(expensesByCategory)
  .map(
    ([category, amount]: [string, any]) =>
      `- ${category}: $${amount.toFixed(2)}`,
  )
  .join("\n")}

POPULAR MENU ITEMS (by quantity):
${Object.entries(ordersByItem)
  .slice(0, 5)
  .map(([item, qty]: [string, any]) => `- ${item}: ${qty} orders`)
  .join("\n")}

AVAILABLE MENU ITEMS:
${menuData.map((item: any) => `- ${item.name}: $${parseFloat(item.price || 0).toFixed(2)} (${item.category})`).join("\n")}

DAILY TRENDS (Last 7 Days):
${dailyTrends
  .map(
    (day: any) =>
      `${day.date}: Revenue $${day.revenue}, Expenses $${day.expenses}, Profit $${day.profit} (${day.orders} orders, ${day.charging_sessions} sessions)`,
  )
  .join("\n")}

PAYMENT METHOD ANALYSIS:
- Cash Transactions: $${(cashOrders + cashFromCharging).toFixed(2)} (${(((cashOrders + cashFromCharging) / (totalRevenue + totalChargingRevenue)) * 100).toFixed(1)}% of revenue)
- Digital Transactions: $${(digitalOrders + digitalFromCharging).toFixed(2)} (${(((digitalOrders + digitalFromCharging) / (totalRevenue + totalChargingRevenue)) * 100).toFixed(1)}% of revenue)
- Cash Expenses: $${cashExpenses.toFixed(2)}
- Digital Expenses: $${bankExpenses.toFixed(2)}

BUSINESS HEALTH INDICATORS:
- Revenue Growth: ${totalRevenue + totalChargingRevenue > 0 ? "Positive" : "Needs Attention"}
- Expense Control: ${totalExpenses < totalRevenue + totalChargingRevenue ? "Good - Profitable" : "Review Needed - Losses"}
- Cash Flow: ${actualCashInHand + actualBankBalance > 0 ? "Healthy" : "Monitor Closely"}
- Diversification: ${totalChargingRevenue / (totalRevenue + totalChargingRevenue) > 0.3 ? "Well diversified" : "Restaurant dependent"}

OPERATIONAL INSIGHTS:
- Average Daily Revenue: $${((totalRevenue + totalChargingRevenue) / 7).toFixed(2)}
- Average Daily Expenses: $${(totalExpenses / 7).toFixed(2)}
- Revenue per Order: $${totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : "0"}
- Revenue per Charging Session: $${chargingData.length > 0 ? (totalChargingRevenue / chargingData.length).toFixed(2) : "0"}

Note: This comprehensive data covers the last 7 days. I can provide historical analysis, trends, forecasting, and specific calculations upon request. Ask me about any specific aspect of the business data!
`;
  } catch (error) {
    console.error("Error getting database context:", error);
    return `
DATABASE CONNECTION ERROR: Unable to fetch real-time data, but I can still help with:

GENERAL BUSINESS GUIDANCE:
- Financial analysis and KPI calculations
- Business strategy recommendations
- Cash flow management advice
- Menu optimization strategies
- Charging station operations
- Expense categorization and control
- Revenue diversification strategies
- Payment method optimization

SCHEMA KNOWLEDGE:
I understand your database structure including:
- Restaurant orders and menu management
- EV charging sessions and pricing
- Expense tracking and categorization
- Banking and cooperative savings
- Multiple payment methods (cash, eSewa, FonePay)
- User management and roles

Please ask specific questions and I'll provide relevant business insights and calculations based on the data structure.
`;
  }
}
