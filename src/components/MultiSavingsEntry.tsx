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
  contribution_date: string;
  contribution_amount: number;
  member_id: string;
  cycle_period: string;
  payment_mode: string;
  savings_to: string;
}

interface Props {
  onComplete: () => void;
}

const cyclePeriods = ["Weekly", "Bi-weekly", "Monthly", "Quarterly", "Semi-Annual", "Annual", "One-time"];
const paymentModes = ["Cash", "Esewa", "Fonepay", "Bank"];
const savingsTo = ["Cooperative", "Bank"];

const blankRow = (): Row => ({
  contribution_date: format(new Date(), "yyyy-MM-dd"),
  contribution_amount: 0,
  member_id: "",
  cycle_period: "Monthly",
  payment_mode: "Cash",
  savings_to: "Cooperative",
});

const MultiSavingsEntry = ({ onComplete }: Props) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([blankRow()]);
  const [submitting, setSubmitting] = useState(false);

  const updateRow = (i: number, patch: Partial<Row>) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  const addRow = () => setRows((r) => [...r, blankRow()]);
  const removeRow = (i: number) =>
    setRows((r) => (r.length === 1 ? r : r.filter((_, idx) => idx !== i)));

  const grandTotal = rows.reduce((s, r) => s + (Number(r.contribution_amount) || 0), 0);

  const submit = async () => {
    if (!user) return;
    const invalid = rows.find(
      (r) => !r.contribution_date || !r.contribution_amount || !r.member_id || !r.cycle_period,
    );
    if (invalid) {
      toast.error("Each row needs date, amount, member ID and cycle period");
      return;
    }
    setSubmitting(true);
    try {
      const payload = rows.map((r) => ({
        user_id: user.id,
        contribution_date: r.contribution_date,
        date: r.contribution_date,
        contribution_amount: Number(r.contribution_amount),
        member_id: r.member_id,
        cycle_period: r.cycle_period,
        payment_mode: r.payment_mode,
        savings_to: r.savings_to,
      }));
      const { error } = await supabase.from("cooperative_savings").insert(payload);
      if (error) throw error;
      toast.success(`${payload.length} savings entries added`);
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
          <DialogTitle>Add Multiple Savings Contributions</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Enter multiple savings entries across different dates in one go.
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
                  value={r.contribution_date}
                  onChange={(e) => updateRow(i, { contribution_date: e.target.value })}
                />
              </div>
              <div className="col-span-6 sm:col-span-2">
                <Label className="text-xs">Amount</Label>
                <Input
                  type="number"
                  value={r.contribution_amount}
                  onChange={(e) =>
                    updateRow(i, { contribution_amount: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="col-span-6 sm:col-span-2">
                <Label className="text-xs">Member ID</Label>
                <Input
                  value={r.member_id}
                  onChange={(e) => updateRow(i, { member_id: e.target.value })}
                  placeholder="ID"
                />
              </div>
              <div className="col-span-6 sm:col-span-2">
                <Label className="text-xs">Cycle</Label>
                <Select
                  value={r.cycle_period}
                  onValueChange={(v) => updateRow(i, { cycle_period: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {cyclePeriods.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              <div className="col-span-10 sm:col-span-1">
                <Label className="text-xs">To</Label>
                <Select
                  value={r.savings_to}
                  onValueChange={(v) => updateRow(i, { savings_to: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {savingsTo.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            {submitting ? "Saving..." : `Save ${rows.length} Entries`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MultiSavingsEntry;
