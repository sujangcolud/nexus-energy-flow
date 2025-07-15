<<<<<<< HEAD
import { useState, useEffect } from "react";
=======
import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
>>>>>>> origin/main
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Pie,
  PieChart,
  Cell,
  Line,
  LineChart,
  Area,
  AreaChart,
  ComposedChart,
  ResponsiveContainer,
} from "recharts";
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
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Zap,
  Receipt,
  PiggyBank,
  BarChart3,
  CalendarIcon,
  RefreshCw,
  Eye,
  Filter,
  Target,
  Activity,
  Users,
  TrendingUp as TrendingUpIcon,
} from "lucide-react";
import { toast } from "sonner";

interface ReportVisualization {
  id: string;
  title: string;
  type: "chart" | "table" | "metric";
  data: any;
  description: string;
  period: string;
  generated_at: string;
}

interface BusinessMetrics {
  dailyRevenue: Array<{
    date: string;
    restaurant: number;
    charging: number;
    total: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    revenue: number;
    expenses: number;
    profit: number;
    orders: number;
  }>;
  expenseCategories: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  topProducts: Array<{
    name: string;
    quantity: number;
    revenue: number;
    category: string;
  }>;
  hourlyPatterns: Array<{
    hour: number;
    orders: number;
    charging: number;
    revenue: number;
  }>;
  paymentMethods: Array<{
    method: string;
    amount: number;
    count: number;
    percentage: number;
  }>;
  profitabilityAnalysis: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    profitMargin: number;
    breakEvenPoint: number;
    growthRate: number;
  };
  cashFlowAnalysis: {
    totalDeposits: number;
    totalWithdrawals: number;
    cooperativeSavings: number;
    netCashFlow: number;
    burnRate: number;
    runway: number;
  };
  businessKPIs: {
    averageOrderValue: number;
    averageChargingValue: number;
    customerAcquisitionCost: number;
    customerLifetimeValue: number;
    orderFrequency: number;
    chargingUtilization: number;
  };

  // Business Correlation Data
  businessCorrelation: Array<{
    date: string;
    restaurantOrders: number;
    chargingSessions: number;
    restaurantRevenue: number;
    chargingRevenue: number;
  }>;
}

const ReportsViewTab = () => {
<<<<<<< HEAD
=======
  const [searchParams] = useSearchParams();
  const [dateRange, setDateRange] = useState({
    startDate:
      searchParams.get("startDate") || new Date().toISOString().split("T")[0],
    endDate:
      searchParams.get("endDate") || new Date().toISOString().split("T")[0],
  });
  const [reportData, setReportData] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);
>>>>>>> origin/main
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<BusinessMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<
    "7d" | "30d" | "90d" | "1y"
  >("30d");
  const [selectedView, setSelectedView] = useState<
    "overview" | "revenue" | "expenses" | "trends"
  >("overview");
  const [correlationDateRange, setCorrelationDateRange] = useState<
    DateRange | undefined
  >({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });

