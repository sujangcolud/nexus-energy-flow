import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
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
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { extractErrorMessage, logError } from "@/utils/errorHandling";
import TransactionDatePicker from "@/components/ui/transaction-date-picker";
import AllTimeTotalDisplay from "@/components/AllTimeTotalDisplay";
import RecordAttachments from "@/components/RecordAttachments";
import {
  Receipt,
  Calendar as CalendarIcon,
  TrendingDown,
  DollarSign,
  Tag,
  FileText,
  Sparkles,
  AlertCircle,
  PlusCircle,
  Trash2,
  Package,
  ShoppingCart,
  Hash,
  Scale,
} from "lucide-react";
import { DateRange } from "react-day-picker";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import useTableControls from "@/hooks/useTableControls";
import MultiExpenseEntry from "@/components/MultiExpenseEntry";
import { Switch } from "@/components/ui/switch";

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  payment_mode: string;
  remarks: string | null;
  expense_date: string;
  is_inventory_purchase?: boolean;
  inventory_item_id?: string | null;
  quantity?: number | null;
  unit?: string | null;
  cost_per_unit?: number | null;
  supplier?: string | null;
  invoice_number?: string | null;
}

interface InventoryItem {
  id: string;
  item_name: string;
  quantity: number;
  category: string | null;
}

interface Category {
  id: string;
  name: string;
  created_at: string;
}

