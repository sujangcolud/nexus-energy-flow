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
import {
  Activity,
  TrendingUp,
  Users,
  DollarSign,
  ShoppingCart,
  Target,
  Crown,
  BarChart3,
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
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);

      // Fetch all dashboard data
      const { data: dashboardData, error } = await supabase.rpc(
        "get_dashboard_stats",
      );

      if (error) {
        console.error("Error fetching dashboard data:", error);
        return;
      }

      if (dashboardData && dashboardData.length > 0) {
        const data = dashboardData[0];
        setMonthlyFinancialSummary(data.monthly_financial_summary || []);
        setIncomeBreakdown(data.income_breakdown || []);
        setExpenseCategorization(data.expense_categorization || []);
        setMonthlyDepositsWithdrawals(data.monthly_deposits_withdrawals || []);
        setNewUserGrowth(data.new_user_growth || []);
        setUserRoleDistribution(data.user_role_distribution || []);
        setTopSpenders(data.top_spenders || []);
        setPopularProducts(data.popular_products || []);
        setSalesByPaymentMode(data.sales_by_payment_mode || []);
        setCooperativeSavingsTrend(data.cooperative_savings_trend || []);
        setMenuItemAvailability(data.menu_item_availability || []);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Professional color scheme
  const COLORS = ["#bbfae1", "#a8f2d1", "#95eac1", "#82e2b1", "#6fdaa1"];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-primary rounded-full animate-spin mx-auto flex items-center justify-center">
            <Activity className="h-8 w-8 text-black" />
          </div>
          <p className="text-xl font-semibold text-black">
            Loading Dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="space-y-8 p-6">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-4 rounded-xl bg-primary">
              <BarChart3 className="h-8 w-8 text-black" />
            </div>
            <h1 className="text-4xl font-bold text-black">
              Dashboard Analytics
            </h1>
          </div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Comprehensive business insights and performance metrics
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">
                    Total Revenue
                  </p>
                  <p className="text-2xl font-bold text-black">
                    NRs.{" "}
                    {monthlyFinancialSummary
                      .reduce((acc, item) => acc + item.revenue, 0)
                      .toLocaleString()}
                  </p>
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
                  <p className="text-sm text-gray-600 font-medium">
                    Total Users
                  </p>
                  <p className="text-2xl font-bold text-black">
                    {userRoleDistribution.reduce(
                      (acc, item) => acc + item.user_count,
                      0,
                    )}
                  </p>
                </div>
                <div className="p-3 bg-brand-100 rounded-xl">
                  <Users className="h-6 w-6 text-black" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">
                    Total Orders
                  </p>
                  <p className="text-2xl font-bold text-black">
                    {popularProducts.reduce(
                      (acc, item) => acc + item.purchase_count,
                      0,
                    )}
                  </p>
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
                  <p className="text-sm text-gray-600 font-medium">
                    Profit Margin
                  </p>
                  <p className="text-2xl font-bold text-black">
                    {monthlyFinancialSummary.length > 0
                      ? (
                          (monthlyFinancialSummary.reduce(
                            (acc, item) => acc + item.profit,
                            0,
                          ) /
                            monthlyFinancialSummary.reduce(
                              (acc, item) => acc + item.revenue,
                              0,
                            )) *
                          100
                        ).toFixed(1)
                      : 0}
                    %
                  </p>
                </div>
                <div className="p-3 bg-brand-100 rounded-xl">
                  <Target className="h-6 w-6 text-black" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Monthly Financial Summary */}
          <Card className="border border-gray-200">
            <CardHeader className="bg-brand-50 border-b border-gray-200">
              <CardTitle className="text-black">
                Monthly Financial Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ChartContainer
                config={{
                  revenue: {
                    label: "Revenue",
                    color: "#bbfae1",
                  },
                  expenses: {
                    label: "Expenses",
                    color: "#95eac1",
                  },
                  profit: {
                    label: "Profit",
                    color: "#6fdaa1",
                  },
                }}
                className="h-64"
              >
                <BarChart data={monthlyFinancialSummary}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="revenue" name="Revenue" fill="#bbfae1" />
                  <Bar dataKey="expenses" name="Expenses" fill="#95eac1" />
                  <Bar dataKey="profit" name="Profit" fill="#6fdaa1" />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Income Breakdown */}
          <Card className="border border-gray-200">
            <CardHeader className="bg-brand-50 border-b border-gray-200">
              <CardTitle className="text-black">Income Sources</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ChartContainer
                config={{
                  amount: {
                    label: "Amount",
                    color: "#bbfae1",
                  },
                }}
                className="h-64"
              >
                <PieChart>
                  <Pie
                    data={incomeBreakdown}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="amount"
                    nameKey="source"
                  >
                    {incomeBreakdown.map((entry, index) => (
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

          {/* User Growth */}
          <Card className="border border-gray-200">
            <CardHeader className="bg-brand-50 border-b border-gray-200">
              <CardTitle className="text-black">User Growth</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ChartContainer
                config={{
                  new_users: {
                    label: "New Users",
                    color: "#bbfae1",
                  },
                }}
                className="h-64"
              >
                <LineChart data={newUserGrowth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="new_users"
                    stroke="#bbfae1"
                    strokeWidth={3}
                    dot={{ fill: "#bbfae1", strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Expense Categories */}
          <Card className="border border-gray-200">
            <CardHeader className="bg-brand-50 border-b border-gray-200">
              <CardTitle className="text-black">Expense Categories</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ChartContainer
                config={{
                  amount: {
                    label: "Amount",
                    color: "#bbfae1",
                  },
                }}
                className="h-64"
              >
                <PieChart>
                  <Pie
                    data={expenseCategorization}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="amount"
                    nameKey="category"
                  >
                    {expenseCategorization.map((entry, index) => (
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
        </div>

        {/* Additional insights can be added here */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Top Products */}
          <Card className="border border-gray-200">
            <CardHeader className="bg-brand-50 border-b border-gray-200">
              <CardTitle className="text-black">Popular Products</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {popularProducts.slice(0, 5).map((product, index) => (
                  <div
                    key={product.item_name}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-black font-bold text-sm">
                        {index + 1}
                      </div>
                      <span className="font-medium text-black">
                        {product.item_name}
                      </span>
                    </div>
                    <span className="font-bold text-black">
                      {product.purchase_count} sales
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Spenders */}
          <Card className="border border-gray-200">
            <CardHeader className="bg-brand-50 border-b border-gray-200">
              <CardTitle className="text-black">Top Customers</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {topSpenders.slice(0, 5).map((spender, index) => (
                  <div
                    key={spender.email}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-black font-bold text-sm">
                        {index + 1}
                      </div>
                      <span className="font-medium text-black">
                        {spender.email}
                      </span>
                    </div>
                    <span className="font-bold text-black">
                      NRs. {spender.total_spent.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
