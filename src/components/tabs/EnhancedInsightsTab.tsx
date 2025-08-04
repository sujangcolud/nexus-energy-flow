
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  RefreshCw,
  PieChart,
  Target,
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
  total_deposits_fonepay?: number;
  total_savings: number;
  total_savings_cash?: number;
  total_savings_esewa?: number;
  total_savings_fonepay?: number;
  total_withdrawals: number;
  total_withdrawals_cash?: number;
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

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

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
        .select(`
          *
        `)
        .gte("summary_date", fromDate)
        .lte("summary_date", toDate)
        .order("summary_date", { ascending: true });

      if (error) {
        logError("fetching daily data for insights", error);
        throw error;
      }

      const typedData = (data || []).map(item => ({
        ...item,
        // Provide default values for optional payment mode breakdowns
        total_expenses_cash: item.total_expenses_cash || 0,
        total_expenses_esewa: item.total_expenses_esewa || 0,
        total_expenses_fonepay: item.total_expenses_fonepay || 0,
        total_deposits_cash: item.total_deposits_cash || 0,
        total_deposits_esewa: item.total_deposits_esewa || 0,
        total_deposits_fonepay: item.total_deposits_fonepay || 0,
        total_savings_cash: item.total_savings_cash || 0,
        total_savings_esewa: item.total_savings_esewa || 0,
        total_savings_fonepay: item.total_savings_fonepay || 0,
        total_withdrawals_cash: item.total_withdrawals_cash || 0,
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
      {
        label: "Total Income",
        value: totalIncome,
        format: "currency",
        trend: totalIncome > 0 ? "up" : "stable"
      },
      {
        label: "Total Expenses", 
        value: totalExpenses,
        format: "currency",
        trend: totalExpenses > avgDailyExpenses * data.length ? "up" : "down"
      },
      {
        label: "Net Profit",
        value: netProfit,
        format: "currency", 
        trend: netProfit > 0 ? "up" : "down"
      },
      {
        label: "Profit Margin",
        value: profitMargin,
        format: "percentage",
        trend: profitMargin > 10 ? "up" : profitMargin > 5 ? "stable" : "down"
      },
      {
        label: "Average Daily Income",
        value: avgDailyIncome,
        format: "currency"
      },
      {
        label: "Current Balance",
        value: latestBalance,
        format: "currency"
      },
      {
        label: "Total Savings",
        value: totalSavings,
        format: "currency"
      },
      {
        label: "Total Deposits", 
        value: totalDeposits,
        format: "currency"
      }
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
      {
        mode: "Cash",
        amount: totalCash,
        percentage: (totalCash / grandTotal) * 100,
        color: COLORS[0]
      },
      {
        mode: "eSewa", 
        amount: totalEsewa,
        percentage: (totalEsewa / grandTotal) * 100,
        color: COLORS[1]
      },
      {
        mode: "Fonepay",
        amount: totalFonepay,
        percentage: (totalFonepay / grandTotal) * 100,
        color: COLORS[2]
      }
    ].filter(item => item.amount > 0);
  };

  const getSavingsBreakdown = (): PaymentModeData[] => {
    const totalCash = dailyData.reduce((sum, day) => sum + (day.total_savings_cash || 0), 0);
    const totalEsewa = dailyData.reduce((sum, day) => sum + (day.total_savings_esewa || 0), 0);
    const totalFonepay = dailyData.reduce((sum, day) => sum + (day.total_savings_fonepay || 0), 0);
    
    const grandTotal = totalCash + totalEsewa + totalFonepay;
    
    if (grandTotal === 0) return [];

    return [
      {
        mode: "Cash Savings",
        amount: totalCash,
        percentage: (totalCash / grandTotal) * 100,
        color: COLORS[0]
      },
      {
        mode: "eSewa Savings",
        amount: totalEsewa,
        percentage: (totalEsewa / grandTotal) * 100,
        color: COLORS[1]
      },
      {
        mode: "Fonepay Savings",
        amount: totalFonepay,
        percentage: (totalFonepay / grandTotal) * 100,
        color: COLORS[2]
      }
    ].filter(item => item.amount > 0);
  };

  const getDepositsBreakdown = (): PaymentModeData[] => {
    const totalCash = dailyData.reduce((sum, day) => sum + (day.total_deposits_cash || 0), 0);
    const totalEsewa = dailyData.reduce((sum, day) => sum + (day.total_deposits_esewa || 0), 0);
    const totalFonepay = dailyData.reduce((sum, day) => sum + (day.total_deposits_fonepay || 0), 0);
    
    const grandTotal = totalCash + totalEsewa + totalFonepay;
    
    if (grandTotal === 0) return [];

    return [
      {
        mode: "Cash Deposits",
        amount: totalCash,
        percentage: (totalCash / grandTotal) * 100,
        color: COLORS[0]
      },
      {
        mode: "eSewa Deposits", 
        amount: totalEsewa,
        percentage: (totalEsewa / grandTotal) * 100,
        color: COLORS[1]
      },
      {
        mode: "Fonepay Deposits",
        amount: totalFonepay,
        percentage: (totalFonepay / grandTotal) * 100,
        color: COLORS[2]
      }
    ].filter(item => item.amount > 0);
  };

  const getWithdrawalsBreakdown = (): PaymentModeData[] => {
    const totalCash = dailyData.reduce((sum, day) => sum + (day.total_withdrawals_cash || 0), 0);
    const totalCooperative = dailyData.reduce((sum, day) => sum + (day.total_withdrawals_cooperative || 0), 0);
    const totalBank = dailyData.reduce((sum, day) => sum + (day.total_withdrawals_bank || 0), 0);
    
    const grandTotal = totalCash + totalCooperative + totalBank;
    
    if (grandTotal === 0) return [];

    return [
      {
        mode: "Cash Withdrawals",
        amount: totalCash,
        percentage: (totalCash / grandTotal) * 100,
        color: COLORS[0]
      },
      {
        mode: "Cooperative Withdrawals",
        amount: totalCooperative, 
        percentage: (totalCooperative / grandTotal) * 100,
        color: COLORS[1]
      },
      {
        mode: "Bank Withdrawals",
        amount: totalBank,
        percentage: (totalBank / grandTotal) * 100,
        color: COLORS[2]
      }
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
        return `NRs. ${value.toLocaleString()}`;
      case "percentage":
        return `${value.toFixed(1)}%`;
      default:
        return value.toLocaleString();
    }
  };

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
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
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-800">Enhanced Business Insights</h2>
        </div>
        <div className="flex items-center gap-4">
          <DatePickerWithRange date={dateRange} setDate={setDateRange} />
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

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {selectedMetrics.map((metric, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                {getTrendIcon(metric.trend)}
                {metric.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {formatValue(metric.value, metric.format)}
              </div>
              {metric.change && (
                <div className={`text-sm mt-1 ${metric.trend === 'up' ? 'text-green-600' : metric.trend === 'down' ? 'text-red-600' : 'text-gray-600'}`}>
                  {metric.change > 0 ? '+' : ''}{metric.change.toFixed(1)}% from previous period
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts and Detailed Analysis */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="savings">Savings</TabsTrigger>
          <TabsTrigger value="flows">Cash Flows</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Daily Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Daily Financial Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="summary_date" />
                  <YAxis />
                  <Tooltip formatter={(value, name) => [formatValue(Number(value), "currency"), name]} />
                  <Legend />
                  <Line type="monotone" dataKey="total_income" stroke="#22c55e" name="Income" />
                  <Line type="monotone" dataKey="total_expenses" stroke="#ef4444" name="Expenses" />
                  <Line type="monotone" dataKey="total_balance" stroke="#3b82f6" name="Balance" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Income vs Expenses Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Income vs Expenses Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="summary_date" />
                  <YAxis />
                  <Tooltip formatter={(value, name) => [formatValue(Number(value), "currency"), name]} />
                  <Legend />
                  <Bar dataKey="total_income_from_orders" fill="#22c55e" name="Orders Income" />
                  <Bar dataKey="total_income_from_charging" fill="#10b981" name="Charging Income" />
                  <Bar dataKey="total_expenses" fill="#ef4444" name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Expenses by Payment Mode
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={getPaymentModeBreakdown()}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="amount"
                    nameKey="mode"
                  >
                    {getPaymentModeBreakdown().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [formatValue(Number(value), "currency")]} />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="savings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Savings Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={getSavingsBreakdown()}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="amount"
                    nameKey="mode"
                  >
                    {getSavingsBreakdown().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [formatValue(Number(value), "currency")]} />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="flows" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Deposits Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsPieChart>
                    <Pie
                      data={getDepositsBreakdown()}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="amount"
                      nameKey="mode"
                    >
                      {getDepositsBreakdown().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [formatValue(Number(value), "currency")]} />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5" />
                  Withdrawals Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsPieChart>
                    <Pie
                      data={getWithdrawalsBreakdown()}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="amount"
                      nameKey="mode"
                    >
                      {getWithdrawalsBreakdown().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [formatValue(Number(value), "currency")]} />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Data Source Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-blue-600" />
            <span className="text-blue-700 font-medium">
              Data Source: daily_summary table
            </span>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              Period: {dateRange?.from && dateRange?.to && 
                `${format(dateRange.from, 'MMM dd')} - ${format(dateRange.to, 'MMM dd, yyyy')}`
              }
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedInsightsTab;
