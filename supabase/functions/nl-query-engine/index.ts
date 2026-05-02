// Nexus Energy Flow — NL→Structured Plan→Safe Query engine.
// Whitelist-only. No raw SQL. RLS-respecting. Multi-table intents (profit).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// =============== SEMANTIC LAYER (whitelist) ===============
type TableSpec = {
  columns: string[];
  dateColumn: string;
  amountColumn?: string;
  description: string;
};

const SCHEMA: Record<string, TableSpec> = {
  orders: {
    columns: ["id", "item_name", "quantity", "rate", "total", "payment_mode", "order_date", "user_id"],
    dateColumn: "order_date",
    amountColumn: "total",
    description: "Restaurant/POS orders. total = sale amount.",
  },
  charging_sessions: {
    columns: ["id", "category", "kcal", "start_percentage", "end_percentage", "per_unit_rate", "per_percent_rate", "total_amount", "payment_mode", "session_date", "user_id"],
    dateColumn: "session_date",
    amountColumn: "total_amount",
    description: "EV charging sessions. total_amount = revenue.",
  },
  expenses: {
    columns: ["id", "description", "category", "amount", "payment_mode", "expense_date", "user_id"],
    dateColumn: "expense_date",
    amountColumn: "amount",
    description: "Operating expenses.",
  },
  deposits: {
    columns: ["id", "amount", "mode", "payment_mode", "deposited_by", "deposited_to", "sender_name", "receiver_name", "deposit_date", "user_id"],
    dateColumn: "deposit_date",
    amountColumn: "amount",
    description: "Money deposited to wallets/bank.",
  },
  withdrawals: {
    columns: ["id", "amount", "purpose", "category", "payment_mode", "withdrawal_from", "recipient", "withdrawal_date", "user_id"],
    dateColumn: "withdrawal_date",
    amountColumn: "amount",
    description: "Money withdrawn.",
  },
  cooperative_savings: {
    columns: ["id", "member_id", "contribution_amount", "contribution_date", "payment_mode", "savings_to", "user_id"],
    dateColumn: "contribution_date",
    amountColumn: "contribution_amount",
    description: "Cooperative savings contributions.",
  },
  inventory: {
    columns: ["id", "item_name", "category", "quantity", "minimum_stock", "unit_cost", "total_cost", "supplier", "purchase_date", "user_id"],
    dateColumn: "purchase_date",
    amountColumn: "total_cost",
    description: "Stock items.",
  },
  share_investments: {
    columns: ["id", "shareholder_name", "contribution_amount", "payment_mode", "investment_date", "user_id"],
    dateColumn: "investment_date",
    amountColumn: "contribution_amount",
    description: "Equity contributions by shareholders.",
  },
  vat_entries: {
    columns: ["id", "invoice_number", "invoice_date", "seller_name", "buyer_name", "sub_total", "vat_amount", "total_with_vat", "payment_mode", "user_id"],
    dateColumn: "invoice_date",
    amountColumn: "total_with_vat",
    description: "VAT invoices.",
  },
  advanced_business_intelligence: {
    columns: ["business_date", "category_group", "daily_cost", "daily_sales", "rolling_cost_7d", "rolling_sales_7d", "gross_margin_pct_7d", "charging_revenue", "charging_count", "orders_revenue", "orders_count", "charging_to_food_conversion", "total_revenue", "expenses_total", "commission_total", "withdrawals_total", "deposits_total", "revenue_per_commission_rupee"],
    dateColumn: "business_date",
    description: "Advanced BI with REAL weighted cost allocation (Chicken, Mutton, Fish, Veg) and 7-day rolling margins.",
  },
  ai_audit_alerts: {
    columns: ["business_date", "category_group", "alert_type", "alert_description"],
    dateColumn: "business_date",
    description: "Waste/leakage alerts detected by the AI Auditor.",
  },
  category_usage_analysis: {
    columns: ["business_date", "category", "total_expense", "total_income", "net_profit", "margin_pct"],
    dateColumn: "business_date",
    description: "Granular comparison of income vs expense for usage categories like Commission, Electricity, Fuel, etc.",
  },
  nepali_kitchen_intelligence: {
    columns: ["business_date", "category", "daily_expense", "daily_sales", "rolling_expense_7d", "rolling_sales_7d", "gross_margin_pct_7d", "efficiency_ratio"],
    dateColumn: "business_date",
    description: "Advanced kitchen profitability engine with weighted shared ingredient allocation (Vegetables, Meat, Eggs, Base Items) across Main Meals, Snacks, etc.",
  },
};

