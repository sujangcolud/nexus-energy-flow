import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { FileText, Calculator, DollarSign, TrendingUp, ShoppingCart, Zap, Receipt, CreditCard, Banknote, Users } from 'lucide-react';

const ReportsViewTab = () => {
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [reportData, setReportData] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedDayData, setSelectedDayData] = useState<any>(null);

  const formatCurrency = (amount: number) => `NRs. ${amount.toFixed(2)}`;

  const fetchReportData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { startDate, endDate } = dateRange;
      
      // Fetch all data types
      const [ordersRes, chargingRes, expensesRes, savingsRes, depositsRes, withdrawalsRes] = await Promise.all([
        supabase.from('orders').select('*').gte('order_date', startDate).lte('order_date', endDate).eq('user_id', user.id),
        supabase.from('charging_sessions').select('*').gte('session_date', startDate).lte('session_date', endDate).eq('user_id', user.id),
        supabase.from('expenses').select('*').gte('expense_date', startDate).lte('expense_date', endDate).eq('user_id', user.id),
        supabase.from('cooperative_savings').select('*').gte('contribution_date', startDate).lte('contribution_date', endDate).eq('user_id', user.id),
        supabase.from('deposits').select('*').gte('deposit_date', startDate).lte('deposit_date', endDate).eq('user_id', user.id),
        supabase.from('withdrawals').select('*').gte('withdrawal_date', startDate).lte('withdrawal_date', endDate).eq('user_id', user.id)
      ]);

      setReportData({
        orders: ordersRes.data || [],
        charging: chargingRes.data || [],
        expenses: expensesRes.data || [],
        savings: savingsRes.data || [],
        deposits: depositsRes.data || [],
        withdrawals: withdrawalsRes.data || []
      });
    } catch (error: any) {
      console.error('Error fetching report data:', error);
      toast.error('Failed to fetch report data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [dateRange, user]);

  const generateDailyCombinedReport = () => {
    const dailyData: { [key: string]: any } = {};
    
    // First, initialize all days in the date range with zero values
    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0];
      dailyData[dateStr] = {
        date: dateStr,
        orders: 0,
        charging: 0,
        expenses: 0,
        savings: 0,
        deposits: 0,
        withdrawals: 0
      };
    }
    
    // A helper to get the date part of a timestamp
    const getDatePart = (isoString: string) => isoString.split('T')[0];

    // Process all data types using their respective date fields
    const processData = (items: any[], type: string, dateField: string, valueField: string) => {
      items?.forEach((item: any) => {
        const date = getDatePart(item[dateField]);
        if (dailyData[date]) { // Only process if the date is in our range
          dailyData[date][type] += parseFloat(item[valueField] || 0);
        }
      });
    };

    processData(reportData.orders, 'orders', 'order_date', 'total');
    processData(reportData.charging, 'charging', 'session_date', 'total_amount');
    processData(reportData.expenses, 'expenses', 'expense_date', 'amount');
    processData(reportData.savings, 'savings', 'contribution_date', 'contribution_amount');
    processData(reportData.deposits, 'deposits', 'deposit_date', 'amount');
    processData(reportData.withdrawals, 'withdrawals', 'withdrawal_date', 'amount');

    // Calculate totals and balance
    const result = Object.values(dailyData).map((day: any) => ({
      ...day,
      totalIncome: day.orders + day.charging,
      totalBalance: (day.orders + day.charging) - day.expenses - day.withdrawals + day.savings + day.deposits
    }));

    return result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const handleRowClick = (date: string) => {
    const filterByDate = (item: any, dateField: string) => item[dateField] && item[dateField].startsWith(date);

    const details = {
      date,
      orders: reportData.orders.filter((item: any) => filterByDate(item, 'order_date')),
      charging: reportData.charging.filter((item: any) => filterByDate(item, 'session_date')),
      expenses: reportData.expenses.filter((item: any) => filterByDate(item, 'expense_date')),
      savings: reportData.savings.filter((item: any) => filterByDate(item, 'contribution_date')),
      deposits: reportData.deposits.filter((item: any) => filterByDate(item, 'deposit_date')),
      withdrawals: reportData.withdrawals.filter((item: any) => filterByDate(item, 'withdrawal_date')),
    };

    setSelectedDayData(details);
    setIsDetailModalOpen(true);
  };

  const generatePaymentMethodReport = () => {
    const paymentData = { Fonepay: 0, Esewa: 0, Cash: 0, 'Bank Transfer': 0, Cheque: 0 };
    
    // Orders payment methods
    reportData.orders?.forEach((order: any) => {
      if (paymentData.hasOwnProperty(order.payment_mode)) {
        paymentData[order.payment_mode as keyof typeof paymentData] += parseFloat(order.total);
      }
    });

    // Charging payment methods  
    reportData.charging?.forEach((charge: any) => {
      if (paymentData.hasOwnProperty(charge.payment_mode)) {
        paymentData[charge.payment_mode as keyof typeof paymentData] += parseFloat(charge.total_amount);
      }
    });

    // Expenses payment methods
    reportData.expenses?.forEach((expense: any) => {
      if (paymentData.hasOwnProperty(expense.payment_mode)) {
        paymentData[expense.payment_mode as keyof typeof paymentData] -= parseFloat(expense.amount);
      }
    });

    // Deposits by mode
    reportData.deposits?.forEach((deposit: any) => {
      if (paymentData.hasOwnProperty(deposit.mode)) {
        paymentData[deposit.mode as keyof typeof paymentData] += parseFloat(deposit.amount);
      }
    });

    return Object.entries(paymentData).map(([method, balance]) => ({ method, balance }));
  };

  const generateBalanceReport = () => {
    const balances = { Esewa: 0, Cash: 0, Bank: 0, CooperativeSavings: 0 };
    
    // Add income from orders and charging
    reportData.orders?.forEach((order: any) => {
      if (order.payment_mode === 'Esewa') balances.Esewa += parseFloat(order.total);
      else if (order.payment_mode === 'Cash Deposit') balances.Cash += parseFloat(order.total);
      else if (order.payment_mode === 'Bank Transfer') balances.Bank += parseFloat(order.total);
    });

    reportData.charging?.forEach((charge: any) => {
      if (charge.payment_mode === 'Esewa') balances.Esewa += parseFloat(charge.total_amount);
      else if (charge.payment_mode === 'Cash Deposit') balances.Cash += parseFloat(charge.total_amount);
      else if (charge.payment_mode === 'Bank Transfer') balances.Bank += parseFloat(charge.total_amount);
    });

    // Add deposits
    reportData.deposits?.forEach((deposit: any) => {
      if (deposit.mode === 'Esewa') balances.Esewa += parseFloat(deposit.amount);
      else if (deposit.mode === 'Cash Deposit') balances.Cash += parseFloat(deposit.amount);
      else if (deposit.mode === 'Bank Transfer') balances.Bank += parseFloat(deposit.amount);
    });

    // Subtract expenses
    reportData.expenses?.forEach((expense: any) => {
      if (expense.payment_mode === 'Esewa') balances.Esewa -= parseFloat(expense.amount);
      else if (expense.payment_mode === 'Cash Deposit') balances.Cash -= parseFloat(expense.amount);
      else if (expense.payment_mode === 'Bank Transfer') balances.Bank -= parseFloat(expense.amount);
    });

    // Subtract withdrawals (assuming they come from bank)
    reportData.withdrawals?.forEach((withdrawal: any) => {
      balances.Bank -= parseFloat(withdrawal.amount);
    });

    // Add cooperative savings
    reportData.savings?.forEach((saving: any) => {
      balances.CooperativeSavings += parseFloat(saving.contribution_amount);
    });

    return Object.entries(balances).map(([type, balance]) => ({ type, balance }));
  };

  const generateMonthlyProjection = () => {
    const monthlyIncome = reportData.orders?.reduce((sum: number, order: any) => sum + parseFloat(order.total), 0) + 
                         reportData.charging?.reduce((sum: number, charge: any) => sum + parseFloat(charge.total_amount), 0);
    const monthlyExpenses = reportData.expenses?.reduce((sum: number, expense: any) => sum + parseFloat(expense.amount), 0);
    
    const dailyIncome = monthlyIncome / 30;
    const dailyExpenses = monthlyExpenses / 30;
    
    return {
      projectedMonthlyIncome: dailyIncome * 30,
      projectedMonthlyExpenses: dailyExpenses * 30,
      projectedMonthlyProfit: (dailyIncome - dailyExpenses) * 30
    };
  };

  const dailyCombinedData = generateDailyCombinedReport();
  const paymentMethodData = generatePaymentMethodReport();
  const balanceData = generateBalanceReport();
  const projectionData = generateMonthlyProjection();

  // Calculate totals for daily combined report
  const totals = dailyCombinedData.reduce((acc, day) => ({
    orders: acc.orders + day.orders,
    charging: acc.charging + day.charging,
    totalIncome: acc.totalIncome + day.totalIncome,
    expenses: acc.expenses + day.expenses,
    savings: acc.savings + day.savings,
    deposits: acc.deposits + day.deposits,
    withdrawals: acc.withdrawals + day.withdrawals,
    totalBalance: acc.totalBalance + day.totalBalance
  }), { orders: 0, charging: 0, totalIncome: 0, expenses: 0, savings: 0, deposits: 0, withdrawals: 0, totalBalance: 0 });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <FileText className="h-6 w-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">Reports View</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Date Range Filter</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4 sm:items-end">
          <div className="space-y-2 w-full sm:w-auto"> {/* Ensure inputs take full width when stacked */}
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
            />
          </div>
          <Button onClick={fetchReportData} disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Refresh Reports'}
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="combined" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="combined">Combined Daily</TabsTrigger>
          <TabsTrigger value="payment">Payment Methods</TabsTrigger>
          <TabsTrigger value="balances">Balances</TabsTrigger>
          <TabsTrigger value="projection">Monthly Projection</TabsTrigger>
        </TabsList>

        <TabsContent value="combined">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Daily Combined Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Charging</TableHead>
                    <TableHead>Income (Order+Charging)</TableHead>
                    <TableHead>Expenses</TableHead>
                    <TableHead>Savings</TableHead>
                    <TableHead>Deposits</TableHead>
                    <TableHead>Withdrawals</TableHead>
                    <TableHead>Balance</TableHead>
                  </TableRow>
                  <TableRow className="bg-gray-100 font-semibold">
                    <TableCell>TOTAL</TableCell>
                    <TableCell>{formatCurrency(totals.orders)}</TableCell>
                    <TableCell>{formatCurrency(totals.charging)}</TableCell>
                    <TableCell>{formatCurrency(totals.totalIncome)}</TableCell>
                    <TableCell>{formatCurrency(totals.expenses)}</TableCell>
                    <TableCell>{formatCurrency(totals.savings)}</TableCell>
                    <TableCell>{formatCurrency(totals.deposits)}</TableCell>
                    <TableCell>{formatCurrency(totals.withdrawals)}</TableCell>
                    <TableCell>{formatCurrency(totals.totalBalance)}</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailyCombinedData.map((day, index) => (
                    <TableRow key={index} onClick={() => handleRowClick(day.date)} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>{day.date}</TableCell>
                      <TableCell>{formatCurrency(day.orders)}</TableCell>
                      <TableCell>{formatCurrency(day.charging)}</TableCell>
                      <TableCell>{formatCurrency(day.totalIncome)}</TableCell>
                      <TableCell>{formatCurrency(day.expenses)}</TableCell>
                      <TableCell>{formatCurrency(day.savings)}</TableCell>
                      <TableCell>{formatCurrency(day.deposits)}</TableCell>
                      <TableCell>{formatCurrency(day.withdrawals)}</TableCell>
                      <TableCell>{formatCurrency(day.totalBalance)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Payment Method Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Net Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentMethodData.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.method}</TableCell>
                      <TableCell>{formatCurrency(item.balance)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="balances">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Account Balances
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Type</TableHead>
                    <TableHead>Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {balanceData.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.type.replace(/([A-Z])/g, ' $1').trim()}</TableCell>
                      <TableCell>{formatCurrency(item.balance)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projection">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Monthly Financial Projection
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(projectionData.projectedMonthlyIncome)}
                    </div>
                    <p className="text-sm text-muted-foreground">Projected Monthly Income</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-red-600">
                      {formatCurrency(projectionData.projectedMonthlyExpenses)}
                    </div>
                    <p className="text-sm text-muted-foreground">Projected Monthly Expenses</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency(projectionData.projectedMonthlyProfit)}
                    </div>
                    <p className="text-sm text-muted-foreground">Projected Monthly Profit</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Daily Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="sm:max-w-4xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Daily Transaction Details</DialogTitle>
            <DialogDescription>
              Detailed breakdown for {selectedDayData?.date}.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-grow p-4 space-y-6">
            {selectedDayData && (
              <>
                {/* Orders */}
                <DetailSection title="Orders" icon={ShoppingCart} data={selectedDayData.orders} columns={['item_name', 'quantity', 'rate', 'total', 'payment_mode']} />
                {/* Charging */}
                <DetailSection title="Charging" icon={Zap} data={selectedDayData.charging} columns={['total_amount', 'payment_mode', 'start_percentage', 'end_percentage']} />
                {/* Expenses */}
                <DetailSection title="Expenses" icon={Receipt} data={selectedDayData.expenses} columns={['description', 'category', 'amount', 'payment_mode']} />
                {/* Deposits */}
                <DetailSection title="Deposits" icon={CreditCard} data={selectedDayData.deposits} columns={['deposited_by', 'mode', 'amount', 'remarks']} />
                {/* Withdrawals */}
                <DetailSection title="Withdrawals" icon={Banknote} data={selectedDayData.withdrawals} columns={['purpose', 'recipient', 'amount']} />
                {/* Savings */}
                <DetailSection title="Savings" icon={Users} data={selectedDayData.savings} columns={['member_id', 'contribution_amount']} />
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Helper component for rendering detail sections in the modal
const DetailSection = ({ title, icon: Icon, data, columns }: { title: string, icon: React.ElementType, data: any[], columns: string[] }) => {
  if (!data || data.length === 0) return null;

  // Group orders by item name and payment method (only for Orders section)
  const processedData = title === 'Orders' ? groupOrdersByItemAndPayment(data) : data;

  // Calculate total amount for the section
  const total = processedData.reduce((sum, item) => {
    const amount = item.total || item.total_amount || item.amount || item.contribution_amount || 0;
    return sum + Number(amount);
  }, 0);

  const amountColumn = columns.find(c => ['total', 'total_amount', 'amount', 'contribution_amount'].includes(c));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <Icon className="h-5 w-5" /> {title} ({processedData.length})
          </span>
          <span className="text-base font-semibold">
            Total: NRs. {total.toFixed(2)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map(col => <TableHead key={col}>{col.replace(/_/g, ' ')}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {processedData.map((item, index) => (
              <TableRow key={index}>
                {columns.map(col => <TableCell key={col}>{item[col]}</TableCell>)}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

// Helper function to group orders by item name and payment method
const groupOrdersByItemAndPayment = (orders: any[]) => {
  const grouped = orders.reduce((acc, order) => {
    const key = `${order.item_name}_${order.payment_mode}`;
    
    if (!acc[key]) {
      acc[key] = {
        item_name: order.item_name,
        quantity: 0,
        rate: order.rate,
        total: 0,
        payment_mode: order.payment_mode
      };
    }
    
    acc[key].quantity += Number(order.quantity);
    acc[key].total += Number(order.total);
    
    return acc;
  }, {});
  
  return Object.values(grouped);
};

export default ReportsViewTab;
