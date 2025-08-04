import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/unifiedCalculations";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

interface AllTimeSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  summaryData?: any;
  onDateRangeChange?: (dateRange: any) => void;
}

interface AllTimeSummaryData {
  totalIncome: number;
  totalIncomeFromOrders: number;
  totalIncomeFromCharging: number;
  totalExpenses: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalSavings: number;

  // Payment mode breakdowns
  cashIncome: number;
  esewaIncome: number;
  fonepayIncome: number;

  cashExpenses: number;
  esewaExpenses: number;
  fonepayExpenses: number;

  // Current balances
  cashBalance: number;
  esewaBalance: number;
  fonepayBalance: number;
  cooperativeBalance: number;
  totalBalance: number;

  // Additional metrics
  netProfit: number;
  cooperativeWithdrawals: number;
  bankWithdrawals: number;
}

export const AllTimeSummaryModal: React.FC<AllTimeSummaryModalProps> = ({
  isOpen,
  onClose,
  summaryData,
  onDateRangeChange
}) => {
  const { user } = useAuth();
  const [allTimeData, setAllTimeData] = useState<AllTimeSummaryData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAllTimeData = async () => {
    if (!user?.id) return;

    setLoading(true);
    console.log('Fetching all-time summary data for user:', user.id);

    try {
      // Fetch all orders data
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('total, payment_mode')
        .eq('user_id', user.id);

      if (ordersError) console.error('Orders fetch error:', ordersError);

      // Fetch all charging data
      const { data: chargingData, error: chargingError } = await supabase
        .from('charging_sessions')
        .select('total_amount, payment_mode')
        .eq('user_id', user.id);

      if (chargingError) console.error('Charging fetch error:', chargingError);

      // Fetch all expenses data
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('amount, payment_mode')
        .eq('user_id', user.id);

      if (expensesError) console.error('Expenses fetch error:', expensesError);

      // Fetch all deposits data
      const { data: depositsData, error: depositsError } = await supabase
        .from('deposits')
        .select('amount, mode')
        .eq('user_id', user.id);

      if (depositsError) console.error('Deposits fetch error:', depositsError);

      // Fetch all withdrawals data
      const { data: withdrawalsData, error: withdrawalsError } = await supabase
        .from('withdrawals')
        .select('amount, payment_mode, withdrawal_from')
        .eq('user_id', user.id);

      if (withdrawalsError) console.error('Withdrawals fetch error:', withdrawalsError);

      // Fetch all cooperative savings data
      const { data: savingsData, error: savingsError } = await supabase
        .from('cooperative_savings')
        .select('contribution_amount, payment_mode')
        .eq('user_id', user.id);

      if (savingsError) console.error('Savings fetch error:', savingsError);

      // Calculate totals
      const totalIncomeFromOrders = ordersData?.reduce((sum, order) => sum + Number(order.total), 0) || 0;
      const totalIncomeFromCharging = chargingData?.reduce((sum, charge) => sum + Number(charge.total_amount), 0) || 0;
      const totalIncome = totalIncomeFromOrders + totalIncomeFromCharging;

      const totalExpenses = expensesData?.reduce((sum, expense) => sum + Number(expense.amount), 0) || 0;
      const totalDeposits = depositsData?.reduce((sum, deposit) => sum + Number(deposit.amount), 0) || 0;
      const totalWithdrawals = withdrawalsData?.reduce((sum, withdrawal) => sum + Number(withdrawal.amount), 0) || 0;
      const totalSavings = savingsData?.reduce((sum, saving) => sum + Number(saving.contribution_amount), 0) || 0;

      // Calculate payment mode breakdowns
      const calculatePaymentModeBreakdown = (data: any[], amountField: string, paymentField: string) => {
        return data?.reduce((acc, item) => {
          const amount = Number(item[amountField]) || 0;
          const mode = (item[paymentField] || '').toLowerCase();

          if (mode.includes('cash')) acc.cash += amount;
          else if (mode.includes('esewa')) acc.esewa += amount;
          else if (mode.includes('fonepay')) acc.fonepay += amount;
          else acc.cash += amount; // Default to cash

          return acc;
        }, { cash: 0, esewa: 0, fonepay: 0 });
      };

      const ordersBreakdown = calculatePaymentModeBreakdown(ordersData || [], 'total', 'payment_mode');
      const chargingBreakdown = calculatePaymentModeBreakdown(chargingData || [], 'total_amount', 'payment_mode');
      const expensesBreakdown = calculatePaymentModeBreakdown(expensesData || [], 'amount', 'payment_mode');

      const cashIncome = ordersBreakdown.cash + chargingBreakdown.cash;
      const esewaIncome = ordersBreakdown.esewa + chargingBreakdown.esewa;
      const fonepayIncome = ordersBreakdown.fonepay + chargingBreakdown.fonepay;

      // Calculate withdrawal breakdowns
      const cooperativeWithdrawals = withdrawalsData?.filter(w => w.withdrawal_from === 'Cooperative')
        .reduce((sum, w) => sum + Number(w.amount), 0) || 0;
      const bankWithdrawals = withdrawalsData?.filter(w => w.withdrawal_from === 'Bank')
        .reduce((sum, w) => sum + Number(w.amount), 0) || 0;

      // Calculate current balances
      const cashBalance = cashIncome - expensesBreakdown.cash - totalDeposits;
      const esewaBalance = esewaIncome - expensesBreakdown.esewa + totalDeposits;
      const fonepayBalance = fonepayIncome - expensesBreakdown.fonepay;
      const cooperativeBalance = totalSavings - cooperativeWithdrawals;
      const totalBalance = cashBalance + esewaBalance + fonepayBalance + cooperativeBalance;

      const netProfit = totalIncome - totalExpenses;

      const calculatedData: AllTimeSummaryData = {
        totalIncome,
        totalIncomeFromOrders,
        totalIncomeFromCharging,
        totalExpenses,
        totalDeposits,
        totalWithdrawals,
        totalSavings,
        cashIncome,
        esewaIncome,
        fonepayIncome,
        cashExpenses: expensesBreakdown.cash,
        esewaExpenses: expensesBreakdown.esewa,
        fonepayExpenses: expensesBreakdown.fonepay,
        cashBalance,
        esewaBalance,
        fonepayBalance,
        cooperativeBalance,
        totalBalance,
        netProfit,
        cooperativeWithdrawals,
        bankWithdrawals
      };

      console.log('All-time calculated data:', calculatedData);
      setAllTimeData(calculatedData);
    } catch (error) {
      console.error('Error fetching all-time data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && user?.id) {
      fetchAllTimeData();
    }
  }, [isOpen, user?.id]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>All-Time Financial Summary</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading all-time summary...</span>
          </div>
        ) : allTimeData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Income Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">Total Income</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold">{formatCurrency(allTimeData.totalIncome)}</div>
                  <div className="space-y-1 text-sm">
                    <div>Orders: {formatCurrency(allTimeData.totalIncomeFromOrders)}</div>
                    <div>Charging: {formatCurrency(allTimeData.totalIncomeFromCharging)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Income by Payment Mode */}
            <Card>
              <CardHeader>
                <CardTitle>Income by Payment Mode</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-orange-600">Cash:</span>
                    <span>{formatCurrency(allTimeData.cashIncome)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-600">eSewa:</span>
                    <span>{formatCurrency(allTimeData.esewaIncome)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-600">Fonepay:</span>
                    <span>{formatCurrency(allTimeData.fonepayIncome)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Expenses Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">Total Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold">{formatCurrency(allTimeData.totalExpenses)}</div>
                  <div className="space-y-1 text-sm">
                    <div>Cash: {formatCurrency(allTimeData.cashExpenses)}</div>
                    <div>eSewa: {formatCurrency(allTimeData.esewaExpenses)}</div>
                    <div>Fonepay: {formatCurrency(allTimeData.fonepayExpenses)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Other Transactions */}
            <Card>
              <CardHeader>
                <CardTitle>Other Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Deposits:</span>
                    <span className="text-blue-600">{formatCurrency(allTimeData.totalDeposits)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Withdrawals:</span>
                    <span className="text-red-600">{formatCurrency(allTimeData.totalWithdrawals)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Savings:</span>
                    <span className="text-purple-600">{formatCurrency(allTimeData.totalSavings)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Current Balances */}
            <Card>
              <CardHeader>
                <CardTitle>Current Balances</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-orange-600">Cash:</span>
                    <span className={allTimeData.cashBalance < 0 ? 'text-red-600' : ''}>{formatCurrency(allTimeData.cashBalance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-600">eSewa:</span>
                    <span className={allTimeData.esewaBalance < 0 ? 'text-red-600' : ''}>{formatCurrency(allTimeData.esewaBalance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-600">Fonepay:</span>
                    <span className={allTimeData.fonepayBalance < 0 ? 'text-red-600' : ''}>{formatCurrency(allTimeData.fonepayBalance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-600">Cooperative:</span>
                    <span className={allTimeData.cooperativeBalance < 0 ? 'text-red-600' : ''}>{formatCurrency(allTimeData.cooperativeBalance)}</span>
                  </div>
                  <hr className="my-2" />
                  <div className="flex justify-between font-bold">
                    <span>Total Balance:</span>
                    <span className={allTimeData.totalBalance < 0 ? 'text-red-600' : 'text-green-600'}>
                      {formatCurrency(allTimeData.totalBalance)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Net Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Net Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Net Profit:</span>
                    <span className={allTimeData.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(allTimeData.netProfit)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cooperative Withdrawals:</span>
                    <span className="text-red-600">{formatCurrency(allTimeData.cooperativeWithdrawals)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Bank Withdrawals:</span>
                    <span className="text-red-600">{formatCurrency(allTimeData.bankWithdrawals)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
