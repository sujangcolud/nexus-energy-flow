
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { FileText, Calendar as CalendarIcon, ShoppingCart, Zap, Receipt, Users, Banknote, CreditCard } from 'lucide-react';
import { format } from 'date-fns';

interface ReportData {
  summary: any;
  data: any[];
  dateRange: { from: string | null; to: string | null };
}

const ReportsViewTab = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeReport, setActiveReport] = useState('orders');
  const [reportData, setReportData] = useState<ReportData | null>(null);
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
                    {typeof item[column] === 'number' && column.includes('amount') || column.includes('total') || column.includes('rate')
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
    // Load initial orders report
    generateReport('orders');
  }, [user]);

  return (
    <div className="space-y-6 pt-4 md:pt-6"> {/* Added top padding */}
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
            {reportData?.dateRange.from && reportData?.dateRange.to && (
              <div className="text-sm text-gray-500">
                {format(new Date(reportData.dateRange.from), 'MMM dd')} - {format(new Date(reportData.dateRange.to), 'MMM dd, yyyy')}
              </div>
            )}
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
    </div>
  );
};

export default ReportsViewTab;
