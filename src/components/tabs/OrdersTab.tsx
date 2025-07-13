
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
import { ShoppingCart, Plus, Minus, Trash2, Package, Filter, Calendar as CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import useTableControls from '@/hooks/useTableControls';

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
  const {
    page,
    range,
    onPageChange,
    onRangeChange,
    itemsPerPage,
  } = useTableControls();


  const paymentModes = [
    'Cash',
    'Esewa',
    'Fonepay',
    'Bank',
    'Cheque',
    'Credit'
  ];

  const fetchOrders = async () => {
    if (!user) return;

    setLoading(true);
    try {
      let query = supabase
        .from('orders')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id);

      if (range?.from) {
        query = query.gte('order_date', format(range.from, 'yyyy-MM-dd'));
      }
      if (range?.to) {
        query = query.lte('order_date', format(range.to, 'yyyy-MM-dd'));
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range((page - 1) * itemsPerPage, page * itemsPerPage - 1);

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
  }, [user, page, range]);

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
    <div className="space-y-6"> {/* Removed top padding pt-4 md:pt-6 */}
      <div className="flex items-center gap-2">
        <ShoppingCart className="h-5 w-5 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900">Food Orders</h2>
      </div>

      {/* Main content grid: Menu Items on the left, Cart on the right for larger screens */}
      {/* Stacks vertically on smaller screens (default behavior of grid without specific small screen column defs) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8"> {/* Adjusted gap for lg */}
        {/* Menu Items Section */}
        <div className="md:col-span-2 space-y-6">
          <Card className="shadow-sm"> {/* Added subtle shadow to menu card container */}
            <CardHeader className="border-b border-border/50"> {/* Added border to header */}
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
              </div>
              <div className="flex items-center gap-2 mb-6 flex-wrap pb-2"> {/* Increased mb, added pb for spacing */}
                <Filter className="h-5 w-5 text-muted-foreground" /> {/* Changed text-gray-500 to text-muted-foreground */}
                <Button
                  key="all-categories"
                  onClick={() => setSelectedCategory(null)}
                  variant={selectedCategory === null ? 'default' : 'secondary'} // Changed outline to secondary for inactive
                  size="sm"
                  className={`transition-all duration-150 ease-in-out ${selectedCategory === null ? 'shadow-md' : 'hover:bg-accent hover:text-accent-foreground'}`}
                >
                  All Categories
                </Button>
                {productCategories.map((category) => (
                  <Button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    variant={selectedCategory === category ? 'default' : 'secondary'} // Changed outline to secondary for inactive
                    size="sm"
                    className={`transition-all duration-150 ease-in-out ${selectedCategory === category ? 'shadow-md' : 'hover:bg-accent hover:text-accent-foreground'}`}
                  >
                    {category}
                  </Button>
                ))}
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
                    <h3 className="text-lg font-semibold text-gray-800 border-b border-border/50 pb-2.5 mb-3">
                      {category}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {items.map((item) => (
                        <Card
                          key={item.id}
                          className="flex flex-col h-full transition-all duration-200 ease-in-out hover:shadow-lg hover:ring-1 hover:ring-primary/50 transform hover:scale-[1.02] cursor-pointer group border border-border/50 rounded-md overflow-hidden" // Adjusted shadow, ring, border, rounded
                          onClick={() => addToCart(item)}
                        >
                          <CardContent className="p-3 flex flex-col flex-grow"> {/* Reduced padding to p-3 */}
                            <div className="flex justify-between items-start mb-1.5"> {/* Reduced mb */}
                              <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-200 group-hover:text-primary transition-colors line-clamp-2"> {/* Adjusted text size, color, line-clamp */}
                                {item.name}
                              </h4>
                              <Badge variant="outline" className="text-xs px-1.5 py-0.5">NRs. {item.price}</Badge> {/* Currency updated, adjusted badge style & padding */}
                            </div>
                            {item.description && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-1 flex-grow"> {/* Adjusted text size, color, mb, line-clamp */}
                                {item.description}
                              </p>
                            )}
                            {!item.description && <div className="flex-grow min-h-[1rem]"></div>} {/* Adjusted min-h */}
                            {/* "Add to Cart" button is intentionally removed as per user request - card itself is clickable */}
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
            <CardHeader className="bg-muted/30 dark:bg-muted/50 border-b border-border/50">
              <CardTitle className="flex items-center justify-between text-lg">
                <span className="flex items-center gap-2.5 text-primary font-semibold">
                  <ShoppingCart className="h-5 w-5" />
                  Your Cart ({cart.length})
                </span>
                {cart.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearCart} className="text-muted-foreground hover:text-destructive transition-colors group">
                    <Trash2 className="h-4 w-4 mr-1.5 group-hover:animate-shake" /> Clear Cart
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-5">
              {cart.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground flex flex-col items-center justify-center min-h-[300px]">
                  <ShoppingCart className="h-16 w-16 mb-4 text-gray-300 dark:text-gray-700 opacity-70" />
                  <p className="font-semibold text-lg mb-1">Your cart is empty</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Looks like you haven't added anything yet.</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Time to explore the menu!</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2.5 max-h-[280px] md:max-h-[320px] overflow-y-auto pr-1 simple-scrollbar">
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-background hover:bg-muted/30 dark:hover:bg-muted/20 rounded-lg border border-border/70 hover:border-primary/30 transition-all duration-150 ease-in-out group">
                        <div className="flex-1 mr-2 min-w-0">
                          <h4 className="font-medium text-sm truncate group-hover:text-primary transition-colors" title={item.name}>{item.name}</h4>
                          <p className="text-xs text-muted-foreground">NRs. {item.price} each</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                            className="h-7 w-7 border-border/70 hover:bg-red-500/10 hover:border-red-500/70 group/qty"
                            aria-label={`Decrease quantity of ${item.name}`}
                          >
                            <Minus className="h-3.5 w-3.5 text-muted-foreground group-hover/qty:text-red-500 transition-colors" />
                          </Button>
                          <span className="text-sm font-semibold w-7 text-center tabular-nums">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                            className="h-7 w-7 border-border/70 hover:bg-green-500/10 hover:border-green-500/70 group/qty"
                            aria-label={`Increase quantity of ${item.name}`}
                          >
                            <Plus className="h-3.5 w-3.5 text-muted-foreground group-hover/qty:text-green-500 transition-colors" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFromCart(item.id)}
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            aria-label={`Remove ${item.name} from cart`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Separator className="my-4 border-border/50" />

                  <div className="space-y-4">
                    <div className="flex justify-between items-center font-bold text-lg">
                      <span>Total:</span>
                      <span className="text-primary">NRs. {getCartTotal().toFixed(2)}</span>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="payment-mode" className="text-sm font-medium text-foreground/90">Payment Mode</Label>
                      <Select value={paymentMode} onValueChange={setPaymentMode} disabled={submitting || cart.length === 0}>
                        <SelectTrigger className="w-full text-sm py-2.5 border-border/70 focus:border-primary focus:ring-1 focus:ring-primary/50 transition-colors">
                          <SelectValue placeholder="Choose payment method" />
                        </SelectTrigger>
                        <SelectContent>
                          {paymentModes.map((mode) => (
                            <SelectItem key={mode} value={mode} className="text-sm">
                              {mode}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button 
                      onClick={submitOrder} 
                      disabled={submitting || !paymentMode || cart.length === 0}
                      size="lg"
                      className="w-full font-semibold bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-md hover:shadow-lg focus-visible:ring-2 focus-visible:ring-green-400 focus-visible:ring-offset-2 transition-all duration-200 ease-in-out transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
                      aria-label="Place your order"
                    >
                      {submitting ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2.5 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Placing Order...
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="h-5 w-5 mr-2.5" />
                          Place Order (NRs. {getCartTotal().toFixed(2)})
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Order History */}
      <Card className="mt-8 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="border-b border-border/50 flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold">Order History</CardTitle>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={"outline"}
                  className={cn(
                    "w-[300px] justify-start text-left font-normal",
                    !range && "text-muted-foreground"
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
                    <span>Pick a date</span>
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
            <div className="text-center py-10 text-muted-foreground">Loading orders...</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground flex flex-col items-center justify-center min-h-[150px]">
              <Package className="h-12 w-12 mb-3 text-gray-300 dark:text-gray-700 opacity-70" />
              <p className="font-semibold text-md">No past orders found</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Your order history will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto simple-scrollbar">
              <Table className="min-w-full"> {/* Ensured table takes min-w-full for scrolling */}
                <TableHeader>
                  <TableRow className="bg-muted/50 dark:bg-muted/30">
                    <TableHead className="py-2.5 px-4 text-xs font-medium text-muted-foreground whitespace-nowrap">Date</TableHead>
                    <TableHead className="py-2.5 px-4 text-xs font-medium text-muted-foreground whitespace-nowrap w-[200px]">Item</TableHead>
                    <TableHead className="py-2.5 px-4 text-xs font-medium text-muted-foreground whitespace-nowrap text-center">Quantity</TableHead>
                    <TableHead className="py-2.5 px-4 text-xs font-medium text-muted-foreground whitespace-nowrap text-right">Rate</TableHead>
                    <TableHead className="py-2.5 px-4 text-xs font-medium text-muted-foreground whitespace-nowrap text-right">Total</TableHead>
                    <TableHead className="py-2.5 px-4 text-xs font-medium text-muted-foreground whitespace-nowrap">Payment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="bg-gray-100 font-semibold">
                    <TableCell colSpan={4} className="text-right font-bold">Total</TableCell>
                    <TableCell className="text-right font-bold">
                      NRs. {orders.reduce((acc, order) => acc + Number(order.total), 0).toFixed(2)}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                  {orders.map((order) => (
                    <TableRow key={order.id} className="hover:bg-muted/20 dark:hover:bg-muted/10 transition-colors border-b border-border/30 last:border-b-0">
                      <TableCell className="py-2.5 px-4 text-sm whitespace-nowrap">
                        {new Date(order.order_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="py-2.5 px-4 text-sm font-medium whitespace-normal break-words w-[200px]">{order.item_name}</TableCell>
                      <TableCell className="py-2.5 px-4 text-sm text-center whitespace-nowrap">{order.quantity}</TableCell>
                      <TableCell className="py-2.5 px-4 text-sm text-right whitespace-nowrap">NRs. {Number(order.rate).toFixed(2)}</TableCell>
                      <TableCell className="py-2.5 px-4 text-sm text-right whitespace-nowrap">NRs. {Number(order.total).toFixed(2)}</TableCell>
                      <TableCell className="py-2.5 px-4 text-sm whitespace-nowrap">
                        <Badge variant="outline" className="font-normal text-xs">{order.payment_mode}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        {orders.length > 0 && (
          <div className="flex justify-center p-4">
            <Button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
              variant="outline"
            >
              Previous
            </Button>
            <span className="p-2">
              Page {page}
            </span>
            <Button
              onClick={() => onPageChange(page + 1)}
              disabled={orders.length < itemsPerPage}
              variant="outline"
            >
              Next
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default OrdersTab;
