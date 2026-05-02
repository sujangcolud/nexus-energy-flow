import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ComposedChart, Area
} from "recharts";
import { toast } from "sonner";
import { AlertCircle, TrendingUp, TrendingDown, Zap, Utensils, AlertTriangle, Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, subDays, isWithinInterval } from "date-fns";

const BusinessHealthDashboard = () => {
  const { user } = useAuth();
  const [biData, setBiData] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const { data: bi, error: biErr } = await supabase
          .from('advanced_business_intelligence')
          .select('*')
          .order('business_date', { ascending: true });

        const { data: al, error: alErr } = await supabase
          .from('ai_audit_alerts')
          .select('*')
          .order('business_date', { ascending: false });

        if (biErr || alErr) throw biErr || alErr;

        setBiData(bi || []);
        setAlerts(al || []);
      } catch (error) {
        console.error('Error fetching BI data:', error);
        toast.error('Failed to load business health data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  // Aggregate data by date for global charts
  const aggregatedDailyData = useMemo(() => {
    const map = new Map<string, any>();
    biData.forEach(row => {
      const date = row.business_date;
      if (!map.has(date)) {
        map.set(date, {
          date: format(parseISO(date), 'MMM dd'),
          fullDate: date,
          food_revenue: row.orders_revenue || 0,
          charging_revenue: row.charging_revenue || 0,
          total_revenue: row.total_revenue || 0,
          conversion: row.charging_to_food_conversion || 0,
          commission_total: row.commission_total || 0,
          revenue_per_commission: row.revenue_per_commission_rupee || 0,
          categories: {}
        });
      }
      const entry = map.get(date);
      if (row.category_group !== 'Unmapped') {
        entry.categories[row.category_group] = {
          cost: row.daily_cost,
          sales: row.daily_sales,
          margin: row.gross_margin_pct_7d
        };
      }
    });
    return Array.from(map.values());
  }, [biData]);

  const latestStats = aggregatedDailyData.length > 0 ? aggregatedDailyData[aggregatedDailyData.length - 1] : null;

  const categories = ['Vegetables', 'Meat', 'Beverages', 'Others'];
  const categoryMargins = categories.map(cat => {
    const catData = biData.filter(d => d.category_group === cat).slice(-1)[0];
    return {
      category: cat,
      margin: catData?.gross_margin_pct_7d || 0,
    };
  });

  // Trend analysis logic
  const trendAdvice = useMemo(() => {
    if (aggregatedDailyData.length < 14) return [];

    const advice = [];
    const today = new Date();
    const last7DaysInterval = { start: subDays(today, 7), end: today };
    const prev7DaysInterval = { start: subDays(today, 14), end: subDays(today, 7) };

    categories.forEach(cat => {
      const currentWeekData = biData.filter(d => d.category_group === cat && isWithinInterval(parseISO(d.business_date), last7DaysInterval));
      const prevWeekData = biData.filter(d => d.category_group === cat && isWithinInterval(parseISO(d.business_date), prev7DaysInterval));

      const currentCost = currentWeekData.reduce((sum, d) => sum + d.daily_cost, 0);
      const prevCost = prevWeekData.reduce((sum, d) => sum + d.daily_cost, 0);

      const currentSales = currentWeekData.reduce((sum, d) => sum + d.daily_sales, 0);
      const prevSales = prevWeekData.reduce((sum, d) => sum + d.daily_sales, 0);

      if (prevCost > 0) {
        const costIncrease = ((currentCost - prevCost) / prevCost) * 100;
        const salesStable = prevSales > 0 ? Math.abs((currentSales - prevSales) / prevSales) < 0.05 : true;

        if (costIncrease > 10 && salesStable) {
          advice.push(`${cat} costs are up ${costIncrease.toFixed(0)}% this week, but sales are stable. Recommend checking portion control or adjusting prices.`);
        }
      }
    });

    // Charging traffic vs Restaurant sales
    const currentWeekAgg = aggregatedDailyData.filter(d => isWithinInterval(parseISO(d.fullDate), last7DaysInterval));
    const highChargingDays = currentWeekAgg.filter(d => d.charging_revenue > 1000 && d.food_revenue < 500);

    if (highChargingDays.length > 0) {
      const dayNames = highChargingDays.map(d => format(parseISO(d.fullDate), 'EEEE'));
      advice.push(`Charging traffic is high on ${dayNames.join(', ')}, but Restaurant sales are relatively low. Recommend a 'Charging Combo' promotion.`);
    }

    return advice;
  }, [biData, aggregatedDailyData]);

  if (loading) return <div className="p-8 text-center">Loading intelligence engine...</div>;

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Advanced Intelligence & Correlation</h1>
          <p className="text-muted-foreground">Nexus Energy Flow Strategic Business Health</p>
        </div>
        <Badge variant="outline" className="px-3 py-1 border-blue-500 text-blue-500">
          <Zap className="w-3 h-3 mr-1 fill-current" /> AI Engine Active
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {categoryMargins.map((cat) => (
          <Card key={cat.category} className="border-l-4" style={{ borderLeftColor: cat.margin > 30 ? '#22c55e' : cat.margin > 15 ? '#eab308' : '#ef4444' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase">{cat.category} Margin</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{cat.margin}%</div>
              <p className="text-xs text-muted-foreground">7-day rolling average</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Utensils className="w-5 h-5" /> Energy vs. Food Correlation
            </CardTitle>
            <CardDescription>Dual-axis trend showing revenue streams & conversion ratio</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={aggregatedDailyData.slice(-14)}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                  <YAxis yAxisId="right" orientation="right" stroke="#ff7300" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="food_revenue" fill="#8884d8" name="Food Revenue" stackId="a" />
                  <Bar yAxisId="left" dataKey="charging_revenue" fill="#413ea0" name="Charging Revenue" stackId="a" />
                  <Line yAxisId="right" type="monotone" dataKey="conversion" stroke="#ff7300" name="Charging-to-Food Ratio" strokeWidth={3} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" /> AI Auditor: Anomaly Detection
            </CardTitle>
            <CardDescription>Real-time waste & leakage detection (3+ day cost streak)</CardDescription>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                <AlertCircle className="w-12 h-12 mb-2 opacity-20" />
                <p>No anomalies detected in the last 30 days.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                {alerts.map((alert, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-100">
                    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                    <div>
                      <div className="font-semibold text-red-900">{alert.category_group}: {alert.alert_type}</div>
                      <div className="text-sm text-red-700">{alert.alert_description}</div>
                      <div className="text-xs text-red-500 mt-1">{format(parseISO(alert.business_date), 'PPP')}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" /> Dynamic Business Advice
          </CardTitle>
          <CardDescription>AI-generated insights based on multi-stream data trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-sm uppercase text-muted-foreground border-b pb-1">Trend-Based Insights</h3>
              {trendAdvice.length > 0 ? (
                trendAdvice.map((advice, i) => (
                  <div key={i} className="flex gap-2 text-sm">
                    <TrendingUp className="w-4 h-4 text-blue-500 shrink-0" />
                    <p>{advice}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground italic">Gathering more data for trend-based advice...</p>
              )}
            </div>
            <div className="space-y-4">
              <h3 className="font-semibold text-sm uppercase text-muted-foreground border-b pb-1">Efficiency KPIs</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Revenue per Commission Rupee</span>
                  <span className={latestStats?.revenue_per_commission < 10 ? "text-red-600 font-bold" : "text-green-600 font-bold"}>
                    NRs. {latestStats?.revenue_per_commission || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Charging-to-Food Ratio</span>
                  <span className="font-bold">{latestStats?.conversion || 0}</span>
                </div>
                <p className="text-xs text-muted-foreground pt-2 border-t">
                  {latestStats?.revenue_per_commission < 10
                    ? "⚠️ High commission burden detected. Review direct sales strategies."
                    : "✅ Efficient commission-to-revenue conversion."}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BusinessHealthDashboard;
