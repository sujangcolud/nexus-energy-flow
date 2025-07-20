import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Clock,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PiggyBank,
  CreditCard,
  Banknote,
  RefreshCw,
  Database,
  BarChart3,
  Calendar,
  CheckCircle,
  AlertCircle,
  Download,
  X,
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

interface AllTimeSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AllTimeSummaryModal: React.FC<AllTimeSummaryModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState<AllTimeSummaryData | null>(
    null,
  );
  const [processedData, setProcessedData] = useState<any[]>([]);

  const fetchAllTimeSummary = async () => {
    if (!user) return;

    setLoading(true);
    try {
      console.log("📊 Fetching comprehensive all-time summary...");

      // Debug: Check for specific July 13th, 2025 data
      const { data: july13Debug } = await supabase
        .from("daily_summary")
        .select("*")
        .eq("summary_date", "2025-07-13")
        .single();

      if (july13Debug) {
        console.log("🔍 MODAL: July 13th, 2025 daily summary:", july13Debug);
      }

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
          withdrawalBreakdown: {
            fromBank: 0,
            fromSavings: 0,
            fromEsewa: 0,
            fromFonepay: 0,
            total: 0,
          },
          dataPoints: 0,
          dateRange: { from: "N/A", to: "N/A" },
        });
        return;
      }

      // Calculate all-time totals
      const totalIncome = summaries.reduce(
        (sum, s) => sum + (s.total_income || 0),
        0,
      );
      const totalExpenses = summaries.reduce(
        (sum, s) => sum + (s.total_expenses || 0),
        0,
      );
      const totalDeposits = summaries.reduce(
        (sum, s) => sum + (s.total_deposits || 0),
        0,
      );
      const totalWithdrawals = summaries.reduce(
        (sum, s) => sum + (s.total_withdrawals || 0),
        0,
      );
      const cooperativeSavings = summaries.reduce(
        (sum, s) => sum + (s.total_savings || 0),
        0,
      );

      const netProfit = totalIncome - totalExpenses;

      // Get latest balances from most recent summary
      const latestSummary = summaries[0] || {};
      const currentBalances = {
        cash: latestSummary.cash_balance || 0,
        esewa: latestSummary.esewa_balance || 0,
        fonepay: latestSummary.fonepay_balance || 0,
        total: latestSummary.total_balance || 0,
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

      // Calculate withdrawal breakdown
      // Withdrawal = Withdrawal from bank + Withdrawal from Savings + Withdrawal from esewa
      const withdrawalBreakdown = {
        fromBank: summaries.reduce(
          (sum, s) => sum + (s.total_withdrawals_bank || 0),
          0,
        ),
        fromSavings: summaries.reduce(
          (sum, s) => sum + (s.total_withdrawals_cooperative || 0),
          0,
        ),
        fromEsewa: summaries.reduce(
          (sum, s) => sum + (s.total_withdrawals_esewa || 0),
          0,
        ),
        fromFonepay: summaries.reduce(
          (sum, s) => sum + (s.total_withdrawals_fonepay || 0),
          0,
        ),
        total: totalWithdrawals,
      };

      const dateRange = {
        from: summaries[summaries.length - 1]?.summary_date || "N/A",
        to: summaries[0]?.summary_date || "N/A",
      };

      const allTimeSummary: AllTimeSummaryData = {
        totalIncome,
        totalExpenses,
        totalDeposits,
        totalWithdrawals,
        cooperativeSavings,
        netProfit,
        currentBalances,
        incomeBreakdown,
        paymentMethodBreakdown,
        withdrawalBreakdown,
        dataPoints: summaries.length,
        dateRange,
      };

      setSummaryData(allTimeSummary);
      setProcessedData(summaries);

      console.log("✅ All-time summary calculated:", allTimeSummary);
    } catch (error) {
      logError("calculating all-time summary", error);
      toast.error(
        `Error loading all-time summary: ${extractErrorMessage(error)}`,
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && user) {
      fetchAllTimeSummary();
    }
  }, [isOpen, user]);

  const exportData = () => {
    if (!summaryData) return;

    const dataToExport = {
      summary: summaryData,
      dailyData: processedData,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `all-time-summary-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("All-time summary data exported successfully!");
  };

  const formatCurrency = (amount: number) => {
    return `NRs. ${amount.toLocaleString()}`;
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-600 text-white">
              <Clock className="h-6 w-6" />
            </div>
            All-Time Business Summary
            {summaryData && (
              <Badge
                variant="secondary"
                className="text-purple-600 border-purple-300"
              >
                {summaryData.dataPoints} days of data
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <RefreshCw className="h-8 w-8 animate-spin text-purple-500" />
            <p className="text-gray-600">Calculating all-time summary...</p>
            <Progress value={75} className="w-64" />
          </div>
        ) : !summaryData ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <AlertCircle className="h-12 w-12 text-yellow-500" />
            <p className="text-gray-600">No data available for summary</p>
          </div>
        ) : (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="income">Income Analysis</TabsTrigger>
              <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
              <TabsTrigger value="balances">Current Balances</TabsTrigger>
              <TabsTrigger value="debug">Debug Data</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Date Range */}
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600 font-medium">
                        Data Period
                      </p>
                      <p className="text-lg font-semibold text-blue-800">
                        {summaryData.dateRange.from} to{" "}
                        {summaryData.dateRange.to}
                      </p>
                    </div>
                    <Calendar className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-600 font-medium">
                          Total Income
                        </p>
                        <p className="text-2xl font-bold text-green-800">
                          {formatCurrency(summaryData.totalIncome)}
                        </p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-red-600 font-medium">
                          Total Expenses
                        </p>
                        <p className="text-2xl font-bold text-red-800">
                          {formatCurrency(summaryData.totalExpenses)}
                        </p>
                      </div>
                      <TrendingDown className="h-8 w-8 text-red-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card
                  className={`bg-gradient-to-br ${summaryData.netProfit >= 0 ? "from-blue-50 to-indigo-50 border-blue-200" : "from-red-50 to-rose-50 border-red-200"}`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p
                          className={`text-sm font-medium ${summaryData.netProfit >= 0 ? "text-blue-600" : "text-red-600"}`}
                        >
                          Net Profit
                        </p>
                        <p
                          className={`text-2xl font-bold ${summaryData.netProfit >= 0 ? "text-blue-800" : "text-red-800"}`}
                        >
                          {formatCurrency(summaryData.netProfit)}
                        </p>
                      </div>
                      <DollarSign
                        className={`h-8 w-8 ${summaryData.netProfit >= 0 ? "text-blue-600" : "text-red-600"}`}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-orange-600 font-medium">
                          Total Withdrawals
                        </p>
                        <p className="text-2xl font-bold text-orange-800">
                          {formatCurrency(summaryData.totalWithdrawals)}
                        </p>
                      </div>
                      <Banknote className="h-8 w-8 text-orange-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Profit Margin */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Business Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">
                          Profit Margin
                        </span>
                        <span
                          className={`text-sm font-bold ${summaryData.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}
                        >
                          {formatPercentage(
                            summaryData.totalIncome > 0
                              ? (summaryData.netProfit /
                                  summaryData.totalIncome) *
                                  100
                              : 0,
                          )}
                        </span>
                      </div>
                      <Progress
                        value={Math.abs(
                          summaryData.totalIncome > 0
                            ? (summaryData.netProfit /
                                summaryData.totalIncome) *
                                100
                            : 0,
                        )}
                        className="h-3"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="income" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Income Sources */}
                <Card>
                  <CardHeader>
                    <CardTitle>Income Sources</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span>Food Orders</span>
                        <span className="font-bold text-green-600">
                          {formatCurrency(
                            summaryData.incomeBreakdown.fromOrders,
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Charging Sessions</span>
                        <span className="font-bold text-blue-600">
                          {formatCurrency(
                            summaryData.incomeBreakdown.fromCharging,
                          )}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Methods */}
                <Card>
                  <CardHeader>
                    <CardTitle>Payment Method Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Banknote className="h-4 w-4 text-green-600" />
                          Cash
                        </span>
                        <span className="font-bold">
                          {formatCurrency(
                            summaryData.paymentMethodBreakdown.cash,
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-blue-600" />
                          eSewa
                        </span>
                        <span className="font-bold">
                          {formatCurrency(
                            summaryData.paymentMethodBreakdown.esewa,
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-purple-600" />
                          Fonepay
                        </span>
                        <span className="font-bold">
                          {formatCurrency(
                            summaryData.paymentMethodBreakdown.fonepay,
                          )}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="withdrawals" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-orange-600" />
                    Withdrawal Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                        <h4 className="font-semibold text-orange-800 mb-3">
                          Total Withdrawals
                        </h4>
                        <p className="text-2xl font-bold text-orange-600">
                          {formatCurrency(
                            summaryData.withdrawalBreakdown.total,
                          )}
                        </p>
                      </div>

                      <div className="text-sm text-gray-600 p-3 bg-gray-50 rounded border">
                        <strong>Formula:</strong> Withdrawal = Withdrawal from
                        bank + Withdrawal from Savings + Withdrawal from eSewa +
                        Withdrawal from Fonepay
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded">
                        <span className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-blue-600" />
                          From Bank
                        </span>
                        <span className="font-bold text-blue-600">
                          {formatCurrency(
                            summaryData.withdrawalBreakdown.fromBank,
                          )}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-purple-50 rounded">
                        <span className="flex items-center gap-2">
                          <PiggyBank className="h-4 w-4 text-purple-600" />
                          From Savings
                        </span>
                        <span className="font-bold text-purple-600">
                          {formatCurrency(
                            summaryData.withdrawalBreakdown.fromSavings,
                          )}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-green-50 rounded">
                        <span className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          From eSewa
                        </span>
                        <span className="font-bold text-green-600">
                          {formatCurrency(
                            summaryData.withdrawalBreakdown.fromEsewa,
                          )}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-indigo-50 rounded">
                        <span className="flex items-center gap-2">
                          <Banknote className="h-4 w-4 text-indigo-600" />
                          From Fonepay
                        </span>
                        <span className="font-bold text-indigo-600">
                          {formatCurrency(
                            summaryData.withdrawalBreakdown.fromFonepay,
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="balances" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Current Account Balances
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Banknote className="h-5 w-5 text-green-600" />
                        <span className="font-medium text-green-800">Cash</span>
                      </div>
                      <p className="text-xl font-bold text-green-600">
                        {formatCurrency(summaryData.currentBalances.cash)}
                      </p>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2 mb-2">
                        <CreditCard className="h-5 w-5 text-blue-600" />
                        <span className="font-medium text-blue-800">eSewa</span>
                      </div>
                      <p className="text-xl font-bold text-blue-600">
                        {formatCurrency(summaryData.currentBalances.esewa)}
                      </p>
                    </div>

                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-5 w-5 text-purple-600" />
                        <span className="font-medium text-purple-800">
                          Fonepay
                        </span>
                      </div>
                      <p className="text-xl font-bold text-purple-600">
                        {formatCurrency(summaryData.currentBalances.fonepay)}
                      </p>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-5 w-5 text-gray-600" />
                        <span className="font-medium text-gray-800">Total</span>
                      </div>
                      <p className="text-xl font-bold text-gray-600">
                        {formatCurrency(summaryData.currentBalances.total)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="debug" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                    Data Diagnostics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="font-semibold text-blue-800 mb-2">
                        July 13th, 2025 Check
                      </h4>
                      <p className="text-sm text-blue-600 mb-2">
                        Expected: 30,000 total withdrawals (10,000 from
                        cooperative)
                      </p>
                      <div className="text-xs font-mono bg-white p-2 rounded border">
                        <p>Check browser console for detailed July 13th data</p>
                        <p>
                          Use "Force Update" button to refresh daily summaries
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <h4 className="font-semibold text-gray-800 mb-2">
                        Daily Summaries Status
                      </h4>
                      <p className="text-sm text-gray-600 mb-2">
                        Total days with data: {summaryData.dataPoints}
                      </p>
                      <p className="text-sm text-gray-600">
                        Date range: {summaryData.dateRange.from} to{" "}
                        {summaryData.dateRange.to}
                      </p>
                    </div>

                    {summaryData.totalWithdrawals === 0 && (
                      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <h4 className="font-semibold text-yellow-800 mb-2">
                          ⚠️ No Withdrawals Detected
                        </h4>
                        <p className="text-sm text-yellow-600">
                          If you have withdrawal records but they're not
                          showing, try:
                        </p>
                        <ul className="text-sm text-yellow-600 list-disc list-inside mt-2">
                          <li>
                            Click "Force Update" to refresh daily summaries
                          </li>
                          <li>
                            Check that withdrawal dates are correctly formatted
                          </li>
                          <li>
                            Verify withdrawal records exist in the database
                          </li>
                        </ul>
                      </div>
                    )}

                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <h4 className="font-semibold text-green-800 mb-2">
                        Withdrawal Calculation Formula
                      </h4>
                      <div className="text-sm text-green-600 space-y-1">
                        <p>
                          <strong>Total Withdrawals =</strong>
                        </p>
                        <p className="ml-4">
                          + Withdrawal from bank (
                          {formatCurrency(
                            summaryData.withdrawalBreakdown?.fromBank || 0,
                          )}
                          )
                        </p>
                        <p className="ml-4">
                          + Withdrawal from Savings (
                          {formatCurrency(
                            summaryData.withdrawalBreakdown?.fromSavings || 0,
                          )}
                          )
                        </p>
                        <p className="ml-4">
                          + Withdrawal from eSewa (
                          {formatCurrency(
                            summaryData.withdrawalBreakdown?.fromEsewa || 0,
                          )}
                          )
                        </p>
                        <p className="ml-4">
                          + Withdrawal from Fonepay (
                          {formatCurrency(
                            summaryData.withdrawalBreakdown?.fromFonepay || 0,
                          )}
                          )
                        </p>
                        <p className="mt-2">
                          <strong>
                            Total:{" "}
                            {formatCurrency(summaryData.totalWithdrawals)}
                          </strong>
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter className="space-x-3">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
          {summaryData && (
            <>
              <Button
                variant="outline"
                onClick={fetchAllTimeSummary}
                disabled={loading}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
              <Button onClick={exportData}>
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AllTimeSummaryModal;
