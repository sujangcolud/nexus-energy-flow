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
  Sparkles,
  ChefHat,
  DollarSign,
  TrendingUp,
  Star,
  Utensils,
  Heart,
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
import BalanceDisplay from "@/components/ui/balance-display";

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

  const categoryColors = {
    Appetizers: "from-orange-500 to-red-500",
    "Main Course": "from-blue-500 to-indigo-600",
    Desserts: "from-pink-500 to-purple-600",
    Beverages: "from-green-500 to-teal-600",
    Snacks: "from-yellow-500 to-orange-500",
    Specials: "from-purple-500 to-pink-500",
  };

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
      console.log("Fetching menu items...");
      const { data, error } = await supabase
        .from("menu_items")
        .select("*")
        .eq("is_available", true)
        .order("category", { ascending: true });

      if (error) {
        console.error(
          "Menu items fetch error:",
          JSON.stringify(error, null, 2),
        );
        throw error;
      }
      console.log("Menu items loaded:", data?.length || 0, "items");
      setMenuItems(data || []);
    } catch (error) {
      console.error(
        "Error fetching menu items:",
        JSON.stringify(error, null, 2),
      );
      toast.error("Failed to load menu items");
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchMenuItems();
    const canEdit = localStorage.getItem("canEditTransactions");
    if (canEdit) {
      setCanEditTransactions(JSON.parse(canEdit));
    }
  }, [user, page, range]);

  const addToCart = (menuItem: MenuItem) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === menuItem.id);
      if (existingItem) {
        return prevCart.map((item) =>
          item.id === menuItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      } else {
        return [
          ...prevCart,
          {
            id: menuItem.id,
            name: menuItem.name,
            price: menuItem.price,
            quantity: 1,
          },
        ];
      }
    });
    toast.success(`${menuItem.name} added to cart! 🛒`);
  };

  const updateCartQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((item) => (item.id === id ? { ...item, quantity } : item)),
    );
  };

  const removeFromCart = (id: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const submitOrder = async () => {
    if (!user || cart.length === 0 || !paymentMode) {
      toast.error("Please add items to cart and select payment mode");
      return;
    }

    // Check current session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    if (sessionError || !session) {
      console.error("Authentication error:", sessionError);
      toast.error("Authentication expired. Please log in again.");
      return;
    }

    setSubmitting(true);
    try {
      console.log("Submitting orders for user:", user.id);
      console.log("Current session user:", session.user.id);
      console.log("Full user object:", user);
      console.log("Full session object:", session);
      console.log("Cart items:", cart);
      console.log("Payment mode:", paymentMode);

      const orderPromises = cart.map((item) => {
        const currentDate = new Date().toISOString().split("T")[0];
        const orderParams = {
          p_user_id: user.id,
          p_item_name: String(item.name),
          p_quantity: Number(item.quantity),
          p_rate: Number(item.price),
          p_total: Number(item.price * item.quantity),
          p_payment_mode: String(paymentMode),
          p_order_date: currentDate,
        };
        console.log("Order params for RPC:", orderParams);

        // Use RPC function to bypass trigger issues
        return supabase
          .rpc("insert_order_safe", orderParams)
          .then((result) => {
            // If RPC function doesn't exist, fall back to direct insert
            if (
              result.error &&
              (result.error.code === "PGRST202" ||
                result.error.code === "42883")
            ) {
              console.log(
                "RPC function not found, falling back to direct insert",
              );
              console.log("RPC error:", result.error);
              const directOrderData = {
                user_id: orderParams.p_user_id,
                item_name: orderParams.p_item_name,
                quantity: orderParams.p_quantity,
                rate: orderParams.p_rate,
                total: orderParams.p_total,
                payment_mode: orderParams.p_payment_mode,
                order_date: orderParams.p_order_date,
                date: orderParams.p_order_date, // Add date field to satisfy triggers
              };
              console.log(
                "Attempting direct insert with data:",
                directOrderData,
              );
              return supabase.from("orders").insert(directOrderData);
            }
            return result;
          })
          .catch((error) => {
            console.error(
              "RPC call failed completely, falling back to direct insert:",
              error,
            );
            // If the RPC call itself fails, fall back to direct insert
            const directOrderData = {
              user_id: orderParams.p_user_id,
              item_name: orderParams.p_item_name,
              quantity: orderParams.p_quantity,
              rate: orderParams.p_rate,
              total: orderParams.p_total,
              payment_mode: orderParams.p_payment_mode,
              order_date: orderParams.p_order_date,
              date: orderParams.p_order_date, // Add date field to satisfy triggers
            };
            return supabase.from("orders").insert(directOrderData);
          });
      });

      const results = await Promise.all(orderPromises);

      // Check if any RPC call failed
      const failed = results.find((result) => result.error);
      if (failed) {
        console.error(
          "Order submission failed:",
          JSON.stringify(failed.error, null, 2),
        );
        console.error("Failed result:", JSON.stringify(failed, null, 2));
        throw failed.error;
      }

      // Log successful results
      console.log("All orders inserted successfully:", results);

      toast.success("Order placed successfully! 🎉");
      clearCart();
      setPaymentMode("");
      fetchOrders();
    } catch (error) {
      console.error("Error submitting order:", JSON.stringify(error, null, 2));
      console.error("Error details:", error);
      console.error("Error code:", error?.code);
      console.error("Error message:", error?.message);

      // Provide more specific error messages based on the error code
      let errorMessage = "Failed to place order";
      if (error?.code === "42703") {
        errorMessage = "Database field error detected. Migration needed.";
      } else if (error?.code === "PGRST202") {
        errorMessage = "Database function not found. Using fallback method...";
      } else if (error?.code === "PGRST204") {
        errorMessage =
          "Database schema error. Please run the latest migration or refresh the page.";
      } else if (error?.message) {
        errorMessage = `Failed to place order: ${error.message}`;
      }

      console.log("Final error message:", errorMessage);

      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const groupedMenuItems = menuItems.reduce(
    (acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    },
    {} as Record<string, MenuItem[]>,
  );

  const productCategories = Object.keys(groupedMenuItems);

  useEffect(() => {
    if (productCategories.length > 0 && !selectedCategory) {
      setSelectedCategory(productCategories[0]);
    }
  }, [productCategories, selectedCategory]);

  const filteredMenuItems = () => {
    let itemsToDisplay = groupedMenuItems;

    if (selectedCategory) {
      itemsToDisplay = {
        [selectedCategory]: groupedMenuItems[selectedCategory] || [],
      };
    }

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      const result: Record<string, MenuItem[]> = {};
      for (const category in itemsToDisplay) {
        result[category] = itemsToDisplay[category].filter(
          (item) =>
            item.name.toLowerCase().includes(lowerSearchTerm) ||
            item.category.toLowerCase().includes(lowerSearchTerm) ||
            (item.description &&
              item.description.toLowerCase().includes(lowerSearchTerm)),
        );
      }
      itemsToDisplay = result;
    }
    return itemsToDisplay;
  };

  const currentMenuItemsToDisplay = filteredMenuItems();
  const totalOrders = orders.reduce((sum, order) => sum + order.total, 0);

  const logAction = async (action: string, record_id: string, details: any) => {
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
      </div>

      <div className="relative z-10 space-y-8 p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-xl animate-pulse">
              <ChefHat className="h-8 w-8" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 bg-clip-text text-transparent">
              Restaurant Orders
            </h1>
            <Sparkles className="h-8 w-8 text-pink-500 animate-bounce" />
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Browse our delicious menu and place your orders with ease
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-600 font-medium">
                    Cart Items
                  </p>
                  <p className="text-2xl font-bold text-orange-800">
                    {cart.length}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl text-white">
                  <ShoppingCart className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-pink-50 to-purple-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-pink-600 font-medium">
                    Cart Total
                  </p>
                  <p className="text-2xl font-bold text-pink-800">
                    NRs. {getCartTotal().toFixed(2)}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl text-white">
                  <DollarSign className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 font-medium">
                    Total Orders
                  </p>
                  <p className="text-2xl font-bold text-purple-800">
                    {orders.length}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl text-white">
                  <Package className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-indigo-600 font-medium">
                    Total Spent
                  </p>
                  <p className="text-2xl font-bold text-indigo-800">
                    NRs. {totalOrders.toFixed(2)}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-xl text-white">
                  <TrendingUp className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Menu Items Section */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-gradient-to-br from-white/90 to-orange-50/90 backdrop-blur-sm border-0 shadow-2xl">
              <CardHeader className="bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Utensils className="h-6 w-6" />
                  </div>
                  Our Delicious Menu
                  <Star className="h-5 w-5 animate-pulse text-yellow-300" />
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Search and Filters */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-grow">
                    <Input
                      placeholder="Search delicious items... 🔍"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="border-orange-200 focus:border-orange-500 focus:ring-orange-500 h-12"
                    />
                  </div>
                </div>

                {/* Category Filters */}
                <div className="flex items-center gap-2 flex-wrap pb-2">
                  <Filter className="h-5 w-5 text-gray-600" />
                  <Button
                    key="all-categories"
                    onClick={() => setSelectedCategory(null)}
                    variant={selectedCategory === null ? "default" : "outline"}
                    size="sm"
                    className={`transition-all duration-150 ${selectedCategory === null ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md" : "hover:bg-orange-50"}`}
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
                      className={`transition-all duration-150 ${selectedCategory === category ? `bg-gradient-to-r ${categoryColors[category as keyof typeof categoryColors] || "from-gray-500 to-slate-500"} text-white shadow-md` : "hover:bg-orange-50"}`}
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
                          <div
                            className={`w-4 h-4 rounded-full bg-gradient-to-r ${categoryColors[category as keyof typeof categoryColors] || "from-gray-500 to-slate-500"}`}
                          ></div>
                          <h3 className="text-xl font-bold text-gray-800">
                            {category}
                          </h3>
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
                          {items.map((item, index) => (
                            <Card
                              key={item.id}
                              className="group bg-gradient-to-br from-white to-orange-50/50 hover:from-orange-50 hover:to-red-50 transition-all duration-300 hover:shadow-xl hover:scale-105 cursor-pointer border border-orange-100 hover:border-orange-300"
                              onClick={() => addToCart(item)}
                              style={{ animationDelay: `${index * 50}ms` }}
                            >
                              <CardContent className="p-2 sm:p-4">
                                <div className="flex justify-between items-start mb-3">
                                  <div className="flex-1">
                                    <h4 className="font-bold text-sm sm:text-lg text-gray-800 group-hover:text-orange-600 transition-colors mb-1">
                                      {item.name}
                                    </h4>
                                    {item.description && (
                                      <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 mb-2">
                                        {item.description}
                                      </p>
                                    )}
                                  </div>
                                  <div className="ml-3">
                                    <Badge
                                      className={`bg-gradient-to-r ${categoryColors[item.category as keyof typeof categoryColors] || "from-gray-500 to-slate-500"} text-white border-0 text-xs sm:text-sm px-2 sm:px-3 py-1`}
                                    >
                                      NRs. {item.price}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-gray-500 bg-gray-100 px-1 sm:px-2 py-1 rounded-full">
                                    {item.category}
                                  </span>
                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    <Plus className="h-5 w-5 text-orange-600" />
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
                      Check back later for delicious options!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Shopping Cart */}
          <div className="space-y-6">
            <Card className="bg-gradient-to-br from-white/90 to-pink-50/90 backdrop-blur-sm border-0 shadow-2xl sticky top-6">
              <CardHeader className="bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center justify-between text-lg">
                  <span className="flex items-center gap-2">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <ShoppingCart className="h-5 w-5" />
                    </div>
                    Your Cart ({cart.length})
                  </span>
                  {cart.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearCart}
                      className="text-white hover:bg-white/20 hover:text-white"
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
                    <p className="font-semibold text-lg mb-1 text-gray-700">
                      Your cart is empty
                    </p>
                    <p className="text-sm text-gray-500">
                      Add some delicious items!
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {cart.map((item, index) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 bg-gradient-to-r from-white to-pink-50 rounded-lg border border-pink-100"
                          style={{ animationDelay: `${index * 100}ms` }}
                        >
                          <div className="flex-1 min-w-0 mr-2">
                            <h4
                              className="font-medium text-sm truncate"
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
                              className="h-6 w-6 hover:bg-red-50 hover:border-red-300"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="text-sm font-semibold w-8 text-center">
                              {item.quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() =>
                                updateCartQuantity(item.id, item.quantity + 1)
                              }
                              className="h-6 w-6 hover:bg-green-50 hover:border-green-300"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeFromCart(item.id)}
                              className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Separator className="my-4" />

                    <div className="space-y-4">
                      <div className="flex justify-between items-center font-bold text-lg">
                        <span>Total:</span>
                        <span className="bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                          NRs. {getCartTotal().toFixed(2)}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="payment-mode"
                          className="text-sm font-medium"
                        >
                          Payment Mode
                        </Label>
                        <Select
                          value={paymentMode}
                          onValueChange={setPaymentMode}
                          disabled={submitting || cart.length === 0}
                        >
                          <SelectTrigger className="border-pink-200 focus:border-pink-500 focus:ring-pink-500">
                            <SelectValue placeholder="Choose payment method" />
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
                        disabled={
                          submitting || !paymentMode || cart.length === 0
                        }
                        className="w-full h-12 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:from-pink-600 hover:via-purple-600 hover:to-indigo-600 text-white font-semibold shadow-lg transition-all duration-300 transform hover:scale-105"
                      >
                        {submitting ? (
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            Placing Order...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5" />
                            Place Order (NRs. {getCartTotal().toFixed(2)})
                          </div>
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
        <Card className="bg-gradient-to-br from-white/90 to-gray-50/90 backdrop-blur-sm border-0 shadow-2xl">
          <CardHeader className="border-b border-gray-200/50 flex flex-row items-center justify-between">
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent flex items-center gap-2">
              <Clock className="h-6 w-6 text-gray-600" />
              Order History
            </CardTitle>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[300px] justify-start text-left font-normal hover:bg-gradient-to-r hover:from-orange-50 hover:to-pink-50",
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
              <div className="text-center py-10">
                <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-full animate-spin mx-auto flex items-center justify-center mb-4">
                  <Package className="h-8 w-8 text-white" />
                </div>
                <p className="text-gray-600">Loading orders...</p>
              </div>
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
                                    <AlertDialogCancel>
                                      Cancel
                                    </AlertDialogCancel>
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
                <Button
                  onClick={() => onPageChange(page - 1)}
                  disabled={page === 1}
                  variant="outline"
                  className="hover:bg-gradient-to-r hover:from-orange-50 hover:to-red-50"
                >
                  Previous
                </Button>
                <span className="px-4 py-2 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg font-medium">
                  Page {page}
                </span>
                <Button
                  onClick={() => onPageChange(page + 1)}
                  disabled={orders.length < itemsPerPage}
                  variant="outline"
                  className="hover:bg-gradient-to-r hover:from-orange-50 hover:to-red-50"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default OrdersTab;
