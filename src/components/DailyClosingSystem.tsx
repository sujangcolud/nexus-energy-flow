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
    console.log('Fetching daily closing data from daily_summary table for:', { date, start, end, userId });

    try {
      const targetDate = start && end ? null : date;
      const startFilter = start || date;
      const endFilter = end || date;

      const startDateStr = startFilter.toISOString().split('T')[0];
      const endDateStr = endFilter.toISOString().split('T')[0];

      console.log('Date filters:', { startDateStr, endDateStr });

      // Fetch data from daily_summary table instead of individual transaction tables
      let dailySummaryQuery = supabase
        .from("daily_summary")
        .select("*")
        .gte("summary_date", startDateStr)
        .lte("summary_date", endDateStr)
        .order("summary_date", { ascending: true });

      const { data: dailySummaries, error: summaryError } = await dailySummaryQuery;

      if (summaryError) {
        console.error('Daily summaries fetch error:', summaryError);
        throw summaryError;
      }

      console.log('Daily summaries data:', dailySummaries);

      // If no daily summary data found, calculate from individual transaction tables
      if (!dailySummaries || dailySummaries.length === 0) {
        console.warn('No daily summary data found, calculating from transaction tables...');
        await calculateFromTransactionTables(targetDate || startFilter, startFilter, endFilter);
        return;
      }

      // Check if all data is zeros (might happen with auto-generated entries)
      const hasNonZeroData = dailySummaries.some(summary => 
        (summary.total_income_from_orders && summary.total_income_from_orders > 0) ||
        (summary.total_income_from_charging && summary.total_income_from_charging > 0) ||
        (summary.total_expenses && summary.total_expenses > 0) ||
        (summary.total_deposits && summary.total_deposits > 0) ||
        (summary.total_withdrawals && summary.total_withdrawals > 0) ||
        (summary.total_savings && summary.total_savings > 0)
      );

      if (!hasNonZeroData) {
        console.warn('Daily summary data exists but all values are zero, calculating from transaction tables...');
        await calculateFromTransactionTables(targetDate || startFilter, startFilter, endFilter);
        return;
      }

      // ... keep existing code (helper function and aggregation logic)

      // Helper function for safe field access
      const safeGet = (obj: any, field: string): number => {
        const value = Number(obj?.[field]);
        return isNaN(value) ? 0 : value;
      };

      // Aggregate data from daily summaries
      const aggregatedData = dailySummaries.reduce((acc, daily) => {
        return {
          totalIncomeFromOrders: acc.totalIncomeFromOrders + safeGet(daily, 'total_income_from_orders'),
          totalIncomeFromCharging: acc.totalIncomeFromCharging + safeGet(daily, 'total_income_from_charging'),
          totalIncomeCash: acc.totalIncomeCash + safeGet(daily, 'total_income_cash'),
          totalIncomeEsewa: acc.totalIncomeEsewa + safeGet(daily, 'total_income_esewa'),
          totalIncomeFonepay: acc.totalIncomeFonepay + safeGet(daily, 'total_income_fonepay'),
          totalExpenses: acc.totalExpenses + safeGet(daily, 'total_expenses'),
          totalExpensesCash: acc.totalExpensesCash + safeGet(daily, 'total_expenses_cash'),
          totalExpensesEsewa: acc.totalExpensesEsewa + safeGet(daily, 'total_expenses_esewa'),
          totalExpensesFonepay: acc.totalExpensesFonepay + safeGet(daily, 'total_expenses_fonepay'),
          totalDeposits: acc.totalDeposits + safeGet(daily, 'total_deposits'),
          totalWithdrawals: acc.totalWithdrawals + safeGet(daily, 'total_withdrawals'),
          totalSavings: acc.totalSavings + safeGet(daily, 'total_savings'),
          cooperativeWithdrawals: acc.cooperativeWithdrawals + safeGet(daily, 'total_withdrawals_cooperative'),
          bankWithdrawals: acc.bankWithdrawals + safeGet(daily, 'total_withdrawals_bank'),
        };
      }, {
        totalIncomeFromOrders: 0,
        totalIncomeFromCharging: 0,
        totalIncomeCash: 0,
        totalIncomeEsewa: 0,
        totalIncomeFonepay: 0,
        totalExpenses: 0,
        totalExpensesCash: 0,
        totalExpensesEsewa: 0,
        totalExpensesFonepay: 0,
        totalDeposits: 0,
        totalWithdrawals: 0,
        totalSavings: 0,
        cooperativeWithdrawals: 0,
        bankWithdrawals: 0,
      });

      // Calculate derived totals
      const totalIncome = aggregatedData.totalIncomeFromOrders + aggregatedData.totalIncomeFromCharging;
      const netProfit = totalIncome - aggregatedData.totalExpenses;

      // Get current balances from the latest summary
      const latestSummary = dailySummaries[dailySummaries.length - 1];
      const cashBalance = safeGet(latestSummary, 'cash_balance');
      const esewaBalance = safeGet(latestSummary, 'esewa_balance');
      const fonepayBalance = safeGet(latestSummary, 'fonepay_balance');
      const cooperativeBalance = safeGet(latestSummary, 'cooperative_balance');
      const totalBalance = cashBalance + esewaBalance + fonepayBalance + cooperativeBalance;

      const calculatedData = {
        selectedDate: targetDate || startFilter,
        totalIncome,
        totalIncomeFromOrders: aggregatedData.totalIncomeFromOrders,
        totalIncomeFromCharging: aggregatedData.totalIncomeFromCharging,
        totalExpenses: aggregatedData.totalExpenses,
        totalDeposits: aggregatedData.totalDeposits,
        totalWithdrawals: aggregatedData.totalWithdrawals,
        totalSavings: aggregatedData.totalSavings,
        cashIncome: aggregatedData.totalIncomeCash,
        esewaIncome: aggregatedData.totalIncomeEsewa,
        fonepayIncome: aggregatedData.totalIncomeFonepay,
        cashExpenses: aggregatedData.totalExpensesCash,
        esewaExpenses: aggregatedData.totalExpensesEsewa,
        fonepayExpenses: aggregatedData.totalExpensesFonepay,
        cashBalance,
        esewaBalance,
        fonepayBalance,
        cooperativeBalance,
        totalBalance,
        netProfit,
        cooperativeWithdrawals: aggregatedData.cooperativeWithdrawals,
        bankWithdrawals: aggregatedData.bankWithdrawals
      };

      console.log('Final calculated data from daily_summary:', calculatedData);
      setClosingData(calculatedData);
    } catch (error) {
      console.error('Error fetching daily closing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateFromTransactionTables = async (targetDate: Date, startFilter: Date, endFilter: Date) => {
    try {
      const startDateStr = startFilter.toISOString().split('T')[0];
      const endDateStr = endFilter.toISOString().split('T')[0];

      console.log('🔄 Calculating from individual transaction tables for:', { startDateStr, endDateStr });

      // Fetch all transaction data in parallel
      const [ordersRes, chargingRes, expensesRes, depositsRes, withdrawalsRes, savingsRes] = await Promise.all([
        supabase
          .from("orders")
          .select("total, payment_mode, order_date")
          .gte("order_date", startDateStr)
          .lte("order_date", endDateStr),
        
        supabase
          .from("charging_sessions")
          .select("total_amount, payment_mode, session_date")
          .gte("session_date", startDateStr)
          .lte("session_date", endDateStr),
        
        supabase
          .from("expenses")
          .select("amount, payment_mode, expense_date")
          .gte("expense_date", startDateStr)
          .lte("expense_date", endDateStr),
        
        supabase
          .from("deposits")
          .select("amount, mode, deposit_date")
          .gte("deposit_date", startDateStr)
          .lte("deposit_date", endDateStr),
        
        supabase
          .from("withdrawals")
          .select("amount, payment_mode, withdrawal_from, withdrawal_date")
          .gte("withdrawal_date", startDateStr)
          .lte("withdrawal_date", endDateStr),
        
        supabase
          .from("cooperative_savings")
          .select("contribution_amount, payment_mode, contribution_date")
          .gte("contribution_date", startDateStr)
          .lte("contribution_date", endDateStr)
      ]);

      // Check for errors
      if (ordersRes.error) throw ordersRes.error;
      if (chargingRes.error) throw chargingRes.error;
      if (expensesRes.error) throw expensesRes.error;
      if (depositsRes.error) throw depositsRes.error;
      if (withdrawalsRes.error) throw withdrawalsRes.error;
      if (savingsRes.error) throw savingsRes.error;

      console.log('📊 Raw transaction data fetched:', {
        orders: ordersRes.data?.length || 0,
        charging: chargingRes.data?.length || 0,
        expenses: expensesRes.data?.length || 0,
        deposits: depositsRes.data?.length || 0,
        withdrawals: withdrawalsRes.data?.length || 0,
        savings: savingsRes.data?.length || 0
      });

      // Calculate totals
      const orders = ordersRes.data || [];
      const charging = chargingRes.data || [];
      const expenses = expensesRes.data || [];
      const deposits = depositsRes.data || [];
      const withdrawals = withdrawalsRes.data || [];
      const savings = savingsRes.data || [];

      // Helper function to match payment modes
      const isPaymentMode = (mode: string, target: string): boolean => {
        return mode?.toLowerCase().includes(target.toLowerCase()) || false;
      };

      // Calculate orders income by payment mode
      const ordersTotal = orders.reduce((acc, order) => acc + (Number(order.total) || 0), 0);
      const ordersCash = orders.filter(o => isPaymentMode(o.payment_mode, 'cash')).reduce((acc, o) => acc + (Number(o.total) || 0), 0);
      const ordersEsewa = orders.filter(o => isPaymentMode(o.payment_mode, 'esewa')).reduce((acc, o) => acc + (Number(o.total) || 0), 0);
      const ordersFonepay = orders.filter(o => isPaymentMode(o.payment_mode, 'fonepay')).reduce((acc, o) => acc + (Number(o.total) || 0), 0);

      // Calculate charging income by payment mode
      const chargingTotal = charging.reduce((acc, c) => acc + (Number(c.total_amount) || 0), 0);
      const chargingCash = charging.filter(c => isPaymentMode(c.payment_mode, 'cash')).reduce((acc, c) => acc + (Number(c.total_amount) || 0), 0);
      const chargingEsewa = charging.filter(c => isPaymentMode(c.payment_mode, 'esewa')).reduce((acc, c) => acc + (Number(c.total_amount) || 0), 0);
      const chargingFonepay = charging.filter(c => isPaymentMode(c.payment_mode, 'fonepay')).reduce((acc, c) => acc + (Number(c.total_amount) || 0), 0);

      // Calculate expenses by payment mode
      const expensesTotal = expenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
      const expensesCash = expenses.filter(e => isPaymentMode(e.payment_mode, 'cash')).reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
      const expensesEsewa = expenses.filter(e => isPaymentMode(e.payment_mode, 'esewa')).reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
      const expensesFonepay = expenses.filter(e => isPaymentMode(e.payment_mode, 'fonepay')).reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

      // Calculate other totals
      const depositsTotal = deposits.reduce((acc, d) => acc + (Number(d.amount) || 0), 0);
      const withdrawalsTotal = withdrawals.reduce((acc, w) => acc + (Number(w.amount) || 0), 0);
      const cooperativeWithdrawalsTotal = withdrawals.filter(w => w.withdrawal_from === 'Cooperative').reduce((acc, w) => acc + (Number(w.amount) || 0), 0);
      const bankWithdrawalsTotal = withdrawals.filter(w => w.withdrawal_from === 'Bank').reduce((acc, w) => acc + (Number(w.amount) || 0), 0);
      const savingsTotal = savings.reduce((acc, s) => acc + (Number(s.contribution_amount) || 0), 0);

      // Calculate totals by payment mode
      const totalCashIncome = ordersCash + chargingCash;
      const totalEsewaIncome = ordersEsewa + chargingEsewa;
      const totalFonepayIncome = ordersFonepay + chargingFonepay;
      const totalIncome = ordersTotal + chargingTotal;
      const netProfit = totalIncome - expensesTotal;

      // Simple balance calculation (this is approximate without opening balances)
      const cashBalance = totalCashIncome - expensesCash;
      const esewaBalance = totalEsewaIncome - expensesEsewa;
      const fonepayBalance = totalFonepayIncome - expensesFonepay;
      const cooperativeBalance = savingsTotal - cooperativeWithdrawalsTotal;
      const totalBalance = cashBalance + esewaBalance + fonepayBalance + cooperativeBalance;

      const calculatedData = {
        selectedDate: targetDate,
        totalIncome,
        totalIncomeFromOrders: ordersTotal,
        totalIncomeFromCharging: chargingTotal,
        totalExpenses: expensesTotal,
        totalDeposits: depositsTotal,
        totalWithdrawals: withdrawalsTotal,
        totalSavings: savingsTotal,
        cashIncome: totalCashIncome,
        esewaIncome: totalEsewaIncome,
        fonepayIncome: totalFonepayIncome,
        cashExpenses: expensesCash,
        esewaExpenses: expensesEsewa,
        fonepayExpenses: expensesFonepay,
        cashBalance,
        esewaBalance,
        fonepayBalance,
        cooperativeBalance,
        totalBalance,
        netProfit,
        cooperativeWithdrawals: cooperativeWithdrawalsTotal,
        bankWithdrawals: bankWithdrawalsTotal
      };

      console.log('💰 Calculated data from transactions:', calculatedData);
      setClosingData(calculatedData);

    } catch (error) {
      console.error('Error calculating from transaction tables:', error);
      // Set empty data as fallback
      setClosingData({
        selectedDate: targetDate,
        totalIncome: 0,
        totalIncomeFromOrders: 0,
        totalIncomeFromCharging: 0,
        totalExpenses: 0,
        totalDeposits: 0,
        totalWithdrawals: 0,
        totalSavings: 0,
        cashIncome: 0,
        esewaIncome: 0,
        fonepayIncome: 0,
        cashExpenses: 0,
        esewaExpenses: 0,
        fonepayExpenses: 0,
        cashBalance: 0,
        esewaBalance: 0,
        fonepayBalance: 0,
        cooperativeBalance: 0,
        totalBalance: 0,
        netProfit: 0,
        cooperativeWithdrawals: 0,
        bankWithdrawals: 0
      });
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
      />
    </>
  );
};
