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
  CreditCard,
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import useTableControls from "@/hooks/useTableControls";
import MultiExpenseEntry from "@/components/MultiExpenseEntry";
import { Switch } from "@/components/ui/switch";
import MobileTable from "@/components/ui/mobile-table";
import { Edit } from "lucide-react";

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  payment_mode: string;
  remarks: string | null;
  expense_date: string;
  is_inventory_purchase?: boolean;
  is_credit?: boolean;
  inventory_item_id?: string | null;
  quantity?: number | null;
  unit?: string | null;
  cost_per_unit?: number | null;
  supplier?: string | null;
  invoice_number?: string | null;
}

interface UnitConversion {
  id: string;
  unit_name: string;
  conversion_to_base: number;
}

interface InventoryItem {
  id: string;
  item_name: string;
  quantity: number;
  category: string | null;
  unit_cost: number | null;
  base_unit: string;
  unit_conversions?: UnitConversion[];
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
    isCredit: false,
    inventoryItemId: "",
    quantity: "",
    unit: "",
    factor: 1,
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
  const [inventorySearchOpen, setInventorySearchOpen] = useState(false);

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
    "Food & Beverages": "from-primary to-primary/80",
    Transportation: "from-primary to-primary/80",
    Utilities: "from-primary to-primary/80",
    "Office Supplies": "from-primary to-primary/80",
    Marketing: "from-primary to-primary/80",
    Equipment: "from-primary to-primary/80",
    Maintenance: "from-primary to-primary/80",
    Insurance: "from-primary to-primary/80",
    "Legal & Professional": "from-primary to-primary/80",
    Other: "from-primary to-primary/80",
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
        .select(`
          id, item_name, quantity, category, unit_cost, base_unit,
          current_stock_base, average_cost_per_base_unit,
          unit_conversions:inventory_unit_conversions(*)
        `)
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
        p_manual_conversion_factor: formData.isInventoryPurchase ? formData.factor : null,
        p_is_credit: formData.isCredit
      });

      if (error) {
        console.error("Expense submission failed:", error);
        throw error;
      }

      toast.success(
        formData.isCredit
          ? "Added to Expense Bookings (Credit)!"
          : (formData.isInventoryPurchase ? "Inventory purchase recorded!" : "Expense added successfully!")
      );
      setFormData({
        description: "",
        amount: "",
        paymentMode: "",
        category: "",
        remarks: "",
        isInventoryPurchase: false,
        isCredit: false,
        inventoryItemId: "",
        quantity: "",
        unit: "",
        factor: 1,
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
    if (!selectedExpense || !user) return;

    try {
      const { data, error } = await supabase.rpc("process_inventory_expense", {
        p_user_id: user.id,
        p_description: selectedExpense.description,
        p_amount: selectedExpense.amount,
        p_category: selectedExpense.category,
        p_payment_mode: selectedExpense.payment_mode,
        p_remarks: selectedExpense.remarks || null,
        p_expense_date: selectedExpense.expense_date,
        p_is_inventory_purchase: selectedExpense.is_inventory_purchase || false,
        p_inventory_item_id: selectedExpense.inventory_item_id || null,
        p_quantity: selectedExpense.quantity || null,
        p_unit: selectedExpense.unit || null,
        p_cost_per_unit: selectedExpense.cost_per_unit || null,
        p_supplier: selectedExpense.supplier || null,
        p_invoice_number: selectedExpense.invoice_number || null,
        p_is_credit: selectedExpense.is_credit || false,
        p_id: selectedExpense.id
      });

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
    <div className="min-h-screen bg-background p-2 md:p-6 pb-24 md:pb-6">
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-4 md:p-6 rounded-3xl" aria-describedby={undefined}>
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold text-primary">Edit Expense</DialogTitle>
          </DialogHeader>
          {selectedExpense && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="editDescription" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</Label>
                <Input
                  id="editDescription"
                  value={selectedExpense.description}
                  onChange={(e) =>
                    setSelectedExpense({
                      ...selectedExpense,
                      description: e.target.value,
                    })
                  }
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="editAmount" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Amount</Label>
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
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="editCategory" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Category</Label>
                  <Input
                    id="editCategory"
                    value={selectedExpense.category}
                    onChange={(e) =>
                      setSelectedExpense({
                        ...selectedExpense,
                        category: e.target.value,
                      })
                    }
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="editPaymentMode" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Payment Mode</Label>
                  <Input
                    id="editPaymentMode"
                    value={selectedExpense.payment_mode}
                    onChange={(e) =>
                      setSelectedExpense({
                        ...selectedExpense,
                        payment_mode: e.target.value,
                      })
                    }
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="editRemarks" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Remarks</Label>
                  <Input
                    id="editRemarks"
                    value={selectedExpense.remarks || ""}
                    onChange={(e) =>
                      setSelectedExpense({
                        ...selectedExpense,
                        remarks: e.target.value,
                      })
                    }
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between py-2 bg-primary/5 p-3 rounded-xl border border-primary/10">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit-inventory-purchase"
                    checked={selectedExpense.is_inventory_purchase || false}
                    onCheckedChange={(checked) =>
                      setSelectedExpense({ ...selectedExpense, is_inventory_purchase: checked })
                    }
                  />
                  <Label htmlFor="edit-inventory-purchase" className="text-[10px] font-black uppercase flex items-center gap-1.5 cursor-pointer">
                    <Package className={cn("h-3.5 w-3.5", selectedExpense.is_inventory_purchase ? "text-amber-600" : "text-muted-foreground")} />
                    Stock Update?
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border-l border-primary/10 pl-4">
                  <Switch
                    id="edit-is-credit"
                    checked={selectedExpense.is_credit || false}
                    onCheckedChange={(checked) =>
                      setSelectedExpense({ ...selectedExpense, is_credit: checked })
                    }
                  />
                  <Label htmlFor="edit-is-credit" className="text-[10px] font-black uppercase flex items-center gap-1.5 cursor-pointer">
                    <CreditCard className={cn("h-3.5 w-3.5", selectedExpense.is_credit ? "text-blue-600" : "text-muted-foreground")} />
                    Credit?
                  </Label>
                </div>
              </div>

              {(selectedExpense.is_inventory_purchase || selectedExpense.is_credit) && (
                <div className="space-y-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground">Supplier</Label>
                      <Input
                        value={selectedExpense.supplier || ""}
                        onChange={(e) =>
                          setSelectedExpense({
                            ...selectedExpense,
                            supplier: e.target.value,
                          })
                        }
                        className="h-10 rounded-lg"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground">Invoice #</Label>
                      <Input
                        value={selectedExpense.invoice_number || ""}
                        onChange={(e) =>
                          setSelectedExpense({
                            ...selectedExpense,
                            invoice_number: e.target.value,
                          })
                        }
                        className="h-10 rounded-lg"
                      />
                    </div>
                    {selectedExpense.is_inventory_purchase && (
                      <>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold uppercase text-muted-foreground">Quantity</Label>
                          <Input
                            type="number"
                            value={selectedExpense.quantity || ""}
                            onChange={(e) =>
                              setSelectedExpense({
                                ...selectedExpense,
                                quantity: parseFloat(e.target.value),
                              })
                            }
                            className="h-10 rounded-lg"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold uppercase text-muted-foreground">Unit</Label>
                          <Input
                            value={selectedExpense.unit || ""}
                            onChange={(e) =>
                              setSelectedExpense({
                                ...selectedExpense,
                                unit: e.target.value,
                              })
                            }
                            className="h-10 rounded-lg"
                          />
                        </div>
                        <div className="col-span-2 space-y-1.5">
                          <Label className="text-[10px] font-bold uppercase text-muted-foreground">Item ID (UUID)</Label>
                          <Input
                            value={selectedExpense.inventory_item_id || ""}
                            onChange={(e) =>
                              setSelectedExpense({
                                ...selectedExpense,
                                inventory_item_id: e.target.value,
                              })
                            }
                            placeholder="Required"
                            className="h-10 rounded-lg"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
              <RecordAttachments recordType="expense" recordId={selectedExpense.id} compact />
            </div>
          )}
          <DialogFooter className="pt-2">
            <Button onClick={handleUpdate} className="w-full h-12 rounded-xl text-lg font-bold shadow-lg">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="bg-primary/5 p-4 rounded-3xl mb-4 md:mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-xl text-white">
              <Receipt className="h-5 w-5 md:h-6 md:w-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground">
                Expenses
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Track and manage your business expenses
              </p>
            </div>
          </div>
          <MultiExpenseEntry
            categories={categories}
            inventory={inventoryItems}
            onComplete={fetchExpenses}
          />
        </div>


        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
          {/* Add Expense Form */}
          <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden">
            <CardHeader className="bg-primary text-white p-4 md:p-6">
              <CardTitle className="flex items-center gap-3 text-lg md:text-xl font-bold">
                <div className="p-2 bg-white/20 rounded-xl">
                  <PlusCircle className="h-5 w-5 md:h-6 md:w-6" />
                </div>
                New Expense
                <Sparkles className="h-4 w-4 md:h-5 md:w-5 ml-auto opacity-70" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6 space-y-6">
              <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
                <div className="flex items-center justify-between py-2 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="inventory-purchase"
                      className="data-[state=checked]:bg-secondary"
                      checked={formData.isInventoryPurchase}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, isInventoryPurchase: checked })
                      }
                    />
                    <Label htmlFor="inventory-purchase" className="text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer">
                      <Package className={cn("h-3.5 w-3.5", formData.isInventoryPurchase ? "text-amber-600" : "text-muted-foreground")} />
                      Stock?
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 border-l border-slate-200 pl-4">
                    <Switch
                      id="is-credit"
                      className="data-[state=checked]:bg-primary"
                      checked={formData.isCredit}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, isCredit: checked })
                      }
                    />
                    <Label htmlFor="is-credit" className="text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer">
                      <CreditCard className={cn("h-3.5 w-3.5", formData.isCredit ? "text-blue-600" : "text-muted-foreground")} />
                      Credit?
                    </Label>
                  </div>
                </div>

                {(formData.isInventoryPurchase || formData.isCredit) ? (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                    {formData.isInventoryPurchase && (
                    <div className="space-y-2">
                      <Label htmlFor="inventoryItemId" className="text-sm font-medium flex items-center gap-2">
                        <ShoppingCart className="h-4 w-4 text-amber-600" />
                        Select Inventory Item *
                      </Label>
                      <Popover open={inventorySearchOpen} onOpenChange={setInventorySearchOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={inventorySearchOpen}
                            className="w-full justify-between border-amber-200 focus:ring-amber-500 h-11 rounded-xl"
                          >
                            {formData.inventoryItemId
                              ? inventoryItems.find((item) => item.id === formData.inventoryItemId)?.item_name
                              : "Select inventory item..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                          <Command filter={(value, search) => {
                            if (value.toLowerCase().includes(search.toLowerCase())) return 1;
                            return 0;
                          }}>
                            <CommandInput placeholder="Search inventory..." />
                            <CommandList>
                              <CommandEmpty>No item found.</CommandEmpty>
                              <CommandGroup>
                                {inventoryItems.map((item) => (
                                  <CommandItem
                                    key={item.id}
                                    value={item.item_name}
                                    onSelect={() => {
                                      const qty = parseFloat(formData.quantity || "0");
                                      const cpu = item.unit_cost || 0;
                                      const calcAmount = (qty * cpu).toFixed(2);
                                      setFormData({
                                        ...formData,
                                        inventoryItemId: item.id,
                                        description: `Purchase: ${item.item_name}`,
                                        category: item.category || formData.category,
                                        unit: item.base_unit || "",
                                        factor: 1,
                                        costPerUnit: cpu.toString(),
                                        amount: parseFloat(calcAmount) > 0 ? calcAmount : formData.amount
                                      });
                                      setInventorySearchOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        formData.inventoryItemId === item.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {item.item_name} ({item.quantity} {item.base_unit} in stock)
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    )}

                    {formData.isInventoryPurchase && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="quantity" className="text-sm font-medium flex items-center gap-2">
                          <Scale className="h-4 w-4 text-amber-600" />
                          Quantity *
                        </Label>
                        <Input
                          id="quantity"
                          type="number"
                          step="0.01"
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
                          className="border-amber-100"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="costPerUnit" className="text-sm font-medium">Rate (Unit Cost)</Label>
                        <Input
                          id="costPerUnit"
                          type="number"
                          step="0.01"
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
                          className="border-amber-100"
                        />
                      </div>
                    </div>
                    )}

                    {formData.isInventoryPurchase && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="unit" className="text-sm font-medium">Unit</Label>
                        <Select
                          value={formData.unit}
                          onValueChange={(value) => {
                            const selectedItem = inventoryItems.find(i => i.id === formData.inventoryItemId);
                            let f = 1;
                            if (selectedItem) {
                              if (value === selectedItem.base_unit) f = 1;
                              else {
                                const c = selectedItem.unit_conversions?.find(cv => cv.unit_name === value);
                                if (c) f = c.conversion_to_base;
                              }
                            }
                            setFormData({ ...formData, unit: value, factor: f });
                          }}
                        >
                          <SelectTrigger className="border-amber-100">
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                          <SelectContent>
                            {(() => {
                              const selectedItem = inventoryItems.find(i => i.id === formData.inventoryItemId);
                              if (!selectedItem) return null;
                              // Deduplicate and filter units
                              const units = Array.from(new Set(
                                [selectedItem.base_unit, ...(selectedItem.unit_conversions?.map(u => u.unit_name) || [])]
                              )).filter(Boolean);
                              return units.map(u => (
                                <SelectItem key={u} value={u}>{u}</SelectItem>
                              ));
                            })()}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="factor" className="text-sm font-medium">Factor</Label>
                        <Input
                          id="factor"
                          type="number"
                          value={formData.factor}
                          onChange={(e) => setFormData({ ...formData, factor: parseFloat(e.target.value) || 1 })}
                          className="border-amber-100"
                        />
                      </div>
                    </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="supplier" className="text-sm font-medium flex items-center gap-2">
                          <ShoppingCart className="h-4 w-4 text-blue-600" />
                          Supplier (Party Name) *
                        </Label>
                        <Input
                          id="supplier"
                          value={formData.supplier}
                          onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                          placeholder="Supplier name"
                          required
                          className="border-blue-100"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="invoiceNumber" className="text-sm font-medium flex items-center gap-2">
                          <Hash className="h-4 w-4 text-amber-600" />
                          Invoice #
                        </Label>
                        <Input
                          id="invoiceNumber"
                          value={formData.invoiceNumber}
                          onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                          placeholder="Optional"
                          className="border-amber-100"
                        />
                      </div>
                    </div>

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
                        placeholder="e.g. Meat for restaurant"
                        required
                        className="border-red-200 focus:border-red-500"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
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
                      placeholder="e.g. Office supplies, Electricity bill"
                      required
                      className="border-red-200 focus:border-red-500"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label
                    htmlFor="amount"
                    className="text-sm font-medium text-gray-700 flex items-center gap-2"
                  >
                    <DollarSign className="h-4 w-4 text-green-600" />
                    Total Amount (NRs.) *
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
                    className={cn(
                      "text-lg font-bold border-primary/20 focus:border-primary",
                      formData.isInventoryPurchase && "bg-primary/5"
                    )}
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
                      <SelectTrigger className="border-blue-200 focus:border-blue-500">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.name}>
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-3 h-3 rounded-full bg-gradient-to-r ${categoryColors[category.name as keyof typeof categoryColors] || "from-gray-400 to-gray-500"}`}
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
                        setFormData({
                          ...formData,
                          paymentMode: value,
                          isCredit: value === "Credit" || value === "Cheque"
                        })
                      }
                      required
                    >
                      <SelectTrigger className="border-purple-200 focus:border-purple-500">
                        <SelectValue placeholder="Select" />
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
                  className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-black text-lg shadow-xl shadow-primary/20 transition-all duration-300 transform rounded-2xl"
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
          <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden transition-all duration-300">
            <CardHeader className="bg-secondary text-white p-4">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <div className="p-1.5 bg-white/20 rounded-lg">
                  <Tag className="h-5 w-5" />
                </div>
                Category Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {Object.keys(categoryBreakdown).length === 0 ? (
                <div className="text-center py-6">
                  <Tag className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-500 font-medium">No expenses yet</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-3">
                    {Object.entries(categoryBreakdown)
                      .sort(([, a], [, b]) => b - a)
                      .map(([category, amount], index) => {
                        const percentage = (amount / totalExpenses) * 100;
                        return (
                          <div
                            key={category}
                            className="p-3 bg-slate-50 rounded-xl border border-slate-100 hover:shadow-sm transition-all duration-200"
                            style={{ animationDelay: `${index * 50}ms` }}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-3 h-3 rounded-full bg-gradient-to-r ${categoryColors[category as keyof typeof categoryColors] || "from-gray-400 to-gray-500"}`}
                                ></div>
                                <span className="text-sm font-bold text-slate-700 truncate max-w-[120px]">
                                  {category}
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="text-sm font-black text-primary">
                                  रु {amount.toLocaleString()}
                                </span>
                                <div className="text-[10px] font-bold text-muted-foreground uppercase">
                                  {percentage.toFixed(1)}%
                                </div>
                              </div>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-1.5">
                              <div
                                className={`bg-gradient-to-r ${categoryColors[category as keyof typeof categoryColors] || "from-gray-400 to-gray-500"} h-1.5 rounded-full transition-all duration-500`}
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
        {canAddCategory && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Manage Categories */}
            <Card className="bg-white border-0 shadow-sm rounded-3xl overflow-hidden">
              <CardHeader className="bg-pink-600 text-white p-4">
                <CardTitle className="flex items-center gap-2 text-lg font-bold">
                  <div className="p-1.5 bg-white/20 rounded-lg">
                    <Tag className="h-5 w-5" />
                  </div>
                  Manage Categories
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <form onSubmit={handleAddCategory} className="flex gap-2">
                  <Input
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="New category..."
                    className="h-10 rounded-xl"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    className="bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-bold px-4"
                  >
                    Add
                  </Button>
                </form>
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-2">
                    {categories.map((cat) => (
                      <div
                        key={cat.id}
                        className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100"
                      >
                        <span className="text-sm font-bold text-slate-700">{cat.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="h-8 w-8 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
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
              <MobileTable
                columns={[
                  {
                    key: "expense_date",
                    label: "Date",
                    render: (val) => format(new Date(val), "MMM dd, yyyy"),
                    mobileLabel: "Date",
                  },
                  {
                    key: "description",
                    label: "Description",
                    render: (val, expense) => (
                      <div className="flex items-center gap-2">
                        {expense.is_inventory_purchase && <Package className="h-3 w-3 text-amber-600" />}
                        <span className="truncate">{val}</span>
                      </div>
                    ),
                  },
                  {
                    key: "category",
                    label: "Category",
                    render: (val) => (
                      <Badge className={cn("bg-gradient-to-r text-white border-0", categoryColors[val as keyof typeof categoryColors] || "from-gray-400 to-gray-500")}>
                        {val}
                      </Badge>
                    ),
                  },
                  {
                    key: "amount",
                    label: "Amount",
                    className: "text-right font-bold",
                    render: (val) => <span className="text-destructive">रु {Number(val).toFixed(0)}</span>,
                  },
                  {
                    key: "payment_mode",
                    label: "Payment",
                    hideOnMobile: true,
                    render: (val) => <Badge variant="secondary">{val}</Badge>,
                  },
                  {
                    key: "actions",
                    label: "Actions",
                    className: "text-right",
                    render: (_, expense) => (
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedExpense(expense);
                            setIsEditDialogOpen(true);
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(expense.id)}>
                                Continue
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    ),
                  },
                ]}
                data={expenses}
                footer={
                  <div className="flex justify-between items-center font-bold text-lg">
                    <span>Page Total</span>
                    <span className="text-destructive">
                      रु {totalExpenses.toFixed(2)}
                    </span>
                  </div>
                }
              />
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
