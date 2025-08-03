
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { toast } from "sonner";
import { extractErrorMessage, logError } from "@/utils/errorHandling";
import {
  Plus,
  Edit,
  Trash2,
  Settings,
  Save,
} from "lucide-react";

interface Category {
  id: string;
  name: string;
  created_at?: string;
}

interface PaymentMode {
  id: string;
  name: string;
  created_at?: string;
}

interface CategoryPaymentModeManagerProps {
  tableType: string;
  selectedCategory?: string;
  selectedPaymentMode?: string;
  onCategorySelect?: (category: string) => void;
  onPaymentModeSelect?: (paymentMode: string) => void;
  showCategories?: boolean;
  showPaymentModes?: boolean;
}

const CategoryPaymentModeManager = ({
  tableType,
  selectedCategory,
  selectedPaymentMode,
  onCategorySelect,
  onPaymentModeSelect,
  showCategories = true,
  showPaymentModes = true,
}: CategoryPaymentModeManagerProps) => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentModes, setPaymentModes] = useState<PaymentMode[]>([]);

  // Dialog states
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isPaymentModeDialogOpen, setIsPaymentModeDialogOpen] = useState(false);

  // Form states
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
    isEditing: false,
    editId: "",
  });

  const [paymentModeForm, setPaymentModeForm] = useState({
    name: "",
    description: "",
    isEditing: false,
    editId: "",
  });

  useEffect(() => {
    if (user) {
      if (showCategories) fetchCategories();
      if (showPaymentModes) fetchPaymentModes();
    }
  }, [user, tableType, showCategories, showPaymentModes]);

  const fetchCategories = async () => {
    if (!user) return;

    try {
      // Use the appropriate category table based on tableType
      let tableName = "categories";
      if (tableType === "charging") tableName = "charging_categories";
      if (tableType === "expenses") tableName = "expense_categories";
      if (tableType === "deposits") tableName = "deposit_categories";
      if (tableType === "withdrawals") tableName = "withdrawal_categories";
      if (tableType === "savings") tableName = "savings_categories";

      const { data, error } = await supabase
        .from(tableName)
        .select("id, name, created_at")
        .order("name");

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      logError("fetching categories", error);
      toast.error(`Failed to load categories: ${extractErrorMessage(error)}`);
    }
  };

  const fetchPaymentModes = async () => {
    if (!user) return;

    try {
      // For payment modes, we'll use a predefined list since there's no payment_modes table
      const defaultPaymentModes = [
        { id: "1", name: "Cash", created_at: new Date().toISOString() },
        { id: "2", name: "Esewa", created_at: new Date().toISOString() },
        { id: "3", name: "Fonepay", created_at: new Date().toISOString() },
        { id: "4", name: "Bank Transfer", created_at: new Date().toISOString() },
      ];
      setPaymentModes(defaultPaymentModes);
    } catch (error) {
      console.error("Error fetching payment modes:", error);
    }
  };

  const saveCategory = async () => {
    if (!user || !categoryForm.name) {
      toast.error("Category name is required");
      return;
    }

    try {
      let tableName = "categories";
      if (tableType === "charging") tableName = "charging_categories";
      if (tableType === "expenses") tableName = "expense_categories";
      if (tableType === "deposits") tableName = "deposit_categories";
      if (tableType === "withdrawals") tableName = "withdrawal_categories";
      if (tableType === "savings") tableName = "savings_categories";

      const categoryData = {
        name: categoryForm.name,
      };

      if (categoryForm.isEditing) {
        const { error } = await supabase
          .from(tableName)
          .update(categoryData)
          .eq("id", categoryForm.editId);

        if (error) throw error;
        toast.success("Category updated successfully!");
      } else {
        const { error } = await supabase
          .from(tableName)
          .insert(categoryData);

        if (error) throw error;
        toast.success("Category created successfully!");
      }

      setIsCategoryDialogOpen(false);
      setCategoryForm({
        name: "",
        description: "",
        isEditing: false,
        editId: "",
      });
      fetchCategories();
    } catch (error) {
      console.error("Error saving category:", error);
      const errorMessage =
        error?.message || error?.details || "Failed to save category";
      toast.error(`Error saving category: ${errorMessage}`);
    }
  };

  const savePaymentMode = async () => {
    // Payment modes are predefined, so we'll just show a message
    toast.info("Payment modes are predefined and cannot be modified");
    setIsPaymentModeDialogOpen(false);
    setPaymentModeForm({
      name: "",
      description: "",
      isEditing: false,
      editId: "",
    });
  };

  const editCategory = (category: Category) => {
    setCategoryForm({
      name: category.name,
      description: "",
      isEditing: true,
      editId: category.id,
    });
    setIsCategoryDialogOpen(true);
  };

  const editPaymentMode = (paymentMode: PaymentMode) => {
    toast.info("Payment modes are predefined and cannot be edited");
  };

  const deleteCategory = async (id: string) => {
    try {
      let tableName = "categories";
      if (tableType === "charging") tableName = "charging_categories";
      if (tableType === "expenses") tableName = "expense_categories";
      if (tableType === "deposits") tableName = "deposit_categories";
      if (tableType === "withdrawals") tableName = "withdrawal_categories";
      if (tableType === "savings") tableName = "savings_categories";

      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Category deleted successfully!");
      fetchCategories();
    } catch (error) {
      console.error("Error deleting category:", error);
      const errorMessage =
        error?.message || error?.details || "Failed to delete category";
      toast.error(`Error deleting category: ${errorMessage}`);
    }
  };

  const deletePaymentMode = (id: string) => {
    toast.info("Payment modes are predefined and cannot be deleted");
  };

  return (
    <div className="space-y-4">
      {/* Category Management */}
      {showCategories && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="category">Category</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Manage Categories</h4>
                    <Button
                      size="sm"
                      onClick={() => {
                        setCategoryForm({
                          name: "",
                          description: "",
                          isEditing: false,
                          editId: "",
                        });
                        setIsCategoryDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {categories.map((category) => (
                      <div
                        key={category.id}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded"
                      >
                        <span className="text-sm">{category.name}</span>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => editCategory(category)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteCategory(category.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <Select value={selectedCategory} onValueChange={onCategorySelect}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.name}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Payment Mode Management */}
      {showPaymentModes && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="paymentMode">Payment Mode</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Payment Modes (Predefined)</h4>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {paymentModes.map((paymentMode) => (
                      <div
                        key={paymentMode.id}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded"
                      >
                        <span className="text-sm">{paymentMode.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <Select
            value={selectedPaymentMode}
            onValueChange={onPaymentModeSelect}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select payment mode" />
            </SelectTrigger>
            <SelectContent>
              {paymentModes.map((paymentMode) => (
                <SelectItem key={paymentMode.id} value={paymentMode.name}>
                  {paymentMode.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Category Dialog */}
      <Dialog
        open={isCategoryDialogOpen}
        onOpenChange={setIsCategoryDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {categoryForm.isEditing ? "Edit Category" : "Add New Category"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="categoryName">Category Name *</Label>
              <Input
                id="categoryName"
                value={categoryForm.name}
                onChange={(e) =>
                  setCategoryForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Enter category name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCategoryDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={saveCategory}>
              <Save className="h-4 w-4 mr-2" />
              {categoryForm.isEditing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Mode Dialog */}
      <Dialog
        open={isPaymentModeDialogOpen}
        onOpenChange={setIsPaymentModeDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment Modes (Predefined)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Payment modes are predefined and cannot be modified.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsPaymentModeDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CategoryPaymentModeManager;
