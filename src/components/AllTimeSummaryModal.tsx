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
  bankBalance: number;
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
          fonepayBalance: 0, // Always 0 since combined with bank
          bankBalance: 0,
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
      let bankBalance = Number(latestSummary?.bank_balance) || 0;
      let cooperativeBalance = Number(latestSummary?.cooperative_balance) || 0;

      // If all balances are zero, calculate from aggregated totals
      if (cashBalance === 0 && esewaBalance === 0 && fonepayBalance === 0 && bankBalance === 0 && cooperativeBalance === 0) {
        console.log("📊 Daily summary balances are zero, calculating from transaction totals...");

        // Calculate actual balances from transaction totals
        // Cash = Cash Income - Cash Expenses - Deposits from Cash + Deposits to Cash
        cashBalance = aggregatedData.totalIncomeCash - aggregatedData.totalExpensesCash;

        // eSewa = eSewa Income - eSewa Expenses + Deposits to eSewa - Deposits from eSewa
        esewaBalance = aggregatedData.totalIncomeEsewa - aggregatedData.totalExpensesEsewa;

        // Bank/Fonepay = Fonepay Income - Fonepay Expenses + Deposits to Bank/Fonepay (combined as user mentioned)
        const combinedBankFonepayBalance = aggregatedData.totalIncomeFonepay - aggregatedData.totalExpensesFonepay + aggregatedData.totalDeposits;

        // Cooperative = Total Savings - Cooperative Withdrawals
        cooperativeBalance = aggregatedData.totalSavings - aggregatedData.cooperativeWithdrawals;

        // Bank and Fonepay are same per user instruction
        bankBalance = combinedBankFonepayBalance;
        fonepayBalance = 0; // Set to 0 since it's included in bank
      } else {
        // Use daily_summary balances but combine Bank and Fonepay as user requested
        const combinedBankFonepayBalance = bankBalance + fonepayBalance;
        bankBalance = combinedBankFonepayBalance;
        fonepayBalance = 0; // Set to 0 since it's included in bank
      }

      const totalBalance = cashBalance + esewaBalance + bankBalance + cooperativeBalance;

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
        fonepayBalance: 0, // Always 0 since combined with bank
        bankBalance, // Contains combined Bank + Fonepay
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
                    <span className="text-orange-600">Bank/Fonepay:</span>
                    <span className={allTimeData.bankBalance < 0 ? 'text-red-600' : ''}>{formatCurrency(allTimeData.bankBalance)}</span>
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
