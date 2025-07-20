import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { extractErrorMessage, logError } from "@/utils/errorHandling";
<<<<<<< HEAD
import AllTimeSummaryModal from "@/components/AllTimeSummaryModal";
=======
import AllTimeSummaryModal from "./AllTimeSummaryModal";
import { DateRange } from "react-day-picker";
>>>>>>> origin/main

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
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchAllTimeSummary = useCallback(async (dateRange?: DateRange) => {
    if (!user) return;

    try {
      console.log("📊 Fetching all-time summary from daily_summary table...");

      let query = supabase
        .from("daily_summary")
        .select("*")
        .order("summary_date", { ascending: false });

      if (dateRange?.from) {
        query = query.gte("summary_date", dateRange.from.toISOString().split("T")[0]);
      }
      if (dateRange?.to) {
        query = query.lt("summary_date", dateRange.to.toISOString().split("T")[0]);
      }

      const { data: summariesData, error } = await query;

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

      // Calculate current balances using the new formulas provided:

      // Calculate payment method totals
      const totalCashIncome = summaries.reduce(
        (sum, s) => sum + (s.total_income_cash || 0),
        0,
      );
      const totalEsewaIncome = summaries.reduce(
        (sum, s) => sum + (s.total_income_esewa || 0),
        0,
      );
      const totalFonepayIncome = summaries.reduce(
        (sum, s) => sum + (s.total_income_fonepay || 0),
        0,
      );

      // Calculate expense totals by payment method
      const totalExpensesCash = summaries.reduce(
        (sum, s) => sum + (s.total_expenses_cash || 0),
        0,
      );
      const totalExpensesEsewa = summaries.reduce(
        (sum, s) => sum + (s.total_expenses_esewa || 0),
        0,
      );
      const totalExpensesFonepay = summaries.reduce(
        (sum, s) => sum + (s.total_expenses_fonepay || 0),
        0,
      );

      // Calculate savings totals by payment method
      const totalSavingsCash = summaries.reduce(
        (sum, s) => sum + (s.total_savings_cash || 0),
        0,
      );
      const totalSavingsEsewa = summaries.reduce(
        (sum, s) => sum + (s.total_savings_esewa || 0),
        0,
      );
      const totalSavingsFonepay = summaries.reduce(
        (sum, s) => sum + (s.total_savings_fonepay || 0),
        0,
      );

      // Calculate deposits
      const totalDepositsCash = summaries.reduce(
        (sum, s) => sum + (s.total_deposits_cash || 0),
        0,
      );
      const depositsToEsewa = summaries.reduce(
        (sum, s) => sum + (s.total_deposits_esewa || 0),
        0,
      );
      const depositsToFonepay = summaries.reduce(
        (sum, s) => sum + (s.total_deposits_fonepay || 0),
        0,
      );

      // Calculate withdrawals
      const totalWithdrawalsCash = summaries.reduce(
        (sum, s) => sum + (s.total_withdrawals_cash || 0),
        0,
      );
      const totalWithdrawalsCooperative = summaries.reduce(
        (sum, s) => sum + (s.total_withdrawals_cooperative || 0),
        0,
      );
      const totalWithdrawalsBank = summaries.reduce(
        (sum, s) => sum + (s.total_withdrawals_bank || 0),
        0,
      );

      // Calculate balances using the specified formulas:
      // Cash Balance: Total Cash income - total expense from cash - total savings in cash - total deposits cash deposits to bank + total withdrawals in cash - deposits made to Esewa - deposits made to fonepay
      const cashBalance =
        totalCashIncome -
        totalExpensesCash -
        totalSavingsCash -
        totalDepositsCash +
        totalWithdrawalsCash -
        depositsToEsewa -
        depositsToFonepay;

      // Esewa Balance: Total income in Esewa - Total expense from Esewa - total withdrawal from Esewa + Deposits made to Esewa
      const esewaBalance =
        totalEsewaIncome -
        totalExpensesEsewa -
        totalSavingsEsewa +
        depositsToEsewa;

      // Fonepay Balance: Total Income in Fonepay - Withdrawals from fonepay - withdrawals from bank
      const fonepayBalance =
        totalFonepayIncome -
        totalExpensesFonepay -
        totalSavingsFonepay -
        totalWithdrawalsBank;

      // Cooperative Balance: Total cooperative savings - withdrawals from cooperative
      const cooperativeBalanceCalc =
        cooperativeSavings - totalWithdrawalsCooperative;

      // Total Balance of all: Cash Balance + Bank Balance (fonepay) + Cooperative Balance + Esewa Balance
      const totalBalance =
        cashBalance + fonepayBalance + cooperativeBalanceCalc + esewaBalance;

      const currentBalances = {
        cash: cashBalance,
        esewa: esewaBalance,
        fonepay: fonepayBalance,
        total: totalBalance,
      };

      // Calculate income breakdown using exact formulas
      const incomeBreakdown = {
        fromOrders: totalIncomeFromOrders,
        fromCharging: totalIncomeFromCharging,
      };

      // Calculate payment method breakdown:
      // total_income_cash: Sum of cash income from orders and charging
      const totalIncomeCash = summaries.reduce(
        (sum, s) => sum + (s.total_income_cash || 0),
        0,
      );

      // total_income_esewa: Sum of esewa income from orders and charging
      const totalIncomeEsewa = summaries.reduce(
        (sum, s) => sum + (s.total_income_esewa || 0),
        0,
      );

      // total_income_fonepay: Sum of fonepay income from orders and charging
      const totalIncomeFonepay = summaries.reduce(
        (sum, s) => sum + (s.total_income_fonepay || 0),
        0,
      );

      const paymentMethodBreakdown = {
        cash: totalIncomeCash,
        esewa: totalIncomeEsewa,
        fonepay: totalIncomeFonepay,
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
  }, [user]);

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

  const forceUpdateDailySummaries = async () => {
    setRefreshing(true);
    try {
      console.log("🔄 Force updating daily summaries...");

      // Get all withdrawal dates that might need updating
      const { data: withdrawalDates } = await supabase
        .from("withdrawals")
        .select("withdrawal_date")
        .order("withdrawal_date", { ascending: false });

      if (withdrawalDates && withdrawalDates.length > 0) {
        const uniqueDates = [
          ...new Set(withdrawalDates.map((w) => w.withdrawal_date)),
        ];
        console.log("📅 Found withdrawal dates to update:", uniqueDates);

        let updatedCount = 0;
        for (const date of uniqueDates) {
          try {
            const { error } = await supabase.rpc("update_daily_summary", {
              p_summary_date: date,
            });

            if (!error) {
              updatedCount++;
            }
          } catch (err) {
            console.log(`Failed to update daily summary for ${date}:`, err);
          }
        }

        toast.success(`Updated daily summaries for ${updatedCount} dates`);
      }

      // Refresh the data
      await fetchAllTimeSummary();
    } catch (error) {
      logError("force updating daily summaries", error);
      toast.error(
        `Failed to update daily summaries: ${extractErrorMessage(error)}`,
      );
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
  }, [user, fetchAllTimeSummary]);

  const handleDateRangeChange = async (dateRange: DateRange) => {
    setLoading(true);
    try {
      await fetchAllTimeSummary(dateRange);
    } finally {
      setLoading(false);
    }
  };

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
      <AllTimeSummaryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        summaryData={summaryData}
        onDateRangeChange={handleDateRangeChange}
      />
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
        <div className="flex items-center gap-2">
          <Button
<<<<<<< HEAD
            onClick={() => setIsModalOpen(true)}
            className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white"
            size="sm"
          >
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={forceUpdateDailySummaries}
            disabled={refreshing}
            className="flex items-center gap-2 text-orange-600 border-orange-300 hover:bg-orange-50"
          >
            <Database
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Force Update
=======
            variant="outline"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Eye className="h-4 w-4" />
            View Details
>>>>>>> origin/main
          </Button>
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

      {/* All-Time Summary Modal */}
      <AllTimeSummaryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};

export default AllTimeSummaryWidget;
