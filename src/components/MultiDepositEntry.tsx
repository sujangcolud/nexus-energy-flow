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
  CreditCard,} from "lucide-react";
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
        <Button variant="outline" size="sm" className="gap-2 rounded-xl font-bold h-10 border-primary/20 text-primary hover:bg-primary/5">
          <Layers className="h-4 w-4" />
          Bulk Deposits
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[95vh] overflow-y-auto p-4 md:p-6 rounded-3xl" aria-describedby={undefined}>
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl md:text-2xl font-black text-primary flex items-center gap-2">
            <CreditCard className="h-6 w-6" />
            Bulk Deposits
          </DialogTitle>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
            Batch process multiple deposit entries across different dates
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
                    value={r.deposit_date}
                    className="h-11 rounded-xl font-bold border-border"
                    onChange={(e) => updateRow(i, { deposit_date: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5 block">Amount (रु)</Label>
                  <Input
                    type="number"
                    value={r.amount}
                    className="h-11 rounded-xl font-bold border-border"
                    onChange={(e) => updateRow(i, { amount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5 block">Mode</Label>
                  <Select value={r.mode} onValueChange={(v) => updateRow(i, { mode: v })}>
                    <SelectTrigger className="h-11 rounded-xl font-bold border-border bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {depositModes.map((p) => (
                        <SelectItem key={p} value={p} className="font-bold">
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-3">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5 block">Deposited By</Label>
                  <Input
                    value={r.deposited_by}
                    className="h-11 rounded-xl font-bold border-border"
                    onChange={(e) => updateRow(i, { deposited_by: e.target.value })}
                    placeholder="Name..."
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5 block">Type</Label>
                  <Select
                    value={r.deposited_by_type}
                    onValueChange={(v) => updateRow(i, { deposited_by_type: v })}
                  >
                    <SelectTrigger className="h-11 rounded-xl font-bold border-border bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {depositedByTypes.map((p) => (
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
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Batch Total Deposits</p>
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
              ) : `Save ${rows.length} Deposits`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MultiDepositEntry;
