import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  CheckCircle2, AlertCircle, Calendar as CalendarIcon, ChevronRight,
  ChevronLeft, Lock, RefreshCw, Loader2, ShieldCheck,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/unifiedCalculations";
import { cn } from "@/lib/utils";

const fmt = (n: number) => formatCurrency(Number(n) || 0);

// Local-timezone date string (avoid UTC off-by-one from toISOString)
const toDateStr = (d: Date) => format(d, "yyyy-MM-dd");

const STEPS = [
  { id: 1, label: "Review Totals" },
  { id: 2, label: "Reconcile" },
  { id: 3, label: "Confirm & Lock" },
];

type Totals = {
  income: number;
  ordersIncome: number;
  chargingIncome: number;
  expenses: number;
  deposits: number;
  withdrawals: number;
  savings: number;
  cashBalance: number;
  esewaBalance: number;
  fonepayBalance: number;
  cooperativeBalance: number;
  totalBalance: number;
  netProfit: number;
  source: "daily_summary" | "transactions";
};

async function computeTotalsFromTransactions(dateStr: string): Promise<Totals> {
  const [o, c, e, d, w, s] = await Promise.all([
    supabase.from("orders").select("total, payment_mode").eq("order_date", dateStr),
    supabase.from("charging_sessions").select("total_amount, payment_mode").eq("session_date", dateStr),
    supabase.from("expenses").select("amount, payment_mode").eq("expense_date", dateStr),
    supabase.from("deposits").select("amount").eq("deposit_date", dateStr),
    supabase.from("withdrawals").select("amount, withdrawal_from").eq("withdrawal_date", dateStr),
    supabase.from("cooperative_savings").select("contribution_amount").eq("contribution_date", dateStr),
  ]);
  const sum = (rows: any[] | null, k: string) =>
    (rows || []).reduce((acc, r) => acc + (Number(r[k]) || 0), 0);
  const ordersIncome = sum(o.data, "total");
  const chargingIncome = sum(c.data, "total_amount");
  const expenses = sum(e.data, "amount");
  const deposits = sum(d.data, "amount");
  const withdrawals = sum(w.data, "amount");
  const savings = sum(s.data, "contribution_amount");
  const income = ordersIncome + chargingIncome;
  return {
    income, ordersIncome, chargingIncome, expenses, deposits, withdrawals, savings,
    cashBalance: 0, esewaBalance: 0, fonepayBalance: 0, cooperativeBalance: 0, totalBalance: 0,
    netProfit: income - expenses,
    source: "transactions",
  };
}

