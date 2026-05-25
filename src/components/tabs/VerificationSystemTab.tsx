import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, isBefore, startOfDay, addDays } from "date-fns";
import {
  ShieldCheck,
  Calendar as CalendarIcon,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  History,
  Settings2,
  Save,
  Calculator
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/unifiedCalculations";
import { cn } from "@/lib/utils";

const fmt = (n: number) => formatCurrency(Number(n) || 0);
const toDateStr = (d: Date) => format(d, "yyyy-MM-dd");

const VerificationSystemTab = () => {
  const qc = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [actualCash, setActualCash] = useState<string>("");
  const [actualFonepay, setActualFonepay] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  // Settings State
  const [openingBalance, setOpeningBalance] = useState<string>("0");
  const [cutoffDate, setCutoffDate] = useState<Date>(new Date("2024-01-01"));
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);

  const dateStr = useMemo(() => toDateStr(selectedDate), [selectedDate]);

  // Fetch Settings
  const settingsQ = useQuery({
    queryKey: ["verification-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("verification_settings")
        .select("*")
        .eq("id", 1)
        .single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (settingsQ.data) {
      setOpeningBalance(settingsQ.data.opening_cash_balance.toString());
      setCutoffDate(parseISO(settingsQ.data.cutoff_date));
    }
  }, [settingsQ.data]);

  // Fetch Daily Summary for selected date
  const summaryQ = useQuery({
    queryKey: ["daily-summary-verification", dateStr],
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

  useEffect(() => {
    if (summaryQ.data) {
      setActualCash(summaryQ.data.actual_cash_in_hand?.toString() || "");
      setActualFonepay(summaryQ.data.actual_fonepay_total?.toString() || "");
    } else {
      setActualCash("");
      setActualFonepay("");
    }
  }, [summaryQ.data]);

  // Fetch History for Report
  const historyQ = useQuery({
    queryKey: ["verification-history", format(cutoffDate, "yyyy-MM-dd"), dateStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_summary")
        .select("*")
        .gte("summary_date", format(cutoffDate, "yyyy-MM-dd"))
        .lte("summary_date", dateStr)
        .order("summary_date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!settingsQ.data,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async () => {
      setIsUpdatingSettings(true);
      const { error } = await supabase
        .from("verification_settings")
        .update({
          opening_cash_balance: Number(openingBalance) || 0,
          cutoff_date: format(cutoffDate, "yyyy-MM-dd"),
          updated_at: new Date().toISOString(),
        })
        .eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Settings updated");
      settingsQ.refetch();
      historyQ.refetch();
    },
    onError: (e: any) => toast.error(e.message || "Update failed"),
    onSettled: () => setIsUpdatingSettings(false),
  });

  const saveActualsMutation = useMutation({
    mutationFn: async () => {
      setIsSaving(true);
      const { error } = await supabase
        .from("daily_summary")
        .update({
          actual_cash_in_hand: Number(actualCash) || 0,
          actual_fonepay_total: Number(actualFonepay) || 0,
          updated_at: new Date().toISOString(),
        })
        .eq("summary_date", dateStr);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Verification saved");
      summaryQ.refetch();
      historyQ.refetch();
    },
    onError: (e: any) => toast.error(e.message || "Save failed"),
    onSettled: () => setIsSaving(false),
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase.rpc as any)("sync_daily_summary_for_date", {
        target_date: dateStr,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Summary refreshed");
      summaryQ.refetch();
    },
    onError: (e: any) => toast.error(e.message || "Refresh failed"),
  });

  // Calculations for the selected day
  const dailyMetrics = useMemo(() => {
    if (!summaryQ.data) return null;
    const s = summaryQ.data;
    const cashSales = (Number(s.total_income_from_orders_cash) || 0) + (Number(s.total_income_from_charging_cash) || 0);
    const cashOut = (Number(s.total_expenses_cash) || 0) + (Number(s.total_withdrawals_cash) || 0) + (Number(s.total_savings_cash) || 0);
    // User formula: Total sales in cash (order + charging) + Opening cash in hand balance - cash expenses - cash withdrawal from counter - cash savings
    // We'll use the accumulated opening balance for the day.

    return {
      cashSales,
      cashOut,
      fonepaySystem: Number(s.total_income_fonepay) || 0,
    };
  }, [summaryQ.data]);

  const historyReport = useMemo(() => {
    if (!historyQ.data || !settingsQ.data) return [];
    let accumulatedCash = Number(settingsQ.data.opening_cash_balance) || 0;

    return historyQ.data.map((s: any) => {
      const cashIn = (Number(s.total_income_from_orders_cash) || 0) + (Number(s.total_income_from_charging_cash) || 0);
      const cashOut = (Number(s.total_expenses_cash) || 0) + (Number(s.total_withdrawals_cash) || 0) + (Number(s.total_savings_cash) || 0) + (Number(s.total_deposits_from_cash) || 0);

      const expectedClosing = accumulatedCash + cashIn - cashOut;
      const actualClosing = Number(s.actual_cash_in_hand) || 0;
      const variance = actualClosing - expectedClosing;

      const row = {
        date: s.summary_date,
        opening: accumulatedCash,
        cashIn,
        cashOut,
        expectedClosing,
        actualClosing,
        variance,
        fonepaySystem: Number(s.total_income_fonepay) || 0,
        fonepayActual: Number(s.actual_fonepay_total) || 0,
        fonepayVariance: (Number(s.actual_fonepay_total) || 0) - (Number(s.total_income_fonepay) || 0)
      };

      // For the next day, the opening is the actual closing of this day if available, otherwise expected?
      // Actually, usually it's the actual closing.
      accumulatedCash = actualClosing || expectedClosing;

      return row;
    });
  }, [historyQ.data, settingsQ.data]);

  const currentDayRow = historyReport.find(r => r.date === dateStr);
  const totalAccumulatedCash = historyReport.length > 0 ? historyReport[historyReport.length - 1].actualClosing || historyReport[historyReport.length - 1].expectedClosing : (Number(settingsQ.data?.opening_cash_balance) || 0);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-foreground flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            Verification System
          </h2>
          <p className="text-sm text-muted-foreground">
            Financial reconciliation and audit tracking.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-10 rounded-xl font-bold border-primary/20">
                <CalendarIcon className="h-4 w-4 mr-2" />
                {format(selectedDate, "PPP")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => d && setSelectedDate(d)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Button
            variant="outline"
            size="icon"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="h-10 w-10 rounded-xl border-primary/20"
          >
            <RefreshCw className={cn("h-4 w-4", syncMutation.isPending && "animate-spin")} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Panel */}
        <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden lg:col-span-1">
          <CardHeader className="bg-slate-900 text-white p-4">
            <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest">
              <Settings2 className="h-4 w-4" />
              System Parameters
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Opening Cash Balance (One Time)</Label>
              <Input
                type="number"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                className="h-11 rounded-xl font-bold"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Cut-off Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full h-11 justify-start text-left font-bold rounded-xl">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(cutoffDate, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={cutoffDate}
                    onSelect={(d) => d && setCutoffDate(d)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <Button
              onClick={() => updateSettingsMutation.mutate()}
              disabled={isUpdatingSettings}
              className="w-full h-11 rounded-xl font-black uppercase tracking-widest text-xs bg-primary shadow-lg shadow-primary/20"
            >
              {isUpdatingSettings ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Update Settings
            </Button>
          </CardContent>
        </Card>

        {/* Verification Form */}
        <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden lg:col-span-2">
          <CardHeader className="bg-primary text-white p-4">
            <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest">
              <Calculator className="h-4 w-4" />
              Daily Verification Entry
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {!summaryQ.data ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mb-4 opacity-20" />
                <p className="font-bold">No summary data found for {dateStr}</p>
                <Button variant="link" onClick={() => syncMutation.mutate()} className="mt-2">
                  Click here to generate summary
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Cash Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b pb-2">
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">CASH</Badge>
                      <h4 className="text-xs font-black uppercase tracking-tighter text-slate-400">System Calculated</h4>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground font-medium">Opening Balance (prev day)</span>
                        <span className="font-bold">{fmt(currentDayRow?.opening || 0)}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground font-medium">Cash Sales (Orders + Charging)</span>
                        <span className="font-bold text-emerald-600">+{fmt(dailyMetrics?.cashSales || 0)}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground font-medium">Cash Out (Exp + With + Sav + Dep)</span>
                        <span className="font-bold text-rose-600">-{fmt(currentDayRow?.cashOut || 0)}</span>
                      </div>
                      <div className="flex justify-between text-sm pt-2 border-t font-black">
                        <span>Expected Cash</span>
                        <span className="text-primary">{fmt(currentDayRow?.expectedClosing || 0)}</span>
                      </div>
                    </div>

                    <div className="space-y-2 pt-4">
                      <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Actual Cash In Hand</Label>
                      <Input
                        type="number"
                        value={actualCash}
                        onChange={(e) => setActualCash(e.target.value)}
                        placeholder="0.00"
                        className="h-12 text-lg font-black rounded-xl border-primary/20 focus:ring-primary"
                      />
                      {actualCash !== "" && (
                        <div className={cn(
                          "flex justify-between items-center p-3 rounded-xl text-xs font-black uppercase tracking-widest mt-2",
                          (Number(actualCash) - (currentDayRow?.expectedClosing || 0)) >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                        )}>
                          <span>Cash Variance</span>
                          <span>{fmt(Number(actualCash) - (currentDayRow?.expectedClosing || 0))}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Fonepay Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b pb-2">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">FONEPAY / BANK</Badge>
                      <h4 className="text-xs font-black uppercase tracking-tighter text-slate-400">System Recorded</h4>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between text-sm py-4 font-black">
                        <span>Fonepay Total Sales</span>
                        <span className="text-blue-600">{fmt(dailyMetrics?.fonepaySystem || 0)}</span>
                      </div>
                    </div>

                    <div className="space-y-2 pt-4">
                      <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Actual Bank/Fonepay Total</Label>
                      <Input
                        type="number"
                        value={actualFonepay}
                        onChange={(e) => setActualFonepay(e.target.value)}
                        placeholder="0.00"
                        className="h-12 text-lg font-black rounded-xl border-blue-200 focus:ring-blue-500"
                      />
                      {actualFonepay !== "" && (
                        <div className={cn(
                          "flex justify-between items-center p-3 rounded-xl text-xs font-black uppercase tracking-widest mt-2",
                          (Number(actualFonepay) - (dailyMetrics?.fonepaySystem || 0)) >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                        )}>
                          <span>Fonepay Variance</span>
                          <span>{fmt(Number(actualFonepay) - (dailyMetrics?.fonepaySystem || 0))}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t flex justify-end">
                  <Button
                    onClick={() => saveActualsMutation.mutate()}
                    disabled={isSaving}
                    className="h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-xs bg-foreground text-background hover:bg-foreground/90 shadow-xl transition-all active:scale-95"
                  >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                    Save Daily Verification
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* History Report */}
      <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden">
        <CardHeader className="bg-slate-50 p-6 flex flex-row items-center justify-between border-b">
          <div>
            <CardTitle className="text-lg font-black flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Verification Report
            </CardTitle>
            <CardDescription className="text-xs uppercase font-bold tracking-widest">
              From {format(cutoffDate, "MMM dd, yyyy")} to {format(selectedDate, "MMM dd, yyyy")}
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Accumulated Cash Balance</p>
            <p className="text-2xl font-black text-primary">{fmt(totalAccumulatedCash)}</p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-500 font-black uppercase tracking-wider border-b">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Opening</th>
                  <th className="px-4 py-3 text-right">Cash In</th>
                  <th className="px-4 py-3 text-right">Cash Out</th>
                  <th className="px-4 py-3 text-right">Expected</th>
                  <th className="px-4 py-3 text-right">Actual</th>
                  <th className="px-4 py-3 text-right">Variance</th>
                  <th className="px-4 py-3 text-right">Fonepay Var.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...historyReport].reverse().map((row, i) => (
                  <tr key={row.date} className={cn("hover:bg-slate-50/50 transition-colors", i === 0 && "bg-primary/5")}>
                    <td className="px-4 py-3 font-bold">{format(parseISO(row.date), "MMM dd, EEE")}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{fmt(row.opening)}</td>
                    <td className="px-4 py-3 text-right text-emerald-600 font-medium">+{fmt(row.cashIn)}</td>
                    <td className="px-4 py-3 text-right text-rose-600 font-medium">-{fmt(row.cashOut)}</td>
                    <td className="px-4 py-3 text-right font-medium">{fmt(row.expectedClosing)}</td>
                    <td className="px-4 py-3 text-right font-black">{row.actualClosing ? fmt(row.actualClosing) : "-"}</td>
                    <td className={cn("px-4 py-3 text-right font-black", row.variance < 0 ? "text-rose-600" : row.variance > 0 ? "text-emerald-600" : "text-slate-400")}>
                      {row.variance !== 0 ? (row.variance > 0 ? "+" : "") + row.variance.toFixed(0) : "0"}
                    </td>
                    <td className={cn("px-4 py-3 text-right font-black", row.fonepayVariance < 0 ? "text-rose-600" : row.fonepayVariance > 0 ? "text-emerald-600" : "text-slate-400")}>
                      {row.fonepayVariance !== 0 ? (row.fonepayVariance > 0 ? "+" : "") + row.fonepayVariance.toFixed(0) : "0"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VerificationSystemTab;
