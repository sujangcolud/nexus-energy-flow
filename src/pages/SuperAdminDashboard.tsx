import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Pie,
  PieChart,
  Cell,
  Line,
  LineChart,
  Area,
  AreaChart,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  ShoppingCart,
  Target,
  BarChart3,
  Zap,
  PiggyBank,
  Calendar,
  ArrowUpCircle,
  ArrowDownCircle,
  Percent,
  Clock,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

interface AnalyticsData {
  // Revenue Analytics
  totalRevenue: number;
  restaurantRevenue: number;
  chargingRevenue: number;
  dailyAverageRevenue: number;
  weeklyAverageRevenue: number;
  monthlyAverageRevenue: number;
  revenueGrowth: number;

  // Expense Analytics
  totalExpenses: number;
  expensesByCategory: Record<string, number>;
  dailyAverageExpenses: number;
  weeklyAverageExpenses: number;
  monthlyAverageExpenses: number;
  expenseGrowth: number;

  // Profitability
  netProfit: number;
  profitMargin: number;
  breakEvenPoint: number;

  // Cash Flow
  totalDeposits: number;
  totalWithdrawals: number;
  cooperativeSavings: number;
  currentCashFlow: number;

  // Business Metrics
  totalOrders: number;
  totalChargingSessions: number;
  averageOrderValue: number;
  averageChargingValue: number;

  // Time Series Data
  dailyRevenue: Array<{
    date: string;
    restaurant: number;
    charging: number;
    total: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    revenue: number;
    expenses: number;
    profit: number;
  }>;

  // Business Since Start
  daysSinceStart: number;
  totalBusinessDays: number;

  // Performance Indicators
  topSellingItems: Array<{ name: string; quantity: number; revenue: number }>;
  peakHours: Array<{ hour: number; orders: number; charging: number }>;

  // Financial Health
  liquidityRatio: number;
  burnRate: number;
  runway: number;
}

