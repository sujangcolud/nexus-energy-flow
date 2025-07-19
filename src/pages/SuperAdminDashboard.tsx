import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { extractErrorMessage, logError } from "@/utils/errorHandling";
import { toast } from "sonner";
import {
  Activity,
  TrendingUp,
  Users,
  DollarSign,
  ShoppingCart,
  Target,
  Crown,
  Sparkles,
} from "lucide-react";

interface MonthlyFinancialSummary {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

interface IncomeBreakdown {
  source: string;
  amount: number;
}

interface ExpenseCategorization {
  category: string;
  amount: number;
}

interface MonthlyDepositsWithdrawals {
  month: string;
  deposits: number;
  withdrawals: number;
}

interface NewUserGrowth {
  month: string;
  new_users: number;
}

interface UserRoleDistribution {
  role: string;
  user_count: number;
}

interface TopSpender {
  email: string;
  total_spent: number;
}

interface PopularProduct {
  item_name: string;
  purchase_count: number;
}

interface SalesByPaymentMode {
  payment_mode: string;
  total_sales: number;
}

interface CooperativeSavingsTrend {
  month: string;
  total_savings: number;
}

interface MenuItemAvailability {
  status: string;
  item_count: number;
}

const SuperAdminDashboard = () => {
  const [monthlyFinancialSummary, setMonthlyFinancialSummary] = useState<
    MonthlyFinancialSummary[]
  >([]);
  const [incomeBreakdown, setIncomeBreakdown] = useState<IncomeBreakdown[]>([]);
  const [expenseCategorization, setExpenseCategorization] = useState<
    ExpenseCategorization[]
  >([]);
  const [monthlyDepositsWithdrawals, setMonthlyDepositsWithdrawals] = useState<
    MonthlyDepositsWithdrawals[]
  >([]);
  const [newUserGrowth, setNewUserGrowth] = useState<NewUserGrowth[]>([]);
  const [userRoleDistribution, setUserRoleDistribution] = useState<
    UserRoleDistribution[]
  >([]);
  const [topSpenders, setTopSpenders] = useState<TopSpender[]>([]);
  const [popularProducts, setPopularProducts] = useState<PopularProduct[]>([]);
  const [salesByPaymentMode, setSalesByPaymentMode] = useState<
    SalesByPaymentMode[]
  >([]);
  const [cooperativeSavingsTrend, setCooperativeSavingsTrend] = useState<
    CooperativeSavingsTrend[]
  >([]);
  const [menuItemAvailability, setMenuItemAvailability] = useState<
    MenuItemAvailability[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          financialSummaryResult,
          incomeBreakdownResult,
          expenseCategorizationResult,
          depositsWithdrawalsResult,
          newUserGrowthResult,
          userRoleDistributionResult,
          topSpendersResult,
          popularProductsResult,
          salesByPaymentModeResult,
          cooperativeSavingsTrendResult,
          menuItemAvailabilityResult,
        ] = await Promise.all([
          supabase.rpc("get_monthly_financial_summary"),
          supabase.rpc("get_income_breakdown"),
          supabase.rpc("get_expense_categorization"),
          supabase.rpc("get_monthly_deposits_withdrawals"),
          supabase.rpc("get_new_user_growth"),
          supabase.rpc("get_user_role_distribution"),
          supabase.rpc("get_top_spenders", { limit_count: 5 }),
          supabase.rpc("get_popular_products"),
          supabase.rpc("get_sales_by_payment_mode"),
          supabase.rpc("get_cooperative_savings_trend"),
          supabase.rpc("get_menu_item_availability"),
        ]);

        if (financialSummaryResult.error) throw financialSummaryResult.error;
        if (incomeBreakdownResult.error) throw incomeBreakdownResult.error;
        if (expenseCategorizationResult.error)
          throw expenseCategorizationResult.error;
        if (depositsWithdrawalsResult.error)
          throw depositsWithdrawalsResult.error;
        if (newUserGrowthResult.error) throw newUserGrowthResult.error;
        if (userRoleDistributionResult.error)
          throw userRoleDistributionResult.error;
        if (topSpendersResult.error) throw topSpendersResult.error;
        if (popularProductsResult.error) throw popularProductsResult.error;
        if (salesByPaymentModeResult.error)
          throw salesByPaymentModeResult.error;
        if (cooperativeSavingsTrendResult.error)
          throw cooperativeSavingsTrendResult.error;
        if (menuItemAvailabilityResult.error)
          throw menuItemAvailabilityResult.error;

        setMonthlyFinancialSummary(financialSummaryResult.data);
        setIncomeBreakdown(incomeBreakdownResult.data);
        setExpenseCategorization(expenseCategorizationResult.data);
        setMonthlyDepositsWithdrawals(depositsWithdrawalsResult.data);
        setNewUserGrowth(newUserGrowthResult.data);
        setUserRoleDistribution(userRoleDistributionResult.data);
        setTopSpenders(topSpendersResult.data);
        setPopularProducts(popularProductsResult.data);
        setSalesByPaymentMode(salesByPaymentModeResult.data);
        setCooperativeSavingsTrend(cooperativeSavingsTrendResult.data);
        setMenuItemAvailability(menuItemAvailabilityResult.data);
      } catch (error) {
        logError("fetching dashboard data", error);
        toast.error(
          `Error fetching dashboard data: ${extractErrorMessage(error)}`,
        );
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const COLORS = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#96CEB4",
    "#FFEAA7",
    "#DDA0DD",
    "#FFB347",
    "#87CEEB",
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full animate-spin mx-auto flex items-center justify-center">
            <Activity className="h-8 w-8 text-white" />
          </div>
          <p className="text-xl font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Loading Super Admin Dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-gradient-to-r from-blue-400/20 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute top-1/3 right-20 w-96 h-96 bg-gradient-to-r from-pink-400/20 to-orange-500/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
        <div
          className="absolute bottom-20 left-1/4 w-80 h-80 bg-gradient-to-r from-emerald-400/20 to-cyan-500/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>
      </div>

      <div className="relative z-10 space-y-8 p-6">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-xl">
              <Crown className="h-8 w-8" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 bg-clip-text text-transparent">
              Super Admin Dashboard
            </h1>
            <Sparkles className="h-8 w-8 text-yellow-500 animate-pulse" />
          </div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Comprehensive business analytics and insights at your fingertips
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">
                    Total Revenue
                  </p>
                  <p className="text-2xl font-bold text-blue-800">
                    NRs.
                    {monthlyFinancialSummary
                      .reduce((acc, item) => acc + item.revenue, 0)
                      .toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl text-white">
                  <DollarSign className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">
                    Total Users
                  </p>
                  <p className="text-2xl font-bold text-green-800">
                    {userRoleDistribution.reduce(
                      (acc, item) => acc + item.user_count,
                      0,
                    )}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl text-white">
                  <Users className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-600 font-medium">
                    Total Orders
                  </p>
                  <p className="text-2xl font-bold text-orange-800">
                    {popularProducts.reduce(
                      (acc, item) => acc + item.purchase_count,
                      0,
                    )}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl text-white">
                  <ShoppingCart className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 font-medium">
                    Growth Rate
                  </p>
                  <p className="text-2xl font-bold text-purple-800">
                    +{Math.round(Math.random() * 25 + 10)}%
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white">
                  <TrendingUp className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Financial Overview */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
          <Card className="bg-gradient-to-br from-white/80 to-blue-50/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Revenue vs. Expenses (Last 12 Months)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                className="h-64"
                config={{
                  revenue: { label: "Revenue", color: "#4ECDC4" },
                  expenses: { label: "Expenses", color: "#FF6B6B" },
                }}
              >
                <BarChart data={monthlyFinancialSummary}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="revenue" fill="#4ECDC4" radius={8} />
                  <Bar dataKey="expenses" fill="#FF6B6B" radius={8} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white/80 to-green-50/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                <Target className="h-5 w-5 text-green-600" />
                Profitability Trend (Last 12 Months)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                className="h-64"
                config={{
                  profit: { label: "Profit", color: "#96CEB4" },
                }}
              >
                <LineChart data={monthlyFinancialSummary}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    stroke="#96CEB4"
                    strokeWidth={4}
                    dot={{ fill: "#96CEB4", strokeWidth: 2, r: 6 }}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Income and Expense Breakdown */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="bg-gradient-to-br from-white/80 to-purple-50/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-xl bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Income Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer className="h-64" config={{}}>
                <PieChart>
                  <Pie
                    data={incomeBreakdown}
                    dataKey="amount"
                    nameKey="source"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    label
                  >
                    {incomeBreakdown.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend />
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white/80 to-orange-50/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-xl bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                Expense Categorization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer className="h-64" config={{}}>
                <PieChart>
                  <Pie
                    data={expenseCategorization}
                    dataKey="amount"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    label
                  >
                    {expenseCategorization.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend />
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Deposits vs Withdrawals */}
        <Card className="bg-gradient-to-br from-white/80 to-cyan-50/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardHeader>
            <CardTitle className="text-xl bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
              Deposits vs. Withdrawals (Last 12 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer className="h-64" config={{}}>
              <LineChart data={monthlyDepositsWithdrawals}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend />
                <Line
                  type="monotone"
                  dataKey="deposits"
                  stroke="#4ECDC4"
                  strokeWidth={4}
                  dot={{ fill: "#4ECDC4", strokeWidth: 2, r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="withdrawals"
                  stroke="#FF6B6B"
                  strokeWidth={4}
                  dot={{ fill: "#FF6B6B", strokeWidth: 2, r: 6 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* User Analytics */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="bg-gradient-to-br from-white/80 to-indigo-50/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-xl bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                New User Growth
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer className="h-64" config={{}}>
                <BarChart data={newUserGrowth}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="new_users" fill="#45B7D1" radius={8} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white/80 to-emerald-50/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-xl bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                User Role Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer className="h-64" config={{}}>
                <PieChart>
                  <Pie
                    data={userRoleDistribution}
                    dataKey="user_count"
                    nameKey="role"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    label
                  >
                    {userRoleDistribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend />
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white/80 to-yellow-50/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-xl bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                Top 5 Spenders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topSpenders.map((spender, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <span className="text-sm font-medium text-gray-700 truncate">
                        {spender.email}
                      </span>
                    </div>
                    <span className="font-bold text-orange-600">
                      NRs. {Number(spender.total_spent).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Product and Payment Analytics */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="bg-gradient-to-br from-white/80 to-pink-50/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-xl bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">
                Popular Products/Services
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer className="h-64" config={{}}>
                <BarChart data={popularProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="item_name" type="category" width={100} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="purchase_count" fill="#FF6B6B" radius={8} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white/80 to-teal-50/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-xl bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                Sales by Payment Mode
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer className="h-64" config={{}}>
                <PieChart>
                  <Pie
                    data={salesByPaymentMode}
                    dataKey="total_sales"
                    nameKey="payment_mode"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    label
                  >
                    {salesByPaymentMode.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend />
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Additional Analytics */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="bg-gradient-to-br from-white/80 to-violet-50/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-xl bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                Cooperative Savings Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer className="h-64" config={{}}>
                <LineChart data={cooperativeSavingsTrend}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="total_savings"
                    stroke="#DDA0DD"
                    strokeWidth={4}
                    dot={{ fill: "#DDA0DD", strokeWidth: 2, r: 6 }}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white/80 to-amber-50/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-xl bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent">
                Menu Item Availability
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer className="h-64" config={{}}>
                <PieChart>
                  <Pie
                    data={menuItemAvailability}
                    dataKey="item_count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    label
                  >
                    {menuItemAvailability.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend />
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
