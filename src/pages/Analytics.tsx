import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
  AreaChart,
  Area,
} from "recharts";
import {
  Banknote,
  CreditCard,
  PiggyBank,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FinancialData {
  bankBalance: number;
  cashInHand: number;
  cooperativeBalance: number;
  totalIncome: number;
  totalExpenses: number;
  chargingIncome: number;
  restaurantIncome: number;
}

const Analytics = () => {
  const [timeRange, setTimeRange] = useState("30");
  const [selectedMetric, setSelectedMetric] = useState("all");

  // Fetch all financial data
  const { data: ordersData = [] } = useQuery({
    queryKey: ["orders", timeRange],
    queryFn: async () => {
      const date = new Date();
      date.setDate(date.getDate() - parseInt(timeRange));

      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .gte("created_at", date.toISOString());

      if (error) throw error;
      return data || [];
    },
  });

  const { data: chargingData = [] } = useQuery({
    queryKey: ["charging", timeRange],
    queryFn: async () => {
      const date = new Date();
      date.setDate(date.getDate() - parseInt(timeRange));

      const { data, error } = await supabase
        .from("charging_sessions")
        .select("*")
        .gte("created_at", date.toISOString());

      if (error) throw error;
      return data || [];
    },
  });

  const { data: expensesData = [] } = useQuery({
    queryKey: ["expenses", timeRange],
    queryFn: async () => {
      const date = new Date();
      date.setDate(date.getDate() - parseInt(timeRange));

      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .gte("created_at", date.toISOString());

      if (error) throw error;
      return data || [];
    },
  });

  const { data: depositsData = [] } = useQuery({
    queryKey: ["deposits", timeRange],
    queryFn: async () => {
      const date = new Date();
      date.setDate(date.getDate() - parseInt(timeRange));

      const { data, error } = await supabase
        .from("deposits")
        .select("*")
        .gte("created_at", date.toISOString());

      if (error) throw error;
      return data || [];
    },
  });

  const { data: withdrawalsData = [] } = useQuery({
    queryKey: ["withdrawals", timeRange],
    queryFn: async () => {
      const date = new Date();
      date.setDate(date.getDate() - parseInt(timeRange));

      const { data, error } = await supabase
        .from("withdrawals")
        .select("*")
        .gte("created_at", date.toISOString());

      if (error) throw error;
      return data || [];
    },
  });

  const { data: cooperativeData = [] } = useQuery({
    queryKey: ["cooperative", timeRange],
    queryFn: async () => {
      const date = new Date();
      date.setDate(date.getDate() - parseInt(timeRange));

      const { data, error } = await supabase
        .from("cooperative_savings")
        .select("*")
        .gte("created_at", date.toISOString());

      if (error) throw error;
      return data || [];
    },
  });

  // Calculate financial metrics
  const calculateFinancials = (): FinancialData => {
    // Restaurant income (cash and non-cash orders)
    const restaurantIncome = ordersData.reduce(
      (sum, order) => sum + (order.total_amount || 0),
      0,
    );

    // Charging income
    const chargingIncome = chargingData.reduce(
      (sum, session) => sum + (session.amount_charged || 0),
      0,
    );

    // Total deposits to bank
    const totalDeposits = depositsData.reduce(
      (sum, deposit) => sum + (deposit.amount || 0),
      0,
    );

    // Total withdrawals from bank
    const totalWithdrawals = withdrawalsData.reduce(
      (sum, withdrawal) => sum + (withdrawal.amount || 0),
      0,
    );

    // Bank expenses (non-cash expenses)
    const bankExpenses = expensesData
      .filter((expense) => expense.payment_method !== "cash")
      .reduce((sum, expense) => sum + (expense.amount || 0), 0);

    // Cash expenses
    const cashExpenses = expensesData
      .filter((expense) => expense.payment_method === "cash")
      .reduce((sum, expense) => sum + (expense.amount || 0), 0);

    // Cash orders (restaurant income paid in cash)
    const cashOrders = ordersData
      .filter((order) => order.payment_method === "cash")
      .reduce((sum, order) => sum + (order.total_amount || 0), 0);

    // Cash from charging (if any charging is paid in cash)
    const cashFromCharging = chargingData
      .filter((session) => session.payment_method === "cash")
      .reduce((sum, session) => sum + (session.amount_charged || 0), 0);

    // Cooperative savings
    const cooperativeSavings = cooperativeData.reduce(
      (sum, saving) => sum + (saving.amount || 0),
      0,
    );

    // Cooperative withdrawals
    const cooperativeWithdrawals = cooperativeData
      .filter((item) => item.transaction_type === "withdrawal")
      .reduce((sum, withdrawal) => sum + Math.abs(withdrawal.amount || 0), 0);

    // Cash deposited to bank/cooperative from cash on hand
    const cashDepositsToBank = depositsData
      .filter((deposit) => deposit.source === "cash")
      .reduce((sum, deposit) => sum + (deposit.amount || 0), 0);

    const cashDepositsToCooperative = cooperativeData
      .filter((item) => item.source === "cash")
      .reduce((sum, deposit) => sum + (deposit.amount || 0), 0);

    // Calculate balances
    const bankBalance = totalDeposits - totalWithdrawals - bankExpenses;

    const cashInHand =
      cashOrders +
      cashFromCharging -
      cashExpenses -
      cashDepositsToBank -
      cashDepositsToCooperative;

    const cooperativeBalance = cooperativeSavings - cooperativeWithdrawals;

    return {
      bankBalance,
      cashInHand,
      cooperativeBalance,
      totalIncome: restaurantIncome + chargingIncome,
      totalExpenses: bankExpenses + cashExpenses,
      chargingIncome,
      restaurantIncome,
    };
  };

  const financials = calculateFinancials();

  // Chart data for charging vs restaurant correlation
  const correlationData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));

    const dayCharging = chargingData
      .filter(
        (session) =>
          new Date(session.created_at).toDateString() === date.toDateString(),
      )
      .reduce((sum, session) => sum + (session.amount_charged || 0), 0);

    const dayRestaurant = ordersData
      .filter(
        (order) =>
          new Date(order.created_at).toDateString() === date.toDateString(),
      )
      .reduce((sum, order) => sum + (order.total_amount || 0), 0);

    return {
      date: date.toLocaleDateString("en-US", { weekday: "short" }),
      charging: dayCharging,
      restaurant: dayRestaurant,
      total: dayCharging + dayRestaurant,
    };
  });

  const balanceData = [
    { name: "Bank Balance", value: financials.bankBalance, color: "#22c55e" },
    { name: "Cash in Hand", value: financials.cashInHand, color: "#3b82f6" },
    {
      name: "Cooperative",
      value: financials.cooperativeBalance,
      color: "#f59e0b",
    },
  ];

  const incomeBreakdown = [
    {
      name: "Restaurant",
      value: financials.restaurantIncome,
      color: "#ef4444",
    },
    { name: "Charging", value: financials.chargingIncome, color: "#8b5cf6" },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 mobile-container py-4 sm:py-6 lg:py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="responsive-text-2xl font-bold text-slate-800 mb-2">
            Financial Analytics
          </h1>
          <p className="responsive-text-sm text-slate-600">
            Comprehensive view of your financial performance
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <Card className="bg-green-50 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700">
              Bank Balance
            </CardTitle>
            <Banknote className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-800">
              ${financials.bankBalance.toLocaleString()}
            </div>
            <p className="text-xs text-green-600 mt-1">
              Deposits minus withdrawals and bank expenses
            </p>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">
              Cash in Hand
            </CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-800">
              ${financials.cashInHand.toLocaleString()}
            </div>
            <p className="text-xs text-blue-600 mt-1">
              Cash received minus expenses and deposits
            </p>
          </CardContent>
        </Card>

        <Card className="bg-amber-50 border-amber-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-amber-700">
              Cooperative Balance
            </CardTitle>
            <PiggyBank className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-800">
              ${financials.cooperativeBalance.toLocaleString()}
            </div>
            <p className="text-xs text-amber-600 mt-1">
              Savings minus withdrawals
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Charging vs Restaurant Correlation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Charging & Restaurant Income Correlation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={correlationData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${value}`, ""]} />
                <Legend />
                <Bar dataKey="charging" fill="#8b5cf6" name="Charging Income" />
                <Bar
                  dataKey="restaurant"
                  fill="#ef4444"
                  name="Restaurant Income"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Balance Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Balance Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={balanceData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) =>
                    `${name}: $${value.toLocaleString()}`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {balanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`$${value}`, ""]} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Income Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Income Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={correlationData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${value}`, ""]} />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#22c55e"
                  fill="#22c55e"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Income Sources */}
        <Card>
          <CardHeader>
            <CardTitle>Income Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={incomeBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {incomeBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`$${value}`, ""]} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Total Income
                </p>
                <p className="text-2xl font-bold text-green-600">
                  ${financials.totalIncome.toLocaleString()}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Total Expenses
                </p>
                <p className="text-2xl font-bold text-red-600">
                  ${financials.totalExpenses.toLocaleString()}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Net Profit</p>
                <p
                  className={`text-2xl font-bold ${financials.totalIncome - financials.totalExpenses >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  $
                  {(
                    financials.totalIncome - financials.totalExpenses
                  ).toLocaleString()}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-slate-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Total Assets
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  $
                  {(
                    financials.bankBalance +
                    financials.cashInHand +
                    financials.cooperativeBalance
                  ).toLocaleString()}
                </p>
              </div>
              <CreditCard className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
