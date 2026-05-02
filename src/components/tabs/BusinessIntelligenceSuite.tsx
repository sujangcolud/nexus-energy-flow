import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ComposedChart,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  Flame,
  Sparkles,
  TrendingUp,
  Wallet,
  Zap,
  Utensils,
  Lightbulb,
  AlertCircle,
} from "lucide-react";
import { format, parseISO, subDays, isWithinInterval } from "date-fns";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatCurrency } from "@/utils/unifiedCalculations";
import {
  balanceIntegrity,
  businessRange,
  commissionBurdenByDow,
  detectHookDays,
  entryRange,
  fetchBusinessPerformance,
  type BusinessPerformanceRow,
  type DateMode,
} from "@/services/DateAlignmentService";
import { supabase } from "@/integrations/supabase/client";

const fmt = (n: number) => formatCurrency(Number(n) || 0);

const Kpi = ({
  label,
  value,
  hint,
  icon: Icon,
  color = "text-foreground",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ElementType;
  color?: string;
}) => (
  <Card className="border border-border">
    <CardContent className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
          <p className={`text-2xl font-semibold mt-1 truncate ${color}`}>{value}</p>
          {hint && <p className="text-xs mt-1 text-muted-foreground">{hint}</p>}
        </div>
        <div className="p-2 rounded-md bg-muted text-foreground">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const BusinessIntelligenceSuite = () => {
  const [mode, setMode] = useState<DateMode>("activity");
  const [days, setDays] = useState<number>(30);

  const range = useMemo(
    () => (mode === "activity" ? businessRange(days) : entryRange(days)),
    [mode, days],
  );

  const { data: rows = [], isLoading, refetch } = useQuery({
    queryKey: ["bi-suite", mode, days, range.from, range.to],
    queryFn: () => fetchBusinessPerformance(range.from, range.to),
    staleTime: 60_000,
  });

  // Fetch Advanced BI and Alerts
  const { data: advBi = [] } = useQuery({
    queryKey: ["advanced-bi", range.from, range.to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('advanced_business_intelligence')
        .select('*')
        .gte('business_date', range.from)
        .lte('business_date', range.to)
        .order('business_date', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ["bi-alerts", range.from, range.to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_audit_alerts')
        .select('*')
        .gte('business_date', range.from)
        .lte('business_date', range.to);
      if (error) throw error;
      return data;
    },
  });

  // ---------- Advanced Aggregation ----------
  const aggregatedAdvData = useMemo(() => {
    const map = new Map<string, any>();
    advBi.forEach(row => {
      const date = row.business_date;
      if (!map.has(date)) {
        map.set(date, {
          date: format(parseISO(date), 'MMM dd'),
          fullDate: date,
          food_revenue: row.orders_revenue || 0,
          charging_revenue: row.charging_revenue || 0,
          conversion: row.charging_to_food_conversion || 0,
          commission_total: row.commission_total || 0,
          revenue_per_commission: row.revenue_per_commission_rupee || 0,
          withdrawals: row.withdrawals_total || 0,
          expenses: row.expenses_total || 0,
          categories: {}
        });
      }
      const entry = map.get(date);
      if (row.category_group !== 'Unmapped') {
        entry.categories[row.category_group] = {
          margin: row.gross_margin_pct_7d
        };
      }
    });
    return Array.from(map.values());
  }, [advBi]);

  const latestStats = aggregatedAdvData.length > 0 ? aggregatedAdvData[aggregatedAdvData.length - 1] : null;

  // ---------- Legacy BI KPIs & Logic ----------
  const totals = useMemo(() => {
    const sum = (k: keyof BusinessPerformanceRow) =>
      rows.reduce((s, r) => s + (Number(r[k]) || 0), 0);
    const orders = sum("orders_revenue");
    const charging = sum("charging_revenue");
    const total = orders + charging;
    const expenses = sum("expenses_total");
    const commission = sum("commission_total");
    return {
      orders,
      charging,
      total,
      expenses,
      commission,
      energyShare: total > 0 ? (charging / total) * 100 : 0,
      commissionBurden: total > 0 ? (commission / total) * 100 : 0,
    };
  }, [rows]);

  const hookDays = useMemo(() => detectHookDays(rows), [rows]);
  const burdenByDow = useMemo(() => commissionBurdenByDow(rows), [rows]);
  const flags = useMemo(() => balanceIntegrity(rows), [rows]);
  const anomalies = flags.filter((f) => f.status === "anomaly");

  // ---------- Trend Advice ----------
  const trendAdvice = useMemo(() => {
    const advice: string[] = [];
    if (advBi.length >= 14) {
        const today = new Date();
        const last7DaysInterval = { start: subDays(today, 7), end: today };
        const prev7DaysInterval = { start: subDays(today, 14), end: subDays(today, 7) };

        ['Chicken', 'Mutton', 'Fish', 'Food (Veg/General)'].forEach(cat => {
          const currentWeekData = advBi.filter(d => d.category_group === cat && isWithinInterval(parseISO(d.business_date), last7DaysInterval));
          const prevWeekData = advBi.filter(d => d.category_group === cat && isWithinInterval(parseISO(d.business_date), prev7DaysInterval));
          const currentCost = currentWeekData.reduce((sum, d) => sum + (d.daily_cost || 0), 0);
          const prevCost = prevWeekData.reduce((sum, d) => sum + (d.daily_cost || 0), 0);
          const currentSales = currentWeekData.reduce((sum, d) => sum + (d.daily_sales || 0), 0);
          const prevSales = prevWeekData.reduce((sum, d) => sum + (d.daily_sales || 0), 0);

          if (prevCost > 0) {
            const costIncrease = ((currentCost - prevCost) / prevCost) * 100;
            const salesStable = prevSales > 0 ? Math.abs((currentSales - prevSales) / prevSales) < 0.05 : true;
            if (costIncrease > 10 && salesStable) {
              advice.push(`${cat} costs are up ${costIncrease.toFixed(0)}% this week. Sahuji's advice: portion control milauchhu ki price badhauchu, socha!`);
            }
          }

          const latest = currentWeekData.slice(-1)[0];
          if (latest && latest.gross_margin_pct_7d < 20) {
              advice.push(`${cat} real margin ekdam low chha (${latest.gross_margin_pct_7d}%). Check for waste.`);
          }
        });
    }

    // Legacy logic
    if (hookDays.length > 0) {
        const days = hookDays.map((h) => format(new Date(h.business_date), "EEE")).slice(0, 3).join(", ");
        advice.push(`Charging acted as a "hook" on ${hookDays.length} day(s) (e.g. ${days}). Staff up kitchen on peak charging days.`);
    }
    const peakCharge = rows.filter((r) => r.charging_revenue >= 5000);
    if (peakCharge.length > 0) {
        const avgFoodPeak = peakCharge.reduce((s, r) => s + r.orders_revenue, 0) / peakCharge.length;
        const avgFoodAll = rows.length ? rows.reduce((s, r) => s + r.orders_revenue, 0) / rows.length : 0;
        const lift = avgFoodAll > 0 ? ((avgFoodPeak - avgFoodAll) / avgFoodAll) * 100 : 0;
        if (lift > 5) {
            advice.push(`When Charging exceeds Rs. 5,000, Restaurant sales lift by ~${lift.toFixed(0)}%.`);
        }
    }
    if (burdenByDow.length > 0) {
        const worst = burdenByDow[0];
        if (worst.avg_burden_pct > 0) {
            advice.push(`Commission efficiency is lowest on ${worst.day} (avg ${worst.avg_burden_pct.toFixed(1)}%).`);
        }
    }

    return advice;
  }, [advBi, hookDays, rows, burdenByDow]);

  const mixData = rows.map((r) => ({
    date: format(new Date(r.business_date), "MMM d"),
    "Energy %": r.energy_revenue_share_pct,
    "Commission %": r.commission_burden_pct,
  }));

  const compareData = rows.map((r) => ({
    date: format(new Date(r.business_date), "MMM d"),
    Restaurant: r.orders_revenue,
    Charging: r.charging_revenue,
    Commission: r.commission_total,
    Expenses: r.expenses_total,
  }));

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Mero Business Intelligence Suite
          </h1>
          <p className="text-sm text-muted-foreground">
            Weighted cost allocation, REAL margins, and Sahuji Audit.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border bg-card">
            <Label htmlFor="mode-toggle" className="text-xs text-muted-foreground">Activity Date</Label>
            <Switch id="mode-toggle" checked={mode === "entry"} onCheckedChange={(v) => setMode(v ? "entry" : "activity")} />
            <Label htmlFor="mode-toggle" className="text-xs text-muted-foreground">Entry Date</Label>
          </div>
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>Refresh</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {['Chicken', 'Mutton', 'Fish', 'Food (Veg/General)', 'Beverages'].map(cat => {
          const margin = advBi.filter(d => d.category_group === cat).slice(-1)[0]?.gross_margin_pct_7d || 0;
          return (
            <Kpi
              key={cat}
              label={`${cat} REAL Margin`}
              value={`${margin}%`}
              icon={Utensils}
              color={margin > 35 ? "text-emerald-600" : margin > 20 ? "text-amber-600" : "text-destructive"}
            />
          );
        })}
        <Kpi label="Energy Share" value={`${totals.energyShare.toFixed(1)}%`} icon={Flame} color="text-blue-600" />
      </div>

      <Card className="border border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Daily Revenue & Cost Comparison</CardTitle>
          <CardDescription>Side-by-side per business date — Restaurant, Charging, Commission, Total Expenses.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={compareData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} formatter={(v: number) => fmt(v)} />
              <Legend />
              <Bar dataKey="Restaurant" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Charging" fill="hsl(var(--chart-2, var(--primary)))" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Commission" fill="hsl(var(--destructive))" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Expenses" fill="hsl(var(--muted-foreground))" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-4 h-4" /> Energy vs. Food Correlation
            </CardTitle>
            <CardDescription>Dual-axis trend: Food revenue (bars) & Conversion (line)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={aggregatedAdvData.slice(-14)}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} domain={[0, 'auto']} />
                <Tooltip formatter={(v: any) => typeof v === 'number' ? v.toLocaleString() : v} />
                <Legend />
                <Bar yAxisId="left" dataKey="food_revenue" fill="hsl(var(--primary))" name="Food Revenue" stackId="a" />
                <Bar yAxisId="left" dataKey="charging_revenue" fill="hsl(var(--chart-2))" name="Charging Revenue" stackId="a" />
                <Line yAxisId="right" type="monotone" dataKey="conversion" stroke="#ff7300" name="Ratio" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-red-600">
              <AlertCircle className="w-4 h-4" /> AI Auditor & Anomaly Log
            </CardTitle>
            <CardDescription>Leakage streaks (by item) and withdrawal mismatches</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[260px]">
              {alerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50">
                  <Activity className="w-8 h-8 mb-2" />
                  <p className="text-xs">No active anomalies</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map((alert, i) => (
                    <div key={i} className="p-3 rounded-lg bg-muted/50 border border-border text-xs">
                      <div className="flex justify-between items-start mb-1">
                        <Badge variant={alert.alert_type.includes('Alert') ? 'destructive' : 'secondary'} className="text-[10px]">
                          {alert.alert_type}
                        </Badge>
                        <span className="text-muted-foreground">{alert.business_date}</span>
                      </div>
                      <p className="font-medium text-foreground">
                        {alert.alert_type.includes('Leakage') ? alert.category_items : alert.category_group}: {alert.alert_description}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Daily Revenue Mix & Commission Burden</CardTitle>
            <CardDescription>Energy share of revenue vs commissions paid (%).</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={mixData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} formatter={(v: number) => `${Number(v).toFixed(1)}%`} />
                <Legend />
                <Line type="monotone" dataKey="Energy %" stroke="hsl(var(--primary))" dot={false} />
                <Line type="monotone" dataKey="Commission %" stroke="hsl(var(--destructive))" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Commission Burden by Day of Week</CardTitle>
            <CardDescription>Average commission % of revenue, ranked.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={burdenByDow}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} formatter={(v: number) => `${Number(v).toFixed(2)}%`} />
                <Bar dataKey="avg_burden_pct" fill="hsl(var(--destructive))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500" /> Strategic Business Advice
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
                <div className="space-y-4">
                {trendAdvice.map((a, i) => (
                    <div key={i} className="flex gap-2 text-sm items-start">
                    <TrendingUp className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    <p>{a}</p>
                    </div>
                ))}
                </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="w-4 h-4" /> Withdrawal vs. Expense Audit
            </CardTitle>
            <CardDescription>Daily verification of cash withdrawals against recorded spending</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={aggregatedAdvData.slice(-7)}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => v.toLocaleString()} />
                <Legend />
                <Bar dataKey="withdrawals" fill="hsl(var(--destructive))" name="Withdrawals" />
                <Bar dataKey="expenses" fill="hsl(var(--emerald-500))" name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" /> Next-Day Balance Integrity
          </CardTitle>
          <CardDescription>
            Validates closing balance of Date X against opening of Date X+1.
            {anomalies.length > 0 ? (
              <span className="ml-2 text-destructive font-medium">{anomalies.length} anomaly flagged</span>
            ) : (
              <span className="ml-2 text-emerald-600 font-medium">All clean</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-48">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground border-b">
                <tr>
                  <th className="py-2">Date</th>
                  <th className="py-2 text-right">Net change</th>
                  <th className="py-2 text-right">Δ vs prev</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {flags.map((f) => (
                  <tr key={f.business_date} className="border-b last:border-0 text-xs">
                    <td className="py-2">{f.business_date}</td>
                    <td className="py-2 text-right">{fmt(f.net_change)}</td>
                    <td className="py-2 text-right">{fmt(f.delta_vs_prev)}</td>
                    <td><Badge variant={f.status === "ok" ? "secondary" : "destructive"}>{f.status.toUpperCase()}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default BusinessIntelligenceSuite;
