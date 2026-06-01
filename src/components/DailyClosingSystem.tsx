import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {CalendarIcon, Loader2, Download, RefreshCw,
  Wallet, Banknote, Save, Database} from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/unifiedCalculations";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Use local-timezone date string (not UTC) so "today" matches the user's calendar day.
const toDateStr = (d: Date) => format(d, "yyyy-MM-dd");
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
  totalSavingsCash: number;
  systemCashCalculation: number;
  
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

  // Actual entries
  actualCashInHand?: number;
  actualFonepayTotal?: number;
}

export const DailyClosingSystem: React.FC<DailyClosingSystemProps> = ({
  isOpen,
  onClose,
  userId
}) => {
  const [closingData, setClosingData] = useState<DailyClosingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [actualCash, setActualCash] = useState<string>("");
  const [actualFonepay, setActualFonepay] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
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

      const startDateStr = toDateStr(startFilter);
      const endDateStr = toDateStr(endFilter);

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
        totalSavingsCash: (acc as any).totalSavingsCash + safeGet(daily, 'total_savings_cash'),
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

      const calculatedData: DailyClosingData = {
        selectedDate: targetDate || startFilter,
        totalIncome,
        totalIncomeFromOrders: aggregatedData.totalIncomeFromOrders,
        totalIncomeFromCharging: aggregatedData.totalIncomeFromCharging,
        totalExpenses: aggregatedData.totalExpenses,
        totalDeposits: aggregatedData.totalDeposits,
        totalWithdrawals: aggregatedData.totalWithdrawals,
        totalSavings: aggregatedData.totalSavings,
        totalSavingsCash: (aggregatedData as any).totalSavingsCash,
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
        bankWithdrawals: aggregatedData.bankWithdrawals,
        systemCashCalculation: safeGet(latestSummary, 'system_cash_calculation'),
        actualCashInHand: safeGet(latestSummary, 'actual_cash_in_hand'),
        actualFonepayTotal: safeGet(latestSummary, 'actual_fonepay_total')
      };

      console.log('Final calculated data from daily_summary:', calculatedData);
      setClosingData(calculatedData);
      setActualCash(calculatedData.actualCashInHand?.toString() || "");
      setActualFonepay(calculatedData.actualFonepayTotal?.toString() || "");
    } catch (error) {
      console.error('Error fetching daily closing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateFromTransactionTables = async (targetDate: Date, startFilter: Date, endFilter: Date) => {
    try {
      const startDateStr = toDateStr(startFilter);
      const endDateStr = toDateStr(endFilter);

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
        bankWithdrawals: bankWithdrawalsTotal,
        actualCashInHand: 0,
        actualFonepayTotal: 0
      };

      console.log('💰 Calculated data from transactions:', calculatedData);
      setClosingData(calculatedData as any);

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
        totalSavingsCash: 0,
        systemCashCalculation: 0,
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
      } as any);
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

  const saveActualEntries = async () => {
    if (!closingData || isSaving) return;

    setIsSaving(true);
    try {
      const targetDateStr = toDateStr(closingData.selectedDate);
      const { error } = await supabase
        .from('daily_summary')
        .update({
          actual_cash_in_hand: Number(actualCash) || 0,
          actual_fonepay_total: Number(actualFonepay) || 0,
          updated_at: new Date().toISOString()
        })
        .eq('summary_date', targetDateStr);

      if (error) throw error;

      toast.success("Actual entries saved successfully");
      await fetchDailyClosingData(selectedDate, startDate, endDate);
    } catch (error: any) {
      console.error('Error saving actual entries:', error);
      toast.error(error.message || "Failed to save actual entries");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl w-[95vw] max-h-[95vh] overflow-y-auto p-4 md:p-6 rounded-3xl">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl md:text-2xl font-black text-primary">
              Daily Closing
              <span className="block text-xs font-bold text-muted-foreground mt-1 uppercase tracking-wider">
                {startDate && endDate ? (
                  `${format(startDate, "MMM d")} — ${format(endDate, "MMM d, yyyy")}`
                ) : (
                  format(selectedDate, "MMMM d, yyyy")
                )}
              </span>
            </DialogTitle>
          </DialogHeader>

          {/* Date Selection and Controls */}
          <div className="flex flex-col gap-4 border-b border-slate-100 pb-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {!startDate && !endDate && (
                <Popover>
                  <PopoverTrigger asChild onClick={handlePopoverClick}>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-bold rounded-xl h-11 border-slate-200"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                      {format(selectedDate, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-2xl overflow-hidden shadow-2xl" onClick={handlePopoverClick}>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              )}

              <div className="grid grid-cols-2 gap-2 md:col-span-2">
                <Popover>
                  <PopoverTrigger asChild onClick={handlePopoverClick}>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-bold rounded-xl h-11 border-slate-200",
                        !startDate && "text-muted-foreground font-normal"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "MMM d") : "Start"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl" onClick={handlePopoverClick}>
                    <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild onClick={handlePopoverClick}>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-bold rounded-xl h-11 border-slate-200",
                        !endDate && "text-muted-foreground font-normal"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "MMM d") : "End"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl" onClick={handlePopoverClick}>
                    <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <Button variant="secondary" size="sm" className="rounded-full px-4 font-bold text-[11px] uppercase" onClick={() => handleQuickSelect('today')}>Today</Button>
              <Button variant="secondary" size="sm" className="rounded-full px-4 font-bold text-[11px] uppercase" onClick={() => handleQuickSelect('yesterday')}>Yesterday</Button>
              <Button variant="secondary" size="sm" className="rounded-full px-4 font-bold text-[11px] uppercase" onClick={() => handleQuickSelect('thisWeek')}>This Week</Button>
              <Button variant="secondary" size="sm" className="rounded-full px-4 font-bold text-[11px] uppercase" onClick={() => handleQuickSelect('thisMonth')}>This Month</Button>

              <div className="flex-1" />

              <Button
                variant="outline"
                size="sm"
                className="rounded-full font-bold text-[11px] uppercase border-primary/20 text-primary"
                onClick={async () => {
                  try {
                    setLoading(true);
                    const target = startDate && endDate ? startDate : selectedDate;
                    const { error } = await (supabase.rpc as any)("sync_daily_summary_for_date", {
                      target_date: toDateStr(target),
                    });
                    if (error) throw error;
                    toast.success("Summary rebuilt");
                    await fetchDailyClosingData(selectedDate, startDate, endDate);
                  } catch (e: any) {
                    toast.error(e.message || "Rebuild failed");
                    setLoading(false);
                  }
                }}
              >
                <RefreshCw className="h-3 w-3 mr-1.5" />
                Sync
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={handleAllTimeSummary}
                className="rounded-full font-bold text-[11px] uppercase bg-slate-900"
              >
                All-Time
              </Button>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
              <p className="mt-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Calculating...</p>
            </div>
          ) : closingData && (
            <div className="space-y-6">
              {/* Wallet Summary */}
              <Card className="rounded-3xl border-none bg-slate-900 text-white shadow-2xl overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Balance</p>
                      <h3 className={cn("text-3xl font-black", closingData.totalBalance < 0 ? 'text-destructive-foreground' : 'text-primary-foreground')}>
                        {formatCurrency(closingData.totalBalance)}
                      </h3>
                    </div>
                    <div className="bg-white/10 p-2 rounded-xl">
                      <Wallet className="h-6 w-6 text-slate-300" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-white/10">
                    <div>
                      <p className="text-[9px] font-bold text-slate-500 uppercase">Cash</p>
                      <p className="text-sm font-bold">{formatCurrency(closingData.cashBalance)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-500 uppercase">eSewa</p>
                      <p className="text-sm font-bold">{formatCurrency(closingData.esewaBalance)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-500 uppercase">Fonepay</p>
                      <p className="text-sm font-bold">{formatCurrency(closingData.fonepayBalance)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-500 uppercase">Coop</p>
                      <p className="text-sm font-bold">{formatCurrency(closingData.cooperativeBalance)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Analytics & Physical Verification Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="rounded-3xl border-none shadow-md bg-white overflow-hidden">
                  <CardHeader className="bg-slate-50 p-4">
                    <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                      <Banknote className="h-4 w-4" /> Physical Cash Verification
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    {/* Breakdown */}
                    <div className="p-3 bg-slate-50 rounded-2xl space-y-1.5 border border-slate-100">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-slate-400">CASH ORDERS:</span>
                        <span className="text-emerald-600">+{formatCurrency(closingData.cashIncome)}</span>
                      </div>
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-slate-400">CASH EXPENSES:</span>
                        <span className="text-rose-600">-{formatCurrency(closingData.cashExpenses)}</span>
                      </div>
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-slate-400">CASH SAVINGS:</span>
                        <span className="text-rose-600">-{formatCurrency(closingData.totalSavingsCash || 0)}</span>
                      </div>
                      <div className="pt-1.5 border-t border-slate-200 flex justify-between text-[11px] font-black">
                        <span className="text-slate-600 uppercase">System Calc:</span>
                        <span className="text-primary">{formatCurrency(closingData.systemCashCalculation)}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Calc Balance</p>
                        <p className="text-lg font-black text-slate-700">{formatCurrency(closingData.systemCashCalculation)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Actual Entry</p>
                        <input
                          type="number"
                          value={actualCash}
                          onChange={(e) => setActualCash(e.target.value)}
                          placeholder="0.00"
                          className="w-full h-10 px-3 font-black text-lg border-2 border-slate-100 rounded-xl focus:border-primary focus:ring-0 outline-none transition-all"
                        />
                      </div>
                    </div>

                    {actualCash !== "" && (
                      <div className={cn(
                        "p-3 rounded-2xl flex justify-between items-center",
                        (Number(actualCash) - closingData.systemCashCalculation) === 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                      )}>
                        <span className="text-xs font-bold uppercase tracking-wider">Difference</span>
                        <span className="text-lg font-black">
                          {formatCurrency(Number(actualCash) - closingData.systemCashCalculation)}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-3xl border-none shadow-md bg-white overflow-hidden">
                  <CardHeader className="bg-slate-50 p-4">
                    <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                      <RefreshCw className="h-4 w-4" /> Fonepay Verification
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">System Fonepay</p>
                        <p className="text-lg font-black text-slate-700">{formatCurrency(closingData.fonepayIncome)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Actual Entry</p>
                        <input
                          type="number"
                          value={actualFonepay}
                          onChange={(e) => setActualFonepay(e.target.value)}
                          placeholder="0.00"
                          className="w-full h-10 px-3 font-black text-lg border-2 border-slate-100 rounded-xl focus:border-primary focus:ring-0 outline-none transition-all"
                        />
                      </div>
                    </div>

                    {actualFonepay !== "" && (
                      <div className={cn(
                        "p-3 rounded-2xl flex justify-between items-center",
                        (Number(actualFonepay) - closingData.fonepayIncome) === 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                      )}>
                        <span className="text-xs font-bold uppercase tracking-wider">Difference</span>
                        <span className="text-lg font-black">
                          {formatCurrency(Number(actualFonepay) - closingData.fonepayIncome)}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-center">
                <Button
                  onClick={saveActualEntries}
                  disabled={isSaving}
                  className="rounded-full px-8 h-12 font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Verification Data
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Income Summary */}
                <Card className="rounded-3xl border-none shadow-sm bg-primary/5">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-xs font-black uppercase tracking-widest text-primary">Income</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-4">
                    <div className="text-2xl font-black text-primary">{formatCurrency(closingData.totalIncome)}</div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-slate-500">Orders</span>
                        <span className="font-bold">{formatCurrency(closingData.totalIncomeFromOrders)}</span>
                      </div>
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-slate-500">Charging</span>
                        <span className="font-bold">{formatCurrency(closingData.totalIncomeFromCharging)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Income by Mode */}
                <Card className="rounded-3xl border-none shadow-sm bg-white">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500">Inflow</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-2">
                    <div className="flex justify-between text-xs py-1 border-b border-slate-50">
                      <span className="font-bold text-secondary">Cash</span>
                      <span className="font-black">{formatCurrency(closingData.cashIncome)}</span>
                    </div>
                    <div className="flex justify-between text-xs py-1 border-b border-slate-50">
                      <span className="font-bold text-primary">eSewa</span>
                      <span className="font-black">{formatCurrency(closingData.esewaIncome)}</span>
                    </div>
                    <div className="flex justify-between text-xs py-1">
                      <span className="font-bold text-primary/80">Fonepay</span>
                      <span className="font-black">{formatCurrency(closingData.fonepayIncome)}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Expenses Summary */}
                <Card className="rounded-3xl border-none shadow-sm bg-destructive/5">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-xs font-black uppercase tracking-widest text-destructive">Expenses</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-4">
                    <div className="text-2xl font-black text-destructive">{formatCurrency(closingData.totalExpenses)}</div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-[9px] bg-white p-1 rounded-md border border-destructive/10">
                        <span className="block text-slate-400 font-bold mb-1">CASH</span>
                        <span className="font-bold">{formatCurrency(closingData.cashExpenses)}</span>
                      </div>
                      <div className="text-[9px] bg-white p-1 rounded-md border border-destructive/10">
                        <span className="block text-slate-400 font-bold mb-1">ESEWA</span>
                        <span className="font-bold">{formatCurrency(closingData.esewaExpenses)}</span>
                      </div>
                      <div className="text-[9px] bg-white p-1 rounded-md border border-destructive/10">
                        <span className="block text-slate-400 font-bold mb-1">FONE</span>
                        <span className="font-bold">{formatCurrency(closingData.fonepayExpenses)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Other Transactions */}
                <Card className="rounded-3xl border-none shadow-sm bg-white">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500">Activity</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-primary">Deposits</span>
                      <span>{formatCurrency(closingData.totalDeposits)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-destructive">Withdrawals</span>
                      <span>{formatCurrency(closingData.totalWithdrawals)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-secondary">Savings</span>
                      <span>{formatCurrency(closingData.totalSavings)}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Net Summary */}
                <Card className={cn(
                  "rounded-3xl border-none shadow-md col-span-1 md:col-span-2",
                  closingData.netProfit >= 0 ? "bg-primary text-white" : "bg-destructive text-white"
                )}>
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-xs font-black uppercase tracking-widest opacity-70 text-white">Profit / Loss</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 flex items-center justify-between">
                    <div className="text-3xl font-black">{formatCurrency(closingData.netProfit)}</div>
                    <div className="text-right">
                      <div className="text-[10px] font-bold opacity-70 uppercase">After all expenses</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          <DialogFooter className="mt-6">
            <Button variant="ghost" onClick={onClose} className="rounded-xl font-bold h-11 w-full md:w-auto">
              Close System
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
