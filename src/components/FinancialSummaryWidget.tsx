
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

interface FinancialSummary {
  total_income: number;
  total_expenses: number;
  total_deposits: number;
  total_withdrawals: number;
  net_profit: number;
}

const FinancialSummaryWidget = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<FinancialSummary>({
    total_income: 0,
    total_expenses: 0,
    total_deposits: 0,
    total_withdrawals: 0,
    net_profit: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchFinancialSummary();
    }
  }, [user]);

  const fetchFinancialSummary = async () => {
    try {
      setLoading(true);

      // Get current date range (last 30 days)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      // Fetch orders
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("total")
        .gte("order_date", startDate.toISOString().split('T')[0])
        .lte("order_date", endDate.toISOString().split('T')[0]);

      if (ordersError) throw ordersError;

      // Fetch charging sessions
      const { data: charging, error: chargingError } = await supabase
        .from("charging_sessions")
        .select("total_amount")
        .gte("session_date", startDate.toISOString().split('T')[0])
        .lte("session_date", endDate.toISOString().split('T')[0]);

      if (chargingError) throw chargingError;

      // Fetch expenses
      const { data: expenses, error: expensesError } = await supabase
        .from("expenses")
        .select("amount")
        .gte("expense_date", startDate.toISOString().split('T')[0])
        .lte("expense_date", endDate.toISOString().split('T')[0]);

      if (expensesError) throw expensesError;

      // Fetch deposits
      const { data: deposits, error: depositsError } = await supabase
        .from("deposits")
        .select("amount")
        .gte("deposit_date", startDate.toISOString().split('T')[0])
        .lte("deposit_date", endDate.toISOString().split('T')[0]);

      if (depositsError) throw depositsError;

      // Fetch withdrawals
      const { data: withdrawals, error: withdrawalsError } = await supabase
        .from("withdrawals")
        .select("amount")
        .gte("withdrawal_date", startDate.toISOString().split('T')[0])
        .lte("withdrawal_date", endDate.toISOString().split('T')[0]);

      if (withdrawalsError) throw withdrawalsError;

      // Calculate totals
      const totalOrderIncome = orders?.reduce((sum, order) => sum + (order.total || 0), 0) || 0;
      const totalChargingIncome = charging?.reduce((sum, session) => sum + (session.total_amount || 0), 0) || 0;
      const totalIncome = totalOrderIncome + totalChargingIncome;
      
      const totalExpenses = expenses?.reduce((sum, expense) => sum + (expense.amount || 0), 0) || 0;
      const totalDeposits = deposits?.reduce((sum, deposit) => sum + (deposit.amount || 0), 0) || 0;
      const totalWithdrawals = withdrawals?.reduce((sum, withdrawal) => sum + (withdrawal.amount || 0), 0) || 0;
      
      const netProfit = totalIncome - totalExpenses;

      setSummary({
        total_income: totalIncome,
        total_expenses: totalExpenses,
        total_deposits: totalDeposits,
        total_withdrawals: totalWithdrawals,
        net_profit: netProfit,
      });

    } catch (error) {
      console.error("Error fetching financial summary:", error);
      toast.error("Failed to load financial summary");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NP", {
      style: "currency",
      currency: "NPR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Financial Summary (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial Summary (Last 30 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-green-600">Total Income</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(summary.total_income)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-red-600">Total Expenses</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(summary.total_expenses)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-blue-600">Total Deposits</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(summary.total_deposits)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-orange-600">Total Withdrawals</p>
              <p className="text-2xl font-bold text-orange-600">
                {formatCurrency(summary.total_withdrawals)}
              </p>
            </div>
          </div>
          
          <div className="pt-4 border-t">
            <div>
              <p className="text-sm font-medium">Net Profit</p>
              <p className={`text-3xl font-bold ${summary.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(summary.net_profit)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FinancialSummaryWidget;
