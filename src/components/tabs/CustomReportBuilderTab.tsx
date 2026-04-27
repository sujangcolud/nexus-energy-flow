import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { Calendar as CalendarIcon, Download, GripVertical, Plus, Trash2, FileSpreadsheet } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type Source =
  | "orders"
  | "charging_sessions"
  | "expenses"
  | "deposits"
  | "withdrawals"
  | "cooperative_savings";

const SOURCES: Record<Source, { label: string; dateField: string; fields: string[] }> = {
  orders: { label: "Orders", dateField: "order_date", fields: ["item_name", "quantity", "rate", "total", "payment_mode"] },
  charging_sessions: { label: "Charging", dateField: "session_date", fields: ["category", "kcal", "total_amount", "payment_mode"] },
  expenses: { label: "Expenses", dateField: "expense_date", fields: ["description", "category", "amount", "payment_mode"] },
  deposits: { label: "Deposits", dateField: "deposit_date", fields: ["amount", "deposited_by", "deposited_to", "mode"] },
  withdrawals: { label: "Withdrawals", dateField: "withdrawal_date", fields: ["amount", "purpose", "withdrawal_from", "payment_mode"] },
  cooperative_savings: { label: "Savings", dateField: "contribution_date", fields: ["member_id", "contribution_amount", "payment_mode", "savings_to"] },
};

interface FilterRule {
  id: string;
  field: string;
  op: "=" | "contains" | ">" | "<";
  value: string;
}