const ALLOWED_AGGS = new Set(["sum", "avg", "count", "min", "max"]);
const ALLOWED_OPS = new Set(["eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike", "in"]);

type Plan = {
  table: string;
  select?: string[];
  filters?: { column: string; op: string; value: any }[];
  date_from?: string;
  date_to?: string;
  group_by?: string;
  aggregate?: { fn: string; column: string };
  order_by?: { column: string; desc?: boolean };
  limit?: number;
  chart?: { type: "bar" | "line" | "pie"; x: string; y: string };
  explanation?: string;
  // New: multi-table composite intent (computed, not LLM-controlled)
  composite?: "profit" | "correlation" | "business_day" | null;
};

// ---------- date range shortcuts (server-side safety net) ----------
function resolveDateShortcut(q: string): { date_from?: string; date_to?: string } {
  const today = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const start = new Date(today);
  const ql = q.toLowerCase();

  const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
  const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

  if (/\btoday\b/.test(ql)) return { date_from: iso(today), date_to: iso(today) };
  if (/\byesterday\b/.test(ql)) { const y = addDays(today, -1); return { date_from: iso(y), date_to: iso(y) }; }
  if (/\blast 7 days|past week|last week\b/.test(ql)) return { date_from: iso(addDays(today, -7)), date_to: iso(today) };
  if (/\blast 30 days|past month|last month\b/.test(ql)) return { date_from: iso(addDays(today, -30)), date_to: iso(today) };
  if (/\bthis month\b/.test(ql)) { const s = new Date(today.getFullYear(), today.getMonth(), 1); return { date_from: iso(s), date_to: iso(today) }; }
  if (/\bthis year|year to date|ytd\b/.test(ql)) { const s = new Date(today.getFullYear(), 0, 1); return { date_from: iso(s), date_to: iso(today) }; }
  return {};
}

function detectComposite(q: string): "profit" | "correlation" | "business_day" | "health" | null {
  const ql = q.toLowerCase();
  if (/\b(business health|health dashboard|category profitability|leakage|waste|audit alerts|withdrawal|audit)\b/.test(ql)) return "health";
  if (/\b(correlation|correlate|relationship between|charging vs (sales|orders|food)|sales vs charging|revenue mix|hook day)\b/.test(ql)) return "correlation";
  if (/\b(commission burden|commission efficiency|business day|business-day|activity date)\b/.test(ql)) return "business_day";
  if (/\b(profit|net income|net earning|bottom line|margin)\b/.test(ql)) return "profit";
  return null;
}

function validatePlan(plan: any): { ok: true; plan: Plan } | { ok: false; error: string } {
  if (!plan || typeof plan !== "object") return { ok: false, error: "plan must be object" };
  const table = String(plan.table || "");
  const spec = SCHEMA[table];
  if (!spec) return { ok: false, error: `table '${table}' not allowed` };
  const cols = new Set(spec.columns);

  const select: string[] = Array.isArray(plan.select)
    ? plan.select.filter((c: any) => typeof c === "string" && cols.has(c))
    : [];

  const filters: Plan["filters"] = [];
  if (Array.isArray(plan.filters)) {
    for (const f of plan.filters) {
      if (!f || !cols.has(f.column) || !ALLOWED_OPS.has(f.op)) continue;
      filters.push({ column: f.column, op: f.op, value: f.value });
    }
  }

  const out: Plan = {
    table,
    select,
    filters,
    explanation: typeof plan.explanation === "string" ? plan.explanation : undefined,
    limit: Math.min(Math.max(parseInt(plan.limit) || 200, 1), 1000),
  };

  if (plan.date_from && /^\d{4}-\d{2}-\d{2}$/.test(plan.date_from)) out.date_from = plan.date_from;
  if (plan.date_to && /^\d{4}-\d{2}-\d{2}$/.test(plan.date_to)) out.date_to = plan.date_to;

  if (plan.group_by && cols.has(plan.group_by)) out.group_by = plan.group_by;
  if (plan.aggregate && ALLOWED_AGGS.has(plan.aggregate.fn) && cols.has(plan.aggregate.column)) {
    out.aggregate = { fn: plan.aggregate.fn, column: plan.aggregate.column };
  }
  if (plan.order_by && cols.has(plan.order_by.column)) {
    out.order_by = { column: plan.order_by.column, desc: !!plan.order_by.desc };
  }
  if (plan.chart && ["bar", "line", "pie"].includes(plan.chart.type)) {
    out.chart = { type: plan.chart.type, x: plan.chart.x, y: plan.chart.y };
  }
  return { ok: true, plan: out };
}

