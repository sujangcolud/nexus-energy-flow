import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2, Pencil, Save, X, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/unifiedCalculations";

type ModuleConfig = {
  key: string;
  title: string;
  table: string;
  dateColumn: string;
  amountColumn: string;
  // columns shown in the table; first item = primary label/description
  columns: { key: string; label: string; type?: "text" | "number" | "date"; editable?: boolean }[];
};

const MODULES: ModuleConfig[] = [
  {
    key: "orders",
    title: "Orders",
    table: "orders",
    dateColumn: "order_date",
    amountColumn: "total",
    columns: [
      { key: "item_name", label: "Item", type: "text", editable: true },
      { key: "quantity", label: "Qty", type: "number", editable: true },
      { key: "rate", label: "Rate", type: "number", editable: true },
      { key: "payment_mode", label: "Payment", type: "text", editable: true },
      { key: "total", label: "Total", type: "number", editable: true },
    ],
  },
  {
    key: "charging",
    title: "Charging Sessions",
    table: "charging_sessions",
    dateColumn: "session_date",
    amountColumn: "total_amount",
    columns: [
      { key: "category", label: "Category", type: "text", editable: true },
      { key: "kcal", label: "kWh", type: "number", editable: true },
      { key: "per_unit_rate", label: "Rate", type: "number", editable: true },
      { key: "payment_mode", label: "Payment", type: "text", editable: true },
      { key: "total_amount", label: "Total", type: "number", editable: true },
    ],
  },
  {
    key: "expenses",
    title: "Expenses",
    table: "expenses",
    dateColumn: "expense_date",
    amountColumn: "amount",
    columns: [
      { key: "description", label: "Description", type: "text", editable: true },
      { key: "category", label: "Category", type: "text", editable: true },
      { key: "payment_mode", label: "Payment", type: "text", editable: true },
      { key: "remarks", label: "Remarks", type: "text", editable: true },
      { key: "amount", label: "Amount", type: "number", editable: true },
    ],
  },
  {
    key: "deposits",
    title: "Deposits",
    table: "deposits",
    dateColumn: "deposit_date",
    amountColumn: "amount",
    columns: [
      { key: "deposited_by", label: "Deposited By", type: "text", editable: true },
      { key: "deposited_to", label: "To Wallet", type: "text", editable: true },
      { key: "mode", label: "Mode", type: "text", editable: true },
      { key: "remarks", label: "Remarks", type: "text", editable: true },
      { key: "amount", label: "Amount", type: "number", editable: true },
    ],
  },
  {
    key: "withdrawals",
    title: "Withdrawals",
    table: "withdrawals",
    dateColumn: "withdrawal_date",
    amountColumn: "amount",
    columns: [
      { key: "purpose", label: "Purpose", type: "text", editable: true },
      { key: "withdrawal_from", label: "From", type: "text", editable: true },
      { key: "payment_mode", label: "Payment", type: "text", editable: true },
      { key: "remarks", label: "Remarks", type: "text", editable: true },
      { key: "amount", label: "Amount", type: "number", editable: true },
    ],
  },
  {
    key: "savings",
    title: "Cooperative Savings",
    table: "cooperative_savings",
    dateColumn: "contribution_date",
    amountColumn: "contribution_amount",
    columns: [
      { key: "member_id", label: "Member", type: "text", editable: true },
      { key: "cycle_period", label: "Cycle", type: "text", editable: true },
      { key: "savings_to", label: "To", type: "text", editable: true },
      { key: "payment_mode", label: "Payment", type: "text", editable: true },
      { key: "contribution_amount", label: "Amount", type: "number", editable: true },
    ],
  },
];

const fmt = (n: number) => formatCurrency(Number(n) || 0);

interface ModuleSectionProps {
  config: ModuleConfig;
  fromDate: string;
  toDate: string;
  editable: boolean;
}

