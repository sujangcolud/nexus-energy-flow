
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Settings, 
  Tag,
  CreditCard 
} from "lucide-react";
import { toast } from "sonner";
import { extractErrorMessage, logError } from "@/utils/errorHandling";

interface Category {
  id: string;
  name: string;
  table_type?: string;
  description?: string;
  is_active?: boolean;
  created_at: string;
}

interface PaymentMode {
  id: string;
  name: string;
  table_type?: string;
  description?: string;
  is_active?: boolean;
  created_at: string;
}

interface CategoryPaymentModeManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

const CategoryPaymentModeManager: React.FC<CategoryPaymentModeManagerProps> = ({
  isOpen,
  onClose,
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentModes] = useState<PaymentMode[]>([
    { id: '1', name: 'Cash', created_at: new Date().toISOString() },
    { id: '2', name: 'eSewa', created_at: new Date().toISOString() },
    { id: '3', name: 'Fonepay', created_at: new Date().toISOString() },
    { id: '4', name: 'Bank Transfer', created_at: new Date().toISOString() },
  ]);
  const [loading, setLoading] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [selectedTab, setSelectedTab] = useState("categories");

  // Category table types
  const categoryTables = [
    "categories",
    "expense_categories", 
    "charging_categories",
    "deposit_categories",
    "withdrawal_categories",
    "savings_categories"
  ];

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const allCategories: Category[] = [];
      
      // Fetch from all category tables
      for (const table of categoryTables) {
        try {
          const { data, error } = await supabase
            .from(table)
            .select("*")
            .order("name");
          
          if (!error && data) {
            const categoriesWithType = data.map(item => ({
              ...item,
              table_type: table
            }));
            allCategories.push(...categoriesWithType);
          }
        } catch (err) {
          console.warn(`Could not fetch from ${table}:`, err);
        }
      }
      
      setCategories(allCategories);
    } catch (error) {
      logError("fetching categories", error);
      toast.error(`Error fetching categories: ${extractErrorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const addCategory = async (tableName: string) => {
    if (!newCategoryName.trim()) {
      toast.error("Please enter a category name");
      return;
    }

    try {
      const { error } = await supabase
        .from(tableName)
        .insert([{ name: newCategoryName.trim() }]);

      if (error) throw error;

      toast.success("Category added successfully!");
      setNewCategoryName("");
      fetchCategories();
    } catch (error) {
      logError("adding category", error);
      toast.error(`Error adding category: ${extractErrorMessage(error)}`);
    }
  };

  const updateCategory = async (category: Category) => {
    if (!category.table_type) {
      toast.error("Cannot update category without table type");
      return;
    }

    try {
      const { error } = await supabase
        .from(category.table_type)
        .update({ name: category.name })
        .eq("id", category.id);

      if (error) throw error;

      toast.success("Category updated successfully!");
      setEditingCategory(null);
      fetchCategories();
    } catch (error) {
      logError("updating category", error);
      toast.error(`Error updating category: ${extractErrorMessage(error)}`);
    }
  };

  const deleteCategory = async (category: Category) => {
    if (!category.table_type) {
      toast.error("Cannot delete category without table type");
      return;
    }

    if (!confirm(`Are you sure you want to delete "${category.name}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from(category.table_type)
        .delete()
        .eq("id", category.id);

      if (error) throw error;

      toast.success("Category deleted successfully!");
      fetchCategories();
    } catch (error) {
      logError("deleting category", error);
      toast.error(`Error deleting category: ${extractErrorMessage(error)}`);
    }
  };

  const getTableDisplayName = (tableName: string) => {
    return tableName
      .replace(/_/g, " ")
      .replace(/categories?/gi, "")
      .trim()
      .replace(/\b\w/g, l => l.toUpperCase()) || "General";
  };

  const groupedCategories = categories.reduce((acc, category) => {
    const key = category.table_type || "general";
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(category);
    return acc;
  }, {} as Record<string, Category[]>);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Category & Payment Mode Manager
          </DialogTitle>
        </DialogHeader>

        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="payment-modes">Payment Modes</TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Manage Categories
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Add New Category */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter new category name"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                  />
                  <select 
                    className="px-3 py-2 border rounded"
                    onChange={(e) => {
                      if (e.target.value && newCategoryName.trim()) {
                        addCategory(e.target.value);
                      }
                    }}
                  >
                    <option value="">Select table to add to</option>
                    {categoryTables.map(table => (
                      <option key={table} value={table}>
                        {getTableDisplayName(table)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Categories by Table */}
                {Object.entries(groupedCategories).map(([tableName, tableCategories]) => (
                  <div key={tableName} className="space-y-2">
                    <h3 className="text-lg font-semibold text-gray-800">
                      {getTableDisplayName(tableName)} Categories
                      <Badge variant="secondary" className="ml-2">
                        {tableCategories.length}
                      </Badge>
                    </h3>
                    
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tableCategories.map((category) => (
                            <TableRow key={`${category.table_type}-${category.id}`}>
                              <TableCell>
                                {editingCategory?.id === category.id ? (
                                  <Input
                                    value={editingCategory.name}
                                    onChange={(e) =>
                                      setEditingCategory({
                                        ...editingCategory,
                                        name: e.target.value,
                                      })
                                    }
                                  />
                                ) : (
                                  category.name
                                )}
                              </TableCell>
                              <TableCell>
                                {new Date(category.created_at).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  {editingCategory?.id === category.id ? (
                                    <>
                                      <Button
                                        size="sm"
                                        onClick={() => updateCategory(editingCategory)}
                                      >
                                        <Save className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setEditingCategory(null)}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setEditingCategory(category)}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => deleteCategory(category)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading categories...</p>
                  </div>
                )}

                {!loading && categories.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Tag className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No categories found. Add some categories to get started.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payment-modes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Modes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {paymentModes.map((mode) => (
                    <div
                      key={mode.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="font-medium">{mode.name}</p>
                          <p className="text-sm text-gray-500">
                            Standard payment method
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-green-100 text-green-800">
                        Active
                      </Badge>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> Payment modes are standardized across the system. 
                    They include Cash, eSewa, Fonepay, and Bank Transfer options that are 
                    used throughout all transaction forms.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryPaymentModeManager;
