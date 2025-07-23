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
    currentBalances: { cash: 0, esewa: 0, fonepay: 0, total: 0 },
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

  const processTransactions = (
    transactions: any[],
    amountField: string,
    paymentField: string,
  ) => {
    const count = transactions.length;
    const total = transactions.reduce(
      (sum, t) => sum + (t[amountField] || 0),
      0,
    );
    const by_payment: Record<string, { count: number; total: number }> = {};

    transactions.forEach((t) => {
      const payment = t[paymentField] || "Unknown";
      const normalizedPayment = payment.toLowerCase().includes("esewa") ? "esewa" :
                                payment.toLowerCase().includes("fonepay") ? "fonepay" :
                                payment.toLowerCase().includes("cash") ? "cash" :
                                payment.toLowerCase().includes("bank") ? "fonepay" : // Bank transfers counted as fonepay
                                payment;

      if (!by_payment[normalizedPayment]) {
        by_payment[normalizedPayment] = { count: 0, total: 0 };
      }
      by_payment[normalizedPayment].count++;
      by_payment[normalizedPayment].total += t[amountField] || 0;
    });

    return { count, total, by_payment };
  };

  const fetchAllTimeSummary = useCallback(
    async (dateRange?: DateRange) => {
      if (!user) {
        console.warn("❌ No user found, cannot fetch summary");
        return;
      }

      setLoading(true);
      setConnectionError(false);
      try {
        // Check authentication status first
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("❌ Authentication error:", sessionError);
          toast.error("Authentication expired. Please log in again.");
          return;
        }

        if (!session) {
          console.warn("❌ No active session found");
          toast.error("Please log in to view summary data.");
          return;
        }

        console.log("✅ Authentication verified, fetching raw transaction data...");

        // Set up date filters
        let fromDate = "";
        let toDate = "";

        if (dateRange?.from) {
          fromDate = dateRange.from.toISOString().split("T")[0];
        }
        if (dateRange?.to) {
          toDate = dateRange.to.toISOString().split("T")[0];
        }

        // Build queries for all transaction tables
        let ordersQuery = supabase
          .from("orders")
          .select("*")
          .eq("user_id", user.id);

        let chargingQuery = supabase
          .from("charging_sessions")
          .select("*")
          .eq("user_id", user.id);

        let expensesQuery = supabase
          .from("expenses")
          .select("*")
          .eq("user_id", user.id);

        let depositsQuery = supabase
          .from("deposits")
          .select("*")
          .eq("user_id", user.id);

        let withdrawalsQuery = supabase
          .from("withdrawals")
          .select("*")
          .eq("user_id", user.id);

        let savingsQuery = supabase
          .from("cooperative_savings")
          .select("*")
          .eq("user_id", user.id);

        // Apply date filters if provided
        if (fromDate) {
          ordersQuery = ordersQuery.gte("order_date", fromDate);
          chargingQuery = chargingQuery.gte("session_date", fromDate);
          expensesQuery = expensesQuery.gte("expense_date", fromDate);
          depositsQuery = depositsQuery.gte("deposit_date", fromDate);
          withdrawalsQuery = withdrawalsQuery.gte("withdrawal_date", fromDate);
          savingsQuery = savingsQuery.gte("contribution_date", fromDate);
        }

        if (toDate) {
          ordersQuery = ordersQuery.lte("order_date", toDate);
          chargingQuery = chargingQuery.lte("session_date", toDate);
          expensesQuery = expensesQuery.lte("expense_date", toDate);
          depositsQuery = depositsQuery.lte("deposit_date", toDate);
          withdrawalsQuery = withdrawalsQuery.lte("withdrawal_date", toDate);
          savingsQuery = savingsQuery.lte("contribution_date", toDate);
        }

        // Execute all queries in parallel
        const [
          { data: orders, error: ordersError },
          { data: charging, error: chargingError },
          { data: expenses, error: expensesError },
          { data: deposits, error: depositsError },
          { data: withdrawals, error: withdrawalsError },
          { data: savings, error: savingsError },
        ] = await Promise.all([
          ordersQuery,
          chargingQuery,
          expensesQuery,
          depositsQuery,
          withdrawalsQuery,
          savingsQuery,
        ]);

        // Check for errors
        if (ordersError) throw ordersError;
        if (chargingError) throw chargingError;
        if (expensesError) throw expensesError;
        if (depositsError) throw depositsError;
        if (withdrawalsError) throw withdrawalsError;
        if (savingsError) throw savingsError;

        console.log("📊 Raw transaction data fetched:", {
          orders: orders?.length || 0,
          charging: charging?.length || 0,
          expenses: expenses?.length || 0,
          deposits: deposits?.length || 0,
          withdrawals: withdrawals?.length || 0,
          savings: savings?.length || 0,
        });

        // Process transactions using the same logic as DailyClosingSystem
        const ordersData = processTransactions(orders || [], "total", "payment_mode");
        const chargingData = processTransactions(charging || [], "total_amount", "payment_mode");
        const expensesData = processTransactions(expenses || [], "amount", "payment_mode");
        const depositsData = processTransactions(deposits || [], "amount", "mode");
        const withdrawalsData = processTransactions(withdrawals || [], "amount", "payment_mode");
        const savingsData = processTransactions(savings || [], "contribution_amount", "payment_mode");

        // Calculate totals
        const totalIncome = ordersData.total + chargingData.total;
        const totalExpenses = expensesData.total;
        const totalDeposits = depositsData.total;
        const totalWithdrawals = withdrawalsData.total;
        const cooperativeSavings = savingsData.total;

        // Calculate payment method breakdowns
        const cashIncome = (ordersData.by_payment.cash?.total || 0) + (chargingData.by_payment.cash?.total || 0);
        const esewaIncome = (ordersData.by_payment.esewa?.total || 0) + (chargingData.by_payment.esewa?.total || 0);
        const fonepayIncome = (ordersData.by_payment.fonepay?.total || 0) + (chargingData.by_payment.fonepay?.total || 0);

        // Calculate withdrawal breakdown
        const withdrawalBreakdown = {
          fromBank: withdrawalsData.by_payment.fonepay?.total || 0, // Bank withdrawals via Fonepay
          fromSavings: withdrawalsData.total, // Most withdrawals are from cooperative savings
          fromEsewa: withdrawalsData.by_payment.esewa?.total || 0,
          fromFonepay: withdrawalsData.by_payment.fonepay?.total || 0,
          total: withdrawalsData.total,
        };

        // Calculate current balances using the same logic as DailyClosingSystem
        const cashExpenses = expensesData.by_payment.cash?.total || 0;
        const esewaExpenses = expensesData.by_payment.esewa?.total || 0;
        const fonepayExpenses = expensesData.by_payment.fonepay?.total || 0;

        const cashSavings = savingsData.by_payment.cash?.total || savingsData.total; // Assume cash if not specified
        const cashDeposits = depositsData.by_payment.cash?.total || 0;
        const cashWithdrawals = withdrawalsData.by_payment.cash?.total || 0;

        const currentBalances = {
          cash: cashIncome - cashExpenses - cashSavings - cashDeposits + cashWithdrawals,
          esewa: esewaIncome - esewaExpenses,
          fonepay: fonepayIncome - fonepayExpenses - (withdrawalsData.by_payment.fonepay?.total || 0),
          total: 0, // Will be calculated below
        };

        // Calculate cooperative balance
        const cooperativeBalance = cooperativeSavings - withdrawalsData.total;
        currentBalances.total = currentBalances.cash + currentBalances.esewa + currentBalances.fonepay + cooperativeBalance;

        const netProfit = totalIncome - totalExpenses;

        // Get date range for display
        const allDates = [
          ...(orders || []).map(o => o.order_date),
          ...(charging || []).map(c => c.session_date),
          ...(expenses || []).map(e => e.expense_date),
          ...(deposits || []).map(d => d.deposit_date),
          ...(withdrawals || []).map(w => w.withdrawal_date),
          ...(savings || []).map(s => s.contribution_date),
        ].filter(Boolean).sort();

        const firstDate = allDates[0] || "";
        const lastDate = allDates[allDates.length - 1] || "";
        const dataPoints = new Set(allDates).size;

        const finalSummary: AllTimeSummaryData = {
          totalIncome,
          totalExpenses,
          totalDeposits,
          totalWithdrawals,
          cooperativeSavings,
          netProfit,
          currentBalances,
          incomeBreakdown: {
            fromOrders: ordersData.total,
            fromCharging: chargingData.total,
          },
          paymentMethodBreakdown: {
            cash: cashIncome,
            esewa: esewaIncome,
            fonepay: fonepayIncome,
          },
          withdrawalBreakdown,
          dataPoints,
          dateRange: {
            from: firstDate,
            to: lastDate,
          },
        };

        console.log("📈 All-time summary calculated from raw data:", finalSummary);
        setSummaryData(finalSummary);
        setRetryCount(0); // Reset retry count on success
      } catch (error) {
        setConnectionError(true);
        const errorMessage = extractErrorMessage(error);
        console.error("❌ Error in fetchAllTimeSummary:", {
          errorMessage,
          error,
          errorType: typeof error,
          errorProperties: error ? Object.getOwnPropertyNames(error) : [],
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
          currentBalances: { cash: 0, esewa: 0, fonepay: 0, total: 0 },
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

  const formatCurrency = (amount: number) => `NRs. ${amount.toFixed(2)}`;

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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
