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
import { Plus, Edit, Trash2, UtensilsCrossed } from "lucide-react";

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  is_available: boolean;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
}

const MenuManagementTab = () => {
  const { user } = useAuth();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(0);
  const [category, setCategory] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);

  const fetchMenuItems = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from("menu_items").select("*").order("category").order("name");
      if (error) throw error;
      setMenuItems(data || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to load menu items");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase.from("categories").select("*").order("name");
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  useEffect(() => {
    fetchMenuItems();
    fetchCategories();
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
      const itemData = { name, description: description || null, price, category, is_available: isAvailable };
      if (editingItem) {
        const { error } = await supabase.from("menu_items").update({ ...itemData, updated_at: new Date().toISOString() }).eq("id", editingItem.id);
        if (error) throw error;
        toast.success("Item updated!");
      } else {
        const { error } = await supabase.from("menu_items").insert(itemData);
        if (error) throw error;
        toast.success("Item added!");
      }
      resetForm();
      fetchMenuItems();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to save item");
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
      toast.success("Item deleted");
      fetchMenuItems();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to delete");
    }
  };

  const toggleAvailability = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from("menu_items").update({ is_available: !currentStatus, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
      toast.success(`Item ${!currentStatus ? "enabled" : "disabled"}`);
      fetchMenuItems();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to update");
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory) {
      toast.error("Enter category name");
      return;
    }
    try {
      const { error } = await supabase.from("categories").insert({ name: newCategory });
      if (error) throw error;
      toast.success(`Category "${newCategory}" added`);
      setNewCategory("");
      fetchCategories();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to add category");
    }
  };

  return (
    <div className="min-h-screen bg-background p-2 md:p-6 pb-24 md:pb-6">
      <div className="space-y-4 md:space-y-6">
        <div className="bg-primary/5 p-4 rounded-3xl mb-4 md:mb-6 flex items-center gap-3">
          <div className="p-2 bg-primary rounded-xl text-white">
            <UtensilsCrossed className="h-5 w-5 md:h-6 md:w-6" />
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Menu Management</h1>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <Card className="rounded-3xl border-none bg-white shadow-sm overflow-hidden">
            <CardContent className="p-4 md:p-6">
              <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Total Items</p>
              <p className="text-sm md:text-xl font-bold text-foreground">{menuItems.length}</p>
            </CardContent>
          </Card>
          <Card className="rounded-3xl border-none bg-white shadow-sm overflow-hidden">
            <CardContent className="p-4 md:p-6">
              <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Available</p>
              <p className="text-sm md:text-xl font-bold text-primary">{menuItems.filter(i => i.is_available).length}</p>
            </CardContent>
          </Card>
          <Card className="rounded-3xl border-none bg-white shadow-sm overflow-hidden hidden md:block">
            <CardContent className="p-4 md:p-6">
              <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Categories</p>
              <p className="text-sm md:text-xl font-bold text-foreground">{categories.length}</p>
            </CardContent>
          </Card>
          <Card className="rounded-3xl border-none bg-white shadow-sm overflow-hidden">
            <CardContent className="p-4 md:p-6">
              <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Avg Price</p>
              <p className="text-sm md:text-xl font-bold text-foreground">Rs. {menuItems.length > 0 ? (menuItems.reduce((s, i) => s + i.price, 0) / menuItems.length).toFixed(0) : "0"}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-muted/50/50 border-b border-border px-4 md:px-6 py-4">
                <CardTitle className="text-base md:text-lg font-bold">{editingItem ? "Edit Item" : "Add Item"}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-6">
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5"><label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Name *</label><Input value={name} onChange={(e) => setName(e.target.value)} required className="h-11 rounded-xl" /></div>
                  <div className="space-y-1.5"><label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Category *</label><Select value={category} onValueChange={setCategory}><SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-1.5"><label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Price *</label><Input type="number" value={price} onChange={(e) => setPrice(parseFloat(e.target.value) || 0)} required className="h-11 rounded-xl" /></div>
                  <div className="md:col-span-2 space-y-1.5"><label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="rounded-xl" /></div>
                  <div className="space-y-1.5"><label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Available</label><div className="flex items-center gap-3 mt-2 bg-muted/50 w-fit p-2 rounded-xl border border-border"><Switch checked={isAvailable} onCheckedChange={setIsAvailable} /><span className="text-sm font-medium">{isAvailable ? "Yes" : "No"}</span></div></div>
                  <div className="md:col-span-3 flex gap-2 pt-2">
                    <Button type="submit" disabled={submitting} className="h-11 rounded-xl px-8 font-bold shadow-lg shadow-primary/20">{submitting ? "Saving..." : editingItem ? "Update Item" : "Add Item"}</Button>
                    {editingItem && <Button type="button" variant="outline" onClick={resetForm} className="h-11 rounded-xl font-bold">Cancel</Button>}
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-muted/50/50 border-b border-border px-4 md:px-6 py-4">
                <CardTitle className="text-base md:text-lg font-bold">Menu Items</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {menuItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell>Rs. {item.price}</TableCell>
                        <TableCell>
                          <Switch checked={item.is_available} onCheckedChange={() => toggleAvailability(item.id, item.is_available)} />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleEdit(item)}><Edit className="h-3 w-3" /></Button>
                            <Button variant="outline" size="sm" onClick={() => handleDelete(item.id)}><Trash2 className="h-3 w-3" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-muted/50/50 border-b border-border px-4 md:px-6 py-4">
                <CardTitle className="text-base md:text-lg font-bold">Categories</CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-6">
                <form onSubmit={handleAddCategory} className="flex gap-2 mb-6">
                  <Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="New category" className="h-11 rounded-xl" />
                  <Button type="submit" className="h-11 w-11 rounded-xl p-0"><Plus className="h-5 w-5" /></Button>
                </form>
                <div className="space-y-2">
                  {categories.map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-2xl border border-border">
                      <span className="text-sm font-medium">{c.name}</span>
                      <Badge variant="secondary" className="rounded-lg">{menuItems.filter(i => i.category === c.name).length}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MenuManagementTab;
