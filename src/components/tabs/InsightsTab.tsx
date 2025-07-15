import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, DollarSign, Activity } from "lucide-react";

const InsightsTab = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    totalOrders: 0,
    totalSessions: 0,
  });
  const [loading, setLoading] = useState(false);
  const [canEditTransactions, setCanEditTransactions] = useState(false);

  useEffect(() => {
    if (user) {
      fetchMetrics();
    }
    const canEdit = localStorage.getItem("canEditTransactions");
    if (canEdit) {
      setCanEditTransactions(JSON.parse(canEdit));
    }
  }, [user]);

  const fetchMetrics = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [orders, sessions, expenses] = await Promise.all([
        supabase.from("orders").select("total").eq("user_id", user.id),
        supabase
          .from("charging_sessions")
          .select("total_amount")
          .eq("user_id", user.id),
        supabase.from("expenses").select("amount").eq("user_id", user.id),
      ]);

      const totalRevenue =
        (orders.data || []).reduce(
          (sum, order) => sum + Number(order.total),
          0,
        ) +
        (sessions.data || []).reduce(
          (sum, session) => sum + Number(session.total_amount),
          0,
        );
      const totalExpenses = (expenses.data || []).reduce(
        (sum, expense) => sum + Number(expense.amount),
        0,
      );

      setMetrics({
        totalRevenue,
        totalExpenses,
        totalOrders: orders.data?.length || 0,
        totalSessions: sessions.data?.length || 0,
      });
    } catch (error) {
      console.error("Error fetching metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-primary rounded-xl">
          <BarChart3 className="h-6 w-6 text-black" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-black">Business Insights</h1>
          <p className="text-gray-600">Analytics and performance metrics</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-gray-500 mt-2">Loading insights...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">
                    Total Revenue
                  </p>
                  <p className="text-2xl font-bold text-black">
                    NRs. {metrics.totalRevenue.toFixed(2)}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-xl">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">
                    Total Expenses
                  </p>
                  <p className="text-2xl font-bold text-black">
                    NRs. {metrics.totalExpenses.toFixed(2)}
                  </p>
                </div>
                <div className="p-3 bg-red-100 rounded-xl">
                  <TrendingUp className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">
                    Total Orders
                  </p>
                  <p className="text-2xl font-bold text-black">
                    {metrics.totalOrders}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-xl">
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">
                    Charging Sessions
                  </p>
                  <p className="text-2xl font-bold text-black">
                    {metrics.totalSessions}
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Activity className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="border border-gray-200">
        <CardHeader className="bg-brand-50 border-b border-gray-200">
          <CardTitle className="text-black">Performance Summary</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-black mb-2">Net Profit</h3>
              <p className="text-2xl font-bold text-green-600">
                NRs. {(metrics.totalRevenue - metrics.totalExpenses).toFixed(2)}
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-black mb-2">Profit Margin</h3>
              <p className="text-2xl font-bold text-blue-600">
                {metrics.totalRevenue > 0
                  ? (
                      ((metrics.totalRevenue - metrics.totalExpenses) /
                        metrics.totalRevenue) *
                      100
                    ).toFixed(1)
                  : "0"}
                %
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InsightsTab;
