import { useState, useEffect } from "react";
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
  ShoppingCart,
  Check,
  ChevronsUpDown,} from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Row {
  order_date: string;
  item_name: string;
  menu_item_id: string;
  category: string;
  quantity: number;
  rate: number;
  payment_mode: string;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
}

interface Props {
  onComplete: () => void;
}

const paymentModes = ["Cash", "Esewa", "Fonepay", "Bank", "Cheque", "Credit"];

const blankRow = (): Row => ({
  order_date: format(new Date(), "yyyy-MM-dd"),
  item_name: "",
  menu_item_id: "",
  category: "",
  quantity: 1,
  rate: 0,
  payment_mode: "Cash",
});

const MultiOrderEntry = ({ onComplete }: Props) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([blankRow()]);
  const [submitting, setSubmitting] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [popoverOpen, setPopoverOpen] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (open) {
      fetchMenuItems();
    }
  }, [open]);

  const fetchMenuItems = async () => {
    try {
      const { data, error } = await supabase
        .from("menu_items")
        .select("id, name, price, category")
        .eq("is_available", true)
        .order("name");
      if (error) throw error;
      setMenuItems(data || []);
    } catch (error) {
      console.error("Error fetching menu items:", error);
    }
  };

  const handleMenuSelect = (i: number, item: MenuItem) => {
    updateRow(i, {
      menu_item_id: item.id,
      item_name: item.name,
      rate: item.price,
      category: item.category
    });
    setPopoverOpen(prev => ({ ...prev, [i]: false }));
  };

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
        menu_item_id: r.menu_item_id || null,
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
        <Button variant="outline" size="sm" className="gap-2 rounded-xl font-bold h-10 border-primary/20 text-primary hover:bg-primary/5">
          <Layers className="h-4 w-4" />
          Bulk Add
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[95vh] overflow-y-auto p-4 md:p-6 rounded-3xl" aria-describedby={undefined}>
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl md:text-2xl font-black text-primary flex items-center gap-2">
            <ShoppingCart className="h-6 w-6" />
            Bulk Orders
          </DialogTitle>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
            Batch process multiple orders across different dates
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {rows.map((r, i) => (
            <div
              key={i}
              className="flex flex-col gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50/50 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-primary/20" />

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:items-end">
                <div className="md:col-span-2">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 block">Date</Label>
                  <Input
                    type="date"
                    value={r.order_date}
                    className="h-11 rounded-xl font-bold border-slate-200"
                    onChange={(e) => updateRow(i, { order_date: e.target.value })}
                  />
                </div>
                <div className="md:col-span-3">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 block">Menu Item</Label>
                  <div className="space-y-2">
                    <Popover
                      open={popoverOpen[i]}
                      onOpenChange={(val) => setPopoverOpen(prev => ({...prev, [i]: val}))}
                      modal={true}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between h-11 rounded-xl font-bold border-slate-200 bg-white text-left overflow-hidden"
                        >
                          <span className="truncate">
                            {r.item_name || "Select item..."}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
                        <Command shouldFilter={true}>
                          <CommandInput placeholder="Search menu..." />
                          <CommandList>
                            <CommandEmpty>No item found.</CommandEmpty>
                            <CommandGroup>
                              {menuItems.map((item) => (
                                <CommandItem
                                  key={item.id}
                                  value={`${item.name.toLowerCase()}-${item.id}`}
                                  onMouseDown={(e) => e.preventDefault()}
                                  onSelect={() => {
                                    console.log("MultiOrder: Item selected:", item.name);
                                    handleMenuSelect(i, item);
                                  }}
                                  className="cursor-pointer pointer-events-auto"
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      r.menu_item_id === item.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <div className="flex flex-col">
                                    <span className="font-bold">{item.name}</span>
                                    <span className="text-[10px] text-muted-foreground uppercase">{item.category} - रु {item.price}</span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {(!r.menu_item_id) && (
                      <Input
                        value={r.item_name}
                        className="h-9 rounded-lg font-medium border-slate-200"
                        onChange={(e) => updateRow(i, { item_name: e.target.value })}
                        placeholder="Manual item name..."
                      />
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 md:col-span-3 gap-3">
                  <div>
                    <Label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 block">Quantity</Label>
                    <Input
                      type="number"
                      value={r.quantity}
                      className="h-11 rounded-xl font-bold border-slate-200"
                      onChange={(e) =>
                        updateRow(i, { quantity: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 block">Rate (रु)</Label>
                    <Input
                      type="number"
                      value={r.rate}
                      className="h-11 rounded-xl font-bold border-slate-200"
                      onChange={(e) => updateRow(i, { rate: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 block">Payment Mode</Label>
                  <Select
                    value={r.payment_mode}
                    onValueChange={(v) => updateRow(i, { payment_mode: v })}
                  >
                    <SelectTrigger className="h-11 rounded-xl font-bold border-slate-200 bg-white">
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
                    <Label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 block md:hidden">Subtotal</Label>
                    <div className="text-lg font-black text-primary">
                      रु {total(r).toFixed(0)}
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-full md:mb-1"
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
            className="w-full h-12 rounded-2xl font-black uppercase text-xs tracking-widest bg-slate-100 hover:bg-slate-200 text-slate-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Another Record
          </Button>
        </div>

        <DialogFooter className="mt-8 flex flex-col sm:flex-row items-center gap-4 border-t border-slate-100 pt-6">
          <div className="flex-1 text-center sm:text-left">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Batch Total Amount</p>
            <div className="text-2xl font-black text-primary">
              रु {grandTotal.toLocaleString()}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              className="rounded-xl font-bold h-12 text-slate-500"
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
              ) : `Save ${rows.length} Orders`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MultiOrderEntry;
