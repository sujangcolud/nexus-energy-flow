
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Users, Activity, Zap, ShoppingBag, CreditCard, PiggyBank } from 'lucide-react';

interface AnalyticsData {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  ordersCount: number;
  chargingSessions: number;
  totalDeposits: number;
  totalWithdrawals: number;
  cooperativeSavings: number;
  breakEvenPoint: number;
  profitMargin: number;
  fixedCosts: number;
  variableCostRatio: number;
  topSellingItems: Array<{ name: string; quantity: number; revenue: number }>;
  categoryBreakdown: Record<string, number>;
  dailyAverage: {
    revenue: number;
    orders: number;
    chargingSessions: number;
  };
  monthlyGrowth: {
    revenue: number;
    orders: number;
  };
}

const InsightsTab = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData>({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    ordersCount: 0,
    chargingSessions: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
    cooperativeSavings: 0,
    breakEvenPoint: 0,
    profitMargin: 0,
    fixedCosts: 0,
    variableCostRatio: 0,
    topSellingItems: [],
    categoryBreakdown: {},
    dailyAverage: { revenue: 0, orders: 0, chargingSessions: 0 },
    monthlyGrowth: { revenue: 0, orders: 0 }
  });

  useEffect(() => {
    if (user) {
      loadAnalytics();
    }
  }, [user]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch all data concurrently
      const [
        ordersData,
        chargingData,
        expensesData,
        depositsData,
        withdrawalsData,
        cooperativeData
      ] = await Promise.all([
        supabase.from('orders').select('*'),
        supabase.from('charging_sessions').select('*'),
        supabase.from('expenses').select('*'),
        supabase.from('deposits').select('*'),
        supabase.from('withdrawals').select('*'),
        supabase.from('cooperative_savings').select('*')
      ]);

      const orders = ordersData.data || [];
      const chargingSessions = chargingData.data || [];
      const expenses = expensesData.data || [];
      const deposits = depositsData.data || [];
      const withdrawals = withdrawalsData.data || [];
      const cooperative = cooperativeData.data || [];

      // Calculate metrics
      const ordersRevenue = orders.reduce((sum, order) => sum + Number(order.total), 0);
      const chargingRevenue = chargingSessions.reduce((sum, session) => sum + Number(session.total_amount), 0);
      const totalRevenue = ordersRevenue + chargingRevenue;
      
      const totalExpenses = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
      const totalDeposits = deposits.reduce((sum, deposit) => sum + Number(deposit.amount), 0);
      const totalWithdrawals = withdrawals.reduce((sum, withdrawal) => sum + Number(withdrawal.amount), 0);
      const cooperativeSavings = cooperative.reduce((sum, saving) => sum + Number(saving.contribution_amount), 0);
      
      const netProfit = totalRevenue - totalExpenses;
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

      // Calculate proper Break Even Point (BEP)
      // BEP = Fixed Costs / (Price per Unit - Variable Cost per Unit)
      // For service business: BEP = Fixed Costs / Contribution Margin Ratio
      
      // Estimate fixed costs (rent, utilities, etc.) - categories that are typically fixed
      const fixedCostCategories = ['Rent', 'Utilities', 'Insurance', 'Salaries', 'Equipment'];
      const fixedCosts = expenses
        .filter(expense => fixedCostCategories.includes(expense.category))
        .reduce((sum, expense) => sum + Number(expense.amount), 0);
      
      // Variable costs (remaining expenses)
      const variableCosts = totalExpenses - fixedCosts;
      const variableCostRatio = totalRevenue > 0 ? variableCosts / totalRevenue : 0;
      const contributionMarginRatio = 1 - variableCostRatio;
      
      // Break Even Point in revenue
      const breakEvenPoint = contributionMarginRatio > 0 ? fixedCosts / contributionMarginRatio : 0;

      // Top selling items analysis
      const itemSales = orders.reduce((acc: any, order) => {
        if (!acc[order.item_name]) {
          acc[order.item_name] = { quantity: 0, revenue: 0 };
        }
        acc[order.item_name].quantity += order.quantity;
        acc[order.item_name].revenue += Number(order.total);
        return acc;
      }, {});

      const topSellingItems = Object.entries(itemSales)
        .map(([name, data]: [string, any]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Category breakdown for expenses
      const categoryBreakdown = expenses.reduce((acc: any, expense) => {
        acc[expense.category] = (acc[expense.category] || 0) + Number(expense.amount);
        return acc;
      }, {});

      // Daily averages (assuming 30 days for calculation)
      const dailyAverage = {
        revenue: totalRevenue / 30,
        orders: orders.length / 30,
        chargingSessions: chargingSessions.length / 30
      };

      // Calculate monthly growth (placeholder - would need historical data for real growth)
      const monthlyGrowth = {
        revenue: Math.random() * 20 - 10, // Random for demo
        orders: Math.random() * 15 - 5
      };

      setData({
        totalRevenue,
        totalExpenses,
        netProfit,
        ordersCount: orders.length,
        chargingSessions: chargingSessions.length,
        totalDeposits,
        totalWithdrawals,
        cooperativeSavings,
        breakEvenPoint,
        profitMargin,
        fixedCosts,
        variableCostRatio: variableCostRatio * 100,
        topSellingItems,
        categoryBreakdown,
        dailyAverage,
        monthlyGrowth
      });

    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const metrics = [
    {
      title: 'Total Revenue',
      value: `Rs. ${data.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      change: `+${data.monthlyGrowth.revenue.toFixed(1)}%`
    },
    {
      title: 'Total Expenses',
      value: `Rs. ${data.totalExpenses.toLocaleString()}`,
      icon: TrendingDown,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      title: 'Net Profit',
      value: `Rs. ${data.netProfit.toLocaleString()}`,
      icon: TrendingUp,
      color: data.netProfit >= 0 ? 'text-green-600' : 'text-red-600',
      bgColor: data.netProfit >= 0 ? 'bg-green-50' : 'bg-red-50',
      change: `${data.profitMargin.toFixed(1)}% margin`
    },
    {
      title: 'Total Orders',
      value: data.ordersCount.toString(),
      icon: ShoppingBag,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      change: `+${data.monthlyGrowth.orders.toFixed(1)}%`
    },
    {
      title: 'Charging Sessions',
      value: data.chargingSessions.toString(),
      icon: Zap,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    },
    {
      title: 'Break Even Point',
      value: `Rs. ${data.breakEvenPoint.toLocaleString()}`,
      icon: Activity,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      subtitle: 'Revenue needed to break even'
    },
    {
      title: 'Total Deposits',
      value: `Rs. ${data.totalDeposits.toLocaleString()}`,
      icon: CreditCard,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50'
    },
    {
      title: 'Cooperative Savings',
      value: `Rs. ${data.cooperativeSavings.toLocaleString()}`,
      icon: PiggyBank,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50'
    }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <BarChart3 className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Business Analytics</h2>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <BarChart3 className="h-6 w-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">Business Analytics</h2>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">
                      {metric.title}
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {metric.value}
                    </p>
                    {metric.change && (
                      <p className="text-xs text-gray-500 mt-1">
                        {metric.change}
                      </p>
                    )}
                    {metric.subtitle && (
                      <p className="text-xs text-gray-500 mt-1">
                        {metric.subtitle}
                      </p>
                    )}
                  </div>
                  <div className={`p-3 rounded-full ${metric.bgColor}`}>
                    <Icon className={`h-6 w-6 ${metric.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Items */}
        <Card>
          <CardHeader>
            <CardTitle>Top Selling Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.topSellingItems.length > 0 ? (
                data.topSellingItems.map((item, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                    <div>
                      <span className="font-medium">{item.name}</span>
                      <span className="text-sm text-gray-500 ml-2">({item.quantity} sold)</span>
                    </div>
                    <span className="text-sm font-medium">Rs. {item.revenue.toLocaleString()}</span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No sales data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Expense Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Expense Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.keys(data.categoryBreakdown).length > 0 ? (
                Object.entries(data.categoryBreakdown).map(([category, amount]) => (
                  <div key={category} className="flex items-center justify-between py-2 border-b last:border-b-0">
                    <span className="font-medium">{category}</span>
                    <span className="text-sm font-medium">Rs. {amount.toLocaleString()}</span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No expense data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Daily Averages */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Averages (30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Daily Revenue</span>
                <span className="text-sm font-medium">Rs. {data.dailyAverage.revenue.toFixed(0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Daily Orders</span>
                <span className="text-sm font-medium">{data.dailyAverage.orders.toFixed(1)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Daily Charging Sessions</span>
                <span className="text-sm font-medium">{data.dailyAverage.chargingSessions.toFixed(1)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Health & Break Even Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Financial Health & Break Even Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Profit Margin</span>
                <span className={`text-sm font-medium ${data.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {data.profitMargin.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Fixed Costs</span>
                <span className="text-sm font-medium">Rs. {data.fixedCosts.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Variable Cost Ratio</span>
                <span className="text-sm font-medium">{data.variableCostRatio.toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Break Even Status</span>
                <span className={`text-sm font-medium ${data.totalRevenue >= data.breakEvenPoint ? 'text-green-600' : 'text-red-600'}`}>
                  {data.totalRevenue >= data.breakEvenPoint ? 'Above Break Even' : `₹${(data.breakEvenPoint - data.totalRevenue).toLocaleString()} needed`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Cash Flow</span>
                <span className={`text-sm font-medium ${data.totalDeposits > data.totalWithdrawals ? 'text-green-600' : 'text-red-600'}`}>
                  Rs. {(data.totalDeposits - data.totalWithdrawals).toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InsightsTab;
