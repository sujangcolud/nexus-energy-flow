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
  withdrawal_date: string;
  amount: number;
  purpose: string;
  recipient: string;
  payment_mode: string;
  withdrawal_from: string;
  reference_number: string;
  remarks: string;
}

interface Props {
  onComplete: () => void;
}

const paymentModes = ["Cash", "Esewa", "Fonepay", "Bank", "Cheque"];
const fromOptions = ["Cooperative", "Bank"];

const blankRow = (): Row => ({
  withdrawal_date: format(new Date(), "yyyy-MM-dd"),
  amount: 0,
  purpose: "",
  recipient: "",
  payment_mode: "Cash",
  withdrawal_from: "Cooperative",
  reference_number: "",
  remarks: "",
});

const MultiWithdrawalEntry = ({ onComplete }: Props) => {
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
      (r) => !r.withdrawal_date || !r.amount || !r.purpose,
    );
    if (invalid) {
      toast.error("Each row needs date, amount and purpose");
      return;
    }
    setSubmitting(true);
    try {
      const payload = rows.map((r) => ({
        user_id: user.id,
        withdrawal_date: r.withdrawal_date,
        date: r.withdrawal_date,
        amount: Number(r.amount),
        purpose: r.purpose,
        recipient: r.recipient || null,
        payment_mode: r.payment_mode,
        withdrawal_from: r.withdrawal_from,
        reference_number: r.reference_number || null,
        remarks: r.remarks || null,
      }));
      const { error } = await supabase.from("withdrawals").insert(payload);
      if (error) throw error;
      toast.success(`${payload.length} withdrawals added`);
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
          <DialogTitle>Add Multiple Withdrawals</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Enter multiple withdrawals across different dates in one go.
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
                  value={r.withdrawal_date}
                  onChange={(e) => updateRow(i, { withdrawal_date: e.target.value })}
                />
              </div>
              <div className="col-span-6 sm:col-span-1">
                <Label className="text-xs">Amount</Label>
                <Input
                  type="number"
                  value={r.amount}
                  onChange={(e) => updateRow(i, { amount: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="col-span-6 sm:col-span-2">
                <Label className="text-xs">Purpose</Label>
                <Input
                  value={r.purpose}
                  onChange={(e) => updateRow(i, { purpose: e.target.value })}
                />
              </div>
              <div className="col-span-6 sm:col-span-2">
                <Label className="text-xs">Recipient</Label>
                <Input
                  value={r.recipient}
                  onChange={(e) => updateRow(i, { recipient: e.target.value })}
                />
              </div>
              <div className="col-span-6 sm:col-span-2">
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
              <div className="col-span-6 sm:col-span-2">
                <Label className="text-xs">From</Label>
                <Select
                  value={r.withdrawal_from}
                  onValueChange={(v) => updateRow(i, { withdrawal_from: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fromOptions.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-10 sm:col-span-0 hidden sm:block" />
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
            {submitting ? "Saving..." : `Save ${rows.length} Withdrawals`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MultiWithdrawalEntry;
