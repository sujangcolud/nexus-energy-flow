import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import FinancialInsightsWidget from "@/components/FinancialInsightsWidget";
import { Button } from "@/components/ui/button";
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
  Sparkles,
  Crown,
  Star,
  ArrowUp,
  ArrowDown,
  Percent,
  Calculator,
  Eye,
  RefreshCw,
  Database,
  Calendar,
  TrendingDown as Esewa,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subDays, parseISO } from "date-fns";
import { toast } from "sonner";
import { extractErrorMessage, logError } from "@/utils/errorHandling";

interface DailySummaryData {
  id: number;
  summary_date: string;
  total_income: number;
  total_income_from_orders: number;
  total_income_from_charging: number;
  total_income_cash: number;
  total_income_esewa: number;
  total_income_fonepay: number;
  total_expenses: number;
  total_deposits: number;
  total_withdrawals: number;
  total_savings: number;
  cash_balance: number;
  esewa_balance: number;
  fonepay_balance: number;
  total_balance: number;
  created_at: string;
  updated_at: string;
}

interface AnalyticsData {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  totalDeposits: number;
  totalWithdrawals: number;
  cooperativeSavings: number;
  breakEvenPoint: number;
  profitMargin: number;
  cashBalance: number;
  esewaBalance: number;
  fonepayBalance: number;
  cooperativeBalance: number;

  // Enhanced metrics from daily summary
  totalIncomeFromOrders: number;
  totalIncomeFromCharging: number;
  averageDailyRevenue: number;
  averageDailyExpenses: number;
  averageDailyProfit: number;

  // Trends and comparisons
  weeklyTrend: {
    date: string;
    income: number;
    expenses: number;
    profit: number;
  }[];
  monthlyComparison: {
    thisMonth: number;
    lastMonth: number;
    growth: number;
  };

  // Payment method analysis from daily summaries
  paymentMethodBreakdown: {
    cash: number;
    esewa: number;
    fonepay: number;
  };
}

