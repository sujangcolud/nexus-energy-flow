import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import {
  Calendar as CalendarIcon,
  Package,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  ChefHat,
  ArrowDownToLine,
  ArrowUpFromLine,
  Activity,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useEditPermissions } from "@/hooks/useEditPermissions";

const fmt = (n: number, d = 2) =>
  Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: d }) : "0";
const money = (n: number) => `₹ ${fmt(n, 2)}`;

const DateBtn = ({
  date,
  onChange,
  label,
}: {
  date: Date;
  onChange: (d: Date) => void;
  label: string;
}) => (
  <Popover>
    <PopoverTrigger asChild>
      <Button variant="outline" size="sm" className="justify-start font-normal">
        <CalendarIcon className="h-3.5 w-3.5 mr-1" />
        {label}: {format(date, "MMM d")}
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-auto p-0" align="end">
      <Calendar
        mode="single"
        selected={date}
        onSelect={(d) => d && onChange(d)}
        className="p-3 pointer-events-auto"
      />
    </PopoverContent>
  </Popover>
);

const KPI = ({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: string;
  icon: any;
  hint?: string;
}) => (
  <Card className="border border-border">
    <CardContent className="p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
    </CardContent>
  </Card>
);

const InventoryBridgeTab = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { canEditInventory } = useEditPermissions();
  const [start, setStart] = useState<Date>(subDays(new Date(), 30));
  const [end, setEnd] = useState<Date>(new Date());
  const [overrides, setOverrides] = useState<Record<string, number>>({});

  const startStr = format(start, "yyyy-MM-dd");
  const endStr = format(end, "yyyy-MM-dd");

  // ---------- Data ----------
  const { data: inventory = [] } = useQuery({
    queryKey: ["bridge-inventory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory")
        .select("id,item_name,quantity,current_stock_base,base_unit,unit_cost,average_cost_per_base_unit,minimum_stock,is_active")
        .eq("is_active", true)
        .limit(5000);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: movements = [] } = useQuery({
    queryKey: ["bridge-movements", startStr, endStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_movements")
        .select(
          "id,inventory_item_id,movement_type,quantity_base,unit_cost_base,created_at,reference_type"
        )
        .gte("created_at", startStr)
        .lte("created_at", endStr + "T23:59:59")
        .limit(10000);
      if (error) throw error;
      return data || [];
    },
  });

  // Opening stock = before start date
  const { data: openingMovements = [] } = useQuery({
    queryKey: ["bridge-opening-movements", startStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_movements")
        .select("inventory_item_id,quantity_base,unit_cost_base")
        .lt("created_at", startStr)
        .limit(50000);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["bridge-orders", startStr, endStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("item_name,quantity,total,order_date")
        .gte("order_date", startStr)
        .lte("order_date", endStr)
        .limit(10000);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: recipes = [] } = useQuery({
    queryKey: ["bridge-recipes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipe_items")
        .select(
          "menu_item_id,inventory_item_id,quantity_used,unit_type,waste_percentage"
        )
        .limit(10000);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: menuItems = [] } = useQuery({
    queryKey: ["bridge-menu"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_items")
        .select("id,name,price,category,recipe_yield")
        .limit(5000);
      if (error) throw error;
      return data || [];
    },
  });

  // ---------- Derived ----------
  const invMap = useMemo(
    () => new Map(inventory.map((i: any) => [i.id, i])),
    [inventory]
  );
  const menuMap = useMemo(
    () => new Map(menuItems.map((m: any) => [m.id, m])),
    [menuItems]
  );

  // Per-item: opening, purchased, consumed, current
  const perItem = useMemo(() => {
    const opening = new Map<string, number>();
    openingMovements.forEach((t: any) => {
      opening.set(
        t.inventory_item_id,
        (opening.get(t.inventory_item_id) || 0) + Number(t.quantity_base || 0)
      );
    });

    const purchased = new Map<string, number>();
    const consumed = new Map<string, number>();
    const purchasedCost = new Map<string, number>();
    const consumedCost = new Map<string, number>();

    movements.forEach((t: any) => {
      const q = Number(t.quantity_base || 0);
      const cost = Math.abs(q) * (t.unit_cost_base || 0);
      if (q > 0) {
        purchased.set(t.inventory_item_id, (purchased.get(t.inventory_item_id) || 0) + q);
        purchasedCost.set(t.inventory_item_id, (purchasedCost.get(t.inventory_item_id) || 0) + cost);
      } else if (q < 0) {
        consumed.set(t.inventory_item_id, (consumed.get(t.inventory_item_id) || 0) + -q);
        consumedCost.set(t.inventory_item_id, (consumedCost.get(t.inventory_item_id) || 0) + cost);
      }
    });

    return inventory.map((it: any) => {
      const op = opening.get(it.id) || 0;
      const pu = purchased.get(it.id) || 0;
      const co = consumed.get(it.id) || 0;
      const cur = Number(it.current_stock_base ?? 0);
      const unitCost = Number(it.average_cost_per_base_unit ?? it.unit_cost ?? 0);
      return {
        id: it.id,
        item_name: it.item_name,
        base_unit: it.base_unit,
        opening: op,
        purchased: pu,
        consumed: co,
        current: cur,
        expected: op + pu - co,
        variance: cur - (op + pu - co),
        purchase_cost: purchasedCost.get(it.id) || 0,
        consumed_cost: consumedCost.get(it.id) || 0,
        unit_cost: unitCost,
        below_min:
          Number(it.minimum_stock || 0) > 0 && cur < Number(it.minimum_stock),
      };
    });
  }, [inventory, openingMovements, movements]);

  // Totals
  const totals = useMemo(() => {
    const purchasedValue = perItem.reduce((s, p) => s + p.purchase_cost, 0);
    const consumedValue = perItem.reduce((s, p) => s + p.consumed_cost, 0);
    const stockValue = perItem.reduce(
      (s, p) => s + p.current * p.unit_cost,
      0
    );
    const salesValue = orders.reduce(
      (s: number, o: any) => s + Number(o.total || 0),
      0
    );
    const lowStock = perItem.filter((p) => p.below_min).length;
    return { purchasedValue, consumedValue, stockValue, salesValue, lowStock };
  }, [perItem, orders]);

  // Recipe usage / profitability per menu item
  const recipeRows = useMemo(() => {
    const byMenu = new Map<string, any[]>();
    recipes.forEach((r: any) => {
      if (!byMenu.has(r.menu_item_id)) byMenu.set(r.menu_item_id, []);
      byMenu.get(r.menu_item_id)!.push(r);
    });

    const soldByName = new Map<string, number>();
    orders.forEach((o: any) => {
      const k = String(o.item_name || "").toLowerCase().trim();
      soldByName.set(k, (soldByName.get(k) || 0) + Number(o.quantity || 0));
    });

    return menuItems
      .map((m: any) => {
        const ings = byMenu.get(m.id) || [];
        const yieldQty = Number(m.recipe_yield || 1) || 1;
        const cost = ings.reduce((sum, r) => {
          const inv: any = invMap.get(r.inventory_item_id);
          if (!inv) return sum;
          const perServing =
            (Number(r.quantity_used) * (1 + Number(r.waste_percentage || 0) / 100)) /
            yieldQty;
          return sum + perServing * Number(inv.average_cost_per_base_unit ?? inv.unit_cost ?? 0);
        }, 0);
        const sold = soldByName.get(String(m.name).toLowerCase().trim()) || 0;
        const margin = Number(m.price || 0) - cost;
        return {
          id: m.id,
          name: m.name,
          price: Number(m.price || 0),
          category: m.category,
          ingredients: ings.length,
          food_cost: cost,
          margin,
          margin_pct: m.price > 0 ? (margin / Number(m.price)) * 100 : 0,
          sold,
          revenue: sold * Number(m.price || 0),
          ingredient_cost_total: sold * cost,
        };
      })
      .sort((a, b) => b.sold - a.sold);
  }, [recipes, menuItems, orders, invMap]);

  // Sales-bridge suggestions (legacy quick-deduct)
  const suggestions = useMemo(() => {
    const sold = new Map<string, number>();
    orders.forEach((o: any) => {
      const k = String(o.item_name || "").toLowerCase().trim();
      if (!k) return;
      sold.set(k, (sold.get(k) || 0) + Number(o.quantity || 0));
    });
    return inventory
      .map((it: any) => {
        const k = String(it.item_name || "").toLowerCase().trim();
        const s = sold.get(k) || 0;
        return {
          inventory_id: it.id,
          item_name: it.item_name,
          current_qty: Number(it.quantity || 0),
          sold_qty: s,
          gap: s,
        };
      })
      .filter((s) => s.sold_qty > 0)
      .sort((a, b) => b.sold_qty - a.sold_qty);
  }, [orders, inventory]);

  const applyStockOut = async (s: any) => {
    if (!user?.id) return;
    const qty = overrides[s.inventory_id] ?? s.gap;
    if (!qty || qty <= 0) {
      toast.error("Quantity must be > 0");
      return;
    }
    const { error: moveErr } = await supabase
      .from("inventory_movements")
      .insert({
        user_id: user.id,
        inventory_item_id: s.inventory_id,
        quantity_base: -Math.abs(qty),
        movement_type: "wastage",
        reference_type: "manual",
        created_at: new Date().toISOString(),
      });
    if (moveErr) return toast.error(moveErr.message);

    toast.success(`Stocked out ${qty} × ${s.item_name}`);
    qc.invalidateQueries({ queryKey: ["bridge-inventory"] });
    qc.invalidateQueries({ queryKey: ["bridge-movements"] });
  };

  // Daily movement series
  const dailyMovement = useMemo(() => {
    const map = new Map<
      string,
      { date: string; in: number; out: number; in_value: number; out_value: number }
    >();
    movements.forEach((t: any) => {
      const d = format(new Date(t.created_at), "yyyy-MM-dd");
      if (!map.has(d))
        map.set(d, { date: d, in: 0, out: 0, in_value: 0, out_value: 0 });
      const row = map.get(d)!;
      const q = Number(t.quantity_base || 0);
      const c = Math.abs(q) * (t.unit_cost_base || 0);
      if (q > 0) {
        row.in += q;
        row.in_value += c;
      } else {
        row.out += -q;
        row.out_value += c;
      }
    });
    return Array.from(map.values()).sort((a, b) =>
      a.date < b.date ? 1 : -1
    );
  }, [movements, invMap]);

  // ---------- Render ----------
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">
            Inventory Bridge
          </h2>
          <p className="text-sm text-muted-foreground">
            Expenses → Inventory → Recipes → Orders → Reports. End-to-end
            visibility of stock movement and profitability.
          </p>
        </div>
        <div className="flex gap-2">
          <DateBtn date={start} onChange={setStart} label="From" />
          <DateBtn date={end} onChange={setEnd} label="To" />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPI
          label="Stock Value"
          value={money(totals.stockValue)}
          icon={Package}
          hint="Current on-hand × unit cost"
        />
        <KPI
          label="Purchased"
          value={money(totals.purchasedValue)}
          icon={ArrowDownToLine}
          hint="Period stock-in value"
        />
        <KPI
          label="Consumed"
          value={money(totals.consumedValue)}
          icon={ArrowUpFromLine}
          hint="Period stock-out value"
        />
        <KPI
          label="Sales"
          value={money(totals.salesValue)}
          icon={TrendingUp}
          hint="Orders revenue in period"
        />
        <KPI
          label="Low Stock"
          value={String(totals.lowStock)}
          icon={TrendingDown}
          hint="Items below minimum"
        />
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full md:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="recipes">Recipe Profitability</TabsTrigger>
          <TabsTrigger value="movement">Daily Movement</TabsTrigger>
          <TabsTrigger value="sync">Sales Sync</TabsTrigger>
        </TabsList>

        {/* OVERVIEW: Opening / Purchased / Consumed / Current / Variance */}
        <TabsContent value="overview" className="mt-4">
          <Card className="border border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Stock Movement by Item
              </CardTitle>
              <CardDescription>
                Opening + Purchased − Consumed = Expected. Variance flags
                shrinkage or untracked usage.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm min-w-[800px]">
                <thead className="text-xs text-muted-foreground border-b border-border">
                  <tr>
                    <th className="text-left py-2 px-2">Item</th>
                    <th className="text-right py-2 px-2">Unit</th>
                    <th className="text-right py-2 px-2">Opening</th>
                    <th className="text-right py-2 px-2">Purchased</th>
                    <th className="text-right py-2 px-2">Consumed</th>
                    <th className="text-right py-2 px-2">Expected</th>
                    <th className="text-right py-2 px-2">Current</th>
                    <th className="text-right py-2 px-2">Variance</th>
                  </tr>
                </thead>
                <tbody>
                  {perItem.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-muted-foreground">
                        No inventory items found.
                      </td>
                    </tr>
                  )}
                  {perItem.map((p) => (
                    <tr key={p.id} className="border-b border-border last:border-0">
                      <td className="py-2 px-2 flex items-center gap-2">
                        <Package className="h-3.5 w-3.5 text-muted-foreground" />
                        {p.item_name}
                        {p.below_min && (
                          <Badge variant="destructive" className="text-[10px]">
                            low
                          </Badge>
                        )}
                      </td>
                      <td className="py-2 px-2 text-right text-muted-foreground">
                        {p.base_unit}
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums">
                        {fmt(p.opening)}
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums text-success">
                        +{fmt(p.purchased)}
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums text-destructive">
                        −{fmt(p.consumed)}
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums">
                        {fmt(p.expected)}
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums font-medium">
                        {fmt(p.current)}
                      </td>
                      <td className="py-2 px-2 text-right">
                        <Badge
                          variant={
                            Math.abs(p.variance) < 0.001
                              ? "secondary"
                              : p.variance < 0
                              ? "destructive"
                              : "outline"
                          }
                          className="tabular-nums"
                        >
                          {p.variance >= 0 ? "+" : ""}
                          {fmt(p.variance)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* RECIPES */}
        <TabsContent value="recipes" className="mt-4">
          <Card className="border border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Menu Profitability & Ingredient Usage
              </CardTitle>
              <CardDescription>
                Per-serving food cost = Σ((qty × (1 + waste%)) / yield × unit
                cost). Compares against price and units sold.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm min-w-[800px]">
                <thead className="text-xs text-muted-foreground border-b border-border">
                  <tr>
                    <th className="text-left py-2 px-2">Menu Item</th>
                    <th className="text-right py-2 px-2">Ingredients</th>
                    <th className="text-right py-2 px-2">Price</th>
                    <th className="text-right py-2 px-2">Food Cost</th>
                    <th className="text-right py-2 px-2">Margin</th>
                    <th className="text-right py-2 px-2">Margin %</th>
                    <th className="text-right py-2 px-2">Sold</th>
                    <th className="text-right py-2 px-2">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {recipeRows.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-muted-foreground">
                        No menu items found.
                      </td>
                    </tr>
                  )}
                  {recipeRows.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0">
                      <td className="py-2 px-2 flex items-center gap-2">
                        <ChefHat className="h-3.5 w-3.5 text-muted-foreground" />
                        {r.name}
                        {r.ingredients === 0 && (
                          <Badge variant="outline" className="text-[10px]">
                            no recipe
                          </Badge>
                        )}
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums">
                        {r.ingredients}
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums">
                        {money(r.price)}
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums">
                        {money(r.food_cost)}
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums">
                        {money(r.margin)}
                      </td>
                      <td className="py-2 px-2 text-right">
                        <Badge
                          variant={
                            r.margin_pct > 50
                              ? "secondary"
                              : r.margin_pct > 20
                              ? "outline"
                              : "destructive"
                          }
                        >
                          {fmt(r.margin_pct, 1)}%
                        </Badge>
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums">
                        {fmt(r.sold, 0)}
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums">
                        {money(r.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MOVEMENT */}
        <TabsContent value="movement" className="mt-4">
          <Card className="border border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Daily Inventory Movement</CardTitle>
              <CardDescription>
                Net stock-in vs stock-out per day across all items.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead className="text-xs text-muted-foreground border-b border-border">
                  <tr>
                    <th className="text-left py-2 px-2">Date</th>
                    <th className="text-right py-2 px-2">Stock In (qty)</th>
                    <th className="text-right py-2 px-2">Stock In Value</th>
                    <th className="text-right py-2 px-2">Stock Out (qty)</th>
                    <th className="text-right py-2 px-2">Stock Out Value</th>
                    <th className="text-right py-2 px-2">Net Value</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyMovement.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        No inventory transactions in this period.
                      </td>
                    </tr>
                  )}
                  {dailyMovement.map((d) => (
                    <tr key={d.date} className="border-b border-border last:border-0">
                      <td className="py-2 px-2 flex items-center gap-2">
                        <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                        {format(new Date(d.date), "MMM d, yyyy")}
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums text-success">
                        +{fmt(d.in)}
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums">
                        {money(d.in_value)}
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums text-destructive">
                        −{fmt(d.out)}
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums">
                        {money(d.out_value)}
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums font-medium">
                        {money(d.in_value - d.out_value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SYNC */}
        <TabsContent value="sync" className="mt-4">
          <Card className="border border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Manual Sales → Inventory Sync
              </CardTitle>
              <CardDescription>
                For items sold without a configured recipe. POS orders with a
                recipe deduct stock automatically.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {suggestions.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No matching items sold in this range.
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
                        <tr
                          key={s.inventory_id}
                          className="border-b border-border last:border-0"
                        >
                          <td className="py-2 px-2 flex items-center gap-2">
                            <Package className="h-3.5 w-3.5 text-muted-foreground" />
                            {s.item_name}
                          </td>
                          <td className="py-2 px-2 text-right tabular-nums">
                            {s.current_qty}
                          </td>
                          <td className="py-2 px-2 text-right tabular-nums">
                            {s.sold_qty}
                          </td>
                          <td className="py-2 px-2 text-right">
                            <Input
                              type="number"
                              value={qty}
                              onChange={(e) =>
                                setOverrides((cur) => ({
                                  ...cur,
                                  [s.inventory_id]: Number(e.target.value),
                                }))
                              }
                              className="h-7 w-20 text-right ml-auto"
                            />
                          </td>
                          <td className="py-2 px-2 text-right">
                            <Badge
                              variant={after < 0 ? "destructive" : "secondary"}
                            >
                              {after}
                            </Badge>
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InventoryBridgeTab;
