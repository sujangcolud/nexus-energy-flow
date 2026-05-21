import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { extractErrorMessage, logError } from "@/utils/errorHandling";
import { Package, Plus, Minus, AlertTriangle, CheckCircle, Edit, Trash2, Layers } from "lucide-react";
import { format } from "date-fns";
import MultiInventoryEntry from "../MultiInventoryEntry";
import TransactionDatePicker from "@/components/ui/transaction-date-picker";
import MobileTable from "@/components/ui/mobile-table";

interface Category {
  id: string;
  name: string;
}

interface UnitConversion {
  id: string;
  unit_name: string;
  conversion_to_base: number;
}

interface InventoryItem {
  id: string;
  item_name: string;
  description: string | null;
  category: string | null;
  quantity: number;
  current_stock_base: number;
  base_unit: string;
  unit_category: "weight" | "volume" | "count" | null;
  average_cost_per_base_unit: number | null;
  unit_cost: number | null;
  total_cost: number | null;
  supplier: string | null;
  purchase_date: string | null;
  expiry_date: string | null;
  location: string | null;
  minimum_stock: number;
  is_active: boolean;
  created_at: string;
  unit_conversions?: UnitConversion[];
}

const UNIT_OPTIONS = ["g", "kg", "ml", "l", "pcs", "packet", "box", "bottle"];