async function sumColumn(supabase: any, table: string, dateFrom?: string, dateTo?: string): Promise<number> {
  const spec = SCHEMA[table];
  if (!spec?.amountColumn) return 0;
  let q = supabase.from(table).select(spec.amountColumn);
  if (dateFrom) q = q.gte(spec.dateColumn, dateFrom);
  if (dateTo) q = q.lte(spec.dateColumn, dateTo);
  q = q.limit(10000);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data || []).reduce((s: number, r: any) => s + Number(r[spec.amountColumn!] || 0), 0);
}

/**
 * Composite multi-table computation (e.g. profit = orders + charging − expenses).
 * Uses safe Supabase query builder calls — no raw SQL.
 */
async function executeComposite(
  supabase: any,
  kind: "profit" | "correlation" | "business_day" | "health",
  dateFrom?: string,
  dateTo?: string,
) {
  if (kind === "health") {
    let q = supabase.from("advanced_business_intelligence").select("*").order("business_date", { ascending: false }).limit(28);
    if (dateFrom) q = q.gte("business_date", dateFrom);
    if (dateTo) q = q.lte("business_date", dateTo);
    const { data: biData, error: biError } = await q;
    if (biError) throw new Error(biError.message);

    let aq = supabase.from("ai_audit_alerts").select("*").order("business_date", { ascending: false }).limit(10);
    if (dateFrom) aq = aq.gte("business_date", dateFrom);
    if (dateTo) aq = aq.lte("business_date", dateTo);
    const { data: alertsData, error: alertsError } = await aq;
    if (alertsError) throw new Error(alertsError.message);

    return {
      rows: biData || [],
      aggregated: (alertsData || []).map(a => ({ metric: "Alert", category: a.category_group, date: a.business_date, desc: a.alert_description })),
    };
  }

  if (kind === "profit") {
    const [orders, charging, expenses] = await Promise.all([
      sumColumn(supabase, "orders", dateFrom, dateTo),
      sumColumn(supabase, "charging_sessions", dateFrom, dateTo),
      sumColumn(supabase, "expenses", dateFrom, dateTo),
    ]);
    const revenue = orders + charging;
    const profit = revenue - expenses;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    return {
      rows: [],
      aggregated: [
        { metric: "Orders revenue", value: orders },
        { metric: "Charging revenue", value: charging },
        { metric: "Total revenue", value: revenue },
        { metric: "Expenses", value: expenses },
        { metric: "Net profit", value: profit },
        { metric: "Margin %", value: Number(margin.toFixed(2)) },
      ],
    };
  }

  if (kind === "correlation" || kind === "business_day") {
    let q = supabase.from("daily_business_performance").select("*").order("business_date", { ascending: true }).limit(365);
    if (dateFrom) q = q.gte("business_date", dateFrom);
    if (dateTo) q = q.lte("business_date", dateTo);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    const rows = (data || []) as any[];

    if (kind === "correlation") {
      // Pearson correlation between orders_revenue and charging_revenue
      const xs = rows.map((r) => Number(r.orders_revenue || 0));
      const ys = rows.map((r) => Number(r.charging_revenue || 0));
      const n = xs.length;
      const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / Math.max(a.length, 1);
      const mx = mean(xs), my = mean(ys);
      let num = 0, dx = 0, dy = 0;
      for (let i = 0; i < n; i++) {
        num += (xs[i] - mx) * (ys[i] - my);
        dx += (xs[i] - mx) ** 2;
        dy += (ys[i] - my) ** 2;
      }
      const r = dx > 0 && dy > 0 ? num / Math.sqrt(dx * dy) : 0;
      return {
        rows,
        aggregated: [
          { metric: "Days analysed", value: n },
          { metric: "Avg restaurant revenue", value: Number(mx.toFixed(2)) },
          { metric: "Avg charging revenue", value: Number(my.toFixed(2)) },
          { metric: "Pearson correlation r", value: Number(r.toFixed(3)) },
          { metric: "Strength", value: Math.abs(r) > 0.7 ? "Strong" : Math.abs(r) > 0.4 ? "Moderate" : "Weak" },
        ],
      };
    }

    // business_day: surface daily KPIs
    return {
      rows,
      aggregated: rows.slice(-14).map((r) => ({
        business_date: r.business_date,
        total_revenue: Number(r.total_revenue || 0),
        commission_burden_pct: Number(r.commission_burden_pct || 0),
        energy_revenue_share_pct: Number(r.energy_revenue_share_pct || 0),
      })),
    };
  }

  return { rows: [], aggregated: [] };
}

