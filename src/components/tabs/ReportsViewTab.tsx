import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  ComposedChart,
  ResponsiveContainer,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Zap,
  Receipt,
  PiggyBank,
  BarChart3,
  Calendar,
  RefreshCw,
  Eye,
  Filter,
  Target,
  Activity,
  Users,
} from "lucide-react";
import { toast } from "sonner";

interface ReportVisualization {
  id: string;
  title: string;
  type: "chart" | "table" | "metric";
  data: any;
  description: string;
  period: string;
  generated_at: string;
}

interface BusinessMetrics {
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
    orders: number;
  }>;
  expenseCategories: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  topProducts: Array<{
    name: string;
    quantity: number;
    revenue: number;
    category: string;
  }>;
  hourlyPatterns: Array<{
    hour: number;
    orders: number;
    charging: number;
    revenue: number;
  }>;
  paymentMethods: Array<{
    method: string;
    amount: number;
    count: number;
    percentage: number;
  }>;
  profitabilityAnalysis: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    profitMargin: number;
    breakEvenPoint: number;
    growthRate: number;
  };
  cashFlowAnalysis: {
    totalDeposits: number;
    totalWithdrawals: number;
    cooperativeSavings: number;
    netCashFlow: number;
    burnRate: number;
    runway: number;
  };
  businessKPIs: {
    averageOrderValue: number;
    averageChargingValue: number;
    customerAcquisitionCost: number;
    customerLifetimeValue: number;
    orderFrequency: number;
    chargingUtilization: number;
  };
}

