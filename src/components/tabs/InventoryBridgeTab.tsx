import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { Calendar as CalendarIcon, Package, ArrowRight, CheckCircle2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useEditPermissions } from "@/hooks/useEditPermissions";

interface Suggestion {
  inventory_id: string;
  item_name: string;
  current_qty: number;
  sold_qty: number;
  gap: number;
}

const InventoryBridgeTab = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { canEditInventory } = useEditPermissions();
  const [start, setStart] = useState<Date>(subDays(new Date(), 7));
  const [end, setEnd] = useState<Date>(new Date());
  const [overrides, setOverrides] = useState<Record<string, number>>({});

  const { data: orderItems } = useQuery({
    queryKey: ["bridge-orders", format(start, "yyyy-MM-dd"), format(end, "yyyy-MM-dd")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("item_name,quantity,order_date")
        .gte("order_date", format(start, "yyyy-MM-dd"))
        .lte("order_date", format(end, "yyyy-MM-dd"))
        .limit(5000);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: inventory } = useQuery({
    queryKey: ["bridge-inventory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory")
        .select("id,item_name,quantity")
        .eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
  });

  const suggestions: Suggestion[] = useMemo(() => {
    if (!orderItems || !inventory) return [];
    const sold = new Map<string, number>();
    orderItems.forEach((o: any) => {
      const key = String(o.item_name || "").toLowerCase().trim();
      if (!key) return;
      sold.set(key, (sold.get(key) || 0) + (Number(o.quantity) || 0));
    });
    return inventory
      .map((it: any) => {
        const key = String(it.item_name || "").toLowerCase().trim();
        const soldQty = sold.get(key) || 0;
        return {
          inventory_id: it.id,
          item_name: it.item_name,
          current_qty: Number(it.quantity) || 0,
          sold_qty: soldQty,
          gap: soldQty,
        };
      })
      .filter((s) => s.sold_qty > 0)
      .sort((a, b) => b.sold_qty - a.sold_qty);
  }, [orderItems, inventory]);

  const applyStockOut = async (s: Suggestion) => {
    if (!user?.id) return;
    const qty = overrides[s.inventory_id] ?? s.gap;
    if (!qty || qty <= 0) {
      toast.error("Quantity must be > 0");
      return;
    }
    const { error: txErr } = await supabase.from("inventory_transactions").insert({
      user_id: user.id,
      inventory_id: s.inventory_id,
      quantity: -Math.abs(qty),
      transaction_type: "sale",
      reference_type: "orders",
      transaction_date: format(new Date(), "yyyy-MM-dd"),
      notes: `Auto stock-out from sales bridge (${format(start, "MMM d")}–${format(end, "MMM d")})`,
    });
    if (txErr) {
      toast.error(txErr.message);
      return;
    }
    const { error: invErr } = await supabase
      .from("inventory")
      .update({ quantity: Math.max(0, s.current_qty - qty) })
      .eq("id", s.inventory_id);
    if (invErr) {
      toast.error(invErr.message);
      return;
    }
    toast.success(`Stocked out ${qty} × ${s.item_name}`);
    qc.invalidateQueries({ queryKey: ["bridge-inventory"] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Inventory ↔ Sales Bridge</h2>
        <p className="text-sm text-muted-foreground">
          Suggested stock-outs based on items sold in Orders. Apply to keep inventory in sync.
        </p>
      </div>

      <Card className="border border-border">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Range</CardTitle>
            <CardDescription>
              Compare orders with current inventory
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <DateBtn date={start} onChange={setStart} label="From" />
            <DateBtn date={end} onChange={setEnd} label="To" />
          </div>
        </CardHeader>
        <CardContent>
          {suggestions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No matching items sold in this range. Make sure inventory item_name matches order item_name.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b border-border">
                <tr>
                  <th className="text-left py-2 px-2">Item</th>
                  <th className="text-right py-2 px-2">In Stock</th>
                  <th className="text-right py-2 px-2">Sold</th>
                  <th className="text-right py-2 px-2">Suggested out</th>
                  <th className="text-right py-2 px-2">After</th>
                  <th className="text-right py-2 px-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {suggestions.map((s) => {
                  const qty = overrides[s.inventory_id] ?? s.gap;
                  const after = s.current_qty - qty;
                  return (
                    <tr key={s.inventory_id} className="border-b border-border last:border-0">
                      <td className="py-2 px-2 flex items-center gap-2">
                        <Package className="h-3.5 w-3.5 text-muted-foreground" />
                        {s.item_name}
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums">{s.current_qty}</td>
                      <td className="py-2 px-2 text-right tabular-nums">{s.sold_qty}</td>
                      <td className="py-2 px-2 text-right">
                        <Input
                          type="number"
                          value={qty}
                          onChange={(e) =>
                            setOverrides((cur) => ({ ...cur, [s.inventory_id]: Number(e.target.value) }))
                          }
                          className="h-7 w-20 text-right ml-auto"
                        />
                      </td>
                      <td className="py-2 px-2 text-right">
                        <Badge variant={after < 0 ? "destructive" : "secondary"}>{after}</Badge>
                      </td>
                      <td className="py-2 px-2 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!canEditInventory}
                          onClick={() => applyStockOut(s)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Apply
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const DateBtn = ({ date, onChange, label }: { date: Date; onChange: (d: Date) => void; label: string }) => (
  <Popover>
    <PopoverTrigger asChild>
      <Button variant="outline" size="sm" className="justify-start font-normal">
        <CalendarIcon className="h-3.5 w-3.5 mr-1" />
        {label}: {format(date, "MMM d")}
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-auto p-0" align="end">
      <Calendar mode="single" selected={date} onSelect={(d) => d && onChange(d)} className="p-3 pointer-events-auto" />
    </PopoverContent>
  </Popover>
);

export default InventoryBridgeTab;
