import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { MobileInput } from "@/components/ui/mobile-input";
import { MobileButton } from "@/components/ui/mobile-button";
import {
  MobileSelect,
  MobileSelectContent,
  MobileSelectItem,
  MobileSelectTrigger,
  MobileSelectValue,
} from "@/components/ui/mobile-select";
import { MobileDatePicker } from "@/components/ui/mobile-date-picker";
import {
  MobileLayout,
  MobileCard,
  MobileForm,
  MobileGrid,
  MobileButtonGroup,
} from "@/components/ui/mobile-layout";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  Filter,
  Search,
  MoreVertical,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

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

const MobileOrdersTab = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    item_name: "",
    quantity: 1,
    rate: 0,
    payment_mode: "Cash",
    order_date: new Date(),
  });

  const [categories, setCategories] = useState<string[]>([]);
  const [paymentModes, setPaymentModes] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      fetchOrders();
      fetchCategories();
      fetchPaymentModes();
    }
  }, [user]);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("name")
        .eq("user_id", user.id)
        .eq("table_type", "orders");

      if (error) throw error;
      setCategories(data?.map((item) => item.name) || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchPaymentModes = async () => {
    try {
      const { data, error } = await supabase
        .from("payment_modes")
        .select("name")
        .eq("user_id", user.id)
        .in("table_type", ["orders", "all"]);

      if (error) throw error;
      setPaymentModes(
        data?.map((item) => item.name) || ["Cash", "Esewa", "Fonepay"],
      );
    } catch (error) {
      console.error("Error fetching payment modes:", error);
      setPaymentModes(["Cash", "Esewa", "Fonepay"]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.item_name || formData.rate <= 0) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      const total = formData.quantity * formData.rate;

      const orderDate = formData.order_date.toISOString().split("T")[0];

      const { error } = await supabase.from("orders").insert({
        user_id: user.id,
        item_name: formData.item_name,
        quantity: formData.quantity,
        rate: formData.rate,
        total,
        payment_mode: formData.payment_mode,
        order_date: orderDate,
        date: orderDate, // Add date field for compatibility
      });

      if (error) throw error;

      toast.success("Order added successfully!");
      setFormData({
        item_name: "",
        quantity: 1,
        rate: 0,
        payment_mode: "Cash",
        order_date: new Date(),
      });
      setShowAddForm(false);
      fetchOrders();
    } catch (error) {
      console.error("Error adding order:", error);

      let errorMessage = "Failed to add order";
      if (error?.code === "PGRST204") {
        errorMessage =
          "Database schema error. Please run the latest migration or refresh the page.";
      } else if (error?.message) {
        errorMessage = `Failed to add order: ${error.message}`;
      }

      toast.error(errorMessage);
    }
  };

  const deleteOrder = async (id: string) => {
    try {
      const { error } = await supabase.from("orders").delete().eq("id", id);

      if (error) throw error;

      toast.success("Order deleted successfully!");
      fetchOrders();
    } catch (error) {
      console.error("Error deleting order:", error);
      toast.error("Failed to delete order");
    }
  };

  const formatCurrency = (amount: number) => `NRs. ${amount.toFixed(2)}`;
  const formatDate = (date: string) => new Date(date).toLocaleDateString();

  if (loading) {
    return (
      <MobileLayout title="Orders" subtitle="Manage your food orders">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout
      title="Orders"
      subtitle={`${orders.length} orders recorded`}
      headerActions={
        <div className="flex items-center gap-2">
          <MobileButton variant="outline" size="icon" className="h-10 w-10">
            <Filter className="h-4 w-4" />
          </MobileButton>
          <MobileButton
            onClick={() => setShowAddForm(true)}
            icon={<Plus className="h-4 w-4" />}
          >
            Add Order
          </MobileButton>
        </div>
      }
    >
      {/* Quick Stats */}
      <MobileGrid cols={3} className="mb-6">
        <MobileCard className="text-center">
          <div className="flex flex-col items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <ShoppingCart className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-blue-600">{orders.length}</p>
              <p className="text-xs text-gray-600">Total Orders</p>
            </div>
          </div>
        </MobileCard>

        <MobileCard className="text-center">
          <div className="flex flex-col items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-green-600">
                {formatCurrency(
                  orders.reduce((sum, order) => sum + order.total, 0),
                )}
              </p>
              <p className="text-xs text-gray-600">Total Value</p>
            </div>
          </div>
        </MobileCard>

        <MobileCard className="text-center">
          <div className="flex flex-col items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-purple-600">
                {
                  orders.filter(
                    (o) =>
                      new Date(o.order_date).toDateString() ===
                      new Date().toDateString(),
                  ).length
                }
              </p>
              <p className="text-xs text-gray-600">Today</p>
            </div>
          </div>
        </MobileCard>
      </MobileGrid>

      {/* Orders List */}
      <div className="space-y-4">
        {orders.length === 0 ? (
          <MobileCard className="text-center py-12">
            <div className="flex flex-col items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center">
                <ShoppingCart className="h-8 w-8 text-gray-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  No orders yet
                </h3>
                <p className="text-gray-600 mt-1">
                  Start by adding your first order
                </p>
              </div>
              <MobileButton
                onClick={() => setShowAddForm(true)}
                icon={<Plus className="h-4 w-4" />}
              >
                Add First Order
              </MobileButton>
            </div>
          </MobileCard>
        ) : (
          orders.map((order) => (
            <MobileCard key={order.id} className="relative">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg text-gray-800">
                      {order.item_name}
                    </h3>
                    <Badge variant="secondary" className="text-xs">
                      {order.payment_mode}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Quantity</p>
                      <p className="font-medium">{order.quantity}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Rate</p>
                      <p className="font-medium">
                        {formatCurrency(order.rate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Total</p>
                      <p className="font-bold text-green-600">
                        {formatCurrency(order.total)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Date</p>
                      <p className="font-medium">
                        {formatDate(order.order_date)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="ml-4">
                  <MobileButton
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => deleteOrder(order.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </MobileButton>
                </div>
              </div>
            </MobileCard>
          ))
        )}
      </div>

      {/* Add Order Sheet */}
      <Sheet open={showAddForm} onOpenChange={setShowAddForm}>
        <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle className="text-left flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Add New Order
            </SheetTitle>
          </SheetHeader>

          <MobileForm onSubmit={handleSubmit} className="space-y-6">
            <MobileInput
              label="Item Name *"
              value={formData.item_name}
              onChange={(e) =>
                setFormData({ ...formData, item_name: e.target.value })
              }
              placeholder="Enter item name"
              icon={<ShoppingCart className="h-4 w-4" />}
            />

            <MobileGrid cols={2}>
              <MobileInput
                label="Quantity *"
                type="number"
                value={formData.quantity.toString()}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    quantity: parseInt(e.target.value) || 1,
                  })
                }
                min="1"
              />

              <MobileInput
                label="Rate (NRs) *"
                type="number"
                value={formData.rate.toString()}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    rate: parseFloat(e.target.value) || 0,
                  })
                }
                min="0"
                step="0.01"
              />
            </MobileGrid>

            <MobileSelect
              value={formData.payment_mode}
              onValueChange={(value) =>
                setFormData({ ...formData, payment_mode: value })
              }
            >
              <MobileSelectTrigger label="Payment Mode">
                <MobileSelectValue placeholder="Select payment mode" />
              </MobileSelectTrigger>
              <MobileSelectContent>
                {paymentModes.map((mode) => (
                  <MobileSelectItem key={mode} value={mode}>
                    {mode}
                  </MobileSelectItem>
                ))}
              </MobileSelectContent>
            </MobileSelect>

            <MobileDatePicker
              label="Order Date"
              date={formData.order_date}
              onDateChange={(date) =>
                setFormData({ ...formData, order_date: date || new Date() })
              }
            />

            {/* Total Display */}
            {formData.rate > 0 && (
              <MobileCard className="bg-green-50 border-green-200">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-green-800">
                    Total Amount:
                  </span>
                  <span className="text-xl font-bold text-green-600">
                    {formatCurrency(formData.quantity * formData.rate)}
                  </span>
                </div>
              </MobileCard>
            )}

            <MobileButtonGroup>
              <MobileButton
                type="button"
                variant="outline"
                onClick={() => setShowAddForm(false)}
                fullWidth
              >
                Cancel
              </MobileButton>
              <MobileButton
                type="submit"
                fullWidth
                icon={<CheckCircle className="h-4 w-4" />}
              >
                Add Order
              </MobileButton>
            </MobileButtonGroup>
          </MobileForm>
        </SheetContent>
      </Sheet>
    </MobileLayout>
  );
};

export default MobileOrdersTab;
