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

interface AllTimeSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
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
  
  // Withdrawal breakdowns
  cooperativeWithdrawals: number;
  bankWithdrawals: number;
}

export const AllTimeSummaryModal: React.FC<AllTimeSummaryModalProps> = ({
  isOpen,
  onClose,
  userId
}) => {
  const [summaryData, setSummaryData] = useState<AllTimeSummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const fetchAllTimeSummary = async (start?: Date, end?: Date) => {
    setLoading(true);
    try {
      let dateFilter = '';
      if (start && end) {
        dateFilter = `and created_at >= '${start.toISOString()}' and created_at <= '${end.toISOString()}'`;
      }

      // Fetch orders data
      const { data: ordersData } = await supabase
        .from('orders')
        .select('total, payment_mode')
        .eq('user_id', userId)
        .gte(start ? 'created_at' : 'id', start ? start.toISOString() : '00000000-0000-0000-0000-000000000000')
        .lte(end ? 'created_at' : 'id', end ? end.toISOString() : 'ffffffff-ffff-ffff-ffff-ffffffffffff');

      // Fetch charging data
      const { data: chargingData } = await supabase
        .from('charging_sessions')
        .select('total_amount, payment_mode')
        .eq('user_id', userId)
        .gte(start ? 'created_at' : 'id', start ? start.toISOString() : '00000000-0000-0000-0000-000000000000')
        .lte(end ? 'created_at' : 'id', end ? end.toISOString() : 'ffffffff-ffff-ffff-ffff-ffffffffffff');

      // Fetch expenses data
      const { data: expensesData } = await supabase
        .from('expenses')
        .select('amount, payment_mode')
        .eq('user_id', userId)
        .gte(start ? 'created_at' : 'id', start ? start.toISOString() : '00000000-0000-0000-0000-000000000000')
        .lte(end ? 'created_at' : 'id', end ? end.toISOString() : 'ffffffff-ffff-ffff-ffff-ffffffffffff');

      // Fetch deposits data
      const { data: depositsData } = await supabase
        .from('deposits')
        .select('amount, mode')
        .eq('user_id', userId)
        .gte(start ? 'created_at' : 'id', start ? start.toISOString() : '00000000-0000-0000-0000-000000000000')
        .lte(end ? 'created_at' : 'id', end ? end.toISOString() : 'ffffffff-ffff-ffff-ffff-ffffffffffff');

      // Fetch withdrawals data
      const { data: withdrawalsData } = await supabase
        .from('withdrawals')
        .select('amount, payment_mode, withdrawal_from')
        .eq('user_id', userId)
        .gte(start ? 'created_at' : 'id', start ? start.toISOString() : '00000000-0000-0000-0000-000000000000')
        .lte(end ? 'created_at' : 'id', end ? end.toISOString() : 'ffffffff-ffff-ffff-ffff-ffffffffffff');

      // Fetch cooperative savings data
      const { data: savingsData } = await supabase
        .from('cooperative_savings')
        .select('contribution_amount, payment_mode')
        .eq('user_id', userId)
        .gte(start ? 'created_at' : 'id', start ? start.toISOString() : '00000000-0000-0000-0000-000000000000')
        .lte(end ? 'created_at' : 'id', end ? end.toISOString() : 'ffffffff-ffff-ffff-ffff-ffffffffffff');

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

      // Calculate current balances (CORRECTED COOPERATIVE BALANCE)
      const cashBalance = cashIncome - expensesBreakdown.cash - totalDeposits;
      const esewaBalance = esewaIncome - expensesBreakdown.esewa + totalDeposits;
      const fonepayBalance = fonepayIncome - expensesBreakdown.fonepay;
      const cooperativeBalance = totalSavings - cooperativeWithdrawals; // FIXED: Deduct cooperative withdrawals from total savings
      const totalBalance = cashBalance + esewaBalance + fonepayBalance + cooperativeBalance;

      setSummaryData({
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
        cooperativeWithdrawals,
        bankWithdrawals
      });
    } catch (error) {
      console.error('Error fetching all-time summary:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAllTimeSummary(startDate, endDate);
    }
  }, [isOpen, userId, startDate, endDate]);

  const handleQuickSelect = (type: 'thisMonth' | 'thisYear' | 'allTime') => {
    const now = new Date();
    switch (type) {
      case 'thisMonth':
        setStartDate(new Date(now.getFullYear(), now.getMonth(), 1));
        setEndDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
        break;
      case 'thisYear':
        setStartDate(new Date(now.getFullYear(), 0, 1));
        setEndDate(new Date(now.getFullYear(), 11, 31));
        break;
      case 'allTime':
        setStartDate(undefined);
        setEndDate(undefined);
        break;
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>All-Time Financial Summary</DialogTitle>
        </DialogHeader>

        {/* Date Range Selection */}
        <div className="flex flex-wrap gap-4 items-center border-b pb-4">
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[180px] justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP") : "Start date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[180px] justify-start text-left font-normal",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "PPP") : "End date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleQuickSelect('thisMonth')}>
              This Month
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleQuickSelect('thisYear')}>
              This Year
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleQuickSelect('allTime')}>
              All Time
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading summary data...</span>
          </div>
        ) : summaryData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Income Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">Total Income</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold">{formatCurrency(summaryData.totalIncome)}</div>
                  <div className="space-y-1 text-sm">
                    <div>Orders: {formatCurrency(summaryData.totalIncomeFromOrders)}</div>
                    <div>Charging: {formatCurrency(summaryData.totalIncomeFromCharging)}</div>
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
                    <span>{formatCurrency(summaryData.cashIncome)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-600">eSewa:</span>
                    <span>{formatCurrency(summaryData.esewaIncome)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-600">Fonepay:</span>
                    <span>{formatCurrency(summaryData.fonepayIncome)}</span>
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
                  <div className="text-2xl font-bold">{formatCurrency(summaryData.totalExpenses)}</div>
                  <div className="space-y-1 text-sm">
                    <div>Cash: {formatCurrency(summaryData.cashExpenses)}</div>
                    <div>eSewa: {formatCurrency(summaryData.esewaExpenses)}</div>
                    <div>Fonepay: {formatCurrency(summaryData.fonepayExpenses)}</div>
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
                    <span className="text-blue-600">{formatCurrency(summaryData.totalDeposits)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Withdrawals:</span>
                    <span className="text-red-600">{formatCurrency(summaryData.totalWithdrawals)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Savings:</span>
                    <span className="text-purple-600">{formatCurrency(summaryData.totalSavings)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Current Balances - FIXED */}
            <Card>
              <CardHeader>
                <CardTitle>Current Balances</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-orange-600">Cash:</span>
                    <span className={summaryData.cashBalance < 0 ? 'text-red-600' : ''}>{formatCurrency(summaryData.cashBalance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-600">eSewa:</span>
                    <span className={summaryData.esewaBalance < 0 ? 'text-red-600' : ''}>{formatCurrency(summaryData.esewaBalance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-600">Fonepay:</span>
                    <span className={summaryData.fonepayBalance < 0 ? 'text-red-600' : ''}>{formatCurrency(summaryData.fonepayBalance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-600">Cooperative:</span>
                    <span className={summaryData.cooperativeBalance < 0 ? 'text-red-600' : ''}>{formatCurrency(summaryData.cooperativeBalance)}</span>
                  </div>
                  <hr className="my-2" />
                  <div className="flex justify-between font-bold">
                    <span>Total Balance:</span>
                    <span className={summaryData.totalBalance < 0 ? 'text-red-600' : 'text-green-600'}>
                      {formatCurrency(summaryData.totalBalance)}
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
                    <span className={(summaryData.totalIncome - summaryData.totalExpenses) >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(summaryData.totalIncome - summaryData.totalExpenses)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cooperative Withdrawals:</span>
                    <span className="text-red-600">{formatCurrency(summaryData.cooperativeWithdrawals)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Bank Withdrawals:</span>
                    <span className="text-red-600">{formatCurrency(summaryData.bankWithdrawals)}</span>
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
