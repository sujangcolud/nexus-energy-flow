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
  order_date: string;
  item_name: string;
  quantity: number;
  rate: number;
  payment_mode: string;
}

interface Props {
  onComplete: () => void;
}

const paymentModes = ["Cash", "Esewa", "Fonepay", "Bank", "Cheque", "Credit"];

const blankRow = (): Row => ({
  order_date: format(new Date(), "yyyy-MM-dd"),
  item_name: "",
  quantity: 1,
  rate: 0,
  payment_mode: "Cash",
});

const MultiOrderEntry = ({ onComplete }: Props) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([blankRow()]);
  const [submitting, setSubmitting] = useState(false);

  const updateRow = (i: number, patch: Partial<Row>) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  const addRow = () => setRows((r) => [...r, blankRow()]);
  const removeRow = (i: number) =>
    setRows((r) => (r.length === 1 ? r : r.filter((_, idx) => idx !== i)));

  const total = (r: Row) => Number(r.quantity || 0) * Number(r.rate || 0);
  const grandTotal = rows.reduce((s, r) => s + total(r), 0);

  const submit = async () => {
    if (!user) return;
    const invalid = rows.find(
      (r) => !r.item_name || !r.payment_mode || !r.order_date || r.quantity <= 0,
    );
    if (invalid) {
      toast.error("Each row needs date, item name, qty>0, and payment mode");
      return;
    }
    setSubmitting(true);
    try {
      const payload = rows.map((r) => ({
        user_id: user.id,
        order_date: r.order_date,
        date: r.order_date,
        item_name: r.item_name,
        quantity: Number(r.quantity),
        rate: Number(r.rate),
        total: total(r),
        payment_mode: r.payment_mode,
      }));
      const { error } = await supabase.from("orders").insert(payload);
      if (error) throw error;
      toast.success(`${payload.length} orders added`);
      setRows([blankRow()]);
      setOpen(false);
      onComplete();
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
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Add Multiple Orders</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Enter multiple orders across different dates in one go.
          </p>
        </DialogHeader>

        <div className="space-y-3">
          {rows.map((r, i) => (
            <div
              key={i}
              className="grid grid-cols-12 gap-2 items-end p-3 border rounded-md bg-muted/30"
            >
              <div className="col-span-12 sm:col-span-2">
                <Label className="text-xs">Date</Label>
                <Input
                  type="date"
                  value={r.order_date}
                  onChange={(e) => updateRow(i, { order_date: e.target.value })}
                />
              </div>
              <div className="col-span-12 sm:col-span-3">
                <Label className="text-xs">Item Name</Label>
                <Input
                  value={r.item_name}
                  onChange={(e) => updateRow(i, { item_name: e.target.value })}
                  placeholder="e.g. Coffee"
                />
              </div>
              <div className="col-span-4 sm:col-span-1">
                <Label className="text-xs">Qty</Label>
                <Input
                  type="number"
                  value={r.quantity}
                  onChange={(e) =>
                    updateRow(i, { quantity: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="col-span-4 sm:col-span-2">
                <Label className="text-xs">Rate</Label>
                <Input
                  type="number"
                  value={r.rate}
                  onChange={(e) => updateRow(i, { rate: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="col-span-4 sm:col-span-2">
                <Label className="text-xs">Payment</Label>
                <Select
                  value={r.payment_mode}
                  onValueChange={(v) => updateRow(i, { payment_mode: v })}
                >
                  <SelectTrigger>
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
              <div className="col-span-10 sm:col-span-1 text-sm font-medium text-right">
                {total(r).toFixed(0)}
              </div>
              <div className="col-span-2 sm:col-span-1 flex justify-end">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => removeRow(i)}
                  disabled={rows.length === 1}
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
            {submitting ? "Saving..." : `Save ${rows.length} Orders`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MultiOrderEntry;
