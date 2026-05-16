import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {Plus, Trash2, Layers,
  Receipt,} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Row {
  expense_date: string;
  description: string;
  supplier: string;
  amount: number;
  category: string;
  payment_mode: string;
  remarks: string;
  is_inventory_purchase: boolean;
  inventory_item_id: string;
  quantity: number;
  unit: string;
  factor: number;
  unit_cost: number;
}

interface UnitConversion {
  id: string;
  unit_name: string;
  conversion_to_base: number;
}

interface InventoryItem {
  id: string;
  item_name: string;
  quantity: number;
  current_stock_base: number;
  category: string | null;
  unit_cost: number | null;
  average_cost_per_base_unit: number | null;
  base_unit: string;
  unit_conversions?: UnitConversion[];
}

interface Props {
  categories: { id: string; name: string }[];
  inventory: InventoryItem[];
  onComplete: () => void;
}

const paymentModes = [
  "Cash",
  "Esewa",
  "Fonepay",
  "Bank Transfer",
  "Cheque",
  "Credit Card",
  "Other",
];

const blankRow = (): Row => ({
  expense_date: format(new Date(), "yyyy-MM-dd"),
  description: "",
  supplier: "",
  amount: 0,
  category: "",
  payment_mode: "Cash",
  remarks: "",
  is_inventory_purchase: false,
  inventory_item_id: "",
  quantity: 0,
  unit: "",
  factor: 1,
  unit_cost: 0,
});

