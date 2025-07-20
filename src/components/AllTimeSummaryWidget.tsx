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

  const fetchAllTimeSummary = useCallback(
    async (dateRange?: DateRange) => {
      if (!user) {
        console.warn("❌ No user found, cannot fetch summary");
        return;
      }

      setLoading(true);
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

        console.log("✅ Authentication verified, fetching daily summaries...");

        // Test basic connectivity first
        const { data: testData, error: testError } = await supabase
          .from("daily_summary")
          .select("summary_date")
          .limit(1);

        if (testError) {
          console.error("❌ Connectivity test failed:", testError);
          if (testError.message?.includes("Failed to fetch")) {
            toast.error(
              "Network connection failed. Please check your internet connection.",
            );
          } else {
            toast.error(`Database error: ${testError.message}`);
          }
          throw testError;
        }

        console.log(
          "✅ Connectivity test passed, proceeding with full query...",
        );

        let query = supabase
          .from("daily_summary")
          .select("*")
          .order("summary_date", { ascending: true });

        if (dateRange?.from) {
          query = query.gte(
            "summary_date",
            dateRange.from.toISOString().split("T")[0],
          );
        }
        if (dateRange?.to) {
          query = query.lt(
            "summary_date",
            dateRange.to.toISOString().split("T")[0],
          );
        }

        const { data: summariesData, error } = await query;

        if (error) {
          console.error("❌ Error fetching daily summaries:", {
            error,
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          });
          logError("AllTimeSummaryWidget", error);

          // Provide specific error messages based on error type
          if (error.message?.includes("Failed to fetch")) {
            toast.error(
              "Network connection lost. Please check your internet and try again.",
            );
          } else if (error.code === "PGRST116") {
            toast.error("Database table not found. Please contact support.");
          } else if (
            error.message?.includes("JWT") ||
            error.message?.includes("auth")
          ) {
            toast.error("Session expired. Please log in again.");
          } else {
            toast.error(
              `Failed to load summary: ${error.message || "Unknown error"}`,
            );
          }
          throw error;
        }

        const summaries = summariesData || [];
        console.log(`📊 Processing ${summaries.length} daily summaries...`);

        if (summaries.length === 0) {
          console.warn("⚠️ No daily summaries found");
          setSummaryData((prev) => ({
            ...prev,
            dataPoints: 0,
            dateRange: { from: "", to: "" },
          }));
          return;
        }

        // Calculate totals from all daily summaries
        const totals = summaries.reduce(
          (acc, summary) => {
            acc.totalIncome += summary.total_income || 0;
            acc.totalExpenses += summary.total_expenses || 0;
            acc.totalDeposits += summary.total_deposits || 0;
            acc.totalWithdrawals += summary.total_withdrawals || 0;
            acc.cooperativeSavings += summary.total_savings || 0;

            // Income breakdown
            acc.incomeBreakdown.fromOrders +=
              summary.total_income_from_orders || 0;
            acc.incomeBreakdown.fromCharging +=
              summary.total_income_from_charging || 0;

            // Payment method breakdown
            acc.paymentMethodBreakdown.cash += summary.total_cash_income || 0;
            acc.paymentMethodBreakdown.esewa += summary.total_esewa_income || 0;
            acc.paymentMethodBreakdown.fonepay +=
              summary.total_fonepay_income || 0;

            // Withdrawal breakdown
            acc.withdrawalBreakdown.fromBank +=
              summary.total_withdrawals_bank || 0;
            acc.withdrawalBreakdown.fromSavings +=
              summary.total_withdrawals_cooperative || 0;
            acc.withdrawalBreakdown.fromEsewa +=
              summary.total_withdrawals_esewa || 0;
            acc.withdrawalBreakdown.fromFonepay += 0; // Not tracked separately yet
            acc.withdrawalBreakdown.total += summary.total_withdrawals || 0;

            return acc;
          },
          {
            totalIncome: 0,
            totalExpenses: 0,
            totalDeposits: 0,
            totalWithdrawals: 0,
            cooperativeSavings: 0,
            incomeBreakdown: { fromOrders: 0, fromCharging: 0 },
            paymentMethodBreakdown: { cash: 0, esewa: 0, fonepay: 0 },
            withdrawalBreakdown: {
              fromBank: 0,
              fromSavings: 0,
              fromEsewa: 0,
              fromFonepay: 0,
              total: 0,
            },
          },
        );

        // Get current balances from the latest summary
        const latestSummary = summaries[summaries.length - 1];
        const currentBalances = {
          cash: latestSummary?.cash_balance || 0,
          esewa: latestSummary?.esewa_balance || 0,
          fonepay: latestSummary?.fonepay_balance || 0,
          total: latestSummary?.total_balance || 0,
        };

        const netProfit = totals.totalIncome - totals.totalExpenses;
        const firstDate = summaries[0]?.summary_date || "";
        const lastDate = summaries[summaries.length - 1]?.summary_date || "";

        const finalSummary: AllTimeSummaryData = {
          ...totals,
          netProfit,
          currentBalances,
          dataPoints: summaries.length,
          dateRange: {
            from: firstDate,
            to: lastDate,
          },
        };

        console.log("📈 All-time summary calculated:", finalSummary);
        setSummaryData(finalSummary);
      } catch (error) {
        const errorMessage = extractErrorMessage(error);
        console.error("❌ Error in fetchAllTimeSummary:", errorMessage);
        logError("AllTimeSummaryWidget", error);
        toast.error(`Failed to load all-time summary: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    },
    [user],
  );

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