const InventoryTab = () => {
  const { user } = useAuth();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [stockOutDialogOpen, setStockOutDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [stockOutForm, setStockOutForm] = useState({ quantity: "", notes: "" });
  const [manualAddDialogOpen, setManualAddDialogOpen] = useState(false);
  const [manualItemForm, setManualItemForm] = useState({
    item_name: "", description: "", category: "", quantity: "",
    base_unit: "pcs", unit_category: "count" as any, unit_cost: "", supplier: "", location: "",
    minimum_stock: "", expiry_date: "",
  });
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    id: "", item_name: "", description: "", category: "", quantity: "",
    base_unit: "", unit_category: "count" as any, unit_cost: "", supplier: "", location: "",
    minimum_stock: "", expiry_date: "",
  });
  const [conversionDialogOpen, setConversionDialogOpen] = useState(false);
  const [newConversion, setNewConversion] = useState({ unit_name: "", conversion_to_base: "" });

  useEffect(() => {
    if (user) {
      fetchInventory();
      fetchCategories();

      // Set up real-time subscription for inventory
      const inventoryChannel = supabase
        .channel('inventory-updates')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'inventory' },
          () => {
            fetchInventory();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'inventory_unit_conversions' },
          () => {
            fetchInventory();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(inventoryChannel);
      };
    }
  }, [user]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("expense_categories")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      logError("fetching categories", error);
    }
  };

  const fetchInventory = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("inventory")
        .select(`
          *,
          unit_conversions:inventory_unit_conversions(*)
        `)
        .eq("is_active", true)
        .order("item_name");
      if (error) throw error;
      setInventory(data || []);
    } catch (error) {
      logError("fetching inventory", error);
      toast.error(`Error: ${extractErrorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const addConversion = async () => {
    if (!selectedItem || !newConversion.unit_name || !newConversion.conversion_to_base) return;
    try {
      const { error } = await supabase.from("inventory_unit_conversions").insert({
        inventory_item_id: selectedItem.id,
        unit_name: newConversion.unit_name,
        conversion_to_base: parseFloat(newConversion.conversion_to_base),
      });
      if (error) throw error;
      toast.success("Conversion added!");
      setNewConversion({ unit_name: "", conversion_to_base: "" });
      fetchInventory();
    } catch (error) {
      logError("adding conversion", error);
      toast.error(`Error: ${extractErrorMessage(error)}`);
    }
  };

  const deleteConversion = async (id: string) => {
    try {
      const { error } = await supabase.from("inventory_unit_conversions").delete().eq("id", id);
      if (error) throw error;
      toast.success("Conversion deleted!");
      fetchInventory();
    } catch (error) {
      logError("deleting conversion", error);
      toast.error(`Error: ${extractErrorMessage(error)}`);
    }
  };

  const stockOut = async () => {
    if (!selectedItem || !stockOutForm.quantity) return;
    const quantity = parseFloat(stockOutForm.quantity);
    if (quantity <= 0 || quantity > selectedItem.quantity) {
      toast.error("Invalid quantity");
      return;
    }
    try {
      const { error } = await supabase.from("inventory_transactions").insert({
        user_id: user!.id, inventory_id: selectedItem.id, transaction_type: "stock_out",
        quantity: -quantity, notes: stockOutForm.notes, transaction_date: new Date().toISOString().split("T")[0],
      });
      if (error) throw error;
      toast.success("Stock out recorded!");
      setStockOutDialogOpen(false);
      setStockOutForm({ quantity: "", notes: "" });
      fetchInventory();
    } catch (error) {
      logError("stock out", error);
      toast.error(`Error: ${extractErrorMessage(error)}`);
    }
  };

  const updateItem = async () => {
    if (!editForm.item_name || !editForm.base_unit) {
      toast.error("Please fill required fields");
      return;
    }
    try {
      const unitCost = parseFloat(editForm.unit_cost) || 0;
      const { error } = await supabase
        .from("inventory")
        .update({
          item_name: editForm.item_name,
          description: editForm.description || null,
          category: editForm.category || null,
          base_unit: editForm.base_unit,
          unit_category: editForm.unit_category,
          unit_cost: unitCost,
          supplier: editForm.supplier || null,
          location: editForm.location || null,
          minimum_stock: parseFloat(editForm.minimum_stock) || 0,
          expiry_date: editForm.expiry_date || null,
        })
        .eq("id", editForm.id);

      if (error) throw error;
      toast.success("Item updated!");
      setIsEditDialogOpen(false);
      fetchInventory();
    } catch (error) {
      logError("updating item", error);
      toast.error(`Error: ${extractErrorMessage(error)}`);
    }
  };

  const addManualItem = async () => {
    if (!manualItemForm.item_name || !manualItemForm.quantity || !manualItemForm.base_unit) {
      toast.error("Please fill required fields");
      return;
    }
    try {
      const quantity = parseFloat(manualItemForm.quantity);
      const unitCost = parseFloat(manualItemForm.unit_cost) || 0;
      const { data: inventoryData, error: inventoryError } = await supabase.from("inventory").insert({
        user_id: user!.id, item_name: manualItemForm.item_name, description: manualItemForm.description || null,
        category: manualItemForm.category || null,
        base_unit: manualItemForm.base_unit,
        unit_category: manualItemForm.unit_category,
        unit_cost: unitCost,
        supplier: manualItemForm.supplier || null, location: manualItemForm.location || null,
        minimum_stock: parseFloat(manualItemForm.minimum_stock) || 0, purchase_date: new Date().toISOString().split("T")[0],
        expiry_date: manualItemForm.expiry_date || null,
      }).select().single();

      if (inventoryError) throw inventoryError;

      // Log authoritative movement
      await supabase.from("inventory_movements").insert({
        user_id: user!.id,
        inventory_item_id: inventoryData.id,
        movement_type: "opening_stock",
        quantity_base: quantity,
        unit_cost_base: unitCost,
        reference_type: "manual",
        created_at: new Date().toISOString(),
      });

      toast.success("Item added!");
      setManualAddDialogOpen(false);
      setManualItemForm({ item_name: "", description: "", category: "", quantity: "", base_unit: "pcs", unit_category: "count", unit_cost: "", supplier: "", location: "", minimum_stock: "", expiry_date: "" });
      fetchInventory();
    } catch (error) {
      logError("adding item", error);
      toast.error(`Error: ${extractErrorMessage(error)}`);
    }
  };

  const getStockStatus = (item: InventoryItem) => {
    const qty = item.current_stock_base ?? item.quantity;
    if (qty <= 0) return { status: "out-of-stock", color: "text-destructive", icon: AlertTriangle };
    if (qty <= item.minimum_stock) return { status: "low-stock", color: "text-muted-foreground", icon: AlertTriangle };
    return { status: "in-stock", color: "text-foreground", icon: CheckCircle };
  };

  const totalValue = inventory.reduce((sum, item) => sum + ((item.current_stock_base ?? 0) * (item.average_cost_per_base_unit ?? item.unit_cost ?? 0)), 0);
  const lowStock = inventory.filter((item) => (item.current_stock_base ?? item.quantity) <= item.minimum_stock);

  if (loading) {
    return <div className="p-6 animate-pulse"><div className="h-8 bg-muted rounded w-1/4 mb-4"></div><div className="h-64 bg-muted rounded"></div></div>;
  }

  return (
    <div className="min-h-screen bg-background p-2 md:p-6 pb-24 md:pb-6">
      <Dialog open={stockOutDialogOpen} onOpenChange={setStockOutDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-4 md:p-6 rounded-3xl" aria-describedby={undefined}>
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold text-primary">Stock Out - {selectedItem?.item_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quantity (in {selectedItem?.base_unit})</Label>
              <div className="flex flex-col gap-1">
                <Input type="number" value={stockOutForm.quantity} onChange={(e) => setStockOutForm({ ...stockOutForm, quantity: e.target.value })} className="h-11 rounded-xl" />
                <span className="text-[10px] text-muted-foreground italic">Available: {selectedItem?.current_stock_base ?? selectedItem?.quantity} {selectedItem?.base_unit}</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Notes</Label>
              <Input value={stockOutForm.notes} onChange={(e) => setStockOutForm({ ...stockOutForm, notes: e.target.value })} className="h-11 rounded-xl" />
            </div>
          </div>
          <DialogFooter className="pt-2"><Button onClick={stockOut} className="w-full h-12 rounded-xl text-lg font-bold shadow-lg shadow-primary/20">Record Stock Out</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={conversionDialogOpen} onOpenChange={setConversionDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-4 md:p-6 rounded-3xl" aria-describedby={undefined}>
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold text-primary">Unit Conversions</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="p-3 bg-primary/5 rounded-2xl border border-primary/10 flex justify-between items-center">
              <span className="text-sm font-bold text-primary">{selectedItem?.item_name}</span>
              <Badge variant="outline" className="rounded-lg">Base: {selectedItem?.base_unit}</Badge>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Existing Conversions</Label>
              <div className="border rounded-2xl divide-y overflow-hidden bg-slate-50/50">
                {selectedItem?.unit_conversions?.map((conv) => (
                  <div key={conv.id} className="p-3 flex justify-between items-center text-sm">
                    <span className="font-medium text-slate-700">1 {conv.unit_name} = {conv.conversion_to_base} {selectedItem?.base_unit}</span>
                    <Button variant="ghost" size="sm" onClick={() => deleteConversion(conv.id)} className="h-8 w-8 p-0 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
                {(!selectedItem?.unit_conversions || selectedItem.unit_conversions.length === 0) && (
                  <div className="p-6 text-center text-muted-foreground text-xs italic">No custom conversions defined</div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Unit Name</Label>
                <Input placeholder="e.g. Box" value={newConversion.unit_name} onChange={(e) => setNewConversion({ ...newConversion, unit_name: e.target.value })} className="h-11 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Factor</Label>
                <Input type="number" placeholder="to base" value={newConversion.conversion_to_base} onChange={(e) => setNewConversion({ ...newConversion, conversion_to_base: e.target.value })} className="h-11 rounded-xl" />
              </div>
            </div>
            <Button className="w-full h-11 rounded-xl font-bold shadow-sm" onClick={addConversion}><Plus className="h-4 w-4 mr-2" /> Add Conversion</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 md:p-6 rounded-3xl" aria-describedby={undefined}>
          <DialogHeader className="mb-4"><DialogTitle className="text-xl font-bold text-primary">Edit Inventory Item</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Item Name *</Label><Input value={editForm.item_name} onChange={(e) => setEditForm({ ...editForm, item_name: e.target.value })} className="h-11 rounded-xl" /></div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Category</Label>
              <Select
                value={editForm.category || ""}
                onValueChange={(value) => setEditForm({ ...editForm, category: value })}
              >
                <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Unit Category</Label>
              <Select
                value={editForm.unit_category || ""}
                onValueChange={(value: any) => setEditForm({ ...editForm, unit_category: value })}
              >
                <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weight">Weight (gm, kg)</SelectItem>
                  <SelectItem value="volume">Volume (ml, l)</SelectItem>
                  <SelectItem value="count">Count (pcs)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Base Unit *</Label>
              <Select
                value={editForm.base_unit}
                onValueChange={(value) => setEditForm({ ...editForm, base_unit: value })}
              >
                <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select unit" /></SelectTrigger>
                <SelectContent>
                  {UNIT_OPTIONS.map((unit) => (
                    <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Unit Cost</Label><Input type="number" value={editForm.unit_cost} onChange={(e) => setEditForm({ ...editForm, unit_cost: e.target.value })} className="h-11 rounded-xl" /></div>
            <div className="space-y-1.5"><Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Supplier</Label><Input value={editForm.supplier} onChange={(e) => setEditForm({ ...editForm, supplier: e.target.value })} className="h-11 rounded-xl" /></div>
            <div className="space-y-1.5"><Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Location</Label><Input value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} className="h-11 rounded-xl" /></div>
            <div className="space-y-1.5"><Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Min Stock</Label><Input type="number" value={editForm.minimum_stock} onChange={(e) => setEditForm({ ...editForm, minimum_stock: e.target.value })} className="h-11 rounded-xl" /></div>
            <div className="space-y-1.5">
              <TransactionDatePicker
                label="Expiry Date"
                selectedDate={editForm.expiry_date}
                onDateChange={(d) => setEditForm({ ...editForm, expiry_date: d })}
                allowFutureDates={true}
                showBackdateWarning={false}
              />
            </div>
            <div className="md:col-span-2 space-y-1.5"><Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</Label><Input value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="h-11 rounded-xl" /></div>
          </div>
          <DialogFooter className="pt-2"><Button onClick={updateItem} className="w-full h-12 rounded-xl text-lg font-bold shadow-lg shadow-primary/20">Update Item</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={manualAddDialogOpen} onOpenChange={setManualAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 md:p-6 rounded-3xl" aria-describedby={undefined}>
          <DialogHeader className="mb-4"><DialogTitle className="text-xl font-bold text-primary">Add Inventory Item</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Item Name *</Label><Input value={manualItemForm.item_name} onChange={(e) => setManualItemForm({ ...manualItemForm, item_name: e.target.value })} className="h-11 rounded-xl" /></div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Category</Label>
              <Select
                value={manualItemForm.category}
                onValueChange={(value) => setManualItemForm({ ...manualItemForm, category: value })}
              >
                <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Opening Stock *</Label><Input type="number" value={manualItemForm.quantity} onChange={(e) => setManualItemForm({ ...manualItemForm, quantity: e.target.value })} className="h-11 rounded-xl" /></div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Unit Category</Label>
              <Select
                value={manualItemForm.unit_category || ""}
                onValueChange={(value: any) => setManualItemForm({ ...manualItemForm, unit_category: value })}
              >
                <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weight">Weight (gm, kg)</SelectItem>
                  <SelectItem value="volume">Volume (ml, l)</SelectItem>
                  <SelectItem value="count">Count (pcs)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Base Unit *</Label>
              <Select
                value={manualItemForm.base_unit}
                onValueChange={(value) => setManualItemForm({ ...manualItemForm, base_unit: value })}
              >
                <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select unit" /></SelectTrigger>
                <SelectContent>
                  {UNIT_OPTIONS.map((unit) => (
                    <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Unit Cost</Label><Input type="number" value={manualItemForm.unit_cost} onChange={(e) => setManualItemForm({ ...manualItemForm, unit_cost: e.target.value })} className="h-11 rounded-xl" /></div>
            <div className="space-y-1.5"><Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Supplier</Label><Input value={manualItemForm.supplier} onChange={(e) => setManualItemForm({ ...manualItemForm, supplier: e.target.value })} className="h-11 rounded-xl" /></div>
            <div className="space-y-1.5"><Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Location</Label><Input value={manualItemForm.location} onChange={(e) => setManualItemForm({ ...manualItemForm, location: e.target.value })} className="h-11 rounded-xl" /></div>
            <div className="space-y-1.5"><Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Min Stock</Label><Input type="number" value={manualItemForm.minimum_stock} onChange={(e) => setManualItemForm({ ...manualItemForm, minimum_stock: e.target.value })} className="h-11 rounded-xl" /></div>
            <div className="space-y-1.5">
              <TransactionDatePicker
                label="Expiry Date"
                selectedDate={manualItemForm.expiry_date}
                onDateChange={(d) => setManualItemForm({ ...manualItemForm, expiry_date: d })}
                allowFutureDates={true}
                showBackdateWarning={false}
              />
            </div>
          </div>
          <DialogFooter className="pt-2"><Button onClick={addManualItem} className="w-full h-12 rounded-xl text-lg font-bold shadow-lg shadow-primary/20">Add Item</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-4 md:space-y-6">
        <div className="bg-primary/5 p-4 rounded-3xl mb-4 md:mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-xl text-white">
              <Package className="h-5 w-5 md:h-6 md:w-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground">Inventory</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Manage stock levels and unit conversions</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <MultiInventoryEntry
              inventory={inventory}
              categories={categories}
              onComplete={fetchInventory}
              onOpen={() => {
                fetchInventory();
                fetchCategories();
              }}
            />
            <Button onClick={() => setManualAddDialogOpen(true)} className="flex-1 md:flex-none rounded-xl h-11 px-6 font-bold shadow-sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <Card className="rounded-3xl border-none bg-white shadow-sm overflow-hidden">
            <CardContent className="p-4 md:p-6">
              <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Total Items</p>
              <p className="text-sm md:text-xl font-bold text-foreground">{inventory.length}</p>
            </CardContent>
          </Card>
          <Card className="rounded-3xl border-none bg-white shadow-sm overflow-hidden hidden md:block">
            <CardContent className="p-4 md:p-6">
              <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Total Value</p>
              <p className="text-sm md:text-xl font-bold text-primary">NPR {totalValue.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card className="rounded-3xl border-none bg-white shadow-sm overflow-hidden">
            <CardContent className="p-4 md:p-6">
              <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Low Stock</p>
              <p className="text-sm md:text-xl font-bold text-secondary">{lowStock.length}</p>
            </CardContent>
          </Card>
          <Card className="rounded-3xl border-none bg-white shadow-sm overflow-hidden">
            <CardContent className="p-4 md:p-6">
              <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Out of Stock</p>
              <p className="text-sm md:text-xl font-bold text-destructive">{inventory.filter(i => i.quantity <= 0).length}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-4 md:px-6 py-4">
            <CardTitle className="text-base md:text-lg font-bold">Inventory List</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <MobileTable
              columns={[
                {
                  key: "item_name",
                  label: "Item",
                  render: (val, item) => (
                    <div className="flex flex-col">
                      <span className="font-bold">{val}</span>
                      <span className="text-[10px] text-muted-foreground">{item.category || "No Category"}</span>
                    </div>
                  ),
                },
                {
                  key: "current_stock_base",
                  label: "Stock",
                  className: "text-right",
                  render: (val, item) => (
                    <div className="text-right">
                      <span className="font-bold">{(val ?? item.quantity).toFixed(1)}</span>
                      <span className="ml-1 text-[10px]">{item.base_unit}</span>
                    </div>
                  ),
                },
                {
                  key: "valuation",
                  label: "Value",
                  className: "text-right hidden sm:table-cell",
                  render: (_, item) => {
                    const val = (item.current_stock_base ?? item.quantity) * (item.average_cost_per_base_unit ?? item.unit_cost ?? 0);
                    return `रु ${val.toFixed(0)}`;
                  },
                },
                {
                  key: "status",
                  label: "Status",
                  render: (_, item) => {
                    const status = getStockStatus(item);
                    return (
                      <Badge variant={status.status === "in-stock" ? "default" : "secondary"} className="text-[10px] h-5">
                        {status.status}
                      </Badge>
                    );
                  },
                },
                {
                  key: "actions",
                  label: "Actions",
                  className: "text-right",
                  render: (_, item) => (
                    <div className="flex justify-end gap-1">
                      <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => { setSelectedItem(item); setConversionDialogOpen(true); }}>
                        <Layers className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => {
                        setEditForm({
                          id: item.id,
                          item_name: item.item_name,
                          description: item.description || "",
                          category: item.category || "",
                          quantity: (item.current_stock_base ?? 0).toString(),
                          base_unit: item.base_unit || "",
                          unit_category: item.unit_category || "count",
                          unit_cost: (item.unit_cost || 0).toString(),
                          supplier: item.supplier || "",
                          location: item.location || "",
                          minimum_stock: item.minimum_stock.toString(),
                          expiry_date: item.expiry_date || "",
                        });
                        setIsEditDialogOpen(true);
                      }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => { setSelectedItem(item); setStockOutDialogOpen(true); }}>
                        <Minus className="h-4 w-4" />
                      </Button>
                    </div>
                  ),
                },
              ]}
              data={inventory}
              footer={
                <div className="flex justify-between items-center font-bold text-lg">
                  <span>Page Inventory Value</span>
                  <span className="text-primary">
                    रु {totalValue.toFixed(2)}
                  </span>
                </div>
              }
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InventoryTab;
