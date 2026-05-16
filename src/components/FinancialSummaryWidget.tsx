import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  CreditCard,
  Wallet,
  PiggyBank,
  Banknote,
  RefreshCw,
  AlertCircle,
  Database,
} from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { extractErrorMessage, logError } from "@/utils/errorHandling";

interface DailySummary {
  id: number;
  summary_date: string;
  total_income: number;
  total_income_from_orders: number;
  total_income_from_charging: number;
  total_income_cash: number;
  total_income_esewa: number;
  total_income_fonepay: number;
  total_expenses: number;
  total_deposits: number;
  total_withdrawals: number;
  total_savings: number;
  cash_balance: number;
  esewa_balance: number;
  fonepay_balance: number;
  total_balance: number;
  created_at: string;
  updated_at: string;
}

interface MonthSummary {
  total_income: number;
  total_expenses: number;
  total_deposits: number;
  total_withdrawals: number;
  net_profit: number;
}

interface FinancialSummaryWidgetProps {
  className?: string;
}

const FinancialSummaryWidget: React.FC<FinancialSummaryWidgetProps> = ({
  className,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [todaySummary, setTodaySummary] = useState<DailySummary | null>(null);
  const [monthSummary, setMonthSummary] = useState<MonthSummary | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTodaySummary = async () => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("daily_summary")
        .select("*")
        .eq("summary_date", today)
        .single();

      if (error && error.code !== "PGRST116") {
        if (error.code === "PGRST116") {
          await calculateRealTimeTodaySummary();
          return;
        }
        logError("fetching today's summary", error);
        throw error;
      }

      setTodaySummary(data);
    } catch (error) {
      logError("fetching today's summary", error);
      await calculateRealTimeTodaySummary();
    }
  };

  const calculateRealTimeTodaySummary = async () => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split("T")[0];
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split("T")[0];

      const [
        ordersRes,
        chargingRes,
        expensesRes,
        depositsRes,
        withdrawalsRes,
        cooperativeRes,
      ] = await Promise.all([
        supabase
          .from("orders")
          .select("total, payment_mode")
          .eq("user_id", user.id)
          .gte("order_date", today)
          .lt("order_date", tomorrowStr),
        supabase
          .from("charging_sessions")
          .select("total_amount, payment_mode")
          .eq("user_id", user.id)
          .gte("session_date", today)
          .lt("session_date", tomorrowStr),
        supabase
          .from("expenses")
          .select("amount, payment_mode")
          .eq("user_id", user.id)
          .gte("expense_date", today)
          .lt("expense_date", tomorrowStr),
        supabase
          .from("deposits")
          .select("amount, payment_mode")
          .eq("user_id", user.id)
          .gte("deposit_date", today)
          .lt("deposit_date", tomorrowStr),
        supabase
          .from("withdrawals")
          .select("amount, payment_mode")
          .eq("user_id", user.id)
          .gte("withdrawal_date", today)
          .lt("withdrawal_date", tomorrowStr),
        supabase
          .from("cooperative_savings")
          .select("contribution_amount")
          .eq("user_id", user.id)
          .gte("contribution_date", today)
          .lt("contribution_date", tomorrowStr),
      ]);

      const orders = ordersRes.data || [];
      const charging = chargingRes.data || [];
      const expenses = expensesRes.data || [];
      const deposits = depositsRes.data || [];
      const withdrawals = withdrawalsRes.data || [];
      const cooperative = cooperativeRes.data || [];

      const totalIncomeFromOrders = orders.reduce(
        (sum, order) => sum + (order.total || 0),
        0,
      );
      const totalIncomeFromCharging = charging.reduce(
        (sum, session) => sum + (session.total_amount || 0),
        0,
      );
      const totalIncome = totalIncomeFromOrders + totalIncomeFromCharging;
      const totalExpenses = expenses.reduce(
        (sum, expense) => sum + (expense.amount || 0),
        0,
      );
      const totalDeposits = deposits.reduce(
        (sum, deposit) => sum + (deposit.amount || 0),
        0,
      );
      const totalWithdrawals = withdrawals.reduce(
        (sum, withdrawal) => sum + (withdrawal.amount || 0),
        0,
      );
      const totalSavings = cooperative.reduce(
        (sum, saving) => sum + (saving.contribution_amount || 0),
        0,
      );

      const calculatePaymentModeTotal = (
        transactions: any[],
        amountField: string,
        paymentField: string,
        mode: string,
      ) => {
        return transactions
          .filter(
            (t) => (t[paymentField] || "").toLowerCase() === mode.toLowerCase(),
          )
          .reduce((sum, t) => sum + (t[amountField] || 0), 0);
      };

      const cashFromOrders = calculatePaymentModeTotal(
        orders,
        "total",
        "payment_mode",
        "cash",
      );
      const esewaFromOrders = calculatePaymentModeTotal(
        orders,
        "total",
        "payment_mode",
        "esewa",
      );
      const fonepayFromOrders = calculatePaymentModeTotal(
        orders,
        "total",
        "payment_mode",
        "fonepay",
      );

      const cashFromCharging = calculatePaymentModeTotal(
        charging,
        "total_amount",
        "payment_mode",
        "cash",
      );
      const esewaFromCharging = calculatePaymentModeTotal(
        charging,
        "total_amount",
        "payment_mode",
        "esewa",
      );
      const fonepayFromCharging = calculatePaymentModeTotal(
        charging,
        "total_amount",
        "payment_mode",
        "fonepay",
      );

      const totalIncomeCash = cashFromOrders + cashFromCharging;
      const totalIncomeEsewa = esewaFromOrders + esewaFromCharging;
      const totalIncomeFonepay = fonepayFromOrders + fonepayFromCharging;

      const depositsToEsewa = deposits
        .filter((d) => d.payment_mode?.toLowerCase() === "esewa")
        .reduce((sum, d) => sum + (d.amount || 0), 0);
      const depositsToFonepay = deposits
        .filter((d) => d.payment_mode?.toLowerCase() === "fonepay")
        .reduce((sum, d) => sum + (d.amount || 0), 0);
      const expensesCash = expenses
        .filter((e) => e.payment_mode?.toLowerCase() === "cash")
        .reduce((sum, e) => sum + (e.amount || 0), 0);
      const savingsCash = totalSavings;
      const withdrawalsCash = withdrawals
        .filter((w) => w.payment_mode?.toLowerCase() === "cash")
        .reduce((sum, w) => sum + (w.amount || 0), 0);

      const depositsCash = deposits
        .filter((d) => d.payment_mode?.toLowerCase() === "cash")
        .reduce((sum, d) => sum + (d.amount || 0), 0);

      const cashBalance =
        totalIncomeCash -
        expensesCash -
        savingsCash -
        depositsCash +
        withdrawalsCash -
        depositsToEsewa -
        depositsToFonepay;

      const expensesEsewa = expenses
        .filter((e) => e.payment_mode?.toLowerCase() === "esewa")
        .reduce((sum, e) => sum + (e.amount || 0), 0);
      const esewaBalance = totalIncomeEsewa - expensesEsewa + depositsToEsewa;

      const expensesFonepay = expenses
        .filter(
          (e) =>
            e.payment_mode?.toLowerCase() === "fonepay" ||
            e.payment_mode?.toLowerCase() === "bank",
        )
        .reduce((sum, e) => sum + (e.amount || 0), 0);
      const withdrawalsBank = withdrawals
        .filter(
          (w) =>
            w.payment_mode?.toLowerCase() === "bank" ||
            w.payment_mode?.toLowerCase() === "fonepay",
        )
        .reduce((sum, w) => sum + (w.amount || 0), 0);
      const fonepayBalance =
        totalIncomeFonepay - expensesFonepay - withdrawalsBank;

      const cooperativeWithdrawals = 0;
      const cooperativeBalance = totalSavings - cooperativeWithdrawals;

      const totalBalance =
        cashBalance + fonepayBalance + cooperativeBalance + esewaBalance;

      const calculatedSummary: DailySummary = {
        id: 0,
        summary_date: today,
        total_income: totalIncome,
        total_income_from_orders: totalIncomeFromOrders,
        total_income_from_charging: totalIncomeFromCharging,
        total_income_cash: totalIncomeCash,
        total_income_esewa: totalIncomeEsewa,
        total_income_fonepay: totalIncomeFonepay,
        total_expenses: totalExpenses,
        total_deposits: totalDeposits,
        total_withdrawals: totalWithdrawals,
        total_savings: totalSavings,
        cash_balance: cashBalance,
        esewa_balance: esewaBalance,
        fonepay_balance: fonepayBalance,
        total_balance: totalBalance,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setTodaySummary(calculatedSummary);
    } catch (error) {
      logError("calculating real-time summary", error);
    }
  };

  const fetchMonthSummary = async () => {
    try {
      const now = new Date();
      const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(now), "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("daily_summary")
        .select(
          "total_income, total_expenses, total_deposits, total_withdrawals",
        )
        .gte("summary_date", monthStart)
        .lte("summary_date", monthEnd);

      if (error) {
        logError("fetching month summary", error);
        throw error;
      }

      if (data && data.length > 0) {
        const monthTotals = data.reduce(
          (acc, day) => ({
            total_income: acc.total_income + (day.total_income || 0),
            total_expenses: acc.total_expenses + (day.total_expenses || 0),
            total_deposits: acc.total_deposits + (day.total_deposits || 0),
            total_withdrawals: acc.total_withdrawals + (day.total_withdrawals || 0),
          }),
          {
            total_income: 0,
            total_expenses: 0,
            total_deposits: 0,
            total_withdrawals: 0,
          },
        );

        const net_profit =
          monthTotals.total_income +
          monthTotals.total_deposits -
          monthTotals.total_expenses -
          monthTotals.total_withdrawals;

        setMonthSummary({
          ...monthTotals,
          net_profit,
        });
      } else {
        setMonthSummary({
          total_income: 0,
          total_expenses: 0,
          total_deposits: 0,
          total_withdrawals: 0,
          net_profit: 0,
        });
      }
    } catch (error) {
      logError("fetching month summary", error);
      console.error("Error fetching month summary:", error);
    }
  };

  const refreshSummary = async () => {
    setRefreshing(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const { error } = await supabase.rpc("update_enhanced_daily_summary", {
        target_date: today,
      });

      if (error) {
        logError("updating daily summary", error);
        throw error;
      }

      await Promise.all([fetchTodaySummary(), fetchMonthSummary()]);
      toast.success("Financial summary refreshed successfully!");
    } catch (error) {
      logError("refreshing summary", error);
      toast.error(`Failed to refresh summary: ${extractErrorMessage(error)}`);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchTodaySummary(), fetchMonthSummary()]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <Card className={`${className} animate-pulse`}>
        <CardHeader>
          <div className="h-6 bg-muted rounded w-1/3"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 bg-muted rounded w-full"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const todayBalance = todaySummary?.total_balance || 0;
  const todayIncome = todaySummary?.total_income || 0;
  const todayExpenses = todaySummary?.total_expenses || 0;
  const todayNetProfit = todayIncome - todayExpenses;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Refresh Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-black text-foreground tracking-tight uppercase">
            Finance Summary
          </h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={refreshSummary}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-full font-bold text-xs uppercase text-muted-foreground hover:text-primary"
        >
          <RefreshCw
            className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`}
          />
          Sync
        </Button>
      </div>

      {/* Today's Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="rounded-3xl border-none shadow-sm bg-success text-success-foreground overflow-hidden">
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest opacity-80 flex items-center gap-1.5">
              <TrendingUp className="h-3 w-3" />
              Income
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="text-xl font-black truncate">
              ₹ {todayIncome.toLocaleString()}
            </div>
            {todaySummary && (
              <div className="mt-1 flex flex-wrap gap-x-2 text-[9px] font-bold opacity-70">
                <span>Orders: {todaySummary.total_income_from_orders.toFixed(0)}</span>
                <span>EV: {todaySummary.total_income_from_charging.toFixed(0)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-none shadow-sm bg-destructive text-destructive-foreground overflow-hidden">
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest opacity-80 flex items-center gap-1.5">
              <TrendingDown className="h-3 w-3" />
              Expenses
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="text-xl font-black truncate">
              ₹ {todayExpenses.toLocaleString()}
            </div>
            <div className="mt-1">
              <span className="bg-white/20 px-1.5 py-0.5 rounded text-[9px] font-black uppercase">
                Net: ₹ {todayNetProfit.toFixed(0)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-none shadow-sm bg-primary text-primary-foreground overflow-hidden">
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest opacity-80 flex items-center gap-1.5">
              <Wallet className="h-3 w-3" />
              Balance
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="text-xl font-black truncate">
              ₹ {todayBalance.toLocaleString()}
            </div>
            {todaySummary && (
              <div className="mt-1 flex gap-2 text-[9px] font-bold opacity-70">
                <span>Cash: ₹ {todaySummary.cash_balance.toFixed(0)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-none shadow-sm bg-accent text-accent-foreground overflow-hidden">
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest opacity-80 flex items-center gap-1.5">
              <PiggyBank className="h-3 w-3" />
              Savings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="text-xl font-black truncate">
              ₹ {(todaySummary?.total_savings || 0).toLocaleString()}
            </div>
            <div className="mt-1 text-[9px] font-bold opacity-70">
              Withdraw: ₹ {(todaySummary?.total_withdrawals || 0).toFixed(0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Summary */}
      {monthSummary && (
        <Card className="rounded-3xl border-none shadow-2xl bg-card overflow-hidden">
          <CardHeader className="bg-muted/50 border-b border-border p-4">
            <CardTitle className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              <Calendar className="h-3 w-3" />
              Monthly Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
              <div>
                <div className="text-[9px] font-bold text-muted-foreground uppercase mb-1">Income</div>
                <div className="text-sm font-black text-success truncate">
                  ₹ {monthSummary.total_income.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-[9px] font-bold text-muted-foreground uppercase mb-1">Expense</div>
                <div className="text-sm font-black text-destructive truncate">
                  ₹ {monthSummary.total_expenses.toLocaleString()}
                </div>
              </div>
              <div className="hidden md:block">
                <div className="text-[9px] font-bold text-muted-foreground uppercase mb-1">Deposit</div>
                <div className="text-sm font-black text-primary truncate">
                  ₹ {monthSummary.total_deposits.toLocaleString()}
                </div>
              </div>
              <div className="hidden md:block">
                <div className="text-[9px] font-bold text-muted-foreground uppercase mb-1">Withdraw</div>
                <div className="text-sm font-black text-accent truncate">
                  ₹ {monthSummary.total_withdrawals.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-[9px] font-bold text-muted-foreground uppercase mb-1">Net</div>
                <div className={cn("text-sm font-black truncate", monthSummary.net_profit >= 0 ? "text-success" : "text-destructive")}>
                  ₹ {monthSummary.net_profit.toLocaleString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Method Breakdown */}
      {todaySummary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <CreditCard className="h-5 w-5" />
              Today's Payment Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-success" />
                  <span className="text-sm font-medium text-foreground">
                    Cash
                  </span>
                </div>
                <div className="text-lg font-semibold text-success">
                  ₹ {todaySummary.total_income_cash.toFixed(2)}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">
                    eSewa
                  </span>
                </div>
                <div className="text-lg font-semibold text-primary">
                  ₹ {todaySummary.total_income_esewa.toFixed(2)}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">
                    Fonepay
                  </span>
                </div>
                <div className="text-lg font-semibold text-primary">
                  ₹ {(todaySummary.total_income_fonepay || 0).toFixed(2)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Data Warning */}
      {!todaySummary && !loading && (
        <Card className="bg-warning/5 border-warning/10">
          <CardContent className="flex items-center gap-3 p-6">
            <AlertCircle className="h-6 w-6 text-warning" />
            <div>
              <p className="font-medium text-foreground">
                No daily summary data available
              </p>
              <p className="text-sm text-muted-foreground">
                Please perform daily closing to generate summary data. All
                analytics are based on daily_summary table for consistency.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={refreshSummary}
                disabled={refreshing}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh Summary
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Source Badge */}
      <Card className="bg-primary/5 border-primary/10">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm">
            <Database className="h-4 w-4 text-primary" />
            <span className="text-primary font-medium">
              Data Source: daily_summary table
            </span>
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              Consistent Reports
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancialSummaryWidget;
