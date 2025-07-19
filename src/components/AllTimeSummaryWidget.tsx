import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PiggyBank,
  CreditCard,
  Banknote,
  RefreshCw,
  AlertCircle,
  Database,
  BarChart3,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { extractErrorMessage, logError } from "@/utils/errorHandling";

interface AllTimeSummaryData {
  totalIncome: number;
  totalExpenses: number;
  totalDeposits: number;
  totalWithdrawals: number;
  cooperativeSavings: number;
  netProfit: number;
  currentBalances: {
    cash: number;
    esewa: number;
    fonepay: number;
    total: number;
  };
  incomeBreakdown: {
    fromOrders: number;
    fromCharging: number;
  };
  paymentMethodBreakdown: {
    cash: number;
    esewa: number;
    fonepay: number;
  };
  dataPoints: number; // Number of days with data
}

interface AllTimeSummaryWidgetProps {
  className?: string;
}

const AllTimeSummaryWidget: React.FC<AllTimeSummaryWidgetProps> = ({
  className,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summaryData, setSummaryData] = useState<AllTimeSummaryData | null>(
    null,
  );

  const fetchAllTimeSummary = async () => {
    if (!user) return;

    try {
      console.log("📊 Fetching all-time summary from daily_summary table...");

      // Fetch all daily summaries
      const { data: summariesData, error } = await supabase
        .from("daily_summary")
        .select("*")
        .order("summary_date", { ascending: false });

      if (error) {
        logError("fetching all-time summary", error);
        throw error;
      }

      const summaries = summariesData || [];

      if (summaries.length === 0) {
        setSummaryData({
          totalIncome: 0,
          totalExpenses: 0,
          totalDeposits: 0,
          totalWithdrawals: 0,
          cooperativeSavings: 0,
          netProfit: 0,
          currentBalances: { cash: 0, esewa: 0, fonepay: 0, total: 0 },
          incomeBreakdown: { fromOrders: 0, fromCharging: 0 },
          paymentMethodBreakdown: { cash: 0, esewa: 0, fonepay: 0 },
          dataPoints: 0,
        });
        return;
      }

      // Calculate all-time totals using exact formulas:

      // total_income_from_orders: SUM(total) from orders table
      const totalIncomeFromOrders = summaries.reduce(
        (sum, s) => sum + (s.total_income_from_orders || 0),
        0,
      );

      // total_income_from_charging: SUM(amount) from charging_sessions table
      const totalIncomeFromCharging = summaries.reduce(
        (sum, s) => sum + (s.total_income_from_charging || 0),
        0,
      );

      // total_income: total_income_from_orders + total_income_from_charging
      const totalIncome = totalIncomeFromOrders + totalIncomeFromCharging;

      // total_expenses: SUM(amount) from expenses table
      const totalExpenses = summaries.reduce(
        (sum, s) => sum + (s.total_expenses || 0),
        0,
      );

      // total_deposits: SUM(amount) from deposits table
      const totalDeposits = summaries.reduce(
        (sum, s) => sum + (s.total_deposits || 0),
        0,
      );

      // total_withdrawals: SUM(amount) from withdrawals table
      const totalWithdrawals = summaries.reduce(
        (sum, s) => sum + (s.total_withdrawals || 0),
        0,
      );

      // total_savings: SUM(contribution_amount) from cooperative_savings table
      const cooperativeSavings = summaries.reduce(
        (sum, s) => sum + (s.total_savings || 0),
        0,
      );

      // Calculate net profit
      const netProfit = totalIncome - totalExpenses;

      // Calculate current balances using correct formulas:
      // cash_balance: total_cash_income - total_expenses_cash - total_savings_cash + total_withdrawals_cash - deposits_to_esewa - deposits_to_fonepay
      const cashBalance = summaries.reduce((sum, s) => {
        const totalCashIncome = s.total_income_cash || 0;
        const totalExpensesCash = s.total_expenses_cash || 0;
        const totalSavingsCash = s.total_savings_cash || 0;
        const totalWithdrawalsCash = 0; // This column might not exist in current schema
        const depositsToEsewa = s.total_deposits_esewa || 0;
        const depositsToFonepay = s.total_deposits_fonepay || 0;

        return (
          sum +
          (totalCashIncome -
            totalExpensesCash -
            totalSavingsCash +
            totalWithdrawalsCash -
            depositsToEsewa -
            depositsToFonepay)
        );
      }, 0);

      // esewa_balance: total_income_esewa - total_expenses_esewa - total_savings_esewa + deposits_to_esewa
      const esewaBalance = summaries.reduce((sum, s) => {
        const totalIncomeEsewa = s.total_income_esewa || 0;
        const totalExpensesEsewa = s.total_expenses_esewa || 0;
        const totalSavingsEsewa = s.total_savings_esewa || 0;
        const depositsToEsewa = s.total_deposits_esewa || 0;

        return (
          sum +
          (totalIncomeEsewa -
            totalExpensesEsewa -
            totalSavingsEsewa +
            depositsToEsewa)
        );
      }, 0);

      // fonepay_balance: total_income_fonepay - total_expenses_fonepay - total_savings_fonepay + deposits_to_fonepay
      const fonepayBalance = summaries.reduce((sum, s) => {
        const totalIncomeFonepay = s.total_income_fonepay || 0;
        const totalExpensesFonepay = s.total_expenses_fonepay || 0;
        const totalSavingsFonepay = s.total_savings_fonepay || 0;
        const depositsToFonepay = s.total_deposits_fonepay || 0;

        return (
          sum +
          (totalIncomeFonepay -
            totalExpensesFonepay -
            totalSavingsFonepay +
            depositsToFonepay)
        );
      }, 0);

      // cooperative_balance: total_savings - total_withdrawals_cooperative
      const cooperativeBalanceCalc = summaries.reduce((sum, s) => {
        const totalSavings = s.total_savings || 0;
        const totalWithdrawalsCooperative =
          s.total_withdrawals_cooperative || 0;

        return sum + (totalSavings - totalWithdrawalsCooperative);
      }, 0);

      // total_balance: cash_balance + fonepay_balance + cooperative_balance + esewa_balance
      const totalBalance =
        cashBalance + fonepayBalance + cooperativeBalanceCalc + esewaBalance;

      const currentBalances = {
        cash: cashBalance,
        esewa: esewaBalance,
        fonepay: fonepayBalance,
        total: totalBalance,
      };

      // Calculate income breakdown
      const incomeBreakdown = {
        fromOrders: summaries.reduce(
          (sum, s) => sum + (s.total_income_from_orders || 0),
          0,
        ),
        fromCharging: summaries.reduce(
          (sum, s) => sum + (s.total_income_from_charging || 0),
          0,
        ),
      };

      // Calculate payment method breakdown
      const paymentMethodBreakdown = {
        cash: summaries.reduce((sum, s) => sum + (s.total_income_cash || 0), 0),
        esewa: summaries.reduce(
          (sum, s) => sum + (s.total_income_esewa || 0),
          0,
        ),
        fonepay: summaries.reduce(
          (sum, s) => sum + (s.total_income_fonepay || 0),
          0,
        ),
      };

      const allTimeSummary: AllTimeSummaryData = {
        totalIncome,
        totalExpenses,
        totalDeposits,
        totalWithdrawals,
        cooperativeSavings: cooperativeBalanceCalc, // Use calculated cooperative balance
        netProfit,
        currentBalances,
        incomeBreakdown,
        paymentMethodBreakdown,
        dataPoints: summaries.length,
      };

      setSummaryData(allTimeSummary);
      console.log("✅ All-time summary calculated:", allTimeSummary);
    } catch (error) {
      logError("calculating all-time summary", error);
      toast.error(
        `Error loading all-time summary: ${extractErrorMessage(error)}`,
      );
    }
  };

  const refreshSummary = async () => {
    setRefreshing(true);
    try {
      await fetchAllTimeSummary();
      toast.success("All-time summary refreshed successfully!");
    } catch (error) {
      logError("refreshing all-time summary", error);
      toast.error(`Failed to refresh summary: ${extractErrorMessage(error)}`);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await fetchAllTimeSummary();
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  if (loading) {
    return (
      <Card className={`${className} animate-pulse`}>
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="h-20 bg-gray-200 rounded"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summaryData) {
    return (
      <Card className={`${className} bg-yellow-50 border-yellow-200`}>
        <CardContent className="flex items-center gap-3 p-6">
          <AlertCircle className="h-6 w-6 text-yellow-600" />
          <div>
            <p className="font-medium text-yellow-800">
              No summary data available
            </p>
            <p className="text-sm text-yellow-600">
              Please perform daily closing to generate summary data.
            </p>
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
          <Clock className="h-6 w-6 text-purple-600" />
          <h2 className="text-2xl font-bold text-gray-800">All-Time Summary</h2>
          <Badge
            variant="outline"
            className="text-purple-600 border-purple-300"
          >
            {summaryData.dataPoints} days of data
          </Badge>
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

      {/* Main Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Income */}
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-800">
              NRs. {summaryData.totalIncome.toLocaleString()}
            </div>
            <div className="mt-2 space-y-1">
              <div className="text-xs text-green-600">
                Orders: NRs.{" "}
                {summaryData.incomeBreakdown.fromOrders.toLocaleString()}
              </div>
              <div className="text-xs text-green-600">
                Charging: NRs.{" "}
                {summaryData.incomeBreakdown.fromCharging.toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Expenses */}
        <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600 flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-800">
              NRs. {summaryData.totalExpenses.toLocaleString()}
            </div>
            <div className="mt-2">
              <Badge
                variant={summaryData.netProfit >= 0 ? "default" : "destructive"}
                className="text-xs"
              >
                Net Profit: NRs. {summaryData.netProfit.toLocaleString()}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Cooperative Savings */}
        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-600 flex items-center gap-2">
              <PiggyBank className="h-4 w-4" />
              Cooperative Savings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-800">
              NRs. {summaryData.cooperativeSavings.toLocaleString()}
            </div>
            <div className="text-xs text-purple-600 mt-2">
              Total contributions
            </div>
          </CardContent>
        </Card>

        {/* Total Deposits */}
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600 flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Total Deposits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-800">
              NRs. {summaryData.totalDeposits.toLocaleString()}
            </div>
            <div className="text-xs text-blue-600 mt-2">All-time deposits</div>
          </CardContent>
        </Card>

        {/* Total Withdrawals */}
        <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-600 flex items-center gap-2">
              <Banknote className="h-4 w-4" />
              Total Withdrawals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-800">
              NRs. {summaryData.totalWithdrawals.toLocaleString()}
            </div>
            <div className="text-xs text-orange-600 mt-2">
              All-time withdrawals
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Balances */}
      <Card className="bg-gradient-to-br from-gray-50 to-slate-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-700">
            <DollarSign className="h-5 w-5" />
            Current Balances
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-sm text-gray-600">Cash</div>
              <div className="text-lg font-semibold text-green-600">
                NRs. {summaryData.currentBalances.cash.toLocaleString()}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600">eSewa</div>
              <div className="text-lg font-semibold text-blue-600">
                NRs. {summaryData.currentBalances.esewa.toLocaleString()}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600">Fonepay</div>
              <div className="text-lg font-semibold text-purple-600">
                NRs. {summaryData.currentBalances.fonepay.toLocaleString()}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600">Total Balance</div>
              <div className="text-lg font-semibold text-gray-800">
                NRs. {summaryData.currentBalances.total.toLocaleString()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Method Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-700">
            <BarChart3 className="h-5 w-5" />
            All-Time Payment Method Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Banknote className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-gray-700">Cash</span>
              </div>
              <div className="text-lg font-semibold text-green-600">
                NRs. {summaryData.paymentMethodBreakdown.cash.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500">
                {summaryData.totalIncome > 0
                  ? (
                      (summaryData.paymentMethodBreakdown.cash /
                        summaryData.totalIncome) *
                      100
                    ).toFixed(1)
                  : "0"}
                % of total income
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">eSewa</span>
              </div>
              <div className="text-lg font-semibold text-blue-600">
                NRs. {summaryData.paymentMethodBreakdown.esewa.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500">
                {summaryData.totalIncome > 0
                  ? (
                      (summaryData.paymentMethodBreakdown.esewa /
                        summaryData.totalIncome) *
                      100
                    ).toFixed(1)
                  : "0"}
                % of total income
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-gray-700">
                  Fonepay
                </span>
              </div>
              <div className="text-lg font-semibold text-purple-600">
                NRs.{" "}
                {summaryData.paymentMethodBreakdown.fonepay.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500">
                {summaryData.totalIncome > 0
                  ? (
                      (summaryData.paymentMethodBreakdown.fonepay /
                        summaryData.totalIncome) *
                      100
                    ).toFixed(1)
                  : "0"}
                % of total income
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Source Badge */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm">
            <Database className="h-4 w-4 text-blue-600" />
            <span className="text-blue-700 font-medium">
              Data Source: daily_summary table
            </span>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              {summaryData.dataPoints} days
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AllTimeSummaryWidget;