async function executePlan(supabase: any, plan: Plan) {
  const spec = SCHEMA[plan.table];
  const selectCols = plan.aggregate || plan.group_by
    ? Array.from(new Set([
        ...(plan.group_by ? [plan.group_by] : []),
        ...(plan.aggregate ? [plan.aggregate.column] : []),
        spec.dateColumn,
      ]))
    : (plan.select && plan.select.length > 0 ? plan.select : spec.columns);

  let q = supabase.from(plan.table).select(selectCols.join(","));

  if (plan.date_from) q = q.gte(spec.dateColumn, plan.date_from);
  if (plan.date_to) q = q.lte(spec.dateColumn, plan.date_to);

  for (const f of plan.filters || []) {
    // @ts-ignore — dynamic op, validated against ALLOWED_OPS
    q = q[f.op](f.column, f.value);
  }
  if (plan.order_by) q = q.order(plan.order_by.column, { ascending: !plan.order_by.desc });
  q = q.limit(plan.limit ?? 200);

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  const rows: any[] = data || [];
  let aggregated: any[] | null = null;

  if (plan.aggregate && plan.group_by) {
    const map = new Map<string, { key: string; values: number[]; count: number }>();
    for (const r of rows) {
      const k = String(r[plan.group_by] ?? "—");
      const v = Number(r[plan.aggregate.column] || 0);
      if (!map.has(k)) map.set(k, { key: k, values: [], count: 0 });
      const e = map.get(k)!;
      e.values.push(v);
      e.count++;
    }
    const fn = plan.aggregate.fn;
    aggregated = Array.from(map.values()).map((e) => ({
      [plan.group_by!]: e.key,
      value:
        fn === "sum" ? e.values.reduce((a, b) => a + b, 0) :
        fn === "avg" ? (e.values.reduce((a, b) => a + b, 0) / Math.max(e.count, 1)) :
        fn === "count" ? e.count :
        fn === "min" ? Math.min(...e.values) :
        fn === "max" ? Math.max(...e.values) : 0,
    })).sort((a, b) => Number(b.value) - Number(a.value));
  } else if (plan.aggregate) {
    const vals = rows.map((r) => Number(r[plan.aggregate!.column] || 0));
    const fn = plan.aggregate.fn;
    const v =
      fn === "sum" ? vals.reduce((a, b) => a + b, 0) :
      fn === "avg" ? (vals.reduce((a, b) => a + b, 0) / Math.max(vals.length, 1)) :
      fn === "count" ? vals.length :
      fn === "min" ? (vals.length ? Math.min(...vals) : 0) :
      fn === "max" ? (vals.length ? Math.max(...vals) : 0) : 0;
    aggregated = [{ metric: `${fn}(${plan.aggregate.column})`, value: v }];
  }

  return { rows, aggregated };
}

