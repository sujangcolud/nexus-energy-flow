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
import { Package, Plus, Minus, AlertTriangle, CheckCircle, Edit } from "lucide-react";
import { format } from "date-fns";
import MultiInventoryEntry from "../MultiInventoryEntry";
import TransactionDatePicker from "@/components/ui/transaction-date-picker";

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
    base_unit: "pcs", unit_cost: "", supplier: "", location: "",
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
        category: manualItemForm.category || null, quantity,
        base_unit: manualItemForm.base_unit,
        unit_cost: unitCost, total_cost: quantity * unitCost,
        supplier: manualItemForm.supplier || null, location: manualItemForm.location || null,
        minimum_stock: parseFloat(manualItemForm.minimum_stock) || 0, purchase_date: new Date().toISOString().split("T")[0],
        expiry_date: manualItemForm.expiry_date || null,
      }).select().single();
      if (inventoryError) throw inventoryError;
      await supabase.from("inventory_transactions").insert({
        user_id: user!.id, inventory_id: inventoryData.id, transaction_type: "stock_in",
        quantity, unit_cost: unitCost, total_cost: quantity * unitCost, reference_type: "manual",
        notes: "Manual stock addition", transaction_date: new Date().toISOString().split("T")[0],
      });
      toast.success("Item added!");
      setManualAddDialogOpen(false);
      setManualItemForm({ item_name: "", description: "", category: "", quantity: "", base_unit: "pcs", unit_cost: "", supplier: "", location: "", minimum_stock: "", expiry_date: "" });
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
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <Dialog open={stockOutDialogOpen} onOpenChange={setStockOutDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Stock Out - {selectedItem?.item_name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Quantity (in {selectedItem?.base_unit}) (Max: {selectedItem?.current_stock_base ?? selectedItem?.quantity})</Label><Input type="number" value={stockOutForm.quantity} onChange={(e) => setStockOutForm({ ...stockOutForm, quantity: e.target.value })} /></div>
            <div><Label>Notes</Label><Input value={stockOutForm.notes} onChange={(e) => setStockOutForm({ ...stockOutForm, notes: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={stockOut}>Record Stock Out</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={conversionDialogOpen} onOpenChange={setConversionDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Unit Conversions - {selectedItem?.item_name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Base Unit: <strong>{selectedItem?.base_unit}</strong>
            </div>
            <div className="space-y-2">
              <Label>Existing Conversions</Label>
              <div className="border rounded-md divide-y">
                {selectedItem?.unit_conversions?.map((conv) => (
                  <div key={conv.id} className="p-2 flex justify-between items-center text-sm">
                    <span>1 {conv.unit_name} = {conv.conversion_to_base} {selectedItem?.base_unit}</span>
                    <Button variant="ghost" size="sm" onClick={() => deleteConversion(conv.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                ))}
                {(!selectedItem?.unit_conversions || selectedItem.unit_conversions.length === 0) && (
                  <div className="p-4 text-center text-muted-foreground text-xs">No custom conversions defined</div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Unit Name</Label>
                <Input placeholder="e.g. Box" value={newConversion.unit_name} onChange={(e) => setNewConversion({ ...newConversion, unit_name: e.target.value })} />
              </div>
              <div>
                <Label>Factor to {selectedItem?.base_unit}</Label>
                <Input type="number" placeholder="e.g. 1000" value={newConversion.conversion_to_base} onChange={(e) => setNewConversion({ ...newConversion, conversion_to_base: e.target.value })} />
              </div>
            </div>
            <Button className="w-full" onClick={addConversion}><Plus className="h-4 w-4 mr-2" /> Add Conversion</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Edit Inventory Item</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Item Name *</Label><Input value={editForm.item_name} onChange={(e) => setEditForm({ ...editForm, item_name: e.target.value })} /></div>
            <div>
              <Label>Category</Label>
              <Select
                value={editForm.category || ""}
                onValueChange={(value) => setEditForm({ ...editForm, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Unit Category</Label>
              <Select
                value={editForm.unit_category || ""}
                onValueChange={(value: any) => setEditForm({ ...editForm, unit_category: value })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weight">Weight (gm, kg)</SelectItem>
                  <SelectItem value="volume">Volume (ml, l)</SelectItem>
                  <SelectItem value="count">Count (pcs)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Base Unit *</Label>
              <Select
                value={editForm.base_unit}
                onValueChange={(value) => setEditForm({ ...editForm, base_unit: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_OPTIONS.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Unit Cost</Label><Input type="number" value={editForm.unit_cost} onChange={(e) => setEditForm({ ...editForm, unit_cost: e.target.value })} /></div>
            <div><Label>Supplier</Label><Input value={editForm.supplier} onChange={(e) => setEditForm({ ...editForm, supplier: e.target.value })} /></div>
            <div><Label>Location</Label><Input value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} /></div>
            <div><Label>Min Stock</Label><Input type="number" value={editForm.minimum_stock} onChange={(e) => setEditForm({ ...editForm, minimum_stock: e.target.value })} /></div>
            <div>
              <TransactionDatePicker
                label="Expiry Date"
                selectedDate={editForm.expiry_date}
                onDateChange={(d) => setEditForm({ ...editForm, expiry_date: d })}
                allowFutureDates={true}
                showBackdateWarning={false}
              />
            </div>
            <div className="col-span-2"><Label>Description</Label><Input value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={updateItem}>Update Item</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={manualAddDialogOpen} onOpenChange={setManualAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Add Inventory Item</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Item Name *</Label><Input value={manualItemForm.item_name} onChange={(e) => setManualItemForm({ ...manualItemForm, item_name: e.target.value })} /></div>
            <div>
              <Label>Category</Label>
              <Select
                value={manualItemForm.category}
                onValueChange={(value) => setManualItemForm({ ...manualItemForm, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Quantity *</Label><Input type="number" value={manualItemForm.quantity} onChange={(e) => setManualItemForm({ ...manualItemForm, quantity: e.target.value })} /></div>
            <div>
              <Label>Base Unit *</Label>
              <Select
                value={manualItemForm.base_unit}
                onValueChange={(value) => setManualItemForm({ ...manualItemForm, base_unit: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_OPTIONS.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Unit Cost</Label><Input type="number" value={manualItemForm.unit_cost} onChange={(e) => setManualItemForm({ ...manualItemForm, unit_cost: e.target.value })} /></div>
            <div><Label>Supplier</Label><Input value={manualItemForm.supplier} onChange={(e) => setManualItemForm({ ...manualItemForm, supplier: e.target.value })} /></div>
            <div><Label>Location</Label><Input value={manualItemForm.location} onChange={(e) => setManualItemForm({ ...manualItemForm, location: e.target.value })} /></div>
            <div><Label>Min Stock</Label><Input type="number" value={manualItemForm.minimum_stock} onChange={(e) => setManualItemForm({ ...manualItemForm, minimum_stock: e.target.value })} /></div>
            <div>
              <TransactionDatePicker
                label="Expiry Date"
                selectedDate={manualItemForm.expiry_date}
                onDateChange={(d) => setManualItemForm({ ...manualItemForm, expiry_date: d })}
                allowFutureDates={true}
                showBackdateWarning={false}
              />
            </div>
          </div>
          <DialogFooter><Button onClick={addManualItem}>Add Item</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-lg font-semibold text-foreground">Inventory</h1>
          </div>
          <div className="flex items-center gap-2">
            <MultiInventoryEntry
              inventory={inventory}
              categories={categories}
              onComplete={fetchInventory}
            />
            <Button onClick={() => setManualAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card border"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Items</p><p className="text-lg font-bold text-foreground">{inventory.length}</p></CardContent></Card>
          <Card className="bg-card border"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Value</p><p className="text-lg font-bold text-foreground">NPR {totalValue.toFixed(2)}</p></CardContent></Card>
          <Card className="bg-card border"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Low Stock</p><p className="text-lg font-bold text-foreground">{lowStock.length}</p></CardContent></Card>
          <Card className="bg-card border"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Out of Stock</p><p className="text-lg font-bold text-foreground">{inventory.filter(i => i.quantity <= 0).length}</p></CardContent></Card>
        </div>

        <Card className="bg-card border">
          <CardHeader className="pb-3"><CardTitle className="text-base">Inventory List</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Stock (Base)</TableHead>
                  <TableHead>Base Unit</TableHead>
                  <TableHead className="text-right">Avg Cost/Base</TableHead>
                  <TableHead className="text-right">Valuation</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventory.map((item) => {
                  const status = getStockStatus(item);
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.item_name}</TableCell>
                      <TableCell>{item.category || "-"}</TableCell>
                      <TableCell className="font-bold text-right">{(item.current_stock_base ?? 0).toFixed(2)}</TableCell>
                      <TableCell>{item.base_unit}</TableCell>
                      <TableCell className="text-right">NPR {(item.average_cost_per_base_unit ?? item.unit_cost ?? 0).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-semibold">NPR {((item.current_stock_base ?? 0) * (item.average_cost_per_base_unit ?? item.unit_cost ?? 0)).toFixed(2)}</TableCell>
                      <TableCell><Badge variant={status.status === "in-stock" ? "default" : "secondary"}>{status.status}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" title="Unit Conversions" onClick={() => { setSelectedItem(item); setConversionDialogOpen(true); }}>
                             <Layers className="h-3 w-3" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => {
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
                            <Edit className="h-3 w-3 mr-1" />Edit
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => { setSelectedItem(item); setStockOutDialogOpen(true); }}>
                            <Minus className="h-3 w-3 mr-1" />Stock Out
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InventoryTab;