const DailyClosingWizardTab = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [closingDate, setClosingDate] = useState<Date>(new Date());
  const dateStr = useMemo(() => toDateStr(closingDate), [closingDate]);

  // ---------- totals ----------
  const totalsQ = useQuery<Totals>({
    queryKey: ["closing-totals", dateStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_summary")
        .select("*")
        .eq("summary_date", dateStr)
        .maybeSingle();
      if (error) throw error;
      if (!data) return computeTotalsFromTransactions(dateStr);
      const income = Number(data.total_income || 0);
      const expenses = Number(data.total_expenses || 0);
      const hasMeaningful = income > 0 || expenses > 0 ||
        Number(data.total_deposits || 0) > 0 ||
        Number(data.total_withdrawals || 0) > 0 ||
        Number(data.total_savings || 0) > 0;
      if (!hasMeaningful) return computeTotalsFromTransactions(dateStr);
      return {
        income,
        ordersIncome: Number(data.total_income_from_orders || 0),
        chargingIncome: Number(data.total_income_from_charging || 0),
        expenses,
        deposits: Number(data.total_deposits || 0),
        withdrawals: Number(data.total_withdrawals || 0),
        savings: Number(data.total_savings || 0),
        cashBalance: Number(data.cash_balance || 0),
        esewaBalance: Number(data.esewa_balance || 0),
        fonepayBalance: Number(data.fonepay_balance || 0),
        cooperativeBalance: Number(data.cooperative_balance || 0),
        totalBalance: Number(data.total_balance || 0),
        netProfit: income - expenses,
        source: "daily_summary",
      };
    },
  });

  // ---------- reconcile ----------
  const reconcileQ = useQuery<any>({
    queryKey: ["closing-reconcile", dateStr],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("nexus_reconcile", { p_check_date: dateStr });
      if (error) throw error;
      return data;
    },
    enabled: step >= 2,
    retry: 0,
  });

  const variances = reconcileQ.data?.variance || {};
  const hasVariance = Object.values(variances).some(
    (v: any) => Math.abs(Number(v) || 0) > 0.01,
  );

  // ---------- sync (refresh daily_summary for this date) ----------
  const syncMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase.rpc as any)("sync_daily_summary_for_date", {
        target_date: dateStr,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Summary refreshed");
      await qc.invalidateQueries({ queryKey: ["closing-totals", dateStr] });
      await reconcileQ.refetch();
    },
    onError: (e: any) => toast.error(e.message || "Refresh failed"),
  });

  // ---------- lock ----------
  const lockMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not signed in");
      const { error } = await (supabase.rpc as any)("daily_closing", {
        p_user_id: user.id,
        p_closing_date: dateStr,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success(`Day ${dateStr} closed successfully`);
      await qc.invalidateQueries({ queryKey: ["closing-totals", dateStr] });
      await qc.invalidateQueries({ queryKey: ["closing-reconcile", dateStr] });
      setStep(1);
    },
    onError: (e: any) => toast.error(e.message || "Closing failed"),
  });

  const summary = totalsQ.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Daily Closing Wizard</h2>
          <p className="text-sm text-muted-foreground">
            Review totals, reconcile wallet balances against recorded transactions, and lock the day.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <CalendarIcon className="h-4 w-4 mr-2" />
                {format(closingDate, "PPP")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={closingDate}
                onSelect={(d) => d && setClosingDate(d)}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          <Button
            variant="outline"
            size="sm"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
          >
            {syncMutation.isPending
              ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              : <RefreshCw className="h-4 w-4 mr-2" />}
            Refresh
          </Button>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2 flex-1">
            <div
              className={cn(
                "h-8 w-8 rounded-full border flex items-center justify-center text-sm font-medium shrink-0",
                step >= s.id
                  ? "bg-foreground text-background border-foreground"
                  : "bg-background text-muted-foreground border-border",
              )}
            >
              {step > s.id ? <CheckCircle2 className="h-4 w-4" /> : s.id}
            </div>
            <span className={cn("text-sm hidden sm:inline", step >= s.id ? "text-foreground" : "text-muted-foreground")}>
              {s.label}
            </span>
            {i < STEPS.length - 1 && <div className="flex-1 h-px bg-border" />}
          </div>
        ))}
      </div>

      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="text-base">{STEPS[step - 1].label}</CardTitle>
          <CardDescription>Closing date: {format(closingDate, "PPP")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* ------- STEP 1 ------- */}
          {step === 1 && (
            <>
              {totalsQ.isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading totals…
                </div>
              ) : totalsQ.error ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Failed to load</AlertTitle>
                  <AlertDescription>{(totalsQ.error as any)?.message || "Unknown error"}</AlertDescription>
                </Alert>
              ) : summary && (summary.income + summary.expenses === 0 && summary.source === "transactions") ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No transactions recorded</AlertTitle>
                  <AlertDescription>
                    There are no orders, charging sessions, expenses, or other entries for {format(closingDate, "PPP")}.
                    Pick a different date or add entries first.
                  </AlertDescription>
                </Alert>
              ) : summary && (
                <>
                  {summary.source === "transactions" && (
                    <Alert>
                      <RefreshCw className="h-4 w-4" />
                      <AlertTitle>Computed live from transactions</AlertTitle>
                      <AlertDescription>
                        The daily_summary row for this date is missing or stale. Click <b>Refresh</b> to rebuild it.
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Stat label="Income" value={fmt(summary.income)} />
                    <Stat label="Expenses" value={fmt(summary.expenses)} />
                    <Stat label="Net Profit" value={fmt(summary.netProfit)} />
                    <Stat label="Deposits" value={fmt(summary.deposits)} />
                    <Stat label="Withdrawals" value={fmt(summary.withdrawals)} />
                    <Stat label="Savings" value={fmt(summary.savings)} />
                    <Stat label="Orders" value={fmt(summary.ordersIncome)} />
                    <Stat label="Charging" value={fmt(summary.chargingIncome)} />
                    <Stat label="Cash" value={fmt(summary.cashBalance)} />
                    <Stat label="eSewa" value={fmt(summary.esewaBalance)} />
                    <Stat label="Fonepay" value={fmt(summary.fonepayBalance)} />
                    <Stat label="Cooperative" value={fmt(summary.cooperativeBalance)} />
                  </div>
                </>
              )}
            </>
          )}

          {/* ------- STEP 2 ------- */}
          {step === 2 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                {reconcileQ.isLoading || reconcileQ.isFetching ? (
                  <Badge variant="outline" className="gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Checking…
                  </Badge>
                ) : reconcileQ.error ? (
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="h-3 w-3" /> Error
                  </Badge>
                ) : !reconcileQ.data?.found ? (
                  <Badge variant="secondary" className="gap-1">
                    <AlertCircle className="h-3 w-3" /> No summary row
                  </Badge>
                ) : hasVariance ? (
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="h-3 w-3" /> Variance detected
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Reconciled
                  </Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => reconcileQ.refetch()}
                  disabled={reconcileQ.isFetching}
                >
                  {reconcileQ.isFetching
                    ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                    : <RefreshCw className="h-3.5 w-3.5 mr-2" />}
                  Re-check
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => syncMutation.mutate()}
                  disabled={syncMutation.isPending}
                >
                  {syncMutation.isPending
                    ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                    : <RefreshCw className="h-3.5 w-3.5 mr-2" />}
                  Rebuild summary
                </Button>
              </div>

              {reconcileQ.error ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Reconcile failed</AlertTitle>
                  <AlertDescription>{(reconcileQ.error as any)?.message}</AlertDescription>
                </Alert>
              ) : !reconcileQ.data?.found ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Nothing to reconcile</AlertTitle>
                  <AlertDescription>
                    There's no daily_summary row for {dateStr}. Click <b>Rebuild summary</b> to generate one
                    from today's transactions, then <b>Re-check</b>.
                  </AlertDescription>
                </Alert>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr className="border-b border-border">
                      <th className="text-left py-2">Account</th>
                      <th className="text-right py-2">Recorded</th>
                      <th className="text-right py-2">Computed</th>
                      <th className="text-right py-2">Variance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {["cash", "esewa", "fonepay", "cooperative"].map((k) => {
                      const v = Number(reconcileQ.data.variance?.[k] || 0);
                      return (
                        <tr key={k} className="border-b border-border last:border-0">
                          <td className="py-2 capitalize">{k}</td>
                          <td className="py-2 text-right tabular-nums">{fmt(reconcileQ.data.recorded?.[k] || 0)}</td>
                          <td className="py-2 text-right tabular-nums">{fmt(reconcileQ.data.computed?.[k] || 0)}</td>
                          <td className={cn("py-2 text-right tabular-nums font-medium", Math.abs(v) > 0.01 ? "text-foreground" : "text-muted-foreground")}>
                            {v >= 0 ? "+" : ""}{v.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ------- STEP 3 ------- */}
          {step === 3 && (
            <div className="space-y-3">
              {hasVariance && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Variance unresolved</AlertTitle>
                  <AlertDescription>
                    Wallet balances don't match computed totals. You can still lock the day, but consider rebuilding the summary first.
                  </AlertDescription>
                </Alert>
              )}
              <p className="text-sm text-muted-foreground">
                Review the totals and lock the day. This runs <code>daily_closing</code> and refreshes the daily summary.
              </p>
              <Card className="border border-border bg-muted/30">
                <CardContent className="p-4 space-y-1 text-sm">
                  <div className="flex justify-between"><span>Date</span><span className="font-medium">{dateStr}</span></div>
                  <div className="flex justify-between"><span>Income</span><span className="font-medium">{fmt(summary?.income || 0)}</span></div>
                  <div className="flex justify-between"><span>Expenses</span><span className="font-medium">{fmt(summary?.expenses || 0)}</span></div>
                  <div className="flex justify-between"><span>Net profit</span><span className="font-medium">{fmt(summary?.netProfit || 0)}</span></div>
                  <div className="flex justify-between"><span>Total balance</span><span className="font-medium">{fmt(summary?.totalBalance || 0)}</span></div>
                </CardContent>
              </Card>
              <Button
                onClick={() => lockMutation.mutate()}
                disabled={lockMutation.isPending}
                className="gap-2"
              >
                {lockMutation.isPending
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Lock className="h-4 w-4" />}
                {lockMutation.isPending ? "Locking…" : "Lock Day"}
              </Button>
              {lockMutation.isSuccess && (
                <Alert>
                  <ShieldCheck className="h-4 w-4" />
                  <AlertTitle>Day locked</AlertTitle>
                  <AlertDescription>Daily closing completed for {dateStr}.</AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <Button onClick={() => setStep((s) => Math.min(STEPS.length, s + 1))} disabled={step === STEPS.length}>
          Next <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="border border-border rounded p-3">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-base font-semibold tabular-nums">{value}</p>
  </div>
);

export default DailyClosingWizardTab;
