import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ShoppingCart,
  Zap,
  Receipt,
  PiggyBank,
  TrendingDown,
  TrendingUp,
  DollarSign,
  Clock,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";

interface DailyEntryData {
  orders: any[];
  charging: any[];
  expenses: any[];
  deposits: any[];
  withdrawals: any[];
  cooperative: any[];
}

interface DailyEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  selectedUser?: string;
}

const DailyEntryModal = ({
  isOpen,
  onClose,
  selectedDate,
  selectedUser,
}: DailyEntryModalProps) => {
  const { user } = useAuth();
  const [dailyData, setDailyData] = useState<DailyEntryData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchDailyData = async () => {
    if (!user || !selectedDate) return;

    setLoading(true);
    try {
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
          .eq("order_date", selectedDate),
        supabase
          .from("charging_sessions")
          .select("*")
          .eq("user_id", targetUserId)
          .eq("session_date", selectedDate),
        supabase
          .from("expenses")
          .select("*")
          .eq("user_id", targetUserId)
          .eq("expense_date", selectedDate),
        supabase
          .from("deposits")
          .select("*")
          .eq("user_id", targetUserId)
          .eq("deposit_date", selectedDate),
        supabase
          .from("withdrawals")
          .select("*")
          .eq("user_id", targetUserId)
          .eq("withdrawal_date", selectedDate),
        supabase
          .from("cooperative_savings")
          .select("*")
          .eq("user_id", targetUserId)
          .eq("contribution_date", selectedDate),
      ]);

      setDailyData({
        orders: ordersData.data || [],
        charging: chargingData.data || [],
        expenses: expensesData.data || [],
        deposits: depositsData.data || [],
        withdrawals: withdrawalsData.data || [],
        cooperative: cooperativeData.data || [],
      });
    } catch (error) {
      console.error("Error fetching daily data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && selectedDate) {
      fetchDailyData();
    }
  }, [isOpen, selectedDate, selectedUser]);

  if (!dailyData && !loading) return null;

  const formatDate = (date: string) => {
    return format(new Date(date), "EEEE, MMMM do, yyyy");
  };

  const calculateTotals = () => {
    const orderTotal =
      dailyData?.orders.reduce((sum, order) => sum + order.total, 0) || 0;
    const chargingTotal =
      dailyData?.charging.reduce(
        (sum, session) => sum + session.total_amount,
        0,
      ) || 0;
    const expenseTotal =
      dailyData?.expenses.reduce((sum, expense) => sum + expense.amount, 0) ||
      0;
    const depositTotal =
      dailyData?.deposits.reduce((sum, deposit) => sum + deposit.amount, 0) ||
      0;
    const withdrawalTotal =
      dailyData?.withdrawals.reduce(
        (sum, withdrawal) => sum + withdrawal.amount,
        0,
      ) || 0;
    const cooperativeTotal =
      dailyData?.cooperative.reduce(
        (sum, saving) => sum + saving.contribution_amount,
        0,
      ) || 0;

    return {
      revenue: orderTotal + chargingTotal,
      expenses: expenseTotal,
      deposits: depositTotal,
      withdrawals: withdrawalTotal,
      cooperative: cooperativeTotal,
      netFlow:
        orderTotal +
        chargingTotal +
        depositTotal -
        (expenseTotal + withdrawalTotal),
    };
  };

  const totals = calculateTotals();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-black">
            Daily Entry Details - {formatDate(selectedDate)}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="h-8 w-8 text-primary animate-spin mr-3" />
            <span className="text-lg text-black">Loading daily data...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Daily Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Card className="border border-green-200 bg-green-50">
                <CardContent className="p-4 text-center">
                  <DollarSign className="h-6 w-6 mx-auto mb-2 text-green-600" />
                  <p className="text-sm text-green-700">Total Revenue</p>
                  <p className="text-xl font-bold text-green-800">
                    NRs. {totals.revenue.toLocaleString()}
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-red-200 bg-red-50">
                <CardContent className="p-4 text-center">
                  <Receipt className="h-6 w-6 mx-auto mb-2 text-red-600" />
                  <p className="text-sm text-red-700">Total Expenses</p>
                  <p className="text-xl font-bold text-red-800">
                    NRs. {totals.expenses.toLocaleString()}
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-blue-200 bg-blue-50">
                <CardContent className="p-4 text-center">
                  <TrendingUp className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                  <p className="text-sm text-blue-700">Net Cash Flow</p>
                  <p
                    className={`text-xl font-bold ${totals.netFlow >= 0 ? "text-blue-800" : "text-red-800"}`}
                  >
                    {totals.netFlow >= 0 ? "+" : ""}NRs.{" "}
                    {totals.netFlow.toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Tabs */}
            <Tabs defaultValue="orders" className="w-full">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="orders" className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Orders ({dailyData?.orders.length || 0})
                </TabsTrigger>
                <TabsTrigger
                  value="charging"
                  className="flex items-center gap-2"
                >
                  <Zap className="h-4 w-4" />
                  Charging ({dailyData?.charging.length || 0})
                </TabsTrigger>
                <TabsTrigger
                  value="expenses"
                  className="flex items-center gap-2"
                >
                  <Receipt className="h-4 w-4" />
                  Expenses ({dailyData?.expenses.length || 0})
                </TabsTrigger>
                <TabsTrigger
                  value="deposits"
                  className="flex items-center gap-2"
                >
                  <TrendingUp className="h-4 w-4" />
                  Deposits ({dailyData?.deposits.length || 0})
                </TabsTrigger>
                <TabsTrigger
                  value="withdrawals"
                  className="flex items-center gap-2"
                >
                  <TrendingDown className="h-4 w-4" />
                  Withdrawals ({dailyData?.withdrawals.length || 0})
                </TabsTrigger>
                <TabsTrigger
                  value="cooperative"
                  className="flex items-center gap-2"
                >
                  <PiggyBank className="h-4 w-4" />
                  Cooperative ({dailyData?.cooperative.length || 0})
                </TabsTrigger>
              </TabsList>

              {/* Orders Tab */}
              <TabsContent value="orders" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-black">
                      <ShoppingCart className="h-5 w-5" />
                      Restaurant Orders
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dailyData?.orders.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">
                        No orders on this date
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {dailyData?.orders.map((order, index) => (
                          <div
                            key={index}
                            className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                          >
                            <div>
                              <p className="font-medium text-black">
                                {order.item_name}
                              </p>
                              <p className="text-sm text-gray-600">
                                Qty: {order.quantity} | {order.payment_mode}
                              </p>
                              <p className="text-xs text-gray-500">
                                <Clock className="h-3 w-3 inline mr-1" />
                                {new Date(
                                  order.created_at,
                                ).toLocaleTimeString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-black">
                                NRs. {order.total}
                              </p>
                              <Badge variant="outline" className="text-xs">
                                {order.status || "Completed"}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Charging Tab */}
              <TabsContent value="charging" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-black">
                      <Zap className="h-5 w-5" />
                      EV Charging Sessions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dailyData?.charging.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">
                        No charging sessions on this date
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {dailyData?.charging.map((session, index) => (
                          <div
                            key={index}
                            className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                          >
                            <div>
                              <p className="font-medium text-black">
                                Session #{session.id}
                              </p>
                              <p className="text-sm text-gray-600">
                                Duration: {session.duration_minutes} min |{" "}
                                {session.payment_mode}
                              </p>
                              <p className="text-xs text-gray-500">
                                <Clock className="h-3 w-3 inline mr-1" />
                                {new Date(
                                  session.created_at,
                                ).toLocaleTimeString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-black">
                                NRs. {session.total_amount}
                              </p>
                              <p className="text-xs text-gray-600">
                                {session.energy_consumed} kWh
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Expenses Tab */}
              <TabsContent value="expenses" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-black">
                      <Receipt className="h-5 w-5" />
                      Business Expenses
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dailyData?.expenses.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">
                        No expenses on this date
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {dailyData?.expenses.map((expense, index) => (
                          <div
                            key={index}
                            className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                          >
                            <div>
                              <p className="font-medium text-black">
                                {expense.description}
                              </p>
                              <p className="text-sm text-gray-600">
                                Category: {expense.category} |{" "}
                                {expense.payment_mode}
                              </p>
                              <p className="text-xs text-gray-500">
                                <Clock className="h-3 w-3 inline mr-1" />
                                {new Date(
                                  expense.created_at,
                                ).toLocaleTimeString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-red-600">
                                -NRs. {expense.amount}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Deposits Tab */}
              <TabsContent value="deposits" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-black">
                      <TrendingUp className="h-5 w-5" />
                      Cash Deposits
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dailyData?.deposits.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">
                        No deposits on this date
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {dailyData?.deposits.map((deposit, index) => (
                          <div
                            key={index}
                            className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                          >
                            <div>
                              <p className="font-medium text-black">
                                {deposit.description || "Cash Deposit"}
                              </p>
                              <p className="text-sm text-gray-600">
                                Source: {deposit.source} | {deposit.mode}
                              </p>
                              <p className="text-xs text-gray-500">
                                <Clock className="h-3 w-3 inline mr-1" />
                                {new Date(
                                  deposit.created_at,
                                ).toLocaleTimeString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-green-600">
                                +NRs. {deposit.amount}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Withdrawals Tab */}
              <TabsContent value="withdrawals" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-black">
                      <TrendingDown className="h-5 w-5" />
                      Cash Withdrawals
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dailyData?.withdrawals.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">
                        No withdrawals on this date
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {dailyData?.withdrawals.map((withdrawal, index) => (
                          <div
                            key={index}
                            className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                          >
                            <div>
                              <p className="font-medium text-black">
                                {withdrawal.description || "Cash Withdrawal"}
                              </p>
                              <p className="text-sm text-gray-600">
                                Purpose: {withdrawal.purpose} |{" "}
                                {withdrawal.mode}
                              </p>
                              <p className="text-xs text-gray-500">
                                <Clock className="h-3 w-3 inline mr-1" />
                                {new Date(
                                  withdrawal.created_at,
                                ).toLocaleTimeString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-red-600">
                                -NRs. {withdrawal.amount}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Cooperative Tab */}
              <TabsContent value="cooperative" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-black">
                      <PiggyBank className="h-5 w-5" />
                      Cooperative Savings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dailyData?.cooperative.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">
                        No cooperative savings on this date
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {dailyData?.cooperative.map((saving, index) => (
                          <div
                            key={index}
                            className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                          >
                            <div>
                              <p className="font-medium text-black">
                                Cooperative Contribution
                              </p>
                              <p className="text-sm text-gray-600">
                                Member: {saving.member_name || "N/A"}
                              </p>
                              <p className="text-xs text-gray-500">
                                <Clock className="h-3 w-3 inline mr-1" />
                                {new Date(
                                  saving.created_at,
                                ).toLocaleTimeString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-blue-600">
                                NRs. {saving.contribution_amount}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DailyEntryModal;
