import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  DollarSign,
  TrendingUp,
  Users,
  ShoppingCart,
  Activity,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  Home,
  FileText,
  BarChart3,
  PlusCircle,
  Wallet,
  Calculator,
  Receipt,
  Building2,
  Banknote,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Import all tab components
import DataInputTab from "@/components/tabs/DataInputTab";
import OrdersTab from "@/components/tabs/OrdersTab";
import ChargingTab from "@/components/tabs/ChargingTab";
import ExpensesTab from "@/components/tabs/ExpensesTab";
import DepositsTab from "@/components/tabs/DepositsTab";
import WithdrawalsTab from "@/components/tabs/WithdrawalsTab";
import CooperativeSavingsTab from "@/components/tabs/CooperativeSavingsTab";
import SavingsWithdrawalsTab from "@/components/tabs/SavingsWithdrawalsTab";
import ShareInvestmentsTab from "@/components/tabs/ShareInvestmentsTab";
import VATEntryTab from "@/components/tabs/VATEntryTab";
import SummaryReportTab from "@/components/tabs/SummaryReportTab";
import UserManagementTab from "@/components/tabs/UserManagementTab";
import InventoryTab from "@/components/tabs/InventoryTab";
import MenuManagementTab from "@/components/tabs/MenuManagementTab";
import { AllTimeSummaryModal } from "@/components/AllTimeSummaryModal";
import { DailyClosingSystem } from "@/components/DailyClosingSystem";

interface AnalyticsData {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  totalOrders: number;
  totalCustomers: number;
  avgOrderValue: number;
  revenueGrowth: number;
  profitMargin: number;
}

interface ChartData {
  name: string;
  value: number;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

const Dashboard = () => {
  const { user, userRole, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [dailyClosingOpen, setDailyClosingOpen] = useState(false);

  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    totalOrders: 0,
    totalCustomers: 0,
    avgOrderValue: 0,
    revenueGrowth: 0,
    profitMargin: 0,
  });
  const [chartData, setChartData] = useState<ChartData[]>([]);

  useEffect(() => {
    if (user) {
      fetchAnalyticsData();
    }
  }, [user]);

  const fetchAnalyticsData = async () => {
    if (!user) return;

    try {
      // Fetch orders data
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", user.id);

      if (ordersError) throw ordersError;

      // Fetch charging data
      const { data: chargingData, error: chargingError } = await supabase
        .from("charging_sessions")
        .select("*")
        .eq("user_id", user.id);

      if (chargingError) throw chargingError;

      // Fetch expenses data
      const { data: expensesData, error: expensesError } = await supabase
        .from("expenses")
        .select("*")
        .eq("user_id", user.id);

      if (expensesError) throw expensesError;

      // Calculate analytics
      const totalOrderRevenue =
        ordersData?.reduce((sum, order) => sum + order.total, 0) || 0;
      const totalChargingRevenue =
        chargingData?.reduce((sum, session) => sum + session.total_amount, 0) ||
        0;
      const totalRevenue = totalOrderRevenue + totalChargingRevenue;
      const totalExpenses =
        expensesData?.reduce((sum, expense) => sum + expense.amount, 0) || 0;
      const netProfit = totalRevenue - totalExpenses;
      const totalOrders = (ordersData?.length || 0) + (chargingData?.length || 0);
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

      // Get balances
      const { data: balancesData } = await supabase
        .from("balances")
        .select("*")
        .eq("user_id", user.id)
        .single();

      let balanceData: ChartData[] = [];
      if (balancesData) {
        balanceData = [
          { name: "Cash", value: balancesData.cash_in_hand || 0 },
          { name: "Bank", value: balancesData.bank_balance || 0 },
          { name: "Esewa", value: balancesData.esewa_balance || 0 },
          { name: "Fonepay", value: balancesData.fonepay_balance || 0 },
          { name: "Cooperative", value: balancesData.cooperative_balance || 0 },
        ];
      }

      setAnalyticsData({
        totalRevenue,
        totalExpenses,
        netProfit,
        totalOrders,
        totalCustomers: 0, // This would need user counting logic
        avgOrderValue,
        revenueGrowth: 0, // This would need historical comparison
        profitMargin,
      });

      setChartData(balanceData);
    } catch (error) {
      console.error("Error fetching analytics data:", error);
      toast.error("Error loading analytics data");
    }
  };

