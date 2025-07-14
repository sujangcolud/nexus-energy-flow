import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  FileText,
  Calculator,
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Zap,
  Receipt,
  CreditCard,
  Banknote,
  Users,
  Sparkles,
  Eye,
  Calendar,
  BarChart3,
  PieChart,
  TrendingDown,
  Target,
  Filter,
  Download,
  RefreshCw,
} from "lucide-react";
import {
  format,
  parseISO,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  addMonths,
} from "date-fns";

const ReportsViewTab = () => {
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });
  const [reportData, setReportData] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedDayData, setSelectedDayData] = useState<any>(null);

  const formatCurrency = (amount: number) => `NRs. ${amount.toFixed(2)}`;

  const fetchReportData = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { startDate, endDate } = dateRange;

      // Fetch all data types
      const [
        ordersRes,
        chargingRes,
        expensesRes,
        savingsRes,
        depositsRes,
        withdrawalsRes,
      ] = await Promise.all([
        supabase
          .from("orders")
          .select("*")
          .gte("order_date", startDate)
          .lte("order_date", endDate)
          .eq("user_id", user.id),
        supabase
          .from("charging_sessions")
          .select("*")
          .gte("session_date", startDate)
          .lte("session_date", endDate)
          .eq("user_id", user.id),
        supabase
          .from("expenses")
          .select("*")
          .gte("expense_date", startDate)
          .lte("expense_date", endDate)
          .eq("user_id", user.id),
        supabase
          .from("cooperative_savings")
          .select("*")
          .gte("contribution_date", startDate)
          .lte("contribution_date", endDate)
          .eq("user_id", user.id),
        supabase
          .from("deposits")
          .select("*")
          .gte("deposit_date", startDate)
          .lte("deposit_date", endDate)
          .eq("user_id", user.id),
        supabase
          .from("withdrawals")
          .select("*")
          .gte("withdrawal_date", startDate)
          .lte("withdrawal_date", endDate)
          .eq("user_id", user.id),
      ]);

      setReportData({
        orders: ordersRes.data || [],
        charging: chargingRes.data || [],
        expenses: expensesRes.data || [],
        savings: savingsRes.data || [],
        deposits: depositsRes.data || [],
        withdrawals: withdrawalsRes.data || [],
      });
    } catch (error) {
      console.error("Error fetching report data:", error);
      toast.error("Failed to load report data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [user, dateRange]);

  // Calculate totals
  const totals = {
    revenue:
      (reportData.orders || []).reduce(
        (sum: number, order: any) => sum + order.total,
        0,
      ) +
      (reportData.charging || []).reduce(
        (sum: number, session: any) => sum + session.total_amount,
        0,
      ),
    expenses: (reportData.expenses || []).reduce(
      (sum: number, expense: any) => sum + expense.amount,
      0,
    ),
    deposits: (reportData.deposits || []).reduce(
      (sum: number, deposit: any) => sum + deposit.amount,
      0,
    ),
    withdrawals: (reportData.withdrawals || []).reduce(
      (sum: number, withdrawal: any) => sum + withdrawal.amount,
      0,
    ),
    savings: (reportData.savings || []).reduce(
      (sum: number, saving: any) => sum + saving.contribution_amount,
      0,
    ),
  };

  const netProfit = totals.revenue - totals.expenses;
  const cashFlow = totals.deposits - totals.withdrawals;

  // Payment method analysis
  const paymentAnalysis = (() => {
    const methods: Record<string, number> = {};

    [...(reportData.orders || []), ...(reportData.charging || [])].forEach(
      (item: any) => {
        const method = item.payment_mode;
        methods[method] =
          (methods[method] || 0) + (item.total || item.total_amount);
      },
    );

    return Object.entries(methods)
      .map(([method, amount]) => ({ method, amount }))
      .sort((a, b) => b.amount - a.amount);
  })();

  // Category breakdown for expenses
  const expenseCategories = (() => {
    const categories: Record<string, number> = {};

    (reportData.expenses || []).forEach((expense: any) => {
      categories[expense.category] =
        (categories[expense.category] || 0) + expense.amount;
    });

    return Object.entries(categories)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  })();

  // Daily breakdown
  const dailyBreakdown = (() => {
    if (!dateRange.startDate || !dateRange.endDate) return [];

    const days = eachDayOfInterval({
      start: parseISO(dateRange.startDate),
      end: parseISO(dateRange.endDate),
    });

    return days.map((day) => {
      const dayStr = format(day, "yyyy-MM-dd");

      const dayOrders = (reportData.orders || []).filter(
        (order: any) => order.order_date === dayStr,
      );
      const dayCharging = (reportData.charging || []).filter(
        (session: any) => session.session_date === dayStr,
      );
      const dayExpenses = (reportData.expenses || []).filter(
        (expense: any) => expense.expense_date === dayStr,
      );
      const dayDeposits = (reportData.deposits || []).filter(
        (deposit: any) => deposit.deposit_date === dayStr,
      );
      const dayWithdrawals = (reportData.withdrawals || []).filter(
        (withdrawal: any) => withdrawal.withdrawal_date === dayStr,
      );

      const revenue =
        dayOrders.reduce((sum: number, order: any) => sum + order.total, 0) +
        dayCharging.reduce(
          (sum: number, session: any) => sum + session.total_amount,
          0,
        );
      const expenses = dayExpenses.reduce(
        (sum: number, expense: any) => sum + expense.amount,
        0,
      );
      const deposits = dayDeposits.reduce(
        (sum: number, deposit: any) => sum + deposit.amount,
        0,
      );
      const withdrawals = dayWithdrawals.reduce(
        (sum: number, withdrawal: any) => sum + withdrawal.amount,
        0,
      );

      return {
        date: dayStr,
        revenue,
        expenses,
        profit: revenue - expenses,
        deposits,
        withdrawals,
        cashFlow: deposits - withdrawals,
        transactions:
          dayOrders.length + dayCharging.length + dayExpenses.length,
      };
    });
  })();

  const openDayDetail = (dayData: any) => {
    const dayStr = dayData.date;
    const dayOrders = (reportData.orders || []).filter(
      (order: any) => order.order_date === dayStr,
    );
    const dayCharging = (reportData.charging || []).filter(
      (session: any) => session.session_date === dayStr,
    );
    const dayExpenses = (reportData.expenses || []).filter(
      (expense: any) => expense.expense_date === dayStr,
    );

    setSelectedDayData({
      ...dayData,
      orders: dayOrders,
      charging: dayCharging,
      expenses: dayExpenses,
    });
    setIsDetailModalOpen(true);
  };

  const setQuickDateRange = (type: string) => {
    const today = new Date();
    let startDate = "";
    let endDate = format(today, "yyyy-MM-dd");

    switch (type) {
      case "today":
        startDate = endDate;
        break;
      case "week":
        startDate = format(
          new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
          "yyyy-MM-dd",
        );
        break;
      case "month":
        startDate = format(startOfMonth(today), "yyyy-MM-dd");
        endDate = format(endOfMonth(today), "yyyy-MM-dd");
        break;
      case "lastMonth":
        const lastMonth = addMonths(today, -1);
        startDate = format(startOfMonth(lastMonth), "yyyy-MM-dd");
        endDate = format(endOfMonth(lastMonth), "yyyy-MM-dd");
        break;
    }

    setDateRange({ startDate, endDate });
  };

  const paymentModeColors = {
    Cash: "from-green-500 to-emerald-500",
    Esewa: "from-blue-500 to-cyan-500",
    Fonepay: "from-purple-500 to-pink-500",
    Bank: "from-indigo-500 to-blue-500",
    Cheque: "from-orange-500 to-red-500",
    Credit: "from-violet-500 to-purple-500",
  };

  const categoryColors = {
    "Food & Beverages": "from-orange-500 to-red-500",
    Transportation: "from-blue-500 to-cyan-500",
    Utilities: "from-yellow-500 to-orange-500",
    "Office Supplies": "from-green-500 to-emerald-500",
    Marketing: "from-purple-500 to-pink-500",
    Equipment: "from-gray-500 to-slate-500",
    Maintenance: "from-red-500 to-pink-500",
    Insurance: "from-indigo-500 to-blue-500",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-64 h-64 bg-gradient-to-r from-cyan-400/20 to-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute top-1/3 right-20 w-80 h-80 bg-gradient-to-r from-blue-400/20 to-indigo-500/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
        <div
          className="absolute bottom-20 left-1/4 w-72 h-72 bg-gradient-to-r from-indigo-400/20 to-purple-500/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>
      </div>

      <div className="relative z-10 space-y-8 p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-xl animate-pulse">
              <Eye className="h-8 w-8" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Reports Viewer
            </h1>
            <Sparkles className="h-8 w-8 text-blue-500 animate-bounce" />
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Comprehensive view of your business reports with detailed analytics
          </p>
        </div>

        {/* Date Range Controls */}
        <Card className="bg-gradient-to-r from-white/90 to-cyan-50/90 backdrop-blur-sm border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-white/20 rounded-lg">
                <Calendar className="h-6 w-6" />
              </div>
              Date Range Selection
              <Filter className="h-5 w-5 animate-pulse" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="startDate"
                  className="text-sm font-medium text-gray-700"
                >
                  From:
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, startDate: e.target.value })
                  }
                  className="border-cyan-200 focus:border-cyan-500 focus:ring-cyan-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="endDate"
                  className="text-sm font-medium text-gray-700"
                >
                  To:
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, endDate: e.target.value })
                  }
                  className="border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={() => setQuickDateRange("today")}
                  variant="outline"
                  size="sm"
                  className="hover:bg-cyan-50"
                >
                  Today
                </Button>
                <Button
                  onClick={() => setQuickDateRange("week")}
                  variant="outline"
                  size="sm"
                  className="hover:bg-blue-50"
                >
                  Last 7 Days
                </Button>
                <Button
                  onClick={() => setQuickDateRange("month")}
                  variant="outline"
                  size="sm"
                  className="hover:bg-indigo-50"
                >
                  This Month
                </Button>
                <Button
                  onClick={() => setQuickDateRange("lastMonth")}
                  variant="outline"
                  size="sm"
                  className="hover:bg-purple-50"
                >
                  Last Month
                </Button>
              </div>
              <Button
                onClick={fetchReportData}
                disabled={isLoading}
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Filter className="h-4 w-4 mr-2" />
                )}
                {isLoading ? "Loading..." : "Apply Filter"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    Total Revenue
                  </p>
                  <p className="text-2xl font-bold text-green-800">
                    {formatCurrency(totals.revenue)}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    Orders + Charging
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl text-white">
                  <DollarSign className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-pink-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600 font-medium flex items-center gap-1">
                    <TrendingDown className="h-4 w-4" />
                    Total Expenses
                  </p>
                  <p className="text-2xl font-bold text-red-800">
                    {formatCurrency(totals.expenses)}
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    {expenseCategories.length} categories
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl text-white">
                  <Receipt className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`${netProfit >= 0 ? "bg-gradient-to-br from-blue-50 to-indigo-50" : "bg-gradient-to-br from-orange-50 to-red-50"} border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105`}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className={`text-sm font-medium flex items-center gap-1 ${netProfit >= 0 ? "text-blue-600" : "text-orange-600"}`}
                  >
                    <Target className="h-4 w-4" />
                    Net Profit
                  </p>
                  <p
                    className={`text-2xl font-bold ${netProfit >= 0 ? "text-blue-800" : "text-orange-800"}`}
                  >
                    {formatCurrency(netProfit)}
                  </p>
                  <p
                    className={`text-xs mt-1 ${netProfit >= 0 ? "text-blue-600" : "text-orange-600"}`}
                  >
                    {totals.revenue > 0
                      ? ((netProfit / totals.revenue) * 100).toFixed(1)
                      : 0}
                    % margin
                  </p>
                </div>
                <div
                  className={`p-3 rounded-xl text-white ${netProfit >= 0 ? "bg-gradient-to-r from-blue-500 to-indigo-500" : "bg-gradient-to-r from-orange-500 to-red-500"}`}
                >
                  <Calculator className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 font-medium flex items-center gap-1">
                    <Banknote className="h-4 w-4" />
                    Cash Flow
                  </p>
                  <p
                    className={`text-2xl font-bold ${cashFlow >= 0 ? "text-purple-800" : "text-red-800"}`}
                  >
                    {formatCurrency(cashFlow)}
                  </p>
                  <p className="text-xs text-purple-600 mt-1">
                    Deposits - Withdrawals
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white">
                  <CreditCard className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white/80 backdrop-blur-sm border border-cyan-200">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-500 data-[state=active]:text-white"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="daily"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white"
            >
              Daily View
            </TabsTrigger>
            <TabsTrigger
              value="payments"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-500 data-[state=active]:text-white"
            >
              Payment Analysis
            </TabsTrigger>
            <TabsTrigger
              value="categories"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white"
            >
              Categories
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-gradient-to-br from-white/90 to-cyan-50/90 backdrop-blur-sm border-0 shadow-2xl">
                <CardHeader className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <BarChart3 className="h-6 w-6" />
                    </div>
                    Transaction Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg">
                      <p className="text-sm text-orange-600 font-medium">
                        Orders
                      </p>
                      <p className="text-xl font-bold text-orange-800">
                        {(reportData.orders || []).length}
                      </p>
                    </div>
                    <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg">
                      <p className="text-sm text-yellow-600 font-medium">
                        Charging Sessions
                      </p>
                      <p className="text-xl font-bold text-yellow-800">
                        {(reportData.charging || []).length}
                      </p>
                    </div>
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                      <p className="text-sm text-blue-600 font-medium">
                        Deposits
                      </p>
                      <p className="text-xl font-bold text-blue-800">
                        {(reportData.deposits || []).length}
                      </p>
                    </div>
                    <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
                      <p className="text-sm text-purple-600 font-medium">
                        Withdrawals
                      </p>
                      <p className="text-xl font-bold text-purple-800">
                        {(reportData.withdrawals || []).length}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">
                        Revenue vs Target
                      </span>
                      <span className="font-bold text-cyan-600">75%</span>
                    </div>
                    <Progress value={75} className="h-3" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-white/90 to-blue-50/90 backdrop-blur-sm border-0 shadow-2xl">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <PieChart className="h-6 w-6" />
                    </div>
                    Financial Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
                      <span className="font-medium text-gray-800">
                        Revenue Share
                      </span>
                      <span className="font-bold text-green-600">
                        {totals.revenue > 0 ? "100%" : "0%"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gradient-to-r from-red-50 to-pink-50 rounded-lg">
                      <span className="font-medium text-gray-800">
                        Expense Ratio
                      </span>
                      <span className="font-bold text-red-600">
                        {totals.revenue > 0
                          ? ((totals.expenses / totals.revenue) * 100).toFixed(
                              1,
                            )
                          : 0}
                        %
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                      <span className="font-medium text-gray-800">
                        Savings Rate
                      </span>
                      <span className="font-bold text-blue-600">
                        {totals.revenue > 0
                          ? ((totals.savings / totals.revenue) * 100).toFixed(1)
                          : 0}
                        %
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Daily View Tab */}
          <TabsContent value="daily">
            <Card className="bg-gradient-to-br from-white/90 to-blue-50/90 backdrop-blur-sm border-0 shadow-2xl">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Calendar className="h-6 w-6" />
                  </div>
                  Daily Performance Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {dailyBreakdown.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-xl font-semibold text-gray-700 mb-2">
                      No data for selected period
                    </p>
                    <p className="text-gray-500">
                      Try selecting a different date range.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gradient-to-r from-gray-50 to-blue-50">
                          <TableHead className="font-semibold text-gray-700">
                            Date
                          </TableHead>
                          <TableHead className="font-semibold text-gray-700">
                            Revenue
                          </TableHead>
                          <TableHead className="font-semibold text-gray-700">
                            Expenses
                          </TableHead>
                          <TableHead className="font-semibold text-gray-700">
                            Profit
                          </TableHead>
                          <TableHead className="font-semibold text-gray-700">
                            Cash Flow
                          </TableHead>
                          <TableHead className="font-semibold text-gray-700">
                            Transactions
                          </TableHead>
                          <TableHead className="font-semibold text-gray-700">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dailyBreakdown.map((day, index) => (
                          <TableRow
                            key={day.date}
                            className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200"
                            style={{ animationDelay: `${index * 50}ms` }}
                          >
                            <TableCell className="font-medium">
                              {format(parseISO(day.date), "MMM dd, yyyy")}
                            </TableCell>
                            <TableCell>
                              <span className="font-bold text-green-600">
                                {formatCurrency(day.revenue)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="font-bold text-red-600">
                                {formatCurrency(day.expenses)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span
                                className={`font-bold ${day.profit >= 0 ? "text-blue-600" : "text-orange-600"}`}
                              >
                                {formatCurrency(day.profit)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span
                                className={`font-bold ${day.cashFlow >= 0 ? "text-purple-600" : "text-red-600"}`}
                              >
                                {formatCurrency(day.cashFlow)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className="bg-blue-50 border-blue-200"
                              >
                                {day.transactions}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openDayDetail(day)}
                                className="hover:bg-blue-50 hover:border-blue-300"
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Details
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payment Analysis Tab */}
          <TabsContent value="payments">
            <Card className="bg-gradient-to-br from-white/90 to-indigo-50/90 backdrop-blur-sm border-0 shadow-2xl">
              <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <CreditCard className="h-6 w-6" />
                  </div>
                  Payment Method Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {paymentAnalysis.length === 0 ? (
                  <div className="text-center py-8">
                    <CreditCard className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">No payment data available</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {paymentAnalysis.map((payment, index) => {
                      const percentage =
                        totals.revenue > 0
                          ? (payment.amount / totals.revenue) * 100
                          : 0;
                      return (
                        <div
                          key={payment.method}
                          className="p-4 bg-gradient-to-r from-white to-indigo-50 rounded-lg border border-indigo-100"
                          style={{ animationDelay: `${index * 100}ms` }}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-3 h-3 rounded-full bg-gradient-to-r ${paymentModeColors[payment.method as keyof typeof paymentModeColors] || "from-gray-500 to-slate-500"}`}
                              ></div>
                              <span className="font-medium text-gray-800">
                                {payment.method}
                              </span>
                            </div>
                            <Badge
                              className={`bg-gradient-to-r ${paymentModeColors[payment.method as keyof typeof paymentModeColors] || "from-gray-500 to-slate-500"} text-white border-0 text-xs`}
                            >
                              {percentage.toFixed(1)}%
                            </Badge>
                          </div>
                          <p className="text-lg font-bold text-indigo-600 mb-1">
                            {formatCurrency(payment.amount)}
                          </p>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`bg-gradient-to-r ${paymentModeColors[payment.method as keyof typeof paymentModeColors] || "from-gray-500 to-slate-500"} h-2 rounded-full transition-all duration-500`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories">
            <Card className="bg-gradient-to-br from-white/90 to-purple-50/90 backdrop-blur-sm border-0 shadow-2xl">
              <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <PieChart className="h-6 w-6" />
                  </div>
                  Expense Categories
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {expenseCategories.length === 0 ? (
                  <div className="text-center py-8">
                    <Receipt className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">No expense data available</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {expenseCategories.map((category, index) => {
                      const percentage =
                        totals.expenses > 0
                          ? (category.amount / totals.expenses) * 100
                          : 0;
                      return (
                        <div
                          key={category.category}
                          className="p-4 bg-gradient-to-r from-white to-purple-50 rounded-lg border border-purple-100"
                          style={{ animationDelay: `${index * 100}ms` }}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-3 h-3 rounded-full bg-gradient-to-r ${categoryColors[category.category as keyof typeof categoryColors] || "from-gray-500 to-slate-500"}`}
                              ></div>
                              <span className="font-medium text-gray-800 text-sm">
                                {category.category}
                              </span>
                            </div>
                            <Badge
                              className={`bg-gradient-to-r ${categoryColors[category.category as keyof typeof categoryColors] || "from-gray-500 to-slate-500"} text-white border-0 text-xs`}
                            >
                              {percentage.toFixed(1)}%
                            </Badge>
                          </div>
                          <p className="text-lg font-bold text-purple-600 mb-1">
                            {formatCurrency(category.amount)}
                          </p>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`bg-gradient-to-r ${categoryColors[category.category as keyof typeof categoryColors] || "from-gray-500 to-slate-500"} h-2 rounded-full transition-all duration-500`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Day Detail Modal */}
        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-gradient-to-br from-white to-blue-50">
                        <DialogHeader>
              <DialogTitle className="text-2xl bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {selectedDayData && selectedDayData.date ? (
                  format(parseISO(selectedDayData.date), "EEEE, MMMM dd, yyyy")
                ) : (
                  "Day Details"
                )}
              </DialogTitle>
              <DialogDescription>
                Detailed breakdown of all transactions for this day
              </DialogDescription>
            </DialogHeader>
                        {selectedDayData ? (
              <div className="space-y-6">
                {/* Day Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
                    <p className="text-sm text-green-600 font-medium">
                      Revenue
                    </p>
                    <p className="text-lg font-bold text-green-800">
                      {formatCurrency(selectedDayData.revenue)}
                    </p>
                  </div>
                  <div className="p-3 bg-gradient-to-r from-red-50 to-pink-50 rounded-lg">
                    <p className="text-sm text-red-600 font-medium">Expenses</p>
                    <p className="text-lg font-bold text-red-800">
                      {formatCurrency(selectedDayData.expenses)}
                    </p>
                  </div>
                  <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                    <p className="text-sm text-blue-600 font-medium">Profit</p>
                    <p
                      className={`text-lg font-bold ${selectedDayData.profit >= 0 ? "text-blue-800" : "text-orange-800"}`}
                    >
                      {formatCurrency(selectedDayData.profit)}
                    </p>
                  </div>
                  <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
                    <p className="text-sm text-purple-600 font-medium">
                      Cash Flow
                    </p>
                    <p
                      className={`text-lg font-bold ${selectedDayData.cashFlow >= 0 ? "text-purple-800" : "text-red-800"}`}
                    >
                      {formatCurrency(selectedDayData.cashFlow)}
                    </p>
                  </div>
                </div>

                {/* Transactions */}
                <Tabs defaultValue="orders" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="orders">
                      Orders ({selectedDayData.orders?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger value="charging">
                      Charging ({selectedDayData.charging?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger value="expenses">
                      Expenses ({selectedDayData.expenses?.length || 0})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="orders">
                    {selectedDayData.orders?.length > 0 ? (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Item</TableHead>
                              <TableHead>Quantity</TableHead>
                              <TableHead>Rate</TableHead>
                              <TableHead>Total</TableHead>
                              <TableHead>Payment</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedDayData.orders.map((order: any) => (
                              <TableRow key={order.id}>
                                <TableCell className="font-medium">
                                  {order.item_name}
                                </TableCell>
                                <TableCell>{order.quantity}</TableCell>
                                <TableCell>
                                  {formatCurrency(order.rate)}
                                </TableCell>
                                <TableCell className="font-bold text-green-600">
                                  {formatCurrency(order.total)}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">
                                    {order.payment_mode}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <p className="text-center text-gray-500 py-8">
                        No orders for this day
                      </p>
                    )}
                  </TabsContent>

                  <TabsContent value="charging">
                    {selectedDayData.charging?.length > 0 ? (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Battery Range</TableHead>
                              <TableHead>Energy (kCal)</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Payment</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedDayData.charging.map((session: any) => (
                              <TableRow key={session.id}>
                                <TableCell>
                                  {session.start_percentage}% →{" "}
                                  {session.end_percentage}%
                                </TableCell>
                                <TableCell>{session.kcal} kCal</TableCell>
                                <TableCell className="font-bold text-yellow-600">
                                  {formatCurrency(session.total_amount)}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">
                                    {session.payment_mode}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <p className="text-center text-gray-500 py-8">
                        No charging sessions for this day
                      </p>
                    )}
                  </TabsContent>

                  <TabsContent value="expenses">
                    {selectedDayData.expenses?.length > 0 ? (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Description</TableHead>
                              <TableHead>Category</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Payment</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedDayData.expenses.map((expense: any) => (
                              <TableRow key={expense.id}>
                                <TableCell className="font-medium">
                                  {expense.description}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    className={`bg-gradient-to-r ${categoryColors[expense.category as keyof typeof categoryColors] || "from-gray-500 to-slate-500"} text-white border-0`}
                                  >
                                    {expense.category}
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-bold text-red-600">
                                  {formatCurrency(expense.amount)}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">
                                    {expense.payment_mode}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <p className="text-center text-gray-500 py-8">
                        No expenses for this day
                      </p>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ReportsViewTab;