
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { ShoppingCart, Plus, Minus, Trash2, Package, Filter } from 'lucide-react';

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

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

const OrdersTab = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMode, setPaymentMode] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');


  const paymentModes = [
    'Cash',
    'UPI',
    'Card',
    'Net Banking'
  ];

  const fetchOrders = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
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
        .order('category', { ascending: true });

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

  const addToCart = (menuItem: MenuItem) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === menuItem.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.id === menuItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prevCart, {
          id: menuItem.id,
          name: menuItem.name,
          price: menuItem.price,
          quantity: 1
        }];
      }
    });
    toast.success(`${menuItem.name} added to cart`);
  };

  const updateCartQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }
    setCart(prevCart =>
      prevCart.map(item =>
        item.id === id ? { ...item, quantity } : item
      )
    );
  };

  const removeFromCart = (id: string) => {
    setCart(prevCart => prevCart.filter(item => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const submitOrder = async () => {
    if (!user || cart.length === 0 || !paymentMode) {
      toast.error('Please add items to cart and select payment mode');
      return;
    }

    setSubmitting(true);
    try {
      const orderPromises = cart.map(item => 
        supabase.from('orders').insert({
          user_id: user.id,
          item_name: item.name,
          quantity: item.quantity,
          rate: item.price,
          total: item.price * item.quantity,
          payment_mode: paymentMode,
          order_date: new Date().toISOString().split('T')[0]
        })
      );

      const results = await Promise.all(orderPromises);
      
      // Check if any insert failed
      const failed = results.find(result => result.error);
      if (failed) throw failed.error;

      toast.success('Order placed successfully!');
      clearCart();
      setPaymentMode('');
      fetchOrders();
    } catch (error) {
      console.error('Error submitting order:', error);
      toast.error('Failed to place order');
    } finally {
      setSubmitting(false);
    }
  };

  const groupedMenuItems = menuItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  const productCategories = Object.keys(groupedMenuItems);

  useEffect(() => {
    if (productCategories.length > 0 && !selectedCategory) {
      setSelectedCategory(productCategories[0]);
    }
  }, [productCategories, selectedCategory]);

  const filteredMenuItems = () => {
    let itemsToDisplay = groupedMenuItems;

    if (selectedCategory) {
      itemsToDisplay = { [selectedCategory]: groupedMenuItems[selectedCategory] || [] };
    }

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      const result: Record<string, MenuItem[]> = {};
      for (const category in itemsToDisplay) {
        result[category] = itemsToDisplay[category].filter(item =>
          item.name.toLowerCase().includes(lowerSearchTerm) ||
          item.category.toLowerCase().includes(lowerSearchTerm) ||
          (item.description && item.description.toLowerCase().includes(lowerSearchTerm))
        );
      }
      itemsToDisplay = result;
    }
    return itemsToDisplay;
  };

  const currentMenuItemsToDisplay = filteredMenuItems();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ShoppingCart className="h-5 w-5 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900">Food Orders</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Menu Items */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Menu Items
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search and Category Filters */}
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="flex-grow">
                  <Input
                    placeholder="Search menu items..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-gray-500" />
                  <Select value={selectedCategory || 'All'} onValueChange={(value) => setSelectedCategory(value === 'All' ? null : value)}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Categories</SelectItem>
                      {productCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {Object.keys(currentMenuItemsToDisplay).length === 0 && searchTerm && (
                <div className="text-center py-8 text-gray-500">
                  No items match your search for "{searchTerm}".
                </div>
              )}

              {Object.entries(currentMenuItemsToDisplay).map(([category, items]) => {
                if (items.length === 0) return null; // Don't render category if no items after filter
                return (
                  <div key={category} className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                      {category}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {items.map((item) => (
                        <Card key={item.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4 flex flex-col h-full">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-medium text-gray-900">{item.name}</h4>
                              <Badge variant="secondary">₹{item.price}</Badge>
                            </div>
                            {item.description && (
                              <p className="text-sm text-gray-600 mb-3 line-clamp-2 flex-grow">
                                {item.description}
                              </p>
                            )}
                             {!item.description && <div className="flex-grow"></div>} {/* Ensure button aligns if no description */}
                            <Button
                              onClick={() => addToCart(item)}
                              size="sm"
                              className="w-full mt-auto" // mt-auto pushes button to bottom
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add to Cart
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
              {menuItems.length === 0 && !searchTerm && (
                <div className="text-center py-8 text-gray-500">
                  No menu items available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Cart */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Cart ({cart.length})
                </span>
                {cart.length > 0 && (
                  <Button variant="outline" size="sm" onClick={clearCart}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Your cart is empty
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{item.name}</h4>
                          <p className="text-xs text-gray-600">₹{item.price} each</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                            className="h-8 w-8 p-0"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-sm font-medium w-8 text-center">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                            className="h-8 w-8 p-0"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex justify-between items-center font-semibold">
                      <span>Total:</span>
                      <span>₹{getCartTotal().toFixed(2)}</span>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="payment-mode">Payment Mode</Label>
                      <Select value={paymentMode} onValueChange={setPaymentMode}>
                        <SelectTrigger>
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

                    <Button 
                      onClick={submitOrder} 
                      disabled={submitting || !paymentMode}
                      className="w-full"
                    >
                      {submitting ? 'Placing Order...' : 'Place Order'}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Order History */}
      <Card>
        <CardHeader>
          <CardTitle>Order History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading orders...</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No orders found. Place your first order above!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Payment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        {new Date(order.order_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-medium">{order.item_name}</TableCell>
                      <TableCell>{order.quantity}</TableCell>
                      <TableCell>₹{Number(order.rate).toFixed(2)}</TableCell>
                      <TableCell>₹{Number(order.total).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{order.payment_mode}</Badge>
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