const EnhancedInsightsTab = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [dailySummaries, setDailySummaries] = useState<DailySummaryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchAnalyticsFromDailySummary();
    }
  }, [user]);

  const fetchAnalyticsFromDailySummary = async () => {
    setLoading(true);
    try {
      console.log("📊 Fetching analytics from daily_summary table...");

      // Fetch daily summaries for analysis (last 90 days)
      const { data: summariesData, error } = await supabase
        .from("daily_summary")
        .select("*")
        .order("summary_date", { ascending: false })
        .limit(90);

      if (error) {
        logError("fetching daily summaries for insights", error);
        throw error;
      }

      const summaries = summariesData || [];
      setDailySummaries(summaries);

      if (summaries.length === 0) {
        // If no daily summaries exist, show empty state
        setAnalytics({
          totalRevenue: 0,
          totalExpenses: 0,
          netProfit: 0,
          totalDeposits: 0,
          totalWithdrawals: 0,
          cooperativeSavings: 0,
          breakEvenPoint: 0,
          profitMargin: 0,
          cashBalance: 0,
          esewaBalance: 0,
          fonepayBalance: 0,
          cooperativeBalance: 0,
          totalIncomeFromOrders: 0,
          totalIncomeFromCharging: 0,
          averageDailyRevenue: 0,
          averageDailyExpenses: 0,
          averageDailyProfit: 0,
          weeklyTrend: [],
          monthlyComparison: { thisMonth: 0, lastMonth: 0, growth: 0 },
          paymentMethodBreakdown: { cash: 0, esewa: 0, fonepay: 0 },
        });
        return;
      }

      // Calculate comprehensive analytics from daily summaries
      const analyticsData = calculateAnalyticsFromSummaries(summaries);
      setAnalytics(analyticsData);

      console.log("✅ Analytics calculated from daily_summary:", analyticsData);
    } catch (error) {
      logError("calculating analytics from daily summary", error);
      toast.error(`Error loading analytics: ${extractErrorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalyticsFromSummaries = (
    summaries: DailySummaryData[],
  ): AnalyticsData => {
    // Overall totals
    const totalRevenue = summaries.reduce(
      (sum, s) => sum + (s.total_income || 0),
      0,
    );
    const totalExpenses = summaries.reduce(
      (sum, s) => sum + (s.total_expenses || 0),
      0,
    );
    const totalDeposits = summaries.reduce(
      (sum, s) => sum + (s.total_deposits || 0),
      0,
    );
    const totalWithdrawals = summaries.reduce(
      (sum, s) => sum + (s.total_withdrawals || 0),
      0,
    );
    const cooperativeSavings = summaries.reduce(
      (sum, s) => sum + (s.total_savings || 0),
      0,
    );
    const totalIncomeFromOrders = summaries.reduce(
      (sum, s) => sum + (s.total_income_from_orders || 0),
      0,
    );
    const totalIncomeFromCharging = summaries.reduce(
      (sum, s) => sum + (s.total_income_from_charging || 0),
      0,
    );

    const netProfit = totalRevenue - totalExpenses;
    const profitMargin =
      totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Get latest balances from most recent summary
    const latestSummary = summaries[0] || {};
    const cashBalance = latestSummary.cash_balance || 0;
    const esewaBalance = latestSummary.esewa_balance || 0;
    const fonepayBalance = latestSummary.fonepay_balance || 0;
    const cooperativeBalance = 0; // This would need to be added to daily_summary schema

    // Averages
    const daysCount = summaries.length || 1;
    const averageDailyRevenue = totalRevenue / daysCount;
    const averageDailyExpenses = totalExpenses / daysCount;
    const averageDailyProfit = netProfit / daysCount;

    // Weekly trend (last 7 days)
    const weeklyTrend = summaries
      .slice(0, 7)
      .reverse()
      .map((summary) => ({
        date: summary.summary_date,
        income: summary.total_income || 0,
        expenses: summary.total_expenses || 0,
        profit: (summary.total_income || 0) - (summary.total_expenses || 0),
      }));

    // Monthly comparison
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const lastMonthStart = startOfMonth(subDays(thisMonthStart, 1));
    const lastMonthEnd = endOfMonth(subDays(thisMonthStart, 1));

    const thisMonthSummaries = summaries.filter((s) => {
      const date = parseISO(s.summary_date);
      return date >= thisMonthStart;
    });

    const lastMonthSummaries = summaries.filter((s) => {
      const date = parseISO(s.summary_date);
      return date >= lastMonthStart && date <= lastMonthEnd;
    });

    const thisMonthRevenue = thisMonthSummaries.reduce(
      (sum, s) => sum + (s.total_income || 0),
      0,
    );
    const lastMonthRevenue = lastMonthSummaries.reduce(
      (sum, s) => sum + (s.total_income || 0),
      0,
    );
    const monthlyGrowth =
      lastMonthRevenue > 0
        ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
        : 0;

    // Payment method breakdown
    const paymentMethodBreakdown = {
      cash: summaries.reduce((sum, s) => sum + (s.total_income_cash || 0), 0),
      esewa: summaries.reduce((sum, s) => sum + (s.total_income_esewa || 0), 0),
      fonepay: summaries.reduce(
        (sum, s) => sum + (s.total_income_fonepay || 0),
        0,
      ),
    };

    // Break-even calculation
    const breakEvenPoint =
      averageDailyExpenses > 0 ? averageDailyRevenue / averageDailyExpenses : 0;

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      totalDeposits,
      totalWithdrawals,
      cooperativeSavings,
      breakEvenPoint,
      profitMargin,
      cashBalance,
      esewaBalance,
      fonepayBalance,
      cooperativeBalance,
      totalIncomeFromOrders,
      totalIncomeFromCharging,
      averageDailyRevenue,
      averageDailyExpenses,
      averageDailyProfit,
      weeklyTrend,
      monthlyComparison: {
        thisMonth: thisMonthRevenue,
        lastMonth: lastMonthRevenue,
        growth: monthlyGrowth,
      },
      paymentMethodBreakdown,
    };
  };

  const refreshAnalytics = async () => {
    setRefreshing(true);
    try {
      await fetchAnalyticsFromDailySummary();
      toast.success("Analytics refreshed from daily summaries!");
    } catch (error) {
      toast.error("Failed to refresh analytics");
    } finally {
      setRefreshing(false);
    }
  };

  const formatCurrency = (amount: number) => `NRs. ${amount.toFixed(2)}`;
  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">
            Loading analytics from daily summaries...
          </p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <Card className="p-8 max-w-md">
          <CardContent className="text-center">
            <Database className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Analytics Data</h3>
            <p className="text-gray-600 mb-4">
              No daily summaries found. Analytics will be available after daily
              closing is performed.
            </p>
            <Button onClick={refreshAnalytics} disabled={refreshing}>
              <RefreshCw
                className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-64 h-64 bg-gradient-to-r from-blue-400/20 to-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute top-1/3 right-20 w-80 h-80 bg-gradient-to-r from-purple-400/20 to-pink-500/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
        <div
          className="absolute bottom-20 left-1/4 w-72 h-72 bg-gradient-to-r from-pink-400/20 to-blue-500/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>
      </div>

      <div className="relative z-10 space-y-8 p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-xl">
              <BarChart3 className="h-8 w-8" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Business Analytics
            </h1>
            <Sparkles className="h-8 w-8 text-purple-500 animate-bounce" />
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Comprehensive insights powered by daily summary data
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              <Database className="h-3 w-3 mr-1" />
              Daily Summary Data
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshAnalytics}
              disabled={refreshing}
              className="ml-2"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Revenue */}
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">
                    Total Revenue
                  </p>
                  <p className="text-2xl font-bold text-green-800">
                    {formatCurrency(analytics.totalRevenue)}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <div className="text-xs text-green-600">
                      Orders: {formatCurrency(analytics.totalIncomeFromOrders)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="text-xs text-green-600">
                      Charging:{" "}
                      {formatCurrency(analytics.totalIncomeFromCharging)}
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl text-white">
                  <TrendingUp className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Expenses */}
          <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-200 hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600 font-medium">
                    Total Expenses
                  </p>
                  <p className="text-2xl font-bold text-red-800">
                    {formatCurrency(analytics.totalExpenses)}
                  </p>
                  <div className="text-xs text-red-600 mt-1">
                    Avg Daily: {formatCurrency(analytics.averageDailyExpenses)}
                  </div>
                </div>
                <div className="p-3 bg-gradient-to-r from-red-500 to-rose-500 rounded-xl text-white">
                  <TrendingDown className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Net Profit */}
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">
                    Net Profit
                  </p>
                  <p
                    className={`text-2xl font-bold ${analytics.netProfit >= 0 ? "text-blue-800" : "text-red-800"}`}
                  >
                    {formatCurrency(analytics.netProfit)}
                  </p>
                  <div className="text-xs text-blue-600 mt-1">
                    Margin: {formatPercentage(analytics.profitMargin)}
                  </div>
                </div>
                <div
                  className={`p-3 rounded-xl text-white ${analytics.netProfit >= 0 ? "bg-gradient-to-r from-blue-500 to-indigo-500" : "bg-gradient-to-r from-red-500 to-rose-500"}`}
                >
                  <Calculator className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Growth */}
          <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200 hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 font-medium">
                    Monthly Growth
                  </p>
                  <p
                    className={`text-2xl font-bold ${analytics.monthlyComparison.growth >= 0 ? "text-green-800" : "text-red-800"}`}
                  >
                    {formatPercentage(analytics.monthlyComparison.growth)}
                  </p>
                  <div className="text-xs text-purple-600 mt-1">
                    This Month:{" "}
                    {formatCurrency(analytics.monthlyComparison.thisMonth)}
                  </div>
                </div>
                <div className="p-3 bg-gradient-to-r from-purple-500 to-violet-500 rounded-xl text-white">
                  {analytics.monthlyComparison.growth >= 0 ? (
                    <ArrowUp className="h-6 w-6" />
                  ) : (
                    <ArrowDown className="h-6 w-6" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Balance Information */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">
                    Cash Balance
                  </p>
                  <p className="text-xl font-bold text-green-800">
                    {formatCurrency(analytics.cashBalance)}
                  </p>
                </div>
                <Wallet className="h-5 w-5 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">
                    eSewa Balance
                  </p>
                  <p className="text-xl font-bold text-blue-800">
                    {formatCurrency(analytics.esewaBalance)}
                  </p>
                </div>
                <CreditCard className="h-5 w-5 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 font-medium">
                    Fonepay Balance
                  </p>
                  <p className="text-xl font-bold text-purple-800">
                    {formatCurrency(analytics.fonepayBalance)}
                  </p>
                </div>
                <CreditCard className="h-5 w-5 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-600 font-medium">
                    Cooperative Savings
                  </p>
                  <p className="text-xl font-bold text-amber-800">
                    {formatCurrency(analytics.cooperativeSavings)}
                  </p>
                </div>
                <PiggyBank className="h-5 w-5 text-amber-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payment Method Breakdown */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Method Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Cash</span>
                  <span className="text-sm font-bold text-green-600">
                    {formatCurrency(analytics.paymentMethodBreakdown.cash)}
                  </span>
                </div>
                <Progress
                  value={
                    (analytics.paymentMethodBreakdown.cash /
                      analytics.totalRevenue) *
                    100
                  }
                  className="h-2"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">eSewa</span>
                  <span className="text-sm font-bold text-blue-600">
                    {formatCurrency(analytics.paymentMethodBreakdown.esewa)}
                  </span>
                </div>
                <Progress
                  value={
                    (analytics.paymentMethodBreakdown.esewa /
                      analytics.totalRevenue) *
                    100
                  }
                  className="h-2"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Fonepay</span>
                  <span className="text-sm font-bold text-purple-600">
                    {formatCurrency(analytics.paymentMethodBreakdown.fonepay)}
                  </span>
                </div>
                <Progress
                  value={
                    (analytics.paymentMethodBreakdown.fonepay /
                      analytics.totalRevenue) *
                    100
                  }
                  className="h-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Insights Widget */}
        <FinancialInsightsWidget className="mb-8" />

        {/* Data Source Information */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Database className="h-6 w-6 text-blue-600 mt-1" />
              <div>
                <h3 className="font-semibold text-blue-800 mb-2">
                  Data Source: Daily Summary Table
                </h3>
                <p className="text-blue-700 text-sm mb-2">
                  All analytics and insights are calculated from the
                  daily_summary table, ensuring consistency and accuracy across
                  all reports.
                </p>
                <div className="text-xs text-blue-600">
                  Last updated:{" "}
                  {dailySummaries.length > 0
                    ? format(
                        parseISO(dailySummaries[0].summary_date),
                        "MMM dd, yyyy",
                      )
                    : "No data"}
                  • {dailySummaries.length} days of data available
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EnhancedInsightsTab;
