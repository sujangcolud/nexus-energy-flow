import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  Clock,
  Play,
  Pause,
  RotateCcw,
  Download,
  Calendar as CalendarIcon,
} from "lucide-react";
import { format, addDays, differenceInDays, parseISO } from "date-fns";
import { toast } from "sonner";
import { extractErrorMessage, logError } from "@/utils/errorHandling";

interface DailySummaryData {
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
  status: "pending" | "processing" | "completed" | "error";
  error_message?: string;
}

interface BatchClosingProgress {
  total: number;
  completed: number;
  current_date: string;
  percentage: number;
}

interface BatchDailyClosingSystemProps {
  isOpen: boolean;
  onClose: () => void;
}

const BatchDailyClosingSystem: React.FC<BatchDailyClosingSystemProps> = ({
  isOpen,
  onClose,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [startDate, setStartDate] = useState("2025-05-07");
  const [endDate, setEndDate] = useState("2025-07-15");
  const [dailySummaries, setDailySummaries] = useState<DailySummaryData[]>([]);
  const [progress, setProgress] = useState<BatchClosingProgress>({
    total: 0,
    completed: 0,
    current_date: "",
    percentage: 0,
  });
  const [selectedTab, setSelectedTab] = useState("overview");

  useEffect(() => {
    if (isOpen && user) {
      initializeDateRange();
    }
  }, [isOpen, user]);

  const initializeDateRange = () => {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const totalDays = differenceInDays(end, start) + 1;

    const summaries: DailySummaryData[] = [];
    for (let i = 0; i < totalDays; i++) {
      const currentDate = addDays(start, i);
      summaries.push({
        summary_date: format(currentDate, "yyyy-MM-dd"),
        total_income: 0,
        total_income_from_orders: 0,
        total_income_from_charging: 0,
        total_income_cash: 0,
        total_income_esewa: 0,
        total_income_fonepay: 0,
        total_expenses: 0,
        total_deposits: 0,
        total_withdrawals: 0,
        total_savings: 0,
        cash_balance: 0,
        esewa_balance: 0,
        fonepay_balance: 0,
        total_balance: 0,
        status: "pending",
      });
    }

    setDailySummaries(summaries);
    setProgress({
      total: totalDays,
      completed: 0,
      current_date: "",
      percentage: 0,
    });
  };

  const processDateRange = async () => {
    if (!user) return;

    setProcessing(true);
    setLoading(true);

    try {
      const updatedSummaries = [...dailySummaries];

      for (let i = 0; i < updatedSummaries.length; i++) {
        const summary = updatedSummaries[i];
        const currentDate = summary.summary_date;

        // Update progress
        setProgress((prev) => ({
          ...prev,
          current_date: currentDate,
          completed: i,
          percentage: Math.round((i / prev.total) * 100),
        }));

        // Mark as processing
        summary.status = "processing";
        setDailySummaries([...updatedSummaries]);

        try {
          // Check if already exists
          const { data: existingData } = await supabase
            .from("daily_summary")
            .select("*")
            .eq("summary_date", currentDate)
            .single();

          if (existingData) {
            // Update existing data
            summary.total_income = existingData.total_income || 0;
            summary.total_income_from_orders =
              existingData.total_income_from_orders || 0;
            summary.total_income_from_charging =
              existingData.total_income_from_charging || 0;
            summary.total_income_cash = existingData.total_income_cash || 0;
            summary.total_income_esewa = existingData.total_income_esewa || 0;
            summary.total_income_fonepay =
              existingData.total_income_fonepay || 0;
            summary.total_expenses = existingData.total_expenses || 0;
            summary.total_deposits = existingData.total_deposits || 0;
            summary.total_withdrawals = existingData.total_withdrawals || 0;
            summary.total_savings = existingData.total_savings || 0;
            summary.cash_balance = existingData.cash_balance || 0;
            summary.esewa_balance = existingData.esewa_balance || 0;
            summary.fonepay_balance = existingData.fonepay_balance || 0;
            summary.total_balance = existingData.total_balance || 0;
            summary.status = "completed";
          } else {
            // Calculate new data
            const calculatedData = await calculateDayData(currentDate);

            // Insert new data
            const { error } = await supabase.from("daily_summary").upsert(
              {
                summary_date: currentDate,
                ...calculatedData,
              },
              { onConflict: "summary_date" },
            );

            if (error) throw error;

            // Update summary with calculated data
            Object.assign(summary, calculatedData);
            summary.status = "completed";
          }
        } catch (error) {
          logError(`batch closing for ${currentDate}`, error);
          summary.status = "error";
          summary.error_message = extractErrorMessage(error);
        }

        setDailySummaries([...updatedSummaries]);

        // Small delay to show progress
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Final progress update
      setProgress((prev) => ({
        ...prev,
        completed: prev.total,
        percentage: 100,
        current_date: "",
      }));

      toast.success(
        `Batch daily closing completed for ${dailySummaries.length} days!`,
      );
    } catch (error) {
      logError("batch daily closing", error);
      toast.error(
        `Error during batch processing: ${extractErrorMessage(error)}`,
      );
    } finally {
      setProcessing(false);
      setLoading(false);
    }
  };

  const calculateDayData = async (date: string) => {
    if (!user) return {};

    const nextDay = format(addDays(parseISO(date), 1), "yyyy-MM-dd");

    // Fetch all data for the specific date
    const [
      ordersRes,
      chargingRes,
      expensesRes,
      depositsRes,
      withdrawalsRes,
      cooperativeRes,
    ] = await Promise.all([
      supabase
        .from("orders")
        .select("total, payment_mode")
        .eq("user_id", user.id)
        .gte("order_date", date)
        .lt("order_date", nextDay),
      supabase
        .from("charging_sessions")
        .select("total_amount, payment_mode")
        .eq("user_id", user.id)
        .gte("session_date", date)
        .lt("session_date", nextDay),
      supabase
        .from("expenses")
        .select("amount, payment_mode")
        .eq("user_id", user.id)
        .gte("expense_date", date)
        .lt("expense_date", nextDay),
      supabase
        .from("deposits")
        .select("amount, mode")
        .eq("user_id", user.id)
        .gte("deposit_date", date)
        .lt("deposit_date", nextDay),
      supabase
        .from("withdrawals")
        .select("amount, mode")
        .eq("user_id", user.id)
        .gte("withdrawal_date", date)
        .lt("withdrawal_date", nextDay),
      supabase
        .from("cooperative_savings")
        .select("contribution_amount")
        .eq("user_id", user.id)
        .gte("contribution_date", date)
        .lt("contribution_date", nextDay),
    ]);

    const orders = ordersRes.data || [];
    const charging = chargingRes.data || [];
    const expenses = expensesRes.data || [];
    const deposits = depositsRes.data || [];
    const withdrawals = withdrawalsRes.data || [];
    const cooperative = cooperativeRes.data || [];

    // Calculate totals
    const totalIncomeFromOrders = orders.reduce(
      (sum, order) => sum + (order.total || 0),
      0,
    );
    const totalIncomeFromCharging = charging.reduce(
      (sum, session) => sum + (session.total_amount || 0),
      0,
    );
    const totalIncome = totalIncomeFromOrders + totalIncomeFromCharging;
    const totalExpenses = expenses.reduce(
      (sum, expense) => sum + (expense.amount || 0),
      0,
    );
    const totalDeposits = deposits.reduce(
      (sum, deposit) => sum + (deposit.amount || 0),
      0,
    );
    const totalWithdrawals = withdrawals.reduce(
      (sum, withdrawal) => sum + (withdrawal.amount || 0),
      0,
    );
    const totalSavings = cooperative.reduce(
      (sum, saving) => sum + (saving.contribution_amount || 0),
      0,
    );

    // Calculate payment mode breakdowns
    const calculatePaymentModeTotal = (
      transactions: any[],
      amountField: string,
      paymentField: string,
      mode: string,
    ) => {
      return transactions
        .filter(
          (t) => (t[paymentField] || "").toLowerCase() === mode.toLowerCase(),
        )
        .reduce((sum, t) => sum + (t[amountField] || 0), 0);
    };

    const cashFromOrders = calculatePaymentModeTotal(
      orders,
      "total",
      "payment_mode",
      "cash",
    );
    const esewaFromOrders = calculatePaymentModeTotal(
      orders,
      "total",
      "payment_mode",
      "esewa",
    );
    const fonepayFromOrders = calculatePaymentModeTotal(
      orders,
      "total",
      "payment_mode",
      "fonepay",
    );

    const cashFromCharging = calculatePaymentModeTotal(
      charging,
      "total_amount",
      "payment_mode",
      "cash",
    );
    const esewaFromCharging = calculatePaymentModeTotal(
      charging,
      "total_amount",
      "payment_mode",
      "esewa",
    );
    const fonepayFromCharging = calculatePaymentModeTotal(
      charging,
      "total_amount",
      "payment_mode",
      "fonepay",
    );

    const totalIncomeCash = cashFromOrders + cashFromCharging;
    const totalIncomeEsewa = esewaFromOrders + esewaFromCharging;
    const totalIncomeFonepay = fonepayFromOrders + fonepayFromCharging;

    const cashBalance =
      totalIncomeCash + totalDeposits - totalExpenses - totalWithdrawals;
    const esewaBalance = totalIncomeEsewa;
    const fonepayBalance = totalIncomeFonepay;
    const totalBalance = cashBalance + esewaBalance + fonepayBalance;

    return {
      total_income: totalIncome,
      total_income_from_orders: totalIncomeFromOrders,
      total_income_from_charging: totalIncomeFromCharging,
      total_income_cash: totalIncomeCash,
      total_income_esewa: totalIncomeEsewa,
      total_income_fonepay: totalIncomeFonepay,
      total_expenses: totalExpenses,
      total_deposits: totalDeposits,
      total_withdrawals: totalWithdrawals,
      total_savings: totalSavings,
      cash_balance: cashBalance,
      esewa_balance: esewaBalance,
      fonepay_balance: fonepayBalance,
      total_balance: totalBalance,
    };
  };

  const formatCurrency = (amount: number) => `NRs. ${amount.toFixed(2)}`;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case "processing":
        return (
          <Badge className="bg-blue-100 text-blue-800">
            <Clock className="h-3 w-3 mr-1" />
            Processing
          </Badge>
        );
      case "error":
        return (
          <Badge className="bg-red-100 text-red-800">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        );
      default:
        return <Badge className="bg-gray-100 text-gray-800">Pending</Badge>;
    }
  };

  const exportData = () => {
    const csvContent = [
      [
        "Date",
        "Total Income",
        "Total Expenses",
        "Net Profit",
        "Cash Balance",
        "Status",
      ].join(","),
      ...dailySummaries.map((summary) =>
        [
          summary.summary_date,
          summary.total_income,
          summary.total_expenses,
          summary.total_income - summary.total_expenses,
          summary.cash_balance,
          summary.status,
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `batch_daily_closing_${startDate}_to_${endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const totalIncome = dailySummaries.reduce(
    (sum, day) => sum + day.total_income,
    0,
  );
  const totalExpenses = dailySummaries.reduce(
    (sum, day) => sum + day.total_expenses,
    0,
  );
  const totalProfit = totalIncome - totalExpenses;
  const completedDays = dailySummaries.filter(
    (day) => day.status === "completed",
  ).length;
  const errorDays = dailySummaries.filter(
    (day) => day.status === "error",
  ).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-6 w-6 text-blue-600" />
            Batch Daily Closing System (
            {format(parseISO(startDate), "MMM dd, yyyy")} -{" "}
            {format(parseISO(endDate), "MMM dd, yyyy")})
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Date Range Selector */}
          <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
            <CalendarIcon className="h-5 w-5 text-blue-600" />
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Start Date:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={processing}
                className="border rounded px-3 py-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">End Date:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={processing}
                className="border rounded px-3 py-1"
              />
            </div>
            <Button
              onClick={initializeDateRange}
              disabled={processing}
              variant="outline"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset Range
            </Button>
          </div>

          {/* Progress Section */}
          {processing && (
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">
                      Processing Progress
                    </h3>
                    <span className="text-sm text-gray-600">
                      {progress.completed} of {progress.total} days
                    </span>
                  </div>
                  <Progress value={progress.percentage} className="w-full" />
                  {progress.current_date && (
                    <p className="text-sm text-gray-600">
                      Currently processing:{" "}
                      {format(parseISO(progress.current_date), "MMM dd, yyyy")}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                      className={`text-lg font-bold ${totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {formatCurrency(totalProfit)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Completed</p>
                    <p className="text-lg font-bold text-green-600">
                      {completedDays} days
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-sm text-gray-600">Errors</p>
                    <p className="text-lg font-bold text-red-600">
                      {errorDays} days
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Data */}
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="daily">Daily Details</TabsTrigger>
              <TabsTrigger value="trends">Trends & Analysis</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Income</TableHead>
                      <TableHead className="text-right">Expenses</TableHead>
                      <TableHead className="text-right">Net Profit</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dailySummaries.map((summary) => (
                      <TableRow key={summary.summary_date}>
                        <TableCell className="font-medium">
                          {format(
                            parseISO(summary.summary_date),
                            "MMM dd, yyyy",
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(summary.status)}</TableCell>
                        <TableCell className="text-right font-semibold text-green-600">
                          {formatCurrency(summary.total_income)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-red-600">
                          {formatCurrency(summary.total_expenses)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-semibold ${summary.total_income - summary.total_expenses >= 0 ? "text-green-600" : "text-red-600"}`}
                        >
                          {formatCurrency(
                            summary.total_income - summary.total_expenses,
                          )}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-blue-600">
                          {formatCurrency(summary.total_balance)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="daily" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                {dailySummaries
                  .filter((s) => s.status === "completed")
                  .map((summary) => (
                    <Card
                      key={summary.summary_date}
                      className="border-l-4 border-l-blue-500"
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center justify-between">
                          {format(
                            parseISO(summary.summary_date),
                            "MMM dd, yyyy",
                          )}
                          {getStatusBadge(summary.status)}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-gray-600">Orders:</span>
                            <span className="font-semibold ml-1">
                              {formatCurrency(summary.total_income_from_orders)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Charging:</span>
                            <span className="font-semibold ml-1">
                              {formatCurrency(
                                summary.total_income_from_charging,
                              )}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Expenses:</span>
                            <span className="font-semibold ml-1 text-red-600">
                              {formatCurrency(summary.total_expenses)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Savings:</span>
                            <span className="font-semibold ml-1">
                              {formatCurrency(summary.total_savings)}
                            </span>
                          </div>
                        </div>
                        <div className="pt-2 border-t">
                          <span className="text-gray-600 text-xs">Net:</span>
                          <span
                            className={`font-bold ml-1 ${summary.total_income - summary.total_expenses >= 0 ? "text-green-600" : "text-red-600"}`}
                          >
                            {formatCurrency(
                              summary.total_income - summary.total_expenses,
                            )}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </TabsContent>

            <TabsContent value="trends" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      Average Daily Income
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(
                        totalIncome / (dailySummaries.length || 1),
                      )}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      Average Daily Expenses
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-red-600">
                      {formatCurrency(
                        totalExpenses / (dailySummaries.length || 1),
                      )}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      Average Daily Profit
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p
                      className={`text-2xl font-bold ${totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {formatCurrency(
                        totalProfit / (dailySummaries.length || 1),
                      )}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={exportData}
              disabled={processing}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={processing}>
              Close
            </Button>
            <Button
              onClick={processDateRange}
              disabled={processing || !user}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {processing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start Batch Processing
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BatchDailyClosingSystem;
