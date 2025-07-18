import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import {
  Banknote,
  CreditCard,
  PiggyBank,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  BarChart3,
} from "lucide-react";
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
import { useAuth } from "@/context/AuthContext";

interface FinancialData {
  bankBalance: number;
  cashInHand: number;
  esewaBalance: number;
  fonepayBalance: number;
  cooperativeBalance: number;
  totalIncome: number;
  totalExpenses: number;
  chargingIncome: number;
  restaurantIncome: number;
  netProfit: number;
  totalAssets: number;
}

const Analytics = () => {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState("30");
  const [analyticsSettings, setAnalyticsSettings] = useState({
    showKeyMetrics: true,
    showCharts: true,
    showCorrelation: true,
    showBalanceDistribution: true,
    showIncomeTrend: true,
    showIncomeSources: true,
    showSummaryStats: true,
    autoRefresh: false,
  });

  useEffect(() => {
    const storedSettings = localStorage.getItem("analyticsSettings");
    if (storedSettings) {
      setAnalyticsSettings(JSON.parse(storedSettings));
    }
  }, []);

  const handleAnalyticsToggle = (setting: string) => {
    const newSettings = {
      ...analyticsSettings,
      [setting]: !analyticsSettings[setting as keyof typeof analyticsSettings],
    };
    setAnalyticsSettings(newSettings);
    localStorage.setItem("analyticsSettings", JSON.stringify(newSettings));
  };

  const { data: financialData, isLoading } = useQuery({
    queryKey: ["financialData", timeRange],
    queryFn: async () => {
      const date = new Date();
      date.setDate(date.getDate() - parseInt(timeRange));
      const fromDate = date.toISOString().split("T")[0];
      const toDate = new Date().toISOString().split("T")[0];

      const { data, error } = await supabase.rpc('get_report_data', {
        user_id_param: user!.id,
        from_date: fromDate,
        to_date: toDate,
      });

      if (error) throw error;

      const { data: formulaData, error: formulaError } = await supabase.from("formulas").select("*").eq("user_id", user!.id);
      if (formulaError) throw formulaError;

      const formulas: Record<string, number> = {};
      for (const f of formulaData) {
        const { data: result, error: rpcError } = await supabase.rpc('execute_formula', { heading_param: f.heading });
        if (rpcError) throw rpcError;
        formulas[f.heading] = result;
      }

      return { ...data, ...formulas };
    },
    enabled: !!user,
  });

  const financials: FinancialData = {
    bankBalance: financialData?.bankBalance || 0,
    cashInHand: financialData?.cashInHand || 0,
    esewaBalance: financialData?.esewaBalance || 0,
    fonepayBalance: financialData?.fonepayBalance || 0,
    cooperativeBalance: financialData?.cooperativeSavings || 0,
    totalIncome: financialData?.totalRevenue || 0,
    totalExpenses: financialData?.totalExpenses || 0,
    chargingIncome: (financialData?.charging || []).reduce(
      (sum: number, session: any) => sum + session.total_amount,
      0,
    ),
    restaurantIncome: (financialData?.orders || []).reduce(
      (sum: number, order: any) => sum + order.total,
      0,
    ),
    netProfit: (financialData?.totalRevenue || 0) - (financialData?.totalExpenses || 0),
    totalAssets: (financialData?.bankBalance || 0) + (financialData?.cashInHand || 0) + (financialData?.cooperativeSavings || 0),
  };

  // Chart data for charging vs restaurant correlation
  const correlationData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));

    const dayCharging = (financialData?.charging || [])
      .filter(
        (session: any) =>
          new Date(session.created_at).toDateString() === date.toDateString(),
      )
      .reduce(
        (sum: number, session: any) => sum + (parseFloat(session.total_amount) || 0),
        0,
      );

    const dayRestaurant = (financialData?.orders || [])
      .filter(
        (order: any) =>
          new Date(order.created_at).toDateString() === date.toDateString(),
      )
      .reduce((sum: number, order: any) => sum + (parseFloat(order.total) || 0), 0);

    return {
      date: date.toLocaleDateString("en-US", { weekday: "short" }),
      charging: dayCharging,
      restaurant: dayRestaurant,
      total: dayCharging + dayRestaurant,
    };
  });

  const balanceData = [
    { name: "Bank Balance", value: financials.bankBalance, color: "#22c55e" },
    { name: "Cash in Hand", value: financials.cashInHand, color: "#3b82f6" },
    { name: "Esewa", value: financials.esewaBalance, color: "#10b981" },
    { name: "Fonepay", value: financials.fonepayBalance, color: "#8b5cf6" },
    {
      name: "Cooperative",
      value: financials.cooperativeBalance,
      color: "#f59e0b",
    },
  ];

  const incomeBreakdown = [
    {
      name: "Restaurant",
      value: financials.restaurantIncome,
      color: "#ef4444",
    },
    { name: "Charging", value: financials.chargingIncome, color: "#8b5cf6" },
  ];

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6 mobile-container py-4 sm:py-6 lg:py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="responsive-text-2xl font-bold text-slate-800 mb-2">
            Financial Analytics
          </h1>
          <p className="responsive-text-sm text-slate-600">
            Comprehensive view of your financial performance
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Analytics Settings Panel */}
      <Card className="mb-6 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Analytics Display Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="showKeyMetrics"
                checked={analyticsSettings.showKeyMetrics}
                onCheckedChange={() => handleAnalyticsToggle("showKeyMetrics")}
              />
              <Label htmlFor="showKeyMetrics" className="text-sm">
                Key Metrics
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="showCharts"
                checked={analyticsSettings.showCharts}
                onCheckedChange={() => handleAnalyticsToggle("showCharts")}
              />
              <Label htmlFor="showCharts" className="text-sm">
                Charts
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="showCorrelation"
                checked={analyticsSettings.showCorrelation}
                onCheckedChange={() => handleAnalyticsToggle("showCorrelation")}
              />
              <Label htmlFor="showCorrelation" className="text-sm">
                Correlation
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="showSummaryStats"
                checked={analyticsSettings.showSummaryStats}
                onCheckedChange={() =>
                  handleAnalyticsToggle("showSummaryStats")
                }
              />
              <Label htmlFor="showSummaryStats" className="text-sm">
                Summary Stats
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="showBalanceDistribution"
                checked={analyticsSettings.showBalanceDistribution}
                onCheckedChange={() =>
                  handleAnalyticsToggle("showBalanceDistribution")
                }
              />
              <Label htmlFor="showBalanceDistribution" className="text-sm">
                Balance Distribution
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="showIncomeTrend"
                checked={analyticsSettings.showIncomeTrend}
                onCheckedChange={() => handleAnalyticsToggle("showIncomeTrend")}
              />
              <Label htmlFor="showIncomeTrend" className="text-sm">
                Income Trend
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="showIncomeSources"
                checked={analyticsSettings.showIncomeSources}
                onCheckedChange={() =>
                  handleAnalyticsToggle("showIncomeSources")
                }
              />
              <Label htmlFor="showIncomeSources" className="text-sm">
                Income Sources
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="autoRefresh"
                checked={analyticsSettings.autoRefresh}
                onCheckedChange={() => handleAnalyticsToggle("autoRefresh")}
              />
              <Label htmlFor="autoRefresh" className="text-sm">
                Auto Refresh
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Cards */}
      {analyticsSettings.showKeyMetrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card className="bg-green-50 border-green-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-700">
                Bank Balance
              </CardTitle>
              <Banknote className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-800">
                ${financials.bankBalance.toLocaleString()}
              </div>
              <p className="text-xs text-green-600 mt-1">
                From bank deposits, withdrawals and expenses
              </p>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">
                Cash in Hand
              </CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-800">
                ${financials.cashInHand.toLocaleString()}
              </div>
              <p className="text-xs text-blue-600 mt-1">
                From cash income, expenses and deposits
              </p>
            </CardContent>
          </Card>

          <Card className="bg-teal-50 border-teal-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-teal-700">
                Esewa Balance
              </CardTitle>
              <CreditCard className="h-4 w-4 text-teal-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-teal-800">
                ${financials.esewaBalance.toLocaleString()}
              </div>
              <p className="text-xs text-teal-600 mt-1">
                From Esewa transactions
              </p>
            </CardContent>
          </Card>

          <Card className="bg-purple-50 border-purple-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-700">
                Fonepay Balance
              </CardTitle>
              <CreditCard className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-800">
                ${financials.fonepayBalance.toLocaleString()}
              </div>
              <p className="text-xs text-purple-600 mt-1">
                From Fonepay transactions
              </p>
            </CardContent>
          </Card>

          <Card className="bg-amber-50 border-amber-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-amber-700">
                Cooperative Balance
              </CardTitle>
              <PiggyBank className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-800">
                ${financials.cooperativeBalance.toLocaleString()}
              </div>
              <p className="text-xs text-amber-600 mt-1">
                Total cooperative savings
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Grid */}
      {analyticsSettings.showCharts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Charging vs Restaurant Correlation */}
          {analyticsSettings.showCorrelation && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Charging & Restaurant Income Correlation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={correlationData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${value}`, ""]} />
                    <Legend />
                    <Bar
                      dataKey="charging"
                      fill="#8b5cf6"
                      name="Charging Income"
                    />
                    <Bar
                      dataKey="restaurant"
                      fill="#ef4444"
                      name="Restaurant Income"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Balance Distribution */}
          {analyticsSettings.showBalanceDistribution && (
            <Card>
              <CardHeader>
                <CardTitle>Balance Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={balanceData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) =>
                        `${name}: $${value.toLocaleString()}`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {balanceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`$${value}`, ""]} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Income Trend */}
          {analyticsSettings.showIncomeTrend && (
            <Card>
              <CardHeader>
                <CardTitle>Daily Income Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={correlationData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${value}`, ""]} />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="#22c55e"
                      fill="#22c55e"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Income Sources */}
          {analyticsSettings.showIncomeSources && (
            <Card>
              <CardHeader>
                <CardTitle>Income Sources</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={incomeBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {incomeBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`$${value}`, ""]} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Summary Statistics */}
      {analyticsSettings.showSummaryStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">
                    Total Income
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    ${financials.totalIncome.toLocaleString()}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">
                    Total Expenses
                  </p>
                  <p className="text-2xl font-bold text-red-600">
                    ${financials.totalExpenses.toLocaleString()}
                  </p>
                </div>
                <TrendingDown className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">
                    Net Profit
                  </p>
                  <p
                    className={`text-2xl font-bold ${
                      financials.netProfit >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    ${financials.netProfit.toLocaleString()}
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-slate-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">
                    Total Assets
                  </p>
                  <p className="text-2xl font-bold text-blue-600">
                    ${financials.totalAssets.toLocaleString()}
                  </p>
                </div>
                <CreditCard className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Analytics;