<<<<<<< HEAD
  const fetchBusinessMetrics = async () => {
    setLoading(true);
=======
  const formatCurrency = (amount: number) =>
    `NRs. ${typeof amount === "number" ? amount.toFixed(2) : "0.00"}`;

  const fetchReportData = async () => {
    if (!user) return;

    setIsLoading(true);
>>>>>>> origin/main
    try {
      // Calculate date range based on selected period
      const endDate = new Date();
      const startDate = new Date();

      switch (selectedPeriod) {
        case "7d":
          startDate.setDate(startDate.getDate() - 7);
          break;
        case "30d":
          startDate.setDate(startDate.getDate() - 30);
          break;
        case "90d":
          startDate.setDate(startDate.getDate() - 90);
          break;
        case "1y":
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
      }

      const startDateStr = startDate.toISOString().split("T")[0];
      const endDateStr = endDate.toISOString().split("T")[0];

      // Fetch all business data
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
<<<<<<< HEAD
          .eq("user_id", user!.id)
          .gte("order_date", startDateStr)
          .lte("order_date", endDateStr),
        supabase
          .from("charging_sessions")
          .select("*")
          .eq("user_id", user!.id)
          .gte("session_date", startDateStr)
          .lte("session_date", endDateStr),
        supabase
          .from("expenses")
          .select("*")
          .eq("user_id", user!.id)
          .gte("expense_date", startDateStr)
          .lte("expense_date", endDateStr),
        supabase
          .from("deposits")
          .select("*")
          .eq("user_id", user!.id)
          .gte("deposit_date", startDateStr)
          .lte("deposit_date", endDateStr),
        supabase
          .from("withdrawals")
          .select("*")
          .eq("user_id", user!.id)
          .gte("withdrawal_date", startDateStr)
          .lte("withdrawal_date", endDateStr),
        supabase
          .from("cooperative_savings")
          .select("*")
          .eq("user_id", user!.id)
          .gte("contribution_date", startDateStr)
          .lte("contribution_date", endDateStr),
=======
          .gte("order_date", startDate)
          .lte("order_date", endDate)
          .eq("user_id", user.id)
          .order("order_date", { ascending: true }),
        supabase
          .from("charging_sessions")
          .select("*")
          .gte("session_date", startDate)
          .lte("session_date", endDate)
          .eq("user_id", user.id)
          .order("session_date", { ascending: true }),
        supabase
          .from("expenses")
          .select("*")
          .gte("expense_date", startDate)
          .lte("expense_date", endDate)
          .eq("user_id", user.id)
          .order("expense_date", { ascending: true }),
        supabase
          .from("cooperative_savings")
          .select("*")
          .gte("contribution_date", startDate)
          .lte("contribution_date", endDate)
          .eq("user_id", user.id)
          .order("contribution_date", { ascending: true }),
        supabase
          .from("deposits")
          .select("*")
          .gte("deposit_date", startDate)
          .lte("deposit_date", endDate)
          .eq("user_id", user.id)
          .order("deposit_date", { ascending: true }),
        supabase
          .from("withdrawals")
          .select("*")
          .gte("withdrawal_date", startDate)
          .lte("withdrawal_date", endDate)
          .eq("user_id", user.id)
          .order("withdrawal_date", { ascending: true }),
>>>>>>> origin/main
      ]);

      const orders = ordersData.data || [];
      const chargingSessions = chargingData.data || [];
      const expenses = expensesData.data || [];
      const deposits = depositsData.data || [];
      const withdrawals = withdrawalsData.data || [];
      const cooperative = cooperativeData.data || [];

      // Process daily revenue trends
      const dailyRevenue = [];
      const daysDiff = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      for (let i = 0; i < daysDiff; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split("T")[0];

        const dayOrders = orders.filter(
          (order) => order.order_date === dateStr,
        );
        const dayCharging = chargingSessions.filter(
          (session) => session.session_date === dateStr,
        );

        const restaurantRevenue = dayOrders.reduce(
          (sum, order) => sum + order.total,
          0,
        );
        const chargingRevenue = dayCharging.reduce(
          (sum, session) => sum + session.total_amount,
          0,
        );

        dailyRevenue.push({
          date: dateStr,
          restaurant: restaurantRevenue,
          charging: chargingRevenue,
          total: restaurantRevenue + chargingRevenue,
        });
      }

      // Process monthly trends
      const monthlyData = new Map();

      [...orders, ...chargingSessions].forEach((item) => {
        const date = item.order_date || item.session_date;
        const month = date.substring(0, 7); // YYYY-MM
        if (!monthlyData.has(month)) {
          monthlyData.set(month, { revenue: 0, orders: 0 });
        }
        monthlyData.get(month).revenue += item.total || item.total_amount;
        monthlyData.get(month).orders += 1;
      });

      expenses.forEach((expense) => {
        const month = expense.expense_date.substring(0, 7);
        if (!monthlyData.has(month)) {
          monthlyData.set(month, { revenue: 0, orders: 0 });
        }
        if (!monthlyData.get(month).expenses) {
          monthlyData.get(month).expenses = 0;
        }
        monthlyData.get(month).expenses += expense.amount;
      });

      const monthlyTrends = Array.from(monthlyData.entries())
        .map(([month, data]) => ({
          month,
          revenue: data.revenue,
          expenses: data.expenses || 0,
          profit: data.revenue - (data.expenses || 0),
          orders: data.orders,
        }))
        .sort((a, b) => a.month.localeCompare(b.month));

      // Process expense categories
      const expensesByCategory = expenses.reduce(
        (acc, expense) => {
          acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
          return acc;
        },
        {} as Record<string, number>,
      );

      const totalExpenses = expenses.reduce(
        (sum, expense) => sum + expense.amount,
        0,
      );
      const expenseCategories = Object.entries(expensesByCategory).map(
        ([category, amount]) => ({
          category,
          amount,
          percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
        }),
      );

      // Process top products
      const productSales = orders.reduce(
        (acc, order) => {
          if (!acc[order.item_name]) {
            acc[order.item_name] = {
              quantity: 0,
              revenue: 0,
              category: "Food",
            };
          }
          acc[order.item_name].quantity += order.quantity;
          acc[order.item_name].revenue += order.total;
          return acc;
        },
        {} as Record<
          string,
          { quantity: number; revenue: number; category: string }
        >,
      );

      const topProducts = Object.entries(productSales)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      // Process payment methods
      const paymentData = new Map();

      [
        ...orders,
        ...chargingSessions,
        ...expenses,
        ...deposits,
        ...withdrawals,
      ].forEach((item) => {
        const method = item.payment_mode || item.mode || "Unknown";
        const amount = item.total || item.total_amount || item.amount;
        if (!paymentData.has(method)) {
          paymentData.set(method, { amount: 0, count: 0 });
        }
        paymentData.get(method).amount += amount;
        paymentData.get(method).count += 1;
      });

      const totalPaymentAmount = Array.from(paymentData.values()).reduce(
        (sum, data) => sum + data.amount,
        0,
      );
      const paymentMethods = Array.from(paymentData.entries()).map(
        ([method, data]) => ({
          method,
          amount: data.amount,
          count: data.count,
          percentage:
            totalPaymentAmount > 0
              ? (data.amount / totalPaymentAmount) * 100
              : 0,
        }),
      );

      // Calculate business metrics
      const totalRevenue =
        orders.reduce((sum, order) => sum + order.total, 0) +
        chargingSessions.reduce(
          (sum, session) => sum + session.total_amount,
          0,
        );
      const netProfit = totalRevenue - totalExpenses;
      const profitMargin =
        totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

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
      const netCashFlow = totalDeposits - totalWithdrawals;

      // Process business correlation data
      const correlationData = [];
      const correlationStartDate =
        correlationDateRange?.from ||
        new Date(new Date().setDate(new Date().getDate() - 30));
      const correlationEndDate = correlationDateRange?.to || new Date();
      const correlationDaysDiff = Math.ceil(
        (correlationEndDate.getTime() - correlationStartDate.getTime()) /
          (1000 * 60 * 60 * 24),
      );

      for (let i = 0; i < correlationDaysDiff; i++) {
        const date = new Date(correlationStartDate);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split("T")[0];

        const dayOrders = orders.filter(
          (order) => order.order_date === dateStr,
        );
        const dayCharging = chargingSessions.filter(
          (session) => session.session_date === dateStr,
        );

        correlationData.push({
          date: dateStr,
          restaurantOrders: dayOrders.length,
          chargingSessions: dayCharging.length,
          restaurantRevenue: dayOrders.reduce(
            (sum, order) => sum + order.total,
            0,
          ),
          chargingRevenue: dayCharging.reduce(
            (sum, session) => sum + session.total_amount,
            0,
          ),
        });
      }

      const businessMetrics: BusinessMetrics = {
        dailyRevenue,
        monthlyTrends,
        expenseCategories,
        topProducts,
        hourlyPatterns: [], // Would need hour-level data
        paymentMethods,
        businessCorrelation: correlationData,
        profitabilityAnalysis: {
          totalRevenue,
          totalExpenses,
          netProfit,
          profitMargin,
          breakEvenPoint:
            totalExpenses > 0 ? totalExpenses / (totalRevenue / daysDiff) : 0,
          growthRate: 15.2, // Would need historical comparison
        },
        cashFlowAnalysis: {
          totalDeposits,
          totalWithdrawals,
          cooperativeSavings,
          netCashFlow,
          burnRate: totalExpenses / daysDiff,
          runway:
            netCashFlow > 0 ? netCashFlow / (totalExpenses / daysDiff) : 0,
        },
        businessKPIs: {
          averageOrderValue:
            orders.length > 0 ? totalRevenue / orders.length : 0,
          averageChargingValue:
            chargingSessions.length > 0
              ? chargingSessions.reduce((sum, s) => sum + s.total_amount, 0) /
                chargingSessions.length
              : 0,
          customerAcquisitionCost: 150, // Would need marketing spend data
          customerLifetimeValue: 2500, // Would need customer retention data
          orderFrequency: orders.length / daysDiff,
          chargingUtilization: chargingSessions.length / daysDiff,
        },
      };

      setMetrics(businessMetrics);
    } catch (error) {
      console.error("Error fetching business metrics:", error);
      toast.error("Failed to load business metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
<<<<<<< HEAD
    if (user) {
      fetchBusinessMetrics();
=======
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

    return days
      .map((day) => {
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

  const grandTotal = dailyBreakdown.reduce(
    (acc, day) => {
      acc.revenue += day.revenue;
      acc.expenses += day.expenses;
      acc.profit += day.profit;
      acc.deposits += day.deposits;
      acc.withdrawals += day.withdrawals;
      acc.cashFlow += day.cashFlow;
      acc.transactions += day.transactions;
      return acc;
    },
    {
      revenue: 0,
      expenses: 0,
      profit: 0,
      deposits: 0,
      withdrawals: 0,
      cashFlow: 0,
      transactions: 0,
    },
  );

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
    const totalExpenses = dayExpenses.reduce(
      (sum: number, expense: any) => sum + expense.amount,
      0,
    );

    setSelectedDayData({
      ...dayData,
      orders: dayOrders,
      charging: dayCharging,
      expenses: dayExpenses,
      totalExpenses,
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
>>>>>>> origin/main
    }
  }, [user, selectedPeriod]);

  const exportData = () => {
    if (!metrics) return;

    const data = {
      exportDate: new Date().toISOString(),
      period: selectedPeriod,
      metrics,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `business-metrics-${selectedPeriod}-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Data exported successfully!");
  };

  const COLORS = [
    "#3b82f6", // Blue
    "#10b981", // Green
    "#f59e0b", // Amber
    "#ef4444", // Red
    "#8b5cf6", // Purple
    "#06b6d4", // Cyan
    "#84cc16", // Lime
    "#f97316", // Orange
    "#ec4899", // Pink
    "#bbfae1", // Brand color
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <RefreshCw className="h-16 w-16 text-primary mx-auto mb-4 animate-spin" />
          <p className="text-xl font-semibold text-black">
            Loading Business Insights...
          </p>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-16">
        <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No metrics data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-primary rounded-xl">
          <Eye className="h-6 w-6 text-black" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-black">Analytics Dashboard</h1>
          <p className="text-gray-600">
            Comprehensive business insights and visualizations
          </p>
        </div>
      </div>

      {/* Controls */}
      <Card className="border border-gray-200">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-600" />
              <Select
                value={selectedPeriod}
                onValueChange={(value: any) => setSelectedPeriod(value)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="90d">Last 3 Months</SelectItem>
                  <SelectItem value="1y">Last Year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-600" />
              <Select
                value={selectedView}
                onValueChange={(value: any) => setSelectedView(value)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overview">Overview</SelectItem>
                  <SelectItem value="revenue">Revenue</SelectItem>
                  <SelectItem value="expenses">Expenses</SelectItem>
                  <SelectItem value="trends">Trends</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={exportData} variant="outline" className="ml-auto">
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  Total Revenue
                </p>
                <p className="text-2xl font-bold text-black">
                  NRs.{" "}
                  {metrics.profitabilityAnalysis.totalRevenue.toLocaleString()}
                </p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                  <span className="text-sm text-green-600">
                    +{metrics.profitabilityAnalysis.growthRate}%
                  </span>
                </div>
              </div>
              <div className="p-3 bg-brand-100 rounded-xl">
                <DollarSign className="h-6 w-6 text-black" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Net Profit</p>
                <p
                  className={`text-2xl font-bold ${metrics.profitabilityAnalysis.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  NRs.{" "}
                  {metrics.profitabilityAnalysis.netProfit.toLocaleString()}
                </p>
                <div className="flex items-center mt-2">
                  <Target className="h-4 w-4 text-primary mr-1" />
                  <span className="text-sm text-gray-600">
                    {metrics.profitabilityAnalysis.profitMargin.toFixed(1)}%
                    margin
                  </span>
                </div>
              </div>
              <div className="p-3 bg-brand-100 rounded-xl">
                <Target className="h-6 w-6 text-black" />
              </div>
            </div>
          </CardContent>
        </Card>

<<<<<<< HEAD
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  Avg Order Value
                </p>
                <p className="text-2xl font-bold text-black">
                  NRs. {metrics.businessKPIs.averageOrderValue.toFixed(0)}
                </p>
                <div className="flex items-center mt-2">
                  <ShoppingCart className="h-4 w-4 text-primary mr-1" />
                  <span className="text-sm text-gray-600">
                    {metrics.businessKPIs.orderFrequency.toFixed(1)}/day
                  </span>
                </div>
              </div>
              <div className="p-3 bg-brand-100 rounded-xl">
                <ShoppingCart className="h-6 w-6 text-black" />
              </div>
            </div>
          </CardContent>
        </Card>
=======
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
                        <TableRow className="bg-gradient-to-r from-gray-100 to-blue-100 font-bold">
                          <TableCell>Grand Total</TableCell>
                          <TableCell>
                            {formatCurrency(grandTotal.revenue)}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(grandTotal.expenses)}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(grandTotal.profit)}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(grandTotal.cashFlow)}
                          </TableCell>
                          <TableCell>{grandTotal.transactions}</TableCell>
                          <TableCell />
                        </TableRow>
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
>>>>>>> origin/main

        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Cash Flow</p>
                <p
                  className={`text-2xl font-bold ${metrics.cashFlowAnalysis.netCashFlow >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  NRs. {metrics.cashFlowAnalysis.netCashFlow.toLocaleString()}
                </p>
                <div className="flex items-center mt-2">
                  <PiggyBank className="h-4 w-4 text-primary mr-1" />
                  <span className="text-sm text-gray-600">
                    {metrics.cashFlowAnalysis.runway.toFixed(0)} days runway
                  </span>
                </div>
              </div>
              <div className="p-3 bg-brand-100 rounded-xl">
                <PiggyBank className="h-6 w-6 text-black" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Business Correlation Analytics */}
      <Card className="border border-gray-200">
        <CardHeader className="bg-brand-50 border-b border-gray-200">
          <CardTitle className="flex items-center gap-3 text-black">
            <div className="p-2 bg-primary rounded-lg">
              <BarChart3 className="h-5 w-5 text-black" />
            </div>
            Business Correlation Analytics
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {/* Date Range Selector */}
          <div className="mb-6">
            <label className="text-sm font-medium text-black mb-2 block">
              Date Range for Correlation Analysis
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-80 justify-start text-left font-normal",
                    !correlationDateRange && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {correlationDateRange?.from ? (
                    correlationDateRange.to ? (
                      <>
                        {format(correlationDateRange.from, "LLL dd, y")} -{" "}
                        {format(correlationDateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(correlationDateRange.from, "LLL dd, y")
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
                  defaultMonth={correlationDateRange?.from}
                  selected={correlationDateRange}
                  onSelect={setCorrelationDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Correlation Line Chart */}
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-black mb-4">
              Restaurant Orders vs Charging Sessions Correlation
            </h4>
            <ChartContainer
              config={{
                restaurantOrders: {
                  label: "Restaurant Orders",
                  color: "#10b981",
                },
                chargingSessions: {
                  label: "Charging Sessions",
                  color: "#3b82f6",
                },
                restaurantRevenue: {
                  label: "Restaurant Revenue",
                  color: "#84cc16",
                },
                chargingRevenue: {
                  label: "Charging Revenue",
                  color: "#f59e0b",
                },
              }}
              className="h-80"
            >
              <ComposedChart data={metrics.businessCorrelation}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) =>
                    new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }
                />
                <YAxis yAxisId="count" orientation="left" />
                <YAxis yAxisId="revenue" orientation="right" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line
                  yAxisId="count"
                  type="monotone"
                  dataKey="restaurantOrders"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ fill: "#10b981", r: 4 }}
                  name="Restaurant Orders"
                />
                <Line
                  yAxisId="count"
                  type="monotone"
                  dataKey="chargingSessions"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: "#3b82f6", r: 4 }}
                  name="Charging Sessions"
                />
                <Line
                  yAxisId="revenue"
                  type="monotone"
                  dataKey="restaurantRevenue"
                  stroke="#84cc16"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: "#84cc16", r: 3 }}
                  name="Restaurant Revenue"
                />
                <Line
                  yAxisId="revenue"
                  type="monotone"
                  dataKey="chargingRevenue"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: "#f59e0b", r: 3 }}
                  name="Charging Revenue"
                />
              </ComposedChart>
            </ChartContainer>
          </div>

          {/* Daily Summary Table */}
          <div>
            <h4 className="text-lg font-semibold text-black mb-4">
              Daily Business Summary
            </h4>
            <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-black">
                      Date
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-black">
                      Charging Sessions
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-black">
                      Restaurant Income
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-black">
                      Charging Revenue
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-black">
                      Total Revenue
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.businessCorrelation
                    .slice()
                    .reverse()
                    .map((day, index) => (
                      <tr
                        key={day.date}
                        className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        <td className="px-4 py-3 text-black">
                          {new Date(day.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "2-digit",
                          })}
                        </td>
                        <td className="px-4 py-3 text-right text-black font-medium">
                          {day.chargingSessions}
                        </td>
                        <td className="px-4 py-3 text-right text-black font-medium">
                          NRs. {day.restaurantRevenue.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-black font-medium">
                          NRs. {day.chargingRevenue.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-black font-bold">
                          NRs.{" "}
                          {(
                            day.restaurantRevenue + day.chargingRevenue
                          ).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Trends Chart */}
      <Card className="border border-gray-200">
        <CardHeader className="bg-brand-50 border-b border-gray-200">
          <CardTitle className="text-black">Daily Revenue Trends</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <ChartContainer
            config={{
              restaurant: { label: "Restaurant", color: "#10b981" },
              charging: { label: "EV Charging", color: "#3b82f6" },
              total: { label: "Total", color: "#8b5cf6" },
            }}
            className="h-80"
          >
            <ComposedChart data={metrics.dailyRevenue}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) =>
                  new Date(value).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                }
              />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#8b5cf6"
                fill="#8b5cf6"
                fillOpacity={0.3}
                name="Total Revenue"
              />
              <Bar dataKey="restaurant" fill="#10b981" name="Restaurant" />
              <Bar dataKey="charging" fill="#3b82f6" name="EV Charging" />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Monthly Trends */}
        <Card className="border border-gray-200">
          <CardHeader className="bg-brand-50 border-b border-gray-200">
            <CardTitle className="text-black">
              Monthly Business Trends
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ChartContainer
              config={{
                revenue: { label: "Revenue", color: "#10b981" },
                expenses: { label: "Expenses", color: "#ef4444" },
                profit: { label: "Profit", color: "#3b82f6" },
              }}
              className="h-64"
            >
              <ComposedChart data={metrics.monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
                <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
                <Line
                  type="monotone"
                  dataKey="profit"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: "#3b82f6" }}
                  name="Profit"
                />
              </ComposedChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Expense Categories */}
        <Card className="border border-gray-200">
          <CardHeader className="bg-brand-50 border-b border-gray-200">
            <CardTitle className="text-black">Expense Distribution</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ChartContainer
              config={{
                amount: { label: "Amount", color: "#8b5cf6" },
              }}
              className="h-64"
            >
              <PieChart>
                <Pie
                  data={metrics.expenseCategories}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="amount"
                  nameKey="category"
                >
                  {metrics.expenseCategories.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card className="border border-gray-200">
          <CardHeader className="bg-brand-50 border-b border-gray-200">
            <CardTitle className="text-black">
              Payment Method Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ChartContainer
              config={{
                amount: { label: "Amount", color: "#06b6d4" },
              }}
              className="h-64"
            >
              <BarChart data={metrics.paymentMethods}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="method" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="amount"
                  fill="#06b6d4"
                  name="Transaction Amount"
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card className="border border-gray-200">
          <CardHeader className="bg-brand-50 border-b border-gray-200">
            <CardTitle className="text-black">
              Top Products Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {metrics.topProducts.slice(0, 8).map((product, index) => (
                <div
                  key={product.name}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-black text-xs font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-black">{product.name}</p>
                      <p className="text-sm text-gray-600">
                        {product.quantity} sold
                      </p>
                    </div>
                  </div>
<<<<<<< HEAD
                  <div className="text-right">
                    <p className="font-bold text-black">
                      NRs. {product.revenue.toLocaleString()}
=======
                  <div className="p-3 bg-gradient-to-r from-red-50 to-pink-50 rounded-lg">
                    <p className="text-sm text-red-600 font-medium">Expenses</p>
                    <p className="text-lg font-bold text-red-800">
                      {formatCurrency(selectedDayData.totalExpenses)}
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
>>>>>>> origin/main
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {product.category}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Business Intelligence Summary */}
      <Card className="border border-gray-200">
        <CardHeader className="bg-brand-50 border-b border-gray-200">
          <CardTitle className="text-black">
            Business Intelligence Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-black">
                Profitability Metrics
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Profit Margin</span>
                  <span className="font-bold text-black">
                    {metrics.profitabilityAnalysis.profitMargin.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Break Even Point</span>
                  <span className="font-bold text-black">
                    {metrics.profitabilityAnalysis.breakEvenPoint.toFixed(0)}{" "}
                    days
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Growth Rate</span>
                  <span className="font-bold text-green-600">
                    +{metrics.profitabilityAnalysis.growthRate}%
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-black">Customer Metrics</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Customer LTV</span>
                  <span className="font-bold text-black">
                    NRs.{" "}
                    {metrics.businessKPIs.customerLifetimeValue.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Acquisition Cost</span>
                  <span className="font-bold text-black">
                    NRs.{" "}
                    {metrics.businessKPIs.customerAcquisitionCost.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Order Frequency</span>
                  <span className="font-bold text-black">
                    {metrics.businessKPIs.orderFrequency.toFixed(1)}/day
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-black">Financial Health</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Burn Rate</span>
                  <span className="font-bold text-black">
                    NRs. {metrics.cashFlowAnalysis.burnRate.toFixed(0)}/day
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Cash Runway</span>
                  <span className="font-bold text-black">
                    {metrics.cashFlowAnalysis.runway.toFixed(0)} days
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Cooperative Savings</span>
                  <span className="font-bold text-black">
                    NRs.{" "}
                    {metrics.cashFlowAnalysis.cooperativeSavings.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsViewTab;