const MultiExpenseEntry = ({ categories, inventory, onComplete }: Props) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([blankRow()]);
  const [submitting, setSubmitting] = useState(false);

  const updateRow = (i: number, patch: Partial<Row>) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

  const addRow = () => setRows((r) => [...r, blankRow()]);
  const removeRow = (i: number) =>
    setRows((r) => (r.length === 1 ? r : r.filter((_, idx) => idx !== i)));

  const grandTotal = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);

  const submit = async () => {
    if (!user) return;
    const invalid = rows.find(
      (r) => !r.description || !r.amount || !r.category || !r.payment_mode || !r.expense_date,
    );
    if (invalid) {
      toast.error("Every row needs date, description, amount, category and payment mode");
      return;
    }
    setSubmitting(true);

    let successCount = 0;
    let errorCount = 0;
    const remainingRows = [...rows];

    try {
      // Use RPC for each row to handle potential inventory updates
      for (let i = rows.length - 1; i >= 0; i--) {
        const r = rows[i];
        const { error } = await supabase.rpc("process_inventory_expense", {
          p_user_id: user.id,
          p_description: r.description,
          p_amount: Number(r.amount),
          p_category: r.category,
          p_payment_mode: r.payment_mode,
          p_remarks: r.remarks || null,
          p_expense_date: r.expense_date,
          p_is_inventory_purchase: r.is_inventory_purchase,
          p_inventory_item_id: r.inventory_item_id || null,
          p_quantity: r.is_inventory_purchase ? Number(r.quantity) : null,
          p_unit: r.is_inventory_purchase ? r.unit : null,
          p_cost_per_unit: r.is_inventory_purchase ? Number(r.unit_cost) : null,
          p_supplier: r.supplier || null,
          p_invoice_number: null,
          p_manual_conversion_factor: r.is_inventory_purchase ? r.factor : null,
          p_is_credit: r.payment_mode === "Credit" || r.payment_mode === "On Credit"
        });

        if (error) {
          console.error("Error processing row:", error);
          errorCount++;
        } else {
          successCount++;
          remainingRows.splice(i, 1);
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully processed ${successCount} entries`);
        setRows(remainingRows.length > 0 ? remainingRows : [blankRow()]);
      }

      if (errorCount > 0) {
        toast.error(`Failed to process ${errorCount} entries.`);
      }

      if (remainingRows.length === 0) {
        setOpen(false);
        onComplete();
      }
    } catch (e: any) {
      toast.error(`Failed: ${e?.message || "Unknown error"}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 rounded-xl font-bold h-10 border-primary/20 text-primary hover:bg-primary/5">
          <Layers className="h-4 w-4" />
          Bulk Entry
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-7xl w-[95vw] max-h-[95vh] overflow-y-auto p-4 md:p-6 rounded-3xl" aria-describedby={undefined}>
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl md:text-2xl font-black text-primary flex items-center gap-2">
            <Receipt className="h-6 w-6" />
            Bulk Expenses
          </DialogTitle>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
            Batch process multiple expense records & inventory purchases
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {rows.map((r, i) => {
            const item = inventory.find(it => it.id === r.inventory_item_id);
            const units = Array.from(new Set(
              item ? [item.base_unit, ...(item.unit_conversions?.map(u => u.unit_name) || [])] : []
            )).filter(Boolean);

            return (
              <div
                key={i}
                className="flex flex-col gap-4 p-4 rounded-2xl border border-border bg-muted/50 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-primary/20" />

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:items-end">
                  <div className="md:col-span-2">
                    <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5 block">Date</Label>
                    <Input
                      type="date"
                      value={r.expense_date}
                      className="h-11 rounded-xl font-bold border-border"
                      onChange={(e) => updateRow(i, { expense_date: e.target.value })}
                    />
                  </div>

                  <div className="md:col-span-3">
                    <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5 block">Description</Label>
                    {r.is_inventory_purchase ? (
                      <div className="space-y-2">
                        <Select
                          value={r.inventory_item_id}
                          onValueChange={(v) => {
                            const item = inventory.find(it => it.id === v);
                            if (item) {
                              const amount = (r.quantity * (item.unit_cost || 0)).toFixed(2);
                              updateRow(i, {
                                inventory_item_id: v,
                                description: `Purchase: ${item.item_name}`,
                                category: item.category || r.category,
                                unit_cost: item.unit_cost || 0,
                                unit: item.base_unit,
                                factor: 1,
                                amount: parseFloat(amount) > 0 ? parseFloat(amount) : r.amount
                              });
                            }
                          }}
                        >
                          <SelectTrigger className="h-11 rounded-xl font-bold border-border bg-white">
                            <SelectValue placeholder="Select inventory item" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl shadow-2xl">
                            {inventory.map((item) => (
                              <SelectItem key={item.id} value={item.id} className="font-bold">
                                  {item.item_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          value={r.description}
                          className="h-9 rounded-lg font-medium border-border"
                          onChange={(e) => updateRow(i, { description: e.target.value })}
                          placeholder="Detail description..."
                        />
                      </div>
                    ) : (
                      <Input
                        value={r.description}
                        className="h-11 rounded-xl font-bold border-border"
                        onChange={(e) => updateRow(i, { description: e.target.value })}
                        placeholder="What was this expense for?"
                      />
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5 block">Supplier / Party</Label>
                    <Input
                      value={r.supplier}
                      className="h-11 rounded-xl font-bold border-border"
                      onChange={(e) => updateRow(i, { supplier: e.target.value })}
                      placeholder="Vendor name..."
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5 block">Category</Label>
                    <Select
                      value={r.category}
                      onValueChange={(v) => updateRow(i, { category: v })}
                    >
                      <SelectTrigger className="h-11 rounded-xl font-bold border-border bg-white">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl shadow-2xl">
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.name} className="font-bold">
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="md:col-span-2">
                    <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5 block">Payment Mode</Label>
                    <Select
                      value={r.payment_mode}
                      onValueChange={(v) => updateRow(i, { payment_mode: v })}
                    >
                      <SelectTrigger className="h-11 rounded-xl font-bold border-border bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl shadow-2xl">
                        {paymentModes.map((p) => (
                          <SelectItem key={p} value={p} className="font-bold">
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="md:col-span-1 flex items-center justify-center h-11">
                    <div className="flex flex-col items-center">
                      <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1 block">Stock?</Label>
                      <input
                        type="checkbox"
                        checked={r.is_inventory_purchase}
                        onChange={(e) => updateRow(i, { is_inventory_purchase: e.target.checked })}
                        className="h-5 w-5 rounded-md border-slate-300 text-primary focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>

                {r.is_inventory_purchase && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-white/50 rounded-xl border border-white">
                    <div>
                      <Label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground mb-1 block">Quantity</Label>
                      <Input
                        type="number"
                        value={r.quantity || ""}
                        className="h-10 rounded-lg font-bold border-border"
                        onChange={(e) => {
                          const q = parseFloat(e.target.value) || 0;
                          const amount = (q * r.unit_cost).toFixed(2);
                          updateRow(i, {
                            quantity: q,
                            amount: parseFloat(amount) > 0 ? parseFloat(amount) : r.amount
                          });
                        }}
                      />
                    </div>
                    <div>
                      <Label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground mb-1 block">Unit</Label>
                      <Select
                        value={r.unit}
                        onValueChange={(v) => {
                          let f = 1;
                          if (item) {
                            if (v === item.base_unit) f = 1;
                            else {
                              const c = item.unit_conversions?.find(cv => cv.unit_name === v);
                              if (c) f = c.conversion_to_base;
                            }
                          }
                          updateRow(i, { unit: v, factor: f });
                        }}
                      >
                        <SelectTrigger className="h-10 rounded-lg font-bold border-border bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-lg">
                          {units.map((u) => (
                            <SelectItem key={u} value={u}>{u}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground mb-1 block">Rate (₹)</Label>
                      <Input
                        type="number"
                        value={r.unit_cost || ""}
                        className="h-10 rounded-lg font-bold border-border"
                        onChange={(e) => {
                          const rate = parseFloat(e.target.value) || 0;
                          const amount = (r.quantity * rate).toFixed(2);
                          updateRow(i, {
                            unit_cost: rate,
                            amount: parseFloat(amount) > 0 ? parseFloat(amount) : r.amount
                          });
                        }}
                      />
                    </div>
                    <div>
                      <Label className="text-[9px] font-black uppercase tracking-wider text-muted-foreground mb-1 block">Conversion Factor</Label>
                      <Input
                        type="number"
                        value={r.factor}
                        className="h-10 rounded-lg font-bold border-border bg-muted/50"
                        onChange={(e) => updateRow(i, { factor: parseFloat(e.target.value) || 1 })}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between mt-1">
                  <div className="flex-1 flex items-center gap-3">
                    <div className="bg-muted px-3 py-1.5 rounded-lg border border-border">
                      <Label className="text-[9px] font-black uppercase text-muted-foreground block mb-0.5">Total Amount</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground">₹</span>
                        <Input
                          type="number"
                          value={r.amount || ""}
                          className="h-7 w-28 bg-transparent border-none p-0 font-black text-lg focus-visible:ring-0"
                          onChange={(e) => updateRow(i, { amount: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:text-destructive hover:bg-destructive/5 rounded-full"
                    onClick={() => removeRow(i)}
                    disabled={rows.length === 1}
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            );
          })}

          <Button
            variant="secondary"
            onClick={addRow}
            className="w-full h-12 rounded-2xl font-black uppercase text-xs tracking-widest bg-muted hover:bg-slate-200 text-muted-foreground"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Another Record
          </Button>
        </div>

        <DialogFooter className="mt-8 flex flex-col sm:flex-row items-center gap-4 border-t border-border pt-6">
          <div className="flex-1 text-center sm:text-left">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Batch Total Amount</p>
            <div className="text-2xl font-black text-primary">
              ₹ {grandTotal.toLocaleString()}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              className="rounded-xl font-bold h-12 text-muted-foreground"
            >
              Cancel
            </Button>
            <Button
              onClick={submit}
              disabled={submitting}
              className="rounded-xl font-black uppercase tracking-widest text-xs h-12 px-8 bg-primary shadow-lg shadow-primary/20"
            >
              {submitting ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Saving...
                </>
              ) : `Save ${rows.length} Records`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MultiExpenseEntry;
