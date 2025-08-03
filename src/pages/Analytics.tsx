
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  LineChart,
  Line,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  ShoppingCart,
  Activity,
  Calendar,
  Filter,
  Download,
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "sonner";

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
  revenue?: number;
  expenses?: number;
  profit?: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const Analytics = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
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
  const [revenueByCategory, setRevenueByCategory] = useState<ChartData[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<ChartData[]>([]);
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  useEffect(() => {
    if (user) {
      fetchAnalyticsData();
    }
  }, [user, dateRange]);

  const fetchAnalyticsData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch orders data
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", user.id)
        .gte("order_date", format(dateRange.from, "yyyy-MM-dd"))
        .lte("order_date", format(dateRange.to, "yyyy-MM-dd"));

      if (ordersError) throw ordersError;

      // Fetch charging data
      const { data: chargingData, error: chargingError } = await supabase
        .from("charging_sessions")
        .select("*")
        .eq("user_id", user.id)
        .gte("session_date", format(dateRange.from, "yyyy-MM-dd"))
        .lte("session_date", format(dateRange.to, "yyyy-MM-dd"));

      if (chargingError) throw chargingError;

      // Fetch expenses data
      const { data: expensesData, error: expensesError } = await supabase
        .from("expenses")
        .select("*")
        .eq("user_id", user.id)
        .gte("expense_date", format(dateRange.from, "yyyy-MM-dd"))
        .lte("expense_date", format(dateRange.to, "yyyy-MM-dd"));

      if (expensesError) throw expensesError;

      // Calculate analytics
      const totalOrderRevenue = ordersData?.reduce((sum, order) => sum + order.total, 0) || 0;
      const totalChargingRevenue = chargingData?.reduce((sum, session) => sum + session.total_amount, 0) || 0;
      const totalRevenue = totalOrderRevenue + totalChargingRevenue;
      const totalExpenses = expensesData?.reduce((sum, expense) => sum + expense.amount, 0) || 0;
      const netProfit = totalRevenue - totalExpenses;
      const totalOrders = (ordersData?.length || 0) + (chargingData?.length || 0);
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

      // Calculate revenue by payment mode
      const paymentModeRevenue: { [key: string]: number } = {};
      
      ordersData?.forEach(order => {
        paymentModeRevenue[order.payment_mode] = (paymentModeRevenue[order.payment_mode] || 0) + order.total;
      });
      
      chargingData?.forEach(session => {
        paymentModeRevenue[session.payment_mode] = (paymentModeRevenue[session.payment_mode] || 0) + session.total_amount;
      });

      const revenueByPaymentMode = Object.entries(paymentModeRevenue).map(([mode, amount]) => ({
        name: mode,
        value: amount,
      }));

      // Calculate monthly trends
      const monthlyData: { [key: string]: { revenue: number; expenses: number } } = {};
      
      ordersData?.forEach(order => {
        const month = format(new Date(order.order_date || order.created_at), "MMM yyyy");
        if (!monthlyData[month]) monthlyData[month] = { revenue: 0, expenses: 0 };
        monthlyData[month].revenue += order.total;
      });

      chargingData?.forEach(session => {
        const month = format(new Date(session.session_date || session.created_at), "MMM yyyy");
        if (!monthlyData[month]) monthlyData[month] = { revenue: 0, expenses: 0 };
        monthlyData[month].revenue += session.total_amount;
      });

      expensesData?.forEach(expense => {
        const month = format(new Date(expense.expense_date || expense.created_at), "MMM yyyy");
        if (!monthlyData[month]) monthlyData[month] = { revenue: 0, expenses: 0 };
        monthlyData[month].expenses += expense.amount;
      });

      const monthlyTrendsData = Object.entries(monthlyData).map(([month, data]) => ({
        name: month,
        revenue: data.revenue,
        expenses: data.expenses,
        profit: data.revenue - data.expenses,
        value: data.revenue, // Add value property for consistency
      }));

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
      setRevenueByCategory(revenueByPaymentMode);
      setMonthlyTrends(monthlyTrendsData);

    } catch (error) {
      console.error("Error fetching analytics data:", error);
      toast.error("Error loading analytics data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600">Comprehensive business insights and metrics</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100">Total Revenue</p>
                <p className="text-2xl font-bold">NPR {analyticsData.totalRevenue.toFixed(2)}</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  <span className="text-sm">+{analyticsData.revenueGrowth.toFixed(1)}%</span>
                </div>
              </div>
              <DollarSign className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100">Net Profit</p>
                <p className="text-2xl font-bold">NPR {analyticsData.netProfit.toFixed(2)}</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  <span className="text-sm">{analyticsData.profitMargin.toFixed(1)}% margin</span>
                </div>
              </div>
              <Activity className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100">Total Orders</p>
                <p className="text-2xl font-bold">{analyticsData.totalOrders.toString()}</p>
                <div className="flex items-center mt-2">
                  <ShoppingCart className="h-4 w-4 mr-1" />
                  <span className="text-sm">NPR {analyticsData.avgOrderValue.toFixed(2)} avg</span>
                </div>
              </div>
              <ShoppingCart className="h-8 w-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100">Total Expenses</p>
                <p className="text-2xl font-bold">NPR {analyticsData.totalExpenses.toFixed(2)}</p>
                <div className="flex items-center mt-2">
                  <TrendingDown className="h-4 w-4 mr-1" />
                  <span className="text-sm">Monthly</span>
                </div>
              </div>
              <Calendar className="h-8 w-8 text-orange-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue & Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: number) => [`NPR ${value.toFixed(2)}`, '']} />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} />
                <Line type="monotone" dataKey="expenses" stroke="#82ca9d" strokeWidth={2} />
                <Line type="monotone" dataKey="profit" stroke="#ffc658" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue by Payment Mode */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Payment Mode</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={revenueByCategory}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {revenueByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`NPR ${value.toFixed(2)}`, 'Revenue']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Balance Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Current Balance Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value: number) => [`NPR ${value.toFixed(2)}`, 'Balance']} />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent Activity Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Best Revenue Day</span>
                <Badge variant="secondary">Today</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Top Payment Mode</span>
                <Badge variant="outline">
                  {revenueByCategory[0]?.name || 'N/A'}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Growth Rate</span>
                <Badge variant="secondary" className="text-green-600">
                  +{analyticsData.revenueGrowth.toFixed(1)}%
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Financial Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Profit Margin</span>
                <Badge variant={analyticsData.profitMargin > 20 ? "default" : "destructive"}>
                  {analyticsData.profitMargin.toFixed(1)}%
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Cash Flow</span>
                <Badge variant={analyticsData.netProfit > 0 ? "default" : "destructive"}>
                  {analyticsData.netProfit > 0 ? "Positive" : "Negative"}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Avg Order Value</span>
                <span className="text-sm font-medium">NPR {analyticsData.avgOrderValue.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button className="w-full" size="sm">
                Generate Report
              </Button>
              <Button className="w-full" variant="outline" size="sm">
                Export Data
              </Button>
              <Button className="w-full" variant="outline" size="sm">
                Schedule Report
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
