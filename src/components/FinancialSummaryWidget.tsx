import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  CreditCard,
  Wallet,
  PiggyBank,
  Banknote,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
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
  created_at: string;
  updated_at: string;
}

interface FinancialSummaryWidgetProps {
  className?: string;
}

const FinancialSummaryWidget: React.FC<FinancialSummaryWidgetProps> = ({
  className,
}) => {
  const [loading, setLoading] = useState(true);
  const [todaySummary, setTodaySummary] = useState<DailySummary | null>(null);
  const [monthSummary, setMonthSummary] = useState<{
    total_income: number;
    total_expenses: number;
    total_deposits: number;
    total_withdrawals: number;
    net_profit: number;
  } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTodaySummary = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("daily_summary")
        .select("*")
        .eq("summary_date", today)
        .single();

      if (error && error.code !== "PGRST116") {
        logError("fetching today's summary", error);
        throw error;
      }

      setTodaySummary(data);
    } catch (error) {
      logError("fetching today's summary", error);
      console.error("Error fetching today's summary:", error);
    }
  };

  const fetchMonthSummary = async () => {
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
        logError("fetching month summary", error);
        throw error;
      }

      if (data && data.length > 0) {
        const monthTotals = data.reduce(
          (acc, day) => ({
            total_income: acc.total_income + (day.total_income || 0),
            total_expenses: acc.total_expenses + (day.total_expenses || 0),
            total_deposits: acc.total_deposits + (day.total_deposits || 0),
            total_withdrawals:
              acc.total_withdrawals + (day.total_withdrawals || 0),
            net_profit: 0, // Will calculate below
          }),
          {
            total_income: 0,
            total_expenses: 0,
            total_deposits: 0,
            total_withdrawals: 0,
            net_profit: 0,
          },
        );

        monthTotals.net_profit =
          monthTotals.total_income +
          monthTotals.total_deposits -
          monthTotals.total_expenses -
          monthTotals.total_withdrawals;

        setMonthSummary(monthTotals);
      } else {
        setMonthSummary({
          total_income: 0,
          total_expenses: 0,
          total_deposits: 0,
          total_withdrawals: 0,
          net_profit: 0,
        });
      }
    } catch (error) {
      logError("fetching month summary", error);
      console.error("Error fetching month summary:", error);
    }
  };

  const refreshSummary = async () => {
    setRefreshing(true);
    try {
      // Trigger daily summary update for today
      const today = new Date().toISOString().split("T")[0];
      const { error } = await supabase.rpc("update_daily_summary", {
        p_summary_date: today,
      });

      if (error) {
        logError("updating daily summary", error);
        throw error;
      }

      // Refresh data
      await Promise.all([fetchTodaySummary(), fetchMonthSummary()]);
      toast.success("Financial summary refreshed successfully!");
    } catch (error) {
      logError("refreshing summary", error);
      toast.error(`Failed to refresh summary: ${extractErrorMessage(error)}`);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchTodaySummary(), fetchMonthSummary()]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

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

  const todayBalance = todaySummary?.total_balance || 0;
  const todayIncome = todaySummary?.total_income || 0;
  const todayExpenses = todaySummary?.total_expenses || 0;
  const todayNetProfit = todayIncome - todayExpenses;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Refresh Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-800">
            Financial Summary
          </h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refreshSummary}
          disabled={refreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw
            className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Today's Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Today's Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-800">
              NRs. {todayIncome.toLocaleString()}
            </div>
            {todaySummary && (
              <div className="mt-2 space-y-1">
                <div className="text-xs text-green-600">
                  Orders: NRs.{" "}
                  {todaySummary.total_income_from_orders.toFixed(2)}
                </div>
                <div className="text-xs text-green-600">
                  Charging: NRs.{" "}
                  {todaySummary.total_income_from_charging.toFixed(2)}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600 flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Today's Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-800">
              NRs. {todayExpenses.toLocaleString()}
            </div>
            <div className="mt-2">
              <Badge
                variant={todayNetProfit >= 0 ? "default" : "destructive"}
                className="text-xs"
              >
                Net: NRs. {todayNetProfit.toFixed(2)}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600 flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Total Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-800">
              NRs. {todayBalance.toLocaleString()}
            </div>
            {todaySummary && (
              <div className="mt-2 space-y-1">
                <div className="text-xs text-blue-600">
                  Cash: NRs. {todaySummary.cash_balance.toFixed(2)}
                </div>
                <div className="text-xs text-blue-600">
                  eSewa: NRs. {todaySummary.esewa_balance.toFixed(2)}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-600 flex items-center gap-2">
              <PiggyBank className="h-4 w-4" />
              Today's Savings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-800">
              NRs. {(todaySummary?.total_savings || 0).toLocaleString()}
            </div>
            <div className="mt-2">
              <div className="text-xs text-purple-600">
                Withdrawals: NRs.{" "}
                {(todaySummary?.total_withdrawals || 0).toFixed(2)}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Summary */}
      {monthSummary && (
        <Card className="bg-gradient-to-br from-gray-50 to-slate-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-700">
              <Calendar className="h-5 w-5" />
              This Month Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-sm text-gray-600">Income</div>
                <div className="text-lg font-semibold text-green-600">
                  NRs. {monthSummary.total_income.toLocaleString()}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600">Expenses</div>
                <div className="text-lg font-semibold text-red-600">
                  NRs. {monthSummary.total_expenses.toLocaleString()}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600">Deposits</div>
                <div className="text-lg font-semibold text-blue-600">
                  NRs. {monthSummary.total_deposits.toLocaleString()}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600">Withdrawals</div>
                <div className="text-lg font-semibold text-orange-600">
                  NRs. {monthSummary.total_withdrawals.toLocaleString()}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600">Net Profit</div>
                <div
                  className={`text-lg font-semibold ${
                    monthSummary.net_profit >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  NRs. {monthSummary.net_profit.toLocaleString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Method Breakdown */}
      {todaySummary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-700">
              <CreditCard className="h-5 w-5" />
              Today's Payment Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-gray-700">
                    Cash
                  </span>
                </div>
                <div className="text-lg font-semibold text-green-600">
                  NRs. {todaySummary.total_income_cash.toFixed(2)}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">
                    eSewa
                  </span>
                </div>
                <div className="text-lg font-semibold text-blue-600">
                  NRs. {todaySummary.total_income_esewa.toFixed(2)}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-gray-700">
                    Fonepay
                  </span>
                </div>
                <div className="text-lg font-semibold text-purple-600">
                  NRs. {todaySummary.total_income_fonepay.toFixed(2)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Data Warning */}
      {!todaySummary && !loading && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="flex items-center gap-3 p-6">
            <AlertCircle className="h-6 w-6 text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-800">
                No financial data for today
              </p>
              <p className="text-sm text-yellow-600">
                Daily summary will be automatically generated when transactions
                are recorded.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FinancialSummaryWidget;
