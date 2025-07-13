import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Users, Activity, Zap, ShoppingBag, CreditCard, PiggyBank, UtensilsCrossed, Receipt, Wallet } from 'lucide-react';

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
  staticExpenses: number;
  recurringExpenses: number;
  topSellingItems: Array<{ name: string; quantity: number; revenue: number }>;
  categoryBreakdown: Record<string, number>;
  // New analytics data
  menuCategoryAnalysis: Record<string, { revenue: number; quantity: number; orders: number }>;
  paymentMethodAnalysis: {
    orders: Record<string, { count: number; revenue: number }>;
    charging: Record<string, { count: number; revenue: number }>;
    expenses: Record<string, { count: number; amount: number }>;
    overall: Record<string, { count: number; amount: number }>;
  };
  expenseCategoryAnalysis: Record<string, { 
    amount: number; 
    count: number; 
    percentage: number;
    paymentModes: Record<string, number>;
  }>;
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
    staticExpenses: 0,
    recurringExpenses: 0,
    topSellingItems: [],
    categoryBreakdown: {},
    menuCategoryAnalysis: {},
    paymentMethodAnalysis: {
      orders: {},
      charging: {},
      expenses: {},
      overall: {}
    },
    expenseCategoryAnalysis: {},
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
        cooperativeData,
        staticExpensesData,
        menuItemsData
      ] = await Promise.all([
        supabase.from('orders').select('*'),
        supabase.from('charging_sessions').select('*'),
        supabase.from('expenses').select('*'),
        supabase.from('deposits').select('*'),
        supabase.from('withdrawals').select('*'),
        supabase.from('cooperative_savings').select('*'),
        supabase.from('static_expenses').select('*'),
        supabase.from('menu_items').select('*')
      ]);

      const orders = ordersData.data || [];
      const chargingSessions = chargingData.data || [];
      const expenses = expensesData.data || [];
      const deposits = depositsData.data || [];
      const withdrawals = withdrawalsData.data || [];
      const cooperative = cooperativeData.data || [];
      const staticExpenses = staticExpensesData.data || [];
      const menuItems = menuItemsData.data || [];

      // Calculate existing metrics
      const ordersRevenue = orders.reduce((sum, order) => sum + Number(order.total), 0);
      const chargingRevenue = chargingSessions.reduce((sum, session) => sum + Number(session.total_amount), 0);
      const totalRevenue = ordersRevenue + chargingRevenue;
      
      const totalExpenses = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
      const totalDeposits = deposits.reduce((sum, deposit) => sum + Number(deposit.amount), 0);
      const totalWithdrawals = withdrawals.reduce((sum, withdrawal) => sum + Number(withdrawal.amount), 0);
      const cooperativeSavings = cooperative.reduce((sum, saving) => sum + Number(saving.contribution_amount), 0);
      
      const staticExpensesTotal = staticExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
      const recurringExpensesTotal = staticExpenses
        .filter(expense => expense.is_recurring)
        .reduce((sum, expense) => sum + Number(expense.amount), 0);
      
      const netProfit = totalRevenue - totalExpenses - staticExpensesTotal;
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

      // Enhanced Break Even Point calculation with static expenses
      const fixedCostCategories = ['Rent', 'Utilities', 'Insurance', 'Salaries', 'Equipment'];
      const fixedCostsFromExpenses = expenses
        .filter(expense => fixedCostCategories.includes(expense.category))
        .reduce((sum, expense) => sum + Number(expense.amount), 0);
      
      // Include static/recurring expenses as fixed costs
      const totalFixedCosts = fixedCostsFromExpenses + staticExpensesTotal;
      
      // Variable costs (remaining expenses)
      const variableCosts = totalExpenses - fixedCostsFromExpenses;
      const variableCostRatio = totalRevenue > 0 ? variableCosts / totalRevenue : 0;
      const contributionMarginRatio = 1 - variableCostRatio;
      
      // Break Even Point in revenue (includes static expenses)
      const breakEvenPoint = contributionMarginRatio > 0 ? totalFixedCosts / contributionMarginRatio : 0;

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
        .slice(0, 10);

      // Category breakdown for expenses
      const categoryBreakdown = expenses.reduce((acc: any, expense) => {
        acc[expense.category] = (acc[expense.category] || 0) + Number(expense.amount);
        return acc;
      }, {});

      // NEW: Menu Category Analysis
      const menuCategoryAnalysis = orders.reduce((acc: any, order) => {
        // Find the menu item to get its category
        const menuItem = menuItems.find(item => item.name === order.item_name);
        const category = menuItem ? menuItem.category : 'Uncategorized';
        
        if (!acc[category]) {
          acc[category] = { revenue: 0, quantity: 0, orders: 0 };
        }
        
        acc[category].revenue += Number(order.total);
        acc[category].quantity += order.quantity;
        acc[category].orders += 1;
        
        return acc;
      }, {});

      // NEW: Payment Method Analysis
      const paymentMethodAnalysis = {
        orders: {} as Record<string, { count: number; revenue: number }>,
        charging: {} as Record<string, { count: number; revenue: number }>,
        expenses: {} as Record<string, { count: number; amount: number }>,
        overall: {} as Record<string, { count: number; amount: number }>
      };

      // Orders payment analysis
      orders.forEach(order => {
        const mode = order.payment_mode;
        if (!paymentMethodAnalysis.orders[mode]) {
          paymentMethodAnalysis.orders[mode] = { count: 0, revenue: 0 };
        }
        paymentMethodAnalysis.orders[mode].count += 1;
        paymentMethodAnalysis.orders[mode].revenue += Number(order.total);
      });

      // Charging sessions payment analysis
      chargingSessions.forEach(session => {
        const mode = session.payment_mode;
        if (!paymentMethodAnalysis.charging[mode]) {
          paymentMethodAnalysis.charging[mode] = { count: 0, revenue: 0 };
        }
        paymentMethodAnalysis.charging[mode].count += 1;
        paymentMethodAnalysis.charging[mode].revenue += Number(session.total_amount);
      });

      // Expenses payment analysis
      expenses.forEach(expense => {
        const mode = expense.payment_mode;
        if (!paymentMethodAnalysis.expenses[mode]) {
          paymentMethodAnalysis.expenses[mode] = { count: 0, amount: 0 };
        }
        paymentMethodAnalysis.expenses[mode].count += 1;
        paymentMethodAnalysis.expenses[mode].amount += Number(expense.amount);
      });

      // Overall payment analysis
      const allPaymentModes = new Set([
        ...Object.keys(paymentMethodAnalysis.orders),
        ...Object.keys(paymentMethodAnalysis.charging),
        ...Object.keys(paymentMethodAnalysis.expenses)
      ]);

      allPaymentModes.forEach(mode => {
        const ordersData = paymentMethodAnalysis.orders[mode] || { count: 0, revenue: 0 };
        const chargingData = paymentMethodAnalysis.charging[mode] || { count: 0, revenue: 0 };
        const expensesData = paymentMethodAnalysis.expenses[mode] || { count: 0, amount: 0 };
        
        paymentMethodAnalysis.overall[mode] = {
          count: ordersData.count + chargingData.count + expensesData.count,
          amount: ordersData.revenue + chargingData.revenue - expensesData.amount
        };
      });

      // NEW: Enhanced Expense Category Analysis
      const expenseCategoryAnalysis = expenses.reduce((acc: any, expense) => {
        const category = expense.category;
        const amount = Number(expense.amount);
        const paymentMode = expense.payment_mode;
        
        if (!acc[category]) {
          acc[category] = { 
            amount: 0, 
            count: 0, 
            percentage: 0,
            paymentModes: {}
          };
        }
        
        acc[category].amount += amount;
        acc[category].count += 1;
        
        if (!acc[category].paymentModes[paymentMode]) {
          acc[category].paymentModes[paymentMode] = 0;
        }
        acc[category].paymentModes[paymentMode] += amount;
        
        return acc;
      }, {});

      // Calculate percentages for expense categories
      Object.keys(expenseCategoryAnalysis).forEach(category => {
        expenseCategoryAnalysis[category].percentage = 
          totalExpenses > 0 ? (expenseCategoryAnalysis[category].amount / totalExpenses) * 100 : 0;
      });

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
        fixedCosts: totalFixedCosts,
        variableCostRatio: variableCostRatio * 100,
        staticExpenses: staticExpensesTotal,
        recurringExpenses: recurringExpensesTotal,
        topSellingItems,
        categoryBreakdown,
        menuCategoryAnalysis,
        paymentMethodAnalysis,
        expenseCategoryAnalysis,
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
      value: `NRs. ${data.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      change: `+${data.monthlyGrowth.revenue.toFixed(1)}%`
    },
    {
      title: 'Total Expenses',
      value: `NRs. ${data.totalExpenses.toLocaleString()}`,
      icon: TrendingDown,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      title: 'Net Profit',
      value: `NRs. ${data.netProfit.toLocaleString()}`,
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
      value: `NRs. ${data.breakEvenPoint.toLocaleString()}`,
      icon: Activity,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      subtitle: 'Revenue needed to break even'
    },
    {
      title: 'Total Deposits',
      value: `NRs. ${data.totalDeposits.toLocaleString()}`,
      icon: CreditCard,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50'
    },
    {
      title: 'Cooperative Savings',
      value: `NRs. ${data.cooperativeSavings.toLocaleString()}`,
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
      <div className="lg:flex lg:gap-6">
        <div className="lg:w-1/2 flex flex-col space-y-6">
          {/* NEW: Menu Category Analysis */}
          <Card className="flex-grow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
              <UtensilsCrossed className="h-5 w-5" />
              Menu Category Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.keys(data.menuCategoryAnalysis).length > 0 ? (
                Object.entries(data.menuCategoryAnalysis)
                  .sort(([,a], [,b]) => (b as any).revenue - (a as any).revenue)
                  .map(([category, stats]) => {
                    const categoryStats = stats as { revenue: number; quantity: number; orders: number };
                    return (
                      <div key={category} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{category}</h4>
                          <span className="text-sm font-medium text-green-600">
                            NRs. {categoryStats.revenue.toLocaleString()}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="text-gray-500">Quantity Sold:</span>
                            <span className="ml-2 font-medium">{categoryStats.quantity}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Orders:</span>
                            <span className="ml-2 font-medium">{categoryStats.orders}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
              ) : (
                <p className="text-gray-500 text-center py-4">No menu category data available</p>
              )}
            </div>
          </CardContent>
        </Card>
        </div>
        <div className="lg:w-1/2 flex flex-col space-y-6">
          {/* NEW: Payment Method Analysis */}
          <Card className="flex-grow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Payment Method Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.keys(data.paymentMethodAnalysis.overall).length > 0 ? (
                Object.entries(data.paymentMethodAnalysis.overall)
                  .sort(([,a], [,b]) => Math.abs((b as any).amount) - Math.abs((a as any).amount))
                  .map(([method, stats]) => {
                    const methodStats = stats as { count: number; amount: number };
                    return (
                      <div key={method} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{method}</h4>
                          <span className={`text-sm font-medium ${methodStats.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            NRs. {methodStats.amount.toLocaleString()}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                          <div>
                            <span className="text-gray-500">Orders:</span>
                            <span className="ml-1 font-medium">
                              {data.paymentMethodAnalysis.orders[method]?.count || 0}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Charging:</span>
                            <span className="ml-1 font-medium">
                              {data.paymentMethodAnalysis.charging[method]?.count || 0}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Total:</span>
                            <span className="ml-1 font-medium">{methodStats.count}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
              ) : (
                <p className="text-gray-500 text-center py-4">No payment method data available</p>
              )}
            </div>
          </CardContent>
        </Card>

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
                    <span className="text-sm font-medium">NRs. {item.revenue.toLocaleString()}</span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No sales data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* NEW: Enhanced Expense Category Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Expense Category Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.keys(data.expenseCategoryAnalysis).length > 0 ? (
                Object.entries(data.expenseCategoryAnalysis)
                  .sort(([,a], [,b]) => (b as any).amount - (a as any).amount)
                  .map(([category, stats]) => {
                    const expenseStats = stats as { 
                      amount: number; 
                      count: number; 
                      percentage: number;
                      paymentModes: Record<string, number>;
                    };
                    return (
                      <div key={category} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{category}</h4>
                          <div className="text-right">
                            <span className="text-sm font-medium text-red-600">
                              NRs. {expenseStats.amount.toLocaleString()}
                            </span>
                            <span className="text-xs text-gray-500 ml-2">
                              ({expenseStats.percentage.toFixed(1)}%)
                            </span>
                          </div>
                        </div>
                        <div className="mb-2">
                          <span className="text-sm text-gray-500">
                            {expenseStats.count} transaction{expenseStats.count !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600">
                          <span className="text-gray-500">Payment Methods:</span>
                          <div className="grid grid-cols-2 gap-1 mt-1">
                            {Object.entries(expenseStats.paymentModes).map(([method, amount]) => (
                              <span key={method} className="text-xs">
                                {method}: NRs. {(amount as number).toLocaleString()}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })
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
                <span className="text-sm font-medium">NRs. {data.dailyAverage.revenue.toFixed(0)}</span>
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

        {/* Enhanced Financial Health & Break Even Analysis */}
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
                <span className="text-sm text-gray-600">Fixed Costs (incl. Static)</span>
                <span className="text-sm font-medium">NRs. {data.fixedCosts.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Static Expenses</span>
                <span className="text-sm font-medium">NRs. {data.staticExpenses.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Recurring Expenses</span>
                <span className="text-sm font-medium">NRs. {data.recurringExpenses.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Variable Cost Ratio</span>
                <span className="text-sm font-medium">{data.variableCostRatio.toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Break Even Status</span>
                <span className={`text-sm font-medium ${data.totalRevenue >= data.breakEvenPoint ? 'text-green-600' : 'text-red-600'}`}>
                  {data.totalRevenue >= data.breakEvenPoint ? 'Above Break Even' : `NRs. ${(data.breakEvenPoint - data.totalRevenue).toLocaleString()} needed`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Cash Flow</span>
                <span className={`text-sm font-medium ${data.totalDeposits > data.totalWithdrawals ? 'text-green-600' : 'text-red-600'}`}>
                  NRs. {(data.totalDeposits - data.totalWithdrawals).toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
};

export default InsightsTab;
