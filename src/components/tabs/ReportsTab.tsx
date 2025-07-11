
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { FileText, Download, Calendar as CalendarIcon, BarChart3, Filter } from 'lucide-react';
import { format } from 'date-fns';

interface Report {
  id: string;
  report_type: string;
  report_data: any;
  date_range_start: string | null;
  date_range_end: string | null;
  created_at: string;
}

const ReportsTab = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [reportType, setReportType] = useState('');
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();

  const reportTypes = [
    { value: 'orders', label: 'Orders Report' },
    { value: 'charging', label: 'Charging Sessions Report' },
    { value: 'expenses', label: 'Expenses Report' },
    { value: 'deposits', label: 'Deposits Report' },
    { value: 'withdrawals', label: 'Withdrawals Report' },
    { value: 'cooperative_savings', label: 'Cooperative Savings Report' },
    { value: 'financial_summary', label: 'Financial Summary' },
    { value: 'business_analytics', label: 'Business Analytics' }
  ];

  const fetchReports = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [user]);

  const generateReport = async () => {
    if (!user || !reportType) {
      toast.error('Please select a report type');
      return;
    }

    setGenerating(true);
    try {
      let reportData: any = {};
      const startDate = dateFrom ? format(dateFrom, 'yyyy-MM-dd') : null;
      const endDate = dateTo ? format(dateTo, 'yyyy-MM-dd') : null;

      // Build date filter condition
      const dateFilter = startDate && endDate 
        ? `and ${getDateColumn(reportType)} >= '${startDate}' and ${getDateColumn(reportType)} <= '${endDate}'`
        : '';

      switch (reportType) {
        case 'orders':
          reportData = await generateOrdersReport(dateFilter);
          break;
        case 'charging':
          reportData = await generateChargingReport(dateFilter);
          break;
        case 'expenses':
          reportData = await generateExpensesReport(dateFilter);
          break;
        case 'deposits':
          reportData = await generateDepositsReport(dateFilter);
          break;
        case 'withdrawals':
          reportData = await generateWithdrawalsReport(dateFilter);
          break;
        case 'cooperative_savings':
          reportData = await generateCooperativeReport(dateFilter);
          break;
        case 'financial_summary':
          reportData = await generateFinancialSummary(dateFilter);
          break;
        case 'business_analytics':
          reportData = await generateBusinessAnalytics(dateFilter);
          break;
      }

      // Save report to database
      const { error } = await supabase
        .from('reports')
        .insert({
          user_id: user.id,
          report_type: reportType,
          report_data: reportData,
          date_range_start: startDate,
          date_range_end: endDate
        });

      if (error) throw error;

      toast.success('Report generated successfully!');
      fetchReports();
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const getDateColumn = (reportType: string): string => {
    const mapping: { [key: string]: string } = {
      orders: 'order_date',
      charging: 'session_date',
      expenses: 'expense_date',
      deposits: 'deposit_date',
      withdrawals: 'withdrawal_date',
      cooperative_savings: 'contribution_date'
    };
    return mapping[reportType] || 'created_at';
  };

  const generateOrdersReport = async (dateFilter: string) => {
    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .order('order_date', { ascending: false });

    const filteredOrders = dateFilter ? 
      orders?.filter(order => {
        const orderDate = new Date(order.order_date);
        return dateFrom && dateTo ? orderDate >= dateFrom && orderDate <= dateTo : true;
      }) : orders;

    const totalRevenue = filteredOrders?.reduce((sum, order) => sum + Number(order.total), 0) || 0;
    const totalOrders = filteredOrders?.length || 0;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const itemsSummary = filteredOrders?.reduce((acc: any, order) => {
      if (!acc[order.item_name]) {
        acc[order.item_name] = { quantity: 0, revenue: 0 };
      }
      acc[order.item_name].quantity += order.quantity;
      acc[order.item_name].revenue += Number(order.total);
      return acc;
    }, {});

    return {
      summary: {
        totalRevenue,
        totalOrders,
        avgOrderValue,
        dateRange: { from: dateFrom, to: dateTo }
      },
      orders: filteredOrders,
      itemsSummary
    };
  };

  const generateChargingReport = async (dateFilter: string) => {
    const { data: sessions } = await supabase
      .from('charging_sessions')
      .select('*')
      .order('session_date', { ascending: false });

    const filteredSessions = dateFilter ? 
      sessions?.filter(session => {
        const sessionDate = new Date(session.session_date);
        return dateFrom && dateTo ? sessionDate >= dateFrom && sessionDate <= dateTo : true;
      }) : sessions;

    const totalRevenue = filteredSessions?.reduce((sum, session) => sum + Number(session.total_amount), 0) || 0;
    const totalSessions = filteredSessions?.length || 0;
    const totalKcal = filteredSessions?.reduce((sum, session) => sum + Number(session.kcal || 0), 0) || 0;

    return {
      summary: {
        totalRevenue,
        totalSessions,
        totalKcal,
        avgSessionValue: totalSessions > 0 ? totalRevenue / totalSessions : 0,
        dateRange: { from: dateFrom, to: dateTo }
      },
      sessions: filteredSessions
    };
  };

  const generateExpensesReport = async (dateFilter: string) => {
    const { data: expenses } = await supabase
      .from('expenses')
      .select('*')
      .order('expense_date', { ascending: false });

    const filteredExpenses = dateFilter ? 
      expenses?.filter(expense => {
        const expenseDate = new Date(expense.expense_date);
        return dateFrom && dateTo ? expenseDate >= dateFrom && expenseDate <= dateTo : true;
      }) : expenses;

    const totalExpenses = filteredExpenses?.reduce((sum, expense) => sum + Number(expense.amount), 0) || 0;
    
    const categoryBreakdown = filteredExpenses?.reduce((acc: any, expense) => {
      if (!acc[expense.category]) {
        acc[expense.category] = 0;
      }
      acc[expense.category] += Number(expense.amount);
      return acc;
    }, {});

    return {
      summary: {
        totalExpenses,
        totalTransactions: filteredExpenses?.length || 0,
        categoryBreakdown,
        dateRange: { from: dateFrom, to: dateTo }
      },
      expenses: filteredExpenses
    };
  };

  const generateDepositsReport = async (dateFilter: string) => {
    const { data: deposits } = await supabase
      .from('deposits')
      .select('*')
      .order('deposit_date', { ascending: false });

    const filteredDeposits = dateFilter ? 
      deposits?.filter(deposit => {
        const depositDate = new Date(deposit.deposit_date);
        return dateFrom && dateTo ? depositDate >= dateFrom && depositDate <= dateTo : true;
      }) : deposits;

    const totalDeposits = filteredDeposits?.reduce((sum, deposit) => sum + Number(deposit.amount), 0) || 0;

    return {
      summary: {
        totalDeposits,
        totalTransactions: filteredDeposits?.length || 0,
        dateRange: { from: dateFrom, to: dateTo }
      },
      deposits: filteredDeposits
    };
  };

  const generateWithdrawalsReport = async (dateFilter: string) => {
    const { data: withdrawals } = await supabase
      .from('withdrawals')
      .select('*')
      .order('withdrawal_date', { ascending: false });

    const filteredWithdrawals = dateFilter ? 
      withdrawals?.filter(withdrawal => {
        const withdrawalDate = new Date(withdrawal.withdrawal_date);
        return dateFrom && dateTo ? withdrawalDate >= dateFrom && withdrawalDate <= dateTo : true;
      }) : withdrawals;

    const totalWithdrawals = filteredWithdrawals?.reduce((sum, withdrawal) => sum + Number(withdrawal.amount), 0) || 0;

    return {
      summary: {
        totalWithdrawals,
        totalTransactions: filteredWithdrawals?.length || 0,
        dateRange: { from: dateFrom, to: dateTo }
      },
      withdrawals: filteredWithdrawals
    };
  };

  const generateCooperativeReport = async (dateFilter: string) => {
    const { data: savings } = await supabase
      .from('cooperative_savings')
      .select('*')
      .order('contribution_date', { ascending: false });

    const filteredSavings = dateFilter ? 
      savings?.filter(saving => {
        const savingDate = new Date(saving.contribution_date);
        return dateFrom && dateTo ? savingDate >= dateFrom && savingDate <= dateTo : true;
      }) : savings;

    const totalContributions = filteredSavings?.reduce((sum, saving) => sum + Number(saving.contribution_amount), 0) || 0;

    return {
      summary: {
        totalContributions,
        totalTransactions: filteredSavings?.length || 0,
        dateRange: { from: dateFrom, to: dateTo }
      },
      savings: filteredSavings
    };
  };

  const generateFinancialSummary = async (dateFilter: string) => {
    const ordersData = await generateOrdersReport(dateFilter);
    const chargingData = await generateChargingReport(dateFilter);
    const expensesData = await generateExpensesReport(dateFilter);
    const depositsData = await generateDepositsReport(dateFilter);
    const withdrawalsData = await generateWithdrawalsReport(dateFilter);

    const totalIncome = ordersData.summary.totalRevenue + chargingData.summary.totalRevenue;
    const totalExpenses = expensesData.summary.totalExpenses;
    const netProfit = totalIncome - totalExpenses;
    const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

    return {
      summary: {
        totalIncome,
        totalExpenses,
        netProfit,
        profitMargin,
        breakEvenPoint: totalExpenses,
        dateRange: { from: dateFrom, to: dateTo }
      },
      breakdown: {
        orders: ordersData.summary,
        charging: chargingData.summary,
        expenses: expensesData.summary,
        deposits: depositsData.summary,
        withdrawals: withdrawalsData.summary
      }
    };
  };

  const generateBusinessAnalytics = async (dateFilter: string) => {
    const financialData = await generateFinancialSummary(dateFilter);
    const ordersData = await generateOrdersReport(dateFilter);
    const chargingData = await generateChargingReport(dateFilter);

    // Advanced analytics calculations
    const dailyAverage = {
      revenue: financialData.summary.totalIncome / (dateTo && dateFrom ? 
        Math.ceil((dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24)) : 30),
      orders: ordersData.summary.totalOrders / (dateTo && dateFrom ? 
        Math.ceil((dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24)) : 30),
      chargingSessions: chargingData.summary.totalSessions / (dateTo && dateFrom ? 
        Math.ceil((dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24)) : 30)
    };

    return {
      summary: financialData.summary,
      analytics: {
        dailyAverages: dailyAverage,
        topPerformingItems: ordersData.itemsSummary,
        operationalMetrics: {
          totalVehiclesCharged: chargingData.summary.totalSessions,
          totalEnergyConsumed: chargingData.summary.totalKcal,
          avgChargingValue: chargingData.summary.avgSessionValue
        }
      },
      trends: {
        revenueGrowth: 'N/A', // Would need historical data for comparison
        customerRetention: 'N/A',
        seasonalPatterns: 'N/A'
      }
    };
  };

  const downloadReport = (report: Report) => {
    const dataStr = JSON.stringify(report.report_data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${report.report_type}_report_${format(new Date(report.created_at), 'yyyy-MM-dd')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900">Reports & Analytics</h2>
      </div>

      {/* Report Generation Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Generate New Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Report Type</label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  {reportTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
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
            
            <div className="space-y-2">
              <label className="text-sm font-medium">&nbsp;</label>
              <Button onClick={generateReport} disabled={generating} className="w-full">
                {generating ? 'Generating...' : 'Generate Report'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generated Reports List */}
      <Card>
        <CardHeader>
          <CardTitle>Generated Reports ({reports.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading reports...</div>
          ) : reports.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No reports generated yet. Create your first report above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report Type</TableHead>
                    <TableHead>Date Range</TableHead>
                    <TableHead>Generated</TableHead>
                    <TableHead>Summary</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <Badge variant="outline">
                          {reportTypes.find(t => t.value === report.report_type)?.label || report.report_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {report.date_range_start && report.date_range_end
                          ? `${format(new Date(report.date_range_start), 'MMM dd')} - ${format(new Date(report.date_range_end), 'MMM dd, yyyy')}`
                          : 'All time'
                        }
                      </TableCell>
                      <TableCell>{format(new Date(report.created_at), 'MMM dd, yyyy HH:mm')}</TableCell>
                      <TableCell className="max-w-xs">
                        {report.report_data.summary ? (
                          <div className="text-sm">
                            {report.report_data.summary.totalRevenue && (
                              <div>Revenue: Rs. {report.report_data.summary.totalRevenue.toLocaleString()}</div>
                            )}
                            {report.report_data.summary.totalIncome && (
                              <div>Income: Rs. {report.report_data.summary.totalIncome.toLocaleString()}</div>
                            )}
                            {report.report_data.summary.netProfit !== undefined && (
                              <div>Profit: Rs. {report.report_data.summary.netProfit.toLocaleString()}</div>
                            )}
                          </div>
                        ) : (
                          'Detailed data available'
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadReport(report)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
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

export default ReportsTab;
