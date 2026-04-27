// Proactive insights: anomalies + forecast + alert thresholds.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const [{ data: anomalies }, { data: forecast }, { data: alerts }] = await Promise.all([
      supabase.rpc("nexus_anomalies", { days_back: 30 }),
      supabase.rpc("nexus_forecast", { days_back: 60, days_ahead: 30 }),
      supabase.rpc("nexus_alert_thresholds", {}),
    ]);

    const insights: { type: string; severity: "info" | "warn" | "critical"; message: string }[] = [];

    for (const a of (alerts || [])) {
      if (a.breached) {
        insights.push({
          type: "balance",
          severity: "warn",
          message: `${a.account} balance is NRs. ${Number(a.current_balance).toLocaleString()} — below threshold of NRs. ${Number(a.threshold).toLocaleString()}.`,
        });
      }
    }
    if ((anomalies || []).length > 0) {
      insights.push({
        type: "anomaly",
        severity: "info",
        message: `${anomalies!.length} unusual transaction(s) detected in the last 30 days (>2σ from mean).`,
      });
    }
    if (forecast && forecast.length > 0) {
      const future = forecast.filter((r: any) => r.is_forecast);
      const projectedNet = future.reduce((s: number, r: any) => s + Number(r.net || 0), 0);
      insights.push({
        type: "forecast",
        severity: projectedNet < 0 ? "critical" : "info",
        message: `Projected net cashflow over next 30 days: NRs. ${projectedNet.toLocaleString(undefined, { maximumFractionDigits: 0 })}.`,
      });
    }

    return new Response(JSON.stringify({ insights, anomalies: anomalies || [], forecast: forecast || [], alerts: alerts || [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
