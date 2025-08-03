
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Download, TrendingUp, TrendingDown, DollarSign, PieChart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';

interface DailySummaryData {
  summary_date: string;
  total_income: number;
  total_expenses: number;
  total_deposits: number;
  total_savings: number;
  total_withdrawals: number;
  cash_balance: number;
  esewa_balance: number;
  fonepay_balance: number;
  cooperative_balance: number;
  total_balance: number;
  // Add missing properties
  total_expenses_cash?: number;
  total_expenses_esewa?: number;
  total_expenses_fonepay?: number;
  total_savings_cash?: number;
  total_savings_esewa?: number;
  total_savings_fonepay?: number;
  total_deposits_cash?: number;
  total_deposits_esewa?: number;
  total_deposits_fonepay?: number;
  total_withdrawals_cash?: number;
  total_withdrawals_cooperative?: number;
  total_withdrawals_bank?: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const EnhancedInsightsTab = () => {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [summaryData, setSummaryData] = useState<DailySummaryData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchEnhancedData();
    }
  }, [user, dateRange]);

  const fetchEnhancedData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('daily_summary')
        .select('*')
        .gte('summary_date', dateRange.start)
        .lte('summary_date', dateRange.end)
        .order('summary_date', { ascending: true });

      if (error) throw error;

      setSummaryData(data || []);
    } catch (error) {
      console.error('Error fetching enhanced data:', error);
      toast.error('Failed to load enhanced insights');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    return summaryData.reduce((acc, item) => ({
      totalIncome: acc.totalIncome + (item.total_income || 0),
      totalExpenses: acc.totalExpenses + (item.total_expenses || 0),
      totalDeposits: acc.totalDeposits + (item.total_deposits || 0),
      totalWithdrawals: acc.totalWithdrawals + (item.total_withdrawals || 0),
      netProfit: acc.netProfit + ((item.total_income || 0) - (item.total_expenses || 0))
    }), {
      totalIncome: 0,
      totalExpenses: 0,
      totalDeposits: 0,
      totalWithdrawals: 0,
      netProfit: 0
    });
  };

  const generatePaymentModeData = () => {
    const totals = summaryData.reduce((acc, item) => {
      // Use fallback values if specific payment mode data is not available
      acc.cash += (item.total_expenses_cash || 0) + (item.total_savings_cash || 0) + (item.total_deposits_cash || 0);
      acc.esewa += (item.total_expenses_esewa || 0) + (item.total_savings_esewa || 0) + (item.total_deposits_esewa || 0);
      acc.fonepay += (item.total_expenses_fonepay || 0) + (item.total_savings_fonepay || 0) + (item.total_deposits_fonepay || 0);
      return acc;
    }, { cash: 0, esewa: 0, fonepay: 0 });

    return [
      { name: 'Cash', value: totals.cash },
      { name: 'Esewa', value: totals.esewa },
      { name: 'Fonepay', value: totals.fonepay }
    ];
  };

  const generateWithdrawalData = () => {
    const totals = summaryData.reduce((acc, item) => {
      acc.cash += item.total_withdrawals_cash || 0;
      acc.cooperative += item.total_withdrawals_cooperative || 0;
      acc.bank += item.total_withdrawals_bank || 0;
      return acc;
    }, { cash: 0, cooperative: 0, bank: 0 });

    return [
      { name: 'Cash', value: totals.cash },
      { name: 'Cooperative', value: totals.cooperative },
      { name: 'Bank', value: totals.bank }
    ];
  };

  const totals = calculateTotals();
  const paymentModeData = generatePaymentModeData();
  const withdrawalData = generateWithdrawalData();

  const exportToCSV = () => {
    if (summaryData.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = ['Date', 'Income', 'Expenses', 'Deposits', 'Withdrawals', 'Net Profit'];
    const csvData = summaryData.map(item => [
      item.summary_date,
      item.total_income,
      item.total_expenses,
      item.total_deposits,
      item.total_withdrawals,
      (item.total_income || 0) - (item.total_expenses || 0)
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `enhanced-insights-${dateRange.start}-to-${dateRange.end}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h2 className="text-2xl font-bold">Enhanced Financial Insights</h2>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex gap-2">
            <div>
              <Label htmlFor="start-date">From</Label>
              <Input
                id="start-date"
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="end-date">To</Label>
              <Input
                id="end-date"
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              />
            </div>
          </div>
          <Button onClick={exportToCSV} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rs. {totals.totalIncome.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-4 w-4 text-green-500" />
              Revenue generated
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rs. {totals.totalExpenses.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingDown className="inline h-4 w-4 text-red-500" />
              Total spent
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totals.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              Rs. {totals.netProfit.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Income - Expenses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deposits</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rs. {totals.totalDeposits.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Money deposited</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Withdrawals</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rs. {totals.totalWithdrawals.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Money withdrawn</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Financial Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={summaryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="summary_date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="total_income" stroke="#8884d8" name="Income" />
                <Line type="monotone" dataKey="total_expenses" stroke="#82ca9d" name="Expenses" />
                <Line type="monotone" dataKey="total_balance" stroke="#ffc658" name="Balance" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payment Mode Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Mode Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={paymentModeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {paymentModeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Daily Comparison Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Income vs Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={summaryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="summary_date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total_income" fill="#8884d8" name="Income" />
                <Bar dataKey="total_expenses" fill="#82ca9d" name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Withdrawal Sources */}
        <Card>
          <CardHeader>
            <CardTitle>Withdrawal Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={withdrawalData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {withdrawalData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      )}
    </div>
  );
};

export default EnhancedInsightsTab;
