import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Database,
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  ShoppingCart,
  Zap,
  Receipt,
  PiggyBank,
  Banknote,
  ArrowUpDown,
  CheckCircle,
  AlertTriangle,
  Save,
  Eye,
  BarChart3,
  Smartphone,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { extractErrorMessage, logError } from "@/utils/errorHandling";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { formatCurrency as formatCurrencyUtil } from "@/lib/calculations";

interface TransactionSummary {
  orders: {
    count: number;
    total: number;
    by_payment: Record<string, { count: number; total: number }>;
  };
  charging: {
    count: number;
    total: number;
    by_payment: Record<string, { count: number; total: number }>;
  };
  expenses: {
    count: number;
    total: number;
    by_payment: Record<string, { count: number; total: number }>;
  };
  deposits: {
    count: number;
    total: number;
    by_payment: Record<string, { count: number; total: number }>;
  };
  withdrawals: {
    count: number;
    total: number;
    by_payment: Record<string, { count: number; total: number }>;
  };
  cooperative_savings: {
    count: number;
    total: number;
    by_payment: Record<string, { count: number; total: number }>;
  };
}

interface DailyClosingSystemProps {
  isOpen: boolean;
  onClose: () => void;
}

const DailyClosingSystem: React.FC<DailyClosingSystemProps> = ({
  isOpen,
  onClose,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [transactionSummary, setTransactionSummary] =
    useState<TransactionSummary | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [alreadyClosed, setAlreadyClosed] = useState(false);
  const [viewMode, setViewMode] = useState<"daily" | "alltime">("daily");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [allTimeSummary, setAllTimeSummary] =
    useState<TransactionSummary | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      if (viewMode === "daily") {
        fetchDayData();
      } else {
        fetchAllTimeData();
      }
    }
  }, [isOpen, selectedDate, user, viewMode, dateRange]);

  const fetchDayData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      console.log("📅 Fetching daily data from daily_summary table for:", selectedDate);

      // Fetch daily summary for the selected date
      const { data: dailySummaryData, error: summaryError } = await supabase
        .from("daily_summary")
        .select("*")
        .eq("summary_date", selectedDate)
        .single();

      // Check if already closed - only if there's meaningful closing data with actual totals
      const hasValidSummary =
        dailySummaryData &&
        !summaryError &&
        (dailySummaryData.total_income > 0 ||
          dailySummaryData.total_expenses > 0 ||
          dailySummaryData.total_deposits > 0 ||
          dailySummaryData.total_withdrawals > 0);
      setAlreadyClosed(!!hasValidSummary);

      if (summaryError && summaryError.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw summaryError;
      }

      // If no daily summary exists, initialize with zeros
      const summary: TransactionSummary = {
        orders: {
          count: 0,
          total: Number(dailySummaryData?.total_income_from_orders) || 0,
          by_payment: {
            cash: { count: 0, total: Number(dailySummaryData?.total_income_cash) || 0 },
            esewa: { count: 0, total: Number(dailySummaryData?.total_income_esewa) || 0 },
            fonepay: { count: 0, total: Number(dailySummaryData?.total_income_fonepay) || 0 },
          }
        },
        charging: {
          count: 0,
          total: Number(dailySummaryData?.total_income_from_charging) || 0,
          by_payment: {} // Charging payment mode breakdown is included in total income payment modes
        },
        expenses: {
          count: 0,
          total: Number(dailySummaryData?.total_expenses) || 0,
          by_payment: {
            cash: { count: 0, total: Number(dailySummaryData?.total_expenses_cash) || 0 },
            esewa: { count: 0, total: Number(dailySummaryData?.total_expenses_esewa) || 0 },
            fonepay: { count: 0, total: Number(dailySummaryData?.total_expenses_fonepay) || 0 },
          }
        },
        deposits: {
          count: 0,
          total: Number(dailySummaryData?.total_deposits) || 0,
          by_payment: {
            cash: { count: 0, total: Number(dailySummaryData?.total_deposits_cash) || 0 },
            esewa: { count: 0, total: Number(dailySummaryData?.total_deposits_esewa) || 0 },
          }
        },
        withdrawals: {
          count: 0,
          total: Number(dailySummaryData?.total_withdrawals) || 0,
          by_payment: {
            cash: { count: 0, total: Number(dailySummaryData?.total_withdrawals_cash) || 0 },
            bank: { count: 0, total: Number(dailySummaryData?.total_withdrawals_bank) || 0 },
            cooperative: { count: 0, total: Number(dailySummaryData?.total_withdrawals_cooperative) || 0 },
          }
        },
        cooperative_savings: {
          count: 0,
          total: Number(dailySummaryData?.total_savings) || 0,
          by_payment: {
            cash: { count: 0, total: Number(dailySummaryData?.total_savings_cash) || 0 },
            esewa: { count: 0, total: Number(dailySummaryData?.total_savings_esewa) || 0 },
            fonepay: { count: 0, total: Number(dailySummaryData?.total_savings_fonepay) || 0 },
          }
        },
      };

      console.log("📊 Daily summary data processed:", {
        date: selectedDate,
        totalIncome: summary.orders.total + summary.charging.total,
        totalExpenses: summary.expenses.total,
        alreadyClosed: hasValidSummary
      });

      setTransactionSummary(summary);
    } catch (error) {
      logError("fetching daily closing data", error);
      toast.error(`Error loading daily data: ${extractErrorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllTimeData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      console.log("📊 Fetching all-time data from daily_summary table...");

      let fromDate = "";
      let toDate = "";

      if (dateRange?.from) {
        fromDate = format(dateRange.from, "yyyy-MM-dd");
      }
      if (dateRange?.to) {
        toDate = format(dateRange.to, "yyyy-MM-dd");
      }

      // Fetch daily summaries within date range
      let dailySummaryQuery = supabase
        .from("daily_summary")
        .select("*")
        .order("summary_date", { ascending: true });

      // Apply date filters if provided
      if (fromDate) {
        dailySummaryQuery = dailySummaryQuery.gte("summary_date", fromDate);
      }
      if (toDate) {
        dailySummaryQuery = dailySummaryQuery.lte("summary_date", toDate);
      }

      const { data: dailySummaries, error: summariesError } = await dailySummaryQuery;

      if (summariesError) {
        throw summariesError;
      }

      if (!dailySummaries || dailySummaries.length === 0) {
        console.warn("⚠️ No daily summary data found for the selected period");
        setAllTimeSummary({
          orders: { count: 0, total: 0, by_payment: {} },
          charging: { count: 0, total: 0, by_payment: {} },
          expenses: { count: 0, total: 0, by_payment: {} },
          deposits: { count: 0, total: 0, by_payment: {} },
          withdrawals: { count: 0, total: 0, by_payment: {} },
          cooperative_savings: { count: 0, total: 0, by_payment: {} },
        });
        return;
      }

      // Aggregate all daily summaries
      const aggregated = dailySummaries.reduce((acc, daily) => {
        return {
          totalIncomeFromOrders: acc.totalIncomeFromOrders + (Number(daily.total_income_from_orders) || 0),
          totalIncomeFromCharging: acc.totalIncomeFromCharging + (Number(daily.total_income_from_charging) || 0),
          totalIncomeCash: acc.totalIncomeCash + (Number(daily.total_income_cash) || 0),
          totalIncomeEsewa: acc.totalIncomeEsewa + (Number(daily.total_income_esewa) || 0),
          totalIncomeFonepay: acc.totalIncomeFonepay + (Number(daily.total_income_fonepay) || 0),
          totalExpenses: acc.totalExpenses + (Number(daily.total_expenses) || 0),
          totalExpensesCash: acc.totalExpensesCash + (Number(daily.total_expenses_cash) || 0),
          totalExpensesEsewa: acc.totalExpensesEsewa + (Number(daily.total_expenses_esewa) || 0),
          totalExpensesFonepay: acc.totalExpensesFonepay + (Number(daily.total_expenses_fonepay) || 0),
          totalDeposits: acc.totalDeposits + (Number(daily.total_deposits) || 0),
          totalDepositsCash: acc.totalDepositsCash + (Number(daily.total_deposits_cash) || 0),
          totalDepositsEsewa: acc.totalDepositsEsewa + (Number(daily.total_deposits_esewa) || 0),
          totalSavings: acc.totalSavings + (Number(daily.total_savings) || 0),
          totalSavingsCash: acc.totalSavingsCash + (Number(daily.total_savings_cash) || 0),
          totalSavingsEsewa: acc.totalSavingsEsewa + (Number(daily.total_savings_esewa) || 0),
          totalSavingsFonepay: acc.totalSavingsFonepay + (Number(daily.total_savings_fonepay) || 0),
          totalWithdrawals: acc.totalWithdrawals + (Number(daily.total_withdrawals) || 0),
          totalWithdrawalsCash: acc.totalWithdrawalsCash + (Number(daily.total_withdrawals_cash) || 0),
          totalWithdrawalsBank: acc.totalWithdrawalsBank + (Number(daily.total_withdrawals_bank) || 0),
          totalWithdrawalsCooperative: acc.totalWithdrawalsCooperative + (Number(daily.total_withdrawals_cooperative) || 0),
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
        totalSavingsCash: 0,
        totalSavingsEsewa: 0,
        totalSavingsFonepay: 0,
        totalWithdrawals: 0,
        totalWithdrawalsCash: 0,
        totalWithdrawalsBank: 0,
        totalWithdrawalsCooperative: 0,
      });

      // Convert to TransactionSummary format for UI compatibility
      const summary: TransactionSummary = {
        orders: {
          count: dailySummaries.length, // Number of days with data
          total: aggregated.totalIncomeFromOrders,
          by_payment: {
            cash: { count: 0, total: aggregated.totalIncomeCash },
            esewa: { count: 0, total: aggregated.totalIncomeEsewa },
            fonepay: { count: 0, total: aggregated.totalIncomeFonepay },
          }
        },
        charging: {
          count: dailySummaries.length,
          total: aggregated.totalIncomeFromCharging,
          by_payment: {} // Charging is included in total income payment modes
        },
        expenses: {
          count: dailySummaries.length,
          total: aggregated.totalExpenses,
          by_payment: {
            cash: { count: 0, total: aggregated.totalExpensesCash },
            esewa: { count: 0, total: aggregated.totalExpensesEsewa },
            fonepay: { count: 0, total: aggregated.totalExpensesFonepay },
          }
        },
        deposits: {
          count: dailySummaries.length,
          total: aggregated.totalDeposits,
          by_payment: {
            cash: { count: 0, total: aggregated.totalDepositsCash },
            esewa: { count: 0, total: aggregated.totalDepositsEsewa },
          }
        },
        withdrawals: {
          count: dailySummaries.length,
          total: aggregated.totalWithdrawals,
          by_payment: {
            cash: { count: 0, total: aggregated.totalWithdrawalsCash },
            bank: { count: 0, total: aggregated.totalWithdrawalsBank },
            cooperative: { count: 0, total: aggregated.totalWithdrawalsCooperative },
          }
        },
        cooperative_savings: {
          count: dailySummaries.length,
          total: aggregated.totalSavings,
          by_payment: {
            cash: { count: 0, total: aggregated.totalSavingsCash },
            esewa: { count: 0, total: aggregated.totalSavingsEsewa },
            fonepay: { count: 0, total: aggregated.totalSavingsFonepay },
          }
        },
      };

      console.log("📈 All-time data aggregated from daily summaries:", {
        dateRange: { from: fromDate, to: toDate },
        daysProcessed: dailySummaries.length,
        totalIncome: aggregated.totalIncomeFromOrders + aggregated.totalIncomeFromCharging,
        totalExpenses: aggregated.totalExpenses,
        summary
      });

      setAllTimeSummary(summary);
    } catch (error) {
      logError("fetching all-time data", error);
      toast.error(`Error loading all-time data: ${extractErrorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  };



  const getNextDay = (date: string) => {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    return nextDay.toISOString().split("T")[0];
  };

  const handleDayClose = async () => {
    if (!user || !transactionSummary) return;

    setIsClosing(true);
    try {
      // Calculate totals
      const totalIncome =
        transactionSummary.orders.total + transactionSummary.charging.total;
      const totalExpenses = transactionSummary.expenses.total;
      const totalDeposits = transactionSummary.deposits.total;
      const totalWithdrawals = transactionSummary.withdrawals.total;
      const totalSavings = transactionSummary.cooperative_savings.total;

      // Calculate payment mode totals
      const paymentModes = ["Cash", "Esewa", "Fonepay", "Bank", "Cheque"];
      let totalIncomeCash = 0,
        totalIncomeEsewa = 0,
        totalIncomeFonepay = 0;

      paymentModes.forEach((mode) => {
        const ordersAmount =
          transactionSummary.orders.by_payment[mode]?.total || 0;
        const chargingAmount =
          transactionSummary.charging.by_payment[mode]?.total || 0;

        if (mode === "Cash") {
          totalIncomeCash = ordersAmount + chargingAmount;
        } else if (mode === "Esewa") {
          totalIncomeEsewa = ordersAmount + chargingAmount;
        } else if (mode === "Fonepay") {
          totalIncomeFonepay = ordersAmount + chargingAmount;
        }
      });

      // Fetch withdrawal data to calculate breakdown for daily summary
      const { data: withdrawalData, error: withdrawalError } = await supabase
        .from("withdrawals")
        .select("*")
        .eq("user_id", user.id)
        .gte("withdrawal_date", selectedDate)
        .lt("withdrawal_date", getNextDay(selectedDate));

      if (withdrawalError) {
        console.warn("⚠️ Error fetching withdrawal data for breakdown:", withdrawalError);
      }

      // Calculate withdrawal breakdown using database schema
      const withdrawalDetails = withdrawalData || [];
      const totalWithdrawalsBank = withdrawalDetails
        .filter(w => w.withdrawal_from === 'Bank')
        .reduce((sum, w) => sum + (Number(w.amount) || 0), 0);

      const totalWithdrawalsCooperative = withdrawalDetails
        .filter(w => w.withdrawal_from === 'Cooperative')
        .reduce((sum, w) => sum + (Number(w.amount) || 0), 0);

      const totalWithdrawalsEsewa = withdrawalDetails
        .filter(w => w.withdrawal_from === 'Esewa')
        .reduce((sum, w) => sum + (Number(w.amount) || 0), 0);

      console.log('🔍 Daily withdrawal breakdown:', {
        totalWithdrawalsBank,
        totalWithdrawalsCooperative,
        totalWithdrawalsEsewa,
        totalWithdrawals,
        rawWithdrawals: withdrawalDetails.length,
        withdrawalDetails: withdrawalDetails.map(w => ({ amount: w.amount, from: w.withdrawal_from, mode: w.payment_mode }))
      });

      // Insert or update daily summary
      const dailySummaryData = {
        summary_date: selectedDate,
        total_income: totalIncome,
        total_income_from_orders: transactionSummary.orders.total,
        total_income_from_charging: transactionSummary.charging.total,
        total_income_cash: totalIncomeCash,
        total_income_esewa: totalIncomeEsewa,
        total_income_fonepay: totalIncomeFonepay,
        total_expenses: totalExpenses,
        total_deposits: totalDeposits,
        total_withdrawals: totalWithdrawals,
        total_withdrawals_bank: totalWithdrawalsBank,
        total_withdrawals_cooperative: totalWithdrawalsCooperative,
        total_withdrawals_esewa: totalWithdrawalsEsewa,
        total_savings: totalSavings,
        cash_balance:
          totalIncomeCash + totalDeposits - totalExpenses - totalWithdrawals,
        esewa_balance: totalIncomeEsewa,
        fonepay_balance: totalIncomeFonepay,
        total_balance:
          totalIncome + totalDeposits - totalExpenses - totalWithdrawals,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("daily_summary")
        .upsert(dailySummaryData, { onConflict: "summary_date" });

      if (error) throw error;

      toast.success(
        `Daily closing completed for ${format(new Date(selectedDate), "MMM dd, yyyy")}`,
      );
      setAlreadyClosed(true);
    } catch (error) {
      logError("daily closing", error);
      toast.error(`Error during daily closing: ${extractErrorMessage(error)}`);
    } finally {
      setIsClosing(false);
    }
  };

  const formatCurrency = (amount: number) => formatCurrencyUtil(amount);

  // Updated balance calculation functions that work with the new data format
  const getCashIncome = (summary: TransactionSummary) => {
    return (
      (summary.orders.by_payment?.cash?.total || summary.orders.by_payment?.Cash?.total || 0) +
      (summary.charging.by_payment?.cash?.total || summary.charging.by_payment?.Cash?.total || 0)
    );
  };

  const getCashExpenses = (summary: TransactionSummary) => {
    return summary.expenses.by_payment?.cash?.total || summary.expenses.by_payment?.Cash?.total || 0;
  };

  const getCashSavings = (summary: TransactionSummary) => {
    return summary.cooperative_savings.by_payment?.cash?.total || summary.cooperative_savings.by_payment?.Cash?.total || 0;
  };

  const getCashDeposits = (summary: TransactionSummary) => {
    return summary.deposits.by_payment?.cash?.total || summary.deposits.by_payment?.Cash?.total || 0;
  };

  const getCashWithdrawals = (summary: TransactionSummary) => {
    return summary.withdrawals.by_payment?.cash?.total || summary.withdrawals.by_payment?.Cash?.total || 0;
  };

  const calculateCashBalance = (summary: TransactionSummary) => {
    // Cash Balance: Income - Expenses - Savings - Deposits + Withdrawals (from fonepay and cooperative)
    const baseBalance = getCashIncome(summary) -
      getCashExpenses(summary) -
      getCashSavings(summary) -
      getCashDeposits(summary);

    // Add cash withdrawals from all sources
    const cashWithdrawals = getCashWithdrawals(summary);

    // Add withdrawals from cooperative (savings) - these become cash
    const cooperativeWithdrawals = summary.withdrawals.by_payment?.cooperative?.total || 0;

    // Add withdrawals from fonepay - these become cash
    const fonepayWithdrawals = summary.withdrawals.by_payment?.fonepay?.total || summary.withdrawals.by_payment?.Fonepay?.total || 0;

    return baseBalance + cashWithdrawals + cooperativeWithdrawals + fonepayWithdrawals;
  };

  const getFonepayIncome = (summary: TransactionSummary) => {
    return (
      (summary.orders.by_payment?.fonepay?.total || summary.orders.by_payment?.Fonepay?.total || 0) +
      (summary.charging.by_payment?.fonepay?.total || summary.charging.by_payment?.Fonepay?.total || 0)
    );
  };

  const getFonepayExpenses = (summary: TransactionSummary) => {
    return summary.expenses.by_payment?.fonepay?.total || summary.expenses.by_payment?.Fonepay?.total || 0;
  };

  const getBankWithdrawals = (summary: TransactionSummary) => {
    // Now properly calculated from database schema in the summary data
    return summary.withdrawals.by_payment?.bank?.total || summary.withdrawals.by_payment?.fonepay?.total || 0;
  };

  const calculateBankBalance = (summary: TransactionSummary) => {
    // Bank Balance: Current calculations + Cash Deposits + Esewa Deposits
    const currentBalance = getFonepayIncome(summary) -
      getFonepayExpenses(summary) -
      getBankWithdrawals(summary);

    // Add cash deposits and esewa deposits
    const cashDeposits = getCashDeposits(summary);
    const esewaDeposits = summary.deposits.by_payment?.esewa?.total || summary.deposits.by_payment?.Esewa?.total || 0;

    return currentBalance + cashDeposits + esewaDeposits;
  };

  const getEsewaIncome = (summary: TransactionSummary) => {
    return (
      (summary.orders.by_payment?.esewa?.total || summary.orders.by_payment?.Esewa?.total || 0) +
      (summary.charging.by_payment?.esewa?.total || summary.charging.by_payment?.Esewa?.total || 0)
    );
  };

  const getEsewaExpenses = (summary: TransactionSummary) => {
    return summary.expenses.by_payment?.esewa?.total || summary.expenses.by_payment?.Esewa?.total || 0;
  };

  const getEsewaWithdrawals = (summary: TransactionSummary) => {
    // Now properly calculated from database schema
    return summary.withdrawals.by_payment?.esewa?.total || summary.withdrawals.by_payment?.Esewa?.total || 0;
  };

  const calculateEsewaBalance = (summary: TransactionSummary) => {
    return (
      getEsewaIncome(summary) -
      getEsewaExpenses(summary) -
      getEsewaWithdrawals(summary)
    );
  };

  const getCooperativeWithdrawals = (summary: TransactionSummary) => {
    // Currently all withdrawals are from Cooperative as per requirements
    return summary.withdrawals.total;
  };

  const calculateCooperativeBalance = (summary: TransactionSummary) => {
    return (
      summary.cooperative_savings.total - getCooperativeWithdrawals(summary)
    );
  };

  const dataToShow = viewMode === "daily" ? transactionSummary : allTimeSummary;

  if (!dataToShow) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Daily Closing System
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-2">
              Loading {viewMode === "daily" ? "daily" : "all-time"} data...
            </span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Use appropriate data source based on view mode
  const currentSummary =
    viewMode === "daily"
      ? transactionSummary
      : allTimeSummary || transactionSummary;

  const totalIncome =
    currentSummary.orders.total + currentSummary.charging.total;
  const totalExpenses = currentSummary.expenses.total;
  const netProfit = totalIncome - totalExpenses;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-4xl lg:max-w-6xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            {viewMode === "daily"
              ? `Daily Closing System - ${format(new Date(selectedDate), "MMM dd, yyyy")}`
              : "All-Time Summary"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* View Mode Toggle */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <Button
              variant={viewMode === "daily" ? "default" : "outline"}
              onClick={() => setViewMode("daily")}
              className="flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              Daily View
            </Button>
            <Button
              variant={viewMode === "alltime" ? "default" : "outline"}
              onClick={() => setViewMode("alltime")}
              className="flex items-center gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              All Time
            </Button>
          </div>

          {/* Date Controls */}
          {viewMode === "daily" ? (
            <div className="flex items-center gap-4">
              <Calendar className="h-5 w-5 text-blue-600" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border rounded px-3 py-2"
                max={new Date().toISOString().split("T")[0]}
              />
              {alreadyClosed && (
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-800"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Already Closed
                </Badge>
              )}
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                <DateRangePicker
                  onUpdate={(range) => {
                    if (range?.from && range?.to) {
                      setDateRange({ from: range.from, to: range.to });
                    } else {
                      setDateRange(undefined);
                    }
                  }}
                />
              </div>
              <span className="text-xs sm:text-sm text-gray-600">
                {dateRange?.from && dateRange?.to
                  ? `${format(dateRange.from, "MMM dd, yyyy")} - ${format(dateRange.to, "MMM dd, yyyy")}`
                  : "Select date range for all-time summary"}
              </span>
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Total Income</p>
                    <p className="text-lg font-bold text-green-600">
                      {formatCurrency(totalIncome)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-sm text-gray-600">Total Expenses</p>
                    <p className="text-lg font-bold text-red-600">
                      {formatCurrency(totalExpenses)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Net Profit</p>
                    <p
                      className={`text-lg font-bold ${netProfit >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {formatCurrency(netProfit)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-sm text-gray-600">
                      Deposits/Withdrawals
                    </p>
                    <p className="text-lg font-bold text-purple-600">
                      {formatCurrency(
                        currentSummary.deposits.total -
                          currentSummary.withdrawals.total,
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Tabs */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-1">
              <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
              <TabsTrigger value="transactions" className="text-xs sm:text-sm">
                <span className="hidden sm:inline">By Transaction Type</span>
                <span className="sm:hidden">Transactions</span>
              </TabsTrigger>
              <TabsTrigger value="payment" className="text-xs sm:text-sm">
                <span className="hidden sm:inline">By Payment Mode</span>
                <span className="sm:hidden">Payment</span>
              </TabsTrigger>
              <TabsTrigger value="balances" className="text-xs sm:text-sm">Balances</TabsTrigger>
              <TabsTrigger value="details" className="text-xs sm:text-sm">
                <span className="hidden md:inline">Detailed Breakdown</span>
                <span className="md:hidden">Details</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(currentSummary).map(([key, data]) => (
                  <Card key={key}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        {key === "orders" && (
                          <ShoppingCart className="h-4 w-4" />
                        )}
                        {key === "charging" && <Zap className="h-4 w-4" />}
                        {key === "expenses" && <Receipt className="h-4 w-4" />}
                        {key === "deposits" && (
                          <CreditCard className="h-4 w-4" />
                        )}
                        {key === "withdrawals" && (
                          <Banknote className="h-4 w-4" />
                        )}
                        {key === "cooperative_savings" && (
                          <PiggyBank className="h-4 w-4" />
                        )}
                        {key.replace("_", " ").toUpperCase()}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1">
                        <p className="text-lg font-semibold">
                          {formatCurrency(data.total)}
                        </p>
                        <p className="text-sm text-gray-600">
                          {data.count} transactions
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="transactions" className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaction Type</TableHead>
                    <TableHead>Count</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(currentSummary).map(([key, data]) => (
                    <TableRow key={key}>
                      <TableCell className="font-medium">
                        {key.replace("_", " ").toUpperCase()}
                      </TableCell>
                      <TableCell>{data.count}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(data.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="payment" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {Object.entries(currentSummary).map(([transactionType, data]) => (
                <Card key={transactionType}>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      {transactionType.replace("_", " ").toUpperCase()}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs sm:text-sm">Payment Mode</TableHead>
                            <TableHead className="text-xs sm:text-sm">Count</TableHead>
                            <TableHead className="text-right text-xs sm:text-sm">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.entries(data.by_payment).map(
                            ([paymentMode, paymentData]) => (
                              <TableRow key={paymentMode}>
                                <TableCell className="text-xs sm:text-sm">{paymentMode}</TableCell>
                                <TableCell className="text-xs sm:text-sm">{paymentData.count}</TableCell>
                                <TableCell className="text-right text-xs sm:text-sm">
                                  {formatCurrency(paymentData.total)}
                                </TableCell>
                              </TableRow>
                            ),
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              ))}
              </div>
            </TabsContent>

            <TabsContent value="balances" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                {/* Cash Balance Card */}
                <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-700">
                      <Banknote className="h-5 w-5" />
                      Cash Balance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="text-2xl font-bold text-green-800">
                        {formatCurrency(calculateCashBalance(currentSummary))}
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            Cash Income (Charging + Orders):
                          </span>
                          <span className="font-medium text-green-600">
                            +{formatCurrency(getCashIncome(currentSummary))}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Cash Expenses:</span>
                          <span className="font-medium text-red-600">
                            -{formatCurrency(getCashExpenses(currentSummary))}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Cash Savings:</span>
                          <span className="font-medium text-red-600">
                            -{formatCurrency(getCashSavings(currentSummary))}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Cash Deposits:</span>
                          <span className="font-medium text-red-600">
                            -{formatCurrency(getCashDeposits(currentSummary))}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            Cash Withdrawals:
                          </span>
                          <span className="font-medium text-green-600">
                            +
                            {formatCurrency(getCashWithdrawals(currentSummary))}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Bank Balance Card */}
                <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-700">
                      <CreditCard className="h-5 w-5" />
                      Bank Balance (Fonepay)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="text-2xl font-bold text-blue-800">
                        {formatCurrency(calculateBankBalance(currentSummary))}
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            Fonepay Income (Charging + Orders):
                          </span>
                          <span className="font-medium text-green-600">
                            +{formatCurrency(getFonepayIncome(currentSummary))}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            Fonepay Expenses:
                          </span>
                          <span className="font-medium text-red-600">
                            -
                            {formatCurrency(getFonepayExpenses(currentSummary))}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            Bank Withdrawals:
                          </span>
                          <span className="font-medium text-red-600">
                            -
                            {formatCurrency(getBankWithdrawals(currentSummary))}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Esewa Balance Card */}
                <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-purple-700">
                      <Smartphone className="h-5 w-5" />
                      Esewa Balance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="text-2xl font-bold text-purple-800">
                        {formatCurrency(calculateEsewaBalance(currentSummary))}
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            Esewa Income (Charging + Orders):
                          </span>
                          <span className="font-medium text-green-600">
                            +{formatCurrency(getEsewaIncome(currentSummary))}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Esewa Expenses:</span>
                          <span className="font-medium text-red-600">
                            -{formatCurrency(getEsewaExpenses(currentSummary))}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            Esewa Withdrawals:
                          </span>
                          <span className="font-medium text-red-600">
                            -
                            {formatCurrency(
                              getEsewaWithdrawals(currentSummary),
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Cooperative Balance Card */}
                <Card className="bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-teal-700">
                      <PiggyBank className="h-5 w-5" />
                      Cooperative Balance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="text-2xl font-bold text-teal-800">
                        {formatCurrency(
                          calculateCooperativeBalance(currentSummary),
                        )}
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Savings:</span>
                          <span className="font-medium text-green-600">
                            +
                            {formatCurrency(
                              currentSummary.cooperative_savings.total,
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            Cooperative Withdrawals:
                          </span>
                          <span className="font-medium text-red-600">
                            -
                            {formatCurrency(
                              getCooperativeWithdrawals(currentSummary),
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Balance Summary */}
              <Card className="bg-gradient-to-br from-gray-50 to-slate-50 border border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-700">
                    <BarChart3 className="h-5 w-5" />
                    Balance Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-sm text-gray-600">Cash Balance</div>
                      <div className="text-lg font-bold text-green-700">
                        {formatCurrency(calculateCashBalance(currentSummary))}
                      </div>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-sm text-gray-600">Bank Balance</div>
                      <div className="text-lg font-bold text-blue-700">
                        {formatCurrency(calculateBankBalance(currentSummary))}
                      </div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <div className="text-sm text-gray-600">Esewa Balance</div>
                      <div className="text-lg font-bold text-purple-700">
                        {formatCurrency(calculateEsewaBalance(currentSummary))}
                      </div>
                    </div>
                    <div className="text-center p-3 bg-teal-50 rounded-lg">
                      <div className="text-sm text-gray-600">
                        Cooperative Balance
                      </div>
                      <div className="text-lg font-bold text-teal-700">
                        {formatCurrency(
                          calculateCooperativeBalance(currentSummary),
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-gray-700">
                        Total Net Balance:
                      </span>
                      <span className="text-xl font-bold text-gray-900">
                        {formatCurrency(
                          calculateCashBalance(currentSummary) +
                            calculateBankBalance(currentSummary) +
                            calculateEsewaBalance(currentSummary) +
                            calculateCooperativeBalance(currentSummary),
                        )}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="details" className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">
                  {viewMode === "daily"
                    ? "Day Closing Summary"
                    : "All-Time Summary"}
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Income (Orders + Charging):</span>
                    <span className="font-semibold">
                      {formatCurrency(totalIncome)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Expenses:</span>
                    <span className="font-semibold">
                      {formatCurrency(totalExpenses)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Deposits:</span>
                    <span className="font-semibold">
                      {formatCurrency(currentSummary.deposits.total)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Withdrawals:</span>
                    <span className="font-semibold">
                      {formatCurrency(currentSummary.withdrawals.total)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cooperative Savings:</span>
                    <span className="font-semibold">
                      {formatCurrency(currentSummary.cooperative_savings.total)}
                    </span>
                  </div>
                  <hr className="my-2" />
                  <div className="flex justify-between font-bold">
                    <span>Net Position:</span>
                    <span
                      className={
                        netProfit >= 0 ? "text-green-600" : "text-red-600"
                      }
                    >
                      {formatCurrency(netProfit)}
                    </span>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {viewMode === "daily" && (
            <Button
              onClick={handleDayClose}
              disabled={isClosing || alreadyClosed}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isClosing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2" />
                  Processing...
                </>
              ) : alreadyClosed ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Already Closed
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Close Day
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DailyClosingSystem;