const ModuleSection = ({ config, fromDate, toDate, editable }: ModuleSectionProps) => {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<any>({});

  const queryKey = ["day-entries", config.table, fromDate, toDate];

  const { data: rows = [], isLoading, refetch, isFetching } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from(config.table)
        .select("*")
        .gte(config.dateColumn, fromDate)
        .lte(config.dateColumn, toDate)
        .order(config.dateColumn, { ascending: false })
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) throw error;
      return data || [];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: any }) => {
      const cleaned: any = {};
      for (const col of config.columns) {
        if (!col.editable) continue;
        const v = patch[col.key];
        if (v === undefined) continue;
        cleaned[col.key] = col.type === "number" ? (v === "" || v === null ? null : Number(v)) : v;
      }
      const { error } = await (supabase as any).from(config.table).update(cleaned).eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success(`${config.title.slice(0, -1)} updated`);
      setEditingId(null);
      setDraft({});
      await qc.invalidateQueries({ queryKey });
    },
    onError: (e: any) => toast.error(e.message || "Update failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from(config.table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Entry deleted");
      await qc.invalidateQueries({ queryKey });
    },
    onError: (e: any) => toast.error(e.message || "Delete failed"),
  });

  const total = (rows as any[]).reduce(
    (acc, r) => acc + (Number(r[config.amountColumn]) || 0),
    0,
  );

  const startEdit = (row: any) => {
    setEditingId(row.id);
    const d: any = {};
    for (const col of config.columns) d[col.key] = row[col.key] ?? "";
    setDraft(d);
  };

  return (
    <Card className="border border-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3">
        <CardTitle className="text-sm font-medium">
          {config.title}{" "}
          <span className="text-xs font-normal text-muted-foreground">
            ({(rows as any[]).length})
          </span>
        </CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Total:</span>
          <span className="text-sm font-semibold tabular-nums">{fmt(total)}</span>
          <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs whitespace-nowrap">Date</TableHead>
                {config.columns.map((c) => (
                  <TableHead key={c.key} className="text-xs whitespace-nowrap">
                    {c.label}
                  </TableHead>
                ))}
                {editable && <TableHead className="text-xs text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={config.columns.length + (editable ? 2 : 1)}
                    className="text-center py-6 text-muted-foreground text-xs"
                  >
                    Loading…
                  </TableCell>
                </TableRow>
              ) : (rows as any[]).length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={config.columns.length + (editable ? 2 : 1)}
                    className="text-center py-6 text-muted-foreground text-xs"
                  >
                    No entries.
                  </TableCell>
                </TableRow>
              ) : (
                (rows as any[]).map((row) => {
                  const isEditing = editable && editingId === row.id;
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {row[config.dateColumn] || "—"}
                      </TableCell>
                      {config.columns.map((c) => (
                        <TableCell key={c.key} className="text-xs whitespace-nowrap">
                          {isEditing && c.editable ? (
                            <Input
                              type={c.type === "number" ? "number" : "text"}
                              value={draft[c.key] ?? ""}
                              onChange={(e) =>
                                setDraft((d: any) => ({ ...d, [c.key]: e.target.value }))
                              }
                              className="h-7 text-xs min-w-[80px]"
                            />
                          ) : c.type === "number" ? (
                            <span className="tabular-nums">
                              {row[c.key] === null || row[c.key] === undefined
                                ? "—"
                                : Number(row[c.key]).toFixed(2)}
                            </span>
                          ) : (
                            String(row[c.key] ?? "—")
                          )}
                        </TableCell>
                      ))}
                      {editable && (
                        <TableCell className="text-right whitespace-nowrap">
                          {isEditing ? (
                            <div className="flex justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  updateMutation.mutate({ id: row.id, patch: draft })
                                }
                                disabled={updateMutation.isPending}
                              >
                                {updateMutation.isPending ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Save className="h-3.5 w-3.5" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingId(null);
                                  setDraft({});
                                }}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-1">
                              <Button size="sm" variant="ghost" onClick={() => startEdit(row)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  if (confirm("Delete this entry?")) deleteMutation.mutate(row.id);
                                }}
                                disabled={deleteMutation.isPending}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
            {(rows as any[]).length > 0 && (
              <TableFooter>
                <TableRow>
                  <TableCell
                    colSpan={config.columns.length}
                    className="text-xs font-medium"
                  >
                    Total
                  </TableCell>
                  <TableCell className="text-xs font-semibold tabular-nums text-right">
                    {fmt(total)}
                  </TableCell>
                  {editable && <TableCell />}
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

interface DayEntriesEditorProps {
  fromDate: string; // yyyy-MM-dd
  toDate: string;   // yyyy-MM-dd
  editable?: boolean;
  title?: string;
}

const DayEntriesEditor = ({
  fromDate,
  toDate,
  editable = false,
  title,
}: DayEntriesEditorProps) => {
  return (
    <div className="space-y-4">
      {title && (
        <div>
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground">
            {fromDate === toDate ? fromDate : `${fromDate} → ${toDate}`}
          </p>
        </div>
      )}
      {MODULES.map((m) => (
        <ModuleSection
          key={m.key}
          config={m}
          fromDate={fromDate}
          toDate={toDate}
          editable={editable}
        />
      ))}
    </div>
  );
};

export default DayEntriesEditor;
