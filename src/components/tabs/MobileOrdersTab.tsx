
import { useState } from "react";
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
    { name: "cash", icon: Banknote },
    { name: "esewa", icon: Smartphone },
    { name: "fonepay", icon: CreditCard },
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
      
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        const firstError = errors[0].error;
        logError("submitting order", firstError);
        throw firstError;
      }

      setOrderItems([]);
      setPaymentMode("cash");
      
      toast.success(`Order submitted successfully! Total: ₹ ${getOrderTotal().toFixed(2)}`);
      
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

  return (
    <div className="space-y-6 p-4 max-w-md mx-auto">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Mobile Orders</h2>
        </div>
        <p className="text-sm text-muted-foreground">Quick order entry for mobile devices</p>
      </div>

      <Card className="bg-card border">
        <CardHeader>
          <CardTitle className="text-base font-medium text-foreground">Add Order Item</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="item_name" className="text-foreground">Item Name</Label>
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
              <Label htmlFor="quantity" className="text-foreground">Quantity</Label>
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
              <Label htmlFor="rate" className="text-foreground">Rate (₹)</Label>
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

          <Button onClick={addOrderItem} className="w-full" variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </CardContent>
      </Card>

      {orderItems.length > 0 && (
        <Card className="bg-card border">
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center justify-between text-foreground">
              Order Summary
              <Badge variant="secondary">
                {orderItems.length} item{orderItems.length > 1 ? 's' : ''}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {orderItems.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-foreground">{item.item_name}</div>
                  <div className="text-sm text-muted-foreground">
                    {item.quantity} × ₹ {item.rate.toFixed(2)}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="font-semibold text-foreground">₹ {item.total.toFixed(2)}</div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => removeOrderItem(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            <div className="border-t pt-3 mt-4">
              <div className="flex justify-between items-center font-bold text-lg text-foreground">
                <span>Total:</span>
                <span>₹ {getOrderTotal().toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-card border">
        <CardHeader>
          <CardTitle className="text-base font-medium text-foreground">Payment Method</CardTitle>
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
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground"
                  }`}
                >
                  <IconComponent className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 text-left font-medium capitalize text-foreground">
                    {mode.name}
                  </span>
                  {paymentMode === mode.name && (
                    <div className="h-2 w-2 bg-primary rounded-full"></div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={submitOrder}
        disabled={isSubmitting || orderItems.length === 0}
        className="w-full h-12"
      >
        {isSubmitting ? (
          "Submitting Order..."
        ) : (
          <>
            <ShoppingCart className="h-4 w-4 mr-2" />
            Submit Order (₹ {getOrderTotal().toFixed(2)})
          </>
        )}
      </Button>

      <Card className="bg-muted border">
        <CardContent className="p-4 text-center">
          <div className="text-sm text-muted-foreground">
            Order Date: {format(new Date(), 'PPP')}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MobileOrdersTab;
