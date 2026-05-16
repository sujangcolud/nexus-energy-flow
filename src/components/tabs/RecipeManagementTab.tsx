import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChefHat, Plus, Trash2, Save, CheckCircle2, Copy } from "lucide-react";
import { extractErrorMessage, logError } from "@/utils/errorHandling";
import { Badge } from "@/components/ui/badge";

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  hasRecipe?: boolean;
  recipe_yield?: number;
}
interface UnitConversion {
  id: string;
  unit_name: string;
  conversion_to_base: number;
}

interface InventoryItem {
  id: string;
  item_name: string;
  base_unit: string;
  current_stock_base: number;
  unit_cost: number | null;
  average_cost_per_base_unit: number | null;
  quantity: number;
  unit_conversions?: UnitConversion[];
}
interface RecipeRow {
  id?: string;
  inventory_item_id: string;
  quantity_used: number;
  unit_type: string;
  waste_percentage: number;
}

const BASE_UNITS = ["gm", "ml", "pcs"];

const RecipeManagementTab = () => {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [selectedMenuId, setSelectedMenuId] = useState<string>("");
  const [copySourceId, setCopySourceId] = useState<string>("");
  const [rows, setRows] = useState<RecipeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchMenuAndInventory = async () => {
    setLoading(true);
    try {
      const [m, i, r] = await Promise.all([
        supabase.from("menu_items").select("id,name,price,category,recipe_yield").order("name"),
        supabase.from("inventory").select(`
          id,item_name,base_unit,unit_cost,quantity,current_stock_base,
          unit_conversions:inventory_unit_conversions(*)
        `).eq("is_active", true).order("item_name"),
        supabase.from("recipe_items" as any).select("menu_item_id")
      ]);
      if (m.error) throw m.error;
      if (i.error) throw i.error;
      if (r.error) throw r.error;

      const recipeMenuIds = new Set((r.data as any[]).map(item => item.menu_item_id));
      const menuWithStatus = (m.data as MenuItem[]).map(item => ({
        ...item,
        hasRecipe: recipeMenuIds.has(item.id)
      }));

      setMenu(menuWithStatus);
      setInventory((i.data as any) || []);
    } catch (e) {
      logError("recipe load", e);
      toast.error(extractErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenuAndInventory();
  }, []);

  useEffect(() => {
    if (!selectedMenuId) { setRows([]); return; }
    (async () => {
      const { data, error } = await supabase
        .from("recipe_items" as any)
        .select("id,inventory_item_id,quantity_used,unit_type,waste_percentage")
        .eq("menu_item_id", selectedMenuId);
      if (error) { toast.error(extractErrorMessage(error)); return; }
      setRows(((data as any) || []).map((r: any) => ({
        id: r.id,
        inventory_item_id: r.inventory_item_id,
        quantity_used: Number(r.quantity_used),
        unit_type: r.unit_type,
        waste_percentage: Number(r.waste_percentage),
      })));
    })();
  }, [selectedMenuId]);

  const invMap = useMemo(() => {
    const m: Record<string, InventoryItem> = {};
    inventory.forEach((x) => (m[x.id] = x));
    return m;
  }, [inventory]);

  const addRow = () =>
    setRows((r) => [...r, { inventory_item_id: "", quantity_used: 0, unit_type: "gm", waste_percentage: 0 }]);

  const updateRow = (idx: number, patch: Partial<RecipeRow>) =>
    setRows((r) => r.map((row, i) => (i === idx ? { ...row, ...patch } : row)));

  const removeRow = (idx: number) =>
    setRows((r) => r.filter((_, i) => i !== idx));

  const totalCost = useMemo(() => {
    return rows.reduce((sum, r) => {
      const inv = invMap[r.inventory_item_id];
      const unitCost = inv?.average_cost_per_base_unit ?? inv?.unit_cost;
      if (!unitCost) return sum;

      let qty = r.quantity_used * (1 + r.waste_percentage / 100);

      // Handle conversion to base unit for cost calculation
      if (r.unit_type !== inv.base_unit) {
        const conv = inv.unit_conversions?.find(c => c.unit_name.toLowerCase() === r.unit_type.toLowerCase());
        if (conv) {
          qty *= conv.conversion_to_base;
        } else {
          // Fallback to basic conversions
          if ((r.unit_type === "kg" || r.unit_type === "kilogram") && inv.base_unit === "gm") qty *= 1000;
          else if (r.unit_type === "gm" && (inv.base_unit === "kg" || inv.base_unit === "kilogram")) qty /= 1000;
          else if (r.unit_type === "l" && inv.base_unit === "ml") qty *= 1000;
          else if (r.unit_type === "ml" && inv.base_unit === "l") qty /= 1000;
        }
      }
      return sum + qty * Number(unitCost);
    }, 0);
  }, [rows, invMap]);

  const selectedMenu = menu.find((m) => m.id === selectedMenuId);
  const currentYield = selectedMenu?.recipe_yield || 1;
  const unitCostVal = totalCost / currentYield;
  const profit = selectedMenu ? selectedMenu.price - unitCostVal : 0;

  const handleCopyRecipe = async () => {
    if (!copySourceId) return;
    try {
      const { data, error } = await supabase
        .from("recipe_items" as any)
        .select("inventory_item_id,quantity_used,unit_type,waste_percentage")
        .eq("menu_item_id", copySourceId);
      if (error) throw error;

      const newRows = ((data as any) || []).map((r: any) => ({
        inventory_item_id: r.inventory_item_id,
        quantity_used: Number(r.quantity_used),
        unit_type: r.unit_type,
        waste_percentage: Number(r.waste_percentage),
      }));

      if (newRows.length === 0) {
        toast.info("Source item has no recipe to copy");
        return;
      }

      setRows(newRows);
      toast.success("Recipe copied! Don't forget to save.");
      setCopySourceId("");
    } catch (e) {
      logError("recipe copy", e);
      toast.error(extractErrorMessage(e));
    }
  };

  const handleYieldChange = async (val: string) => {
    const num = parseFloat(val) || 1;
    if (num <= 0) return;

    // Update local state
    setMenu(prev => prev.map(m => m.id === selectedMenuId ? { ...m, recipe_yield: num } : m));

    // Persist to DB
    const { error } = await supabase.from("menu_items").update({ recipe_yield: num }).eq("id", selectedMenuId);
    if (error) toast.error("Failed to update yield");
  };

  const save = async () => {
    if (!selectedMenuId) return;
    for (const r of rows) {
      if (!r.inventory_item_id || r.quantity_used <= 0) {
        toast.error("Each ingredient needs an item and quantity > 0");
        return;
      }
    }
    setSaving(true);
    try {
      // Replace strategy: delete existing then insert
      const del = await supabase.from("recipe_items" as any).delete().eq("menu_item_id", selectedMenuId);
      if (del.error) throw del.error;
      if (rows.length > 0) {
        const payload = rows.map((r) => ({
          menu_item_id: selectedMenuId,
          inventory_item_id: r.inventory_item_id,
          quantity_used: r.quantity_used,
          unit_type: r.unit_type,
          waste_percentage: r.waste_percentage,
        }));
        const ins = await supabase.from("recipe_items" as any).insert(payload);
        if (ins.error) throw ins.error;
      }
      toast.success("Recipe saved");
      fetchMenuAndInventory(); // Refresh menu list to update recipe status
    } catch (e) {
      logError("recipe save", e);
      toast.error(extractErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="min-h-screen bg-background p-2 md:p-6 pb-24 md:pb-6">
      <div className="bg-primary/5 p-4 rounded-3xl mb-4 md:mb-6 flex items-center gap-3">
        <div className="p-2 bg-primary rounded-xl text-white">
          <ChefHat className="h-5 w-5 md:h-6 md:w-6" />
        </div>
        <h1 className="text-xl md:text-2xl font-bold text-foreground">Recipe Management</h1>
      </div>

      <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden mb-4 md:mb-6">
        <CardHeader className="bg-muted/50/50 border-b border-border px-4 md:px-6 py-4">
          <CardTitle className="text-base md:text-lg font-bold">Menu Item Configuration</CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
            <div className="md:col-span-2 space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Menu Item</Label>
              <Select value={selectedMenuId} onValueChange={setSelectedMenuId}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Select item to edit recipe" />
                </SelectTrigger>
                <SelectContent>
                  {menu.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <div className="flex items-center justify-between w-full gap-2">
                        <span>{m.name} — ₹ {m.price}</span>
                        {m.hasRecipe && <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-accent">Servings per Batch</Label>
              <Input
                type="number"
                step="1"
                min="1"
                className="h-11 rounded-xl border-amber-100 focus:border-amber-500"
                value={selectedMenu?.recipe_yield || 1}
                onChange={(e) => handleYieldChange(e.target.value)}
                placeholder="e.g. 10"
                disabled={!selectedMenuId}
              />
            </div>
            {selectedMenu && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:col-span-4 bg-muted/50 p-4 rounded-2xl border border-border">
                <div className="space-y-1">
                  <div className="text-[10px] font-black uppercase text-muted-foreground">Sell Price</div>
                  <div className="text-sm font-bold">₹ {selectedMenu.price.toFixed(0)}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-black uppercase text-accent">Batch Cost</div>
                  <div className="text-sm font-bold">₹ {totalCost.toFixed(0)}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-black uppercase text-primary">Unit Cost</div>
                  <div className="text-sm font-bold text-blue-700">₹ {unitCostVal.toFixed(0)}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-black uppercase text-success">Unit Profit</div>
                  <div className="text-sm font-bold text-green-700">₹ {profit.toFixed(0)}</div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {selectedMenuId && (
            <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-muted/50/50 border-b border-border px-4 md:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle className="text-base md:text-lg font-bold">Ingredients Breakdown</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="hidden md:flex items-center gap-2 mr-2">
                    <Select value={copySourceId} onValueChange={setCopySourceId}>
                      <SelectTrigger className="w-[180px] h-9 rounded-lg text-xs">
                        <SelectValue placeholder="Copy from..." />
                      </SelectTrigger>
                      <SelectContent>
                        {menu.filter(m => m.hasRecipe && m.id !== selectedMenuId).map((m) => (
                          <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-9 rounded-lg px-4"
                      onClick={handleCopyRecipe}
                      disabled={!copySourceId}
                    >
                      <Copy className="h-3.5 w-3.5 mr-2" /> Copy
                    </Button>
                  </div>
                  <Button size="sm" variant="outline" onClick={addRow} className="h-9 rounded-lg px-4 font-bold border-primary/20 text-primary hover:bg-primary/5"><Plus className="h-4 w-4 mr-2" />Add</Button>
                  <Button size="sm" onClick={save} disabled={saving} className="h-9 rounded-lg px-6 font-bold shadow-sm shadow-primary/20"><Save className="h-4 w-4 mr-2" />{saving ? "Saving…" : "Save Recipe"}</Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Inventory item</TableHead>
                  <TableHead className="w-28">Batch Qty</TableHead>
                      <TableHead className="w-28">Unit</TableHead>
                      <TableHead className="w-24">Waste %</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No ingredients yet — click Add</TableCell></TableRow>
                    )}
                    {rows.map((r, idx) => {
                      const inv = invMap[r.inventory_item_id];
                      return (
                        <TableRow key={idx}>
                          <TableCell>
                            <Select value={r.inventory_item_id} onValueChange={(v) => {
                              const inv = invMap[v];
                              updateRow(idx, { inventory_item_id: v, unit_type: inv?.base_unit || r.unit_type });
                            }}>
                              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                              <SelectContent>
                                {inventory.map((i) => (
                                  <SelectItem key={i.id} value={i.id}>{i.item_name} ({i.base_unit})</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell><Input type="number" step="0.01" value={r.quantity_used} onChange={(e) => updateRow(idx, { quantity_used: parseFloat(e.target.value) || 0 })} /></TableCell>
                          <TableCell>
                            <Select value={r.unit_type} onValueChange={(v) => updateRow(idx, { unit_type: v })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {BASE_UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                                {inv?.unit_conversions?.map((u) => <SelectItem key={u.unit_name} value={u.unit_name}>{u.unit_name}</SelectItem>)}
                                {inv && !BASE_UNITS.includes(inv.base_unit) && <SelectItem value={inv.base_unit}>{inv.base_unit}</SelectItem>}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell><Input type="number" step="0.1" value={r.waste_percentage} onChange={(e) => updateRow(idx, { waste_percentage: parseFloat(e.target.value) || 0 })} /></TableCell>
                          <TableCell className="text-xs text-muted-foreground">{inv ? `${(inv.current_stock_base ?? inv.quantity).toFixed(2)} ${inv.base_unit}` : "-"}</TableCell>
                          <TableCell><Button size="icon" variant="ghost" onClick={() => removeRow(idx)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4 md:space-y-6">
          <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden">
            <CardHeader className="bg-success/5 border-b border-success/10 px-4 md:px-6 py-4">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="h-5 w-5" />
                Recipe-Ready
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <div className="space-y-2">
                {menu.filter(m => m.hasRecipe).length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">No recipes entered yet.</p>
                ) : (
                  menu.filter(m => m.hasRecipe).map(m => (
                    <div
                      key={m.id}
                      className={`flex items-center justify-between p-2 rounded-md border hover:bg-muted/50 cursor-pointer transition-colors ${selectedMenuId === m.id ? 'bg-muted border-primary/50' : 'bg-muted/30'}`}
                      onClick={() => setSelectedMenuId(m.id)}
                    >
                      <div className="text-sm font-medium">{m.name}</div>
                      <Badge variant="secondary" className="text-[10px] uppercase text-success bg-success/5 border-green-200">Ready</Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden">
            <CardHeader className="bg-muted/50 border-b border-border px-4 md:px-6 py-4">
              <CardTitle className="text-base font-bold text-foreground">Pending Setup</CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <div className="space-y-2">
                {menu.filter(m => !m.hasRecipe).length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">All items have recipes!</p>
                ) : (
                  menu.filter(m => !m.hasRecipe).map(m => (
                    <div
                      key={m.id}
                      className={`flex items-center justify-between p-2 rounded-md border hover:bg-muted/50 cursor-pointer transition-colors ${selectedMenuId === m.id ? 'bg-muted border-primary/50' : ''}`}
                      onClick={() => setSelectedMenuId(m.id)}
                    >
                      <div className="text-sm">{m.name}</div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RecipeManagementTab;
