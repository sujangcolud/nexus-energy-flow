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
import {Plus, Trash2, Layers, Loader2,
  Package,} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Row {
  date: string;
  inventory_item_id: string;
  quantity: number;
  unit: string;
  factor: number;
  unit_cost: number;
  category: string;
  payment_mode: string;
  supplier: string;
  remarks: string;
}

interface UnitConversion {
  id: string;
  unit_name: string;
  conversion_to_base: number;
}

interface InventoryItem {
  id: string;
  item_name: string;
  category: string | null;
  base_unit: string;
  unit_conversions?: UnitConversion[];
}

interface Category {
  id: string;
  name: string;
}

interface Props {
  inventory: InventoryItem[];
  categories: Category[];
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
  date: format(new Date(), "yyyy-MM-dd"),
  inventory_item_id: "",
  quantity: 0,
  unit: "",
  factor: 1,
  unit_cost: 0,
  category: "",
  payment_mode: "Cash",
  supplier: "",
  remarks: "",
});

const MultiInventoryEntry = ({ inventory, categories, onComplete }: Props) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([blankRow()]);
  const [submitting, setSubmitting] = useState(false);

  const updateRow = (i: number, patch: Partial<Row>) => {
    setRows((r) => {
      const newRows = r.map((row, idx) => (idx === i ? { ...row, ...patch } : row));

      // If inventory_item_id changed, try to auto-fill category and unit
      if (patch.inventory_item_id) {
        const item = inventory.find(it => it.id === patch.inventory_item_id);
        if (item) {
          if (item.category) newRows[i].category = item.category;
          newRows[i].unit = item.base_unit;
          newRows[i].factor = 1;
        }
      }

      if (patch.unit) {
        const item = inventory.find(it => it.id === newRows[i].inventory_item_id);
        if (item) {
          if (patch.unit === item.base_unit) {
            newRows[i].factor = 1;
          } else {
            const conv = item.unit_conversions?.find(c => c.unit_name === patch.unit);
            if (conv) newRows[i].factor = conv.conversion_to_base;
          }
        }
      }

      return newRows;
    });
  };

  const addRow = () => setRows((r) => [...r, blankRow()]);
  const removeRow = (i: number) =>
    setRows((r) => (r.length === 1 ? r : r.filter((_, idx) => idx !== i)));

  const total = (r: Row) => (r.quantity || 0) * (r.unit_cost || 0);
  const grandTotal = rows.reduce((s, r) => s + total(r), 0);

  const submit = async () => {
    if (!user) return;

    const invalid = rows.find(
      (r) => !r.inventory_item_id || r.quantity <= 0 || !r.category || !r.date
    );

    if (invalid) {
      toast.error("Each row needs date, item, quantity > 0, and category");
      return;
    }

    setSubmitting(true);

    const remainingRows = [...rows];
    let successCount = 0;
    let errorCount = 0;

    try {
      // Process rows one by one to use the RPC correctly
      // We'll iterate backwards to safely remove successful rows
      for (let i = rows.length - 1; i >= 0; i--) {
        const row = rows[i];
        const item = inventory.find(it => it.id === row.inventory_item_id);
        const description = `Purchase: ${item?.item_name || 'Inventory Item'}`;

        const { error } = await supabase.rpc('process_inventory_expense', {
          p_user_id: user.id,
          p_description: description,
          p_amount: total(row),
          p_category: row.category,
          p_payment_mode: row.payment_mode,
          p_remarks: row.remarks || null,
          p_expense_date: row.date,
          p_is_inventory_purchase: true,
          p_inventory_item_id: row.inventory_item_id,
          p_quantity: row.quantity,
          p_unit: row.unit,
          p_cost_per_unit: row.unit_cost,
          p_supplier: row.supplier || null,
          p_invoice_number: null,
          p_manual_conversion_factor: row.factor
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
        toast.error(`Failed to process ${errorCount} entries. Successful entries have been removed from the list.`);
      }

      if (remainingRows.length === 0) {
        setOpen(false);
        onComplete();
      }
    } catch (e: any) {
      toast.error(`An unexpected error occurred: ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 rounded-xl font-bold h-10 border-primary/20 text-primary hover:bg-primary/5">
          <Layers className="h-4 w-4" />
          Bulk Stock In
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-7xl w-[95vw] max-h-[95vh] overflow-y-auto p-4 md:p-6 rounded-3xl" aria-describedby={undefined}>
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl md:text-2xl font-black text-primary flex items-center gap-2">
            <Package className="h-6 w-6" />
            Bulk Stock In
          </DialogTitle>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
            Batch process multiple inventory purchases & stock updates
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
                      value={r.date}
                      className="h-11 rounded-xl font-bold border-border"
                      onChange={(e) => updateRow(i, { date: e.target.value })}
                    />
                  </div>

                  <div className="md:col-span-3">
                    <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5 block">Inventory Item</Label>
                    <Select
                      value={r.inventory_item_id}
                      onValueChange={(v) => updateRow(i, { inventory_item_id: v })}
                    >
                      <SelectTrigger className="h-11 rounded-xl font-bold border-border bg-white text-sm">
                        <SelectValue placeholder="Select item..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl shadow-2xl">
                        {inventory.map((item) => (
                          <SelectItem key={item.id} value={item.id} className="font-bold">
                            {item.item_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:col-span-4">
                    <div>
                      <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5 block">Quantity</Label>
                      <Input
                        type="number"
                        value={r.quantity || ""}
                        className="h-11 rounded-xl font-bold border-border"
                        onChange={(e) => updateRow(i, { quantity: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5 block">Unit</Label>
                      <Select
                        value={r.unit}
                        onValueChange={(v) => updateRow(i, { unit: v })}
                        disabled={!r.inventory_item_id}
                      >
                        <SelectTrigger className="h-11 rounded-xl font-bold border-border bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {units.map((u) => (
                            <SelectItem key={u} value={u}>{u}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5 block">Unit Cost (₹)</Label>
                      <Input
                        type="number"
                        value={r.unit_cost || ""}
                        className="h-11 rounded-xl font-bold border-border"
                        onChange={(e) => updateRow(i, { unit_cost: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5 block">Payment Mode</Label>
                    <Select
                      value={r.payment_mode}
                      onValueChange={(v) => updateRow(i, { payment_mode: v })}
                    >
                      <SelectTrigger className="h-11 rounded-xl font-bold border-border bg-white text-sm">
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

                  <div className="flex items-center justify-between md:col-span-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive hover:bg-destructive/5 rounded-full md:mb-1 w-11 h-11"
                      onClick={() => removeRow(i)}
                      disabled={rows.length === 1}
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                  <div>
                    <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5 block">Supplier</Label>
                    <Input
                      value={r.supplier}
                      className="h-10 rounded-xl font-medium border-border"
                      onChange={(e) => updateRow(i, { supplier: e.target.value })}
                      placeholder="Vendor name..."
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5 block">Category</Label>
                    <Select
                      value={r.category}
                      onValueChange={(v) => updateRow(i, { category: v })}
                    >
                      <SelectTrigger className="h-10 rounded-xl font-medium border-border bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between bg-white px-4 py-1.5 rounded-xl border border-border">
                    <span className="text-[10px] font-black uppercase text-muted-foreground">Subtotal</span>
                    <span className="text-lg font-black text-primary">₹ {total(r).toLocaleString()}</span>
                  </div>
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
            Add Another Item
          </Button>
        </div>

        <DialogFooter className="mt-8 flex flex-col sm:flex-row items-center gap-4 border-t border-border pt-6">
          <div className="flex-1 text-center sm:text-left">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Batch Grand Total</p>
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
              ) : `Save ${rows.length} Stock-ins`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MultiInventoryEntry;
