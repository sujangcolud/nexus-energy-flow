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
} from "recharts";
import {
  Activity,
  AlertTriangle,
  Flame,
  Sparkles,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";
import { format } from "date-fns";

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

const fmt = (n: number) => formatCurrency(Number(n) || 0);

const Kpi = ({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ElementType;
}) => (
  <Card className="border border-border">
    <CardContent className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-semibold mt-1 text-foreground truncate">{value}</p>
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

  // ---------- KPIs ----------
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

  // ---------- chart datasets ----------
  const compareData = rows.map((r) => ({
    date: format(new Date(r.business_date), "MMM d"),
    Restaurant: r.orders_revenue,
    Charging: r.charging_revenue,
    Commission: r.commission_total,
    Expenses: r.expenses_total,
  }));

  const mixData = rows.map((r) => ({
    date: format(new Date(r.business_date), "MMM d"),
    "Energy %": r.energy_revenue_share_pct,
    "Commission %": r.commission_burden_pct,
  }));

  // ---------- recommendations ----------
  const recs: string[] = [];
  if (hookDays.length > 0) {
    const days = hookDays.map((h) => format(new Date(h.business_date), "EEE")).slice(0, 3).join(", ");
    recs.push(
      `Charging acted as a "hook" on ${hookDays.length} day(s) (e.g. ${days}). On these days food sales tracked above the period average — staff up the kitchen when high charging traffic is forecast.`,
    );
  }
  const peakCharge = rows.filter((r) => r.charging_revenue >= 5000);
  if (peakCharge.length > 0) {
    const avgFoodPeak = peakCharge.reduce((s, r) => s + r.orders_revenue, 0) / peakCharge.length;
    const avgFoodAll = rows.length ? rows.reduce((s, r) => s + r.orders_revenue, 0) / rows.length : 0;
    const lift = avgFoodAll > 0 ? ((avgFoodPeak - avgFoodAll) / avgFoodAll) * 100 : 0;
    if (lift > 5) {
      recs.push(
        `On days where Charging Revenue exceeds Rs. 5,000, Restaurant sales lift by ~${lift.toFixed(0)}%. Schedule extra staff for these peak Energy days.`,
      );
    }
  }
  if (burdenByDow.length > 0) {
    const worst = burdenByDow[0];
    if (worst.avg_burden_pct > 0) {
      recs.push(
        `Commission efficiency is lowest on ${worst.day} (avg burden ${worst.avg_burden_pct.toFixed(1)}%). Review referral payouts on that weekday.`,
      );
    }
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Business Intelligence Suite
          </h1>
          <p className="text-sm text-muted-foreground">
            Date-aligned correlations across Restaurant, Charging, and Cash flow.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border bg-card">
            <Label htmlFor="mode-toggle" className="text-xs text-muted-foreground">
              Activity Date
            </Label>
            <Switch
              id="mode-toggle"
              checked={mode === "entry"}
              onCheckedChange={(v) => setMode(v ? "entry" : "activity")}
            />
            <Label htmlFor="mode-toggle" className="text-xs text-muted-foreground">
              Entry Date
            </Label>
          </div>
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="60">Last 60 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        Window: <span className="font-medium text-foreground">{range.from}</span> →{" "}
        <span className="font-medium text-foreground">{range.to}</span>{" "}
        <Badge variant="secondary" className="ml-2">
          {mode === "activity" ? "Business Day View" : "Entry Day View"}
        </Badge>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Kpi label="Restaurant" value={fmt(totals.orders)} icon={Wallet} />
        <Kpi label="Charging" value={fmt(totals.charging)} icon={Zap} />
        <Kpi label="Total Revenue" value={fmt(totals.total)} icon={TrendingUp} />
        <Kpi label="Expenses" value={fmt(totals.expenses)} icon={Activity} />
        <Kpi
          label="Energy Share"
          value={`${totals.energyShare.toFixed(1)}%`}
          hint="Charging / Total revenue"
          icon={Flame}
        />
        <Kpi
          label="Commission Burden"
          value={`${totals.commissionBurden.toFixed(1)}%`}
          hint={`Rs. ${totals.commission.toLocaleString()} of revenue`}
          icon={AlertTriangle}
        />
      </div>

      {/* Comparative Bars */}
      <Card className="border border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Daily Revenue & Cost Comparison</CardTitle>
          <CardDescription>
            Side-by-side per business date — Restaurant, Charging, Commission, Total Expenses.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={compareData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                }}
                formatter={(v: number) => fmt(v)}
              />
              <Legend />
              <Bar dataKey="Restaurant" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Charging" fill="hsl(var(--chart-2, var(--primary)))" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Commission" fill="hsl(var(--destructive))" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Expenses" fill="hsl(var(--muted-foreground))" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Mix line */}
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
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                  }}
                  formatter={(v: number) => `${Number(v).toFixed(1)}%`}
                />
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
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                  }}
                  formatter={(v: number) => `${Number(v).toFixed(2)}%`}
                />
                <Bar dataKey="avg_burden_pct" fill="hsl(var(--destructive))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <Card className="border border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Operational Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No standout patterns detected for the selected window.
            </p>
          ) : (
            <ul className="space-y-2 list-disc pl-5 text-sm text-foreground">
              {recs.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Audit Engine */}
      <Card className="border border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Next-Day Balance Integrity
          </CardTitle>
          <CardDescription>
            Validates closing balance of Date X against opening of Date X+1.
            {anomalies.length > 0 ? (
              <span className="ml-2 text-destructive font-medium">
                {anomalies.length} anomaly{anomalies.length > 1 ? "ies" : ""} flagged
              </span>
            ) : (
              <span className="ml-2 text-emerald-600 font-medium">All clean</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground border-b">
                <tr>
                  <th className="py-2">Date</th>
                  <th className="py-2 text-right">Net change</th>
                  <th className="py-2 text-right">Δ vs prev</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Reason</th>
                </tr>
              </thead>
              <tbody>
                {flags.map((f) => (
                  <tr key={f.business_date} className="border-b last:border-0">
                    <td className="py-2">{f.business_date}</td>
                    <td className="py-2 text-right">{fmt(f.net_change)}</td>
                    <td className="py-2 text-right">{fmt(f.delta_vs_prev)}</td>
                    <td className="py-2">
                      {f.status === "ok" ? (
                        <Badge variant="secondary">OK</Badge>
                      ) : (
                        <Badge variant="destructive">Anomaly</Badge>
                      )}
                    </td>
                    <td className="py-2 text-xs text-muted-foreground">{f.reason ?? "—"}</td>
                  </tr>
                ))}
                {flags.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-muted-foreground">
                      No data in window.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default BusinessIntelligenceSuite;
