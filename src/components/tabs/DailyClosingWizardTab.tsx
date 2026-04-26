import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { CheckCircle2, AlertCircle, Calendar as CalendarIcon, ChevronRight, ChevronLeft, Lock } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/unifiedCalculations";
import { cn } from "@/lib/utils";

const fmt = (n: number) => formatCurrency(Number(n) || 0);

const STEPS = [
  { id: 1, label: "Review Totals" },
  { id: 2, label: "Reconcile" },
  { id: 3, label: "Confirm & Lock" },
];

const DailyClosingWizardTab = () => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [closingDate, setClosingDate] = useState<Date>(new Date());
  const dateStr = format(closingDate, "yyyy-MM-dd");

  const { data: summary } = useQuery({
    queryKey: ["closing-summary", dateStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_summary")
        .select("*")
        .eq("summary_date", dateStr)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: reconcile, refetch: refetchReconcile } = useQuery({
    queryKey: ["nexus-reconcile", dateStr],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("nexus_reconcile", {
        p_check_date: dateStr,
      });
      if (error) throw error;
      return data as any;
    },
    enabled: step >= 2,
  });

  const handleLock = async () => {
    if (!user?.id) return;
    try {
      const { error } = await (supabase.rpc as any)("daily_closing", {
        p_user_id: user.id,
        p_closing_date: dateStr,
      });
      if (error) throw error;
      toast.success(`Day ${dateStr} closed successfully`);
      setStep(1);
    } catch (e: any) {
      toast.error(e.message || "Closing failed");
    }
  };

  const variances = reconcile?.variance || {};
  const hasVariance = Object.values(variances).some((v: any) => Math.abs(Number(v) || 0) > 0.01);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Daily Closing Wizard</h2>
        <p className="text-sm text-muted-foreground">Verify, reconcile, and lock the day's records.</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2 flex-1">
            <div
              className={cn(
                "h-8 w-8 rounded-full border flex items-center justify-center text-sm font-medium",
                step >= s.id
                  ? "bg-foreground text-background border-foreground"
                  : "bg-background text-muted-foreground border-border"
              )}
            >
              {step > s.id ? <CheckCircle2 className="h-4 w-4" /> : s.id}
            </div>
            <span className={cn("text-sm", step >= s.id ? "text-foreground" : "text-muted-foreground")}>
              {s.label}
            </span>
            {i < STEPS.length - 1 && <div className="flex-1 h-px bg-border" />}
          </div>
        ))}
      </div>

      <Card className="border border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">{STEPS[step - 1].label}</CardTitle>
            <CardDescription>Closing date: {format(closingDate, "PPP")}</CardDescription>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <CalendarIcon className="h-4 w-4 mr-2" />
                Pick date
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
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 1 && (
            <>
              {!summary ? (
                <p className="text-sm text-muted-foreground">No daily_summary row for this date yet.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Stat label="Income" value={fmt(summary.total_income || 0)} />
                  <Stat label="Expenses" value={fmt(summary.total_expenses || 0)} />
                  <Stat label="Savings" value={fmt(summary.total_savings || 0)} />
                  <Stat label="Withdrawals" value={fmt(summary.total_withdrawals || 0)} />
                  <Stat label="Cash" value={fmt(summary.cash_balance || 0)} />
                  <Stat label="eSewa" value={fmt(summary.esewa_balance || 0)} />
                  <Stat label="Fonepay" value={fmt(summary.fonepay_balance || 0)} />
                  <Stat label="Cooperative" value={fmt(summary.cooperative_balance || 0)} />
                </div>
              )}
            </>
          )}

          {step === 2 && (
            <div className="space-y-3">
              {!reconcile?.found ? (
                <p className="text-sm text-muted-foreground">No data to reconcile.</p>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    {hasVariance ? (
                      <Badge variant="destructive" className="gap-1">
                        <AlertCircle className="h-3 w-3" /> Variance detected
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Reconciled
                      </Badge>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => refetchReconcile()}>
                      Re-check
                    </Button>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="text-xs text-muted-foreground">
                      <tr className="border-b border-border">
                        <th className="text-left py-2">Account</th>
                        <th className="text-right py-2">Recorded</th>
                        <th className="text-right py-2">Computed</th>
                        <th className="text-right py-2">Δ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {["cash", "esewa", "fonepay", "cooperative"].map((k) => {
                        const v = Number(reconcile.variance[k] || 0);
                        return (
                          <tr key={k} className="border-b border-border last:border-0">
                            <td className="py-2 capitalize">{k}</td>
                            <td className="py-2 text-right tabular-nums">{fmt(reconcile.recorded[k] || 0)}</td>
                            <td className="py-2 text-right tabular-nums">{fmt(reconcile.computed[k] || 0)}</td>
                            <td className={cn("py-2 text-right tabular-nums", Math.abs(v) > 0.01 ? "text-rose-600" : "text-emerald-600")}>
                              {v >= 0 ? "+" : ""}{v.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Review the totals and lock the day. This will run the daily_closing routine and refresh the daily summary.
              </p>
              <Card className="border border-border bg-muted/30">
                <CardContent className="p-4 space-y-1 text-sm">
                  <div className="flex justify-between"><span>Date</span><span className="font-medium">{dateStr}</span></div>
                  <div className="flex justify-between"><span>Net Profit</span><span className="font-medium">{fmt((summary?.total_income || 0) - (summary?.total_expenses || 0))}</span></div>
                  <div className="flex justify-between"><span>Total Balance</span><span className="font-medium">{fmt(summary?.total_balance || 0)}</span></div>
                </CardContent>
              </Card>
              <Button onClick={handleLock} className="gap-2">
                <Lock className="h-4 w-4" /> Lock Day
              </Button>
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
    <p className="text-base font-semibold">{value}</p>
  </div>
);

export default DailyClosingWizardTab;
