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

  const { data: categoryUsage = [] } = useQuery({
    queryKey: ["category-usage", range.from, range.to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('category_usage_analysis')
        .select('*')
        .gte('business_date', range.from)
        .lte('business_date', range.to);
      if (error) throw error;
      return data;
    },
  });

  const { data: kitchenIntel = [] } = useQuery({
    queryKey: ["kitchen-intelligence", range.from, range.to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nepali_kitchen_intelligence')
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

  const usageTotals = useMemo(() => {
    const categories = [
      'Beverages', 'Commission', 'Electricity Restaurant', 'Fuel/Travel',
      'Junk Food', 'Meat', 'Others', 'Grocery/Base',
      'Recharge', 'Vegetables'
    ];

    const map = new Map<string, any>();
    categories.forEach(cat => map.set(cat, { category: cat, income: 0, expense: 0 }));

    categoryUsage.forEach(row => {
      if (map.has(row.category)) {
        const entry = map.get(row.category);
        entry.income += (row.total_income || 0);
        entry.expense += (row.total_expense || 0);
      }
    });

    return Array.from(map.values()).map(e => ({
      ...e,
      net: e.income - e.expense,
      margin: e.income > 0 ? ((e.income - e.expense) / e.income) * 100 : (e.expense > 0 ? -100 : 0)
    }));
  }, [categoryUsage]);

  const kitchenMetrics = useMemo(() => {
    const map = new Map<string, any>();
    kitchenIntel.forEach(row => {
      if (!map.has(row.category)) {
        map.set(row.category, { category: row.category, expense: 0, sales: 0, count: 0, lastMargin: 0, lastEfficiency: 0 });
      }
      const entry = map.get(row.category);
      entry.expense += (row.daily_expense || 0);
      entry.sales += (row.daily_sales || 0);
      entry.count++;
      // We take the latest rolling metrics for margin and efficiency
      entry.lastMargin = row.gross_margin_pct_7d;
      entry.lastEfficiency = row.efficiency_ratio;
    });
    return Array.from(map.values()).map(e => ({
      ...e,
      avgMargin: e.sales > 0 ? ((e.sales - e.expense) / e.sales) * 100 : (e.expense > 0 ? -100 : 0),
      status: e.lastMargin < 15 ? 'Critical' : e.lastMargin < 30 ? 'Warning' : 'Healthy'
    }));
  }, [kitchenIntel]);

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

  // ---------- Sahuji Intelligence (Insights & Recommendations) ----------
  const sahujiIntel = useMemo(() => {
    const insights: string[] = [];
    const recommendations: string[] = [];

    // Kitchen Specifics
    kitchenMetrics.forEach(m => {
        if (m.status === 'Critical') {
            insights.push(`${m.category} category ma loss hune darr chha, margin matra ${m.lastMargin.toFixed(1)}% chha.`);
            recommendations.push(`${m.category} ko portion control milau ki menu ma price thorei badhau.`);
        } else if (m.status === 'Warning') {
            insights.push(`${m.category} ko profitability stable chhaina, dhyan dinu parla.`);
        }

        if (m.lastEfficiency < 1.3 && m.sales > 0) {
            insights.push(`${m.category} ma Rs 1 kharchha garda Rs ${m.lastEfficiency} matra kamaichha. Efficiency low chha.`);
            recommendations.push(`${m.category} item haru kitchen ma dherai waste bhairako huna sakchha, check gara.`);
        }
    });

    // General Business
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
              insights.push(`${cat} costs are up ${costIncrease.toFixed(0)}% this week. Sahuji, portion control milauchhu ki price badhauchu, socha!`);
            }
          }

          const latest = currentWeekData.slice(-1)[0];
          if (latest && latest.gross_margin_pct_7d < 20) {
              insights.push(`${cat} real margin ekdam low chha (${latest.gross_margin_pct_7d}%). Check for waste.`);
          }
        });
    }

    // Legacy logic
    if (hookDays.length > 0) {
        const days = hookDays.map((h) => format(new Date(h.business_date), "EEE")).slice(0, 3).join(", ");
        recommendations.push(`Charging acted as a "hook" on ${hookDays.length} day(s) (e.g. ${days}). Staff up kitchen on peak charging days.`);
    }
    const peakCharge = rows.filter((r) => r.charging_revenue >= 5000);
    if (peakCharge.length > 0) {
        const avgFoodPeak = peakCharge.reduce((s, r) => s + r.orders_revenue, 0) / peakCharge.length;
        const avgFoodAll = rows.length ? rows.reduce((s, r) => s + r.orders_revenue, 0) / rows.length : 0;
        const lift = avgFoodAll > 0 ? ((avgFoodPeak - avgFoodAll) / avgFoodAll) * 100 : 0;
        if (lift > 5) {
            insights.push(`When Charging exceeds Rs. 5,000, Restaurant sales lift by ~${lift.toFixed(0)}%.`);
        }
    }
    if (burdenByDow.length > 0) {
        const worst = burdenByDow[0];
        if (worst.avg_burden_pct > 0) {
            insights.push(`Commission efficiency is lowest on ${worst.day} (avg ${worst.avg_burden_pct.toFixed(1)}%).`);
        }
    }

    return { insights, recommendations };
  }, [advBi, kitchenMetrics, hookDays, rows, burdenByDow]);

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

      <Card className="border border-border bg-slate-50/50 overflow-hidden shadow-sm">
        <CardHeader className="pb-3 border-b bg-card">
          <CardTitle className="text-base flex items-center gap-2 text-primary font-bold">
            <Utensils className="h-4 w-4" /> Mero Category Profitability (Sales Income vs. Usage Expenses)
          </CardTitle>
          <CardDescription>Direct comparison of 10 critical usage categories including overheads like commission and fuel.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative w-full overflow-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground font-medium border-b">
                <tr>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-right">Income (Sales)</th>
                  <th className="px-4 py-3 text-right">Expense (Usage)</th>
                  <th className="px-4 py-3 text-right">Net Rs.</th>
                  <th className="px-4 py-3 text-right">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {usageTotals.map((row) => (
                  <tr key={row.category} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-semibold text-foreground">{row.category}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{fmt(row.income)}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{fmt(row.expense)}</td>
                    <td className={`px-4 py-3 text-right font-bold ${row.net < 0 ? "text-destructive" : "text-emerald-600"}`}>
                      {fmt(row.net)}
                    </td>
                    <td className={`px-4 py-3 text-right font-bold ${row.margin < 0 ? "text-destructive" : "text-emerald-600"}`}>
                      {row.margin.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border lg:col-span-2 bg-slate-50/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 text-primary">
            <Utensils className="h-4 w-4" /> Real Kitchen Profitability (Shared Ingredient Allocation)
          </CardTitle>
          <CardDescription>Matrices applied: Vegetables (40% meals, 35% snacks), Rice/Oil (60% meals, 25% snacks), etc.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative w-full overflow-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted text-muted-foreground font-medium sticky top-0">
                <tr>
                  <th className="p-2">Category</th>
                  <th className="p-2 text-right">Expense (Allocated)</th>
                  <th className="p-2 text-right">Sales</th>
                  <th className="p-2 text-right">Real Margin %</th>
                  <th className="p-2 text-right">Efficiency (S/E)</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {kitchenMetrics.map((row) => (
                  <tr key={row.category} className="hover:bg-muted/30">
                    <td className="p-2 font-semibold">{row.category}</td>
                    <td className="p-2 text-right">{fmt(row.expense)}</td>
                    <td className="p-2 text-right">{fmt(row.sales)}</td>
                    <td className={`p-2 text-right font-bold ${row.lastMargin < 20 ? "text-destructive" : "text-emerald-600"}`}>
                      {row.lastMargin.toFixed(1)}%
                    </td>
                    <td className="p-2 text-right font-medium">{row.lastEfficiency}x</td>
                    <td className="p-2">
                      <Badge variant={row.status === 'Healthy' ? 'secondary' : row.status === 'Warning' ? 'outline' : 'destructive'} className="text-[10px]">
                        {row.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>


      <Card className="border border-border bg-slate-50/50 overflow-hidden shadow-sm">
        <CardHeader className="pb-3 border-b bg-card">
          <CardTitle className="text-base flex items-center gap-2 text-primary font-bold">
            <Activity className="h-4 w-4" /> Daily Traffic & Revenue Analytics (Day-Wise Flow)
          </CardTitle>
          <CardDescription>Day-by-day breakdown of vehicle traffic, charging income, and restaurant performance.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative w-full overflow-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground font-medium border-b">
                <tr>
                  <th className="px-4 py-3">Business Date</th>
                  <th className="px-4 py-3 text-right">Vehicles (Sessions)</th>
                  <th className="px-4 py-3 text-right">Charging Income</th>
                  <th className="px-4 py-3 text-right">Order Count</th>
                  <th className="px-4 py-3 text-right">Restaurant Income</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground italic">
                      No traffic data found for this range.
                    </td>
                  </tr>
                ) : (
                  [...rows].reverse().map((row) => (
                    <tr key={row.business_date} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-[11px] font-medium text-foreground">
                        {format(parseISO(row.business_date), "EEE, MMM dd")}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground font-semibold">
                        {row.charging_count}
                      </td>
                      <td className="px-4 py-3 text-right text-blue-600 font-bold">
                        {fmt(row.charging_revenue)}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground font-semibold">
                        {row.orders_count}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-600 font-bold">
                        {fmt(row.orders_revenue)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

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

        <Card className="border border-border lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-red-600">
              <AlertCircle className="w-4 h-4" /> Comprehensive AI Auditor & Anomaly Log
            </CardTitle>
            <CardDescription>Detailed list of detected losses (3-day streaks) and weekly cash flow audits.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[350px]">
              {alerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground opacity-50">
                  <Activity className="w-8 h-8 mb-2" />
                  <p className="text-xs">No active anomalies detected in this range.</p>
                </div>
              ) : (
                <div className="relative w-full overflow-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted text-muted-foreground font-medium sticky top-0">
                      <tr>
                        <th className="p-2">Date</th>
                        <th className="p-2">Category</th>
                        <th className="p-2 text-right">Purchased</th>
                        <th className="p-2 text-right">Sales</th>
                        <th className="p-2 text-right">Margin/Loss</th>
                        <th className="p-2">Type / Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {alerts.map((alert, i) => (
                        <tr key={i} className="hover:bg-muted/30 align-top">
                          <td className="p-2 whitespace-nowrap font-mono text-[10px]">
                            {format(parseISO(alert.business_date), 'MMM dd')}
                          </td>
                          <td className="p-2">
                            <div className="font-semibold text-foreground">{alert.category_group}</div>
                            <div className="text-[9px] text-muted-foreground uppercase tracking-tighter">
                              {alert.category_items !== alert.category_group ? alert.category_items : ''}
                            </div>
                          </td>
                          <td className="p-2 text-right font-medium">{fmt(alert.daily_cost)}</td>
                          <td className="p-2 text-right font-medium">{fmt(alert.daily_sales)}</td>
                          <td className="p-2 text-right">
                            <Badge variant={alert.margin < 0 ? "destructive" : "outline"} className="text-[10px] px-1 h-5">
                              {alert.margin.toFixed(1)}%
                            </Badge>
                          </td>
                          <td className="p-2">
                            <div className="flex flex-col gap-1">
                              <Badge
                                variant={alert.alert_type.includes('Leakage') ? 'destructive' : 'secondary'}
                                className="text-[9px] w-fit font-bold uppercase"
                              >
                                {alert.alert_type}
                              </Badge>
                              <p className="text-[11px] leading-snug text-muted-foreground">
                                {alert.alert_description}
                              </p>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
            <CardTitle className="text-base flex items-center gap-2 text-blue-600">
              <Lightbulb className="w-4 h-4" /> Sahuji Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[180px]">
                <div className="space-y-3">
                {sahujiIntel.insights.length > 0 ? sahujiIntel.insights.map((a, i) => (
                    <div key={i} className="flex gap-2 text-sm items-start p-2 rounded bg-blue-50/50">
                      <Activity className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                      <p>{a}</p>
                    </div>
                )) : <p className="text-sm text-muted-foreground italic">No major insights today, Sahuji.</p>}
                </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-amber-600">
              <Sparkles className="w-4 h-4" /> Sahuji Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[180px]">
                <div className="space-y-3">
                {sahujiIntel.recommendations.length > 0 ? sahujiIntel.recommendations.map((a, i) => (
                    <div key={i} className="flex gap-2 text-sm items-start p-2 rounded bg-amber-50/50">
                      <TrendingUp className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <p className="font-medium">{a}</p>
                    </div>
                )) : <p className="text-sm text-muted-foreground italic">Everything looks good, keep it up!</p>}
                </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="w-4 h-4" /> Weekly Withdrawal vs. Expense Audit
            </CardTitle>
            <CardDescription>7-day rolling verification of cash withdrawals against recorded spending.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
            <BarChart data={aggregatedAdvData.slice(-14).map(d => ({
              date: d.date,
              withdrawals: d.withdrawals,
              expenses: d.expenses
              }))}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => v.toLocaleString()} />
                <Legend />
                <Bar dataKey="withdrawals" fill="hsl(var(--destructive))" name="Rolling Withdrawals (7d)" />
                <Bar dataKey="expenses" fill="hsl(var(--emerald-500))" name="Rolling Expenses (7d)" />
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
