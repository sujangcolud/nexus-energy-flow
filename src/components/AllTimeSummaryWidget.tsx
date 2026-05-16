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
import { AllTimeSummaryModal } from "./AllTimeSummaryModal";
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
    currentBalances: { cash: 0, esewa: 0, fonepay: 0, cooperative: 0, total: 0 },
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
        console.log("📅 Date range provided:", dateRange);

        // Set up date filters for daily summary query
        // Note: daily_summary is a global table (no user_id column)
        let dailySummaryQuery = supabase
          .from("daily_summary")
          .select("*")
          .order("summary_date", { ascending: true });

        if (dateRange?.from) {
          const fromDate = dateRange.from.toISOString().split("T")[0];
          console.log("📅 Filtering from date:", fromDate);
          dailySummaryQuery = dailySummaryQuery.gte("summary_date", fromDate);
        }

        if (dateRange?.to) {
          const toDate = dateRange.to.toISOString().split("T")[0];
          console.log("📅 Filtering to date:", toDate);
          dailySummaryQuery = dailySummaryQuery.lte("summary_date", toDate);
        }

        if (!dateRange?.from && !dateRange?.to) {
          console.log("📅 No date filter - fetching ALL historical data");
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
            currentBalances: { cash: 0, esewa: 0, fonepay: 0, cooperative: 0, total: 0 },
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

        // Helper function for safe field access with fallback support
        const safeGet = (obj: any, primaryField: string, fallbackField?: string): number => {
          const primaryValue = Number(obj?.[primaryField]);
          if (!isNaN(primaryValue) && primaryValue !== 0) {
            return primaryValue;
          }
          if (fallbackField) {
            const fallbackValue = Number(obj?.[fallbackField]);
            return isNaN(fallbackValue) ? 0 : fallbackValue;
          }
          return 0;
        };

        // Aggregate all daily summaries into all-time totals
        const aggregatedSummary = dailySummaries.reduce((acc, daily) => {
          return {
            // Income totals with safe access and enhanced columns
            totalIncomeFromOrders: acc.totalIncomeFromOrders + safeGet(daily, 'total_income_from_orders', 'total_income'),
            totalIncomeFromCharging: acc.totalIncomeFromCharging + safeGet(daily, 'total_income_from_charging'),
            totalIncomeCash: acc.totalIncomeCash + safeGet(daily, 'total_cash_income', 'total_income_cash'),
            totalIncomeEsewa: acc.totalIncomeEsewa + safeGet(daily, 'total_esewa_income', 'total_income_esewa'),
            totalIncomeFonepay: acc.totalIncomeFonepay + safeGet(daily, 'total_fonepay_income', 'total_income_fonepay'),

            // Expense totals with safe access
            totalExpenses: acc.totalExpenses + safeGet(daily, 'total_expenses'),
            totalExpensesCash: acc.totalExpensesCash + safeGet(daily, 'total_expenses_cash'),
            totalExpensesEsewa: acc.totalExpensesEsewa + safeGet(daily, 'total_expenses_esewa'),
            totalExpensesFonepay: acc.totalExpensesFonepay + safeGet(daily, 'total_expenses_fonepay'),

            // Deposit totals with safe access
            totalDeposits: acc.totalDeposits + safeGet(daily, 'total_deposits'),
            totalDepositsCash: acc.totalDepositsCash + safeGet(daily, 'total_deposits_cash'),
            totalDepositsEsewa: acc.totalDepositsEsewa + safeGet(daily, 'total_deposits_esewa'),

            // Savings totals with safe access
            totalSavings: acc.totalSavings + safeGet(daily, 'total_savings'),

            // Withdrawal totals with safe access
            totalWithdrawals: acc.totalWithdrawals + safeGet(daily, 'total_withdrawals'),
            totalWithdrawalsCash: acc.totalWithdrawalsCash + safeGet(daily, 'total_withdrawals_cash'),
            totalWithdrawalsCooperative: acc.totalWithdrawalsCooperative + safeGet(daily, 'total_withdrawals_cooperative'),
            totalWithdrawalsBank: acc.totalWithdrawalsBank + safeGet(daily, 'total_withdrawals_bank'),
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
          totalWithdrawalsCash: 0,
          totalWithdrawalsCooperative: 0,
          totalWithdrawalsBank: 0,
        });

        // Calculate derived totals
        const totalIncome = aggregatedSummary.totalIncomeFromOrders + aggregatedSummary.totalIncomeFromCharging;
        const netProfit = totalIncome - aggregatedSummary.totalExpenses;

        // Calculate current balances - check daily_summary first, fallback to transaction calculation
        console.log("📊 Calculating balances from daily_summary table...");

        const latestSummary = dailySummaries[dailySummaries.length - 1];

        // Get balance values from daily_summary table
        let cashBalance = Number(latestSummary?.cash_balance) || 0;
        let esewaBalance = Number(latestSummary?.esewa_balance) || 0;
        let fonepayBalance = Number(latestSummary?.fonepay_balance) || 0;
        let cooperativeBalance = Number(latestSummary?.cooperative_balance) || 0;

        // If all balances are zero, calculate from aggregated totals using PROPER ACCOUNTING PRINCIPLES
        if (cashBalance === 0 && esewaBalance === 0 && fonepayBalance === 0 && cooperativeBalance === 0) {
          console.log("📊 Daily summary balances are zero, calculating from transaction totals...");

          // CASH IN HAND = Cash Income - Cash Expenses - Cash Savings + Cash Withdrawals
          // (When you make expenses in cash, cash reduces. When you save cash, cash reduces. When you withdraw cash, cash increases)
          cashBalance = aggregatedSummary.totalIncomeCash - aggregatedSummary.totalExpensesCash - aggregatedSummary.totalSavings + aggregatedSummary.totalWithdrawalsCash;

          // ESEWA BALANCE = eSewa Income - eSewa Expenses + Deposits to eSewa - Withdrawals from eSewa  
          // (Deposits to eSewa increase eSewa balance, withdrawals from eSewa decrease it)
          esewaBalance = aggregatedSummary.totalIncomeEsewa - aggregatedSummary.totalExpensesEsewa + aggregatedSummary.totalDepositsEsewa;

          // FONEPAY/BANK BALANCE = Fonepay Income - Fonepay Expenses + Deposits to Bank - Bank Withdrawals
          // (Bank deposits increase bank balance, bank withdrawals decrease it)
          fonepayBalance = aggregatedSummary.totalIncomeFonepay - aggregatedSummary.totalExpensesFonepay + aggregatedSummary.totalDepositsCash - aggregatedSummary.totalWithdrawalsBank;

          // COOPERATIVE BALANCE = Total Savings - Cooperative Withdrawals
          // (This is correct - savings go into cooperative, withdrawals come out)
          cooperativeBalance = aggregatedSummary.totalSavings - aggregatedSummary.totalWithdrawalsCooperative;
        }

        const totalBalance = cashBalance + esewaBalance + fonepayBalance + cooperativeBalance;

        console.log("💰 Calculated balances:", {
          cash: cashBalance,
          esewa: esewaBalance,
          fonepay: fonepayBalance,
          cooperative: cooperativeBalance,
          total: totalBalance
        });

        const currentBalances = {
          cash: cashBalance,
          esewa: esewaBalance,
          fonepay: fonepayBalance,
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
          currentBalances: { cash: 0, esewa: 0, fonepay: 0, cooperative: 0, total: 0 },
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
      // If dateRange is empty object or no from/to, treat as "all time"
      const isAllTime = !dateRange || (!dateRange.from && !dateRange.to);
      await fetchAllTimeSummary(isAllTime ? undefined : dateRange);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => formatCurrencyUtil(amount);

  if (!user) {
    return null;
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
          <Clock className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">
            Lifetime Stats
          </h2>
          <Badge variant="secondary" className="rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-500 border-none">
            {summaryData.dataPoints} DAYS
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="rounded-full font-bold text-xs uppercase text-primary hover:bg-primary/5"
          >
            Details
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchAllTimeSummary()}
            disabled={loading}
            className="rounded-full font-bold text-xs uppercase text-muted-foreground"
          >
            <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
          </div>
        ) : connectionError ? (
          <Card className="rounded-3xl border-none bg-rose-50 p-6 text-center">
            <AlertCircle className="h-8 w-8 text-rose-500 mx-auto mb-3" />
            <p className="text-xs font-black uppercase text-rose-800 mb-4">Sync Error</p>
            <Button onClick={retryFetch} size="sm" className="rounded-full bg-rose-600 font-bold uppercase text-[10px]">Retry</Button>
          </Card>
        ) : summaryData.dataPoints === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No historical data available</p>
          </div>
        ) : (
          <>
            {/* Quick Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Card className="rounded-3xl border-none shadow-sm bg-slate-900 text-white overflow-hidden">
                <CardContent className="p-4">
                  <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Total Income</p>
                  <p className="text-lg font-black text-emerald-400 truncate">
                    {formatCurrency(summaryData.totalIncome)}
                  </p>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden">
                <CardContent className="p-4">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Total Burn</p>
                  <p className="text-lg font-black text-rose-500 truncate">
                    {formatCurrency(summaryData.totalExpenses)}
                  </p>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden">
                <CardContent className="p-4">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Net Flow</p>
                  <p className={cn("text-lg font-black truncate", summaryData.netProfit >= 0 ? "text-emerald-600" : "text-rose-600")}>
                    {formatCurrency(summaryData.netProfit)}
                  </p>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden">
                <CardContent className="p-4">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Savings</p>
                  <p className="text-lg font-black text-violet-600 truncate">
                    {formatCurrency(summaryData.cooperativeSavings)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Current Balances */}
            <Card className="rounded-3xl border-none shadow-2xl bg-white overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-4 flex flex-row items-center justify-between">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <Banknote className="h-3 w-3" />
                  Live Balances
                </CardTitle>
                <span className="text-[10px] font-black text-primary">
                  TOTAL: {formatCurrency(summaryData.currentBalances.total)}
                </span>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Cash</p>
                    <p className="text-sm font-black text-slate-800">{formatCurrency(summaryData.currentBalances.cash)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">eSewa</p>
                    <p className="text-sm font-black text-slate-800">{formatCurrency(summaryData.currentBalances.esewa)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Fonepay</p>
                    <p className="text-sm font-black text-slate-800">{formatCurrency(summaryData.currentBalances.fonepay)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Savings</p>
                    <p className="text-sm font-black text-slate-800">{formatCurrency(summaryData.currentBalances.cooperative)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default AllTimeSummaryWidget;
