import { useState, useEffect, useCallback } from "react";
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
import AllTimeSummaryModal from "./AllTimeSummaryModal";
import { DateRange } from "react-day-picker";
import { formatCurrency as formatCurrencyUtil } from "@/lib/calculations";

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
    bank: number;
    cooperative: number;
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
  withdrawalBreakdown: {
    fromBank: number;
    fromSavings: number;
    fromEsewa: number;
    fromFonepay: number;
    total: number;
  };
  dataPoints: number;
  dateRange: {
    from: string;
    to: string;
  };
}

interface AllTimeSummaryWidgetProps {
  className?: string;
}

const AllTimeSummaryWidget: React.FC<AllTimeSummaryWidgetProps> = ({
  className,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [networkStatus, setNetworkStatus] = useState(navigator.onLine);
  const [summaryData, setSummaryData] = useState<AllTimeSummaryData>({
    totalIncome: 0,
    totalExpenses: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
    cooperativeSavings: 0,
    netProfit: 0,
    currentBalances: { cash: 0, esewa: 0, fonepay: 0, bank: 0, cooperative: 0, total: 0 },
    incomeBreakdown: { fromOrders: 0, fromCharging: 0 },
    paymentMethodBreakdown: { cash: 0, esewa: 0, fonepay: 0 },
    withdrawalBreakdown: {
      fromBank: 0,
      fromSavings: 0,
      fromEsewa: 0,
      fromFonepay: 0,
      total: 0,
    },
    dataPoints: 0,
    dateRange: { from: "", to: "" },
  });
  const [isModalOpen, setIsModalOpen] = useState(false);



  const fetchAllTimeSummary = useCallback(
    async (dateRange?: DateRange) => {
      if (!user) {
        console.warn("❌ No user found, cannot fetch summary");
        return;
      }

      setLoading(true);
      setConnectionError(false);
      try {
        console.log("✅ Fetching all-time summary from daily summary table...");

        // Set up date filters for daily summary query
        // Note: daily_summary is a global table (no user_id column)
        let dailySummaryQuery = supabase
          .from("daily_summary")
          .select("*")
          .order("summary_date", { ascending: true });

        if (dateRange?.from) {
          const fromDate = dateRange.from.toISOString().split("T")[0];
          dailySummaryQuery = dailySummaryQuery.gte("summary_date", fromDate);
        }

        if (dateRange?.to) {
          const toDate = dateRange.to.toISOString().split("T")[0];
          dailySummaryQuery = dailySummaryQuery.lte("summary_date", toDate);
        }

        const { data: dailySummaries, error: summaryError } = await dailySummaryQuery;

        if (summaryError) {
          console.error("❌ Error fetching daily summaries:", summaryError);
          throw summaryError;
        }

        console.log("📊 Daily summaries fetched:", dailySummaries?.length || 0, "records");

        if (!dailySummaries || dailySummaries.length === 0) {
          console.warn("⚠️ No daily summary data found");
          setSummaryData({
            totalIncome: 0,
            totalExpenses: 0,
            totalDeposits: 0,
            totalWithdrawals: 0,
            cooperativeSavings: 0,
            netProfit: 0,
            currentBalances: { cash: 0, esewa: 0, fonepay: 0, bank: 0, cooperative: 0, total: 0 },
            incomeBreakdown: { fromOrders: 0, fromCharging: 0 },
            paymentMethodBreakdown: { cash: 0, esewa: 0, fonepay: 0 },
            withdrawalBreakdown: {
              fromBank: 0,
              fromSavings: 0,
              fromEsewa: 0,
              fromFonepay: 0,
              total: 0,
            },
            dataPoints: 0,
            dateRange: { from: "", to: "" },
          });
          return;
        }

        // Aggregate all daily summaries using existing schema fields
        const aggregatedSummary = dailySummaries.reduce((acc, daily) => {
          return {
            // Income totals using existing schema
            totalIncomeFromOrders: acc.totalIncomeFromOrders + (Number(daily.total_income_from_orders) || 0),
            totalIncomeFromCharging: acc.totalIncomeFromCharging + (Number(daily.total_income_from_charging) || 0),
            totalIncomeCash: acc.totalIncomeCash + (Number(daily.total_income_cash) || 0),
            totalIncomeEsewa: acc.totalIncomeEsewa + (Number(daily.total_income_esewa) || 0),
            totalIncomeFonepay: acc.totalIncomeFonepay + (Number(daily.total_income_fonepay) || 0),

            // Expense totals
            totalExpenses: acc.totalExpenses + (Number(daily.total_expenses) || 0),
            totalExpensesCash: acc.totalExpensesCash + (Number(daily.total_expenses_cash) || 0),
            totalExpensesEsewa: acc.totalExpensesEsewa + (Number(daily.total_expenses_esewa) || 0),
            totalExpensesFonepay: acc.totalExpensesFonepay + (Number(daily.total_expenses_fonepay) || 0),

            // Deposit totals
            totalDeposits: acc.totalDeposits + (Number(daily.total_deposits) || 0),
            totalDepositsCash: acc.totalDepositsCash + (Number(daily.total_deposits_cash) || 0),
            totalDepositsEsewa: acc.totalDepositsEsewa + (Number(daily.total_deposits_esewa) || 0),

            // Savings totals
            totalSavings: acc.totalSavings + (Number(daily.total_savings) || 0),

            // Enhanced withdrawal totals by source and payment mode
            totalWithdrawals: acc.totalWithdrawals + (Number(daily.total_withdrawals) || 0),
            totalWithdrawalsCooperative: acc.totalWithdrawalsCooperative + (Number(daily.total_withdrawals_cooperative) || 0),
            totalWithdrawalsCooperativeCash: acc.totalWithdrawalsCooperativeCash + (Number(daily.total_withdrawals_cooperative_cash) || 0),
            totalWithdrawalsCooperativeEsewa: acc.totalWithdrawalsCooperativeEsewa + (Number(daily.total_withdrawals_cooperative_esewa) || 0),
            totalWithdrawalsCooperativeFonepay: acc.totalWithdrawalsCooperativeFonepay + (Number(daily.total_withdrawals_cooperative_fonepay) || 0),
            totalWithdrawalsBank: acc.totalWithdrawalsBank + (Number(daily.total_withdrawals_bank) || 0),
            totalWithdrawalsBankCash: acc.totalWithdrawalsBankCash + (Number(daily.total_withdrawals_bank_cash) || 0),
            totalWithdrawalsBankEsewa: acc.totalWithdrawalsBankEsewa + (Number(daily.total_withdrawals_bank_esewa) || 0),
          };
        }, {
          totalIncomeFromOrders: 0,
          totalIncomeFromCharging: 0,
          totalIncomeCash: 0,
          totalIncomeEsewa: 0,
          totalIncomeFonepay: 0,
          totalExpenses: 0,
          totalExpensesCash: 0,
          totalExpensesEsewa: 0,
          totalExpensesFonepay: 0,
          totalDeposits: 0,
          totalDepositsCash: 0,
          totalDepositsEsewa: 0,
          totalSavings: 0,
          totalWithdrawals: 0,
          totalWithdrawalsCooperative: 0,
          totalWithdrawalsCooperativeCash: 0,
          totalWithdrawalsCooperativeEsewa: 0,
          totalWithdrawalsCooperativeFonepay: 0,
          totalWithdrawalsBank: 0,
          totalWithdrawalsBankCash: 0,
          totalWithdrawalsBankEsewa: 0,
        });

        // Calculate derived totals
        const totalIncome = aggregatedSummary.totalIncomeFromOrders + aggregatedSummary.totalIncomeFromCharging;
        const netProfit = totalIncome - aggregatedSummary.totalExpenses;

        // Get the most recent balances (calculated using CSV formulas)
        const latestSummary = dailySummaries[dailySummaries.length - 1];

        // Use the calculated balances from the latest daily summary (these follow CSV formulas)
        const cashBalance = Number(latestSummary.cash_balance) || 0;
        const esewaBalance = Number(latestSummary.esewa_balance) || 0;
        const fonepayBalance = Number(latestSummary.fonepay_balance) || 0;
        const cooperativeBalance = Number(latestSummary.cooperative_balance) || 0;

        // Bank Balance: Enhanced calculation based on CSV formula
        // Bank Balance = Current calculations + Cash Deposits + Esewa Deposits
        const bankBalance = fonepayBalance + (aggregatedSummary.totalDepositsCash || 0) + (aggregatedSummary.totalDepositsEsewa || 0);

        // Total Balance: Sum of all balances
        const totalBalance = cashBalance + bankBalance + esewaBalance + cooperativeBalance;

        const currentBalances = {
          cash: cashBalance,
          esewa: esewaBalance,
          fonepay: fonepayBalance,
          bank: bankBalance,
          cooperative: cooperativeBalance,
          total: totalBalance,
        };

        // Get date range
        const firstDate = dailySummaries[0]?.summary_date || "";
        const lastDate = dailySummaries[dailySummaries.length - 1]?.summary_date || "";
        const dataPoints = dailySummaries.length;

        const finalSummary: AllTimeSummaryData = {
          totalIncome,
          totalExpenses: aggregatedSummary.totalExpenses,
          totalDeposits: aggregatedSummary.totalDeposits,
          totalWithdrawals: aggregatedSummary.totalWithdrawals,
          cooperativeSavings: aggregatedSummary.totalSavings,
          netProfit,
          currentBalances,
          incomeBreakdown: {
            fromOrders: aggregatedSummary.totalIncomeFromOrders,
            fromCharging: aggregatedSummary.totalIncomeFromCharging,
          },
          paymentMethodBreakdown: {
            cash: aggregatedSummary.totalIncomeCash,
            esewa: aggregatedSummary.totalIncomeEsewa,
            fonepay: aggregatedSummary.totalIncomeFonepay,
          },
          withdrawalBreakdown: {
            fromBank: aggregatedSummary.totalWithdrawalsBank,
            fromSavings: aggregatedSummary.totalWithdrawalsCooperative,
            fromEsewa: 0, // Not separately tracked in daily summary
            fromFonepay: 0, // Not separately tracked in daily summary
            total: aggregatedSummary.totalWithdrawals,
          },
          dataPoints,
          dateRange: {
            from: firstDate,
            to: lastDate,
          },
        };

        console.log("📈 All-time summary calculated from daily summaries:", finalSummary);
        console.log("📊 Summary breakdown:", {
          income: {
            orders: aggregatedSummary.totalIncomeFromOrders,
            charging: aggregatedSummary.totalIncomeFromCharging,
            cash: aggregatedSummary.totalIncomeCash,
            esewa: aggregatedSummary.totalIncomeEsewa,
            fonepay: aggregatedSummary.totalIncomeFonepay,
          },
          expenses: {
            total: aggregatedSummary.totalExpenses,
            cash: aggregatedSummary.totalExpensesCash,
            esewa: aggregatedSummary.totalExpensesEsewa,
            fonepay: aggregatedSummary.totalExpensesFonepay,
          },
          balances: currentBalances,
        });

        setSummaryData(finalSummary);
        setRetryCount(0);
      } catch (error) {
        setConnectionError(true);
        const errorMessage = extractErrorMessage(error);
        console.error("❌ Error in fetchAllTimeSummary:", {
          errorMessage,
          error,
          userAgent: navigator.userAgent,
          online: navigator.onLine,
          url: window.location.href,
          timestamp: new Date().toISOString(),
        });

        logError("AllTimeSummaryWidget", error);

        // Set fallback/empty data to prevent UI crash
        setSummaryData({
          totalIncome: 0,
          totalExpenses: 0,
          totalDeposits: 0,
          totalWithdrawals: 0,
          cooperativeSavings: 0,
          netProfit: 0,
          currentBalances: { cash: 0, esewa: 0, fonepay: 0, bank: 0, cooperative: 0, total: 0 },
          incomeBreakdown: { fromOrders: 0, fromCharging: 0 },
          paymentMethodBreakdown: { cash: 0, esewa: 0, fonepay: 0 },
          withdrawalBreakdown: {
            fromBank: 0,
            fromSavings: 0,
            fromEsewa: 0,
            fromFonepay: 0,
            total: 0,
          },
          dataPoints: 0,
          dateRange: { from: "", to: "" },
        });

        toast.error(`Failed to load all-time summary: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    },
    [user],
  );

  const checkConnection = async () => {
    try {
      console.log("🔍 Testing Supabase connection...");

      // Test basic table access
      const { data, error } = await supabase
        .from("orders")
        .select("id")
        .limit(1);

      if (error) {
        console.error("❌ Connection test failed:", error);
        return false;
      }

      console.log("✅ Connection test successful");
      return true;
    } catch (error) {
      console.error("❌ Connection test error:", error);
      return false;
    }
  };

  const retryFetch = async () => {
    if (retryCount >= 3) {
      toast.error("Maximum retry attempts reached. Please refresh the page.");
      return;
    }

    setRetryCount((prev) => prev + 1);
    console.log(`🔄 Retrying fetch attempt ${retryCount + 1}/3...`);

    // Test connection first
    const isConnected = await checkConnection();
    if (!isConnected) {
      toast.error(
        "Still unable to connect to database. Please check your internet connection.",
      );
      return;
    }

    await fetchAllTimeSummary();
  };

  const forceUpdateDailySummaries = async () => {
    if (!user) return;

    setRefreshing(true);
    try {
      toast.info("🔄 Force updating daily summaries...");

      // This would call a function to recalculate all daily summaries
      const { error } = await supabase.rpc("update_all_daily_summaries");

      if (error) {
        console.error("Error force updating summaries:", error);
        throw error;
      }

      toast.success("✅ Daily summaries updated successfully");
      // Refresh the data after update
      await fetchAllTimeSummary();
    } catch (error) {
      const errorMessage = extractErrorMessage(error);
      console.error("❌ Error force updating summaries:", errorMessage);
      toast.error(`Force update failed: ${errorMessage}`);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAllTimeSummary();
    }
  }, [user, fetchAllTimeSummary]);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      console.log("🟢 Network connection restored");
      setNetworkStatus(true);
      if (connectionError) {
        toast.success("Network connection restored. Retrying...");
        fetchAllTimeSummary();
      }
    };

    const handleOffline = () => {
      console.log("🔴 Network connection lost");
      setNetworkStatus(false);
      setConnectionError(true);
      toast.error("Network connection lost");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [connectionError, fetchAllTimeSummary]);

  const handleDateRangeChange = async (dateRange: DateRange) => {
    setLoading(true);
    try {
      await fetchAllTimeSummary(dateRange);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => formatCurrencyUtil(amount);

  if (!user) {
    return null;
  }

  return (
    <Card className={`border-2 border-purple-200 shadow-lg ${className}`}>
      <AllTimeSummaryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        summaryData={summaryData}
        onDateRangeChange={handleDateRangeChange}
      />
      {/* Header with Refresh Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
            All-Time Summary
          </h2>
          <Badge
            variant="outline"
            className="text-purple-600 border-purple-300 text-xs"
          >
            {summaryData.dataPoints} days
          </Badge>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
          <Button
            onClick={() => setIsModalOpen(true)}
            className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white text-xs sm:text-sm px-2 sm:px-3"
            size="sm"
          >
            <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">View Details</span>
            <span className="sm:hidden">Details</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAllTimeSummary()}
            disabled={loading}
            className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3"
          >
            <RefreshCw
              className={`h-3 w-3 sm:h-4 sm:w-4 ${loading ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">Refresh</span>
            <span className="sm:hidden">↻</span>
          </Button>
        </div>
      </div>

      <CardContent className="pt-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            <span className="ml-2 text-gray-600">Loading summary...</span>
          </div>
        ) : connectionError ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500 space-y-4">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <div className="text-center">
              <p className="font-medium text-red-600">Connection Error</p>
              <p className="text-sm">Failed to load summary data</p>
              <div className="flex items-center justify-center mt-2 space-x-2">
                <div
                  className={`w-2 h-2 rounded-full ${networkStatus ? "bg-green-500" : "bg-red-500"}`}
                ></div>
                <p className="text-xs text-gray-400">
                  Network: {networkStatus ? "Online" : "Offline"} | Attempt{" "}
                  {retryCount}/3
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={retryFetch}
                variant="outline"
                size="sm"
                disabled={loading || retryCount >= 3 || !networkStatus}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
                />
                {loading ? "Retrying..." : "Retry Connection"}
              </Button>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                size="sm"
              >
                Refresh Page
              </Button>
            </div>

            {/* Debug Information (only show in development or for admins) */}
            {process.env.NODE_ENV === "development" && (
              <details className="mt-4 text-xs text-gray-500">
                <summary className="cursor-pointer hover:text-gray-700">
                  Debug Info
                </summary>
                <div className="mt-2 p-2 bg-gray-100 rounded text-left">
                  <p>• URL: {window.location.href}</p>
                  <p>• User Agent: {navigator.userAgent.substring(0, 50)}...</p>
                  <p>• Online: {navigator.onLine ? "Yes" : "No"}</p>
                  <p>• User: {user?.email || "Not logged in"}</p>
                  <p>• Retry Count: {retryCount}</p>
                  <p>• Timestamp: {new Date().toISOString()}</p>
                </div>
              </details>
            )}
          </div>
        ) : summaryData.dataPoints === 0 ? (
          <div className="flex items-center justify-center py-8 text-gray-500">
            <AlertCircle className="h-6 w-6 mr-2" />
            <span>No data available for the selected period</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Quick Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700">
                    Total Income
                  </span>
                </div>
                <div className="text-xl font-bold text-green-800">
                  {formatCurrency(summaryData.totalIncome)}
                </div>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-rose-50 p-4 rounded-lg border border-red-200">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium text-red-700">
                    Total Expenses
                  </span>
                </div>
                <div className="text-xl font-bold text-red-800">
                  {formatCurrency(summaryData.totalExpenses)}
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">
                    Net Profit
                  </span>
                </div>
                <div
                  className={`text-xl font-bold ${
                    summaryData.netProfit >= 0
                      ? "text-green-800"
                      : "text-red-800"
                  }`}
                >
                  {formatCurrency(summaryData.netProfit)}
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-4 rounded-lg border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <PiggyBank className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-700">
                    Cooperative Savings
                  </span>
                </div>
                <div className="text-xl font-bold text-purple-800">
                  {formatCurrency(summaryData.cooperativeSavings)}
                </div>
              </div>
            </div>

            {/* Current Balances */}
            <div className="bg-gradient-to-br from-gray-50 to-slate-50 p-4 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Banknote className="h-5 w-5" />
                Current Balances
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="text-center">
                  <div className="text-sm text-gray-600">Cash</div>
                  <div className="text-lg font-semibold text-green-600">
                    {formatCurrency(summaryData.currentBalances.cash)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600">eSewa</div>
                  <div className="text-lg font-semibold text-blue-600">
                    {formatCurrency(summaryData.currentBalances.esewa)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600">Fonepay</div>
                  <div className="text-lg font-semibold text-purple-600">
                    {formatCurrency(summaryData.currentBalances.fonepay)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600">Bank</div>
                  <div className="text-lg font-semibold text-orange-600">
                    {formatCurrency(summaryData.currentBalances.bank)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600">Cooperative</div>
                  <div className="text-lg font-semibold text-indigo-600">
                    {formatCurrency(summaryData.currentBalances.cooperative)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600">Total Balance</div>
                  <div className="text-lg font-semibold text-gray-800">
                    {formatCurrency(summaryData.currentBalances.total)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AllTimeSummaryWidget;
