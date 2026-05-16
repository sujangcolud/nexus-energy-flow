import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  PieChart,
  Activity,
} from "lucide-react";
import { DateRange } from "react-day-picker";
import { addDays, format } from "date-fns";
import { toast } from "sonner";
import { logError } from "@/utils/errorHandling";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Cell,
  LineChart,
  Line,
  Pie,
} from "recharts";

interface DailySummaryData {
  id: number;
  summary_date: string;
  total_income: number;
  total_income_from_orders: number;
  total_income_from_charging: number;
  total_expenses: number;
  total_expenses_cash?: number;
  total_expenses_esewa?: number;
  total_expenses_fonepay?: number;
  total_deposits: number;
  total_deposits_cash?: number;
  total_deposits_esewa?: number;
  total_savings: number;
  total_savings_cash?: number;
  total_savings_esewa?: number;
  total_savings_fonepay?: number;
  total_withdrawals: number;
  total_withdrawals_cooperative?: number;
  total_withdrawals_bank?: number;
  total_income_cash: number;
  total_income_esewa: number;
  total_income_fonepay: number;
  cash_balance: number;
  esewa_balance: number;
  fonepay_balance: number;
  cooperative_balance: number;
  total_balance: number;
  created_at: string;
  updated_at: string;
}

interface InsightMetric {
  label: string;
  value: number;
  change?: number;
  trend?: "up" | "down" | "stable";
  format?: "currency" | "percentage" | "number";
}

interface PaymentModeData {
  mode: string;
  amount: number;
  percentage: number;
  color: string;
}

const COLORS = ['hsl(var(--muted-foreground))', 'hsl(var(--foreground))', 'hsl(var(--border))'];