const CustomReportBuilderTab = () => {
  const [source, setSource] = useState<Source>("orders");
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [selectedFields, setSelectedFields] = useState<string[]>(SOURCES.orders.fields);
  const [filters, setFilters] = useState<FilterRule[]>([]);

  const meta = SOURCES[source];

  const handleSourceChange = (s: Source) => {
    setSource(s);
    setSelectedFields(SOURCES[s].fields);
    setFilters([]);
  };

  const toggleField = (f: string) => {
    setSelectedFields((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]));
  };

  // drag-and-drop reordering for selectedFields
  const onDragStart = (e: React.DragEvent, idx: number) => {
    e.dataTransfer.setData("idx", String(idx));
  };
  const onDrop = (e: React.DragEvent, idx: number) => {
    const from = Number(e.dataTransfer.getData("idx"));
    if (Number.isNaN(from) || from === idx) return;
    setSelectedFields((cur) => {
      const next = [...cur];
      const [m] = next.splice(from, 1);
      next.splice(idx, 0, m);
      return next;
    });
  };

  const { data: rows, isFetching, refetch } = useQuery({
    queryKey: ["custom-report", source, format(startDate, "yyyy-MM-dd"), format(endDate, "yyyy-MM-dd")],
    queryFn: async () => {
      let query = supabase
        .from(source as any)
        .select("*")
        .gte(meta.dateField, format(startDate, "yyyy-MM-dd"))
        .lte(meta.dateField, format(endDate, "yyyy-MM-dd"))
        .order(meta.dateField, { ascending: false })
        .limit(5000);
      const { data, error } = await query;
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  const filtered = useMemo(() => {
    if (!rows) return [];
    return rows.filter((r) => {
      return filters.every((f) => {
        const v = r[f.field];
        if (v === null || v === undefined) return false;
        if (f.op === "=") return String(v).toLowerCase() === f.value.toLowerCase();
        if (f.op === "contains") return String(v).toLowerCase().includes(f.value.toLowerCase());
        if (f.op === ">") return Number(v) > Number(f.value);
        if (f.op === "<") return Number(v) < Number(f.value);
        return true;
      });
    });
  }, [rows, filters]);

  // Detect numeric columns and compute totals for the totals row
  const totals = useMemo(() => {
    const t: Record<string, number> = {};
    for (const f of selectedFields) {
      let sum = 0;
      let isNumeric = false;
      for (const r of filtered) {
        const v = r[f];
        if (v === null || v === undefined || v === "") continue;
        const n = Number(v);
        if (!Number.isFinite(n)) { isNumeric = false; break; }
        isNumeric = true;
        sum += n;
      }
      if (isNumeric && filtered.length > 0) t[f] = sum;
    }
    return t;
  }, [filtered, selectedFields]);

  const exportCsv = () => {
    if (!filtered.length) return;
    const cols = [meta.dateField, ...selectedFields];
    const header = cols.join(",");
    const lines = filtered.map((r) =>
      cols.map((c) => {
        const v = r[c];
        if (v === null || v === undefined) return "";
        const s = String(v).replace(/"/g, '""');
        return /[",\n]/.test(s) ? `"${s}"` : s;
      }).join(",")
    );
    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${source}-${format(startDate, "yyyyMMdd")}-${format(endDate, "yyyyMMdd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Custom Report Builder</h2>
        <p className="text-sm text-muted-foreground">
          Pick a source, drag fields to reorder, add filters, then export.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border border-border lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Source &amp; Range</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Data source</label>
              <Select value={source} onValueChange={(v) => handleSourceChange(v as Source)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SOURCES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <DateBtn date={startDate} onChange={setStartDate} label="From" />
              <DateBtn date={endDate} onChange={setEndDate} label="To" />
            </div>
            <Button onClick={() => refetch()} variant="outline" className="w-full" size="sm">Run Query</Button>
          </CardContent>
        </Card>

        <Card className="border border-border lg:col-span-1">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Fields (drag to reorder)</CardTitle>
            <Badge variant="secondary">{selectedFields.length}</Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {selectedFields.map((f, i) => (
                <div
                  key={f}
                  draggable
                  onDragStart={(e) => onDragStart(e, i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => onDrop(e, i)}
                  className="flex items-center justify-between p-2 rounded border border-border bg-card text-sm cursor-move hover:bg-muted/40"
                >
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{f}</span>
                  </div>
                  <button
                    className="text-muted-foreground hover:text-rose-600"
                    onClick={() => toggleField(f)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-3">
              <p className="text-xs text-muted-foreground mb-1">Available</p>
              <div className="flex flex-wrap gap-1">
                {meta.fields.filter((f) => !selectedFields.includes(f)).map((f) => (
                  <Button key={f} size="sm" variant="outline" className="h-6 text-xs" onClick={() => toggleField(f)}>
                    <Plus className="h-3 w-3 mr-1" /> {f}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border lg:col-span-1">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Filters</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setFilters((f) => [
                  ...f,
                  { id: crypto.randomUUID(), field: meta.fields[0], op: "contains", value: "" },
                ])
              }
            >
              <Plus className="h-3 w-3 mr-1" /> Add
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {filters.length === 0 && (
              <p className="text-xs text-muted-foreground">No filters. Showing all rows.</p>
            )}
            {filters.map((f) => (
              <div key={f.id} className="grid grid-cols-12 gap-1">
                <Select value={f.field} onValueChange={(v) => setFilters((cur) => cur.map((x) => x.id === f.id ? { ...x, field: v } : x))}>
                  <SelectTrigger className="col-span-5 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {meta.fields.map((fl) => (<SelectItem key={fl} value={fl}>{fl}</SelectItem>))}
                  </SelectContent>
                </Select>
                <Select value={f.op} onValueChange={(v: any) => setFilters((cur) => cur.map((x) => x.id === f.id ? { ...x, op: v } : x))}>
                  <SelectTrigger className="col-span-3 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contains">contains</SelectItem>
                    <SelectItem value="=">=</SelectItem>
                    <SelectItem value=">">&gt;</SelectItem>
                    <SelectItem value="<">&lt;</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  className="col-span-3 h-8 text-xs"
                  value={f.value}
                  onChange={(e) => setFilters((cur) => cur.map((x) => x.id === f.id ? { ...x, value: e.target.value } : x))}
                />
                <Button
                  variant="ghost" size="icon" className="col-span-1 h-8"
                  onClick={() => setFilters((cur) => cur.filter((x) => x.id !== f.id))}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Results</CardTitle>
            <CardDescription>
              {isFetching ? "Loading…" : `${filtered.length} of ${rows?.length || 0} rows`}
            </CardDescription>
          </div>
          <Button size="sm" onClick={exportCsv} disabled={!filtered.length} className="gap-1">
            <FileSpreadsheet className="h-4 w-4" /> Export CSV
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b border-border">
                <tr>
                  <th className="text-left py-2 px-2">{meta.dateField}</th>
                  {selectedFields.map((f) => (
                    <th key={f} className="text-left py-2 px-2">{f}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 && (
                  <tr className="border-b border-border bg-muted/60 font-semibold">
                    <td className="py-1.5 px-2 text-xs uppercase tracking-wide text-muted-foreground">Total ({filtered.length})</td>
                    {selectedFields.map((f) => (
                      <td key={f} className="py-1.5 px-2">
                        {totals[f] !== undefined
                          ? Number(totals[f]).toLocaleString(undefined, { maximumFractionDigits: 2 })
                          : ""}
                      </td>
                    ))}
                  </tr>
                )}
                {filtered.slice(0, 200).map((r, i) => (
                  <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="py-1.5 px-2 whitespace-nowrap">{r[meta.dateField]}</td>
                    {selectedFields.map((f) => (
                      <td key={f} className="py-1.5 px-2">{String(r[f] ?? "")}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length > 200 && (
              <p className="text-xs text-muted-foreground mt-2">Showing first 200 rows. Export CSV for full set.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const DateBtn = ({ date, onChange, label }: { date: Date; onChange: (d: Date) => void; label: string }) => (
  <Popover>
    <PopoverTrigger asChild>
      <Button variant="outline" size="sm" className="justify-start font-normal">
        <CalendarIcon className="h-3.5 w-3.5 mr-1" />
        {label}: {format(date, "MMM d")}
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-auto p-0" align="start">
      <Calendar mode="single" selected={date} onSelect={(d) => d && onChange(d)} className="p-3 pointer-events-auto" />
    </PopoverContent>
  </Popover>
);

export default CustomReportBuilderTab;
