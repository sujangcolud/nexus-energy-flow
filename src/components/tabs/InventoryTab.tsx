import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { handleSupabaseError } from "@/utils/supabaseErrorHandler";
import {
  Package,
  Plus,
  Minus,
  AlertTriangle,
  CheckCircle,
  TrendingDown,
  TrendingUp,
  Archive,
  RefreshCw,
  Calendar,
  DollarSign,
  Hash,
  MapPin,
  Building2,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";

interface InventoryItem {
  id: string;
  item_name: string;
  description: string | null;
  category: string | null;
  quantity: number;
  unit_cost: number | null;
  total_cost: number | null;
  supplier: string | null;
  purchase_date: string | null;
  expiry_date: string | null;
  location: string | null;
  minimum_stock: number;
  is_active: boolean;
  expense_id: string | null;
  created_at: string;
  updated_at: string;
}

interface InventoryTransaction {
  id: string;
  inventory_id: string;
  transaction_type: string;
  quantity: number;
  unit_cost: number | null;
  total_cost: number | null;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  transaction_date: string;
  created_at: string;
}

const InventoryTab = () => {
  const { user } = useAuth();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [stockOutDialogOpen, setStockOutDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [stockOutForm, setStockOutForm] = useState({
    quantity: "",
    notes: "",
  });
  const [manualAddDialogOpen, setManualAddDialogOpen] = useState(false);
  const [manualItemForm, setManualItemForm] = useState({
    item_name: "",
    description: "",
    category: "",
    quantity: "",
    unit_cost: "",
    supplier: "",
    location: "",
    minimum_stock: "",
    expiry_date: "",
  });

  useEffect(() => {
    if (user) {
      fetchInventory();
      fetchTransactions();
    }
  }, [user]);

  const fetchInventory = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("inventory")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("item_name");

      if (error) throw error;
      setInventory(data || []);
    } catch (error) {
      logError("fetching inventory", error);

      // Handle auth-specific errors first
      handleSupabaseError(error);

      // Handle schema errors gracefully
      if (
        error?.code === "PGRST204" ||
        error?.code === "PGRST200" ||
        extractErrorMessage(error).includes("schema cache") ||
        extractErrorMessage(error).includes("table") ||
        extractErrorMessage(error).includes("relation")
      ) {
        console.warn("Inventory table not found, setting empty inventory");
        setInventory([]);
        toast.error("Inventory table not found. Please contact administrator.");
      } else if (
        !error?.message?.includes("refresh_token_not_found") &&
        !error?.message?.includes("Invalid Refresh Token")
      ) {
        const errorMessage = extractErrorMessage(error);
        toast.error(`Error fetching inventory: ${errorMessage}`);
      }
    }
  };

  const fetchTransactions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("inventory_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      const errorMessage =
        error?.message || error?.details || "Failed to load transactions";
      toast.error(`Error fetching transactions: ${errorMessage}`);
    } finally {
      setLoading(false);
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
        user_id: user!.id,
        inventory_id: selectedItem.id,
        transaction_type: "stock_out",
        quantity: -quantity, // Negative for stock out
        notes: stockOutForm.notes,
        transaction_date: new Date().toISOString().split("T")[0],
      });

      if (error) throw error;

      toast.success("Stock out recorded successfully!");
      setStockOutDialogOpen(false);
      setStockOutForm({ quantity: "", notes: "" });
      fetchInventory();
      fetchTransactions();
    } catch (error) {
      console.error("Error recording stock out:", error);
      const errorMessage =
        error?.message || error?.details || "Failed to record stock out";
      toast.error(`Error recording stock out: ${errorMessage}`);
    }
  };

  const addManualItem = async () => {
    if (!manualItemForm.item_name || !manualItemForm.quantity) {
      toast.error("Please fill in required fields");
      return;
    }

    try {
      const quantity = parseFloat(manualItemForm.quantity);
      const unitCost = parseFloat(manualItemForm.unit_cost) || 0;
      const minimumStock = parseFloat(manualItemForm.minimum_stock) || 0;

      const { data: inventoryData, error: inventoryError } = await supabase
        .from("inventory")
        .insert({
          user_id: user!.id,
          item_name: manualItemForm.item_name,
          description: manualItemForm.description || null,
          category: manualItemForm.category || null,
          quantity: quantity,
          unit_cost: unitCost,
          total_cost: quantity * unitCost,
          supplier: manualItemForm.supplier || null,
          location: manualItemForm.location || null,
          minimum_stock: minimumStock,
          purchase_date: new Date().toISOString().split("T")[0],
          expiry_date: manualItemForm.expiry_date || null,
        })
        .select()
        .single();

      if (inventoryError) throw inventoryError;

      // Create stock in transaction
      const { error: transactionError } = await supabase
        .from("inventory_transactions")
        .insert({
          user_id: user!.id,
          inventory_id: inventoryData.id,
          transaction_type: "stock_in",
          quantity: quantity,
          unit_cost: unitCost,
          total_cost: quantity * unitCost,
          reference_type: "manual",
          notes: "Manual stock addition",
          transaction_date: new Date().toISOString().split("T")[0],
        });

      if (transactionError) throw transactionError;

      toast.success("Inventory item added successfully!");
      setManualAddDialogOpen(false);
      setManualItemForm({
        item_name: "",
        description: "",
        category: "",
        quantity: "",
        unit_cost: "",
        supplier: "",
        location: "",
        minimum_stock: "",
        expiry_date: "",
      });
      fetchInventory();
      fetchTransactions();
    } catch (error) {
      console.error("Error adding manual item:", error);
      const errorMessage =
        error?.message || error?.details || "Failed to add inventory item";
      toast.error(`Error adding manual item: ${errorMessage}`);
    }
  };

  const getStockStatus = (item: InventoryItem) => {
    if (item.quantity <= 0)
      return {
        status: "out-of-stock",
        color: "text-red-600",
        icon: AlertTriangle,
      };
    if (item.quantity <= item.minimum_stock)
      return {
        status: "low-stock",
        color: "text-yellow-600",
        icon: TrendingDown,
      };
    return { status: "in-stock", color: "text-green-600", icon: CheckCircle };
  };

  const totalInventoryValue = inventory.reduce(
    (sum, item) => sum + (item.total_cost || 0),
    0,
  );
  const lowStockItems = inventory.filter(
    (item) => item.quantity <= item.minimum_stock,
  );
  const outOfStockItems = inventory.filter((item) => item.quantity <= 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-gradient-to-r from-green-600 to-blue-600 rounded-full animate-spin mx-auto flex items-center justify-center">
            <Package className="h-8 w-8 text-white" />
          </div>
          <p className="text-xl font-semibold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
            Loading Inventory...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-64 h-64 bg-gradient-to-r from-green-400/20 to-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute bottom-20 right-20 w-80 h-80 bg-gradient-to-r from-blue-400/20 to-purple-500/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
      </div>

      <div className="relative z-10 space-y-8 p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-green-500 to-blue-600 text-white shadow-xl animate-pulse">
              <Package className="h-8 w-8" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
              Inventory Management
            </h1>
            <Sparkles className="h-8 w-8 text-blue-500 animate-bounce" />
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Track your inventory with auto-population from expenses and manual
            management
          </p>
        </div>

        {/* Inventory Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">
                    Total Items
                  </p>
                  <p className="text-2xl font-bold text-green-800">
                    {inventory.length}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl text-white">
                  <Package className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">
                    Total Value
                  </p>
                  <p className="text-2xl font-bold text-blue-800">
                    NPR {totalInventoryValue.toFixed(2)}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl text-white">
                  <DollarSign className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-600 font-medium">
                    Low Stock
                  </p>
                  <p className="text-2xl font-bold text-yellow-800">
                    {lowStockItems.length}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl text-white">
                  <TrendingDown className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-pink-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600 font-medium">
                    Out of Stock
                  </p>
                  <p className="text-2xl font-bold text-red-800">
                    {outOfStockItems.length}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl text-white">
                  <AlertTriangle className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end mb-6">
          <Button
            onClick={() => setManualAddDialogOpen(true)}
            className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Manual Item
          </Button>
        </div>

        {/* Inventory Table */}
        <Card className="bg-gradient-to-br from-white/90 to-gray-50/90 backdrop-blur-sm border-0 shadow-2xl">
          <CardHeader className="bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-white/20 rounded-lg">
                <Package className="h-6 w-6" />
              </div>
              Current Inventory
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-gray-50 to-blue-50">
                    <TableHead className="font-semibold text-gray-700">
                      Item Name
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700">
                      Category
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700">
                      Quantity
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700">
                      Unit Cost
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700">
                      Total Value
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700">
                      Status
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700">
                      Location
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.map((item, index) => {
                    const stockStatus = getStockStatus(item);
                    const StatusIcon = stockStatus.icon;
                    return (
                      <TableRow
                        key={item.id}
                        className="hover:bg-gradient-to-r hover:from-green-50 hover:to-blue-50 transition-all duration-200"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium text-gray-800">
                              {item.item_name}
                            </p>
                            {item.description && (
                              <p className="text-sm text-gray-600">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.category && (
                            <Badge
                              variant="outline"
                              className="bg-blue-50 border-blue-200"
                            >
                              {item.category}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">
                              {item.quantity}
                            </span>
                            {item.minimum_stock > 0 && (
                              <span className="text-xs text-gray-500">
                                (Min: {item.minimum_stock})
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          NPR {(item.unit_cost || 0).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <span className="font-bold text-green-600">
                            NPR {(item.total_cost || 0).toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <StatusIcon
                              className={`h-4 w-4 ${stockStatus.color}`}
                            />
                            <span
                              className={`text-sm font-medium ${stockStatus.color}`}
                            >
                              {stockStatus.status.replace("-", " ")}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-gray-500" />
                              <span className="text-sm text-gray-600">
                                {item.location}
                              </span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            onClick={() => {
                              setSelectedItem(item);
                              setStockOutDialogOpen(true);
                            }}
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            disabled={item.quantity <= 0}
                          >
                            <Minus className="h-4 w-4 mr-1" />
                            Stock Out
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="bg-gradient-to-br from-white/90 to-purple-50/90 backdrop-blur-sm border-0 shadow-2xl">
          <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-white/20 rounded-lg">
                <RefreshCw className="h-6 w-6" />
              </div>
              Recent Transactions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4 max-h-64 overflow-y-auto">
              {transactions.map((transaction, index) => {
                const isStockIn = transaction.transaction_type === "stock_in";
                return (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-white to-purple-50 rounded-lg border border-purple-100"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg ${isStockIn ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}
                      >
                        {isStockIn ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : (
                          <TrendingDown className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">
                          {transaction.transaction_type
                            .replace("_", " ")
                            .toUpperCase()}
                        </p>
                        <p className="text-sm text-gray-600">
                          Qty: {Math.abs(transaction.quantity)} •{" "}
                          {format(
                            new Date(transaction.transaction_date),
                            "MMM dd, yyyy",
                          )}
                        </p>
                        {transaction.notes && (
                          <p className="text-xs text-gray-500">
                            {transaction.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={isStockIn ? "default" : "destructive"}>
                        {isStockIn ? "+" : ""}
                        {transaction.quantity}
                      </Badge>
                      {transaction.total_cost && (
                        <p className="text-sm text-gray-600 mt-1">
                          NPR {transaction.total_cost.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Stock Out Dialog */}
        <Dialog open={stockOutDialogOpen} onOpenChange={setStockOutDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Stock Out Item</DialogTitle>
            </DialogHeader>
            {selectedItem && (
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-800 mb-2">
                    {selectedItem.item_name}
                  </h4>
                  <p className="text-sm text-gray-600">
                    Available Quantity: {selectedItem.quantity}
                  </p>
                </div>
                <div>
                  <Label htmlFor="quantity">Quantity to Stock Out *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    max={selectedItem.quantity}
                    min="1"
                    value={stockOutForm.quantity}
                    onChange={(e) =>
                      setStockOutForm((prev) => ({
                        ...prev,
                        quantity: e.target.value,
                      }))
                    }
                    placeholder="Enter quantity"
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={stockOutForm.notes}
                    onChange={(e) =>
                      setStockOutForm((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    placeholder="Enter reason for stock out"
                    rows={3}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setStockOutDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={stockOut} disabled={!stockOutForm.quantity}>
                Record Stock Out
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Manual Add Item Dialog */}
        <Dialog
          open={manualAddDialogOpen}
          onOpenChange={setManualAddDialogOpen}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Manual Inventory Item</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="item_name">Item Name *</Label>
                <Input
                  id="item_name"
                  value={manualItemForm.item_name}
                  onChange={(e) =>
                    setManualItemForm((prev) => ({
                      ...prev,
                      item_name: e.target.value,
                    }))
                  }
                  placeholder="Enter item name"
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={manualItemForm.category}
                  onChange={(e) =>
                    setManualItemForm((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                  placeholder="Enter category"
                />
              </div>
              <div>
                <Label htmlFor="quantity">Initial Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0"
                  value={manualItemForm.quantity}
                  onChange={(e) =>
                    setManualItemForm((prev) => ({
                      ...prev,
                      quantity: e.target.value,
                    }))
                  }
                  placeholder="Enter quantity"
                />
              </div>
              <div>
                <Label htmlFor="unit_cost">Unit Cost</Label>
                <Input
                  id="unit_cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={manualItemForm.unit_cost}
                  onChange={(e) =>
                    setManualItemForm((prev) => ({
                      ...prev,
                      unit_cost: e.target.value,
                    }))
                  }
                  placeholder="Enter unit cost"
                />
              </div>
              <div>
                <Label htmlFor="supplier">Supplier</Label>
                <Input
                  id="supplier"
                  value={manualItemForm.supplier}
                  onChange={(e) =>
                    setManualItemForm((prev) => ({
                      ...prev,
                      supplier: e.target.value,
                    }))
                  }
                  placeholder="Enter supplier name"
                />
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={manualItemForm.location}
                  onChange={(e) =>
                    setManualItemForm((prev) => ({
                      ...prev,
                      location: e.target.value,
                    }))
                  }
                  placeholder="Enter storage location"
                />
              </div>
              <div>
                <Label htmlFor="minimum_stock">Minimum Stock</Label>
                <Input
                  id="minimum_stock"
                  type="number"
                  min="0"
                  value={manualItemForm.minimum_stock}
                  onChange={(e) =>
                    setManualItemForm((prev) => ({
                      ...prev,
                      minimum_stock: e.target.value,
                    }))
                  }
                  placeholder="Enter minimum stock level"
                />
              </div>
              <div>
                <Label htmlFor="expiry_date">Expiry Date</Label>
                <Input
                  id="expiry_date"
                  type="date"
                  value={manualItemForm.expiry_date}
                  onChange={(e) =>
                    setManualItemForm((prev) => ({
                      ...prev,
                      expiry_date: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={manualItemForm.description}
                  onChange={(e) =>
                    setManualItemForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Enter item description"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setManualAddDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={addManualItem}
                disabled={!manualItemForm.item_name || !manualItemForm.quantity}
              >
                Add Item
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default InventoryTab;