  const getUserDisplayName = () => {
    if (!user) return "Guest";
    
    // Try to get name from user metadata first
    if (user.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    
    if (user.user_metadata?.first_name || user.user_metadata?.last_name) {
      return `${user.user_metadata.first_name || ''} ${user.user_metadata.last_name || ''}`.trim();
    }
    
    // Fallback to email username
    return user.email?.split('@')[0] || 'User';
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex items-center justify-between h-16 px-6 border-b">
          <h1 className="text-xl font-bold text-gray-800">Dashboard</h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-md hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <nav className="mt-8">
          <div className="px-6 mb-4">
            <div className="flex items-center space-x-3 p-3 rounded-lg bg-blue-50">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                {getUserDisplayName().charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {getUserDisplayName()}
                </p>
                <p className="text-xs text-gray-500">{userRole}</p>
              </div>
            </div>
          </div>

          <TabsList className="flex flex-col space-y-2 px-6">
            <TabsTrigger
              value="dashboard"
              className="data-[state=active]:bg-gray-100 data-[state=active]:text-blue-600 flex items-center space-x-3 py-2 rounded-md hover:bg-gray-100 transition-colors duration-200"
              onClick={() => setActiveTab("dashboard")}
            >
              <Home className="h-4 w-4" />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger
              value="dataInput"
              className="data-[state=active]:bg-gray-100 data-[state=active]:text-blue-600 flex items-center space-x-3 py-2 rounded-md hover:bg-gray-100 transition-colors duration-200"
              onClick={() => setActiveTab("dataInput")}
            >
              <PlusCircle className="h-4 w-4" />
              <span>Data Input</span>
            </TabsTrigger>
            <TabsTrigger
              value="orders"
              className="data-[state=active]:bg-gray-100 data-[state=active]:text-blue-600 flex items-center space-x-3 py-2 rounded-md hover:bg-gray-100 transition-colors duration-200"
              onClick={() => setActiveTab("orders")}
            >
              <ShoppingCart className="h-4 w-4" />
              <span>Orders</span>
            </TabsTrigger>
            <TabsTrigger
              value="charging"
              className="data-[state=active]:bg-gray-100 data-[state=active]:text-blue-600 flex items-center space-x-3 py-2 rounded-md hover:bg-gray-100 transition-colors duration-200"
              onClick={() => setActiveTab("charging")}
            >
              <CreditCard className="h-4 w-4" />
              <span>Charging</span>
            </TabsTrigger>
            <TabsTrigger
              value="expenses"
              className="data-[state=active]:bg-gray-100 data-[state=active]:text-blue-600 flex items-center space-x-3 py-2 rounded-md hover:bg-gray-100 transition-colors duration-200"
              onClick={() => setActiveTab("expenses")}
            >
              <ArrowUpRight className="h-4 w-4" />
              <span>Expenses</span>
            </TabsTrigger>
            <TabsTrigger
              value="deposits"
              className="data-[state=active]:bg-gray-100 data-[state=active]:text-blue-600 flex items-center space-x-3 py-2 rounded-md hover:bg-gray-100 transition-colors duration-200"
              onClick={() => setActiveTab("deposits")}
            >
              <ArrowDownRight className="h-4 w-4" />
              <span>Deposits</span>
            </TabsTrigger>
            <TabsTrigger
              value="withdrawals"
              className="data-[state=active]:bg-gray-100 data-[state=active]:text-blue-600 flex items-center space-x-3 py-2 rounded-md hover:bg-gray-100 transition-colors duration-200"
              onClick={() => setActiveTab("withdrawals")}
            >
              <LogOut className="h-4 w-4" />
              <span>Withdrawals</span>
            </TabsTrigger>
            <TabsTrigger
              value="cooperativeSavings"
              className="data-[state=active]:bg-gray-100 data-[state=active]:text-blue-600 flex items-center space-x-3 py-2 rounded-md hover:bg-gray-100 transition-colors duration-200"
              onClick={() => setActiveTab("cooperativeSavings")}
            >
              <Building2 className="h-4 w-4" />
              <span>Cooperative Savings</span>
            </TabsTrigger>
            <TabsTrigger
              value="savingsWithdrawals"
              className="data-[state=active]:bg-gray-100 data-[state=active]:text-blue-600 flex items-center space-x-3 py-2 rounded-md hover:bg-gray-100 transition-colors duration-200"
              onClick={() => setActiveTab("savingsWithdrawals")}
            >
              <Wallet className="h-4 w-4" />
              <span>Savings Withdrawals</span>
            </TabsTrigger>
            <TabsTrigger
              value="shareInvestments"
              className="data-[state=active]:bg-gray-100 data-[state=active]:text-blue-600 flex items-center space-x-3 py-2 rounded-md hover:bg-gray-100 transition-colors duration-200"
              onClick={() => setActiveTab("shareInvestments")}
            >
              <Banknote className="h-4 w-4" />
              <span>Share Investments</span>
            </TabsTrigger>
            <TabsTrigger
              value="vatEntries"
              className="data-[state=active]:bg-gray-100 data-[state=active]:text-blue-600 flex items-center space-x-3 py-2 rounded-md hover:bg-gray-100 transition-colors duration-200"
              onClick={() => setActiveTab("vatEntries")}
            >
              <Receipt className="h-4 w-4" />
              <span>VAT Entries</span>
            </TabsTrigger>
            <TabsTrigger
              value="summaryReport"
              className="data-[state=active]:bg-gray-100 data-[state=active]:text-blue-600 flex items-center space-x-3 py-2 rounded-md hover:bg-gray-100 transition-colors duration-200"
              onClick={() => setActiveTab("summaryReport")}
            >
              <FileText className="h-4 w-4" />
              <span>Summary Report</span>
            </TabsTrigger>
             {userRole === "super_admin" && (
              <TabsTrigger
                value="userManagement"
                className="data-[state=active]:bg-gray-100 data-[state=active]:text-blue-600 flex items-center space-x-3 py-2 rounded-md hover:bg-gray-100 transition-colors duration-200"
                onClick={() => setActiveTab("userManagement")}
              >
                <Users className="h-4 w-4" />
                <span>User Management</span>
              </TabsTrigger>
            )}
            <TabsTrigger
              value="inventory"
              className="data-[state=active]:bg-gray-100 data-[state=active]:text-blue-600 flex items-center space-x-3 py-2 rounded-md hover:bg-gray-100 transition-colors duration-200"
              onClick={() => setActiveTab("inventory")}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Inventory</span>
            </TabsTrigger>
            <TabsTrigger
              value="menuManagement"
              className="data-[state=active]:bg-gray-100 data-[state=active]:text-blue-600 flex items-center space-x-3 py-2 rounded-md hover:bg-gray-100 transition-colors duration-200"
              onClick={() => setActiveTab("menuManagement")}
            >
              <Menu className="h-4 w-4" />
              <span>Menu Management</span>
            </TabsTrigger>
          </TabsList>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md hover:bg-gray-100"
              >
                <Menu className="h-5 w-5" />
              </button>
              <h2 className="ml-4 text-lg font-semibold text-gray-800 capitalize">
                {activeTab === 'dashboard' ? 'Overview' : activeTab.replace(/([A-Z])/g, ' $1')}
              </h2>
            </div>

            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                <Bell className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
              <Button onClick={signOut} variant="outline" size="sm">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
          <Tabs value={activeTab} className="h-full">
            <TabsContent value="dashboard" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-blue-50 text-blue-800 shadow-sm">
                  <CardContent className="flex items-center justify-between space-x-4 p-4">
                    <div>
                      <CardTitle className="text-lg font-semibold">
                        Total Revenue
                      </CardTitle>
                      <p className="text-3xl font-bold">
                        NPR {analyticsData.totalRevenue.toFixed(2)}
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-blue-400" />
                  </CardContent>
                </Card>

                <Card className="bg-green-50 text-green-800 shadow-sm">
                  <CardContent className="flex items-center justify-between space-x-4 p-4">
                    <div>
                      <CardTitle className="text-lg font-semibold">
                        Net Profit
                      </CardTitle>
                      <p className="text-3xl font-bold">
                        NPR {analyticsData.netProfit.toFixed(2)}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-400" />
                  </CardContent>
                </Card>

                <Card className="bg-orange-50 text-orange-800 shadow-sm">
                  <CardContent className="flex items-center justify-between space-x-4 p-4">
                    <div>
                      <CardTitle className="text-lg font-semibold">
                        Total Orders
                      </CardTitle>
                      <p className="text-3xl font-bold">
                        {analyticsData.totalOrders}
                      </p>
                    </div>
                    <ShoppingCart className="h-8 w-8 text-orange-400" />
                  </CardContent>
                </Card>

                <Card className="bg-purple-50 text-purple-800 shadow-sm">
                  <CardContent className="flex items-center justify-between space-x-4 p-4">
                    <div>
                      <CardTitle className="text-lg font-semibold">
                        Profit Margin
                      </CardTitle>
                      <p className="text-3xl font-bold">
                        {analyticsData.profitMargin.toFixed(1)}%
                      </p>
                    </div>
                    <Activity className="h-8 w-8 text-purple-400" />
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle>Balance Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) =>
                            `${name} ${(percent * 100).toFixed(0)}%`
                          }
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {chartData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => [`NPR ${value.toFixed(2)}`, 'Balance']} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">
                          Last Order
                        </span>
                        <Badge variant="secondary">Today</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">
                          New Expense
                        </span>
                        <Badge variant="outline">Utilities</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">
                          Deposit Received
                        </span>
                        <span className="text-sm font-medium">NPR 5,000</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setSummaryModalOpen(true)}>
                  View All-Time Summary
                </Button>
                <Button onClick={() => setDailyClosingOpen(true)}>
                  Daily Closing
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="dataInput">
              <DataInputTab />
            </TabsContent>
            <TabsContent value="orders">
              <OrdersTab />
            </TabsContent>
            <TabsContent value="charging">
              <ChargingTab />
            </TabsContent>
            <TabsContent value="expenses">
              <ExpensesTab />
            </TabsContent>
            <TabsContent value="deposits">
              <DepositsTab />
            </TabsContent>
            <TabsContent value="withdrawals">
              <WithdrawalsTab />
            </TabsContent>
            <TabsContent value="cooperativeSavings">
              <CooperativeSavingsTab />
            </TabsContent>
            <TabsContent value="savingsWithdrawals">
              <SavingsWithdrawalsTab />
            </TabsContent>
            <TabsContent value="shareInvestments">
              <ShareInvestmentsTab />
            </TabsContent>
            <TabsContent value="vatEntries">
              <VATEntryTab />
            </TabsContent>
            <TabsContent value="summaryReport">
              <SummaryReportTab />
            </TabsContent>
             {userRole === "super_admin" && (
              <TabsContent value="userManagement">
                <UserManagementTab />
              </TabsContent>
            )}
            <TabsContent value="inventory">
              <InventoryTab />
            </TabsContent>
            <TabsContent value="menuManagement">
              <MenuManagementTab />
            </TabsContent>
          </Tabs>
        </main>
      </div>

      <AllTimeSummaryModal
        isOpen={summaryModalOpen}
        onClose={() => setSummaryModalOpen(false)}
      />
      <DailyClosingSystem
        isOpen={dailyClosingOpen}
        onClose={() => setDailyClosingOpen(false)}
      />
    </div>
  );
};

export default Dashboard;