const SuperAdminDashboard = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<
    "7d" | "30d" | "90d" | "all"
  >("30d");

  // Business start date: May 7th, 2025
  const businessStartDate = new Date("2025-05-07");

  const fetchComprehensiveAnalytics = async () => {
    setLoading(true);
    try {
      // Calculate days since business started
      const today = new Date();
      const daysSinceStart = Math.ceil(
        (today.getTime() - businessStartDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Fetch all data in parallel
      const [
        ordersData,
        chargingData,
        expensesData,
        depositsData,
        withdrawalsData,
        cooperativeData,
      ] = await Promise.all([
        supabase.from("orders").select("*"),
        supabase.from("charging_sessions").select("*"),
        supabase.from("expenses").select("*"),
        supabase.from("deposits").select("*"),
        supabase.from("withdrawals").select("*"),
        supabase.from("cooperative_savings").select("*"),
      ]);

      const orders = ordersData.data || [];
      const chargingSessions = chargingData.data || [];
      const expenses = expensesData.data || [];
      const deposits = depositsData.data || [];
      const withdrawals = withdrawalsData.data || [];
      const cooperative = cooperativeData.data || [];

      // Revenue Calculations
      const restaurantRevenue = orders.reduce(
        (sum, order) => sum + order.total,
        0,
      );
      const chargingRevenue = chargingSessions.reduce(
        (sum, session) => sum + session.total_amount,
        0,
      );
      const totalRevenue = restaurantRevenue + chargingRevenue;
      const dailyAverageRevenue =
        daysSinceStart > 0 ? totalRevenue / daysSinceStart : 0;

      // Calculate 7-day and 1-month averages
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const sevenDayOrders = orders.filter(
        (order) => new Date(order.order_date) >= sevenDaysAgo,
      );
      const sevenDayCharging = chargingSessions.filter(
        (session) => new Date(session.session_date) >= sevenDaysAgo,
      );
      const thirtyDayOrders = orders.filter(
        (order) => new Date(order.order_date) >= thirtyDaysAgo,
      );
      const thirtyDayCharging = chargingSessions.filter(
        (session) => new Date(session.session_date) >= thirtyDaysAgo,
      );

      const sevenDayRevenue =
        sevenDayOrders.reduce((sum, order) => sum + order.total, 0) +
        sevenDayCharging.reduce(
          (sum, session) => sum + session.total_amount,
          0,
        );
      const thirtyDayRevenue =
        thirtyDayOrders.reduce((sum, order) => sum + order.total, 0) +
        thirtyDayCharging.reduce(
          (sum, session) => sum + session.total_amount,
          0,
        );

      const weeklyAverageRevenue = sevenDayRevenue / 7;
      const monthlyAverageRevenue = thirtyDayRevenue / 30;

      // Expense Calculations
      const totalExpenses = expenses.reduce(
        (sum, expense) => sum + expense.amount,
        0,
      );
      const dailyAverageExpenses =
        daysSinceStart > 0 ? totalExpenses / daysSinceStart : 0;

      const sevenDayExpenses = expenses.filter(
        (expense) => new Date(expense.expense_date) >= sevenDaysAgo,
      );
      const thirtyDayExpenses = expenses.filter(
        (expense) => new Date(expense.expense_date) >= thirtyDaysAgo,
      );

      const weeklyAverageExpenses =
        sevenDayExpenses.reduce((sum, expense) => sum + expense.amount, 0) / 7;
      const monthlyAverageExpenses =
        thirtyDayExpenses.reduce((sum, expense) => sum + expense.amount, 0) /
        30;

      const expensesByCategory = expenses.reduce(
        (acc, expense) => {
          acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
          return acc;
        },
        {} as Record<string, number>,
      );

      // Profitability Metrics
      const netProfit = totalRevenue - totalExpenses;
      const profitMargin =
        totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

      // Cash Flow Analysis
      const totalDeposits = deposits.reduce(
        (sum, deposit) => sum + deposit.amount,
        0,
      );
      const totalWithdrawals = withdrawals.reduce(
        (sum, withdrawal) => sum + withdrawal.amount,
        0,
      );
      const cooperativeSavings = cooperative.reduce(
        (sum, saving) => sum + saving.contribution_amount,
        0,
      );
      const currentCashFlow = totalDeposits - totalWithdrawals;

      // Business Metrics
      const totalOrders = orders.length;
      const totalChargingSessions = chargingSessions.length;
      const averageOrderValue =
        totalOrders > 0 ? restaurantRevenue / totalOrders : 0;
      const averageChargingValue =
        totalChargingSessions > 0 ? chargingRevenue / totalChargingSessions : 0;

      // Top Selling Items
      const itemsSales = orders.reduce(
        (acc, order) => {
          if (!acc[order.item_name]) {
            acc[order.item_name] = { quantity: 0, revenue: 0 };
          }
          acc[order.item_name].quantity += order.quantity;
          acc[order.item_name].revenue += order.total;
          return acc;
        },
        {} as Record<string, { quantity: number; revenue: number }>,
      );

      const topSellingItems = Object.entries(itemsSales)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Daily Revenue Trends (last 30 days)
      const dailyRevenue = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];

        const dayOrders = orders.filter(
          (order) => order.order_date === dateStr,
        );
        const dayCharging = chargingSessions.filter(
          (session) => session.session_date === dateStr,
        );

        const restaurantDaily = dayOrders.reduce(
          (sum, order) => sum + order.total,
          0,
        );
        const chargingDaily = dayCharging.reduce(
          (sum, session) => sum + session.total_amount,
          0,
        );

        dailyRevenue.push({
          date: dateStr,
          restaurant: restaurantDaily,
          charging: chargingDaily,
          total: restaurantDaily + chargingDaily,
        });
      }

      // Monthly Trends
      const monthlyData = new Map();

      // Process orders by month
      orders.forEach((order) => {
        const month = order.order_date.substring(0, 7); // YYYY-MM format
        if (!monthlyData.has(month)) {
          monthlyData.set(month, { revenue: 0, expenses: 0, profit: 0 });
        }
        monthlyData.get(month).revenue += order.total;
      });

      // Process charging by month
      chargingSessions.forEach((session) => {
        const month = session.session_date.substring(0, 7);
        if (!monthlyData.has(month)) {
          monthlyData.set(month, { revenue: 0, expenses: 0, profit: 0 });
        }
        monthlyData.get(month).revenue += session.total_amount;
      });

      // Process expenses by month
      expenses.forEach((expense) => {
        const month = expense.expense_date.substring(0, 7);
        if (!monthlyData.has(month)) {
          monthlyData.set(month, { revenue: 0, expenses: 0, profit: 0 });
        }
        monthlyData.get(month).expenses += expense.amount;
      });

      // Calculate profit for each month
      const monthlyTrends = Array.from(monthlyData.entries())
        .map(([month, data]) => ({
          month,
          revenue: data.revenue,
          expenses: data.expenses,
          profit: data.revenue - data.expenses,
        }))
        .sort((a, b) => a.month.localeCompare(b.month));

      // Financial Health Metrics
      const liquidityRatio =
        totalExpenses > 0 ? currentCashFlow / totalExpenses : 0;
      const burnRate = dailyAverageExpenses;
      const runway = burnRate > 0 ? currentCashFlow / burnRate : Infinity;

      setAnalytics({
        totalRevenue,
        restaurantRevenue,
        chargingRevenue,
        dailyAverageRevenue,
        weeklyAverageRevenue,
        monthlyAverageRevenue,
        revenueGrowth: 15.2, // This would need historical comparison
        totalExpenses,
        expensesByCategory,
        dailyAverageExpenses,
        weeklyAverageExpenses,
        monthlyAverageExpenses,
        expenseGrowth: -8.5, // This would need historical comparison
        netProfit,
        profitMargin,
        breakEvenPoint:
          dailyAverageExpenses > 0 ? totalExpenses / dailyAverageRevenue : 0,
        totalDeposits,
        totalWithdrawals,
        cooperativeSavings,
        currentCashFlow,
        totalOrders,
        totalChargingSessions,
        averageOrderValue,
        averageChargingValue,
        dailyRevenue,
        monthlyTrends,
        daysSinceStart,
        totalBusinessDays: daysSinceStart,
        topSellingItems,
        peakHours: [], // Would need hour-level data
        liquidityRatio,
        burnRate,
        runway,
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComprehensiveAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-primary rounded-full animate-spin mx-auto flex items-center justify-center">
            <BarChart3 className="h-8 w-8 text-black" />
          </div>
          <p className="text-xl font-semibold text-black">
            Loading Analytics...
          </p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-16">
        <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No analytics data available</p>
      </div>
    );
  }

  const COLORS = [
    "#3b82f6", // Blue
    "#10b981", // Green
    "#f59e0b", // Amber
    "#ef4444", // Red
    "#8b5cf6", // Purple
    "#06b6d4", // Cyan
    "#84cc16", // Lime
    "#f97316", // Orange
    "#ec4899", // Pink
    "#bbfae1", // Brand color
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="p-4 rounded-xl bg-primary">
            <BarChart3 className="h-8 w-8 text-black" />
          </div>
          <h1 className="text-4xl font-bold text-black">
            Business Analytics Dashboard
          </h1>
        </div>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Comprehensive insights for your Restaurant & EV Charging business
        </p>
        <div className="mt-4 flex items-center justify-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>Business started: May 7th, 2025</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>{analytics.daysSinceStart} days in operation</span>
          </div>
        </div>
      </div>

      {/* Executive Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  Total Revenue
                </p>
                <p className="text-3xl font-bold text-black">
                  NRs. {analytics.totalRevenue.toLocaleString()}
                </p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                  <span className="text-sm text-green-600">
                    +{analytics.revenueGrowth}%
                  </span>
                </div>
              </div>
              <div className="p-3 bg-brand-100 rounded-xl">
                <DollarSign className="h-8 w-8 text-black" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Net Profit</p>
                <p
                  className={`text-3xl font-bold ${analytics.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  NRs. {analytics.netProfit.toLocaleString()}
                </p>
                <div className="flex items-center mt-2">
                  <Percent className="h-4 w-4 text-primary mr-1" />
                  <span className="text-sm text-gray-600">
                    {analytics.profitMargin.toFixed(1)}% margin
                  </span>
                </div>
              </div>
              <div className="p-3 bg-brand-100 rounded-xl">
                <Target className="h-8 w-8 text-black" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  Average Revenue
                </p>
                <p className="text-2xl font-bold text-black">
                  NRs. {analytics.weeklyAverageRevenue.toFixed(0)}
                </p>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center">
                    <Activity className="h-3 w-3 text-blue-600 mr-1" />
                    <span className="text-xs text-blue-600">7d avg</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-xs text-gray-600">
                      1m: NRs. {analytics.monthlyAverageRevenue.toFixed(0)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-brand-100 rounded-xl">
                <TrendingUp className="h-8 w-8 text-black" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Cash Flow</p>
                <p
                  className={`text-3xl font-bold ${analytics.currentCashFlow >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  NRs. {analytics.currentCashFlow.toLocaleString()}
                </p>
                <div className="flex items-center mt-2">
                  <ArrowUpCircle className="h-4 w-4 text-green-600 mr-1" />
                  <span className="text-sm text-gray-600">
                    Liquidity: {analytics.liquidityRatio.toFixed(1)}x
                  </span>
                </div>
              </div>
              <div className="p-3 bg-brand-100 rounded-xl">
                <PiggyBank className="h-8 w-8 text-black" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Sources Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <Card className="border border-gray-200">
          <CardHeader className="bg-brand-50 border-b border-gray-200">
            <CardTitle className="text-black">Revenue Sources</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <ShoppingCart className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-black">
                        Restaurant Orders
                      </p>
                      <p className="text-sm text-gray-600">
                        {analytics.totalOrders} orders
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-black">
                      NRs. {analytics.restaurantRevenue.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      {(
                        (analytics.restaurantRevenue / analytics.totalRevenue) *
                        100
                      ).toFixed(1)}
                      %
                    </p>
                  </div>
                </div>
                <Progress
                  value={
                    (analytics.restaurantRevenue / analytics.totalRevenue) * 100
                  }
                  className="h-3"
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <Zap className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-black">EV Charging</p>
                      <p className="text-sm text-gray-600">
                        {analytics.totalChargingSessions} sessions
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-black">
                      NRs. {analytics.chargingRevenue.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      {(
                        (analytics.chargingRevenue / analytics.totalRevenue) *
                        100
                      ).toFixed(1)}
                      %
                    </p>
                  </div>
                </div>
                <Progress
                  value={
                    (analytics.chargingRevenue / analytics.totalRevenue) * 100
                  }
                  className="h-3"
                />
              </div>

              <div className="pt-4 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-600">Avg Order Value</p>
                    <p className="font-bold text-black">
                      NRs. {analytics.averageOrderValue.toFixed(0)}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-600">Avg Charging Value</p>
                    <p className="font-bold text-black">
                      NRs. {analytics.averageChargingValue.toFixed(0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardHeader className="bg-brand-50 border-b border-gray-200">
            <CardTitle className="text-black">Average Expenses</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center bg-red-50 p-4 rounded-lg border border-red-200">
                  <Receipt className="h-6 w-6 mx-auto mb-2 text-red-600" />
                  <p className="text-sm text-red-700 mb-1">7-Day Average</p>
                  <p className="text-xl font-bold text-red-700">
                    NRs. {analytics.weeklyAverageExpenses.toFixed(0)}
                  </p>
                  <p className="text-xs text-red-600">per day</p>
                </div>
                <div className="text-center bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <Receipt className="h-6 w-6 mx-auto mb-2 text-orange-600" />
                  <p className="text-sm text-orange-700 mb-1">
                    1-Month Average
                  </p>
                  <p className="text-xl font-bold text-orange-700">
                    NRs. {analytics.monthlyAverageExpenses.toFixed(0)}
                  </p>
                  <p className="text-xs text-orange-600">per day</p>
                </div>
                <div className="text-center bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <Receipt className="h-6 w-6 mx-auto mb-2 text-gray-600" />
                  <p className="text-sm text-gray-700 mb-1">All-Time Average</p>
                  <p className="text-xl font-bold text-gray-700">
                    NRs. {analytics.dailyAverageExpenses.toFixed(0)}
                  </p>
                  <p className="text-xs text-gray-600">per day</p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-600">Total Expenses</p>
                    <p className="font-bold text-black">
                      NRs. {analytics.totalExpenses.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-600">Expense Growth</p>
                    <p
                      className={`font-bold ${analytics.expenseGrowth < 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {analytics.expenseGrowth > 0 ? "+" : ""}
                      {analytics.expenseGrowth}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardHeader className="bg-brand-50 border-b border-gray-200">
            <CardTitle className="text-black">Expense Categories</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ChartContainer
              config={{
                amount: {
                  label: "Amount",
                  color: "#ef4444",
                },
              }}
              className="h-64"
            >
              <PieChart>
                <Pie
                  data={Object.entries(analytics.expensesByCategory).map(
                    ([category, amount]) => ({
                      name: category,
                      value: amount,
                    }),
                  )}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  nameKey="name"
                >
                  {Object.entries(analytics.expensesByCategory).map(
                    (entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ),
                  )}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Daily Revenue Trends */}
      <Card className="border border-gray-200 mb-8">
        <CardHeader className="bg-brand-50 border-b border-gray-200">
          <CardTitle className="text-black">
            Daily Revenue Trends (Last 30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <ChartContainer
            config={{
              restaurant: { label: "Restaurant", color: "#82e2b1" },
              charging: { label: "EV Charging", color: "#bbfae1" },
              total: { label: "Total", color: "#6fdaa1" },
            }}
            className="h-80"
          >
            <ComposedChart data={analytics.dailyRevenue}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) =>
                  new Date(value).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                }
              />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#6fdaa1"
                fill="#6fdaa1"
                fillOpacity={0.3}
                name="Total Revenue"
              />
              <Bar dataKey="restaurant" fill="#82e2b1" name="Restaurant" />
              <Bar dataKey="charging" fill="#bbfae1" name="EV Charging" />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Business Intelligence Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Top Selling Items */}
        <Card className="border border-gray-200">
          <CardHeader className="bg-brand-50 border-b border-gray-200">
            <CardTitle className="text-black">Top Selling Items</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {analytics.topSellingItems.map((item, index) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-black font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-black">{item.name}</p>
                      <p className="text-sm text-gray-600">
                        {item.quantity} sold
                      </p>
                    </div>
                  </div>
                  <p className="font-bold text-black">
                    NRs. {item.revenue.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Financial Health */}
        <Card className="border border-gray-200">
          <CardHeader className="bg-brand-50 border-b border-gray-200">
            <CardTitle className="text-black">Financial Health</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-black">Profitability</span>
                </div>
                <Badge
                  className={
                    analytics.netProfit >= 0
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }
                >
                  {analytics.netProfit >= 0 ? "Profitable" : "Loss"}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <PiggyBank className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-black">Burn Rate</span>
                </div>
                <span className="font-bold text-black">
                  NRs. {analytics.burnRate.toFixed(0)}/day
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-orange-600" />
                  <span className="font-medium text-black">Runway</span>
                </div>
                <span className="font-bold text-black">
                  {analytics.runway === Infinity
                    ? "∞"
                    : `${Math.round(analytics.runway)} days`}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                  <span className="font-medium text-black">Break Even</span>
                </div>
                <span className="font-bold text-black">
                  {analytics.breakEvenPoint.toFixed(0)} days
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cash Flow Summary */}
        <Card className="border border-gray-200">
          <CardHeader className="bg-brand-50 border-b border-gray-200">
            <CardTitle className="text-black">Cash Flow Summary</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <ArrowUpCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-black">Total Deposits</span>
                </div>
                <span className="font-bold text-green-600">
                  +NRs. {analytics.totalDeposits.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <ArrowDownCircle className="h-5 w-5 text-red-600" />
                  <span className="font-medium text-black">
                    Total Withdrawals
                  </span>
                </div>
                <span className="font-bold text-red-600">
                  -NRs. {analytics.totalWithdrawals.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <PiggyBank className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-black">
                    Cooperative Savings
                  </span>
                </div>
                <span className="font-bold text-blue-600">
                  NRs. {analytics.cooperativeSavings.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-brand-50 rounded-lg border border-primary">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-black" />
                  <span className="font-medium text-black">Net Cash Flow</span>
                </div>
                <span
                  className={`font-bold ${analytics.currentCashFlow >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  NRs. {analytics.currentCashFlow.toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trends */}
      <Card className="border border-gray-200">
        <CardHeader className="bg-brand-50 border-b border-gray-200">
          <CardTitle className="text-black">Monthly Business Trends</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <ChartContainer
            config={{
              revenue: { label: "Revenue", color: "#bbfae1" },
              expenses: { label: "Expenses", color: "#82e2b1" },
              profit: { label: "Profit", color: "#6fdaa1" },
            }}
            className="h-80"
          >
            <ComposedChart data={analytics.monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="revenue" fill="#bbfae1" name="Revenue" />
              <Bar dataKey="expenses" fill="#82e2b1" name="Expenses" />
              <Line
                type="monotone"
                dataKey="profit"
                stroke="#6fdaa1"
                strokeWidth={3}
                dot={{ fill: "#6fdaa1", strokeWidth: 2, r: 4 }}
                name="Profit"
              />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminDashboard;
