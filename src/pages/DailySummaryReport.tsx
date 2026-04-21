import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CalendarIcon, Download, RefreshCw, Zap, ShoppingCart, Receipt, PiggyBank, Banknote } from "lucide-react";
import { format, subDays, startOfDay, endOfDay, formatISO } from "date-fns";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface DailySummaryRow {
  summary_date: string;
  total_income_from_orders: number | null;
  total_income_from_orders_cash: number | null;
  total_income_from_orders_fonepay: number | null;
  total_income_from_orders_esewa: number | null;
  total_income_from_charging: number | null;
  total_income_from_charging_fonepay: number | null;
  total_income_from_charging_esewa: number | null;
  total_income_from_charging_cash: number | null;
  total_expenses: number | null;
  total_expenses_cash: number | null;
  total_expenses_esewa: number | null;
  total_expenses_fonepay: number | null;
  total_deposits: number | null;
  total_deposits_cash: number | null;
  total_deposits_esewa: number | null;
  total_savings: number | null;
  total_savings_cash: number | null;
  total_savings_fonepay: number | null;
  total_savings_esewa: number | null;
  total_withdrawals: number | null;
  total_withdrawals_cooperative: number | null;
  total_withdrawals_cooperative_cash: number | null;
  total_withdrawals_cooperative_esewa: number | null;
  total_withdrawals_cooperative_fonepay: number | null;
  total_withdrawals_bank: number | null;
  total_withdrawals_bank_cash: number | null;
  total_withdrawals_bank_esewa: number | null;
  total_income: number | null;
  total_cash_income: number | null;
  total_fonepay_income: number | null;
  total_esewa_income: number | null;
  cash_balance: number | null;
  esewa_balance: number | null;
  fonepay_balance: number | null;
  cooperative_balance: number | null;
  total_balance: number | null;
  created_at: string | null;
  updated_at: string | null;
  total_income_fonepay: number | null;
  total_income_esewa: number | null;
  total_income_cash: number | null;
}

const COLUMNS: { key: keyof DailySummaryRow; label: string }[] = [
  { key: "summary_date", label: "summary_date" },
  { key: "total_income_from_orders", label: "total_income_from_orders" },
  { key: "total_income_from_orders_cash", label: "total_income_from_orders_cash" },
  { key: "total_income_from_orders_fonepay", label: "total_income_from_orders_fonepay" },
  { key: "total_income_from_orders_esewa", label: "total_income_from_orders_esewa" },
  { key: "total_income_from_charging", label: "total_income_from_charging" },
  { key: "total_income_from_charging_fonepay", label: "total_income_from_charging_fonepay" },
  { key: "total_income_from_charging_esewa", label: "total_income_from_charging_esewa" },
  { key: "total_income_from_charging_cash", label: "total_income_from_charging_cash" },
  { key: "total_expenses", label: "total_expenses" },
  { key: "total_expenses_cash", label: "total_expenses_cash" },
  { key: "total_expenses_esewa", label: "total_expenses_esewa" },
  { key: "total_expenses_fonepay", label: "total_expenses_fonepay" },
  { key: "total_deposits", label: "total_deposits" },
  { key: "total_deposits_cash", label: "total_deposits_cash" },
  { key: "total_deposits_esewa", label: "total_deposits_esewa" },
  { key: "total_savings", label: "total_savings" },
  { key: "total_savings_cash", label: "total_savings_cash" },
  { key: "total_savings_fonepay", label: "total_savings_fonepay" },
  { key: "total_savings_esewa", label: "total_savings_esewa" },
  { key: "total_withdrawals", label: "total_withdrawals" },
  { key: "total_withdrawals_cooperative", label: "total_withdrawals_cooperative" },
  { key: "total_withdrawals_cooperative_cash", label: "total_withdrawals_cooperative_cash" },
  { key: "total_withdrawals_cooperative_esewa", label: "total_withdrawals_cooperative_esewa" },
  { key: "total_withdrawals_cooperative_fonepay", label: "total_withdrawals_cooperative_fonepay" },
  { key: "total_withdrawals_bank", label: "total_withdrawals_bank" },
  { key: "total_withdrawals_bank_cash", label: "total_withdrawals_bank_cash" },
  { key: "total_withdrawals_bank_esewa", label: "total_withdrawals_bank_esewa" },
  { key: "total_income", label: "total_income" },
  { key: "total_cash_income", label: "total_cash_income" },
  { key: "total_fonepay_income", label: "total_fonepay_income" },
  { key: "total_esewa_income", label: "total_esewa_income" },
  { key: "cash_balance", label: "cash_balance" },
  { key: "esewa_balance", label: "esewa_balance" },
  { key: "fonepay_balance", label: "fonepay_balance" },
  { key: "cooperative_balance", label: "cooperative_balance" },
  { key: "total_balance", label: "total_balance" },
  { key: "created_at", label: "created_at" },
  { key: "updated_at", label: "updated_at" },
  { key: "total_income_fonepay", label: "total_income_fonepay" },
  { key: "total_income_esewa", label: "total_income_esewa" },
  { key: "total_income_cash", label: "total_income_cash" },
];

