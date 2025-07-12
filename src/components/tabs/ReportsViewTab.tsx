import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { FileText, Calendar as CalendarIcon, ShoppingCart, Zap, Receipt, Users, Banknote, CreditCard, BarChart, Download } from 'lucide-react';
import { format } from 'date-fns';

interface ReportData {
  summary: any;
  data: any[];
  dateRange: { from: string | null; to: string | null };
}

interface DailyReportData {
  date: string;
  orders_total: number;
  charging_total: number;
  total_income: number;
  expenses_total: number;
  savings_total: number;
  deposits_total: number;
  withdrawals_total: number;
  total_balance: number;
}

interface PaymentMethodData {
  method: string;
  orders_count: number;
  orders_amount: number;
  charging_count: number;
  charging_amount: number;
  expenses_count: number;
  expenses_amount: number;
  total_amount: number;
}

const ReportsViewTab = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeReport, setActiveReport] = useState('orders');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [dailyReportData, setDailyReportData] = useState<DailyReportData[]>([]);
  const [paymentMethodData, setPaymentMethodData] = useState<PaymentMethodData[]>([]);
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();

  const reportTypes = [
    { value: 'orders', label: 'Orders', icon: ShoppingCart },
    { value: 'charging', label: 'Charging', icon: Zap },
    { value: 'expenses', label: 'Expenses', icon: Receipt },
    { value: 'savings', label: 'Savings', icon: Users },
    { value: 'withdrawals', label: 'Withdrawals', icon: Banknote },
    { value: 'deposits', label: 'Deposits', icon: CreditCard }
  ];

  const generateReport = async (reportType: string) => {
    if (!user) return;

    setLoading(true);
    try {
      const startDate = dateFrom ? format(dateFrom, 'yyyy-MM-dd') : null;
      const endDate = dateTo ? format(dateTo, 'yyyy-MM-dd') : null;

      let reportData: ReportData;

      switch (reportType) {
        case 'orders':
          reportData = await generateOrdersReport(startDate, endDate);
          break;
        case 'charging':
          reportData = await generateChargingReport(startDate, endDate);
          break;
        case 'expenses':
          reportData = await generateExpensesReport(startDate, endDate);
          break;
        case 'savings':
          reportData = await generateSavingsReport(startDate, endDate);
          break;
        case 'withdrawals':
          reportData = await generateWithdrawalsReport(startDate, endDate);
          break;
        case 'deposits':
          reportData = await generateDepositsReport(startDate, endDate);
          break;
        default:
          throw new Error('Invalid report type');
      }

      setReportData(reportData);
      setActiveReport(reportType);
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const generateDailyReport = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const startDate = dateFrom ? format(dateFrom, 'yyyy-MM-dd') : format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
      const endDate = dateTo ? format(dateTo, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');

      // Fetch all data
      const [ordersData, chargingData, expensesData, savingsData, depositsData, withdrawalsData] = await Promise.all([
        supabase.from('orders').select('*').eq('user_id', user.id).gte('order_date', startDate).lte('order_date', endDate),
        supabase.from('charging_sessions').select('*').eq('user_id', user.id).gte('session_date', startDate).lte('session_date', endDate),
        supabase.from('expenses').select('*').eq('user_id', user.id).gte('expense_date', startDate).lte('expense_date', endDate),
        supabase.from('cooperative_savings').select('*').eq('user_id', user.id).gte('contribution_date', startDate).lte('contribution_date', endDate),
        supabase.from('deposits').select('*').eq('user_id', user.id).gte('deposit_date', startDate).lte('deposit_date', endDate),
        supabase.from('withdrawals').select('*').eq('user_id', user.id).gte('withdrawal_date', startDate).lte('withdrawal_date', endDate)
      ]);

      // Group by date
      const dailyData: { [key: string]: DailyReportData } = {};
      
      // Initialize dates
      const currentDate = new Date(startDate);
      const endDateObj = new Date(endDate);
      while (currentDate <= endDateObj) {
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        dailyData[dateStr] = {
          date: dateStr,
          orders_total: 0,
          charging_total: 0,
          total_income: 0,
          expenses_total: 0,
          savings_total: 0,
          deposits_total: 0,
          withdrawals_total: 0,
          total_balance: 0
        };
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Process orders
      ordersData.data?.forEach(order => {
        const date = order.order_date;
        if (dailyData[date]) {
          dailyData[date].orders_total += Number(order.total);
        }
      });

      // Process charging
      chargingData.data?.forEach(session => {
        const date = session.session_date;
        if (dailyData[date]) {
          dailyData[date].charging_total += Number(session.total_amount);
        }
      });

      // Process expenses
      expensesData.data?.forEach(expense => {
        const date = expense.expense_date;
        if (dailyData[date]) {
          dailyData[date].expenses_total += Number(expense.amount);
        }
      });

      // Process savings
      savingsData.data?.forEach(saving => {
        const date = saving.contribution_date;
        if (dailyData[date]) {
          dailyData[date].savings_total += Number(saving.contribution_amount);
        }
      });

      // Process deposits
      depositsData.data?.forEach(deposit => {
        const date = deposit.deposit_date;
        if (dailyData[date]) {
          dailyData[date].deposits_total += Number(deposit.amount);
        }
      });

      // Process withdrawals
      withdrawalsData.data?.forEach(withdrawal => {
        const date = withdrawal.withdrawal_date;
        if (dailyData[date]) {
          dailyData[date].withdrawals_total += Number(withdrawal.amount);
        }
      });

      // Calculate totals
      Object.keys(dailyData).forEach(date => {
        const data = dailyData[date];
        data.total_income = data.orders_total + data.charging_total;
        data.total_balance = data.total_income - data.expenses_total - data.withdrawals_total + data.savings_total + data.deposits_total;
      });

      setDailyReportData(Object.values(dailyData).filter(data => 
        data.orders_total > 0 || data.charging_total > 0 || data.expenses_total > 0 || 
        data.savings_total > 0 || data.deposits_total > 0 || data.withdrawals_total > 0
      ));
    } catch (error) {
      console.error('Error generating daily report:', error);
      toast.error('Failed to generate daily report');
    } finally {
      setLoading(false);
    }
  };

  const generatePaymentMethodReport = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const startDate = dateFrom ? format(dateFrom, 'yyyy-MM-dd') : format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
      const endDate = dateTo ? format(dateTo, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');

      const [ordersData, chargingData, expensesData] = await Promise.all([
        supabase.from('orders').select('*').eq('user_id', user.id).gte('order_date', startDate).lte('order_date', endDate),
        supabase.from('charging_sessions').select('*').eq('user_id', user.id).gte('session_date', startDate).lte('session_date', endDate),
        supabase.from('expenses').select('*').eq('user_id', user.id).gte('expense_date', startDate).lte('expense_date', endDate)
      ]);

      const methodData: { [key: string]: PaymentMethodData } = {};
      const methods = ['Fonepay', 'Esewa', 'Cash', 'Bank Transfer', 'Cheque'];

      // Initialize methods
      methods.forEach(method => {
        methodData[method] = {
          method,
          orders_count: 0,
          orders_amount: 0,
          charging_count: 0,
          charging_amount: 0,
          expenses_count: 0,
          expenses_amount: 0,
          total_amount: 0
        };
      });

      // Process orders
      ordersData.data?.forEach(order => {
        const method = order.payment_mode;
        if (methodData[method]) {
          methodData[method].orders_count++;
          methodData[method].orders_amount += Number(order.total);
        }
      });

      // Process charging
      chargingData.data?.forEach(session => {
        const method = session.payment_mode;
        if (methodData[method]) {
          methodData[method].charging_count++;
          methodData[method].charging_amount += Number(session.total_amount);
        }
      });

      // Process expenses
      expensesData.data?.forEach(expense => {
        const method = expense.payment_mode;
        if (methodData[method]) {
          methodData[method].expenses_count++;
          methodData[method].expenses_amount += Number(expense.amount);
        }
      });

      // Calculate totals
      Object.keys(methodData).forEach(method => {
        const data = methodData[method];
        data.total_amount = data.orders_amount + data.charging_amount - data.expenses_amount;
      });

      setPaymentMethodData(Object.values(methodData).filter(data => 
        data.orders_count > 0 || data.charging_count > 0 || data.expenses_count > 0
      ));
    } catch (error) {
      console.error('Error generating payment method report:', error);
      toast.error('Failed to generate payment method report');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => 
        typeof row[header] === 'string' && row[header].includes(',') 
          ? `"${row[header]}"` 
          : row[header]
      ).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const generateOrdersReport = async (startDate: string | null, endDate: string | null): Promise<ReportData> => {
    let query = supabase.from('orders').select('*').eq('user_id', user!.id);
    
    if (startDate && endDate) {
      query = query.gte('order_date', startDate).lte('order_date', endDate);
    }
    
    const { data: orders } = await query.order('order_date', { ascending: false });

    const totalRevenue = orders?.reduce((sum, order) => sum + Number(order.total), 0) || 0;
    const totalOrders = orders?.length || 0;

    return {
      summary: { totalRevenue, totalOrders },
      data: orders || [],
      dateRange: { from: startDate, to: endDate }
    };
  };

  const generateChargingReport = async (startDate: string | null, endDate: string | null): Promise<ReportData> => {
    let query = supabase.from('charging_sessions').select('*').eq('user_id', user!.id);
    
    if (startDate && endDate) {
      query = query.gte('session_date', startDate).lte('session_date', endDate);
    }
    
    const { data: sessions } = await query.order('session_date', { ascending: false });

    const totalRevenue = sessions?.reduce((sum, session) => sum + Number(session.total_amount), 0) || 0;
    const totalSessions = sessions?.length || 0;

    return {
      summary: { totalRevenue, totalSessions },
      data: sessions || [],
      dateRange: { from: startDate, to: endDate }
    };
  };

  const generateExpensesReport = async (startDate: string | null, endDate: string | null): Promise<ReportData> => {
    let query = supabase.from('expenses').select('*').eq('user_id', user!.id);
    
    if (startDate && endDate) {
      query = query.gte('expense_date', startDate).lte('expense_date', endDate);
    }
    
    const { data: expenses } = await query.order('expense_date', { ascending: false });

    const totalExpenses = expenses?.reduce((sum, expense) => sum + Number(expense.amount), 0) || 0;
    const totalTransactions = expenses?.length || 0;

    return {
      summary: { totalExpenses, totalTransactions },
      data: expenses || [],
      dateRange: { from: startDate, to: endDate }
    };
  };

  const generateSavingsReport = async (startDate: string | null, endDate: string | null): Promise<ReportData> => {
    let query = supabase.from('cooperative_savings').select('*').eq('user_id', user!.id);
    
    if (startDate && endDate) {
      query = query.gte('contribution_date', startDate).lte('contribution_date', endDate);
    }
    
    const { data: savings } = await query.order('contribution_date', { ascending: false });

    const totalSavings = savings?.reduce((sum, saving) => sum + Number(saving.contribution_amount), 0) || 0;
    const totalContributions = savings?.length || 0;

    return {
      summary: { totalSavings, totalContributions },
      data: savings || [],
      dateRange: { from: startDate, to: endDate }
    };
  };

  const generateWithdrawalsReport = async (startDate: string | null, endDate: string | null): Promise<ReportData> => {
    let query = supabase.from('withdrawals').select('*').eq('user_id', user!.id);
    
    if (startDate && endDate) {
      query = query.gte('withdrawal_date', startDate).lte('withdrawal_date', endDate);
    }
    
    const { data: withdrawals } = await query.order('withdrawal_date', { ascending: false });

    const totalWithdrawals = withdrawals?.reduce((sum, withdrawal) => sum + Number(withdrawal.amount), 0) || 0;
    const totalTransactions = withdrawals?.length || 0;

    return {
      summary: { totalWithdrawals, totalTransactions },
      data: withdrawals || [],
      dateRange: { from: startDate, to: endDate }
    };
  };

  const generateDepositsReport = async (startDate: string | null, endDate: string | null): Promise<ReportData> => {
    let query = supabase.from('deposits').select('*').eq('user_id', user!.id);
    
    if (startDate && endDate) {
      query = query.gte('deposit_date', startDate).lte('deposit_date', endDate);
    }
    
    const { data: deposits } = await query.order('deposit_date', { ascending: false });

    const totalDeposits = deposits?.reduce((sum, deposit) => sum + Number(deposit.amount), 0) || 0;
    const totalTransactions = deposits?.length || 0;

    return {
      summary: { totalDeposits, totalTransactions },
      data: deposits || [],
      dateRange: { from: startDate, to: endDate }
    };
  };

  const renderReportTable = () => {
    if (!reportData || !reportData.data.length) {
      return (
        <div className="text-center py-8 text-gray-500">
          No data available for the selected date range.
        </div>
      );
    }

    const data = reportData.data;
    const firstItem = data[0];
    const columns = Object.keys(firstItem).filter(key => 
      !['id', 'user_id', 'created_at'].includes(key)
    );

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column} className="capitalize">
                  {column.replace(/_/g, ' ')}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item, index) => (
              <TableRow key={index}>
                {columns.map((column) => (
                  <TableCell key={column}>
                    {typeof item[column] === 'number' && (column.includes('amount') || column.includes('total') || column.includes('rate'))
                      ? `₹${Number(item[column]).toFixed(2)}`
                      : item[column]?.toString() || '-'
                    }
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  useEffect(() => {
    generateReport('orders');
  }, [user]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900">Reports View</h2>
      </div>

      {/* Date Range Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Date Range Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">From Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">To Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different report views */}
      <Tabs defaultValue="individual" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="individual">Individual Reports</TabsTrigger>
          <TabsTrigger value="daily">Daily Combined Report</TabsTrigger>
          <TabsTrigger value="payment">Payment Method Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="individual" className="space-y-4">
          {/* Report Type Buttons */}
          <Card>
            <CardHeader>
              <CardTitle>Select Report Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {reportTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <Button
                      key={type.value}
                      variant={activeReport === type.value ? "default" : "outline"}
                      onClick={() => generateReport(type.value)}
                      disabled={loading}
                      className="flex flex-col items-center gap-2 h-20"
                    >
                      <Icon className="h-6 w-6" />
                      <span className="text-xs">{type.label}</span>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Report Display */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="capitalize">
                  {reportTypes.find(t => t.value === activeReport)?.label} Report
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => reportData && exportToCSV(reportData.data, `${activeReport}_report.csv`)}
                    disabled={!reportData?.data.length}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </div>
              {reportData?.summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  {Object.entries(reportData.summary).map(([key, value]) => (
                    <div key={key} className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-sm text-gray-600 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </div>
                      <div className="text-lg font-semibold">
                        {typeof value === 'number' && key.toLowerCase().includes('total') && !key.toLowerCase().includes('count') && !key.toLowerCase().includes('transactions') && !key.toLowerCase().includes('sessions') && !key.toLowerCase().includes('orders') && !key.toLowerCase().includes('contributions')
                          ? `₹${value.toLocaleString()}`
                          : value?.toLocaleString()
                        }
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading report...</div>
              ) : (
                renderReportTable()
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="daily" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <BarChart className="h-5 w-5" />
                  Combined Daily Report
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    onClick={generateDailyReport}
                    disabled={loading}
                  >
                    Generate Report
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportToCSV(dailyReportData, 'daily_combined_report.csv')}
                    disabled={!dailyReportData.length}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading daily report...</div>
              ) : dailyReportData.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No data available. Click "Generate Report" to load data.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Orders Total</TableHead>
                        <TableHead>Charging Total</TableHead>
                        <TableHead>Total Income</TableHead>
                        <TableHead>Expenses Total</TableHead>
                        <TableHead>Savings Total</TableHead>
                        <TableHead>Deposits Total</TableHead>
                        <TableHead>Withdrawals Total</TableHead>
                        <TableHead>Total Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dailyReportData.map((row, index) => (
                        <TableRow key={index}>
                          <TableCell>{format(new Date(row.date), 'MMM dd, yyyy')}</TableCell>
                          <TableCell>₹{row.orders_total.toFixed(2)}</TableCell>
                          <TableCell>₹{row.charging_total.toFixed(2)}</TableCell>
                          <TableCell className="font-semibold text-green-600">₹{row.total_income.toFixed(2)}</TableCell>
                          <TableCell className="text-red-600">₹{row.expenses_total.toFixed(2)}</TableCell>
                          <TableCell>₹{row.savings_total.toFixed(2)}</TableCell>
                          <TableCell>₹{row.deposits_total.toFixed(2)}</TableCell>
                          <TableCell className="text-red-600">₹{row.withdrawals_total.toFixed(2)}</TableCell>
                          <TableCell className={`font-bold ${row.total_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ₹{row.total_balance.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Method Analytics
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    onClick={generatePaymentMethodReport}
                    disabled={loading}
                  >
                    Generate Analytics
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportToCSV(paymentMethodData, 'payment_method_analytics.csv')}
                    disabled={!paymentMethodData.length}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading payment analytics...</div>
              ) : paymentMethodData.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No data available. Click "Generate Analytics" to load data.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Payment Method</TableHead>
                        <TableHead>Orders Count</TableHead>
                        <TableHead>Orders Amount</TableHead>
                        <TableHead>Charging Count</TableHead>
                        <TableHead>Charging Amount</TableHead>
                        <TableHead>Expenses Count</TableHead>
                        <TableHead>Expenses Amount</TableHead>
                        <TableHead>Net Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paymentMethodData.map((row, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{row.method}</TableCell>
                          <TableCell>{row.orders_count}</TableCell>
                          <TableCell className="text-green-600">₹{row.orders_amount.toFixed(2)}</TableCell>
                          <TableCell>{row.charging_count}</TableCell>
                          <TableCell className="text-green-600">₹{row.charging_amount.toFixed(2)}</TableCell>
                          <TableCell>{row.expenses_count}</TableCell>
                          <TableCell className="text-red-600">₹{row.expenses_amount.toFixed(2)}</TableCell>
                          <TableCell className={`font-bold ${row.total_amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ₹{row.total_amount.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsViewTab;
