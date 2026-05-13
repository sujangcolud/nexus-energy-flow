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
import { Plus, Trash2, Layers, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Row {
  date: string;
  inventory_item_id: string;
  quantity: number;
  unit: string;
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
          p_invoice_number: null
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
        <Button variant="outline" size="sm" className="gap-2">
          <Layers className="h-4 w-4" />
          Bulk Stock In
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] sm:max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Inventory Stock In</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Record multiple inventory purchases at once. This will update stock levels and create expense records.
          </p>
        </DialogHeader>

        <div className="space-y-4 my-4">
          <div className="hidden md:grid grid-cols-12 gap-2 px-3 text-xs font-medium text-muted-foreground">
            <div className="col-span-1">Date</div>
            <div className="col-span-2">Item</div>
            <div className="col-span-1">Qty</div>
            <div className="col-span-1">Unit</div>
            <div className="col-span-1">Unit Cost</div>
            <div className="col-span-1 text-right pr-2">Total</div>
            <div className="col-span-1">Category</div>
            <div className="col-span-1">Payment</div>
            <div className="col-span-2">Supplier</div>
            <div className="col-span-1"></div>
          </div>

          {rows.map((r, i) => {
            const item = inventory.find(it => it.id === r.inventory_item_id);
            const units = item ? [item.base_unit, ...(item.unit_conversions?.map(u => u.unit_name) || [])] : [];

            return (
            <div
              key={i}
              className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start md:items-center p-3 border rounded-md bg-muted/20 relative"
            >
              <div className="md:col-span-1">
                <Label className="text-[10px] md:hidden">Date</Label>
                <Input
                  type="date"
                  value={r.date}
                  onChange={(e) => updateRow(i, { date: e.target.value })}
                  className="h-9"
                />
              </div>

              <div className="md:col-span-2">
                <Label className="text-[10px] md:hidden">Item</Label>
                <Select
                  value={r.inventory_item_id}
                  onValueChange={(v) => updateRow(i, { inventory_item_id: v })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select item" />
                  </SelectTrigger>
                  <SelectContent>
                    {inventory.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.item_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-1">
                <Label className="text-[10px] md:hidden">Unit</Label>
                <Select
                  value={r.unit}
                  onValueChange={(v) => updateRow(i, { unit: v })}
                  disabled={!r.inventory_item_id}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-1">
                <Label className="text-[10px] md:hidden">Qty</Label>
                <Input
                  type="number"
                  placeholder="Qty"
                  value={r.quantity || ""}
                  onChange={(e) => updateRow(i, { quantity: parseFloat(e.target.value) || 0 })}
                  className="h-9"
                />
              </div>

              <div className="md:col-span-1">
                <Label className="text-[10px] md:hidden">Unit Cost</Label>
                <Input
                  type="number"
                  placeholder="Cost"
                  value={r.unit_cost || ""}
                  onChange={(e) => updateRow(i, { unit_cost: parseFloat(e.target.value) || 0 })}
                  className="h-9"
                />
              </div>

              <div className="md:col-span-1 text-right pr-2 font-medium text-sm hidden md:block">
                {total(r).toLocaleString()}
              </div>

              <div className="md:col-span-1">
                <Label className="text-[10px] md:hidden">Category</Label>
                <Select
                  value={r.category}
                  onValueChange={(v) => updateRow(i, { category: v })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.name}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-1">
                <Label className="text-[10px] md:hidden">Payment</Label>
                <Select
                  value={r.payment_mode}
                  onValueChange={(v) => updateRow(i, { payment_mode: v })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentModes.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label className="text-[10px] md:hidden">Supplier</Label>
                <Input
                  placeholder="Supplier"
                  value={r.supplier}
                  onChange={(e) => updateRow(i, { supplier: e.target.value })}
                  className="h-9"
                />
              </div>

              <div className="absolute right-2 top-2 md:static md:col-span-1 flex justify-end">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => removeRow(i)}
                  disabled={rows.length === 1}
                  className="h-8 w-8 text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="md:hidden flex justify-between items-center px-1 pt-1 border-t mt-1">
                <span className="text-xs text-muted-foreground">Total:</span>
                <span className="font-bold">NRs. {total(r).toLocaleString()}</span>
              </div>
            </div>
            );
          })}

          <Button variant="outline" size="sm" onClick={addRow} className="gap-2 w-full md:w-auto">
            <Plus className="h-4 w-4" />
            Add Row
          </Button>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t pt-4">
          <div className="text-sm text-center sm:text-left">
            <span className="text-muted-foreground">Grand Total: </span>
            <span className="font-bold text-lg">NRs. {grandTotal.toLocaleString()}</span>
            <span className="text-muted-foreground ml-2 text-xs">({rows.length} items)</span>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1 sm:flex-none">
              Cancel
            </Button>
            <Button onClick={submit} disabled={submitting} className="flex-1 sm:flex-none">
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                `Save ${rows.length} Entries`
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MultiInventoryEntry;
