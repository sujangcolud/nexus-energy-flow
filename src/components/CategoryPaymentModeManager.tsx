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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { extractErrorMessage, logError } from "@/utils/errorHandling";
import {
  Plus,
  Edit,
  Trash2,
  Settings,
  Tag,
  CreditCard,
  Save,
  X,
} from "lucide-react";

interface Category {
  id: string;
  name: string;
  table_type: string;
  description: string;
  is_active: boolean;
}

interface PaymentMode {
  id: string;
  name: string;
  table_type: string;
  description: string;
  is_active: boolean;
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
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .in("table_type", [tableType, "all"])
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
      const { data, error } = await supabase
        .from("payment_modes")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .in("table_type", [tableType, "all"])
        .order("name");

      if (error) throw error;
      setPaymentModes(data || []);
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
      const categoryData = {
        user_id: user.id,
        name: categoryForm.name,
        table_type: tableType,
        description: categoryForm.description,
        is_active: true,
      };

      if (categoryForm.isEditing) {
        const { error } = await supabase
          .from("categories")
          .update(categoryData)
          .eq("id", categoryForm.editId);

        if (error) throw error;
        toast.success("Category updated successfully!");
      } else {
        const { error } = await supabase
          .from("categories")
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
    if (!user || !paymentModeForm.name) {
      toast.error("Payment mode name is required");
      return;
    }

    try {
      const paymentModeData = {
        user_id: user.id,
        name: paymentModeForm.name,
        table_type: tableType,
        description: paymentModeForm.description,
        is_active: true,
      };

      if (paymentModeForm.isEditing) {
        const { error } = await supabase
          .from("payment_modes")
          .update(paymentModeData)
          .eq("id", paymentModeForm.editId);

        if (error) throw error;
        toast.success("Payment mode updated successfully!");
      } else {
        const { error } = await supabase
          .from("payment_modes")
          .insert(paymentModeData);

        if (error) throw error;
        toast.success("Payment mode created successfully!");
      }

      setIsPaymentModeDialogOpen(false);
      setPaymentModeForm({
        name: "",
        description: "",
        isEditing: false,
        editId: "",
      });
      fetchPaymentModes();
    } catch (error) {
      console.error("Error saving payment mode:", error);
      const errorMessage =
        error?.message || error?.details || "Failed to save payment mode";
      toast.error(`Error saving payment mode: ${errorMessage}`);
    }
  };

  const editCategory = (category: Category) => {
    setCategoryForm({
      name: category.name,
      description: category.description,
      isEditing: true,
      editId: category.id,
    });
    setIsCategoryDialogOpen(true);
  };

  const editPaymentMode = (paymentMode: PaymentMode) => {
    setPaymentModeForm({
      name: paymentMode.name,
      description: paymentMode.description,
      isEditing: true,
      editId: paymentMode.id,
    });
    setIsPaymentModeDialogOpen(true);
  };

  const deleteCategory = async (id: string) => {
    try {
      const { error } = await supabase
        .from("categories")
        .update({ is_active: false })
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

  const deletePaymentMode = async (id: string) => {
    try {
      const { error } = await supabase
        .from("payment_modes")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
      toast.success("Payment mode deleted successfully!");
      fetchPaymentModes();
    } catch (error) {
      console.error("Error deleting payment mode:", error);
      const errorMessage =
        error?.message || error?.details || "Failed to delete payment mode";
      toast.error(`Error deleting payment mode: ${errorMessage}`);
    }
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
                    <h4 className="font-medium">Manage Payment Modes</h4>
                    <Button
                      size="sm"
                      onClick={() => {
                        setPaymentModeForm({
                          name: "",
                          description: "",
                          isEditing: false,
                          editId: "",
                        });
                        setIsPaymentModeDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {paymentModes.map((paymentMode) => (
                      <div
                        key={paymentMode.id}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded"
                      >
                        <span className="text-sm">{paymentMode.name}</span>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => editPaymentMode(paymentMode)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deletePaymentMode(paymentMode.id)}
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
            <div>
              <Label htmlFor="categoryDescription">Description</Label>
              <Textarea
                id="categoryDescription"
                value={categoryForm.description}
                onChange={(e) =>
                  setCategoryForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Enter category description"
                rows={3}
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
            <DialogTitle>
              {paymentModeForm.isEditing
                ? "Edit Payment Mode"
                : "Add New Payment Mode"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="paymentModeName">Payment Mode Name *</Label>
              <Input
                id="paymentModeName"
                value={paymentModeForm.name}
                onChange={(e) =>
                  setPaymentModeForm((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                placeholder="Enter payment mode name"
              />
            </div>
            <div>
              <Label htmlFor="paymentModeDescription">Description</Label>
              <Textarea
                id="paymentModeDescription"
                value={paymentModeForm.description}
                onChange={(e) =>
                  setPaymentModeForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Enter payment mode description"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPaymentModeDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={savePaymentMode}>
              <Save className="h-4 w-4 mr-2" />
              {paymentModeForm.isEditing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CategoryPaymentModeManager;
