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
import TransactionDatePicker from "@/components/ui/transaction-date-picker";
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
import AllTimeTotalDisplay from "@/components/AllTimeTotalDisplay";
import MultiOrderEntry from "@/components/MultiOrderEntry";

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
  const [totalOrdersCount, setTotalOrdersCount] = useState(0);
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
  const [transactionDate, setTransactionDate] = useState(
    format(new Date(), "yyyy-MM-dd"),
  );

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
        .select("*", { count: "exact" });

      if (range?.from) {
        query = query.gte("order_date", format(range.from, "yyyy-MM-dd"));
      }
      if (range?.to) {
        query = query.lte("order_date", format(range.to, "yyyy-MM-dd"));
      }

      const { data, error, count } = await query
        .order("order_date", { ascending: false })
        .order("created_at", { ascending: false })
        .range((page - 1) * itemsPerPage, page * itemsPerPage - 1);

      if (error) throw error;
      setOrders(data || []);

      // Get total count without pagination
      const { count: totalCount, error: countError } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true });

      if (!countError && totalCount !== null) {
        setTotalOrdersCount(totalCount);
      }
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
      // Sort alphabetically as requested
      const sortedItems = (data || []).sort((a, b) => a.name.localeCompare(b.name));
      setMenuItems(sortedItems);
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
    // Default to true if no setting exists
    const canEdit = localStorage.getItem("canEditTransactions");
    setCanEditTransactions(canEdit === null ? true : JSON.parse(canEdit));
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
      const payload = {
        p_items: cart.map((item) => ({
          menu_item_id: item.id,
          item_name: item.name,
          quantity: Number(item.quantity),
          rate: Number(item.price),
        })),
        p_payment_mode: String(paymentMode),
        p_order_date: transactionDate,
      };

      const { error } = await supabase.rpc("process_pos_order" as any, payload as any);
      if (error) throw error;

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
        errorMessage =
          "Database column error. Please run the column fix in Supabase SQL Editor.";

        // Show detailed instructions for 42703
        console.error("\n=== 42703 COLUMN ERROR ===");
        console.error(`Column error: ${error?.message}`);
        console.error("\nTo fix this:");
        console.error("1. Go to your Supabase dashboard");
        console.error("2. Open SQL Editor");
        console.error("3. Run the fix_amount_column_error.sql file");
        console.error("4. Refresh this page");
      } else if (error?.code === "42702") {
        errorMessage =
          "Database function error. Please run the ambiguous column fix in Supabase SQL Editor.";

        // Show detailed instructions for 42702
        console.error("\n=== 42702 AMBIGUOUS COLUMN ERROR ===");
        console.error(`Ambiguous column error: ${error?.message}`);
        console.error("\nTo fix this:");
        console.error("1. Go to your Supabase dashboard");
        console.error("2. Open SQL Editor");
        console.error("3. Run the fix_ambiguous_column.sql file");
        console.error("4. Refresh this page");
      } else if (error?.code === "PGRST202") {
        errorMessage = "Database function not found. Using fallback method...";
      } else if (error?.code === "PGRST204") {
        errorMessage =
          "Database schema cache error. Please run the schema fix in your Supabase SQL Editor.";

        // Show detailed instructions for PGRST204
        console.error("\n=== PGRST204 SCHEMA CACHE ERROR ===");
        console.error("The PostgREST schema cache is out of sync.");
        console.error("\nTo fix this:");
        console.error("1. Go to your Supabase dashboard");
        console.error("2. Open SQL Editor");
        console.error("3. Run the fix_orders_schema.sql file");
        console.error("4. Refresh this page");
        console.error(
          "\nOr try refreshing the page - the issue may resolve automatically.",
        );
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
    let allItems = menuItems;

    if (selectedCategory) {
      allItems = allItems.filter(item => item.category === selectedCategory);
    }

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      allItems = allItems.filter(
        (item) =>
          item.name.toLowerCase().includes(lowerSearchTerm) ||
          item.category.toLowerCase().includes(lowerSearchTerm) ||
          (item.description &&
            item.description.toLowerCase().includes(lowerSearchTerm)),
      );
    }

    // Re-group but keep alphabetical order within groups (they are already sorted)
    return allItems.reduce(
      (acc, item) => {
        if (!acc[item.category]) {
          acc[item.category] = [];
        }
        acc[item.category].push(item);
        return acc;
      },
      {} as Record<string, MenuItem[]>,
    );
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
    <div className="min-h-screen bg-background p-2 md:p-6 pb-32 md:pb-6">
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
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

      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="bg-primary/5 p-4 rounded-3xl mb-4 md:mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-xl text-white">
              <ChefHat className="h-5 w-5 md:h-6 md:w-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground">
                Orders
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">Browse menu and place orders</p>
            </div>
          </div>
          <MultiOrderEntry onComplete={fetchOrders} />
        </div>

        {/* All-Time Total Display */}
        <AllTimeTotalDisplay type="orders" className="mb-8" />

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
                    {totalOrdersCount}
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
                <div className="flex flex-col gap-3">
                  <div className="flex-grow">
                    <Input
                      placeholder="Search delicious items... 🔍"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="border-orange-200 focus:border-orange-500 focus:ring-orange-500 h-10 sm:h-12 text-sm sm:text-base"
                    />
                  </div>
                </div>

                {/* Category Filters */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">
                      Filter by Category
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      key="all-categories"
                      onClick={() => setSelectedCategory(null)}
                      variant={
                        selectedCategory === null ? "default" : "outline"
                      }
                      size="sm"
                      className={`transition-all duration-150 text-xs sm:text-sm px-2 sm:px-3 ${selectedCategory === null ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md" : "hover:bg-orange-50"}`}
                    >
                      All
                    </Button>
                    {productCategories.map((category) => (
                      <Button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        variant={
                          selectedCategory === category ? "default" : "outline"
                        }
                        size="sm"
                        className={`transition-all duration-150 text-xs sm:text-sm px-2 sm:px-3 ${selectedCategory === category ? `bg-gradient-to-r ${categoryColors[category as keyof typeof categoryColors] || "from-gray-500 to-slate-500"} text-white shadow-md` : "hover:bg-orange-50"}`}
                      >
                        {category}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Menu Items Display */}
                {Object.keys(currentMenuItemsToDisplay).length === 0 &&
                  searchTerm && (
                    <div className="text-center py-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                      <Package className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                      <p className="text-slate-500 font-medium">
                        No matches for "{searchTerm}"
                      </p>
                    </div>
                  )}

                {Object.entries(currentMenuItemsToDisplay).map(
                  ([category, items]) => {
                    if (items.length === 0) return null;
                    return (
                      <div key={category} className="space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className={`w-2 h-6 rounded-full bg-gradient-to-b ${categoryColors[category as keyof typeof categoryColors] || "from-slate-400 to-slate-500"}`}
                          ></div>
                          <h3 className="text-base font-black uppercase tracking-tight text-slate-800">
                            {category}
                          </h3>
                        </div>
                        <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                          {items.map((item, index) => (
                            <Card
                              key={item.id}
                              className="group bg-white hover:bg-primary/5 transition-all active:scale-95 cursor-pointer border-slate-100 hover:border-primary/30 rounded-xl overflow-hidden shadow-sm"
                              onClick={() => addToCart(item)}
                            >
                              <CardContent className="p-2 flex flex-col h-full justify-between min-h-[100px]">
                                <div className="space-y-1">
                                  <h4 className="font-bold text-[10px] sm:text-xs leading-tight text-slate-800 group-hover:text-primary break-words whitespace-normal">
                                    {item.name}
                                  </h4>
                                </div>
                                <div className="mt-auto pt-2">
                                  <div className="bg-primary/10 text-primary rounded-lg py-1 px-1.5 text-center">
                                    <span className="text-[10px] font-black">रु {item.price}</span>
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
            {/* Mobile Sticky Cart Summary */}
            <div className="md:hidden fixed bottom-4 left-4 right-4 z-50 pointer-events-none">
              {cart.length > 0 && (
                <Button
                  className="w-full h-14 rounded-2xl bg-primary text-white shadow-2xl shadow-primary/40 flex items-center justify-between px-6 pointer-events-auto animate-in slide-in-from-bottom-10"
                  onClick={() => {
                    const cartElement = document.getElementById('shopping-cart-section');
                    cartElement?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-lg">
                      <ShoppingCart className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-bold uppercase tracking-wider leading-none opacity-80">View Cart</p>
                      <p className="text-sm font-black">{cart.length} Items</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wider leading-none opacity-80">Total</p>
                    <p className="text-base font-black">NRs. {getCartTotal().toFixed(0)}</p>
                  </div>
                </Button>
              )}
            </div>

            <Card id="shopping-cart-section" className="rounded-3xl border-none shadow-xl bg-white overflow-hidden sticky top-6">
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
                    <div className="space-y-3 max-h-48 sm:max-h-64 overflow-y-auto">
                      {cart.map((item, index) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-2 sm:p-3 bg-gradient-to-r from-white to-pink-50 rounded-lg border border-pink-100"
                          style={{ animationDelay: `${index * 100}ms` }}
                        >
                          <div className="flex-1 min-w-0 mr-2">
                            <h4
                              className="font-medium text-xs sm:text-sm truncate"
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
                              className="h-6 w-6 hover:bg-red-50 hover:border-red-300 flex-shrink-0"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="text-xs sm:text-sm font-semibold w-6 sm:w-8 text-center flex-shrink-0">
                              {item.quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() =>
                                updateCartQuantity(item.id, item.quantity + 1)
                              }
                              className="h-6 w-6 hover:bg-green-50 hover:border-green-300 flex-shrink-0"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeFromCart(item.id)}
                              className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
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

                      {/* Transaction Date Picker */}
                      <TransactionDatePicker
                        selectedDate={transactionDate}
                        onDateChange={setTransactionDate}
                        label="Order Date"
                        showBackdateWarning={true}
                        className="mb-4"
                      />

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
          <CardHeader className="border-b border-gray-200/50 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent flex items-center gap-2">
                <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600" />
                Order History
              </CardTitle>
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full sm:w-[280px] justify-start text-left font-normal hover:bg-gradient-to-r hover:from-orange-50 hover:to-pink-50 text-xs sm:text-sm",
                        !range && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
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
                        <span className="truncate">Pick date range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto p-0"
                    align="end"
                    side="bottom"
                  >
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={range?.from}
                      selected={range}
                      onSelect={onRangeChange}
                      numberOfMonths={1}
                    />
                  </PopoverContent>
                </Popover>
              </div>
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
                      <TableHead className="font-semibold text-gray-700 text-xs sm:text-sm px-2 sm:px-4">
                        Date
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700 text-xs sm:text-sm px-2 sm:px-4">
                        Item
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700 text-center text-xs sm:text-sm px-1 sm:px-4">
                        Qty
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700 text-right text-xs sm:text-sm px-1 sm:px-4">
                        Rate
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700 text-right text-xs sm:text-sm px-1 sm:px-4">
                        Total
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700 text-xs sm:text-sm px-1 sm:px-4 hidden sm:table-cell">
                        Payment
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700 text-xs sm:text-sm px-1 sm:px-4 hidden sm:table-cell">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="font-bold text-xs sm:text-sm px-2 sm:px-4"
                      >
                        Total
                      </TableCell>
                      <TableCell
                        colSpan={3}
                        className="font-bold text-right text-xs sm:text-sm px-1 sm:px-4"
                      >
                        NRs. {totalOrders.toFixed(2)}
                      </TableCell>
                    </TableRow>
                    {orders.map((order, index) => (
                      <TableRow
                        key={order.id}
                        className="hover:bg-gradient-to-r hover:from-orange-50 hover:to-pink-50 transition-all duration-200"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <TableCell className="font-medium text-xs sm:text-sm px-2 sm:px-4">
                          <div className="sm:hidden">
                            {format(new Date(order.order_date), "MMM dd")}
                          </div>
                          <div className="hidden sm:block">
                            {format(new Date(order.order_date), "MMM dd, yyyy")}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-xs sm:text-sm px-2 sm:px-4">
                          <div
                            className="truncate max-w-24 sm:max-w-none"
                            title={order.item_name}
                          >
                            {order.item_name}
                          </div>
                        </TableCell>
                        <TableCell className="text-center px-1 sm:px-4">
                          <Badge
                            variant="outline"
                            className="bg-blue-50 border-blue-200 text-xs px-1 sm:px-2"
                          >
                            {order.quantity}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-xs sm:text-sm px-1 sm:px-4">
                          <div className="sm:hidden">
                            रु {Number(order.rate).toFixed(0)}
                          </div>
                          <div className="hidden sm:block">
                            NRs. {Number(order.rate).toFixed(2)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right px-1 sm:px-4">
                          <span className="font-bold text-sm sm:text-lg bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                            <div className="sm:hidden">
                              रु {Number(order.total).toFixed(0)}
                            </div>
                            <div className="hidden sm:block">
                              NRs. {Number(order.total).toFixed(2)}
                            </div>
                          </span>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell px-1 sm:px-4">
                          <Badge
                            variant="outline"
                            className="bg-green-50 border-green-200 text-xs"
                          >
                            {order.payment_mode}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell px-1 sm:px-4">
                          <div className="flex gap-1 sm:gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedOrder(order);
                                setIsEditDialogOpen(true);
                              }}
                              className="text-xs px-2"
                            >
                              Edit
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2"
                                >
                                  <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
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
