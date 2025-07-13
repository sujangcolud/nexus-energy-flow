import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import Chatbot from "@/components/Chatbot";
import { DollarSign, TrendingDown, Users, Activity } from "lucide-react";

interface DashboardStats {
  totalRevenue: number;
  totalExpenses: number;
  newUsers: number;
  activeNow: number;
}

const SuperAdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Call the database functions directly
        const [revenueResult, expensesResult, usersResult] = await Promise.all([
          supabase.rpc('get_total_revenue'),
          supabase.rpc('get_total_expenses'),
          supabase.rpc('get_new_users')
        ]);

        if (revenueResult.error) throw revenueResult.error;
        if (expensesResult.error) throw expensesResult.error;
        if (usersResult.error) throw usersResult.error;

        setStats({
          totalRevenue: revenueResult.data || 0,
          totalExpenses: expensesResult.data || 0,
          newUsers: usersResult.data || 0,
          activeNow: 0 // Placeholder for now
        });
      } catch (err: any) {
        console.error('Error fetching dashboard stats:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 mb-2">Error loading dashboard data</p>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Revenue",
      value: `NRs. ${stats?.totalRevenue?.toFixed(2) || '0.00'}`,
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "Total Expenses",
      value: `NRs. ${stats?.totalExpenses?.toFixed(2) || '0.00'}`,
      icon: TrendingDown,
      color: "text-red-600",
      bgColor: "bg-red-50"
    },
    {
      title: "New Users (30 days)",
      value: `${stats?.newUsers || 0}`,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Active Now",
      value: `${stats?.activeNow || 0}`,
      icon: Activity,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Activity className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">Super Admin Dashboard</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-full ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                <p className="text-xs text-gray-500 mt-1">
                  Real-time data
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Financial Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Net Profit/Loss:</span>
                <span className={`font-semibold ${(stats.totalRevenue - stats.totalExpenses) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  NRs. {(stats.totalRevenue - stats.totalExpenses).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Profit Margin:</span>
                <span className="font-semibold">
                  {stats.totalRevenue > 0 ? (((stats.totalRevenue - stats.totalExpenses) / stats.totalRevenue) * 100).toFixed(1) : '0.0'}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      <div className="mt-4">
        <Chatbot />
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
