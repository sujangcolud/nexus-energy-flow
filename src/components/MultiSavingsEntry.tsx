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
  PiggyBank,} from "lucide-react";
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
        <Button variant="outline" size="sm" className="gap-2 rounded-xl font-bold h-10 border-primary/20 text-primary hover:bg-primary/5">
          <Layers className="h-4 w-4" />
          Bulk Savings
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[95vh] overflow-y-auto p-4 md:p-6 rounded-3xl" aria-describedby={undefined}>
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl md:text-2xl font-black text-primary flex items-center gap-2">
            <PiggyBank className="h-6 w-6" />
            Bulk Savings
          </DialogTitle>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
            Batch process multiple savings contributions across different dates
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {rows.map((r, i) => (
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
                    value={r.contribution_date}
                    className="h-11 rounded-xl font-bold border-border"
                    onChange={(e) => updateRow(i, { contribution_date: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5 block">Amount (रु)</Label>
                  <Input
                    type="number"
                    value={r.contribution_amount}
                    className="h-11 rounded-xl font-bold border-border"
                    onChange={(e) =>
                      updateRow(i, { contribution_amount: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5 block">Member ID</Label>
                  <Input
                    value={r.member_id}
                    className="h-11 rounded-xl font-bold border-border"
                    onChange={(e) => updateRow(i, { member_id: e.target.value })}
                    placeholder="M-001..."
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5 block">Cycle</Label>
                  <Select
                    value={r.cycle_period}
                    onValueChange={(v) => updateRow(i, { cycle_period: v })}
                  >
                    <SelectTrigger className="h-11 rounded-xl font-bold border-border bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-2xl">
                      {cyclePeriods.map((p) => (
                        <SelectItem key={p} value={p} className="font-bold">
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5 block">Payment</Label>
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
                <div className="md:col-span-1">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5 block text-center">To</Label>
                  <Select
                    value={r.savings_to}
                    onValueChange={(v) => updateRow(i, { savings_to: v })}
                  >
                    <SelectTrigger className="h-11 rounded-xl font-bold border-border bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-2xl">
                      {savingsTo.map((p) => (
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
                    className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-full md:mb-1 w-11 h-11"
                    onClick={() => removeRow(i)}
                    disabled={rows.length === 1}
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}

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
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Batch Total Savings</p>
            <div className="text-2xl font-black text-primary">
              रु {grandTotal.toLocaleString()}
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
              ) : `Save ${rows.length} Entries`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MultiSavingsEntry;
