import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Target,
  PieChart,
  ArrowUp,
  ArrowDown,
  Percent,
  RefreshCw,
  Activity,
  Star,
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "sonner";
import { extractErrorMessage, logError } from "@/utils/errorHandling";

interface DailySummary {
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
}

interface FinancialTrend {
  date: string;
  income: number;
  expenses: number;
  netProfit: number;
}

interface PaymentMethodBreakdown {
  cash: { income: number; percentage: number };
  esewa: { income: number; percentage: number };
  fonepay: { income: number; percentage: number };
}

interface FinancialInsightsWidgetProps {
  className?: string;
}

const FinancialInsightsWidget: React.FC<FinancialInsightsWidgetProps> = ({
  className,
}) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [weeklyTrends, setWeeklyTrends] = useState<FinancialTrend[]>([]);
  const [monthlyTotals, setMonthlyTotals] = useState<{
    income: number;
    expenses: number;
    deposits: number;
    withdrawals: number;
    netProfit: number;
    profitMargin: number;
  } | null>(null);
  const [paymentBreakdown, setPaymentBreakdown] =
    useState<PaymentMethodBreakdown | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<{
    incomeGrowth: number;
    expenseGrowth: number;
    avgDailyProfit: number;
    bestPerformingDay: { date: string; profit: number };
    worstPerformingDay: { date: string; profit: number };
  } | null>(null);

  const fetchWeeklyTrends = async () => {
    try {
      const endDate = new Date();
      const startDate = subDays(endDate, 6); // Last 7 days

      const { data, error } = await supabase
        .from("daily_summary")
        .select(
          "summary_date, total_income, total_expenses, total_income_cash, total_income_esewa, total_income_fonepay",
        )
        .gte("summary_date", format(startDate, "yyyy-MM-dd"))
        .lte("summary_date", format(endDate, "yyyy-MM-dd"))
        .order("summary_date", { ascending: true });

      if (error) {
        logError("fetching weekly trends", error);
        throw error;
      }

      const trends: FinancialTrend[] = (data || []).map((item) => ({
        date: item.summary_date,
        income: item.total_income || 0,
        expenses: item.total_expenses || 0,
        netProfit: (item.total_income || 0) - (item.total_expenses || 0),
      }));

      setWeeklyTrends(trends);

      // Calculate payment method breakdown from the weekly data
      const totalCash =
        data?.reduce((sum, item) => sum + (item.total_income_cash || 0), 0) ||
        0;
      const totalEsewa =
        data?.reduce((sum, item) => sum + (item.total_income_esewa || 0), 0) ||
        0;
      // Calculate fonepay as remainder since the column doesn't exist
      const totalIncomeFromDB = data?.reduce((sum, item) => sum + (item.total_income || 0), 0) || 0;
      const totalFonepay = Math.max(0, totalIncomeFromDB - totalCash - totalEsewa);
      const totalIncome = totalCash + totalEsewa + totalFonepay;

      if (totalIncome > 0) {
        setPaymentBreakdown({
          cash: {
            income: totalCash,
            percentage: (totalCash / totalIncome) * 100,
          },
          esewa: {
            income: totalEsewa,
            percentage: (totalEsewa / totalIncome) * 100,
          },
          fonepay: {
            income: totalFonepay,
            percentage: (totalFonepay / totalIncome) * 100,
          },
        });
      }
    } catch (error) {
      logError("fetching weekly trends", error);
      console.error("Error fetching weekly trends:", error);
    }
  };

  const fetchMonthlyTotals = async () => {
    try {
      const now = new Date();
      const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(now), "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("daily_summary")
        .select(
          "total_income, total_expenses, total_deposits, total_withdrawals",
        )
        .gte("summary_date", monthStart)
        .lte("summary_date", monthEnd);

      if (error) {
        logError("fetching monthly totals", error);
        throw error;
      }

      if (data && data.length > 0) {
        const totals = data.reduce(
          (acc, day) => ({
            income: acc.income + (day.total_income || 0),
            expenses: acc.expenses + (day.total_expenses || 0),
            deposits: acc.deposits + (day.total_deposits || 0),
            withdrawals: acc.withdrawals + (day.total_withdrawals || 0),
          }),
          { income: 0, expenses: 0, deposits: 0, withdrawals: 0 },
        );

        const netProfit = totals.income - totals.expenses;
        const profitMargin =
          totals.income > 0 ? (netProfit / totals.income) * 100 : 0;

        setMonthlyTotals({
          ...totals,
          netProfit,
          profitMargin,
        });
      }
    } catch (error) {
      logError("fetching monthly totals", error);
      console.error("Error fetching monthly totals:", error);
    }
  };

  const calculatePerformanceMetrics = () => {
    if (weeklyTrends.length === 0) return;

    const profits = weeklyTrends.map((trend) => trend.netProfit);
    const avgDailyProfit =
      profits.reduce((sum, profit) => sum + profit, 0) / profits.length;

    const bestDay = weeklyTrends.reduce((best, current) =>
      current.netProfit > best.netProfit ? current : best,
    );

    const worstDay = weeklyTrends.reduce((worst, current) =>
      current.netProfit < worst.netProfit ? current : worst,
    );

    // Calculate growth (comparing first half vs second half of the week)
    const firstHalf = weeklyTrends.slice(0, Math.ceil(weeklyTrends.length / 2));
    const secondHalf = weeklyTrends.slice(Math.ceil(weeklyTrends.length / 2));

    const firstHalfAvgIncome =
      firstHalf.reduce((sum, day) => sum + day.income, 0) / firstHalf.length;
    const secondHalfAvgIncome =
      secondHalf.reduce((sum, day) => sum + day.income, 0) / secondHalf.length;

    const firstHalfAvgExpenses =
      firstHalf.reduce((sum, day) => sum + day.expenses, 0) / firstHalf.length;
    const secondHalfAvgExpenses =
      secondHalf.reduce((sum, day) => sum + day.expenses, 0) /
      secondHalf.length;

    const incomeGrowth =
      firstHalfAvgIncome > 0
        ? ((secondHalfAvgIncome - firstHalfAvgIncome) / firstHalfAvgIncome) *
          100
        : 0;

    const expenseGrowth =
      firstHalfAvgExpenses > 0
        ? ((secondHalfAvgExpenses - firstHalfAvgExpenses) /
            firstHalfAvgExpenses) *
          100
        : 0;

    setPerformanceMetrics({
      incomeGrowth,
      expenseGrowth,
      avgDailyProfit,
      bestPerformingDay: {
        date: bestDay.date,
        profit: bestDay.netProfit,
      },
      worstPerformingDay: {
        date: worstDay.date,
        profit: worstDay.netProfit,
      },
    });
  };

  const refreshData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchWeeklyTrends(), fetchMonthlyTotals()]);
      toast.success("Financial insights refreshed successfully!");
    } catch (error) {
      logError("refreshing insights", error);
      toast.error(`Failed to refresh insights: ${extractErrorMessage(error)}`);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchWeeklyTrends(), fetchMonthlyTotals()]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    if (weeklyTrends.length > 0) {
      calculatePerformanceMetrics();
    }
  }, [weeklyTrends]);

  if (loading) {
    return (
      <Card className={`${className} animate-pulse`}>
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Refresh Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-purple-600" />
          <h2 className="text-2xl font-bold text-gray-800">
            Financial Insights
          </h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refreshData}
          disabled={refreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw
            className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Monthly Performance Cards */}
      {monthlyTotals && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-600 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Monthly Income
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-800">
                NRs. {monthlyTotals.income.toLocaleString()}
              </div>
              <div className="mt-2">
                <Badge
                  variant="secondary"
                  className="text-xs bg-blue-100 text-blue-700"
                >
                  This Month
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-600 flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Monthly Expenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-800">
                NRs. {monthlyTotals.expenses.toLocaleString()}
              </div>
              <div className="mt-2">
                <Badge
                  variant="secondary"
                  className="text-xs bg-red-100 text-red-700"
                >
                  This Month
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-600 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Net Profit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-800">
                NRs. {monthlyTotals.netProfit.toLocaleString()}
              </div>
              <div className="mt-2">
                <Badge
                  variant={
                    monthlyTotals.profitMargin >= 0 ? "default" : "destructive"
                  }
                  className="text-xs"
                >
                  {monthlyTotals.profitMargin.toFixed(1)}% Margin
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-purple-600 flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Cash Flow
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-800">
                NRs.{" "}
                {(
                  monthlyTotals.income +
                  monthlyTotals.deposits -
                  monthlyTotals.expenses -
                  monthlyTotals.withdrawals
                ).toLocaleString()}
              </div>
              <div className="mt-2">
                <Badge
                  variant="secondary"
                  className="text-xs bg-purple-100 text-purple-700"
                >
                  Net Flow
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Performance Metrics and Payment Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Metrics */}
        {performanceMetrics && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-700">
                <Star className="h-5 w-5" />
                Weekly Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Income Growth</span>
                <div className="flex items-center gap-2">
                  {performanceMetrics.incomeGrowth >= 0 ? (
                    <ArrowUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <ArrowDown className="h-4 w-4 text-red-600" />
                  )}
                  <span
                    className={`font-semibold ${
                      performanceMetrics.incomeGrowth >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {Math.abs(performanceMetrics.incomeGrowth).toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Expense Growth</span>
                <div className="flex items-center gap-2">
                  {performanceMetrics.expenseGrowth >= 0 ? (
                    <ArrowUp className="h-4 w-4 text-red-600" />
                  ) : (
                    <ArrowDown className="h-4 w-4 text-green-600" />
                  )}
                  <span
                    className={`font-semibold ${
                      performanceMetrics.expenseGrowth >= 0
                        ? "text-red-600"
                        : "text-green-600"
                    }`}
                  >
                    {Math.abs(performanceMetrics.expenseGrowth).toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Avg Daily Profit</span>
                <span className="font-semibold text-blue-600">
                  NRs. {performanceMetrics.avgDailyProfit.toFixed(0)}
                </span>
              </div>

              <div className="border-t pt-4">
                <div className="text-xs text-gray-500 mb-2">Best Day</div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">
                    {format(
                      new Date(performanceMetrics.bestPerformingDay.date),
                      "MMM dd",
                    )}
                  </span>
                  <span className="font-semibold text-green-600">
                    NRs.{" "}
                    {performanceMetrics.bestPerformingDay.profit.toFixed(0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Method Breakdown */}
        {paymentBreakdown && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-700">
                <PieChart className="h-5 w-5" />
                Payment Method Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">Cash</span>
                    <span className="text-sm font-semibold">
                      {paymentBreakdown.cash.percentage.toFixed(1)}%
                    </span>
                  </div>
                  <Progress
                    value={paymentBreakdown.cash.percentage}
                    className="h-2"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    NRs. {paymentBreakdown.cash.income.toFixed(0)}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">eSewa</span>
                    <span className="text-sm font-semibold">
                      {paymentBreakdown.esewa.percentage.toFixed(1)}%
                    </span>
                  </div>
                  <Progress
                    value={paymentBreakdown.esewa.percentage}
                    className="h-2"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    NRs. {paymentBreakdown.esewa.income.toFixed(0)}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">Fonepay</span>
                    <span className="text-sm font-semibold">
                      {paymentBreakdown.fonepay.percentage.toFixed(1)}%
                    </span>
                  </div>
                  <Progress
                    value={paymentBreakdown.fonepay.percentage}
                    className="h-2"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    NRs. {paymentBreakdown.fonepay.income.toFixed(0)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Weekly Trend Chart */}
      {weeklyTrends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-700">
              <Calendar className="h-5 w-5" />
              7-Day Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {weeklyTrends.map((trend, index) => (
                <div
                  key={trend.date}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700 w-16">
                      {format(new Date(trend.date), "MMM dd")}
                    </span>
                    <div className="flex items-center gap-4">
                      <div className="text-xs text-green-600">
                        ↑ NRs. {trend.income.toFixed(0)}
                      </div>
                      <div className="text-xs text-red-600">
                        ↓ NRs. {trend.expenses.toFixed(0)}
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant={trend.netProfit >= 0 ? "default" : "destructive"}
                    className="text-xs"
                  >
                    NRs. {trend.netProfit.toFixed(0)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FinancialInsightsWidget;