const EnhancedInsightsTab: React.FC = () => {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  const [dailyData, setDailyData] = useState<DailySummaryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMetrics, setSelectedMetrics] = useState<InsightMetric[]>([]);

  const fetchDailyData = async () => {
    if (!user || !dateRange?.from || !dateRange?.to) return;

    try {
      const fromDate = format(dateRange.from, 'yyyy-MM-dd');
      const toDate = format(dateRange.to, 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from("daily_summary")
        .select(`*`)
        .gte("summary_date", fromDate)
        .lte("summary_date", toDate)
        .order("summary_date", { ascending: true });

      if (error) {
        logError("fetching daily data for insights", error);
        throw error;
      }

      const typedData = (data || []).map(item => ({
        ...item,
        total_expenses_cash: item.total_expenses_cash || 0,
        total_expenses_esewa: item.total_expenses_esewa || 0,
        total_expenses_fonepay: item.total_expenses_fonepay || 0,
        total_deposits_cash: item.total_deposits_cash || 0,
        total_deposits_esewa: item.total_deposits_esewa || 0,
        total_savings_cash: item.total_savings_cash || 0,
        total_savings_esewa: item.total_savings_esewa || 0,
        total_savings_fonepay: item.total_savings_fonepay || 0,
        total_withdrawals_cooperative: item.total_withdrawals_cooperative || 0,
        total_withdrawals_bank: item.total_withdrawals_bank || 0,
      })) as DailySummaryData[];

      setDailyData(typedData);
      calculateMetrics(typedData);
    } catch (error) {
      logError("fetching insights data", error);
      toast.error("Failed to load insights data");
    }
  };

  const calculateMetrics = (data: DailySummaryData[]) => {
    if (data.length === 0) return;

    const totalIncome = data.reduce((sum, day) => sum + day.total_income, 0);
    const totalExpenses = data.reduce((sum, day) => sum + day.total_expenses, 0);
    const totalDeposits = data.reduce((sum, day) => sum + day.total_deposits, 0);
    const totalSavings = data.reduce((sum, day) => sum + day.total_savings, 0);
    
    const avgDailyIncome = totalIncome / data.length;
    const avgDailyExpenses = totalExpenses / data.length;
    const netProfit = totalIncome - totalExpenses;
    const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;
    
    const latestBalance = data[data.length - 1]?.total_balance || 0;
    
    const metrics: InsightMetric[] = [
      { label: "Total Income", value: totalIncome, format: "currency", trend: totalIncome > 0 ? "up" : "stable" },
      { label: "Total Expenses", value: totalExpenses, format: "currency", trend: totalExpenses > avgDailyExpenses * data.length ? "up" : "down" },
      { label: "Net Profit", value: netProfit, format: "currency", trend: netProfit > 0 ? "up" : "down" },
      { label: "Profit Margin", value: profitMargin, format: "percentage", trend: profitMargin > 10 ? "up" : profitMargin > 5 ? "stable" : "down" },
      { label: "Average Daily Income", value: avgDailyIncome, format: "currency" },
      { label: "Current Balance", value: latestBalance, format: "currency" },
      { label: "Total Savings", value: totalSavings, format: "currency" },
      { label: "Total Deposits", value: totalDeposits, format: "currency" }
    ];

    setSelectedMetrics(metrics);
  };

  const getPaymentModeBreakdown = (): PaymentModeData[] => {
    const totalCash = dailyData.reduce((sum, day) => sum + (day.total_expenses_cash || 0), 0);
    const totalEsewa = dailyData.reduce((sum, day) => sum + (day.total_expenses_esewa || 0), 0);
    const totalFonepay = dailyData.reduce((sum, day) => sum + (day.total_expenses_fonepay || 0), 0);
    
    const grandTotal = totalCash + totalEsewa + totalFonepay;
    
    if (grandTotal === 0) return [];

    return [
      { mode: "Cash", amount: totalCash, percentage: (totalCash / grandTotal) * 100, color: COLORS[0] },
      { mode: "eSewa", amount: totalEsewa, percentage: (totalEsewa / grandTotal) * 100, color: COLORS[1] },
      { mode: "Fonepay", amount: totalFonepay, percentage: (totalFonepay / grandTotal) * 100, color: COLORS[2] }
    ].filter(item => item.amount > 0);
  };

  const refreshData = async () => {
    setRefreshing(true);
    try {
      await fetchDailyData();
      toast.success("Insights data refreshed successfully!");
    } catch (error) {
      toast.error("Failed to refresh insights data");
    } finally {
      setRefreshing(false);
    }
  };

  const formatValue = (value: number, format?: string) => {
    switch (format) {
      case "currency":
        return `₹ ${value.toLocaleString()}`;
      case "percentage":
        return `${value.toFixed(1)}%`;
      default:
        return value.toLocaleString();
    }
  };

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-foreground" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await fetchDailyData();
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [dateRange, user]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Business Insights</h2>
        </div>
        <div className="flex items-center gap-4">
          <DateRangePicker onUpdate={(range) => {
            if (range) {
              setDateRange({ from: range.from, to: range.to });
            }
          }} />
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {selectedMetrics.map((metric, index) => (
          <Card key={index} className="bg-card border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                {getTrendIcon(metric.trend)}
                {metric.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-foreground">
                {formatValue(metric.value, metric.format)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-medium text-foreground">
              <TrendingUp className="h-4 w-4" />
              Daily Financial Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="summary_date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip 
                  formatter={(value, name) => [formatValue(Number(value), "currency"), name]}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                />
                <Legend />
                <Line type="monotone" dataKey="total_income" stroke="hsl(var(--foreground))" name="Income" strokeWidth={2} />
                <Line type="monotone" dataKey="total_expenses" stroke="hsl(var(--muted-foreground))" name="Expenses" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-medium text-foreground">
              <BarChart3 className="h-4 w-4" />
              Income vs Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="summary_date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip 
                  formatter={(value, name) => [formatValue(Number(value), "currency"), name]}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                />
                <Legend />
                <Bar dataKey="total_income_from_orders" fill="hsl(var(--foreground))" name="Orders Income" />
                <Bar dataKey="total_income_from_charging" fill="hsl(var(--muted-foreground))" name="Charging Income" />
                <Bar dataKey="total_expenses" fill="hsl(var(--border))" name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-medium text-foreground">
            <PieChart className="h-4 w-4" />
            Expenses by Payment Mode
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <RechartsPieChart>
              <Pie
                data={getPaymentModeBreakdown()}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="hsl(var(--foreground))"
                dataKey="amount"
                label={({ mode, percentage }) => `${mode}: ${percentage.toFixed(1)}%`}
              >
                {getPaymentModeBreakdown().map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => [formatValue(Number(value), "currency"), "Amount"]}
                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
              />
            </RechartsPieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedInsightsTab;