const ExpensesTab = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    paymentMode: "",
    category: "",
    remarks: "",
    isInventoryPurchase: false,
    inventoryItemId: "",
    quantity: "",
    unit: "",
    costPerUnit: "",
    supplier: "",
    invoiceNumber: "",
  });
  const [newCategory, setNewCategory] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { page, range, onPageChange, onRangeChange, itemsPerPage } =
    useTableControls();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [canEditTransactions, setCanEditTransactions] = useState(false);
  const [canAddCategory, setCanAddCategory] = useState(false);
  const [transactionDate, setTransactionDate] = useState(
    format(new Date(), "yyyy-MM-dd"),
  );

  const paymentModes = [
    "Cash",
    "Esewa",
    "Fonepay",
    "Bank Transfer",
    "Cheque",
    "Credit Card",
    "Other",
  ];

  const categoryColors = {
    "Food & Beverages": "from-orange-500 to-red-500",
    Transportation: "from-blue-500 to-cyan-500",
    Utilities: "from-yellow-500 to-orange-500",
    "Office Supplies": "from-green-500 to-emerald-500",
    Marketing: "from-purple-500 to-pink-500",
    Equipment: "from-gray-500 to-slate-500",
    Maintenance: "from-red-500 to-pink-500",
    Insurance: "from-indigo-500 to-blue-500",
    "Legal & Professional": "from-violet-500 to-purple-500",
    Other: "from-teal-500 to-cyan-500",
  };

  useEffect(() => {
    fetchExpenses();
    fetchCategories();
    fetchInventoryItems();
    // Default to true if no setting exists
    const canEdit = localStorage.getItem("canEditTransactions");
    setCanEditTransactions(canEdit === null ? true : JSON.parse(canEdit));
    
    const canAdd = localStorage.getItem("canAddExpenseCategory");
    setCanAddCategory(canAdd === null ? true : JSON.parse(canAdd));
  }, [user, page, range]);

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
      toast.error(`Failed to load categories: ${extractErrorMessage(error)}`);
    }
  };

  const fetchInventoryItems = async () => {
    try {
      const { data, error } = await supabase
        .from("inventory")
        .select("id, item_name, quantity, category")
        .eq("is_active", true)
        .order("item_name");
      if (error) throw error;
      setInventoryItems(data || []);
    } catch (error) {
      logError("fetching inventory items", error);
    }
  };

  const fetchExpenses = async () => {
    if (!user) return;

    setLoading(true);
    try {
      let query = supabase.from("expenses").select("*");

      if (range?.from) {
        query = query.gte("expense_date", format(range.from, "yyyy-MM-dd"));
      }
      if (range?.to) {
        query = query.lte("expense_date", format(range.to, "yyyy-MM-dd"));
      }

      const { data, error } = await query
        .order("expense_date", { ascending: false })
        .order("created_at", { ascending: false })
        .range((page - 1) * itemsPerPage, page * itemsPerPage - 1);

      if (error) throw error;

      setExpenses(data || []);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      toast.error("Failed to load expenses");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Please log in to add expenses");
      return;
    }

    if (
      !formData.description ||
      !formData.amount ||
      !formData.category ||
      !formData.paymentMode
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (formData.isInventoryPurchase) {
      if (!formData.inventoryItemId || !formData.quantity) {
        toast.error("Please provide inventory item and quantity");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("process_inventory_expense", {
        p_user_id: user.id,
        p_description: formData.description,
        p_amount: parseFloat(formData.amount),
        p_category: formData.category,
        p_payment_mode: formData.paymentMode,
        p_remarks: formData.remarks || null,
        p_expense_date: transactionDate,
        p_is_inventory_purchase: formData.isInventoryPurchase,
        p_inventory_item_id: formData.inventoryItemId || null,
        p_quantity: formData.quantity ? parseFloat(formData.quantity) : null,
        p_unit: formData.unit || null,
        p_cost_per_unit: formData.costPerUnit ? parseFloat(formData.costPerUnit) : null,
        p_supplier: formData.supplier || null,
        p_invoice_number: formData.invoiceNumber || null,
      });

      if (error) {
        console.error("Expense submission failed:", error);
        throw error;
      }

      toast.success(formData.isInventoryPurchase ? "Inventory purchase recorded!" : "Expense added successfully!");
      setFormData({
        description: "",
        amount: "",
        paymentMode: "",
        category: "",
        remarks: "",
        isInventoryPurchase: false,
        inventoryItemId: "",
        quantity: "",
        unit: "",
        costPerUnit: "",
        supplier: "",
        invoiceNumber: "",
      });
      fetchExpenses();
      if (formData.isInventoryPurchase) {
        fetchInventoryItems();
      }
    } catch (error) {
      console.error("Error adding expense:", JSON.stringify(error, null, 2));
      console.error("Error details:", error);
      toast.error(
        `Failed to add expense: ${error?.message || "Unknown error"}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + expense.amount,
    0,
  );
  const categoryBreakdown = expenses.reduce(
    (acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    },
    {} as Record<string, number>,
  );

  const topCategory = Object.entries(categoryBreakdown).sort(
    ([, a], [, b]) => b - a,
  )[0];

  const logAction = async (action: string, record_id: string, details: any) => {
    if (!user) return;
    await supabase.from("logs").insert({
      user_id: user.id,
      action,
      table_name: "expenses",
      record_id,
      details,
    });
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("expenses").delete().eq("id", id);

      if (error) throw error;

      toast.success("Expense deleted successfully!");
      logAction("delete", id, { id });
      fetchExpenses();
    } catch (error) {
      console.error("Error deleting expense:", error);
      toast.error("Failed to delete expense");
    }
  };

  const handleUpdate = async () => {
    if (!selectedExpense) return;

    try {
      const { error } = await supabase
        .from("expenses")
        .update(selectedExpense)
        .eq("id", selectedExpense.id);

      if (error) throw error;

      toast.success("Expense updated successfully!");
      logAction("update", selectedExpense.id, selectedExpense);
      setIsEditDialogOpen(false);
      fetchExpenses();
    } catch (error) {
      console.error("Error updating expense:", error);
      toast.error("Failed to update expense");
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory) {
      toast.error("Please enter a category name");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("expense_categories")
        .insert({ name: newCategory })
        .select();

      if (error) throw error;

      toast.success(`Category "${newCategory}" added successfully`);
      setNewCategory("");
      fetchCategories();
    } catch (error) {
      logError("adding category", error);
      toast.error(`Failed to add category: ${extractErrorMessage(error)}`);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      const { error } = await supabase
        .from("expense_categories")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Category deleted successfully");
      fetchCategories();
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error("Failed to delete category");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
          </DialogHeader>
          {selectedExpense && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="editDescription">Description</Label>
                <Input
                  id="editDescription"
                  value={selectedExpense.description}
                  onChange={(e) =>
                    setSelectedExpense({
                      ...selectedExpense,
                      description: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="editAmount">Amount</Label>
                <Input
                  id="editAmount"
                  type="number"
                  value={selectedExpense.amount}
                  onChange={(e) =>
                    setSelectedExpense({
                      ...selectedExpense,
                      amount: parseFloat(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="editCategory">Category</Label>
                <Input
                  id="editCategory"
                  value={selectedExpense.category}
                  onChange={(e) =>
                    setSelectedExpense({
                      ...selectedExpense,
                      category: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="editPaymentMode">Payment Mode</Label>
                <Input
                  id="editPaymentMode"
                  value={selectedExpense.payment_mode}
                  onChange={(e) =>
                    setSelectedExpense({
                      ...selectedExpense,
                      payment_mode: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="editRemarks">Remarks</Label>
                <Input
                  id="editRemarks"
                  value={selectedExpense.remarks || ""}
                  onChange={(e) =>
                    setSelectedExpense({
                      ...selectedExpense,
                      remarks: e.target.value,
                    })
                  }
                />
              </div>

              {selectedExpense.is_inventory_purchase && (
                <div className="space-y-4 p-4 bg-amber-50 rounded-lg border border-amber-100">
                  <p className="text-sm font-medium text-amber-800 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Inventory Purchase Details
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        value={selectedExpense.quantity || ""}
                        onChange={(e) =>
                          setSelectedExpense({
                            ...selectedExpense,
                            quantity: parseFloat(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label>Unit</Label>
                      <Input
                        value={selectedExpense.unit || ""}
                        onChange={(e) =>
                          setSelectedExpense({
                            ...selectedExpense,
                            unit: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label>Supplier</Label>
                      <Input
                        value={selectedExpense.supplier || ""}
                        onChange={(e) =>
                          setSelectedExpense({
                            ...selectedExpense,
                            supplier: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label>Invoice #</Label>
                      <Input
                        value={selectedExpense.invoice_number || ""}
                        onChange={(e) =>
                          setSelectedExpense({
                            ...selectedExpense,
                            invoice_number: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <p className="text-xs text-amber-600">
                    Note: Updating quantity here will NOT automatically update inventory stock to avoid double-counting. Please use the Inventory module for manual stock adjustments.
                  </p>
                </div>
              )}
              <RecordAttachments recordType="expense" recordId={selectedExpense.id} />
            </div>
          )}
          <DialogFooter>
            <Button onClick={handleUpdate}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-6 p-4 sm:p-6">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-md bg-primary text-primary-foreground">
                <Receipt className="h-4 w-4" />
              </div>
              <h1 className="text-xl font-semibold text-foreground">
                Expense Tracker
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Track and manage your business expenses with detailed categorization
            </p>
          </div>
          <MultiExpenseEntry categories={categories} onComplete={fetchExpenses} />
        </div>

        {/* All-Time Total Display */}
        <AllTimeTotalDisplay type="expenses" className="mb-6" />

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-card border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Total Expenses</p>
                  <p className="text-lg font-semibold text-foreground">
                    NRs. {totalExpenses.toFixed(2)}
                  </p>
                </div>
                <div className="p-2 bg-muted rounded-md">
                  <TrendingDown className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Total Entries</p>
                  <p className="text-lg font-semibold text-foreground">{expenses.length}</p>
                </div>
                <div className="p-2 bg-muted rounded-md">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Avg. Expense</p>
                  <p className="text-lg font-semibold text-foreground">
                    NRs.{" "}
                    {expenses.length > 0
                      ? (totalExpenses / expenses.length).toFixed(2)
                      : "0.00"}
                  </p>
                </div>
                <div className="p-2 bg-muted rounded-md">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Top Category</p>
                  <p className="text-lg font-semibold text-foreground">
                    {topCategory ? topCategory[0] : "N/A"}
                  </p>
                </div>
                <div className="p-2 bg-muted rounded-md">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Add Expense Form */}
          <Card className="bg-gradient-to-br from-white/90 to-red-50/90 backdrop-blur-sm border-0 shadow-2xl hover:shadow-3xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-white/20 rounded-lg">
                  <PlusCircle className="h-6 w-6" />
                </div>
                Add New Expense
                <Sparkles className="h-5 w-5 animate-pulse" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="description"
                    className="text-sm font-medium text-gray-700 flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4 text-red-600" />
                    Description *
                  </Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Enter expense description"
                    required
                    className="border-red-200 focus:border-red-500 focus:ring-red-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="amount"
                    className="text-sm font-medium text-gray-700 flex items-center gap-2"
                  >
                    <DollarSign className="h-4 w-4 text-green-600" />
                    Amount (NRs.) *
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    placeholder="0.00"
                    required
                    className="border-green-200 focus:border-green-500 focus:ring-green-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="category"
                      className="text-sm font-medium text-gray-700 flex items-center gap-2"
                    >
                      <Tag className="h-4 w-4 text-blue-600" />
                      Category *
                    </Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) =>
                        setFormData({ ...formData, category: value })
                      }
                      required
                    >
                      <SelectTrigger className="border-blue-200 focus:border-blue-500 focus:ring-blue-500">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.name}>
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-3 h-3 rounded-full bg-gradient-to-r ${categoryColors[category.name as keyof typeof categoryColors]}`}
                              ></div>
                              {category.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="paymentMode"
                      className="text-sm font-medium text-gray-700"
                    >
                      Payment Mode *
                    </Label>
                    <Select
                      value={formData.paymentMode}
                      onValueChange={(value) =>
                        setFormData({ ...formData, paymentMode: value })
                      }
                      required
                    >
                      <SelectTrigger className="border-purple-200 focus:border-purple-500 focus:ring-purple-500">
                        <SelectValue placeholder="Select payment mode" />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentModes.map((mode) => (
                          <SelectItem key={mode} value={mode}>
                            {mode}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center space-x-2 py-2">
                  <Switch
                    id="inventory-purchase"
                    checked={formData.isInventoryPurchase}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isInventoryPurchase: checked })
                    }
                  />
                  <Label htmlFor="inventory-purchase" className="text-sm font-medium flex items-center gap-2">
                    <Package className="h-4 w-4 text-amber-600" />
                    Inventory Purchase?
                  </Label>
                </div>

                {formData.isInventoryPurchase && (
                  <div className="space-y-4 p-4 bg-amber-50/50 rounded-lg border border-amber-100 animate-in fade-in slide-in-from-top-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="inventoryItemId" className="text-sm font-medium flex items-center gap-2">
                          <ShoppingCart className="h-4 w-4 text-amber-600" />
                          Inventory Item *
                        </Label>
                        <Select
                          value={formData.inventoryItemId}
                          onValueChange={(value) => {
                            const item = inventoryItems.find(i => i.id === value);
                            setFormData({
                              ...formData,
                              inventoryItemId: value,
                              description: item ? `Purchase: ${item.item_name}` : formData.description,
                              category: item?.category || formData.category
                            });
                          }}
                        >
                          <SelectTrigger className="border-amber-200 bg-white">
                            <SelectValue placeholder="Select item" />
                          </SelectTrigger>
                          <SelectContent>
                            {inventoryItems.map((item) => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.item_name} ({item.quantity} in stock)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="quantity" className="text-sm font-medium flex items-center gap-2">
                          <Scale className="h-4 w-4 text-amber-600" />
                          Quantity *
                        </Label>
                        <Input
                          id="quantity"
                          type="number"
                          value={formData.quantity}
                          onChange={(e) => {
                            const qty = e.target.value;
                            const cpu = formData.costPerUnit;
                            const calcAmount = (parseFloat(qty || "0") * parseFloat(cpu || "0")).toFixed(2);
                            setFormData({
                              ...formData,
                              quantity: qty,
                              amount: parseFloat(calcAmount) > 0 ? calcAmount : formData.amount
                            });
                          }}
                          placeholder="0.00"
                          className="border-amber-200 bg-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="unit" className="text-sm font-medium">Unit (kg, ltr, pcs, etc.)</Label>
                        <Input
                          id="unit"
                          value={formData.unit}
                          onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                          placeholder="e.g. kg"
                          className="border-amber-200 bg-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="costPerUnit" className="text-sm font-medium">Cost per Unit</Label>
                        <Input
                          id="costPerUnit"
                          type="number"
                          value={formData.costPerUnit}
                          onChange={(e) => {
                            const cpu = e.target.value;
                            const qty = formData.quantity;
                            const calcAmount = (parseFloat(qty || "0") * parseFloat(cpu || "0")).toFixed(2);
                            setFormData({
                              ...formData,
                              costPerUnit: cpu,
                              amount: parseFloat(calcAmount) > 0 ? calcAmount : formData.amount
                            });
                          }}
                          placeholder="0.00"
                          className="border-amber-200 bg-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="supplier" className="text-sm font-medium">Supplier</Label>
                        <Input
                          id="supplier"
                          value={formData.supplier}
                          onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                          placeholder="Supplier name"
                          className="border-amber-200 bg-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="invoiceNumber" className="text-sm font-medium flex items-center gap-2">
                          <Hash className="h-4 w-4 text-amber-600" />
                          Invoice Number
                        </Label>
                        <Input
                          id="invoiceNumber"
                          value={formData.invoiceNumber}
                          onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                          placeholder="Invoice #"
                          className="border-amber-200 bg-white"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label
                    htmlFor="remarks"
                    className="text-sm font-medium text-gray-700"
                  >
                    Remarks (Optional)
                  </Label>
                  <Textarea
                    id="remarks"
                    value={formData.remarks}
                    onChange={(e) =>
                      setFormData({ ...formData, remarks: e.target.value })
                    }
                    placeholder="Additional notes or remarks"
                    rows={3}
                    className="border-gray-200 focus:border-gray-500 focus:ring-gray-500"
                  />
                </div>

                {/* Transaction Date Picker */}
                <TransactionDatePicker
                  selectedDate={transactionDate}
                  onDateChange={setTransactionDate}
                  label="Expense Date"
                  showBackdateWarning={true}
                />

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 bg-gradient-to-r from-red-500 via-pink-500 to-purple-500 hover:from-red-600 hover:via-pink-600 hover:to-purple-600 text-white font-semibold shadow-lg transition-all duration-300 transform hover:scale-105"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      Adding Expense...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <PlusCircle className="h-5 w-5" />
                      Add Expense
                    </div>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Category Breakdown */}
          <Card className="bg-gradient-to-br from-white/90 to-purple-50/90 backdrop-blur-sm border-0 shadow-2xl hover:shadow-3xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Tag className="h-6 w-6" />
                </div>
                Category Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {Object.keys(categoryBreakdown).length === 0 ? (
                <div className="text-center py-8">
                  <Tag className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500 text-lg font-medium">
                    No expenses yet
                  </p>
                  <p className="text-gray-400">
                    Add your first expense to see category breakdown!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(categoryBreakdown)
                    .sort(([, a], [, b]) => b - a)
                    .map(([category, amount], index) => {
                      const percentage = (amount / totalExpenses) * 100;
                      return (
                        <div
                          key={category}
                          className="p-4 bg-gradient-to-r from-white to-purple-50 rounded-lg border border-purple-100 hover:shadow-md transition-all duration-200"
                          style={{ animationDelay: `${index * 100}ms` }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-4 h-4 rounded-full bg-gradient-to-r ${categoryColors[category as keyof typeof categoryColors]}`}
                              ></div>
                              <span className="font-medium text-gray-800">
                                {category}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-purple-600">
                                NRs. {amount.toFixed(2)}
                              </span>
                              <div className="text-sm text-gray-500">
                                {percentage.toFixed(1)}%
                              </div>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`bg-gradient-to-r ${categoryColors[category as keyof typeof categoryColors]} h-2 rounded-full transition-all duration-500`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        {canAddCategory && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Manage Categories */}
            <Card className="bg-gradient-to-br from-white/90 to-red-50/90 backdrop-blur-sm border-0 shadow-2xl hover:shadow-3xl transition-all duration-300">
              <CardHeader className="bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Tag className="h-6 w-6" />
                  </div>
                  Manage Categories
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleAddCategory} className="space-y-4">
                  <Input
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Enter new category"
                    className="h-12"
                  />
                  <Button
                    type="submit"
                    className="w-full h-12 bg-gradient-to-r from-red-500 to-pink-500 text-white"
                  >
                    Add Category
                  </Button>
                </form>
                <div className="mt-6 space-y-2">
                  {categories.map((cat) => (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm"
                    >
                      <span className="font-medium">{cat.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCategory(cat.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Expense History */}
        <Card className="bg-gradient-to-br from-white/90 to-gray-50/90 backdrop-blur-sm border-0 shadow-2xl">
          <CardHeader className="border-b border-gray-200/50 flex flex-row items-center justify-between">
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent">
              Expense History
            </CardTitle>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[300px] justify-start text-left font-normal hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50",
                      !range && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {range?.from ? (
                      range.to ? (
                        <>
                          {format(range.from, "LLL dd, y")} -{" "}
                          {format(range.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(range.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={range?.from}
                    selected={range}
                    onSelect={onRangeChange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-10">
                <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-pink-500 rounded-full animate-spin mx-auto flex items-center justify-center mb-4">
                  <Receipt className="h-8 w-8 text-white" />
                </div>
                <p className="text-gray-600">Loading expenses...</p>
              </div>
            ) : expenses.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <p className="text-xl font-semibold text-gray-700 mb-2">
                  No expenses found
                </p>
                <p className="text-gray-500">
                  Start tracking your expenses to see them here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-gray-50 to-purple-50">
                      <TableHead className="font-semibold text-gray-700">
                        Date
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        Description
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        Category
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        Amount
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        Payment
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        Remarks
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={3} className="font-bold">
                        Total
                      </TableCell>
                      <TableCell colSpan={3} className="font-bold text-right">
                        NRs. {totalExpenses.toFixed(2)}
                      </TableCell>
                    </TableRow>
                    {expenses.map((expense, index) => (
                      <TableRow
                        key={expense.id}
                        className="hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 transition-all duration-200"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <TableCell className="font-medium">
                          {format(
                            new Date(expense.expense_date),
                            "MMM dd, yyyy",
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div
                            className="font-medium text-gray-800 truncate flex items-center gap-2"
                            title={expense.description}
                          >
                            {expense.is_inventory_purchase && (
                              <Package className="h-3 w-3 text-amber-600 shrink-0" />
                            )}
                            {expense.description}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`bg-gradient-to-r ${categoryColors[expense.category as keyof typeof categoryColors]} text-white border-0`}
                          >
                            {expense.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-bold text-lg bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">
                            NRs. {expense.amount.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200"
                          >
                            {expense.payment_mode}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <span
                            className="text-sm text-gray-600 truncate"
                            title={expense.remarks || ""}
                          >
                            {expense.remarks || "-"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedExpense(expense);
                                setIsEditDialogOpen(true);
                              }}
                            >
                              Edit
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Are you sure?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will
                                    permanently delete the expense.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>
                                    Cancel
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(expense.id)}
                                  >
                                    Continue
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
          {expenses.length > 0 && (
            <div className="flex justify-center p-4 border-t border-gray-200">
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => onPageChange(page - 1)}
                  disabled={page === 1}
                  variant="outline"
                  className="hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50"
                >
                  Previous
                </Button>
                <span className="px-4 py-2 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg font-medium">
                  Page {page}
                </span>
                <Button
                  onClick={() => onPageChange(page + 1)}
                  disabled={expenses.length < itemsPerPage}
                  variant="outline"
                  className="hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ExpensesTab;
