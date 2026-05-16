import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Flame,
  Calendar as CalendarIcon,
  AlertTriangle,
  Sparkles,
  ArrowDownRight,
  ArrowUpRight,
  Activity,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from "recharts";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils/unifiedCalculations";
import { CashflowMap } from "@/components/CashflowMap";

const fmt = (n: number) => formatCurrency(Number(n) || 0);

const KpiCard = ({
  label,
  value,
  hint,
  icon: Icon,
  positive,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ElementType;
  positive?: boolean;
}) => (
  <Card className="border border-border">
    <CardContent className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-semibold mt-1 text-foreground">{value}</p>
          {hint && (
            <p className={cn(
              "text-xs mt-1",
              positive === true && "text-emerald-600",
              positive === false && "text-rose-600",
              positive === undefined && "text-muted-foreground"
            )}>
              {hint}
            </p>
          )}
        </div>
        <div className="p-2 rounded-md bg-muted text-foreground">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const CommandCenterTab = () => {
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date>(new Date());

  const start = format(startDate, "yyyy-MM-dd");
  const end = format(endDate, "yyyy-MM-dd");

  const { data: kpi, isLoading: kpiLoading } = useQuery({
    queryKey: ["nexus-kpi", start, end],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("nexus_kpi_summary", {
        p_start_date: start,
        p_end_date: end,
      });
      if (error) throw error;
      return data as any;
    },
  });

  const { data: cashflow } = useQuery({
    queryKey: ["nexus-cashflow", start, end],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("nexus_cashflow_map", {
        p_start_date: start,
        p_end_date: end,
      });
      if (error) throw error;
      return data as any;
    },
  });

  const { data: forecast } = useQuery({
    queryKey: ["nexus-forecast"],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("nexus_forecast_cashflow", {
        p_lookback_days: 60,
        p_forecast_days: 30,
      });
      if (error) throw error;
      return data as any;
    },
  });

  const { data: anomalies } = useQuery({
    queryKey: ["nexus-anomalies"],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("nexus_detect_anomalies", {
        p_lookback_days: 90,
        p_z_threshold: 2.0,
      });
      if (error) throw error;
      return data as any;
    },
  });

  const { data: behavioral } = useQuery({
    queryKey: ["nexus-behavioral", start, end],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("nexus_behavioral_insights", {
        p_start_date: start,
        p_end_date: end,
      });
      if (error) throw error;
      return data as any;
    },
  });

  const { data: timeseries } = useQuery({
    queryKey: ["nexus-timeseries", start, end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_summary")
        .select("summary_date,total_income,total_expenses,total_balance")
        .gte("summary_date", start)
        .lte("summary_date", end)
        .order("summary_date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const allAnomalies = useMemo(() => {
    if (!anomalies) return [];
    return [
      ...(anomalies.orders || []),
      ...(anomalies.expenses || []),
      ...(anomalies.withdrawals || []),
    ].sort((a: any, b: any) => (b.z_score || 0) - (a.z_score || 0));
  }, [anomalies]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Cashflow Command Center</h2>
          <p className="text-sm text-muted-foreground">
            One-click view of revenue, burn rate, runway and anomalies
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <CalendarIcon className="h-4 w-4 mr-2" />
                {format(startDate, "MMM d")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={(d) => d && setStartDate(d)}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          <span className="text-muted-foreground text-sm">→</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <CalendarIcon className="h-4 w-4 mr-2" />
                {format(endDate, "MMM d")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={(d) => d && setEndDate(d)}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard
          label="Revenue"
          value={fmt(kpi?.total_revenue || 0)}
          hint={`${kpi?.period_days || 0} days`}
          icon={TrendingUp}
        />
        <KpiCard
          label="Expenses"
          value={fmt(kpi?.total_expenses || 0)}
          icon={TrendingDown}
        />
        <KpiCard
          label="Net Profit"
          value={fmt(kpi?.net_profit || 0)}
          hint={`${kpi?.profit_margin || 0}% margin`}
          positive={(kpi?.net_profit || 0) >= 0}
          icon={Sparkles}
        />
        <KpiCard
          label="Burn Rate"
          value={`${fmt(kpi?.burn_rate_daily || 0)}/day`}
          icon={Flame}
        />
        <KpiCard
          label="Cash Runway"
          value={`${kpi?.cash_runway_days || 0} days`}
          positive={(kpi?.cash_runway_days || 0) > 30}
          icon={Activity}
        />
        <KpiCard
          label="Total Balance"
          value={fmt(kpi?.current_balance || 0)}
          icon={Wallet}
        />
      </div>

      {/* Cashflow map + Forecast */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Cashflow Map</CardTitle>
            <CardDescription>How money moved between accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <CashflowMap data={cashflow} />
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">30-Day Cashflow Forecast</CardTitle>
            <CardDescription>
              Projected from {forecast?.avg_daily_income ? fmt(forecast.avg_daily_income) : "—"}{" "}
              avg daily income
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={forecast?.forecast || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => format(new Date(d), "MMM d")}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="projected_balance"
                  stroke="hsl(var(--foreground))"
                  strokeWidth={2}
                  dot={false}
                  name="Projected balance"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Time series revenue vs expenses */}
      <Card className="border border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Profitability Over Time</CardTitle>
          <CardDescription>Revenue vs Expenses</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={timeseries || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="summary_date"
                tickFormatter={(d) => format(new Date(d), "MMM d")}
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
              />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 6,
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="total_income" fill="hsl(var(--foreground))" name="Income" />
              <Bar dataKey="total_expenses" fill="hsl(var(--muted-foreground))" name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Anomalies + Behavioral */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border border-border lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Anomalies (last 90d, &gt; 2σ)
            </CardTitle>
            <CardDescription>
              {allAnomalies.length} unusual transactions detected
            </CardDescription>
          </CardHeader>
          <CardContent>
            {allAnomalies.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No anomalies detected. Operations look normal.
              </p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {allAnomalies.slice(0, 20).map((a: any, i: number) => (
                  <div
                    key={`${a.kind}-${a.id}-${i}`}
                    className="flex items-center justify-between text-sm p-2 rounded border border-border"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {a.kind === "expense" || a.kind === "withdrawal" ? (
                        <ArrowDownRight className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                      ) : (
                        <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      )}
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {a.kind}
                      </Badge>
                      <span className="truncate text-foreground">{a.label || "—"}</span>
                      <span className="text-muted-foreground text-xs whitespace-nowrap">
                        {a.txn_date && format(new Date(a.txn_date), "MMM d")}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-medium">{fmt(a.amount)}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        z={Number(a.z_score).toFixed(1)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top Items</CardTitle>
            <CardDescription>By revenue, in range</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {(behavioral?.top_items || []).slice(0, 10).map((it: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-border last:border-0">
                  <span className="truncate text-foreground">{it.item_name}</span>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{it.qty}×</span>
                    <span className="font-medium text-foreground">{fmt(it.revenue)}</span>
                  </div>
                </div>
              ))}
              {(!behavioral?.top_items || behavioral.top_items.length === 0) && (
                <p className="text-sm text-muted-foreground py-4 text-center">No orders in range.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low stock alerts */}
      {behavioral?.low_stock?.length > 0 && (
        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {behavioral.low_stock.map((s: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-sm p-2 rounded border border-border"
                >
                  <span className="truncate">{s.item_name}</span>
                  <Badge variant="destructive" className="text-[10px]">
                    {s.quantity}/{s.minimum_stock}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CommandCenterTab;
