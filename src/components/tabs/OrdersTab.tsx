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
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Package,
  Filter,
  Calendar as CalendarIcon,
  ChefHat,
  DollarSign,
  Clock,
  CheckCircle,
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
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import useTableControls from "@/hooks/useTableControls";

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
  const [paymentMode, setPaymentMode] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const { page, range, onPageChange, onRangeChange, itemsPerPage } =
    useTableControls();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [canEditTransactions, setCanEditTransactions] = useState(false);

  const paymentModes = ["Cash", "Esewa", "Fonepay", "Bank", "Cheque", "Credit"];

  const fetchOrders = async () => {
    if (!user) return;

    setLoading(true);
    try {
      let query = supabase
        .from("orders")
        .select("*", { count: "exact" })
        .eq("user_id", user.id);

      if (range?.from) {
        query = query.gte("order_date", format(range.from, "yyyy-MM-dd"));
      }
      if (range?.to) {
        query = query.lte("order_date", format(range.to, "yyyy-MM-dd"));
      }

      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range((page - 1) * itemsPerPage, page * itemsPerPage - 1);

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const fetchMenuItems = async () => {
    try {
      const { data, error } = await supabase
        .from("menu_items")
        .select("*")
        .eq("is_available", true)
        .order("category", { ascending: true });

      if (error) throw error;
      setMenuItems(data || []);
    } catch (error) {
      console.error("Error fetching menu items:", error);
      toast.error("Failed to load menu items");
    }
  };

  useEffect(() => {
<<<<<<< HEAD
    if (user) {
      fetchOrders();
      fetchMenuItems();
=======
    fetchOrders();
    fetchMenuItems();
    const canEdit = localStorage.getItem("canEditTransactions");
    if (canEdit) {
      setCanEditTransactions(JSON.parse(canEdit));
>>>>>>> origin/main
    }
  }, [user, page, range]);

  const addToCart = (item: MenuItem) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((cartItem) => cartItem.id === item.id);
      if (existingItem) {
        return prevCart.map((cartItem) =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem,
        );
      } else {
        return [
          ...prevCart,
          { id: item.id, name: item.name, price: item.price, quantity: 1 },
        ];
      }
    });
    toast.success(`${item.name} added to cart!`);
  };

  const updateCartQuantity = (id: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setCart((prevCart) => prevCart.filter((item) => item.id !== id));
    } else {
      setCart((prevCart) =>
        prevCart.map((item) =>
          item.id === id ? { ...item, quantity: newQuantity } : item,
        ),
      );
    }
  };

  const clearCart = () => {
    setCart([]);
    toast.success("Cart cleared!");
  };

  const submitOrder = async () => {
    if (cart.length === 0) {
      toast.error("Cart is empty!");
      return;
    }

    if (!paymentMode) {
      toast.error("Please select a payment method!");
      return;
    }

    setSubmitting(true);
    try {
      const orderPromises = cart.map((item) =>
        supabase.from("orders").insert({
          user_id: user!.id,
          item_name: item.name,
          quantity: item.quantity,
          rate: item.price,
          total: item.price * item.quantity,
          payment_mode: paymentMode,
          order_date: new Date().toISOString().split("T")[0],
        }),
      );

      await Promise.all(orderPromises);

      toast.success("Order placed successfully!");
      setCart([]);
      setPaymentMode("");
      fetchOrders();
    } catch (error) {
      console.error("Error submitting order:", error);
      toast.error("Failed to place order");
    } finally {
      setSubmitting(false);
    }
  };

  const totalAmount = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  const productCategories = [
    ...new Set(menuItems.map((item) => item.category)),
  ];

  const filteredMenuItems = menuItems.filter((item) => {
    const matchesSearch = item.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === null || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedMenuItems = filteredMenuItems.reduce(
    (acc, item) => {
      const category = item.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    },
    {} as Record<string, MenuItem[]>,
  );

  const currentMenuItemsToDisplay = Object.keys(groupedMenuItems).reduce(
    (acc, category) => {
      if (groupedMenuItems[category].length > 0) {
        acc[category] = groupedMenuItems[category];
      }
      return acc;
    },
    {} as Record<string, MenuItem[]>,
  );

  const logAction = async (
    action: string,
    record_id: string,
    details: any,
  ) => {
    if (!user) return;
    await supabase.from("logs").insert({
      user_id: user.id,
      action,
      table_name: "orders",
      record_id,
      details,
    });
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("orders").delete().eq("id", id);

      if (error) throw error;

      toast.success("Order deleted successfully!");
      logAction("delete", id, { id });
      fetchOrders();
    } catch (error) {
      console.error("Error deleting order:", error);
      toast.error("Failed to delete order");
    }
  };

  const handleUpdate = async () => {
    if (!selectedOrder) return;

    try {
      const { error } = await supabase
        .from("orders")
        .update(selectedOrder)
        .eq("id", selectedOrder.id);

      if (error) throw error;

      toast.success("Order updated successfully!");
      logAction("update", selectedOrder.id, selectedOrder);
      setIsEditDialogOpen(false);
      fetchOrders();
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error("Failed to update order");
    }
  };

  return (
<<<<<<< HEAD
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-primary rounded-xl">
          <ShoppingCart className="h-6 w-6 text-black" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-black">Order Management</h1>
          <p className="text-gray-600">Browse menu and place orders</p>
        </div>
=======
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-red-50 relative overflow-hidden">
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Order</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="editItemName">Item Name</Label>
                <Input
                  id="editItemName"
                  value={selectedOrder.item_name}
                  onChange={(e) =>
                    setSelectedOrder({
                      ...selectedOrder,
                      item_name: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="editQuantity">Quantity</Label>
                <Input
                  id="editQuantity"
                  type="number"
                  value={selectedOrder.quantity}
                  onChange={(e) =>
                    setSelectedOrder({
                      ...selectedOrder,
                      quantity: parseInt(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="editRate">Rate</Label>
                <Input
                  id="editRate"
                  type="number"
                  value={selectedOrder.rate}
                  onChange={(e) =>
                    setSelectedOrder({
                      ...selectedOrder,
                      rate: parseFloat(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="editTotal">Total</Label>
                <Input
                  id="editTotal"
                  type="number"
                  value={selectedOrder.total}
                  onChange={(e) =>
                    setSelectedOrder({
                      ...selectedOrder,
                      total: parseFloat(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="editPaymentMode">Payment Mode</Label>
                <Input
                  id="editPaymentMode"
                  value={selectedOrder.payment_mode}
                  onChange={(e) =>
                    setSelectedOrder({
                      ...selectedOrder,
                      payment_mode: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={handleUpdate}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-64 h-64 bg-gradient-to-r from-orange-400/20 to-red-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute top-1/3 right-20 w-80 h-80 bg-gradient-to-r from-pink-400/20 to-purple-500/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
        <div
          className="absolute bottom-20 left-1/4 w-72 h-72 bg-gradient-to-r from-red-400/20 to-pink-500/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>
>>>>>>> origin/main
      </div>

      {/* Date Range Filter */}
      <Card className="border border-gray-200">
        <CardHeader className="bg-brand-50 border-b border-gray-200">
          <CardTitle className="text-black">Filter Orders</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="grid gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[300px] justify-start text-left font-normal",
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
                <PopoverContent className="w-auto p-0" align="start">
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
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Menu Items */}
        <div className="lg:col-span-2">
          <Card className="border border-gray-200">
            <CardHeader className="bg-brand-50 border-b border-gray-200">
              <CardTitle className="flex items-center gap-3 text-black">
                <div className="p-2 bg-primary rounded-lg">
                  <ChefHat className="h-5 w-5 text-black" />
                </div>
                Menu Items
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-grow">
                  <Input
                    placeholder="Search menu items..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-12 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>
<<<<<<< HEAD

              {/* Category Filters */}
              <div className="flex items-center gap-2 flex-wrap pb-2">
                <Filter className="h-5 w-5 text-gray-600" />
=======
            ) : orders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <p className="text-xl font-semibold text-gray-700 mb-2">
                  No orders found
                </p>
                <p className="text-gray-500">
                  Your order history will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-gray-50 to-orange-50">
                      <TableHead className="font-semibold text-gray-700">
                        Date
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        Item
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700 text-center">
                        Quantity
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700 text-right">
                        Rate
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700 text-right">
                        Total
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        Payment
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={4} className="font-bold">
                        Total
                      </TableCell>
                      <TableCell colSpan={2} className="font-bold text-right">
                        NRs. {totalOrders.toFixed(2)}
                      </TableCell>
                    </TableRow>
                    {orders.map((order, index) => (
                      <TableRow
                        key={order.id}
                        className="hover:bg-gradient-to-r hover:from-orange-50 hover:to-pink-50 transition-all duration-200"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <TableCell className="font-medium">
                          {format(new Date(order.order_date), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell className="font-medium">
                          {order.item_name}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className="bg-blue-50 border-blue-200"
                          >
                            {order.quantity}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          NRs. {Number(order.rate).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-bold text-lg bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                            NRs. {Number(order.total).toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="bg-green-50 border-green-200"
                          >
                            {order.payment_mode}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {canEditTransactions && (
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setIsEditDialogOpen(true);
                                }}
                              >
                                Edit
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Are you sure?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This action cannot be undone. This will
                                      permanently delete the order.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(order.id)}
                                    >
                                      Continue
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-gradient-to-r from-orange-100 to-red-100 font-bold">
                      <TableCell
                        colSpan={4}
                        className="text-right font-bold text-lg"
                      >
                        Grand Total:
                      </TableCell>
                      <TableCell className="text-right font-bold text-xl bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                        NRs.{" "}
                        {orders
                          .reduce((acc, order) => acc + Number(order.total), 0)
                          .toFixed(2)}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
          {orders.length > 0 && (
            <div className="flex justify-center p-4 border-t border-gray-200">
              <div className="flex items-center gap-4">
>>>>>>> origin/main
                <Button
                  onClick={() => setSelectedCategory(null)}
                  variant={selectedCategory === null ? "default" : "outline"}
                  size="sm"
                  className={
                    selectedCategory === null
                      ? "bg-primary hover:bg-brand-400 text-black"
                      : "hover:bg-brand-50"
                  }
                >
                  All Categories
                </Button>
                {productCategories.map((category) => (
                  <Button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    variant={
                      selectedCategory === category ? "default" : "outline"
                    }
                    size="sm"
                    className={
                      selectedCategory === category
                        ? "bg-primary hover:bg-brand-400 text-black"
                        : "hover:bg-brand-50"
                    }
                  >
                    {category}
                  </Button>
                ))}
              </div>

              {/* Menu Items Display */}
              {Object.keys(currentMenuItemsToDisplay).length === 0 &&
                searchTerm && (
                  <div className="text-center py-8">
                    <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500 text-lg">
                      No items match your search for "{searchTerm}"
                    </p>
                  </div>
                )}

              {Object.entries(currentMenuItemsToDisplay).map(
                ([category, items]) => {
                  if (items.length === 0) return null;
                  return (
                    <div key={category} className="space-y-4">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-4 h-4 rounded-full bg-primary"></div>
                        <h3 className="text-xl font-bold text-black">
                          {category}
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {items.map((item) => (
                          <Card
                            key={item.id}
                            className="group bg-white hover:bg-brand-50 transition-all duration-300 hover:shadow-lg cursor-pointer border border-gray-200 hover:border-primary"
                            onClick={() => addToCart(item)}
                          >
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-black group-hover:text-gray-700 transition-colors mb-1">
                                    {item.name}
                                  </h4>
                                  {item.description && (
                                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                                      {item.description}
                                    </p>
                                  )}
                                </div>
                                <div className="ml-3">
                                  <Badge className="bg-primary text-black border-0">
                                    NRs. {item.price}
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                  {item.category}
                                </span>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                  <Plus className="h-5 w-5 text-primary" />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  );
                },
              )}

              {menuItems.length === 0 && !searchTerm && (
                <div className="text-center py-12">
                  <ChefHat className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-xl font-semibold text-gray-700 mb-2">
                    No menu items available
                  </p>
                  <p className="text-gray-500">
                    Check back later for available options!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Shopping Cart */}
        <div className="space-y-6">
          <Card className="border border-gray-200 sticky top-6">
            <CardHeader className="bg-brand-50 border-b border-gray-200">
              <CardTitle className="flex items-center justify-between text-black">
                <span className="flex items-center gap-2">
                  <div className="p-2 bg-primary rounded-lg">
                    <ShoppingCart className="h-4 w-4 text-black" />
                  </div>
                  Cart ({cart.length})
                </span>
                {cart.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearCart}
                    className="hover:bg-brand-100"
                  >
                    <Trash2 className="h-4 w-4 mr-1" /> Clear
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                  <p className="font-semibold text-lg mb-1 text-black">
                    Your cart is empty
                  </p>
                  <p className="text-sm text-gray-500">
                    Add items from the menu!
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {cart.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100"
                      >
                        <div className="flex-1 min-w-0 mr-2">
                          <h4
                            className="font-medium text-sm truncate text-black"
                            title={item.name}
                          >
                            {item.name}
                          </h4>
                          <p className="text-xs text-gray-500">
                            NRs. {item.price} each
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() =>
                              updateCartQuantity(item.id, item.quantity - 1)
                            }
                            className="h-6 w-6 hover:bg-brand-50"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-sm font-semibold w-8 text-center text-black">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() =>
                              updateCartQuantity(item.id, item.quantity + 1)
                            }
                            className="h-6 w-6 hover:bg-brand-50"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span className="text-black">Total:</span>
                      <span className="text-black">
                        NRs. {totalAmount.toLocaleString()}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="payment-mode"
                        className="text-black font-medium"
                      >
                        Payment Method
                      </Label>
                      <Select
                        value={paymentMode}
                        onValueChange={setPaymentMode}
                      >
                        <SelectTrigger className="focus:ring-primary focus:border-primary">
                          <SelectValue placeholder="Select payment method" />
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
                      disabled={submitting}
                      className="w-full bg-primary hover:bg-brand-400 text-black"
                    >
                      {submitting ? "Placing Order..." : "Place Order"}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Orders History */}
      <Card className="border border-gray-200">
        <CardHeader className="bg-brand-50 border-b border-gray-200">
          <CardTitle className="flex items-center gap-3 text-black">
            <div className="p-2 bg-primary rounded-lg">
              <Clock className="h-5 w-5 text-black" />
            </div>
            Order History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <p className="text-xl font-semibold text-gray-700 mb-2">
                No orders found
              </p>
              <p className="text-gray-500">
                Place your first order to see it here!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-black">Item</TableHead>
                    <TableHead className="text-black">Quantity</TableHead>
                    <TableHead className="text-black">Rate</TableHead>
                    <TableHead className="text-black">Total</TableHead>
                    <TableHead className="text-black">Payment</TableHead>
                    <TableHead className="text-black">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium text-black">
                        {order.item_name}
                      </TableCell>
                      <TableCell className="text-black">
                        {order.quantity}
                      </TableCell>
                      <TableCell className="text-black">
                        NRs. {order.rate}
                      </TableCell>
                      <TableCell className="text-black">
                        NRs. {order.total}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="border-primary text-primary"
                        >
                          {order.payment_mode}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-black">
                        {format(new Date(order.order_date), "MMM dd, yyyy")}
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
