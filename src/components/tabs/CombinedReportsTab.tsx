import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
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
  CalendarIcon,
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
  Users,
  Eye,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import DailyEntryModal from "@/components/DailyEntryModal";

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
  dailySummary: Array<{
    date: string;
    orders: number;
    charging: number;
    restaurantRevenue: number;
    chargingRevenue: number;
    totalRevenue: number;
    expenses: number;
    deposits: number;
    withdrawals: number;
    cooperative: number;
    netFlow: number;
  }>;
}

interface User {
  id: string;
  email: string;
  full_name?: string;
}

const CombinedReportsTab = () => {
  const { user } = useAuth();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>();
  const [reportType, setReportType] = useState<
    "weekly" | "monthly" | "quarterly" | "custom"
  >("monthly");
  const [viewMode, setViewMode] = useState<"generate" | "view">("generate");
  const [selectedUser, setSelectedUser] = useState<string>(user?.id || "");
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");

  // Fetch available users (if super admin)
  const fetchUsers = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role === "super_admin") {
        const { data: users } = await supabase
          .from("user_profiles")
          .select("id, email, full_name");

        if (users) {
          setAvailableUsers(users);
        }
      } else {
        setAvailableUsers([
          {
            id: user.id,
            email: user.email!,
            full_name: user.user_metadata?.full_name,
          },
        ]);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      setAvailableUsers([
        {
          id: user.id,
          email: user.email!,
          full_name: user.user_metadata?.full_name,
        },
      ]);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUsers();
      setSelectedUser(user.id);
    }
  }, [user]);

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

      // Fetch data for the specified period and selected user
      const startDateStr = format(startDate, "yyyy-MM-dd");
      const endDateStr = format(endDate, "yyyy-MM-dd");
      const targetUserId = selectedUser || user.id;

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
          .eq("user_id", targetUserId)
          .gte("order_date", startDateStr)
          .lte("order_date", endDateStr),
        supabase
          .from("charging_sessions")
          .select("*")
          .eq("user_id", targetUserId)
          .gte("session_date", startDateStr)
          .lte("session_date", endDateStr),
        supabase
          .from("expenses")
          .select("*")
          .eq("user_id", targetUserId)
          .gte("expense_date", startDateStr)
          .lte("expense_date", endDateStr),
        supabase
          .from("deposits")
          .select("*")
          .eq("user_id", targetUserId)
          .gte("deposit_date", startDateStr)
          .lte("deposit_date", endDateStr),
        supabase
          .from("withdrawals")
          .select("*")
          .eq("user_id", targetUserId)
          .gte("withdrawal_date", startDateStr)
          .lte("withdrawal_date", endDateStr),
        supabase
          .from("cooperative_savings")
          .select("*")
          .eq("user_id", targetUserId)
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

      // Generate daily summary for view mode
      const dailySummary = [];
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
        const dayExpenses = expenses.filter(
          (expense) => expense.expense_date === dateStr,
        );
        const dayDeposits = deposits.filter(
          (deposit) => deposit.deposit_date === dateStr,
        );
        const dayWithdrawals = withdrawals.filter(
          (withdrawal) => withdrawal.withdrawal_date === dateStr,
        );
        const dayCooperative = cooperative.filter(
          (saving) => saving.contribution_date === dateStr,
        );

        const dayRestaurantRevenue = dayOrders.reduce(
          (sum, order) => sum + order.total,
          0,
        );
        const dayChargingRevenue = dayCharging.reduce(
          (sum, session) => sum + session.total_amount,
          0,
        );
        const dayExpenseTotal = dayExpenses.reduce(
          (sum, expense) => sum + expense.amount,
          0,
        );
        const dayDepositTotal = dayDeposits.reduce(
          (sum, deposit) => sum + deposit.amount,
          0,
        );
        const dayWithdrawalTotal = dayWithdrawals.reduce(
          (sum, withdrawal) => sum + withdrawal.amount,
          0,
        );
        const dayCooperativeTotal = dayCooperative.reduce(
          (sum, saving) => sum + saving.contribution_amount,
          0,
        );

        dailySummary.push({
          date: dateStr,
          orders: dayOrders.length,
          charging: dayCharging.length,
          restaurantRevenue: dayRestaurantRevenue,
          chargingRevenue: dayChargingRevenue,
          totalRevenue: dayRestaurantRevenue + dayChargingRevenue,
          expenses: dayExpenseTotal,
          deposits: dayDepositTotal,
          withdrawals: dayWithdrawalTotal,
          cooperative: dayCooperativeTotal,
          netFlow:
            dayRestaurantRevenue +
            dayChargingRevenue +
            dayDepositTotal -
            (dayExpenseTotal + dayWithdrawalTotal),
        });
      }

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
        dailySummary,
      });

      setViewMode("view");
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
User: ${availableUsers.find((u) => u.id === selectedUser)?.email || "Current User"}

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

