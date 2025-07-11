
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { ShoppingCart, Plus, Trash2 } from 'lucide-react';

interface Order {
  id: string;
  item_name: string;
  quantity: number;
  rate: number;
  total: number;
  payment_mode: string;
  order_date: string;
  created_at: string;
}

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  is_available: boolean;
}

const OrdersTab = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [selectedMenuItem, setSelectedMenuItem] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [paymentMode, setPaymentMode] = useState('');

  const fetchOrders = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchMenuItems = async () => {
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('is_available', true)
        .order('category')
        .order('name');

      if (error) throw error;
      setMenuItems(data || []);
    } catch (error) {
      console.error('Error fetching menu items:', error);
      toast.error('Failed to load menu items');
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchMenuItems();
  }, [user]);

  const getSelectedItem = () => {
    return menuItems.find(item => item.id === selectedMenuItem);
  };

  const calculateTotal = () => {
    const item = getSelectedItem();
    return item ? item.price * quantity : 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedMenuItem || !paymentMode || quantity <= 0) {
      toast.error('Please fill all required fields');
      return;
    }

    const selectedItem = getSelectedItem();
    if (!selectedItem) {
      toast.error('Selected item not found');
      return;
    }

    setSubmitting(true);
    try {
      const total = selectedItem.price * quantity;
      const { error } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          item_name: selectedItem.name,
          quantity,
          rate: selectedItem.price,
          total,
          payment_mode: paymentMode
        });

      if (error) throw error;

      toast.success('Order submitted successfully!');
      
      // Reset form
      setSelectedMenuItem('');
      setQuantity(1);
      setPaymentMode('');
      
      // Refresh orders
      fetchOrders();
    } catch (error) {
      console.error('Error submitting order:', error);
      toast.error('Failed to submit order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Order deleted successfully');
      fetchOrders();
    } catch (error) {
      console.error('Error deleting order:', error);
      toast.error('Failed to delete order');
    }
  };

  // Group menu items by category
  const groupedMenuItems = menuItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ShoppingCart className="h-5 w-5 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900">Orders Management</h2>
      </div>

      {/* Order Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add New Order
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Menu Item</label>
              <Select value={selectedMenuItem} onValueChange={setSelectedMenuItem} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select menu item" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(groupedMenuItems).map(([category, items]) => (
                    <div key={category}>
                      <div className="px-2 py-1 text-sm font-semibold text-gray-500 bg-gray-50">
                        {category}
                      </div>
                      {items.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          <div className="flex justify-between items-center w-full">
                            <span>{item.name}</span>
                            <span className="ml-2 text-sm text-gray-500">Rs. {item.price}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
              {getSelectedItem() && (
                <p className="text-xs text-gray-500">{getSelectedItem()?.description}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Quantity</label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Mode</label>
              <Select value={paymentMode} onValueChange={setPaymentMode} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Esewa">Esewa</SelectItem>
                  <SelectItem value="Fonepay">Fonepay</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Total Amount</label>
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                <span className="text-lg font-semibold">Rs. {calculateTotal().toFixed(2)}</span>
              </div>
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? 'Submitting...' : 'Submit Order'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Orders List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders ({orders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading orders...</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No orders found. Create your first order above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.item_name}</TableCell>
                      <TableCell>{order.quantity}</TableCell>
                      <TableCell>Rs. {order.rate}</TableCell>
                      <TableCell>Rs. {order.total}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{order.payment_mode}</Badge>
                      </TableCell>
                      <TableCell>{new Date(order.order_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(order.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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

export default OrdersTab;
