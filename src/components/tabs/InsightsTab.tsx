import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Activity,
  Zap,
  ShoppingBag,
  CreditCard,
  PiggyBank,
  UtensilsCrossed,
  Receipt,
  Wallet,
  Target,
  ArrowUp,
  ArrowDown,
  Percent,
  Calculator,
  Eye,
} from "lucide-react";

interface AnalyticsData {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  ordersCount: number;
  chargingSessions: number;
  totalDeposits: number;
  totalWithdrawals: number;
  cooperativeSavings: number;
  breakEvenPoint: number;
  profitMargin: number;
  fixedCosts: number;
  variableCostRatio: number;
  staticExpenses: number;
  recurringExpenses: number;
  topSellingItems: Array<{ name: string; quantity: number; revenue: number }>;
  categoryBreakdown: Record<string, number>;
  menuCategoryAnalysis: Record<
    string,
    { revenue: number; quantity: number; orders: number }
  >;
  paymentMethodAnalysis: {
    orders: Record<string, { count: number; revenue: number }>;
    charging: Record<string, { count: number; revenue: number }>;
    expenses: Record<string, { count: number; amount: number }>;
    overall: Record<string, { count: number; amount: number }>;
  };
  expenseCategoryAnalysis: Record<
    string,
    {
      amount: number;
      count: number;
      percentage: number;
      paymentModes: Record<string, number>;
    }
  >;
  dailyAverage: {
    revenue: number;
    orders: number;
    chargingSessions: number;
  };
  monthlyGrowth: {
    revenue: number;
    orders: number;
  };
  cashBalance: number;
  esewaBalance: number;
  fonepayBalance: number;
  cooperativeBalance: number;
}