DAILY SUMMARY
=============
${reportData.dailySummary.map((day) => `${day.date}: Revenue NRs. ${day.totalRevenue.toLocaleString()}, Expenses NRs. ${day.expenses.toLocaleString()}, Net Flow NRs. ${day.netFlow.toLocaleString()}`).join("\n")}
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

  const handleDateClick = (date: string) => {
    setSelectedDate(date);
    setModalOpen(true);
  };

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
            Generate, view, and export comprehensive business reports
          </p>
        </div>
      </div>

      {/* Mode Toggle */}
      <Card className="border border-gray-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <Button
              onClick={() => setViewMode("generate")}
              variant={viewMode === "generate" ? "default" : "outline"}
              className={viewMode === "generate" ? "bg-primary text-black" : ""}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
            <Button
              onClick={() => setViewMode("view")}
              variant={viewMode === "view" ? "default" : "outline"}
              className={viewMode === "view" ? "bg-primary text-black" : ""}
              disabled={!reportData}
            >
              <Eye className="h-4 w-4 mr-2" />
              View Report
            </Button>
          </div>

          {viewMode === "generate" && (
            <>
              {/* User Selection */}
              {availableUsers.length > 1 && (
                <div className="mb-6">
                  <label className="text-sm font-medium text-black mb-2 block">
                    Select User
                  </label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger className="w-full max-w-sm">
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          <div className="flex items-center gap-2">
                            <UserCheck className="h-4 w-4" />
                            {user.full_name || user.email}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Report Configuration */}
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
                      <SelectItem value="quarterly">
                        Quarterly Report
                      </SelectItem>
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
                  <label className="text-sm font-medium text-black">
                    Actions
                  </label>
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
                          Generate
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Report Display */}
      {viewMode === "view" && reportData && (
        <>
          {/* Export Button */}
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-black">
              Report Results - {reportData.period}
            </h2>
            <Button
              onClick={exportReport}
              variant="outline"
              className="hover:bg-brand-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>

          {/* Daily Summary Table */}
          <Card className="border border-gray-200">
            <CardHeader className="bg-brand-50 border-b border-gray-200">
              <CardTitle className="text-black">
                Daily Summary - Click date for details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-black">
                        Date
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-black">
                        Orders
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-black">
                        Charging
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-black">
                        Revenue
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-black">
                        Expenses
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-black">
                        Net Flow
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.dailySummary
                      .slice()
                      .reverse()
                      .map((day, index) => (
                        <tr
                          key={day.date}
                          className={`cursor-pointer hover:bg-brand-50 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                          onClick={() => handleDateClick(day.date)}
                        >
                          <td className="px-4 py-3 text-black font-medium">
                            {new Date(day.date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "2-digit",
                            })}
                          </td>
                          <td className="px-4 py-3 text-right text-black">
                            {day.orders}
                          </td>
                          <td className="px-4 py-3 text-right text-black">
                            {day.charging}
                          </td>
                          <td className="px-4 py-3 text-right text-black font-medium">
                            NRs. {day.totalRevenue.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right text-black">
                            NRs. {day.expenses.toLocaleString()}
                          </td>
                          <td
                            className={`px-4 py-3 text-right font-bold ${day.netFlow >= 0 ? "text-green-600" : "text-red-600"}`}
                          >
                            {day.netFlow >= 0 ? "+" : ""}NRs.{" "}
                            {day.netFlow.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Additional report sections would go here */}
        </>
      )}

      {/* Daily Entry Modal */}
      <DailyEntryModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        selectedDate={selectedDate}
        selectedUser={selectedUser}
      />
    </div>
  );
};

export default CombinedReportsTab;
