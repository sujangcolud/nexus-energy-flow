import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2, Pencil, Save, X, RefreshCw, Trash2, Plus, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/unifiedCalculations";
import { useAuth } from "@/context/AuthContext";
import RecordAttachments, { type AttachmentRecordType } from "@/components/RecordAttachments";

type FieldDef = { key: string; label: string; type?: "text" | "number" | "date"; editable?: boolean };
type ModuleConfig = {
  key: string;
  title: string;
  table: string;
  dateColumn: string;
  amountColumn: string;
  // columns shown in the table; first item = primary label/description
  columns: FieldDef[];
  // additional fields shown only in the expanded edit panel (not in the table)
  extraEditFields?: FieldDef[];
  attachmentType?: AttachmentRecordType;
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
      { key: "start_percentage", label: "From %", type: "number", editable: true },
      { key: "end_percentage", label: "To %", type: "number", editable: true },
      { key: "per_percent_rate", label: "Rate / %", type: "number", editable: true },
      { key: "payment_mode", label: "Payment", type: "text", editable: true },
      { key: "total_amount", label: "Total", type: "number", editable: true },
    ],
    extraEditFields: [
      { key: "category", label: "Category", type: "text", editable: true },
      { key: "kcal", label: "kWh", type: "number", editable: true },
      { key: "per_unit_rate", label: "Rate / unit", type: "number", editable: true },
      { key: "amount", label: "Amount", type: "number", editable: true },
    ],
  },
  {
    key: "expenses",
    title: "Expenses",
    table: "expenses",
    dateColumn: "expense_date",
    amountColumn: "amount",
    attachmentType: "expense",
    columns: [
      { key: "description", label: "Description", type: "text", editable: true },
      { key: "category", label: "Category", type: "text", editable: true },
      { key: "payment_mode", label: "Payment", type: "text", editable: true },
      { key: "remarks", label: "Remarks", type: "text", editable: true },
      { key: "amount", label: "Amount", type: "number", editable: true },
    ],
    extraEditFields: [
      { key: "is_inventory_purchase", label: "Inventory Purchase", type: "text", editable: true },
      { key: "is_credit", label: "On Credit", type: "text", editable: true },
      { key: "inventory_item_id", label: "Inventory Item ID", type: "text", editable: true },
      { key: "quantity", label: "Quantity", type: "number", editable: true },
      { key: "unit", label: "Unit", type: "text", editable: true },
      { key: "cost_per_unit", label: "Rate", type: "number", editable: true },
      { key: "supplier", label: "Supplier", type: "text", editable: true },
      { key: "invoice_number", label: "Invoice #", type: "text", editable: true },
    ],
  },
  {
    key: "expense_bookings",
    title: "Expense Bookings",
    table: "expense_bookings",
    dateColumn: "booking_date",
    amountColumn: "amount",
    attachmentType: "expense_booking",
    columns: [
      { key: "party_name", label: "Party", type: "text", editable: true },
      { key: "category", label: "Category", type: "text", editable: true },
      { key: "payment_mode", label: "Payment", type: "text", editable: true },
      { key: "remarks", label: "Remarks", type: "text", editable: true },
      { key: "amount", label: "Amount", type: "number", editable: true },
    ],
    extraEditFields: [
      { key: "is_inventory_purchase", label: "Inventory Purchase", type: "text", editable: true },
      { key: "inventory_item_id", label: "Inventory Item ID", type: "text", editable: true },
      { key: "quantity", label: "Quantity", type: "number", editable: true },
      { key: "unit", label: "Unit", type: "text", editable: true },
      { key: "cost_per_unit", label: "Rate", type: "number", editable: true },
      { key: "supplier", label: "Supplier", type: "text", editable: true },
      { key: "invoice_number", label: "Invoice #", type: "text", editable: true },
    ],
  },
  {
    key: "deposits",
    title: "Deposits",
    table: "deposits",
    dateColumn: "deposit_date",
    amountColumn: "amount",
    attachmentType: "deposit",
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
    attachmentType: "withdrawal",
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
    attachmentType: "cooperative_saving",
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
  const { user } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<any>({});
  const [adding, setAdding] = useState(false);
  const [newDraft, setNewDraft] = useState<any>({});

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

  const { data: attachmentCounts = {} } = useQuery({
    queryKey: ["attachment-counts", config.attachmentType, (rows as any[]).map(r => r.id)],
    enabled: !!config.attachmentType && rows.length > 0,
    queryFn: async () => {
      const ids = (rows as any[]).map(r => r.id);
      const { data, error } = await supabase
        .from("record_attachments")
        .select("record_id")
        .eq("record_type", config.attachmentType!)
        .in("record_id", ids);
      if (error) throw error;

      const counts: Record<string, number> = {};
      data.forEach((a: any) => {
        counts[a.record_id] = (counts[a.record_id] || 0) + 1;
      });
      return counts;
    }
  });

  const allEditFields: FieldDef[] = [
    ...config.columns,
    ...(config.extraEditFields || []),
  ];

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: any }) => {
      if (config.table === "expenses" || config.table === "expense_bookings") {
        const { error } = await supabase.rpc("process_inventory_expense", {
          p_user_id: user?.id,
          p_description: patch.description || patch.party_name,
          p_amount: Number(patch.amount),
          p_category: patch.category,
          p_payment_mode: patch.payment_mode,
          p_remarks: patch.remarks || null,
          p_expense_date: patch.expense_date || patch.booking_date,
          p_is_inventory_purchase: patch.is_inventory_purchase === "true" || patch.is_inventory_purchase === true,
          p_inventory_item_id: patch.inventory_item_id || null,
          p_quantity: patch.quantity ? Number(patch.quantity) : null,
          p_unit: patch.unit || null,
          p_cost_per_unit: patch.cost_per_unit ? Number(patch.cost_per_unit) : null,
          p_supplier: patch.supplier || null,
          p_invoice_number: patch.invoice_number || null,
          p_is_credit: config.table === "expense_bookings" || patch.is_credit === "true" || patch.is_credit === true,
          p_id: id
        });
        if (error) throw error;
      } else {
        const cleaned: any = {};
        for (const col of allEditFields) {
          if (!col.editable) continue;
          const v = patch[col.key];
          if (v === undefined) continue;
          cleaned[col.key] = col.type === "number" ? (v === "" || v === null ? null : Number(v)) : v;
        }
        const { error } = await (supabase as any).from(config.table).update(cleaned).eq("id", id);
        if (error) throw error;
      }
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

  const insertMutation = useMutation({
    mutationFn: async (patch: any) => {
      if (!user?.id) throw new Error("Not signed in");
      const payload: any = {
        user_id: user.id,
        [config.dateColumn]: fromDate,
      };
      for (const col of allEditFields) {
        const v = patch[col.key];
        if (v === undefined || v === "") continue;
        payload[col.key] = col.type === "number" ? Number(v) : v;
      }
      const { error } = await (supabase as any).from(config.table).insert(payload);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success(`${config.title.replace(/s$/, "")} added`);
      setAdding(false);
      setNewDraft({});
      await qc.invalidateQueries({ queryKey });
    },
    onError: (e: any) => toast.error(e.message || "Insert failed"),
  });

  const total = (rows as any[]).reduce(
    (acc, r) => acc + (Number(r[config.amountColumn]) || 0),
    0,
  );

  const startEdit = (row: any) => {
    setEditingId(row.id);
    const d: any = {};
    for (const col of allEditFields) d[col.key] = row[col.key] ?? "";
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
          {editable && fromDate === toDate && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setAdding(true);
                setNewDraft({});
              }}
              disabled={adding}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Add
            </Button>
          )}
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
              {adding && editable && (
                <TableRow className="bg-muted/40">
                  <TableCell className="text-xs whitespace-nowrap">{fromDate}</TableCell>
                  {config.columns.map((c) => (
                    <TableCell key={c.key} className="text-xs">
                      <Input
                        type={c.type === "number" ? "number" : "text"}
                        value={newDraft[c.key] ?? ""}
                        onChange={(e) =>
                          setNewDraft((d: any) => ({ ...d, [c.key]: e.target.value }))
                        }
                        placeholder={c.label}
                        className="h-7 text-xs min-w-[80px]"
                      />
                    </TableCell>
                  ))}
                  <TableCell className="text-right whitespace-nowrap">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => insertMutation.mutate(newDraft)}
                        disabled={insertMutation.isPending}
                      >
                        {insertMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Save className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setAdding(false);
                          setNewDraft({});
                        }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
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
                (rows as any[]).flatMap((row) => {
                  const isEditing = editable && editingId === row.id;
                  const colSpan = config.columns.length + (editable ? 2 : 1);
                  const mainRow = (
                    <TableRow key={row.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {row[config.dateColumn] || "—"}
                      </TableCell>
                      {config.columns.map((c, idx) => (
                        <TableCell key={c.key} className="text-xs whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            {idx === 0 && attachmentCounts[row.id] > 0 && (
                              <span title={`${attachmentCounts[row.id]} attachment(s)`}><Paperclip className="h-3 w-3 text-muted-foreground shrink-0" /></span>
                            )}
                            {c.type === "number" ? (
                              <span className="tabular-nums">
                                {row[c.key] === null || row[c.key] === undefined
                                  ? "—"
                                  : Number(row[c.key]).toFixed(2)}
                              </span>
                            ) : (
                              String(row[c.key] ?? "—")
                            )}
                          </div>
                        </TableCell>
                      ))}
                      {editable && (
                        <TableCell className="text-right whitespace-nowrap">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => (isEditing ? setEditingId(null) : startEdit(row))}
                            >
                              {isEditing ? (
                                <X className="h-3.5 w-3.5" />
                              ) : (
                                <Pencil className="h-3.5 w-3.5" />
                              )}
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
                        </TableCell>
                      )}
                    </TableRow>
                  );
                  const editRow = isEditing ? (
                    <TableRow key={`${row.id}-edit`} className="bg-muted/30 hover:bg-muted/30">
                      <TableCell colSpan={colSpan} className="p-3">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {allEditFields
                            .filter((c) => c.editable)
                            .map((c) => (
                              <div key={c.key} className="flex flex-col gap-1">
                                <label className="text-[11px] text-muted-foreground">
                                  {c.label}
                                </label>
                                <Input
                                  type={c.type === "number" ? "number" : "text"}
                                  value={draft[c.key] ?? ""}
                                  onChange={(e) =>
                                    setDraft((d: any) => ({ ...d, [c.key]: e.target.value }))
                                  }
                                  className="h-8 text-xs"
                                />
                              </div>
                            ))}
                        </div>
                        {config.attachmentType && (
                          <div className="mt-3">
                            <RecordAttachments
                              recordType={config.attachmentType}
                              recordId={row.id}
                            />
                          </div>
                        )}
                        <div className="flex justify-end gap-2 mt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingId(null);
                              setDraft({});
                            }}
                          >
                            <X className="h-3.5 w-3.5 mr-1" /> Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() =>
                              updateMutation.mutate({ id: row.id, patch: draft })
                            }
                            disabled={updateMutation.isPending}
                          >
                            {updateMutation.isPending ? (
                              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                            ) : (
                              <Save className="h-3.5 w-3.5 mr-1" />
                            )}
                            Save
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : null;
                  return editRow ? [mainRow, editRow] : [mainRow];
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
