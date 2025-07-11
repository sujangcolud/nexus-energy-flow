
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, UtensilsCrossed } from 'lucide-react';

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
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(0);
  const [category, setCategory] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);

  const categories = ['Beverages', 'Snacks', 'Meals', 'Desserts', 'Others'];

  const fetchMenuItems = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setMenuItems(data || []);
    } catch (error) {
      console.error('Error fetching menu items:', error);
      toast.error('Failed to load menu items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenuItems();
  }, [user]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setPrice(0);
    setCategory('');
    setIsAvailable(true);
    setEditingItem(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name || !category || price <= 0) {
      toast.error('Please fill all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const itemData = {
        name,
        description: description || null,
        price,
        category,
        is_available: isAvailable
      };

      if (editingItem) {
        const { error } = await supabase
          .from('menu_items')
          .update({ ...itemData, updated_at: new Date().toISOString() })
          .eq('id', editingItem.id);

        if (error) throw error;
        toast.success('Menu item updated successfully!');
      } else {
        const { error } = await supabase
          .from('menu_items')
          .insert(itemData);

        if (error) throw error;
        toast.success('Menu item added successfully!');
      }
      
      resetForm();
      fetchMenuItems();
    } catch (error) {
      console.error('Error saving menu item:', error);
      toast.error('Failed to save menu item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setName(item.name);
    setDescription(item.description || '');
    setPrice(item.price);
    setCategory(item.category);
    setIsAvailable(item.is_available);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Menu item deleted successfully');
      fetchMenuItems();
    } catch (error) {
      console.error('Error deleting menu item:', error);
      toast.error('Failed to delete menu item');
    }
  };

  const toggleAvailability = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ is_available: !currentStatus, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      toast.success(`Menu item ${!currentStatus ? 'enabled' : 'disabled'}`);
      fetchMenuItems();
    } catch (error) {
      console.error('Error updating menu item:', error);
      toast.error('Failed to update menu item');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <UtensilsCrossed className="h-5 w-5 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900">Menu Management</h2>
      </div>

      {/* Menu Item Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Item Name *</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter item name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Category *</label>
              <Select value={category} onValueChange={setCategory} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Price (Rs.) *</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                required
              />
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter item description"
                rows={2}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Available</label>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={isAvailable}
                  onCheckedChange={setIsAvailable}
                />
                <span className="text-sm">{isAvailable ? 'Yes' : 'No'}</span>
              </div>
            </div>
            
            <div className="md:col-span-2 lg:col-span-3 flex gap-4">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : editingItem ? 'Update Item' : 'Add Item'}
              </Button>
              {editingItem && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Menu Items List */}
      <Card>
        <CardHeader>
          <CardTitle>Menu Items ({menuItems.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading menu items...</div>
          ) : menuItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No menu items found. Add your first menu item above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {menuItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.category}</Badge>
                      </TableCell>
                      <TableCell>Rs. {item.price}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {item.description || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={item.is_available}
                            onCheckedChange={() => toggleAvailability(item.id, item.is_available)}
                          />
                          <Badge variant={item.is_available ? "default" : "secondary"}>
                            {item.is_available ? 'Available' : 'Unavailable'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(item)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(item.id)}
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
  );
};

export default MenuManagementTab;
