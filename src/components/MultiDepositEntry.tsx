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
  deposit_date: string;
  amount: number;
  mode: string;
  deposited_by: string;
  deposited_by_type: string;
  remarks: string;
}

interface Props {
  onComplete: () => void;
}

const depositModes = [
  "Cash",
  "Esewa",
  "Fonepay",
  "Bank Transfer",
  "Cheque",
  "Credit Card",
  "Mobile Banking",
  "Other",
];
const depositedByTypes = ["Customer", "Staff"];

const blankRow = (): Row => ({
  deposit_date: format(new Date(), "yyyy-MM-dd"),
  amount: 0,
  mode: "Cash",
  deposited_by: "",
  deposited_by_type: "Customer",
  remarks: "",
});

const MultiDepositEntry = ({ onComplete }: Props) => {
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
      (r) => !r.deposit_date || !r.amount || !r.mode || !r.deposited_by || !r.deposited_by_type,
    );
    if (invalid) {
      toast.error("Each row needs date, amount, mode, deposited by name & type");
      return;
    }
    setSubmitting(true);
    try {
      const payload = rows.map((r) => ({
        user_id: user.id,
        deposit_date: r.deposit_date,
        date: r.deposit_date,
        amount: Number(r.amount),
        mode: r.mode,
        deposited_by: r.deposited_by,
        deposited_by_type: r.deposited_by_type,
        remarks: r.remarks || null,
      }));
      const { error } = await supabase.from("deposits").insert(payload);
      if (error) throw error;
      toast.success(`${payload.length} deposits added`);
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
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Multiple Deposits</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Enter multiple deposits across different dates in one go.
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
                  value={r.deposit_date}
                  onChange={(e) => updateRow(i, { deposit_date: e.target.value })}
                />
              </div>
              <div className="col-span-6 sm:col-span-2">
                <Label className="text-xs">Amount</Label>
                <Input
                  type="number"
                  value={r.amount}
                  onChange={(e) => updateRow(i, { amount: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="col-span-6 sm:col-span-2">
                <Label className="text-xs">Mode</Label>
                <Select value={r.mode} onValueChange={(v) => updateRow(i, { mode: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {depositModes.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-7 sm:col-span-2">
                <Label className="text-xs">Deposited By</Label>
                <Input
                  value={r.deposited_by}
                  onChange={(e) => updateRow(i, { deposited_by: e.target.value })}
                  placeholder="Name"
                />
              </div>
              <div className="col-span-5 sm:col-span-2">
                <Label className="text-xs">Type</Label>
                <Select
                  value={r.deposited_by_type}
                  onValueChange={(v) => updateRow(i, { deposited_by_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {depositedByTypes.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-10 sm:col-span-1">
                <Label className="text-xs">Remarks</Label>
                <Input
                  value={r.remarks}
                  onChange={(e) => updateRow(i, { remarks: e.target.value })}
                />
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
            {submitting ? "Saving..." : `Save ${rows.length} Deposits`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MultiDepositEntry;