const InsightsTab = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch all data in parallel
      const [
        ordersData,
        chargingData,
        expensesData,
        depositsData,
        withdrawalsData,
        cooperativeData,
      ] = await Promise.all([
        supabase.from("orders").select("*").eq("user_id", user!.id),
        supabase.from("charging_sessions").select("*").eq("user_id", user!.id),
        supabase.from("expenses").select("*").eq("user_id", user!.id),
        supabase.from("deposits").select("*").eq("user_id", user!.id),
        supabase.from("withdrawals").select("*").eq("user_id", user!.id),
        supabase
          .from("cooperative_savings")
          .select("*")
          .eq("user_id", user!.id),
      ]);

      const orders = ordersData.data || [];
      const chargingSessions = chargingData.data || [];
      const expenses = expensesData.data || [];
      const deposits = depositsData.data || [];
      const withdrawals = withdrawalsData.data || [];
      const cooperative = cooperativeData.data || [];

      // Calculate analytics
      const totalRevenue =
        orders.reduce((sum, order) => sum + order.total, 0) +
        chargingSessions.reduce(
          (sum, session) => sum + session.total_amount,
          0,
        );
      const totalExpenses = expenses.reduce(
        (sum, expense) => sum + expense.amount,
        0,
      );
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

      const netProfit = totalRevenue - totalExpenses;
      const profitMargin =
        totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

      // Top selling items
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

      // Calculate payment method analysis
      const paymentMethodAnalysis = {
        orders: {} as Record<string, { count: number; revenue: number }>,
        charging: {} as Record<string, { count: number; revenue: number }>,
        expenses: {} as Record<string, { count: number; amount: number }>,
        overall: {} as Record<string, { count: number; amount: number }>,
      };

      // Expense category analysis
      const expenseCategoryAnalysis = expenses.reduce(
        (acc, expense) => {
          if (!acc[expense.category]) {
            acc[expense.category] = {
              amount: 0,
              count: 0,
              percentage: 0,
              paymentModes: {},
            };
          }
          acc[expense.category].amount += expense.amount;
          acc[expense.category].count += 1;
          return acc;
        },
        {} as Record<string, any>,
      );

      // Calculate balances
      const cashTransactions = [
        ...orders.filter((o) => o.payment_mode === "Cash"),
        ...chargingSessions.filter((c) => c.payment_mode === "Cash"),
        ...deposits.filter((d) => d.payment_mode === "Cash"),
      ];
      const cashBalance =
        cashTransactions.reduce(
          (sum, t) => sum + (t.total || t.total_amount || t.amount),
          0,
        ) -
        withdrawals
          .filter((w) => w.payment_mode === "Cash")
          .reduce((sum, w) => sum + w.amount, 0) -
        expenses
          .filter((e) => e.payment_mode === "Cash")
          .reduce((sum, e) => sum + e.amount, 0);

      setAnalytics({
        totalRevenue,
        totalExpenses,
        netProfit,
        ordersCount: orders.length,
        chargingSessions: chargingSessions.length,
        totalDeposits,
        totalWithdrawals,
        cooperativeSavings,
        breakEvenPoint: 0,
        profitMargin,
        fixedCosts: 0,
        variableCostRatio: 0,
        staticExpenses: 0,
        recurringExpenses: 0,
        topSellingItems,
        categoryBreakdown: {},
        menuCategoryAnalysis: {},
        paymentMethodAnalysis,
        expenseCategoryAnalysis,
        dailyAverage: {
          revenue: totalRevenue / 30,
          orders: orders.length / 30,
          chargingSessions: chargingSessions.length / 30,
        },
        monthlyGrowth: {
          revenue: 0,
          orders: 0,
        },
        cashBalance,
        esewaBalance: 0,
        fonepayBalance: 0,
        cooperativeBalance: cooperativeSavings,
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <BarChart3 className="h-16 w-16 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading analytics...</p>
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-primary rounded-xl">
          <BarChart3 className="h-6 w-6 text-black" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-black">Business Analytics</h1>
          <p className="text-gray-600">
            Comprehensive insights into your business performance
          </p>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  Total Revenue
                </p>
                <p className="text-2xl font-bold text-black">
                  NRs. {analytics.totalRevenue.toLocaleString()}
                </p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                  <span className="text-sm text-green-600">+12.5%</span>
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
                <p className="text-sm text-gray-600 font-medium">
                  Total Expenses
                </p>
                <p className="text-2xl font-bold text-black">
                  NRs. {analytics.totalExpenses.toLocaleString()}
                </p>
                <div className="flex items-center mt-2">
                  <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
                  <span className="text-sm text-red-600">-3.2%</span>
                </div>
              </div>
              <div className="p-3 bg-brand-100 rounded-xl">
                <Receipt className="h-6 w-6 text-black" />
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
                  className={`text-2xl font-bold ${analytics.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  NRs. {analytics.netProfit.toLocaleString()}
                </p>
                <div className="flex items-center mt-2">
                  {analytics.netProfit >= 0 ? (
                    <ArrowUp className="h-4 w-4 text-green-600 mr-1" />
                  ) : (
                    <ArrowDown className="h-4 w-4 text-red-600 mr-1" />
                  )}
                  <span
                    className={`text-sm ${analytics.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {analytics.profitMargin.toFixed(1)}%
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
                  Total Orders
                </p>
                <p className="text-2xl font-bold text-black">
                  {analytics.ordersCount.toLocaleString()}
                </p>
                <div className="flex items-center mt-2">
                  <Activity className="h-4 w-4 text-primary mr-1" />
                  <span className="text-sm text-gray-600">
                    {analytics.dailyAverage.orders.toFixed(1)} avg/day
                  </span>
                </div>
              </div>
              <div className="p-3 bg-brand-100 rounded-xl">
                <ShoppingBag className="h-6 w-6 text-black" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border border-gray-200">
          <CardHeader className="bg-brand-50 border-b border-gray-200">
            <CardTitle className="flex items-center gap-3 text-black">
              <div className="p-2 bg-primary rounded-lg">
                <Wallet className="h-5 w-5 text-black" />
              </div>
              Financial Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 font-medium">
                    Cash Balance
                  </p>
                  <p className="text-xl font-bold text-black">
                    NRs. {analytics.cashBalance.toLocaleString()}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 font-medium">
                    Cooperative Savings
                  </p>
                  <p className="text-xl font-bold text-black">
                    NRs. {analytics.cooperativeSavings.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">
                    Profit Margin
                  </span>
                  <span
                    className={`font-bold ${analytics.profitMargin >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {analytics.profitMargin.toFixed(1)}%
                  </span>
                </div>
                <Progress
                  value={Math.max(
                    0,
                    Math.min(100, analytics.profitMargin + 50),
                  )}
                  className="h-3"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardHeader className="bg-brand-50 border-b border-gray-200">
            <CardTitle className="flex items-center gap-3 text-black">
              <div className="p-2 bg-primary rounded-lg">
                <UtensilsCrossed className="h-5 w-5 text-black" />
              </div>
              Top Performing Items
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {analytics.topSellingItems.length === 0 ? (
              <div className="text-center py-8">
                <UtensilsCrossed className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">No sales data available</p>
              </div>
            ) : (
              <div className="space-y-4">
                {analytics.topSellingItems.map((item, index) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-primary text-black rounded-full text-sm font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-black">{item.name}</p>
                        <p className="text-sm text-gray-600">
                          {item.quantity} orders
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-black">
                        NRs. {item.revenue.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">revenue</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expense Analysis */}
      <Card className="border border-gray-200">
        <CardHeader className="bg-brand-50 border-b border-gray-200">
          <CardTitle className="flex items-center gap-3 text-black">
            <div className="p-2 bg-primary rounded-lg">
              <Calculator className="h-5 w-5 text-black" />
            </div>
            Expense Category Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {Object.keys(analytics.expenseCategoryAnalysis).length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No expense data available</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(analytics.expenseCategoryAnalysis).map(
                ([category, data]) => (
                  <div
                    key={category}
                    className="p-4 bg-gray-50 rounded-lg border border-gray-100"
                  >
                    <h4 className="font-semibold text-black mb-2">
                      {category}
                    </h4>
                    <p className="text-lg font-bold text-black mb-1">
                      NRs. {data.amount.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      {data.count} transactions
                    </p>
                  </div>
                ),
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InsightsTab;
