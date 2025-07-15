import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Plus,
  Edit,
  Trash2,
  UtensilsCrossed,
  Sparkles,
  ChefHat,
  Star,
  Clock,
} from "lucide-react";

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

const MenuManagementTab = () => {
  const { user } = useAuth();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(0);
  const [category, setCategory] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);

  const categories = ["Beverages", "Snacks", "Meals", "Desserts", "Others"];

  const fetchMenuItems = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("menu_items")
        .select("*")
        .order("category", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;
      setMenuItems(data || []);
    } catch (error) {
      console.error("Error fetching menu items:", error);
      toast.error("Failed to load menu items");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenuItems();
  }, [user]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setPrice(0);
    setCategory("");
    setIsAvailable(true);
    setEditingItem(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name || !category || price <= 0) {
      toast.error("Please fill all required fields");
      return;
    }

    setSubmitting(true);
    try {
      const itemData = {
        name,
        description: description || null,
        price,
        category,
        is_available: isAvailable,
      };

      if (editingItem) {
        const { error } = await supabase
          .from("menu_items")
          .update({ ...itemData, updated_at: new Date().toISOString() })
          .eq("id", editingItem.id);

        if (error) throw error;
        toast.success("Menu item updated successfully!");
      } else {
        const { error } = await supabase.from("menu_items").insert(itemData);

        if (error) throw error;
        toast.success("Menu item added successfully!");
      }

      resetForm();
      fetchMenuItems();
    } catch (error) {
      console.error("Error saving menu item:", error);
      toast.error("Failed to save menu item");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setName(item.name);
    setDescription(item.description || "");
    setPrice(item.price);
    setCategory(item.category);
    setIsAvailable(item.is_available);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("menu_items").delete().eq("id", id);

      if (error) throw error;

      toast.success("Menu item deleted successfully");
      fetchMenuItems();
    } catch (error) {
      console.error("Error deleting menu item:", error);
      toast.error("Failed to delete menu item");
    }
  };

  const toggleAvailability = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("menu_items")
        .update({
          is_available: !currentStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      toast.success(`Menu item ${!currentStatus ? "enabled" : "disabled"}`);
      fetchMenuItems();
    } catch (error) {
      console.error("Error updating menu item:", error);
      toast.error("Failed to update menu item");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-64 h-64 bg-gradient-to-r from-amber-400/20 to-orange-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute top-1/3 right-20 w-80 h-80 bg-gradient-to-r from-orange-400/20 to-red-500/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
        <div
          className="absolute bottom-20 left-1/4 w-72 h-72 bg-gradient-to-r from-yellow-400/20 to-amber-500/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>
      </div>

      <div className="relative z-10 space-y-8 p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-xl animate-pulse">
              <UtensilsCrossed className="h-8 w-8" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 bg-clip-text text-transparent">
              Menu Management
            </h1>
            <Sparkles className="h-8 w-8 text-orange-500 animate-bounce" />
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Create and manage your restaurant menu with style and efficiency
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-600 font-medium">
                    Total Items
                  </p>
                  <p className="text-2xl font-bold text-amber-800">
                    {menuItems.length}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl text-white">
                  <ChefHat className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-600 font-medium">
                    Available
                  </p>
                  <p className="text-2xl font-bold text-orange-800">
                    {menuItems.filter((item) => item.is_available).length}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl text-white">
                  <Star className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-pink-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600 font-medium">Categories</p>
                  <p className="text-2xl font-bold text-red-800">
                    {new Set(menuItems.map((item) => item.category)).size}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl text-white">
                  <UtensilsCrossed className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-600 font-medium">
                    Avg. Price
                  </p>
                  <p className="text-2xl font-bold text-yellow-800">
                    Rs.{" "}
                    {menuItems.length > 0
                      ? (
                          menuItems.reduce((sum, item) => sum + item.price, 0) /
                          menuItems.length
                        ).toFixed(0)
                      : "0"}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-xl text-white">
                  <Clock className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Menu Item Form */}
        <Card className="bg-gradient-to-br from-white/90 to-amber-50/90 backdrop-blur-sm border-0 shadow-2xl">
          <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-white/20 rounded-lg">
                <Plus className="h-6 w-6" />
              </div>
              {editingItem ? "Edit Menu Item" : "Add New Menu Item"}
              <Sparkles className="h-5 w-5 animate-pulse" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <ChefHat className="h-4 w-4 text-amber-600" />
                  Item Name *
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter item name"
                  required
                  className="border-amber-200 focus:border-amber-500 focus:ring-amber-500 h-12"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <UtensilsCrossed className="h-4 w-4 text-orange-600" />
                  Category *
                </label>
                <Select value={category} onValueChange={setCategory} required>
                  <SelectTrigger className="border-orange-200 focus:border-orange-500 h-12">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Star className="h-4 w-4 text-red-600" />
                  Price (Rs.) *
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  required
                  className="border-red-200 focus:border-red-500 focus:ring-red-500 h-12"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Edit className="h-4 w-4 text-yellow-600" />
                  Description
                </label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter item description"
                  rows={2}
                  className="border-yellow-200 focus:border-yellow-500 focus:ring-yellow-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-green-600" />
                  Available
                </label>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={isAvailable}
                    onCheckedChange={setIsAvailable}
                  />
                  <span
                    className={`text-sm font-medium ${isAvailable ? "text-green-600" : "text-red-600"}`}
                  >
                    {isAvailable ? "Available" : "Unavailable"}
                  </span>
                </div>
              </div>

              <div className="md:col-span-2 lg:col-span-3 flex gap-4">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="h-12 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-600 hover:via-orange-600 hover:to-red-600 text-white font-semibold shadow-lg transition-all duration-300 transform hover:scale-105"
                >
                  {submitting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      Saving...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {editingItem ? (
                        <Edit className="h-5 w-5" />
                      ) : (
                        <Plus className="h-5 w-5" />
                      )}
                      {editingItem ? "Update Item" : "Add Item"}
                    </div>
                  )}
                </Button>
                {editingItem && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    className="h-12 hover:bg-gray-50 border-gray-300"
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Menu Items List */}
        <Card className="bg-gradient-to-br from-white/90 to-orange-50/90 backdrop-blur-sm border-0 shadow-2xl">
          <CardHeader className="bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-white/20 rounded-lg">
                <UtensilsCrossed className="h-6 w-6" />
              </div>
              Menu Items ({menuItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-10">
                <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-full animate-spin mx-auto flex items-center justify-center mb-4">
                  <UtensilsCrossed className="h-8 w-8 text-white" />
                </div>
                <p className="text-gray-600">Loading menu items...</p>
              </div>
            ) : menuItems.length === 0 ? (
              <div className="text-center py-12">
                <UtensilsCrossed className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <p className="text-xl font-semibold text-gray-700 mb-2">
                  No menu items found
                </p>
                <p className="text-gray-500">
                  Add your first menu item above to get started.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-gray-50 to-orange-50">
                      <TableHead className="font-semibold text-gray-700">
                        Name
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        Category
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        Price
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        Description
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        Status
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {menuItems.map((item, index) => (
                      <TableRow
                        key={item.id}
                        className="hover:bg-gradient-to-r hover:from-orange-50 hover:to-red-50 transition-all duration-200"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <TableCell className="font-medium">
                          {item.name}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0">
                            {item.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold text-amber-700">
                          Rs. {item.price}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {item.description || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={item.is_available}
                              onCheckedChange={() =>
                                toggleAvailability(item.id, item.is_available)
                              }
                            />
                            <Badge
                              className={
                                item.is_available
                                  ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0"
                                  : "bg-gradient-to-r from-gray-500 to-slate-500 text-white border-0"
                              }
                            >
                              {item.is_available ? "Available" : "Unavailable"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(item)}
                              className="hover:bg-blue-50 hover:border-blue-300"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(item.id)}
                              className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MenuManagementTab;
