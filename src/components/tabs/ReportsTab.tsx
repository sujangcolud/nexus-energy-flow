<<<<<<< HEAD
import { useState, useEffect } from "react";
=======
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
>>>>>>> origin/main
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRange } from "react-day-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  FileText,
  Calendar as CalendarIcon,
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Zap,
  Receipt,
  PiggyBank,
  Target,
  BarChart3,
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";
<<<<<<< HEAD
import { toast } from "sonner";
=======
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { UserOptions } from "jspdf-autotable";

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: UserOptions) => jsPDF;
}
>>>>>>> origin/main

interface ReportData {
  period: string;
  totalRevenue: number;
  restaurantRevenue: number;
  chargingRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  totalOrders: number;
  totalChargingSessions: number;
  averageOrderValue: number;
  averageChargingValue: number;
  totalDeposits: number;
  totalWithdrawals: number;
  cooperativeSavings: number;
  cashFlow: number;
  topExpenseCategories: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  topSellingItems: Array<{ name: string; quantity: number; revenue: number }>;
  dailyAverages: {
    revenue: number;
    orders: number;
    charging: number;
    expenses: number;
  };
  growthMetrics: {
    revenueGrowth: number;
    orderGrowth: number;
    profitGrowth: number;
  };
}

const ReportsTab = () => {
  const { user } = useAuth();
<<<<<<< HEAD
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>();
  const [reportType, setReportType] = useState<
    "weekly" | "monthly" | "quarterly" | "custom"
  >("monthly");
=======
  const navigate = useNavigate();
  const [reports, setReports] = useState<ReportData[]>([]);
  const [staticExpenses, setStaticExpenses] = useState<StaticExpense[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [reportType, setReportType] = useState("");
  const [selectedDateFrom, setSelectedDateFrom] = useState<Date | undefined>(
    undefined,
  );
  const [selectedDateTo, setSelectedDateTo] = useState<Date | undefined>(
    undefined,
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [showStaticExpenseDialog, setShowStaticExpenseDialog] = useState(false);
  const [staticExpenseForm, setStaticExpenseForm] = useState({
    description: "",
    amount: "",
    category: "",
    isRecurring: false,
  });
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportData | null>(
    null,
  );

  const itemsPerPage = 10;
  const reportTypes = [
    "Financial Summary",
    "Order Report",
    "Expense Report",
    "Charging Report",
    "Deposit Report",
    "Withdrawal Report",
    "Cooperative Savings Report",
    "Complete Business Report",
  ];

  const expenseCategories = [
    "Office Rent",
    "Utilities",
    "Insurance",
    "Software Subscriptions",
    "Equipment Lease",
    "Legal & Professional",
    "Marketing",
    "Other",
  ];

  const reportTypeColors = {
    "Financial Summary": "from-green-500 to-emerald-500",
    "Order Report": "from-orange-500 to-red-500",
    "Expense Report": "from-red-500 to-pink-500",
    "Charging Report": "from-yellow-500 to-orange-500",
    "Deposit Report": "from-blue-500 to-cyan-500",
    "Withdrawal Report": "from-purple-500 to-indigo-500",
    "Cooperative Savings Report": "from-teal-500 to-cyan-500",
    "Complete Business Report": "from-violet-500 to-purple-500",
  };

  useEffect(() => {
    fetchReports();
    fetchStaticExpenses();
  }, [user, currentPage]);

  const fetchReports = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .range(
          (currentPage - 1) * itemsPerPage,
          currentPage * itemsPerPage - 1,
        );

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  const fetchStaticExpenses = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("static_expenses")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setStaticExpenses(data || []);
    } catch (error) {
      console.error("Error fetching static expenses:", error);
    }
  };
>>>>>>> origin/main

  const generateReport = async () => {
    if (!user) return;

    setGenerating(true);
    try {
      let startDate: Date;
      let endDate = new Date();
      let periodLabel: string;

      // Determine date range based on report type
      switch (reportType) {
        case "weekly":
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 7);
          periodLabel = "Last 7 Days";
          break;
        case "monthly":
          startDate = new Date();
          startDate.setMonth(startDate.getMonth() - 1);
          periodLabel = "Last 30 Days";
          break;
        case "quarterly":
          startDate = new Date();
          startDate.setMonth(startDate.getMonth() - 3);
          periodLabel = "Last 3 Months";
          break;
        case "custom":
          if (!range?.from || !range?.to) {
            toast.error("Please select a custom date range");
            setGenerating(false);
            return;
          }
          startDate = range.from;
          endDate = range.to;
          periodLabel = `${format(startDate, "MMM dd, yyyy")} - ${format(endDate, "MMM dd, yyyy")}`;
          break;
        default:
          startDate = new Date();
          startDate.setMonth(startDate.getMonth() - 1);
          periodLabel = "Last 30 Days";
      }

      // Fetch data for the specified period
      const startDateStr = format(startDate, "yyyy-MM-dd");
      const endDateStr = format(endDate, "yyyy-MM-dd");

      const [
        ordersData,
        chargingData,
        expensesData,
        depositsData,
        withdrawalsData,
        cooperativeData,
      ] = await Promise.all([
        supabase
          .from("orders")
          .select("*")
          .eq("user_id", user.id)
          .gte("order_date", startDateStr)
          .lte("order_date", endDateStr),
        supabase
          .from("charging_sessions")
          .select("*")
          .eq("user_id", user.id)
          .gte("session_date", startDateStr)
          .lte("session_date", endDateStr),
        supabase
          .from("expenses")
          .select("*")
          .eq("user_id", user.id)
          .gte("expense_date", startDateStr)
          .lte("expense_date", endDateStr),
        supabase
          .from("deposits")
          .select("*")
          .eq("user_id", user.id)
          .gte("deposit_date", startDateStr)
          .lte("deposit_date", endDateStr),
        supabase
          .from("withdrawals")
          .select("*")
          .eq("user_id", user.id)
          .gte("withdrawal_date", startDateStr)
          .lte("withdrawal_date", endDateStr),
        supabase
          .from("cooperative_savings")
          .select("*")
          .eq("user_id", user.id)
          .gte("contribution_date", startDateStr)
          .lte("contribution_date", endDateStr),
      ]);

      const orders = ordersData.data || [];
      const chargingSessions = chargingData.data || [];
      const expenses = expensesData.data || [];
      const deposits = depositsData.data || [];
      const withdrawals = withdrawalsData.data || [];
      const cooperative = cooperativeData.data || [];

      // Calculate revenue metrics
      const restaurantRevenue = orders.reduce(
        (sum, order) => sum + order.total,
        0,
      );
      const chargingRevenue = chargingSessions.reduce(
        (sum, session) => sum + session.total_amount,
        0,
      );
      const totalRevenue = restaurantRevenue + chargingRevenue;

      // Calculate expenses
      const totalExpenses = expenses.reduce(
        (sum, expense) => sum + expense.amount,
        0,
      );
      const netProfit = totalRevenue - totalExpenses;
      const profitMargin =
        totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

      // Calculate business metrics
      const totalOrders = orders.length;
      const totalChargingSessions = chargingSessions.length;
      const averageOrderValue =
        totalOrders > 0 ? restaurantRevenue / totalOrders : 0;
      const averageChargingValue =
        totalChargingSessions > 0 ? chargingRevenue / totalChargingSessions : 0;

      // Calculate cash flow
      const totalDeposits = deposits.reduce(
        (sum, deposit) => sum + deposit.amount,
        0,
      );
      const totalWithdrawals = withdrawals.reduce(
        (sum, withdrawal) => sum + withdrawal.amount,
        0,
      );
      const cooperativeSavings = cooperative.reduce(
        (sum, saving) => sum + saving.contribution_amount,
        0,
      );
      const cashFlow = totalDeposits - totalWithdrawals;

      // Top expense categories
      const expensesByCategory = expenses.reduce(
        (acc, expense) => {
          acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
          return acc;
        },
        {} as Record<string, number>,
      );

      const topExpenseCategories = Object.entries(expensesByCategory)
        .map(([category, amount]) => ({
          category,
          amount,
          percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

      // Top selling items
      const itemsSales = orders.reduce(
        (acc, order) => {
          if (!acc[order.item_name]) {
            acc[order.item_name] = { quantity: 0, revenue: 0 };
          }
          acc[order.item_name].quantity += order.quantity;
          acc[order.item_name].revenue += order.total;
          return acc;
        },
        {} as Record<string, { quantity: number; revenue: number }>,
      );

      const topSellingItems = Object.entries(itemsSales)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Calculate daily averages
      const daysDiff = Math.max(
        1,
        Math.ceil(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
        ),
      );
      const dailyAverages = {
        revenue: totalRevenue / daysDiff,
        orders: totalOrders / daysDiff,
        charging: totalChargingSessions / daysDiff,
        expenses: totalExpenses / daysDiff,
      };

      // Mock growth metrics (would need historical comparison)
      const growthMetrics = {
        revenueGrowth: 12.5,
        orderGrowth: 8.3,
        profitGrowth: 15.7,
      };

      setReportData({
        period: periodLabel,
        totalRevenue,
        restaurantRevenue,
        chargingRevenue,
        totalExpenses,
        netProfit,
        profitMargin,
        totalOrders,
        totalChargingSessions,
        averageOrderValue,
        averageChargingValue,
        totalDeposits,
        totalWithdrawals,
        cooperativeSavings,
        cashFlow,
        topExpenseCategories,
        topSellingItems,
        dailyAverages,
        growthMetrics,
      });

      toast.success("Report generated successfully!");
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Failed to generate report");
    } finally {
      setGenerating(false);
    }
  };

  const exportReport = () => {
    if (!reportData) return;

    const reportContent = `
BUSINESS PERFORMANCE REPORT
${reportData.period}
Generated: ${new Date().toLocaleString()}

EXECUTIVE SUMMARY
================
Total Revenue: NRs. ${reportData.totalRevenue.toLocaleString()}
Net Profit: NRs. ${reportData.netProfit.toLocaleString()}
Profit Margin: ${reportData.profitMargin.toFixed(1)}%
Cash Flow: NRs. ${reportData.cashFlow.toLocaleString()}

REVENUE BREAKDOWN
================
Restaurant Revenue: NRs. ${reportData.restaurantRevenue.toLocaleString()} (${reportData.totalOrders} orders)
EV Charging Revenue: NRs. ${reportData.chargingRevenue.toLocaleString()} (${reportData.totalChargingSessions} sessions)
Average Order Value: NRs. ${reportData.averageOrderValue.toFixed(2)}
Average Charging Value: NRs. ${reportData.averageChargingValue.toFixed(2)}

EXPENSES
========
Total Expenses: NRs. ${reportData.totalExpenses.toLocaleString()}
Top Categories:
${reportData.topExpenseCategories.map((cat) => `- ${cat.category}: NRs. ${cat.amount.toLocaleString()} (${cat.percentage.toFixed(1)}%)`).join("\n")}

DAILY AVERAGES
==============
Daily Revenue: NRs. ${reportData.dailyAverages.revenue.toFixed(2)}
Daily Orders: ${reportData.dailyAverages.orders.toFixed(1)}
Daily Charging Sessions: ${reportData.dailyAverages.charging.toFixed(1)}
Daily Expenses: NRs. ${reportData.dailyAverages.expenses.toFixed(2)}

TOP SELLING ITEMS
================
${reportData.topSellingItems.map((item, i) => `${i + 1}. ${item.name}: ${item.quantity} sold, NRs. ${item.revenue.toLocaleString()}`).join("\n")}
    `;

    const blob = new Blob([reportContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `business-report-${reportData.period.replace(/[^a-zA-Z0-9]/g, "-")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Report exported successfully!");
  };

<<<<<<< HEAD
=======
  const generateOrderReport = async (
    dateFrom: string | null,
    dateTo: string | null,
  ) => {
    let query = supabase.from("orders").select("*").eq("user_id", user!.id);

    if (dateFrom) query = query.gte("order_date", dateFrom);
    if (dateTo) query = query.lte("order_date", dateTo);

    const { data: orders } = await query.order("order_date", {
      ascending: false,
    });

    return {
      orders: orders || [],
      summary: {
        totalOrders: orders?.length || 0,
        totalRevenue: (orders || []).reduce(
          (sum, order) => sum + order.total,
          0,
        ),
        averageOrderValue: orders?.length
          ? orders.reduce((sum, order) => sum + order.total, 0) / orders.length
          : 0,
      },
      period: { from: dateFrom, to: dateTo },
    };
  };

  const generateExpenseReport = async (
    dateFrom: string | null,
    dateTo: string | null,
  ) => {
    let query = supabase.from("expenses").select("*").eq("user_id", user!.id);

    if (dateFrom) query = query.gte("expense_date", dateFrom);
    if (dateTo) query = query.lte("expense_date", dateTo);

    const { data: expenses } = await query.order("expense_date", {
      ascending: false,
    });

    return {
      expenses: expenses || [],
      summary: {
        totalExpenses: (expenses || []).reduce(
          (sum, expense) => sum + expense.amount,
          0,
        ),
        expenseCount: expenses?.length || 0,
        categoryBreakdown: (expenses || []).reduce(
          (acc, expense) => {
            acc[expense.category] =
              (acc[expense.category] || 0) + expense.amount;
            return acc;
          },
          {} as Record<string, number>,
        ),
      },
      period: { from: dateFrom, to: dateTo },
    };
  };

  const generateChargingReport = async (
    dateFrom: string | null,
    dateTo: string | null,
  ) => {
    let query = supabase
      .from("charging_sessions")
      .select("*")
      .eq("user_id", user!.id);

    if (dateFrom) query = query.gte("session_date", dateFrom);
    if (dateTo) query = query.lte("session_date", dateTo);

    const { data: sessions } = await query.order("session_date", {
      ascending: false,
    });

    return {
      sessions: sessions || [],
      summary: {
        totalSessions: sessions?.length || 0,
        totalRevenue: (sessions || []).reduce(
          (sum, session) => sum + session.total_amount,
          0,
        ),
        totalEnergyConsumed: (sessions || []).reduce(
          (sum, session) => sum + session.kcal,
          0,
        ),
      },
      period: { from: dateFrom, to: dateTo },
    };
  };

  const generateCompleteReport = async (
    dateFrom: string | null,
    dateTo: string | null,
  ) => {
    const [financial, orders, expenseReport, charging] = await Promise.all([
      generateFinancialSummary(dateFrom, dateTo),
      generateOrderReport(dateFrom, dateTo),
      generateExpenseReport(dateFrom, dateTo),
      generateChargingReport(dateFrom, dateTo),
    ]);

    return {
      financial,
      orders,
      expenses: expenseReport.expenses,
      charging,
      period: { from: dateFrom, to: dateTo },
      generatedAt: new Date().toISOString(),
    };
  };

  const addStaticExpense = async () => {
    if (
      !user ||
      !staticExpenseForm.description ||
      !staticExpenseForm.amount ||
      !staticExpenseForm.category
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const { error } = await supabase.from("static_expenses").insert({
        user_id: user.id,
        description: staticExpenseForm.description,
        amount: parseFloat(staticExpenseForm.amount),
        category: staticExpenseForm.category,
        is_recurring: staticExpenseForm.isRecurring,
      });

      if (error) throw error;

      toast.success("Static expense added successfully!");
      setShowStaticExpenseDialog(false);
      setStaticExpenseForm({
        description: "",
        amount: "",
        category: "",
        isRecurring: false,
      });
      fetchStaticExpenses();
    } catch (error) {
      console.error("Error adding static expense:", error);
      toast.error("Failed to add static expense");
    }
  };

  const deleteStaticExpense = async (id: string) => {
    try {
      const { error } = await supabase
        .from("static_expenses")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Static expense deleted successfully!");
      fetchStaticExpenses();
    } catch (error) {
      console.error("Error deleting static expense:", error);
      toast.error("Failed to delete static expense");
    }
  };

  const downloadReport = (report: ReportData) => {
    const doc = new jsPDF() as jsPDFWithAutoTable;
    const reportData = report.report_data;
    let tableColumn: string[] = [];
    let tableRows: any[][] = [];

    switch (report.report_type) {
      case "Order Report":
        tableColumn = Object.keys(reportData.orders[0]);
        tableRows = reportData.orders.map((obj: any) => Object.values(obj));
        break;
      case "Expense Report":
        tableColumn = Object.keys(reportData.expenses[0]);
        tableRows = reportData.expenses.map((obj: any) => Object.values(obj));
        break;
      case "Charging Report":
        tableColumn = Object.keys(reportData.sessions[0]);
        tableRows = reportData.sessions.map((obj: any) => Object.values(obj));
        break;
      case "Financial Summary":
        tableColumn = ["Metric", "Value"];
        tableRows = Object.entries(reportData.summary).map(([key, value]) => [
          key,
          JSON.stringify(value),
        ]);
        break;
      case "Complete Business Report":
        // For complete business report, we can export a summary
        tableColumn = ["Metric", "Value"];
        tableRows = Object.entries(reportData.financial.summary).map(
          ([key, value]) => [key, JSON.stringify(value)],
        );
        break;
      default:
        toast.error("Export not implemented for this report type");
        return;
    }

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
    });
    doc.save(`${report.report_type}.pdf`);
  };

  const deleteReport = async (id: string) => {
    try {
      const { error } = await supabase.from("reports").delete().eq("id", id);

      if (error) throw error;

      toast.success("Report deleted successfully!");
      fetchReports();
    } catch (error) {
      console.error("Error deleting report:", error);
      toast.error("Failed to delete report");
    }
  };

  const totalStaticExpenses = staticExpenses.reduce(
    (sum, expense) => sum + expense.amount,
    0,
  );

>>>>>>> origin/main
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-primary rounded-xl">
          <FileText className="h-6 w-6 text-black" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-black">Business Reports</h1>
          <p className="text-gray-600">
            Generate comprehensive business performance reports
          </p>
        </div>
      </div>

      {/* Report Configuration */}
      <Card className="border border-gray-200">
        <CardHeader className="bg-brand-50 border-b border-gray-200">
          <CardTitle className="flex items-center gap-3 text-black">
            <div className="p-2 bg-primary rounded-lg">
              <Filter className="h-5 w-5 text-black" />
            </div>
            Report Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-black">
                Report Type
              </label>
              <Select
                value={reportType}
                onValueChange={(value: any) => setReportType(value)}
              >
                <SelectTrigger className="focus:ring-primary focus:border-primary">
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly Report</SelectItem>
                  <SelectItem value="monthly">Monthly Report</SelectItem>
                  <SelectItem value="quarterly">Quarterly Report</SelectItem>
                  <SelectItem value="custom">Custom Date Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {reportType === "custom" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-black">
                  Date Range
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !range && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {range?.from ? (
                        range.to ? (
                          <>
                            {format(range.from, "LLL dd, y")} -{" "}
                            {format(range.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(range.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Pick a date range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={range?.from}
                      selected={range}
                      onSelect={setRange}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-black">Actions</label>
              <div className="flex gap-2">
                <Button
                  onClick={generateReport}
                  disabled={generating}
                  className="flex-1 bg-primary hover:bg-brand-400 text-black"
                >
                  {generating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Generate Report
                    </>
                  )}
                </Button>
<<<<<<< HEAD
                {reportData && (
=======
              </CardContent>
            </Card>
          </TabsContent>

          {/* View Reports Tab */}
          <TabsContent value="view">
            <Card className="bg-gradient-to-br from-white/90 to-blue-50/90 backdrop-blur-sm border-0 shadow-2xl">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Eye className="h-6 w-6" />
                  </div>
                  Generated Reports
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="text-center py-10">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full animate-spin mx-auto flex items-center justify-center mb-4">
                      <FileText className="h-8 w-8 text-white" />
                    </div>
                    <p className="text-gray-600">Loading reports...</p>
                  </div>
                ) : reports.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-xl font-semibold text-gray-700 mb-2">
                      No reports generated yet
                    </p>
                    <p className="text-gray-500">
                      Create your first report to see it here.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gradient-to-r from-gray-50 to-blue-50">
                          <TableHead className="font-semibold text-gray-700">
                            Report Type
                          </TableHead>
                          <TableHead className="font-semibold text-gray-700">
                            Date Range
                          </TableHead>
                          <TableHead className="font-semibold text-gray-700">
                            Generated
                          </TableHead>
                          <TableHead className="font-semibold text-gray-700">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reports.map((report, index) => (
                          <TableRow
                            key={report.id}
                            className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200"
                            style={{ animationDelay: `${index * 50}ms` }}
                          >
                            <TableCell>
                              <Badge
                                className={`bg-gradient-to-r ${reportTypeColors[report.report_type as keyof typeof reportTypeColors] || "from-gray-500 to-slate-500"} text-white border-0`}
                              >
                                {report.report_type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {report.date_range_start &&
                              report.date_range_end ? (
                                <>
                                  {format(
                                    new Date(report.date_range_start),
                                    "MMM dd",
                                  )}{" "}
                                  -{" "}
                                  {format(
                                    new Date(report.date_range_end),
                                    "MMM dd, yyyy",
                                  )}
                                </>
                              ) : report.date_range_start ? (
                                <>
                                  From{" "}
                                  {format(
                                    new Date(report.date_range_start),
                                    "MMM dd, yyyy",
                                  )}
                                </>
                              ) : report.date_range_end ? (
                                <>
                                  Until{" "}
                                  {format(
                                    new Date(report.date_range_end),
                                    "MMM dd, yyyy",
                                  )}
                                </>
                              ) : (
                                "All time"
                              )}
                            </TableCell>
                            <TableCell className="text-sm">
                              {format(
                                new Date(report.created_at),
                                "MMM dd, yyyy HH:mm",
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="hover:bg-blue-50 hover:border-blue-300"
                                  onClick={() => {
                                    setSelectedReport(report);
                                    setIsReportDialogOpen(true);
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="hover:bg-green-50 hover:border-green-300"
                                  onClick={() => downloadReport(report)}
                                >
                                  <Download className="h-4 w-4 mr-1" />
                                  Export
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="hover:bg-red-50 hover:border-red-300 text-red-600"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>
                                        Delete Report
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete this
                                        report? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>
                                        Cancel
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteReport(report.id)}
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
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

          {/* Static Expenses Tab */}
          <TabsContent value="static">
            <Card className="bg-gradient-to-br from-white/90 to-indigo-50/90 backdrop-blur-sm border-0 shadow-2xl">
              <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xl">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <Settings className="h-6 w-6" />
                    </div>
                    Static Expenses Management
                  </div>
>>>>>>> origin/main
                  <Button
                    onClick={exportReport}
                    variant="outline"
                    className="hover:bg-brand-50"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {reportData && (
        <>
          {/* Report Summary */}
          <Card className="border border-gray-200">
            <CardHeader className="bg-brand-50 border-b border-gray-200">
              <CardTitle className="flex items-center justify-between text-black">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary rounded-lg">
                    <Target className="h-5 w-5 text-black" />
                  </div>
                  Executive Summary - {reportData.period}
                </div>
                <Badge
                  variant="outline"
                  className="border-primary text-primary"
                >
                  Generated {new Date().toLocaleDateString()}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <DollarSign className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                  <p className="text-2xl font-bold text-black">
                    NRs. {reportData.totalRevenue.toLocaleString()}
                  </p>
                  <div className="flex items-center justify-center mt-2">
                    <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                    <span className="text-sm text-green-600">
                      +{reportData.growthMetrics.revenueGrowth}%
                    </span>
                  </div>
                </div>

                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <Target className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <p className="text-sm text-gray-600 mb-1">Net Profit</p>
                  <p
                    className={`text-2xl font-bold ${reportData.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    NRs. {reportData.netProfit.toLocaleString()}
                  </p>
                  <div className="flex items-center justify-center mt-2">
                    <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                    <span className="text-sm text-green-600">
                      +{reportData.growthMetrics.profitGrowth}%
                    </span>
                  </div>
                </div>

                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <ShoppingCart className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                  <p className="text-sm text-gray-600 mb-1">Total Orders</p>
                  <p className="text-2xl font-bold text-black">
                    {reportData.totalOrders.toLocaleString()}
                  </p>
                  <div className="flex items-center justify-center mt-2">
                    <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                    <span className="text-sm text-green-600">
                      +{reportData.growthMetrics.orderGrowth}%
                    </span>
                  </div>
                </div>

                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <PiggyBank className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                  <p className="text-sm text-gray-600 mb-1">Profit Margin</p>
                  <p className="text-2xl font-bold text-black">
                    {reportData.profitMargin.toFixed(1)}%
                  </p>
                  <div className="flex items-center justify-center mt-2">
                    {reportData.profitMargin >= 0 ? (
                      <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600 mr-1" />
                    )}
                    <span
                      className={`text-sm ${reportData.profitMargin >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {reportData.profitMargin >= 0 ? "Profitable" : "Loss"}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Revenue Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="border border-gray-200">
              <CardHeader className="bg-brand-50 border-b border-gray-200">
                <CardTitle className="flex items-center gap-3 text-black">
                  <div className="p-2 bg-primary rounded-lg">
                    <DollarSign className="h-5 w-5 text-black" />
                  </div>
                  Revenue Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <ShoppingCart className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-black">
                            Restaurant Orders
                          </p>
                          <p className="text-sm text-gray-600">
                            {reportData.totalOrders} orders
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-black">
                          NRs. {reportData.restaurantRevenue.toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-600">
                          {(
                            (reportData.restaurantRevenue /
                              reportData.totalRevenue) *
                            100
                          ).toFixed(1)}
                          %
                        </p>
                      </div>
                    </div>
                    <Progress
                      value={
                        (reportData.restaurantRevenue /
                          reportData.totalRevenue) *
                        100
                      }
                      className="h-3"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-100 rounded-lg">
                          <Zap className="h-5 w-5 text-yellow-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-black">
                            EV Charging
                          </p>
                          <p className="text-sm text-gray-600">
                            {reportData.totalChargingSessions} sessions
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-black">
                          NRs. {reportData.chargingRevenue.toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-600">
                          {(
                            (reportData.chargingRevenue /
                              reportData.totalRevenue) *
                            100
                          ).toFixed(1)}
                          %
                        </p>
                      </div>
                    </div>
                    <Progress
                      value={
                        (reportData.chargingRevenue / reportData.totalRevenue) *
                        100
                      }
                      className="h-3"
                    />
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-600">Avg Order Value</p>
                        <p className="font-bold text-black">
                          NRs. {reportData.averageOrderValue.toFixed(0)}
                        </p>
                      </div>
                      <div className="text-center bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-600">
                          Avg Charging Value
                        </p>
                        <p className="font-bold text-black">
                          NRs. {reportData.averageChargingValue.toFixed(0)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-200">
              <CardHeader className="bg-brand-50 border-b border-gray-200">
                <CardTitle className="flex items-center gap-3 text-black">
                  <div className="p-2 bg-primary rounded-lg">
                    <Receipt className="h-5 w-5 text-black" />
                  </div>
                  Top Expense Categories
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {reportData.topExpenseCategories.length === 0 ? (
                  <div className="text-center py-8">
                    <Receipt className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">No expenses in this period</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reportData.topExpenseCategories.map((category, index) => (
                      <div key={category.category} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-black text-xs font-bold">
                              {index + 1}
                            </div>
                            <span className="font-medium text-black">
                              {category.category}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-black">
                              NRs. {category.amount.toLocaleString()}
                            </p>
                            <p className="text-sm text-gray-600">
                              {category.percentage.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                        <Progress value={category.percentage} className="h-2" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Daily Averages and Top Items */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="border border-gray-200">
              <CardHeader className="bg-brand-50 border-b border-gray-200">
                <CardTitle className="flex items-center gap-3 text-black">
                  <div className="p-2 bg-primary rounded-lg">
                    <Clock className="h-5 w-5 text-black" />
                  </div>
                  Daily Averages
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center bg-gray-50 p-4 rounded-lg">
                    <DollarSign className="h-6 w-6 mx-auto mb-2 text-green-600" />
                    <p className="text-sm text-gray-600 mb-1">Daily Revenue</p>
                    <p className="text-xl font-bold text-black">
                      NRs. {reportData.dailyAverages.revenue.toFixed(0)}
                    </p>
                  </div>
                  <div className="text-center bg-gray-50 p-4 rounded-lg">
                    <ShoppingCart className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                    <p className="text-sm text-gray-600 mb-1">Daily Orders</p>
                    <p className="text-xl font-bold text-black">
                      {reportData.dailyAverages.orders.toFixed(1)}
                    </p>
                  </div>
                  <div className="text-center bg-gray-50 p-4 rounded-lg">
                    <Zap className="h-6 w-6 mx-auto mb-2 text-yellow-600" />
                    <p className="text-sm text-gray-600 mb-1">Daily Charging</p>
                    <p className="text-xl font-bold text-black">
                      {reportData.dailyAverages.charging.toFixed(1)}
                    </p>
                  </div>
                  <div className="text-center bg-gray-50 p-4 rounded-lg">
                    <Receipt className="h-6 w-6 mx-auto mb-2 text-red-600" />
                    <p className="text-sm text-gray-600 mb-1">Daily Expenses</p>
                    <p className="text-xl font-bold text-black">
                      NRs. {reportData.dailyAverages.expenses.toFixed(0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-gray-200">
              <CardHeader className="bg-brand-50 border-b border-gray-200">
                <CardTitle className="flex items-center gap-3 text-black">
                  <div className="p-2 bg-primary rounded-lg">
                    <TrendingUp className="h-5 w-5 text-black" />
                  </div>
                  Top Selling Items
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {reportData.topSellingItems.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">No orders in this period</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reportData.topSellingItems.map((item, index) => (
                      <div
                        key={item.name}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-black text-xs font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-black">
                              {item.name}
                            </p>
                            <p className="text-sm text-gray-600">
                              {item.quantity} sold
                            </p>
                          </div>
                        </div>
                        <p className="font-bold text-black">
                          NRs. {item.revenue.toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Cash Flow Summary */}
          <Card className="border border-gray-200">
            <CardHeader className="bg-brand-50 border-b border-gray-200">
              <CardTitle className="flex items-center gap-3 text-black">
                <div className="p-2 bg-primary rounded-lg">
                  <PiggyBank className="h-5 w-5 text-black" />
                </div>
                Cash Flow Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-green-700 mb-1">Total Deposits</p>
                  <p className="text-2xl font-bold text-green-700">
                    +NRs. {reportData.totalDeposits.toLocaleString()}
                  </p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-sm text-red-700 mb-1">Total Withdrawals</p>
                  <p className="text-2xl font-bold text-red-700">
                    -NRs. {reportData.totalWithdrawals.toLocaleString()}
                  </p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-700 mb-1">
                    Cooperative Savings
                  </p>
                  <p className="text-2xl font-bold text-blue-700">
                    NRs. {reportData.cooperativeSavings.toLocaleString()}
                  </p>
                </div>
                <div className="text-center p-4 bg-brand-50 rounded-lg border border-primary">
                  <p className="text-sm text-black mb-1">Net Cash Flow</p>
                  <p
                    className={`text-2xl font-bold ${reportData.cashFlow >= 0 ? "text-green-700" : "text-red-700"}`}
                  >
                    {reportData.cashFlow >= 0 ? "+" : ""}NRs.{" "}
                    {reportData.cashFlow.toLocaleString()}
                  </p>
                </div>
              </div>
<<<<<<< HEAD
            </CardContent>
          </Card>
        </>
      )}
=======
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isRecurring"
                  checked={staticExpenseForm.isRecurring}
                  onChange={(e) =>
                    setStaticExpenseForm({
                      ...staticExpenseForm,
                      isRecurring: e.target.checked,
                    })
                  }
                  className="rounded border-gray-300"
                />
                <Label htmlFor="isRecurring">Recurring expense</Label>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowStaticExpenseDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={addStaticExpense}
                className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
              >
                Add Expense
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedReport?.report_type}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedReport && (
              <pre>{JSON.stringify(selectedReport.report_data, null, 2)}</pre>
            )}
          </div>
        </DialogContent>
      </Dialog>
>>>>>>> origin/main
    </div>
  );
};

export default ReportsTab;
