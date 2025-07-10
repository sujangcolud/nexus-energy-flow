
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Users, Activity } from 'lucide-react';

const InsightsTab = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    ordersCount: 0,
    chargingSessions: 0,
    activeMembers: 0
  });

  useEffect(() => {
    // Mock data loading
    const loadInsights = async () => {
      setLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setData({
        totalRevenue: 125000,
        totalExpenses: 85000,
        netProfit: 40000,
        ordersCount: 245,
        chargingSessions: 89,
        activeMembers: 32
      });
      setLoading(false);
    };

    loadInsights();
  }, []);

  const metrics = [
    {
      title: 'Total Revenue',
      value: `Rs. ${data.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
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
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Total Orders',
      value: data.ordersCount.toString(),
      icon: Activity,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Charging Sessions',
      value: data.chargingSessions.toString(),
      icon: BarChart3,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    },
    {
      title: 'Active Members',
      value: data.activeMembers.toString(),
      icon: Users,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50'
    }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <BarChart3 className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Business Insights</h2>
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
        <h2 className="text-2xl font-bold text-gray-900">Business Insights</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-gray-600">New order placed</span>
                <span className="text-sm font-medium">Rs. 450</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-gray-600">Charging session completed</span>
                <span className="text-sm font-medium">Rs. 280</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-gray-600">Expense recorded</span>
                <span className="text-sm font-medium text-red-600">-Rs. 150</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-600">New member joined</span>
                <span className="text-sm font-medium text-green-600">+1</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Revenue Growth</span>
                <span className="text-sm font-medium text-green-600">+12.5%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Order Volume</span>
                <span className="text-sm font-medium text-blue-600">+8.3%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Energy Consumption</span>
                <span className="text-sm font-medium text-yellow-600">1,234 kWh</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Cost Efficiency</span>
                <span className="text-sm font-medium text-green-600">Improved</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InsightsTab;