const fmtNum = (v: number | null | undefined) =>
  v === null || v === undefined ? "0.00" : Number(v).toFixed(2);

const fmtCurrency = (v: number) => `NRs. ${v.toFixed(2)}`;

const DailySummaryReport = () => {
  const yesterday = subDays(new Date(), 1);
  const [range, setRange] = useState<DateRange | undefined>({
    from: yesterday,
    to: yesterday,
  });
  const [rows, setRows] = useState<DailySummaryRow[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    if (!range?.from || !range?.to) return;
    setLoading(true);
    try {
      const fromStr = format(range.from, "yyyy-MM-dd");
      const toStr = format(range.to, "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("daily_summary")
        .select("*")
        .gte("summary_date", fromStr)
        .lte("summary_date", toStr)
        .order("summary_date", { ascending: false })
        .limit(10000);

      if (error) throw error;
      setRows((data as any) || []);
    } catch (e: any) {
      console.error("Failed to load daily summary:", e);
      toast.error(e?.message || "Failed to load daily summary");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range?.from?.toISOString(), range?.to?.toISOString()]);

  const totals = useMemo(() => {
    const sum = (key: keyof DailySummaryRow) =>
      rows.reduce((acc, r) => acc + (Number(r[key] as any) || 0), 0);
    return {
      charging: sum("total_income_from_charging"),
      orders: sum("total_income_from_orders"),
      expenses: sum("total_expenses"),
      savings: sum("total_savings"),
      withdrawals: sum("total_withdrawals"),
    };
  }, [rows]);

  const exportCsv = () => {
    if (rows.length === 0) {
      toast.info("No data to export");
      return;
    }
    const header = COLUMNS.map((c) => c.label).join(",");
    const lines = rows.map((r) =>
      COLUMNS.map((c) => {
        const val = r[c.key];
        if (val === null || val === undefined) return "";
        const s = String(val);
        return s.includes(",") ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(","),
    );
    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const fromStr = range?.from ? format(range.from, "yyyy-MM-dd") : "";
    const toStr = range?.to ? format(range.to, "yyyy-MM-dd") : "";
    a.download = `daily_summary_${fromStr}_to_${toStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const summaryCards = [
    {
      label: "Total income from charging session",
      value: totals.charging,
      icon: Zap,
    },
    {
      label: "Total income from Orders",
      value: totals.orders,
      icon: ShoppingCart,
    },
    {
      label: "Total Expenses",
      value: totals.expenses,
      icon: Receipt,
    },
    {
      label: "Total Savings",
      value: totals.savings,
      icon: PiggyBank,
    },
    {
      label: "Total Withdrawals",
      value: totals.withdrawals,
      icon: Banknote,
    },
  ];

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Daily Summary Report
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Data sourced directly from <code>daily_summary</code> table.
            Default range: yesterday.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal",
                  !range && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {range?.from ? (
                  range.to ? (
                    <>
                      {format(range.from, "LLL dd, y")} -{" "}
                      {format(range.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(range.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={range?.from}
                selected={range}
                onSelect={setRange}
                numberOfMonths={2}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>

          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setRange({ from: yesterday, to: yesterday })
            }
          >
            Yesterday
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setRange({ from: new Date(), to: new Date() })
            }
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setRange({ from: subDays(new Date(), 6), to: new Date() })
            }
          >
            Last 7 days
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setRange({ from: subDays(new Date(), 29), to: new Date() })
            }
          >
            Last 30 days
          </Button>

          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button size="sm" onClick={exportCsv}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {summaryCards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground leading-tight">
                      {c.label}
                    </p>
                    <p className="text-xl font-bold text-foreground mt-1">
                      {fmtCurrency(c.value)}
                    </p>
                  </div>
                  <div className="p-2 rounded-md bg-muted">
                    <Icon className="h-4 w-4 text-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detailed table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Daily Summary Details ({rows.length} {rows.length === 1 ? "day" : "days"})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {COLUMNS.map((c) => (
                    <TableHead key={c.key} className="whitespace-nowrap text-xs">
                      {c.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={COLUMNS.length} className="text-center py-8 text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={COLUMNS.length} className="text-center py-8 text-muted-foreground">
                      No daily summary data found for the selected range.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.summary_date}>
                      {COLUMNS.map((c) => {
                        const val = r[c.key];
                        let display: string;
                        if (c.key === "summary_date") {
                          display = String(val ?? "");
                        } else if (c.key === "created_at" || c.key === "updated_at") {
                          display = val ? format(new Date(val as string), "yyyy-MM-dd HH:mm") : "";
                        } else {
                          display = fmtNum(val as number | null);
                        }
                        return (
                          <TableCell key={c.key} className="whitespace-nowrap text-xs">
                            {display}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DailySummaryReport;