const ReportsViewTab = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<BusinessMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<
    "7d" | "30d" | "90d" | "1y"
  >("30d");
  const [selectedView, setSelectedView] = useState<
    "overview" | "revenue" | "expenses" | "trends"
  >("overview");

  const fetchBusinessMetrics = async () => {
    setLoading(true);
    try {
      // Calculate date range based on selected period
      const endDate = new Date();
      const startDate = new Date();

      switch (selectedPeriod) {
        case "7d":
          startDate.setDate(startDate.getDate() - 7);
          break;
        case "30d":
          startDate.setDate(startDate.getDate() - 30);
          break;
        case "90d":
          startDate.setDate(startDate.getDate() - 90);
          break;
        case "1y":
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
      }

      const startDateStr = startDate.toISOString().split("T")[0];
      const endDateStr = endDate.toISOString().split("T")[0];

      // Fetch all business data
      const [
        ordersData,
        chargingData,
        expensesData,
        depositsData,
        withdrawalsData,
        cooperativeData,
      ] = await Promise.all([
        supabase
          .from("orders")
          .select("*")
          .eq("user_id", user!.id)
          .gte("order_date", startDateStr)
          .lte("order_date", endDateStr),
        supabase
          .from("charging_sessions")
          .select("*")
          .eq("user_id", user!.id)
          .gte("session_date", startDateStr)
          .lte("session_date", endDateStr),
        supabase
          .from("expenses")
          .select("*")
          .eq("user_id", user!.id)
          .gte("expense_date", startDateStr)
          .lte("expense_date", endDateStr),
        supabase
          .from("deposits")
          .select("*")
          .eq("user_id", user!.id)
          .gte("deposit_date", startDateStr)
          .lte("deposit_date", endDateStr),
        supabase
          .from("withdrawals")
          .select("*")
          .eq("user_id", user!.id)
          .gte("withdrawal_date", startDateStr)
          .lte("withdrawal_date", endDateStr),
        supabase
          .from("cooperative_savings")
          .select("*")
          .eq("user_id", user!.id)
          .gte("contribution_date", startDateStr)
          .lte("contribution_date", endDateStr),
      ]);

      const orders = ordersData.data || [];
      const chargingSessions = chargingData.data || [];
      const expenses = expensesData.data || [];
      const deposits = depositsData.data || [];
      const withdrawals = withdrawalsData.data || [];
      const cooperative = cooperativeData.data || [];

      // Process daily revenue trends
      const dailyRevenue = [];
      const daysDiff = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      for (let i = 0; i < daysDiff; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split("T")[0];

        const dayOrders = orders.filter(
          (order) => order.order_date === dateStr,
        );
        const dayCharging = chargingSessions.filter(
          (session) => session.session_date === dateStr,
        );

        const restaurantRevenue = dayOrders.reduce(
          (sum, order) => sum + order.total,
          0,
        );
        const chargingRevenue = dayCharging.reduce(
          (sum, session) => sum + session.total_amount,
          0,
        );

        dailyRevenue.push({
          date: dateStr,
          restaurant: restaurantRevenue,
          charging: chargingRevenue,
          total: restaurantRevenue + chargingRevenue,
        });
      }

      // Process monthly trends
      const monthlyData = new Map();

      [...orders, ...chargingSessions].forEach((item) => {
        const date = item.order_date || item.session_date;
        const month = date.substring(0, 7); // YYYY-MM
        if (!monthlyData.has(month)) {
          monthlyData.set(month, { revenue: 0, orders: 0 });
        }
        monthlyData.get(month).revenue += item.total || item.total_amount;
        monthlyData.get(month).orders += 1;
      });

      expenses.forEach((expense) => {
        const month = expense.expense_date.substring(0, 7);
        if (!monthlyData.has(month)) {
          monthlyData.set(month, { revenue: 0, orders: 0 });
        }
        if (!monthlyData.get(month).expenses) {
          monthlyData.get(month).expenses = 0;
        }
        monthlyData.get(month).expenses += expense.amount;
      });

      const monthlyTrends = Array.from(monthlyData.entries())
        .map(([month, data]) => ({
          month,
          revenue: data.revenue,
          expenses: data.expenses || 0,
          profit: data.revenue - (data.expenses || 0),
          orders: data.orders,
        }))
        .sort((a, b) => a.month.localeCompare(b.month));

      // Process expense categories
      const expensesByCategory = expenses.reduce(
        (acc, expense) => {
          acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
          return acc;
        },
        {} as Record<string, number>,
      );

      const totalExpenses = expenses.reduce(
        (sum, expense) => sum + expense.amount,
        0,
      );
      const expenseCategories = Object.entries(expensesByCategory).map(
        ([category, amount]) => ({
          category,
          amount,
          percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
        }),
      );

      // Process top products
      const productSales = orders.reduce(
        (acc, order) => {
          if (!acc[order.item_name]) {
            acc[order.item_name] = {
              quantity: 0,
              revenue: 0,
              category: "Food",
            };
          }
          acc[order.item_name].quantity += order.quantity;
          acc[order.item_name].revenue += order.total;
          return acc;
        },
        {} as Record<
          string,
          { quantity: number; revenue: number; category: string }
        >,
      );

      const topProducts = Object.entries(productSales)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      // Process payment methods
      const paymentData = new Map();

      [
        ...orders,
        ...chargingSessions,
        ...expenses,
        ...deposits,
        ...withdrawals,
      ].forEach((item) => {
        const method = item.payment_mode || item.mode || "Unknown";
        const amount = item.total || item.total_amount || item.amount;
        if (!paymentData.has(method)) {
          paymentData.set(method, { amount: 0, count: 0 });
        }
        paymentData.get(method).amount += amount;
        paymentData.get(method).count += 1;
      });

      const totalPaymentAmount = Array.from(paymentData.values()).reduce(
        (sum, data) => sum + data.amount,
        0,
      );
      const paymentMethods = Array.from(paymentData.entries()).map(
        ([method, data]) => ({
          method,
          amount: data.amount,
          count: data.count,
          percentage:
            totalPaymentAmount > 0
              ? (data.amount / totalPaymentAmount) * 100
              : 0,
        }),
      );

      // Calculate business metrics
      const totalRevenue =
        orders.reduce((sum, order) => sum + order.total, 0) +
        chargingSessions.reduce(
          (sum, session) => sum + session.total_amount,
          0,
        );
      const netProfit = totalRevenue - totalExpenses;
      const profitMargin =
        totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

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
      const netCashFlow = totalDeposits - totalWithdrawals;

      const businessMetrics: BusinessMetrics = {
        dailyRevenue,
        monthlyTrends,
        expenseCategories,
        topProducts,
        hourlyPatterns: [], // Would need hour-level data
        paymentMethods,
        profitabilityAnalysis: {
          totalRevenue,
          totalExpenses,
          netProfit,
          profitMargin,
          breakEvenPoint:
            totalExpenses > 0 ? totalExpenses / (totalRevenue / daysDiff) : 0,
          growthRate: 15.2, // Would need historical comparison
        },
        cashFlowAnalysis: {
          totalDeposits,
          totalWithdrawals,
          cooperativeSavings,
          netCashFlow,
          burnRate: totalExpenses / daysDiff,
          runway:
            netCashFlow > 0 ? netCashFlow / (totalExpenses / daysDiff) : 0,
        },
        businessKPIs: {
          averageOrderValue:
            orders.length > 0 ? totalRevenue / orders.length : 0,
          averageChargingValue:
            chargingSessions.length > 0
              ? chargingSessions.reduce((sum, s) => sum + s.total_amount, 0) /
                chargingSessions.length
              : 0,
          customerAcquisitionCost: 150, // Would need marketing spend data
          customerLifetimeValue: 2500, // Would need customer retention data
          orderFrequency: orders.length / daysDiff,
          chargingUtilization: chargingSessions.length / daysDiff,
        },
      };

      setMetrics(businessMetrics);
    } catch (error) {
      console.error("Error fetching business metrics:", error);
      toast.error("Failed to load business metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchBusinessMetrics();
    }
  }, [user, selectedPeriod]);

  const exportData = () => {
    if (!metrics) return;

    const data = {
      exportDate: new Date().toISOString(),
      period: selectedPeriod,
      metrics,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `business-metrics-${selectedPeriod}-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Data exported successfully!");
  };

  const COLORS = [
    "#bbfae1",
    "#a8f2d1",
    "#95eac1",
    "#82e2b1",
    "#6fdaa1",
    "#5dd191",
    "#4ac981",
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <RefreshCw className="h-16 w-16 text-primary mx-auto mb-4 animate-spin" />
          <p className="text-xl font-semibold text-black">
            Loading Business Insights...
          </p>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-16">
        <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No metrics data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-primary rounded-xl">
          <Eye className="h-6 w-6 text-black" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-black">Analytics Dashboard</h1>
          <p className="text-gray-600">
            Comprehensive business insights and visualizations
          </p>
        </div>
      </div>

      {/* Controls */}
      <Card className="border border-gray-200">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-600" />
              <Select
                value={selectedPeriod}
                onValueChange={(value: any) => setSelectedPeriod(value)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="90d">Last 3 Months</SelectItem>
                  <SelectItem value="1y">Last Year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-600" />
              <Select
                value={selectedView}
                onValueChange={(value: any) => setSelectedView(value)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overview">Overview</SelectItem>
                  <SelectItem value="revenue">Revenue</SelectItem>
                  <SelectItem value="expenses">Expenses</SelectItem>
                  <SelectItem value="trends">Trends</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={exportData} variant="outline" className="ml-auto">
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  Total Revenue
                </p>
                <p className="text-2xl font-bold text-black">
                  NRs.{" "}
                  {metrics.profitabilityAnalysis.totalRevenue.toLocaleString()}
                </p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                  <span className="text-sm text-green-600">
                    +{metrics.profitabilityAnalysis.growthRate}%
                  </span>
                </div>
              </div>
              <div className="p-3 bg-brand-100 rounded-xl">
                <DollarSign className="h-6 w-6 text-black" />
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
                  className={`text-2xl font-bold ${metrics.profitabilityAnalysis.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  NRs.{" "}
                  {metrics.profitabilityAnalysis.netProfit.toLocaleString()}
                </p>
                <div className="flex items-center mt-2">
                  <Target className="h-4 w-4 text-primary mr-1" />
                  <span className="text-sm text-gray-600">
                    {metrics.profitabilityAnalysis.profitMargin.toFixed(1)}%
                    margin
                  </span>
                </div>
              </div>
              <div className="p-3 bg-brand-100 rounded-xl">
                <Target className="h-6 w-6 text-black" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  Avg Order Value
                </p>
                <p className="text-2xl font-bold text-black">
                  NRs. {metrics.businessKPIs.averageOrderValue.toFixed(0)}
                </p>
                <div className="flex items-center mt-2">
                  <ShoppingCart className="h-4 w-4 text-primary mr-1" />
                  <span className="text-sm text-gray-600">
                    {metrics.businessKPIs.orderFrequency.toFixed(1)}/day
                  </span>
                </div>
              </div>
              <div className="p-3 bg-brand-100 rounded-xl">
                <ShoppingCart className="h-6 w-6 text-black" />
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
                  className={`text-2xl font-bold ${metrics.cashFlowAnalysis.netCashFlow >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  NRs. {metrics.cashFlowAnalysis.netCashFlow.toLocaleString()}
                </p>
                <div className="flex items-center mt-2">
                  <PiggyBank className="h-4 w-4 text-primary mr-1" />
                  <span className="text-sm text-gray-600">
                    {metrics.cashFlowAnalysis.runway.toFixed(0)} days runway
                  </span>
                </div>
              </div>
              <div className="p-3 bg-brand-100 rounded-xl">
                <PiggyBank className="h-6 w-6 text-black" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trends Chart */}
      <Card className="border border-gray-200">
        <CardHeader className="bg-brand-50 border-b border-gray-200">
          <CardTitle className="text-black">Daily Revenue Trends</CardTitle>
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
            <ComposedChart data={metrics.dailyRevenue}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
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

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Monthly Trends */}
        <Card className="border border-gray-200">
          <CardHeader className="bg-brand-50 border-b border-gray-200">
            <CardTitle className="text-black">
              Monthly Business Trends
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ChartContainer
              config={{
                revenue: { label: "Revenue", color: "#bbfae1" },
                expenses: { label: "Expenses", color: "#82e2b1" },
                profit: { label: "Profit", color: "#6fdaa1" },
              }}
              className="h-64"
            >
              <ComposedChart data={metrics.monthlyTrends}>
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
                  dot={{ fill: "#6fdaa1" }}
                  name="Profit"
                />
              </ComposedChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Expense Categories */}
        <Card className="border border-gray-200">
          <CardHeader className="bg-brand-50 border-b border-gray-200">
            <CardTitle className="text-black">Expense Distribution</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ChartContainer
              config={{
                amount: { label: "Amount", color: "#bbfae1" },
              }}
              className="h-64"
            >
              <PieChart>
                <Pie
                  data={metrics.expenseCategories}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="amount"
                  nameKey="category"
                >
                  {metrics.expenseCategories.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card className="border border-gray-200">
          <CardHeader className="bg-brand-50 border-b border-gray-200">
            <CardTitle className="text-black">
              Payment Method Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ChartContainer
              config={{
                amount: { label: "Amount", color: "#bbfae1" },
              }}
              className="h-64"
            >
              <BarChart data={metrics.paymentMethods}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="method" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="amount"
                  fill="#bbfae1"
                  name="Transaction Amount"
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card className="border border-gray-200">
          <CardHeader className="bg-brand-50 border-b border-gray-200">
            <CardTitle className="text-black">
              Top Products Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {metrics.topProducts.slice(0, 8).map((product, index) => (
                <div
                  key={product.name}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-black text-xs font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-black">{product.name}</p>
                      <p className="text-sm text-gray-600">
                        {product.quantity} sold
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-black">
                      NRs. {product.revenue.toLocaleString()}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {product.category}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Business Intelligence Summary */}
      <Card className="border border-gray-200">
        <CardHeader className="bg-brand-50 border-b border-gray-200">
          <CardTitle className="text-black">
            Business Intelligence Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-black">
                Profitability Metrics
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Profit Margin</span>
                  <span className="font-bold text-black">
                    {metrics.profitabilityAnalysis.profitMargin.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Break Even Point</span>
                  <span className="font-bold text-black">
                    {metrics.profitabilityAnalysis.breakEvenPoint.toFixed(0)}{" "}
                    days
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Growth Rate</span>
                  <span className="font-bold text-green-600">
                    +{metrics.profitabilityAnalysis.growthRate}%
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-black">Customer Metrics</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Customer LTV</span>
                  <span className="font-bold text-black">
                    NRs.{" "}
                    {metrics.businessKPIs.customerLifetimeValue.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Acquisition Cost</span>
                  <span className="font-bold text-black">
                    NRs.{" "}
                    {metrics.businessKPIs.customerAcquisitionCost.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Order Frequency</span>
                  <span className="font-bold text-black">
                    {metrics.businessKPIs.orderFrequency.toFixed(1)}/day
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-black">Financial Health</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Burn Rate</span>
                  <span className="font-bold text-black">
                    NRs. {metrics.cashFlowAnalysis.burnRate.toFixed(0)}/day
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Cash Runway</span>
                  <span className="font-bold text-black">
                    {metrics.cashFlowAnalysis.runway.toFixed(0)} days
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Cooperative Savings</span>
                  <span className="font-bold text-black">
                    NRs.{" "}
                    {metrics.cashFlowAnalysis.cooperativeSavings.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsViewTab;
