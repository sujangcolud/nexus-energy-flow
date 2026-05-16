import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {CalendarIcon, Loader2,
  Database,} from "lucide-react";
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
    console.log('Fetching all-time summary data from daily_summary table');

    try {
      // Fetch all data from daily_summary table
      const { data: dailySummaries, error: summaryError } = await supabase
        .from("daily_summary")
        .select("*")
        .order("summary_date", { ascending: true });

      if (summaryError) {
        console.error('Daily summaries fetch error:', summaryError);
        throw summaryError;
      }

      console.log('Daily summaries data:', dailySummaries);

      if (!dailySummaries || dailySummaries.length === 0) {
        console.warn('No daily summary data found');
        setAllTimeData({
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
        return;
      }

      // Helper function for safe field access with fallback support (same as AllTimeSummaryWidget)
      const safeGet = (obj: any, primaryField: string, fallbackField?: string): number => {
        const primaryValue = Number(obj?.[primaryField]);
        if (!isNaN(primaryValue) && primaryValue !== 0) {
          return primaryValue;
        }
        if (fallbackField) {
          const fallbackValue = Number(obj?.[fallbackField]);
          return isNaN(fallbackValue) ? 0 : fallbackValue;
        }
        return 0;
      };

      // Aggregate all daily summaries into all-time totals (same logic as AllTimeSummaryWidget)
      const aggregatedData = dailySummaries.reduce((acc, daily) => {
        return {
          // Income totals with safe access and enhanced columns
          totalIncomeFromOrders: acc.totalIncomeFromOrders + safeGet(daily, 'total_income_from_orders', 'total_income'),
          totalIncomeFromCharging: acc.totalIncomeFromCharging + safeGet(daily, 'total_income_from_charging'),
          totalIncomeCash: acc.totalIncomeCash + safeGet(daily, 'total_cash_income', 'total_income_cash'),
          totalIncomeEsewa: acc.totalIncomeEsewa + safeGet(daily, 'total_esewa_income', 'total_income_esewa'),
          totalIncomeFonepay: acc.totalIncomeFonepay + safeGet(daily, 'total_fonepay_income', 'total_income_fonepay'),

          // Expense totals with safe access
          totalExpenses: acc.totalExpenses + safeGet(daily, 'total_expenses'),
          totalExpensesCash: acc.totalExpensesCash + safeGet(daily, 'total_expenses_cash'),
          totalExpensesEsewa: acc.totalExpensesEsewa + safeGet(daily, 'total_expenses_esewa'),
          totalExpensesFonepay: acc.totalExpensesFonepay + safeGet(daily, 'total_expenses_fonepay'),

          // Deposit totals with safe access
          totalDeposits: acc.totalDeposits + safeGet(daily, 'total_deposits'),

          // Savings totals with safe access
          totalSavings: acc.totalSavings + safeGet(daily, 'total_savings'),

          // Withdrawal totals with safe access
          totalWithdrawals: acc.totalWithdrawals + safeGet(daily, 'total_withdrawals'),
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

      // Get current balances - check daily_summary first, fallback to transaction calculation
      const latestSummary = dailySummaries[dailySummaries.length - 1];

      // Get balance values from daily_summary table
      let cashBalance = Number(latestSummary?.cash_balance) || 0;
      let esewaBalance = Number(latestSummary?.esewa_balance) || 0;
      let fonepayBalance = Number(latestSummary?.fonepay_balance) || 0;
      let cooperativeBalance = Number(latestSummary?.cooperative_balance) || 0;

      // If all balances are zero, calculate from aggregated totals
      if (cashBalance === 0 && esewaBalance === 0 && fonepayBalance === 0 && cooperativeBalance === 0) {
        console.log("📊 Daily summary balances are zero, calculating from transaction totals...");

        // Calculate actual balances from transaction totals
        // Cash = Cash Income - Cash Expenses - Deposits from Cash + Deposits to Cash
        cashBalance = aggregatedData.totalIncomeCash - aggregatedData.totalExpensesCash;

        // eSewa = eSewa Income - eSewa Expenses + Deposits to eSewa - Deposits from eSewa
        esewaBalance = aggregatedData.totalIncomeEsewa - aggregatedData.totalExpensesEsewa;

        // Bank/Fonepay = Fonepay Income - Fonepay Expenses + Deposits to Bank/Fonepay (combined as user mentioned)
        fonepayBalance = aggregatedData.totalIncomeFonepay - aggregatedData.totalExpensesFonepay + aggregatedData.totalDeposits;

        // Cooperative = Total Savings - Cooperative Withdrawals
        cooperativeBalance = aggregatedData.totalSavings - aggregatedData.cooperativeWithdrawals;
      }

      const totalBalance = cashBalance + esewaBalance + fonepayBalance + cooperativeBalance;

      const calculatedData: AllTimeSummaryData = {
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

      console.log('All-time calculated data from daily_summary:', calculatedData);
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
      <DialogContent className="max-w-6xl w-[95vw] max-h-[95vh] overflow-y-auto p-4 md:p-6 rounded-3xl">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl md:text-2xl font-black text-primary">All-Time Report</DialogTitle>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Full Historical Financial Summary</p>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
            <p className="mt-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Compiling Data...</p>
          </div>
        ) : allTimeData && (
          <div className="space-y-6">
            {/* Wallet Summary */}
            <Card className="rounded-3xl border-none bg-slate-900 text-white shadow-2xl overflow-hidden">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Net Balance</p>
                    <h3 className={cn("text-3xl font-black", allTimeData.totalBalance < 0 ? 'text-destructive-foreground' : 'text-primary-foreground')}>
                      {formatCurrency(allTimeData.totalBalance)}
                    </h3>
                  </div>
                  <div className="bg-white/10 p-2 rounded-xl">
                    <Database className="h-6 w-6 text-slate-300" />
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-white/10">
                  <div>
                    <p className="text-[9px] font-bold text-slate-500 uppercase">Cash</p>
                    <p className="text-sm font-bold">{formatCurrency(allTimeData.cashBalance)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-500 uppercase">eSewa</p>
                    <p className="text-sm font-bold">{formatCurrency(allTimeData.esewaBalance)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-500 uppercase">Bank/Fone</p>
                    <p className="text-sm font-bold">{formatCurrency(allTimeData.fonepayBalance)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-500 uppercase">Savings</p>
                    <p className="text-sm font-bold">{formatCurrency(allTimeData.cooperativeBalance)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Income Summary */}
              <Card className="rounded-3xl border-none shadow-sm bg-primary/5">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-primary">Income Overview</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-4">
                  <div className="text-2xl font-black text-primary">{formatCurrency(allTimeData.totalIncome)}</div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-500">Orders</span>
                      <span className="font-bold">{formatCurrency(allTimeData.totalIncomeFromOrders)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-500">Charging</span>
                      <span className="font-bold">{formatCurrency(allTimeData.totalIncomeFromCharging)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Income by Mode */}
              <Card className="rounded-3xl border-none shadow-sm bg-white">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500">Revenue Stream</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-2">
                  <div className="flex justify-between text-xs py-1 border-b border-slate-50">
                    <span className="font-bold text-secondary">Cash</span>
                    <span className="font-black">{formatCurrency(allTimeData.cashIncome)}</span>
                  </div>
                  <div className="flex justify-between text-xs py-1 border-b border-slate-50">
                    <span className="font-bold text-primary">eSewa</span>
                    <span className="font-black">{formatCurrency(allTimeData.esewaIncome)}</span>
                  </div>
                  <div className="flex justify-between text-xs py-1">
                    <span className="font-bold text-primary/80">Fonepay</span>
                    <span className="font-black">{formatCurrency(allTimeData.fonepayIncome)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Expenses Summary */}
              <Card className="rounded-3xl border-none shadow-sm bg-destructive/5">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-destructive">Total Burn</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-4">
                  <div className="text-2xl font-black text-destructive">{formatCurrency(allTimeData.totalExpenses)}</div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-[9px] bg-white p-1 rounded-md border border-destructive/10">
                      <span className="block text-slate-400 font-bold mb-1">CASH</span>
                      <span className="font-bold">{formatCurrency(allTimeData.cashExpenses)}</span>
                    </div>
                    <div className="text-[9px] bg-white p-1 rounded-md border border-destructive/10">
                      <span className="block text-slate-400 font-bold mb-1">ESEWA</span>
                      <span className="font-bold">{formatCurrency(allTimeData.esewaExpenses)}</span>
                    </div>
                    <div className="text-[9px] bg-white p-1 rounded-md border border-destructive/10">
                      <span className="block text-slate-400 font-bold mb-1">FONE</span>
                      <span className="font-bold">{formatCurrency(allTimeData.fonepayExpenses)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Other Transactions */}
              <Card className="rounded-3xl border-none shadow-sm bg-white">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500">Flow Summary</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-primary">Deposits</span>
                    <span>{formatCurrency(allTimeData.totalDeposits)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-destructive">Withdrawals</span>
                    <span>{formatCurrency(allTimeData.totalWithdrawals)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-secondary">Savings</span>
                    <span>{formatCurrency(allTimeData.totalSavings)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Net Summary */}
              <Card className={cn(
                "rounded-3xl border-none shadow-md col-span-1 md:col-span-2",
                allTimeData.netProfit >= 0 ? "bg-primary text-white" : "bg-destructive text-white"
              )}>
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-xs font-black uppercase tracking-widest opacity-70 text-white">Historical Net Profit</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 flex items-center justify-between">
                  <div className="text-3xl font-black">{formatCurrency(allTimeData.netProfit)}</div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold opacity-70 uppercase text-white">Lifetime Performance</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        <DialogFooter className="mt-6">
          <Button variant="ghost" onClick={onClose} className="rounded-xl font-bold h-11 w-full md:w-auto">
            Close Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
