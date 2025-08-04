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
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Save,
  CheckCircle,
  AlertTriangle,
  CreditCard,
  ShoppingCart,
  Zap,
  Receipt,
  PiggyBank,
  Banknote,
  ArrowUpDown,
  Eye,
  BarChart3,
  Database,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { extractErrorMessage, logError } from "@/utils/errorHandling";
import AllTimeSummaryModal from "@/components/AllTimeSummaryModal";
import { DateRange } from "react-day-picker";

interface DailyClosingData {
  date: string;
  // Financial totals from daily_summary
  total_income: number;
  total_income_from_orders: number;
  total_income_from_charging: number;
  total_expenses: number;
  total_deposits: number;
  total_withdrawals: number;
  total_savings: number;
  
  // Payment mode breakdowns from daily_summary
  total_income_cash: number;
  total_income_esewa: number;
  total_income_fonepay: number;
  
  // Balances from daily_summary
  cash_balance: number;
  esewa_balance: number;
  fonepay_balance: number;
  cooperative_balance: number;
  total_balance: number;
  
  // Transaction counts from actual tables
  orders_count: number;
  charging_count: number;
  expenses_count: number;
  deposits_count: number;
  withdrawals_count: number;
  savings_count: number;
  
  // Status
  status: "pending" | "processing" | "completed" | "error";
  error_message?: string;
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
  const [processing, setProcessing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [closingData, setClosingData] = useState<DailyClosingData | null>(null);
  const [selectedTab, setSelectedTab] = useState("summary");
  
  // All Time Summary Modal state
  const [showAllTimeSummary, setShowAllTimeSummary] = useState(false);
  const [allTimeSummaryData, setAllTimeSummaryData] = useState(null);
  const [allTimeLoading, setAllTimeLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      fetchClosingData();
    }
  }, [isOpen, selectedDate, user]);

  const fetchClosingData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // First, try to get existing daily summary for the date
      const { data: existingSummary } = await supabase
        .from("daily_summary")
        .select("*")
        .eq("summary_date", selectedDate)
        .single();

      // Get transaction counts from actual tables
      const [
        ordersCountRes,
        chargingCountRes,
        expensesCountRes,
        depositsCountRes,
        withdrawalsCountRes,
        savingsCountRes,
      ] = await Promise.all([
        supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("order_date", selectedDate),
        supabase
          .from("charging_sessions")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("session_date", selectedDate),
        supabase
          .from("expenses")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("expense_date", selectedDate),
        supabase
          .from("deposits")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("deposit_date", selectedDate),
        supabase
          .from("withdrawals")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("withdrawal_date", selectedDate),
        supabase
          .from("cooperative_savings")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("contribution_date", selectedDate),
      ]);

      const data: DailyClosingData = {
        date: selectedDate,
        // Use existing summary data if available, otherwise defaults
        total_income: existingSummary?.total_income || 0,
        total_income_from_orders: existingSummary?.total_income_from_orders || 0,
        total_income_from_charging: existingSummary?.total_income_from_charging || 0,
        total_expenses: existingSummary?.total_expenses || 0,
        total_deposits: existingSummary?.total_deposits || 0,
        total_withdrawals: existingSummary?.total_withdrawals || 0,
        total_savings: existingSummary?.total_savings || 0,
        
        total_income_cash: existingSummary?.total_income_cash || 0,
        total_income_esewa: existingSummary?.total_income_esewa || 0,
        total_income_fonepay: existingSummary?.total_income_fonepay || 0,
        
        cash_balance: existingSummary?.cash_balance || 0,
        esewa_balance: existingSummary?.esewa_balance || 0,
        fonepay_balance: existingSummary?.fonepay_balance || 0,
        cooperative_balance: existingSummary?.cooperative_balance || 0,
        total_balance: existingSummary?.total_balance || 0,
        
        // Transaction counts from actual tables
        orders_count: ordersCountRes.count || 0,
        charging_count: chargingCountRes.count || 0,
        expenses_count: expensesCountRes.count || 0,
        deposits_count: depositsCountRes.count || 0,
        withdrawals_count: withdrawalsCountRes.count || 0,
        savings_count: savingsCountRes.count || 0,
        
        status: existingSummary ? "completed" : "pending",
      };

      setClosingData(data);
    } catch (error) {
      logError("fetching closing data", error);
      toast.error(`Error fetching closing data: ${extractErrorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const performDailyClosing = async () => {
    if (!user || !closingData) return;

    setProcessing(true);
    try {
      // Update/create daily summary using the existing function
      const { error: summaryError } = await supabase.rpc("update_enhanced_daily_summary", {
        target_date: selectedDate,
      });

      if (summaryError) {
        throw summaryError;
      }

      // Refresh the data to show updated values
      await fetchClosingData();
      
      toast.success("Daily closing completed successfully!");
    } catch (error) {
      logError("daily closing", error);
      toast.error(`Error during daily closing: ${extractErrorMessage(error)}`);
      
      if (closingData) {
        setClosingData({
          ...closingData,
          status: "error",
          error_message: extractErrorMessage(error),
        });
      }
    } finally {
      setProcessing(false);
    }
  };

  const fetchAllTimeData = async (dateRange?: DateRange) => {
    if (!user) return;
    
    setAllTimeLoading(true);
    try {
      // Build date filters
      let ordersQuery = supabase.from("orders").select("*").eq("user_id", user.id);
      let chargingQuery = supabase.from("charging_sessions").select("*").eq("user_id", user.id);
      let expensesQuery = supabase.from("expenses").select("*").eq("user_id", user.id);
      let depositsQuery = supabase.from("deposits").select("*").eq("user_id", user.id);
      let withdrawalsQuery = supabase.from("withdrawals").select("*").eq("user_id", user.id);
      let savingsQuery = supabase.from("cooperative_savings").select("*").eq("user_id", user.id);

      if (dateRange?.from && dateRange?.to) {
        const fromDate = format(dateRange.from, 'yyyy-MM-dd');
        const toDate = format(dateRange.to, 'yyyy-MM-dd');
        
        ordersQuery = ordersQuery.gte("order_date", fromDate).lte("order_date", toDate);
        chargingQuery = chargingQuery.gte("session_date", fromDate).lte("session_date", toDate);
        expensesQuery = expensesQuery.gte("expense_date", fromDate).lte("expense_date", toDate);
        depositsQuery = depositsQuery.gte("deposit_date", fromDate).lte("deposit_date", toDate);
        withdrawalsQuery = withdrawalsQuery.gte("withdrawal_date", fromDate).lte("withdrawal_date", toDate);
        savingsQuery = savingsQuery.gte("contribution_date", fromDate).lte("contribution_date", toDate);
      }

      const [
        ordersRes,
        chargingRes,
        expensesRes,
        depositsRes,
        withdrawalsRes,
        savingsRes,
      ] = await Promise.all([
        ordersQuery,
        chargingQuery,
        expensesQuery,
        depositsQuery,
        withdrawalsQuery,
        savingsQuery,
      ]);

      // Calculate totals
      const orders = ordersRes.data || [];
      const charging = chargingRes.data || [];
      const expenses = expensesRes.data || [];
      const deposits = depositsRes.data || [];
      const withdrawals = withdrawalsRes.data || [];
      const savings = savingsRes.data || [];

      const totalOrderIncome = orders.reduce((sum, order) => sum + (order.total || 0), 0);
      const totalChargingIncome = charging.reduce((sum, session) => sum + (session.total_amount || 0), 0);
      const totalIncome = totalOrderIncome + totalChargingIncome;
      
      const totalExpenses = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
      const totalDeposits = deposits.reduce((sum, deposit) => sum + (deposit.amount || 0), 0);
      const totalWithdrawals = withdrawals.reduce((sum, withdrawal) => sum + (withdrawal.amount || 0), 0);
      const cooperativeSavings = savings.reduce((sum, saving) => sum + (saving.contribution_amount || 0), 0);

      // Calculate payment method breakdowns
      const calculatePaymentBreakdown = (items: any[], amountField: string) => {
        const cash = items.filter(item => item.payment_mode?.toLowerCase() === 'cash')
          .reduce((sum, item) => sum + (item[amountField] || 0), 0);
        const esewa = items.filter(item => item.payment_mode?.toLowerCase() === 'esewa')
          .reduce((sum, item) => sum + (item[amountField] || 0), 0);
        const fonepay = items.filter(item => item.payment_mode?.toLowerCase() === 'fonepay')
          .reduce((sum, item) => sum + (item[amountField] || 0), 0);
        return { cash, esewa, fonepay };
      };

      const orderPayments = calculatePaymentBreakdown(orders, 'total');
      const chargingPayments = calculatePaymentBreakdown(charging, 'total_amount');

      const paymentMethodBreakdown = {
        cash: orderPayments.cash + chargingPayments.cash,
        esewa: orderPayments.esewa + chargingPayments.esewa,
        fonepay: orderPayments.fonepay + chargingPayments.fonepay,
      };

      // Calculate current balances (simplified)
      const expensePayments = calculatePaymentBreakdown(expenses, 'amount');
      const depositPayments = calculatePaymentBreakdown(deposits, 'amount');
      const savingsPayments = calculatePaymentBreakdown(savings, 'contribution_amount');

      const currentBalances = {
        cash: paymentMethodBreakdown.cash - expensePayments.cash - savingsPayments.cash + depositPayments.cash,
        esewa: paymentMethodBreakdown.esewa - expensePayments.esewa - savingsPayments.esewa + depositPayments.esewa,
        fonepay: paymentMethodBreakdown.fonepay - expensePayments.fonepay - savingsPayments.fonepay + depositPayments.fonepay,
        total: 0,
      };
      currentBalances.total = currentBalances.cash + currentBalances.esewa + currentBalances.fonepay;

      // Get unique dates for data points count
      const allDates = new Set([
        ...orders.map(o => o.order_date),
        ...charging.map(c => c.session_date),
        ...expenses.map(e => e.expense_date),
        ...deposits.map(d => d.deposit_date),
        ...withdrawals.map(w => w.withdrawal_date),
        ...savings.map(s => s.contribution_date),
      ]);

      const summaryData = {
        totalIncome,
        totalExpenses,
        totalDeposits,
        totalWithdrawals,
        cooperativeSavings,
        netProfit: totalIncome - totalExpenses,
        currentBalances,
        incomeBreakdown: {
          fromOrders: totalOrderIncome,
          fromCharging: totalChargingIncome,
        },
        paymentMethodBreakdown,
        withdrawalBreakdown: {
          fromBank: 0,
          fromSavings: 0,
          fromEsewa: 0,
          fromFonepay: 0,
          total: totalWithdrawals,
        },
        dataPoints: allDates.size,
        dateRange: dateRange ? {
          from: format(dateRange.from!, 'yyyy-MM-dd'),
          to: format(dateRange.to!, 'yyyy-MM-dd'),
        } : {
          from: 'All time',
          to: 'All time',
        },
      };

      setAllTimeSummaryData(summaryData);
    } catch (error) {
      logError("fetching all time data", error);
      toast.error(`Error fetching all time data: ${extractErrorMessage(error)}`);
    } finally {
      setAllTimeLoading(false);
    }
  };

  const handleShowAllTime = () => {
    setShowAllTimeSummary(true);
    fetchAllTimeData();
  };

  const handleAllTimeDateRangeChange = (dateRange: DateRange) => {
    fetchAllTimeData(dateRange);
  };

  const formatCurrency = (amount: number) => `NRs. ${amount.toLocaleString()}`;

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
            Processing...
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

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-6 w-6 text-blue-600" />
              Daily Closing System - {format(new Date(selectedDate), "MMMM dd, yyyy")}
              {closingData && getStatusBadge(closingData.status)}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Date Selector with All Time Button */}
            <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
              <label className="text-sm font-medium">Closing Date:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                disabled={processing}
                className="border rounded px-3 py-2"
              />
              <Button
                onClick={fetchClosingData}
                disabled={loading}
                variant="outline"
              >
                {loading ? "Loading..." : "Load Data"}
              </Button>
              <div className="flex-1" />
              <Button
                onClick={handleShowAllTime}
                disabled={allTimeLoading}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
              >
                <Database className="h-4 w-4" />
                {allTimeLoading ? "Loading..." : "All Time"}
              </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm text-gray-600">Total Income</p>
                      <p className="text-lg font-bold text-green-600">
                        {formatCurrency(closingData.total_income)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {closingData.orders_count + closingData.charging_count} transactions
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
                        {formatCurrency(closingData.total_expenses)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {closingData.expenses_count} transactions
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
                      <p className="text-sm text-gray-600">Net Result</p>
                      <p className={`text-lg font-bold ${closingData.total_income - closingData.total_expenses >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {formatCurrency(closingData.total_income - closingData.total_expenses)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Profit/Loss
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="text-sm text-gray-600">Total Balance</p>
                      <p className="text-lg font-bold text-purple-600">
                        {formatCurrency(closingData.total_balance)}
                      </p>
                      <p className="text-xs text-gray-500">
                        All accounts
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Tabs */}
            <Tabs value={selectedTab} onValueChange={setSelectedTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="income">Income</TabsTrigger>
                <TabsTrigger value="expenses">Expenses</TabsTrigger>
                <TabsTrigger value="balances">Balances</TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="h-5 w-5" />
                      Daily Summary Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Category</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="text-right">Count</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="flex items-center gap-2">
                              <ShoppingCart className="h-4 w-4 text-blue-600" />
                              Orders
                            </TableCell>
                            <TableCell className="text-right font-medium text-green-600">
                              {formatCurrency(closingData.total_income_from_orders)}
                            </TableCell>
                            <TableCell className="text-right">
                              {closingData.orders_count}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="flex items-center gap-2">
                              <Zap className="h-4 w-4 text-yellow-600" />
                              Charging Sessions
                            </TableCell>
                            <TableCell className="text-right font-medium text-green-600">
                              {formatCurrency(closingData.total_income_from_charging)}
                            </TableCell>
                            <TableCell className="text-right">
                              {closingData.charging_count}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="flex items-center gap-2">
                              <Receipt className="h-4 w-4 text-red-600" />
                              Expenses
                            </TableCell>
                            <TableCell className="text-right font-medium text-red-600">
                              -{formatCurrency(closingData.total_expenses)}
                            </TableCell>
                            <TableCell className="text-right">
                              {closingData.expenses_count}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="flex items-center gap-2">
                              <ArrowUpDown className="h-4 w-4 text-blue-600" />
                              Deposits
                            </TableCell>
                            <TableCell className="text-right font-medium text-blue-600">
                              {formatCurrency(closingData.total_deposits)}
                            </TableCell>
                            <TableCell className="text-right">
                              {closingData.deposits_count}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="flex items-center gap-2">
                              <ArrowUpDown className="h-4 w-4 text-orange-600" />
                              Withdrawals
                            </TableCell>
                            <TableCell className="text-right font-medium text-orange-600">
                              -{formatCurrency(closingData.total_withdrawals)}
                            </TableCell>
                            <TableCell className="text-right">
                              {closingData.withdrawals_count}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="flex items-center gap-2">
                              <PiggyBank className="h-4 w-4 text-purple-600" />
                              Savings
                            </TableCell>
                            <TableCell className="text-right font-medium text-purple-600">
                              {formatCurrency(closingData.total_savings)}
                            </TableCell>
                            <TableCell className="text-right">
                              {closingData.savings_count}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="income" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Income Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-lg font-semibold mb-4">By Source</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                            <span className="flex items-center gap-2">
                              <ShoppingCart className="h-4 w-4" />
                              Orders
                            </span>
                            <span className="font-semibold text-green-600">
                              {formatCurrency(closingData.total_income_from_orders)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-yellow-50 rounded">
                            <span className="flex items-center gap-2">
                              <Zap className="h-4 w-4" />
                              Charging
                            </span>
                            <span className="font-semibold text-green-600">
                              {formatCurrency(closingData.total_income_from_charging)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-lg font-semibold mb-4">By Payment Mode</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                            <span className="flex items-center gap-2">
                              <Banknote className="h-4 w-4" />
                              Cash
                            </span>
                            <span className="font-semibold text-green-600">
                              {formatCurrency(closingData.total_income_cash)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                            <span className="flex items-center gap-2">
                              <CreditCard className="h-4 w-4" />
                              eSewa
                            </span>
                            <span className="font-semibold text-blue-600">
                              {formatCurrency(closingData.total_income_esewa)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-purple-50 rounded">
                            <span className="flex items-center gap-2">
                              <CreditCard className="h-4 w-4" />
                              Fonepay
                            </span>
                            <span className="font-semibold text-purple-600">
                              {formatCurrency(closingData.total_income_fonepay)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="expenses" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingDown className="h-5 w-5" />
                      Expenses & Outflows
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-lg font-semibold mb-4">Expenses</h4>
                        <div className="flex justify-between items-center p-4 bg-red-50 rounded">
                          <span className="flex items-center gap-2">
                            <Receipt className="h-5 w-5" />
                            Total Expenses
                          </span>
                          <span className="font-bold text-red-600 text-lg">
                            {formatCurrency(closingData.total_expenses)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-2">
                          {closingData.expenses_count} expense transactions
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="text-lg font-semibold mb-4">Other Outflows</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center p-3 bg-orange-50 rounded">
                            <span className="flex items-center gap-2">
                              <ArrowUpDown className="h-4 w-4" />
                              Withdrawals
                            </span>
                            <span className="font-semibold text-orange-600">
                              {formatCurrency(closingData.total_withdrawals)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-purple-50 rounded">
                            <span className="flex items-center gap-2">
                              <PiggyBank className="h-4 w-4" />
                              Savings
                            </span>
                            <span className="font-semibold text-purple-600">
                              {formatCurrency(closingData.total_savings)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="balances" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Account Balances
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center p-4 bg-green-50 rounded">
                          <span className="flex items-center gap-2">
                            <Banknote className="h-5 w-5" />
                            Cash Balance
                          </span>
                          <span className="font-bold text-green-600 text-lg">
                            {formatCurrency(closingData.cash_balance)}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center p-4 bg-blue-50 rounded">
                          <span className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5" />
                            eSewa Balance
                          </span>
                          <span className="font-bold text-blue-600 text-lg">
                            {formatCurrency(closingData.esewa_balance)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex justify-between items-center p-4 bg-purple-50 rounded">
                          <span className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5" />
                            Fonepay Balance
                          </span>
                          <span className="font-bold text-purple-600 text-lg">
                            {formatCurrency(closingData.fonepay_balance)}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center p-4 bg-orange-50 rounded">
                          <span className="flex items-center gap-2">
                            <PiggyBank className="h-5 w-5" />
                            Cooperative Balance
                          </span>
                          <span className="font-bold text-orange-600 text-lg">
                            {formatCurrency(closingData.cooperative_balance)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-6 p-4 bg-gray-100 rounded">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold">Total Balance</span>
                        <span className="text-2xl font-bold text-gray-800">
                          {formatCurrency(closingData.total_balance)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {closingData?.error_message && (
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-medium">Error:</span>
                  {closingData.error_message}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={processing}>
            Close
          </Button>
          {closingData && closingData.status !== "completed" && (
            <Button
              onClick={performDailyClosing}
              disabled={processing || loading}
              className="flex items-center gap-2"
            >
              {processing ? (
                <>Processing...</>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Perform Daily Closing
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* All Time Summary Modal */}
    <AllTimeSummaryModal
      isOpen={showAllTimeSummary}
      onClose={() => setShowAllTimeSummary(false)}
      summaryData={allTimeSummaryData}
      onDateRangeChange={handleAllTimeDateRangeChange}
    />
  );
};

export default DailyClosingSystem;
