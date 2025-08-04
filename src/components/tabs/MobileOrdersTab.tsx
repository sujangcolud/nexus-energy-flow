
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, ShoppingCart, CreditCard, Banknote, Smartphone } from "lucide-react";
import { format } from "date-fns";
import { extractErrorMessage, logError } from "@/utils/errorHandling";

interface OrderItem {
  item_name: string;
  quantity: number;
  rate: number;
  total: number;
}

interface PaymentMode {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const MobileOrdersTab: React.FC = () => {
  const { user } = useAuth();
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [currentItem, setCurrentItem] = useState({
    item_name: "",
    quantity: 1,
    rate: 0,
  });
  const [paymentMode, setPaymentMode] = useState("cash");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availablePaymentModes] = useState<PaymentMode[]>([
    { name: "cash", icon: Banknote, color: "bg-green-100 text-green-800" },
    { name: "esewa", icon: Smartphone, color: "bg-blue-100 text-blue-800" },
    { name: "fonepay", icon: CreditCard, color: "bg-purple-100 text-purple-800" },
  ]);

  const addOrderItem = () => {
    if (!currentItem.item_name || currentItem.quantity <= 0 || currentItem.rate <= 0) {
      toast.error("Please fill all item details correctly");
      return;
    }

    const total = currentItem.quantity * currentItem.rate;
    const newItem: OrderItem = {
      ...currentItem,
      total,
    };

    setOrderItems([...orderItems, newItem]);
    setCurrentItem({ item_name: "", quantity: 1, rate: 0 });
    toast.success("Item added to order");
  };

  const removeOrderItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
    toast.success("Item removed from order");
  };

  const getOrderTotal = () => {
    return orderItems.reduce((sum, item) => sum + item.total, 0);
  };

  const submitOrder = async () => {
    if (!user) {
      toast.error("You must be logged in to submit orders");
      return;
    }

    if (orderItems.length === 0) {
      toast.error("Please add at least one item to the order");
      return;
    }

    setIsSubmitting(true);
    try {
      const orderDate = new Date().toISOString().split('T')[0];
      const orderPromises = orderItems.map((item) =>
        supabase.rpc("insert_order_safe", {
          p_user_id: user.id,
          p_item_name: item.item_name,
          p_quantity: item.quantity,
          p_rate: item.rate,
          p_total: item.total,
          p_payment_mode: paymentMode,
          p_order_date: orderDate,
        })
      );

      const results = await Promise.all(orderPromises);
      
      // Check for any errors
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        const firstError = errors[0].error;
        logError("submitting order", firstError);
        throw firstError;
      }

      // Clear the form
      setOrderItems([]);
      setPaymentMode("cash");
      
      toast.success(`Order submitted successfully! Total: NRs. ${getOrderTotal().toFixed(2)}`);
      
      // Update daily summary for today
      const today = new Date().toISOString().split('T')[0];
      await supabase.rpc("update_enhanced_daily_summary", {
        target_date: today,
      });

    } catch (error) {
      logError("submitting order", error);
      toast.error(`Failed to submit order: ${extractErrorMessage(error)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPaymentModeDetails = (mode: string) => {
    return availablePaymentModes.find(pm => pm.name === mode) || availablePaymentModes[0];
  };

  return (
    <div className="space-y-6 p-4 max-w-md mx-auto">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <ShoppingCart className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-800">Mobile Orders</h2>
        </div>
        <p className="text-gray-600">Quick order entry for mobile devices</p>
      </div>

      {/* Add Item Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add Order Item</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="item_name">Item Name</Label>
            <Input
              id="item_name"
              type="text"
              value={currentItem.item_name}
              onChange={(e) =>
                setCurrentItem({ ...currentItem, item_name: e.target.value })
              }
              placeholder="Enter item name"
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={currentItem.quantity}
                onChange={(e) =>
                  setCurrentItem({
                    ...currentItem,
                    quantity: parseInt(e.target.value) || 1,
                  })
                }
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="rate">Rate (NRs.)</Label>
              <Input
                id="rate"
                type="number"
                min="0"
                step="0.01"
                value={currentItem.rate}
                onChange={(e) =>
                  setCurrentItem({
                    ...currentItem,
                    rate: parseFloat(e.target.value) || 0,
                  })
                }
                className="mt-1"
              />
            </div>
          </div>

          <Button
            onClick={addOrderItem}
            className="w-full"
            variant="outline"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </CardContent>
      </Card>

      {/* Order Items List */}
      {orderItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              Order Summary
              <Badge variant="secondary">
                {orderItems.length} item{orderItems.length > 1 ? 's' : ''}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {orderItems.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {item.item_name}
                  </div>
                  <div className="text-sm text-gray-600">
                    {item.quantity} × NRs. {item.rate.toFixed(2)}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="font-semibold text-gray-900">
                    NRs. {item.total.toFixed(2)}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => removeOrderItem(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            <div className="border-t pt-3 mt-4">
              <div className="flex justify-between items-center font-bold text-lg">
                <span>Total:</span>
                <span>NRs. {getOrderTotal().toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Mode Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payment Method</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3">
            {availablePaymentModes.map((mode) => {
              const IconComponent = mode.icon;
              return (
                <button
                  key={mode.name}
                  onClick={() => setPaymentMode(mode.name)}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                    paymentMode === mode.name
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <IconComponent className="h-5 w-5" />
                  <span className="flex-1 text-left font-medium capitalize">
                    {mode.name}
                  </span>
                  {paymentMode === mode.name && (
                    <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <Button
        onClick={submitOrder}
        disabled={isSubmitting || orderItems.length === 0}
        className="w-full h-12 text-lg"
      >
        {isSubmitting ? (
          "Submitting Order..."
        ) : (
          <>
            <ShoppingCart className="h-5 w-5 mr-2" />
            Submit Order (NRs. {getOrderTotal().toFixed(2)})
          </>
        )}
      </Button>

      {/* Current Date Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4 text-center">
          <div className="text-sm text-blue-700">
            Order Date: {format(new Date(), 'PPP')}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MobileOrdersTab;
