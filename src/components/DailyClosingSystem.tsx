
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2, Download } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/unifiedCalculations";
import { cn } from "@/lib/utils";
import { AllTimeSummaryModal } from './AllTimeSummaryModal';

interface DailyClosingSystemProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

interface DailyClosingData {
  selectedDate: Date;
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

export const DailyClosingSystem: React.FC<DailyClosingSystemProps> = ({
  isOpen,
  onClose,
  userId
}) => {
  const [closingData, setClosingData] = useState<DailyClosingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [isAllTimeSummaryOpen, setIsAllTimeSummaryOpen] = useState(false);

  const fetchDailyClosingData = async (date: Date, start?: Date, end?: Date) => {
    setLoading(true);
    console.log('Fetching daily closing data for:', { date, start, end, userId });
    
    try {
      const targetDate = start && end ? null : date;
      const startFilter = start || date;
      const endFilter = end || date;

      const startDateStr = startFilter.toISOString().split('T')[0];
      const endDateStr = endFilter.toISOString().split('T')[0];
      
      console.log('Date filters:', { startDateStr, endDateStr });

      // Fetch orders data - use order_date column
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('total, payment_mode, order_date')
        .eq('user_id', userId)
        .gte('order_date', startDateStr)
        .lte('order_date', endDateStr);

      if (ordersError) {
        console.error('Orders fetch error:', ordersError);
      }
      console.log('Orders data:', ordersData);

      // Fetch charging data - use session_date column
      const { data: chargingData, error: chargingError } = await supabase
        .from('charging_sessions')
        .select('total_amount, payment_mode, session_date')
        .eq('user_id', userId)
        .gte('session_date', startDateStr)
        .lte('session_date', endDateStr);

      if (chargingError) {
        console.error('Charging fetch error:', chargingError);
      }
      console.log('Charging data:', chargingData);

      // Fetch expenses data - use expense_date column
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('amount, payment_mode, expense_date')
        .eq('user_id', userId)
        .gte('expense_date', startDateStr)
        .lte('expense_date', endDateStr);

      if (expensesError) {
        console.error('Expenses fetch error:', expensesError);
      }
      console.log('Expenses data:', expensesData);

      // Fetch deposits data - use deposit_date column
      const { data: depositsData, error: depositsError } = await supabase
        .from('deposits')
        .select('amount, mode, deposit_date')
        .eq('user_id', userId)
        .gte('deposit_date', startDateStr)
        .lte('deposit_date', endDateStr);

      if (depositsError) {
        console.error('Deposits fetch error:', depositsError);
      }
      console.log('Deposits data:', depositsData);

      // Fetch withdrawals data - use withdrawal_date column
      const { data: withdrawalsData, error: withdrawalsError } = await supabase
        .from('withdrawals')
        .select('amount, payment_mode, withdrawal_from, withdrawal_date')
        .eq('user_id', userId)
        .gte('withdrawal_date', startDateStr)
        .lte('withdrawal_date', endDateStr);

      if (withdrawalsError) {
        console.error('Withdrawals fetch error:', withdrawalsError);
      }
      console.log('Withdrawals data:', withdrawalsData);

      // Fetch cooperative savings data - use contribution_date column
      const { data: savingsData, error: savingsError } = await supabase
        .from('cooperative_savings')
        .select('contribution_amount, payment_mode, contribution_date')
        .eq('user_id', userId)
        .gte('contribution_date', startDateStr)
        .lte('contribution_date', endDateStr);

      if (savingsError) {
        console.error('Savings fetch error:', savingsError);
      }
      console.log('Savings data:', savingsData);

      // Calculate totals
      const totalIncomeFromOrders = ordersData?.reduce((sum, order) => sum + Number(order.total), 0) || 0;
      const totalIncomeFromCharging = chargingData?.reduce((sum, charge) => sum + Number(charge.total_amount), 0) || 0;
      const totalIncome = totalIncomeFromOrders + totalIncomeFromCharging;
      
      const totalExpenses = expensesData?.reduce((sum, expense) => sum + Number(expense.amount), 0) || 0;
      const totalDeposits = depositsData?.reduce((sum, deposit) => sum + Number(deposit.amount), 0) || 0;
      const totalWithdrawals = withdrawalsData?.reduce((sum, withdrawal) => sum + Number(withdrawal.amount), 0) || 0;
      const totalSavings = savingsData?.reduce((sum, saving) => sum + Number(saving.contribution_amount), 0) || 0;

      console.log('Calculated totals:', {
        totalIncomeFromOrders,
        totalIncomeFromCharging,
        totalIncome,
        totalExpenses,
        totalDeposits,
        totalWithdrawals,
        totalSavings
      });

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

      // Calculate current balances (FIXED: Cooperative balance should deduct withdrawals from savings)
      const cashBalance = cashIncome - expensesBreakdown.cash - totalDeposits;
      const esewaBalance = esewaIncome - expensesBreakdown.esewa + totalDeposits;
      const fonepayBalance = fonepayIncome - expensesBreakdown.fonepay;
      const cooperativeBalance = totalSavings - cooperativeWithdrawals;
      const totalBalance = cashBalance + esewaBalance + fonepayBalance + cooperativeBalance;

      const netProfit = totalIncome - totalExpenses;

      const calculatedData = {
        selectedDate: targetDate || startFilter,
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

      console.log('Final calculated data:', calculatedData);
      setClosingData(calculatedData);
    } catch (error) {
      console.error('Error fetching daily closing data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && userId) {
      fetchDailyClosingData(selectedDate, startDate, endDate);
    }
  }, [isOpen, userId, selectedDate, startDate, endDate]);

  const handleQuickSelect = (type: 'today' | 'yesterday' | 'thisWeek' | 'thisMonth') => {
    const now = new Date();
    switch (type) {
      case 'today':
        setSelectedDate(now);
        setStartDate(undefined);
        setEndDate(undefined);
        break;
      case 'yesterday':
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        setSelectedDate(yesterday);
        setStartDate(undefined);
        setEndDate(undefined);
        break;
      case 'thisWeek':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        setStartDate(startOfWeek);
        setEndDate(endOfWeek);
        break;
      case 'thisMonth':
        setStartDate(new Date(now.getFullYear(), now.getMonth(), 1));
        setEndDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
        break;
    }
  };

  const handleAllTimeSummary = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsAllTimeSummaryOpen(true);
  };

  const handlePopoverClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              Daily Closing System
              {startDate && endDate ? (
                ` - ${format(startDate, "MMM d")} to ${format(endDate, "MMM d, yyyy")}`
              ) : (
                ` - ${format(selectedDate, "MMMM d, yyyy")}`
              )}
            </DialogTitle>
          </DialogHeader>

          {/* Date Selection and Controls */}
          <div className="flex flex-wrap gap-4 items-center border-b pb-4">
            <div className="flex gap-2">
              {!startDate && !endDate && (
                <Popover>
                  <PopoverTrigger asChild onClick={handlePopoverClick}>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[180px] justify-start text-left font-normal"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(selectedDate, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" onClick={handlePopoverClick}>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              )}

              <Popover>
                <PopoverTrigger asChild onClick={handlePopoverClick}>
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
                <PopoverContent className="w-auto p-0" onClick={handlePopoverClick}>
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild onClick={handlePopoverClick}>
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
                <PopoverContent className="w-auto p-0" onClick={handlePopoverClick}>
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              {(startDate || endDate) && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setStartDate(undefined);
                    setEndDate(undefined);
                  }}
                >
                  Clear Range
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleQuickSelect('today')}>
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleQuickSelect('yesterday')}>
                Yesterday
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleQuickSelect('thisWeek')}>
                This Week
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleQuickSelect('thisMonth')}>
                This Month
              </Button>
            </div>

            <Button 
              variant="default" 
              onClick={handleAllTimeSummary}
              className="bg-purple-600 hover:bg-purple-700"
            >
              All Time Summary
            </Button>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading closing data...</span>
            </div>
          ) : closingData && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Income Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-green-600">Total Income</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-2xl font-bold">{formatCurrency(closingData.totalIncome)}</div>
                    <div className="space-y-1 text-sm">
                      <div>Orders: {formatCurrency(closingData.totalIncomeFromOrders)}</div>
                      <div>Charging: {formatCurrency(closingData.totalIncomeFromCharging)}</div>
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
                      <span>{formatCurrency(closingData.cashIncome)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-600">eSewa:</span>
                      <span>{formatCurrency(closingData.esewaIncome)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-600">Fonepay:</span>
                      <span>{formatCurrency(closingData.fonepayIncome)}</span>
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
                    <div className="text-2xl font-bold">{formatCurrency(closingData.totalExpenses)}</div>
                    <div className="space-y-1 text-sm">
                      <div>Cash: {formatCurrency(closingData.cashExpenses)}</div>
                      <div>eSewa: {formatCurrency(closingData.esewaExpenses)}</div>
                      <div>Fonepay: {formatCurrency(closingData.fonepayExpenses)}</div>
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
                      <span className="text-blue-600">{formatCurrency(closingData.totalDeposits)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Withdrawals:</span>
                      <span className="text-red-600">{formatCurrency(closingData.totalWithdrawals)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Savings:</span>
                      <span className="text-purple-600">{formatCurrency(closingData.totalSavings)}</span>
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
                      <span className={closingData.cashBalance < 0 ? 'text-red-600' : ''}>{formatCurrency(closingData.cashBalance)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-600">eSewa:</span>
                      <span className={closingData.esewaBalance < 0 ? 'text-red-600' : ''}>{formatCurrency(closingData.esewaBalance)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-600">Fonepay:</span>
                      <span className={closingData.fonepayBalance < 0 ? 'text-red-600' : ''}>{formatCurrency(closingData.fonepayBalance)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-purple-600">Cooperative:</span>
                      <span className={closingData.cooperativeBalance < 0 ? 'text-red-600' : ''}>{formatCurrency(closingData.cooperativeBalance)}</span>
                    </div>
                    <hr className="my-2" />
                    <div className="flex justify-between font-bold">
                      <span>Total Balance:</span>
                      <span className={closingData.totalBalance < 0 ? 'text-red-600' : 'text-green-600'}>
                        {formatCurrency(closingData.totalBalance)}
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
                      <span className={closingData.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(closingData.netProfit)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cooperative Withdrawals:</span>
                      <span className="text-red-600">{formatCurrency(closingData.cooperativeWithdrawals)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Bank Withdrawals:</span>
                      <span className="text-red-600">{formatCurrency(closingData.bankWithdrawals)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={processing}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* All Time Summary Modal */}
      <AllTimeSummaryModal
        isOpen={isAllTimeSummaryOpen}
        onClose={() => setIsAllTimeSummaryOpen(false)}
        summaryData={null}
        onDateRangeChange={() => {}}
      />
    </>
  );
};