/** Light statistical insight layer, computed in TS from returned data. */
function computeInsights(rows: any[], aggregated: any[] | null, plan: Plan): string[] {
  const out: string[] = [];
  const spec = SCHEMA[plan.table];
  const amountCol = plan.aggregate?.column || spec?.amountColumn;

  if (aggregated && aggregated.length > 1) {
    const vals = aggregated.map((a: any) => Number(a.value || 0));
    const top = aggregated[0];
    const total = vals.reduce((a, b) => a + b, 0);
    const topShare = total > 0 ? (Number(top.value) / total) * 100 : 0;
    const groupKey = plan.group_by || "metric";
    if (top && topShare > 0) {
      out.push(`**${top[groupKey]}** leads with **${Number(top.value).toLocaleString()}** (${topShare.toFixed(1)}% of total).`);
    }
  }

  if (amountCol && rows.length >= 3) {
    const vals = rows.map((r) => Number(r[amountCol] || 0)).filter((v) => !Number.isNaN(v));
    if (vals.length >= 3) {
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const std = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length);
      const outliers = vals.filter((v) => std > 0 && Math.abs(v - mean) > 2 * std).length;
      if (outliers > 0) {
        out.push(`Detected **${outliers}** outlier transaction${outliers > 1 ? "s" : ""} (>2σ from mean of ${mean.toFixed(0)}).`);
      }
    }
  }
  return out;
}

function schemaPrompt() {
  const lines: string[] = [];
  for (const [t, s] of Object.entries(SCHEMA)) {
    lines.push(`- ${t} [${s.description}]: ${s.columns.join(", ")} (date: ${s.dateColumn}${s.amountColumn ? ", amount: " + s.amountColumn : ""})`);
  }
  return lines.join("\n");
}

const SYSTEM_PROMPT = `You are the SQL Query Planner for "Nexus Energy Flow" — a dual restaurant + EV charging business.

Tables you can query (ONLY these):
${schemaPrompt()}

Your job: convert the user's natural-language business question into a STRUCTURED JSON PLAN.
Never write raw SQL. Output ONLY a single JSON object matching this shape:

{
  "table": "<one table>",
  "select": ["col1", "col2"],
  "filters": [{"column":"...","op":"eq|neq|gt|gte|lt|lte|like|ilike|in","value": ...}],
  "date_from": "YYYY-MM-DD",
  "date_to":   "YYYY-MM-DD",
  "group_by": "column",
  "aggregate": {"fn": "sum|avg|count|min|max", "column": "col"},
  "order_by": {"column":"col","desc":true},
  "limit": 200,
  "chart": {"type":"bar|line|pie","x":"col_or_group","y":"value"},
  "explanation": "1–2 sentence plain-English description"
}

Rules:
- Use the date column listed for the chosen table.
- Resolve relative dates (today=${new Date().toISOString().slice(0,10)}): "this month", "last 7 days", etc. into concrete YYYY-MM-DD.
- Prefer aggregate+group_by for "by category", "by payment mode", "top N", "breakdown".
- Add a chart hint whenever results are groupable.
- If ambiguous or unrelated to the schema, return: {"clarify":"<clarifying question>"}.
- For profit / net income / margin questions, still choose a sensible primary table (orders); the server will compute the cross-table composite.
- Output JSON ONLY, no markdown.`;

async function callLLM(question: string, history: { role: string; content: string }[]) {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gemini-1.5-flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...history.slice(-6),
        { role: "user", content: question },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (resp.status === 429) throw new Error("Rate limit reached. Please wait a moment and try again.");
  if (resp.status === 402) throw new Error("AI credits exhausted. Add funds in Settings → Workspace → Usage.");
  if (!resp.ok) throw new Error(`AI gateway error ${resp.status}: ${await resp.text()}`);

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content || "{}";
  return JSON.parse(content);
}

