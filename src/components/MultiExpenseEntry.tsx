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
import { Plus, Trash2, Layers } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Row {
  expense_date: string;
  description: string;
  amount: number;
  category: string;
  payment_mode: string;
  remarks: string;
  is_inventory_purchase: boolean;
  inventory_item_id: string;
  quantity: number;
  unit_cost: number;
}

interface InventoryItem {
  id: string;
  item_name: string;
  quantity: number;
  category: string | null;
  unit_cost: number | null;
  base_unit: string | null;
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
  amount: 0,
  category: "",
  payment_mode: "Cash",
  remarks: "",
  is_inventory_purchase: false,
  inventory_item_id: "",
  quantity: 0,
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
          p_unit: r.is_inventory_purchase ? (inventory.find(it => it.id === r.inventory_item_id)?.base_unit || null) : null,
          p_cost_per_unit: r.is_inventory_purchase ? Number(r.unit_cost) : null,
          p_supplier: null,
          p_invoice_number: null,
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
        <Button variant="outline" size="sm" className="gap-2">
          <Layers className="h-4 w-4" />
          Bulk Add
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Multiple Expenses</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Enter multiple expenses across different dates in one go.
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="hidden lg:grid grid-cols-12 gap-2 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            <div className="col-span-1">Date</div>
            <div className="col-span-1">Inv?</div>
            <div className="col-span-3">Item / Description</div>
            <div className="col-span-1">Qty</div>
            <div className="col-span-1">Rate</div>
            <div className="col-span-1">Amount</div>
            <div className="col-span-2">Category</div>
            <div className="col-span-1">Payment</div>
            <div className="col-span-1"></div>
          </div>

          {rows.map((r, i) => (
            <div
              key={i}
              className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-end p-3 border rounded-md bg-muted/30 relative"
            >
              <div className="lg:col-span-1">
                <Label className="text-[10px] lg:hidden">Date</Label>
                <Input
                  type="date"
                  value={r.expense_date}
                  onChange={(e) => updateRow(i, { expense_date: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="lg:col-span-1 flex items-center justify-center h-9">
                <div className="flex flex-col items-center">
                  <Label className="text-[10px] lg:hidden mb-1">Inv?</Label>
                  <input
                    type="checkbox"
                    checked={r.is_inventory_purchase}
                    onChange={(e) => updateRow(i, { is_inventory_purchase: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </div>
              </div>

              <div className="lg:col-span-3">
                <Label className="text-[10px] lg:hidden">
                  {r.is_inventory_purchase ? "Inventory Item" : "Description"}
                </Label>
                {r.is_inventory_purchase ? (
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
                          amount: parseFloat(amount) > 0 ? parseFloat(amount) : r.amount
                        });
                      }
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs">
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
                ) : (
                  <Input
                    value={r.description}
                    onChange={(e) => updateRow(i, { description: e.target.value })}
                    placeholder="Description"
                    className="h-9 text-xs"
                  />
                )}
              </div>

              <div className="lg:col-span-1">
                <Label className="text-[10px] lg:hidden">Qty</Label>
                <Input
                  type="number"
                  disabled={!r.is_inventory_purchase}
                  value={r.quantity || ""}
                  onChange={(e) => {
                    const q = parseFloat(e.target.value) || 0;
                    const amount = (q * r.unit_cost).toFixed(2);
                    updateRow(i, {
                      quantity: q,
                      amount: parseFloat(amount) > 0 ? parseFloat(amount) : r.amount
                    });
                  }}
                  placeholder="0"
                  className="h-9 text-xs"
                />
              </div>

              <div className="lg:col-span-1">
                <Label className="text-[10px] lg:hidden">Rate</Label>
                <Input
                  type="number"
                  disabled={!r.is_inventory_purchase}
                  value={r.unit_cost || ""}
                  onChange={(e) => {
                    const rate = parseFloat(e.target.value) || 0;
                    const amount = (r.quantity * rate).toFixed(2);
                    updateRow(i, {
                      unit_cost: rate,
                      amount: parseFloat(amount) > 0 ? parseFloat(amount) : r.amount
                    });
                  }}
                  placeholder="0"
                  className="h-9 text-xs"
                />
              </div>

              <div className="lg:col-span-1">
                <Label className="text-[10px] lg:hidden">Amount</Label>
                <Input
                  type="number"
                  value={r.amount || ""}
                  onChange={(e) => updateRow(i, { amount: parseFloat(e.target.value) || 0 })}
                  className={r.is_inventory_purchase ? "h-9 text-xs bg-muted/50 font-bold" : "h-9 text-xs"}
                />
              </div>

              <div className="lg:col-span-2">
                <Label className="text-[10px] lg:hidden">Category</Label>
                <Select
                  value={r.category}
                  onValueChange={(v) => updateRow(i, { category: v })}
                >
                  <SelectTrigger className="h-9 text-xs">
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

              <div className="lg:col-span-1">
                <Label className="text-[10px] lg:hidden">Payment</Label>
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

              <div className="absolute top-2 right-2 lg:static lg:col-span-1 flex justify-end">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => removeRow(i)}
                  disabled={rows.length === 1}
                  className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          <Button variant="outline" size="sm" onClick={addRow} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Row
          </Button>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <div className="text-sm">
            <span className="text-muted-foreground">Total: </span>
            <span className="font-semibold">NRs. {grandTotal.toFixed(2)}</span>
            <span className="text-muted-foreground ml-2">({rows.length} rows)</span>
          </div>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "Saving..." : `Save ${rows.length} Expenses`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MultiExpenseEntry;
