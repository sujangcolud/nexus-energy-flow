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
  Zap,} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Row {
  session_date: string;
  start_percentage: number;
  end_percentage: number;
  per_percent_rate: number;
  kcal: number;
  per_unit_rate: number;
  payment_mode: string;
  category: string;
}

interface Props {
  categories: { id: string; name: string }[];
  onComplete: () => void;
}

const paymentModes = ["Cash", "Esewa", "Fonepay", "Bank", "Cheque", "Credit"];

const blankRow = (): Row => ({
  session_date: format(new Date(), "yyyy-MM-dd"),
  start_percentage: 0,
  end_percentage: 0,
  per_percent_rate: 0,
  kcal: 0,
  per_unit_rate: 0,
  payment_mode: "Cash",
  category: "",
});

const MultiChargingEntry = ({ categories, onComplete }: Props) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([blankRow()]);
  const [submitting, setSubmitting] = useState(false);

  const updateRow = (i: number, patch: Partial<Row>) => {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  };

  const addRow = () => setRows((r) => [...r, blankRow()]);
  const removeRow = (i: number) =>
    setRows((r) => (r.length === 1 ? r : r.filter((_, idx) => idx !== i)));

  const computeTotal = (r: Row) => {
    const pct = Math.max(0, r.end_percentage - r.start_percentage) * r.per_percent_rate;
    const kcal = r.kcal * r.per_unit_rate;
    return pct + kcal;
  };

  const grandTotal = rows.reduce((s, r) => s + computeTotal(r), 0);

  const submit = async () => {
    if (!user) return;
    const invalid = rows.find(
      (r) => r.end_percentage <= r.start_percentage || !r.payment_mode || !r.session_date,
    );
    if (invalid) {
      toast.error("Each row needs a date, payment mode, and end% > start%");
      return;
    }
    setSubmitting(true);
    try {
      const payload = rows.map((r) => {
        const data: any = {
          user_id: user.id,
          session_date: r.session_date,
          date: r.session_date,
          start_percentage: r.start_percentage,
          end_percentage: r.end_percentage,
          per_percent_rate: r.per_percent_rate,
          kcal: r.kcal,
          per_unit_rate: r.per_unit_rate,
          total_amount: computeTotal(r),
          payment_mode: r.payment_mode,
        };
        if (r.category && categories.some((c) => c.name === r.category)) {
          data.category = r.category;
        }
        return data;
      });
      const { error } = await supabase.from("charging_sessions").insert(payload);
      if (error) throw error;
      toast.success(`${payload.length} charging sessions added`);
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
          Bulk Sessions
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[95vh] overflow-y-auto p-4 md:p-6 rounded-3xl" aria-describedby={undefined}>
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl md:text-2xl font-black text-primary flex items-center gap-2">
            <Zap className="h-6 w-6" />
            Bulk EV Charging
          </DialogTitle>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
            Batch process multiple energy charging sessions
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {rows.map((r, i) => (
            <div
              key={i}
              className="flex flex-col gap-4 p-4 rounded-2xl border border-border bg-muted/50/50 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-primary/20" />

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:items-end">
                <div className="md:col-span-2">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5 block">Date</Label>
                  <Input
                    type="date"
                    value={r.session_date}
                    className="h-11 rounded-xl font-bold border-border"
                    onChange={(e) => updateRow(i, { session_date: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 md:col-span-3 gap-3">
                  <div>
                    <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5 block">Start %</Label>
                    <Input
                      type="number"
                      value={r.start_percentage}
                      className="h-11 rounded-xl font-bold border-border"
                      onChange={(e) =>
                        updateRow(i, { start_percentage: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5 block">End %</Label>
                    <Input
                      type="number"
                      value={r.end_percentage}
                      className="h-11 rounded-xl font-bold border-border"
                      onChange={(e) =>
                        updateRow(i, { end_percentage: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:col-span-3 gap-3">
                  <div>
                    <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5 block">kCal/Unit</Label>
                    <Input
                      type="number"
                      value={r.kcal}
                      className="h-11 rounded-xl font-bold border-border"
                      onChange={(e) =>
                        updateRow(i, { kcal: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5 block">Unit Rate</Label>
                    <Input
                      type="number"
                      value={r.per_unit_rate}
                      className="h-11 rounded-xl font-bold border-border"
                      onChange={(e) =>
                        updateRow(i, { per_unit_rate: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
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

                <div className="flex items-center justify-between md:col-span-2">
                  <div className="flex flex-col items-start md:items-end w-full">
                    <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5 block md:hidden">Subtotal</Label>
                    <div className="text-lg font-black text-primary">
                      ₹ {computeTotal(r).toFixed(0)}
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
              ) : `Save ${rows.length} Sessions`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MultiChargingEntry;