async function summarize(
  question: string,
  plan: Plan | null,
  result: { rows: any[]; aggregated: any[] | null },
  insights: string[],
  composite: string | null,
) {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  const sample = result.aggregated ?? result.rows.slice(0, 20);
  const ctx = composite
    ? `Composite computation: ${composite}. The aggregated array contains the breakdown.`
    : `Plan: ${JSON.stringify(plan)}`;
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gemini-1.5-flash",
      messages: [
        { role: "system", content: "You are an experienced Nepali restaurant owner (Sahuji). Amounts are in NRs. Speak practically and focus on real profit, waste, and 'mero business' strategy. Avoid tech talk. Summarize data in 3-5 sentences, give 1 blunt piece of advice. End with 'Try next:' bullet list." },
        { role: "user", content: `Question: ${question}\n${ctx}\nPre-computed insights: ${insights.join(" | ") || "none"}\nResult sample: ${JSON.stringify(sample)}\nTotal rows: ${result.rows.length}` },
      ],
    }),
  });
  if (!resp.ok) return "Here is the data you requested.";
  const d = await resp.json();
  return d.choices?.[0]?.message?.content || "Here is the data you requested.";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const start = Date.now();
  let userId = "";
  let question = "";
  let plan: Plan | null = null;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: authErr } = await userClient.auth.getUser();
    if (authErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    userId = userData.user.id;

    const body = await req.json();
    question = String(body.question || "").slice(0, 2000);
    const history = Array.isArray(body.history) ? body.history : [];
    if (!question.trim()) {
      return new Response(JSON.stringify({ error: "Question required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Detect composite intent early (profit etc.)
    const composite = detectComposite(question);
    const shortcut = resolveDateShortcut(question);

    const raw = await callLLM(question, history);
    if (raw && raw.clarify && !composite) {
      return new Response(JSON.stringify({ clarify: raw.clarify }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result: { rows: any[]; aggregated: any[] | null };
    let chart: Plan["chart"] | null = null;
    let explanation = "";

    if (composite === "profit" || composite === "correlation" || composite === "business_day" || composite === "health") {
      const df = shortcut.date_from || raw?.date_from;
      const dt = shortcut.date_to || raw?.date_to;
      result = await executeComposite(userClient, composite, df, dt);
      if (composite === "correlation") {
        chart = { type: "line", x: "business_date", y: "total_revenue" };
        explanation = `Correlation between Restaurant and Charging revenue per business date${df ? ` (${df} → ${dt || "today"})` : ""}.`;
      } else if (composite === "business_day") {
        chart = { type: "bar", x: "business_date", y: "total_revenue" };
        explanation = `Business-day KPIs (Activity Date) including commission burden and energy share.`;
      } else if (composite === "health") {
        chart = { type: "line", x: "business_date", y: "gross_margin_pct_7d" };
        explanation = `Business Health analysis including category margins and AI audit alerts.`;
      } else {
        chart = { type: "bar", x: "metric", y: "value" };
        explanation = `Profit = Orders revenue + Charging revenue − Expenses${df ? ` (from ${df} to ${dt || "today"})` : ""}.`;
      }
      plan = {
        table: composite === "health" ? "advanced_business_intelligence" : (composite === "profit" ? "orders" : "charging_sessions"),
        composite,
        date_from: df,
        date_to: dt,
        chart,
        explanation,
      };
    } else {
      const v = validatePlan(raw);
      if (!v.ok) throw new Error("Plan validation failed: " + v.error);
      plan = v.plan;
      // Merge server-side date shortcut if LLM missed it
      if (!plan.date_from && shortcut.date_from) plan.date_from = shortcut.date_from;
      if (!plan.date_to && shortcut.date_to) plan.date_to = shortcut.date_to;
      result = await executePlan(userClient, plan);
      chart = plan.chart || null;
    }

    const insights = computeInsights(result.rows, result.aggregated, plan);

    // Graceful empty-data message
    const hasData = (result.aggregated && result.aggregated.length > 0) || result.rows.length > 0;
    const answer = hasData
      ? await summarize(question, plan, result, insights, composite)
      : "I couldn't find any matching records for that question. Try widening the date range or rephrasing.";

    // Audit
    try {
      const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      await adminClient.from("ai_audit_log").insert({
        user_id: userId,
        question,
        plan,
        target_table: plan?.table ?? null,
        row_count: result.rows.length,
        latency_ms: Date.now() - start,
        success: true,
      });
    } catch (_) {}

    return new Response(
      JSON.stringify({
        answer,
        plan,
        rows: result.rows.slice(0, 200),
        aggregated: result.aggregated,
        chart,
        insights,
        composite,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("nl-query-engine error:", err);
    try {
      const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      await adminClient.from("ai_audit_log").insert({
        user_id: userId || "00000000-0000-0000-0000-000000000000",
        question,
        plan,
        target_table: plan?.table ?? null,
        success: false,
        error_message: String(err?.message || err),
        latency_ms: Date.now() - start,
      });
    } catch (_) {}
    return new Response(JSON.stringify({ error: err?.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
