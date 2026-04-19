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
        <Button variant="outline" size="sm" className="gap-2">
          <Layers className="h-4 w-4" />
          Bulk Add
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Multiple Charging Sessions</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Enter multiple sessions across different dates in one go.
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
                  value={r.session_date}
                  onChange={(e) => updateRow(i, { session_date: e.target.value })}
                />
              </div>
              <div className="col-span-6 sm:col-span-1">
                <Label className="text-xs">Start %</Label>
                <Input
                  type="number"
                  value={r.start_percentage}
                  onChange={(e) =>
                    updateRow(i, { start_percentage: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="col-span-6 sm:col-span-1">
                <Label className="text-xs">End %</Label>
                <Input
                  type="number"
                  value={r.end_percentage}
                  onChange={(e) =>
                    updateRow(i, { end_percentage: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="col-span-6 sm:col-span-1">
                <Label className="text-xs">Rate/%</Label>
                <Input
                  type="number"
                  value={r.per_percent_rate}
                  onChange={(e) =>
                    updateRow(i, { per_percent_rate: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="col-span-6 sm:col-span-1">
                <Label className="text-xs">kCal</Label>
                <Input
                  type="number"
                  value={r.kcal}
                  onChange={(e) =>
                    updateRow(i, { kcal: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="col-span-6 sm:col-span-1">
                <Label className="text-xs">Rate/Unit</Label>
                <Input
                  type="number"
                  value={r.per_unit_rate}
                  onChange={(e) =>
                    updateRow(i, { per_unit_rate: parseFloat(e.target.value) || 0 })
                  }
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
              <div className="col-span-8 sm:col-span-2">
                <Label className="text-xs">Category</Label>
                <Select
                  value={r.category || "none"}
                  onValueChange={(v) => updateRow(i, { category: v === "none" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.name}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-3 sm:col-span-1 text-sm font-medium text-right">
                {computeTotal(r).toFixed(0)}
              </div>
              <div className="col-span-1 sm:col-span-0 sm:absolute sm:right-2 flex justify-end">
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
            {submitting ? "Saving..." : `Save ${rows.length} Sessions`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MultiChargingEntry;
