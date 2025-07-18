import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  FileText,
  Download,
  Calendar as CalendarIcon,
  Filter,
  Plus,
  Trash2,
  Eye,
  AlertTriangle,
  List,
  Sparkles,
  BarChart3,
  TrendingUp,
  Clock,
  Archive,
  Settings,
} from "lucide-react";
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
import BalanceSheetTab from "./BalanceSheetTab";

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: UserOptions) => jsPDF;
}

interface ReportData {
  id: string;
  report_type: string;
  report_data: any;
  date_range_start: string | null;
  date_range_end: string | null;
  created_at: string;
}


interface StaticExpense {
  id: string;
  description: string;
  amount: number;
  category: string;
  is_recurring: boolean;
  created_at: string;
}

const ReportsTab = () => {
  const { user } = useAuth();
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
    "Balance Sheet",
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
    "Balance Sheet": "from-pink-500 to-rose-500",
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

  const generateReport = async () => {
    if (!user || !reportType) {
      toast.error("Please select a report type");
      return;
    }

    setGenerating(true);
    try {
      let reportData: any = {};
      const dateFrom = selectedDateFrom
        ? format(selectedDateFrom, "yyyy-MM-dd")
        : null;
      const dateTo = selectedDateTo
        ? format(selectedDateTo, "yyyy-MM-dd")
        : null;

      // Generate different reports based on type
      switch (reportType) {
        case "Financial Summary":
          reportData = await generateFinancialSummary(dateFrom, dateTo);
          break;
        case "Order Report":
          reportData = await generateOrderReport(dateFrom, dateTo);
          break;
        case "Expense Report":
          reportData = await generateExpenseReport(dateFrom, dateTo);
          break;
        case "Charging Report":
          reportData = await generateChargingReport(dateFrom, dateTo);
          break;
        case "Complete Business Report":
          reportData = await generateCompleteReport(dateFrom, dateTo);
          break;
        case "Balance Sheet":
          await supabase.rpc("generate_balance_sheet", {
            user_id_param: user.id,
            date_from: dateFrom,
            date_to: dateTo,
          });
          toast.success("Balance Sheet generated successfully! 📊");
          fetchReports();
          return;
        default:
          toast.error("Report type not implemented yet");
          return;
      }

      // Save report to database
      const { error } = await supabase.from("reports").insert({
        user_id: user.id,
        report_type: reportType,
        report_data: reportData,
        date_range_start: dateFrom,
        date_range_end: dateTo,
      });

      if (error) throw error;

      toast.success(`${reportType} generated successfully! 📊`);
      fetchReports();

      // Reset form
      setReportType("");
      setSelectedDateFrom(undefined);
      setSelectedDateTo(undefined);
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Failed to generate report");
    } finally {
      setGenerating(false);
    }
  };

  const generateFinancialSummary = async (
    dateFrom: string | null,
    dateTo: string | null,
  ) => {
    // Fetch all financial data within date range
    let ordersQuery = supabase
      .from("orders")
      .select("*")
      .eq("user_id", user!.id);
    let expensesQuery = supabase
      .from("expenses")
      .select("*")
      .eq("user_id", user!.id);
    let depositsQuery = supabase
      .from("deposits")
      .select("*")
      .eq("user_id", user!.id);
    let withdrawalsQuery = supabase
      .from("withdrawals")
      .select("*")
      .eq("user_id", user!.id);

    if (dateFrom) {
      ordersQuery = ordersQuery.gte("order_date", dateFrom);
      expensesQuery = expensesQuery.gte("expense_date", dateFrom);
      depositsQuery = depositsQuery.gte("deposit_date", dateFrom);
      withdrawalsQuery = withdrawalsQuery.gte("withdrawal_date", dateFrom);
    }
    if (dateTo) {
      ordersQuery = ordersQuery.lte("order_date", dateTo);
      expensesQuery = expensesQuery.lte("expense_date", dateTo);
      depositsQuery = depositsQuery.lte("deposit_date", dateTo);
      withdrawalsQuery = withdrawalsQuery.lte("withdrawal_date", dateTo);
    }

    const [orders, expenses, deposits, withdrawals] = await Promise.all([
      ordersQuery,
      expensesQuery,
      depositsQuery,
      withdrawalsQuery,
    ]);

    const totalRevenue = (orders.data || []).reduce(
      (sum, order) => sum + order.total,
      0,
    );
    const totalExpenses = (expenses.data || []).reduce(
      (sum, expense) => sum + expense.amount,
      0,
    );
    const totalDeposits = (deposits.data || []).reduce(
      (sum, deposit) => sum + deposit.amount,
      0,
    );
    const totalWithdrawals = (withdrawals.data || []).reduce(
      (sum, withdrawal) => sum + withdrawal.amount,
      0,
    );

    return {
      summary: {
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
        totalDeposits,
        totalWithdrawals,
        cashFlow: totalDeposits - totalWithdrawals,
      },
      period: { from: dateFrom, to: dateTo },
      generatedAt: new Date().toISOString(),
    };
  };

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

  const executeCustomReport = async (reportId: string) => {
    try {
      const { data, error } = await supabase.rpc("execute_custom_report", {
        report_id: reportId,
      });

      if (error) throw error;

      toast.success(`Custom report executed successfully! Result: ${data}`);
    } catch (error) {
      console.error("Error executing custom report:", error);
      toast.error("Failed to execute custom report");
    }
  };

  const totalStaticExpenses = staticExpenses.reduce(
    (sum, expense) => sum + expense.amount,
    0,
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-blue-50 to-indigo-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-64 h-64 bg-gradient-to-r from-violet-400/20 to-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
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
            <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-500 to-blue-600 text-white shadow-xl animate-pulse">
              <FileText className="h-8 w-8" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Reports Generator
            </h1>
            <Sparkles className="h-8 w-8 text-blue-500 animate-bounce" />
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Generate comprehensive business reports and manage static expenses
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-violet-50 to-purple-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-violet-600 font-medium">
                    Total Reports
                  </p>
                  <p className="text-2xl font-bold text-violet-800">
                    {reports.length}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl text-white">
                  <FileText className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">
                    Static Expenses
                  </p>
                  <p className="text-2xl font-bold text-blue-800">
                    {staticExpenses.length}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl text-white">
                  <Archive className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-indigo-50 to-cyan-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-indigo-600 font-medium">
                    Monthly Static
                  </p>
                  <p className="text-2xl font-bold text-indigo-800">
                    NRs. {totalStaticExpenses.toFixed(0)}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-xl text-white">
                  <TrendingUp className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-cyan-50 to-teal-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-cyan-600 font-medium">
                    Last Generated
                  </p>
                  <p className="text-lg font-bold text-cyan-800">
                    {reports.length > 0
                      ? format(new Date(reports[0].created_at), "MMM dd")
                      : "None"}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-xl text-white">
                  <Clock className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="generate" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white/80 backdrop-blur-sm border border-violet-200">
            <TabsTrigger
              value="generate"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-blue-500 data-[state=active]:text-white"
            >
              Generate Reports
            </TabsTrigger>
            <TabsTrigger
              value="view"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white"
            >
              View Reports
            </TabsTrigger>
            <TabsTrigger
              value="custom"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white"
            >
              Custom Reports
            </TabsTrigger>
            <TabsTrigger
              value="static"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-500 data-[state=active]:text-white"
            >
              Static Expenses
            </TabsTrigger>
            <TabsTrigger
              value="balance-sheet"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-rose-500 data-[state=active]:text-white"
            >
              Balance Sheet
            </TabsTrigger>
          </TabsList>

          {/* Generate Reports Tab */}
          <TabsContent value="generate">
            <Card className="bg-gradient-to-br from-white/90 to-violet-50/90 backdrop-blur-sm border-0 shadow-2xl">
              <CardHeader className="bg-gradient-to-r from-violet-500 to-blue-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <BarChart3 className="h-6 w-6" />
                  </div>
                  Generate New Report
                  <Sparkles className="h-5 w-5 animate-pulse" />
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="reportType"
                      className="text-sm font-medium text-gray-700 flex items-center gap-2"
                    >
                      <List className="h-4 w-4 text-violet-600" />
                      Report Type *
                    </Label>
                    <Select value={reportType} onValueChange={setReportType}>
                      <SelectTrigger className="border-violet-200 focus:border-violet-500 focus:ring-violet-500 h-12">
                        <SelectValue placeholder="Select report type" />
                      </SelectTrigger>
                      <SelectContent>
                        {reportTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-3 h-3 rounded-full bg-gradient-to-r ${reportTypeColors[type as keyof typeof reportTypeColors]}`}
                              ></div>
                              {type}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-blue-600" />
                      From Date (Optional)
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start border-blue-200 focus:border-blue-500 h-12"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {selectedDateFrom
                            ? format(selectedDateFrom, "PPP")
                            : "Pick start date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={selectedDateFrom}
                          onSelect={setSelectedDateFrom}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-indigo-600" />
                      To Date (Optional)
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start border-indigo-200 focus:border-indigo-500 h-12"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {selectedDateTo
                            ? format(selectedDateTo, "PPP")
                            : "Pick end date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={selectedDateTo}
                          onSelect={setSelectedDateTo}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <Button
                  onClick={generateReport}
                  disabled={generating || !reportType}
                  className="w-full h-12 bg-gradient-to-r from-violet-500 via-blue-500 to-indigo-500 hover:from-violet-600 hover:via-blue-600 hover:to-indigo-600 text-white font-semibold shadow-lg transition-all duration-300 transform hover:scale-105"
                >
                  {generating ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      Generating Report...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Generate Report
                    </div>
                  )}
                </Button>
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
                  <Button
                    onClick={() => setShowStaticExpenseDialog(true)}
                    className="bg-white/20 hover:bg-white/30 text-white border-white/20"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Expense
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {staticExpenses.length === 0 ? (
                  <div className="text-center py-12">
                    <Settings className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-xl font-semibold text-gray-700 mb-2">
                      No static expenses yet
                    </p>
                    <p className="text-gray-500">
                      Add recurring expenses to track them in reports.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {staticExpenses.map((expense, index) => (
                      <Card
                        key={expense.id}
                        className="bg-gradient-to-r from-white to-indigo-50 border border-indigo-100 hover:shadow-lg transition-all duration-200"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-800 mb-1">
                                {expense.description}
                              </h4>
                              <p className="text-sm text-gray-500">
                                {expense.category}
                              </p>
                            </div>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Delete Static Expense
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this static
                                    expense?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() =>
                                      deleteStaticExpense(expense.id)
                                    }
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-bold text-indigo-600">
                              NRs. {expense.amount.toFixed(2)}
                            </span>
                            {expense.is_recurring && (
                              <Badge
                                variant="outline"
                                className="bg-green-50 border-green-200 text-green-700"
                              >
                                Recurring
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="balance-sheet">
            <BalanceSheetTab />
          </TabsContent>
        </Tabs>

        {/* Add Static Expense Dialog */}
        <Dialog
          open={showStaticExpenseDialog}
          onOpenChange={setShowStaticExpenseDialog}
        >
          <DialogContent className="sm:max-w-md bg-gradient-to-br from-white to-indigo-50">
            <DialogHeader>
              <DialogTitle className="text-xl bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Add Static Expense
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={staticExpenseForm.description}
                  onChange={(e) =>
                    setStaticExpenseForm({
                      ...staticExpenseForm,
                      description: e.target.value,
                    })
                  }
                  placeholder="Enter expense description"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (NRs.)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={staticExpenseForm.amount}
                  onChange={(e) =>
                    setStaticExpenseForm({
                      ...staticExpenseForm,
                      amount: e.target.value,
                    })
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={staticExpenseForm.category}
                  onValueChange={(value) =>
                    setStaticExpenseForm({
                      ...staticExpenseForm,
                      category: value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
    </div>
  );
};

export default ReportsTab;
