// Nexus Energy Flow — NL→Structured Plan→Safe Query engine.
// Uses Lovable AI Gateway. Whitelist-only table/column access. Audit logged.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// =============== SEMANTIC LAYER (whitelist) ===============
// Only these tables / columns are queryable through the AI.
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
};

const ALLOWED_AGGS = new Set(["sum", "avg", "count", "min", "max"]);
const ALLOWED_OPS = new Set(["eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike", "in"]);

type Plan = {
  table: string;
  select?: string[];          // columns to return
  filters?: { column: string; op: string; value: any }[];
  date_from?: string;         // ISO date
  date_to?: string;
  group_by?: string;          // single column
  aggregate?: { fn: string; column: string }; // sum(total)
  order_by?: { column: string; desc?: boolean };
  limit?: number;
  chart?: { type: "bar" | "line" | "pie"; x: string; y: string };
  explanation?: string;
};

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

async function executePlan(supabase: any, plan: Plan) {
  const spec = SCHEMA[plan.table];
  // If aggregation+group_by, fetch raw rows then aggregate in JS (safe path, bounded).
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
    // @ts-ignore — dynamic op
    q = q[f.op](f.column, f.value);
  }
  if (plan.order_by) q = q.order(plan.order_by.column, { ascending: !plan.order_by.desc });
  q = q.limit(plan.limit ?? 200);

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  let rows: any[] = data || [];
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
      fn === "min" ? Math.min(...vals) :
      fn === "max" ? Math.max(...vals) : 0;
    aggregated = [{ metric: `${fn}(${plan.aggregate.column})`, value: v }];
  }

  return { rows, aggregated };
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
  "select": ["col1", "col2"],            // optional, omit for aggregates
  "filters": [{"column":"...","op":"eq|neq|gt|gte|lt|lte|like|ilike|in","value": ...}],
  "date_from": "YYYY-MM-DD",            // optional
  "date_to":   "YYYY-MM-DD",            // optional
  "group_by": "column",                 // optional
  "aggregate": {"fn": "sum|avg|count|min|max", "column": "col"}, // optional
  "order_by": {"column":"col","desc":true},
  "limit": 200,
  "chart": {"type":"bar|line|pie","x":"col_or_group","y":"value"},
  "explanation": "1–2 sentence plain-English description of what we are computing"
}

Rules:
- Use the date column listed for the chosen table.
- If user says "this month", "last 7 days", etc., compute concrete YYYY-MM-DD using today=${new Date().toISOString().slice(0,10)}.
- Prefer aggregate+group_by when user asks "by category", "by payment mode", "top N".
- Always include a chart hint when the result is groupable.
- If the question is ambiguous or unrelated, return: {"clarify":"<your clarifying question>"}.
- Output JSON ONLY, no markdown.`;

async function callLLM(question: string, history: { role: string; content: string }[]) {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
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

async function summarize(question: string, plan: Plan, result: { rows: any[]; aggregated: any[] | null }) {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  const sample = result.aggregated ?? result.rows.slice(0, 20);
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "You are a concise business analyst. Summarize the data in 3–6 sentences with concrete numbers, then add 1–2 actionable insights. Use markdown. End with a short 'Try next:' bullet list of 2 follow-up questions." },
        { role: "user", content: `Question: ${question}\nPlan: ${JSON.stringify(plan)}\nResult sample (first rows): ${JSON.stringify(sample)}\nTotal rows: ${result.rows.length}` },
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
    const { data: claims, error: authErr } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (authErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    userId = claims.claims.sub;

    const body = await req.json();
    question = String(body.question || "").slice(0, 2000);
    const history = Array.isArray(body.history) ? body.history : [];
    if (!question.trim()) {
      return new Response(JSON.stringify({ error: "Question required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const raw = await callLLM(question, history);
    if (raw && raw.clarify) {
      return new Response(JSON.stringify({ clarify: raw.clarify }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const v = validatePlan(raw);
    if (!v.ok) throw new Error("Plan validation failed: " + v.error);
    plan = v.plan;

    // RLS-respecting execution: use the user's auth context, not service role.
    const result = await executePlan(userClient, plan);
    const answer = await summarize(question, plan, result);

    // Audit
    const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await adminClient.from("ai_audit_log").insert({
      user_id: userId,
      question,
      plan,
      target_table: plan.table,
      row_count: result.rows.length,
      latency_ms: Date.now() - start,
      success: true,
    });

    return new Response(
      JSON.stringify({
        answer,
        plan,
        rows: result.rows.slice(0, 200),
        aggregated: result.aggregated,
        chart: plan.chart || null,
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
