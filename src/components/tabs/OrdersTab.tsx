
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ShoppingCart, Plus, Minus, X, Search } from 'lucide-react';

interface Product {
  name: string;
  rate: number;
  category: string;
}

interface OrderItem {
  name: string;
  qty: number;
  rate: number;
}

const OrdersTab = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [paymentMode, setPaymentMode] = useState('');
  const [orderTabs, setOrderTabs] = useState<OrderItem[][]>([[]]);
  const [currentOrderTab, setCurrentOrderTab] = useState(0);

  // Mock products data
  const products: Product[] = [
    { name: 'Coffee', rate: 50, category: 'Beverages' },
    { name: 'Tea', rate: 30, category: 'Beverages' },
    { name: 'Sandwich', rate: 120, category: 'Food' },
    { name: 'Burger', rate: 200, category: 'Food' },
    { name: 'Water Bottle', rate: 25, category: 'Beverages' },
    { name: 'Energy Drink', rate: 80, category: 'Beverages' },
  ];

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];
  const paymentModes = ['Cash', 'Esewa', 'Fonepay'];

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const currentOrder = orderTabs[currentOrderTab] || [];
  const orderTotal = currentOrder.reduce((sum, item) => sum + (item.qty * item.rate), 0);

  const addToOrder = (product: Product) => {
    const newOrderTabs = [...orderTabs];
    const order = newOrderTabs[currentOrderTab];
    const existingItem = order.find(item => item.name === product.name);
    
    if (existingItem) {
      existingItem.qty += 1;
    } else {
      order.push({ name: product.name, qty: 1, rate: product.rate });
    }
    
    setOrderTabs(newOrderTabs);
  };

  const updateQuantity = (index: number, delta: number) => {
    const newOrderTabs = [...orderTabs];
    const order = newOrderTabs[currentOrderTab];
    order[index].qty = Math.max(1, order[index].qty + delta);
    setOrderTabs(newOrderTabs);
  };

  const removeFromOrder = (index: number) => {
    const newOrderTabs = [...orderTabs];
    newOrderTabs[currentOrderTab].splice(index, 1);
    setOrderTabs(newOrderTabs);
  };

  const addOrderTab = () => {
    setOrderTabs([...orderTabs, []]);
    setCurrentOrderTab(orderTabs.length);
  };

  const removeOrderTab = (index: number) => {
    if (orderTabs.length === 1) return;
    const newOrderTabs = orderTabs.filter((_, i) => i !== index);
    setOrderTabs(newOrderTabs);
    setCurrentOrderTab(Math.max(0, currentOrderTab - (index <= currentOrderTab ? 1 : 0)));
  };

  const submitOrder = async () => {
    if (!currentOrder.length || !paymentMode) {
      toast.error('Please add items and select payment mode');
      return;
    }

    // Mock order submission
    console.log('Submitting order:', { items: currentOrder, paymentMode, total: orderTotal });
    
    toast.success('Order submitted successfully!');
    
    // Clear current order
    const newOrderTabs = [...orderTabs];
    newOrderTabs[currentOrderTab] = [];
    setOrderTabs(newOrderTabs);
    setPaymentMode('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <ShoppingCart className="h-6 w-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">Orders Management</h2>
      </div>

      {/* Order Tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {orderTabs.map((_, index) => (
          <div key={index} className="flex items-center gap-1">
            <Button
              variant={currentOrderTab === index ? "default" : "outline"}
              size="sm"
              onClick={() => setCurrentOrderTab(index)}
              className={currentOrderTab === index ? "bg-blue-600 hover:bg-blue-700" : ""}
            >
              Order {index + 1}
            </Button>
            {orderTabs.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => removeOrderTab(index)}
                className="px-2 text-red-600 hover:bg-red-50"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addOrderTab}>
          <Plus className="h-3 w-3 mr-1" />
          New Order
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Products Section */}
        <Card>
          <CardHeader>
            <CardTitle>Products</CardTitle>
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.map(category => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                    className={selectedCategory === category ? "bg-blue-600 hover:bg-blue-700" : ""}
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
              {filteredProducts.map((product, index) => (
                <div
                  key={index}
                  onClick={() => addToOrder(product)}
                  className="p-4 border rounded-lg cursor-pointer hover:shadow-md hover:border-blue-300 transition-all bg-white"
                >
                  <div className="font-medium">{product.name}</div>
                  <div className="text-blue-600 font-semibold">Rs. {product.rate}</div>
                  <Badge variant="secondary" className="text-xs mt-1">
                    {product.category}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Cart Section */}
        <Card>
          <CardHeader>
            <CardTitle>Cart - Order {currentOrderTab + 1}</CardTitle>
          </CardHeader>
          <CardContent>
            {currentOrder.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                Cart is empty. Add some products!
              </div>
            ) : (
              <div className="space-y-4">
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {currentOrder.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-gray-600">Rs. {item.rate} each</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(index, -1)}
                          disabled={item.qty <= 1}
                          className="h-8 w-8 p-0"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center">{item.qty}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(index, 1)}
                          className="h-8 w-8 p-0"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeFromOrder(index)}
                          className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="w-20 text-right font-semibold">
                        Rs. {item.qty * item.rate}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="border-t pt-4">
                  <div className="flex justify-between text-lg font-bold mb-4">
                    <span>Total:</span>
                    <span>Rs. {orderTotal}</span>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-2">Payment Mode</label>
                      <div className="flex gap-2">
                        {paymentModes.map(mode => (
                          <Button
                            key={mode}
                            variant={paymentMode === mode ? "default" : "outline"}
                            size="sm"
                            onClick={() => setPaymentMode(mode)}
                            className={paymentMode === mode ? "bg-blue-600 hover:bg-blue-700" : ""}
                          >
                            {mode}
                          </Button>
                        ))}
                      </div>
                    </div>
                    
                    <Button
                      onClick={submitOrder}
                      className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                      size="lg"
                    >
                      Submit Order
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OrdersTab;
