import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { FileText, Download, Calendar as CalendarIcon, Filter, Plus, Trash2, Eye, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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

interface ReportData {
  id: string;
  report_type: string;
  report_data: any;
  date_range_start: string | null;
  date_range_end: string | null;
  created_at: string;
}

interface StaticExpense {
  id: string;
  name: string;
  amount: number;
  is_recurring: boolean;
  user_id: string;
  created_at: string;
}

const REPORT_COLUMN_ORDERS: Record<string, string[]> = {
  orders: ['item_name', 'quantity', 'rate', 'total', 'payment_mode', 'order_date'],
  charging: ['total_amount', 'payment_mode', 'start_percentage', 'end_percentage', 'kcal', 'per_unit_rate', 'per_percent_rate', 'session_date'],
  expenses: ['description', 'category', 'amount', 'payment_mode', 'remarks', 'expense_date'],
  deposits: ['deposited_by', 'amount', 'mode', 'deposit_date'],
  withdrawals: ['purpose', 'recipient', 'amount', 'reference_number', 'remarks', 'withdrawal_date'],
  savings: ['member_id', 'contribution_amount', 'cycle_period', 'contribution_date'],
};

const EXCLUDED_KEYS_FROM_REPORTS = ['id', 'user_id', 'created_at', 'updated_at'];


const ReportsTab = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<ReportData[]>([]);
  const [staticExpenses, setStaticExpenses] = useState<StaticExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [reportType, setReportType] = useState('');
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [newExpenseName, setNewExpenseName] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [isReportViewerOpen, setIsReportViewerOpen] = useState(false);
  const [viewingReportData, setViewingReportData] = useState<ReportData | null>(null);

  const reportTypes = [
    { value: 'orders', label: 'Orders Report' },
    { value: 'charging', label: 'Charging Sessions Report' },
    { value: 'savings', label: 'Savings Report' },
    { value: 'deposits', label: 'Deposits Report' },
    { value: 'expenses', label: 'Expenses Report' },
    { value: 'withdrawals', label: 'Withdrawals Report' }
  ];

  const fetchReports = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
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

  const fetchStaticExpenses = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('static_expenses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStaticExpenses(data || []);
    } catch (error) {
      console.error('Error fetching static expenses:', error);
      toast.error('Failed to load static expenses');
    }
  };

  useEffect(() => {
    fetchReports();
    fetchStaticExpenses();
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

      switch (reportType) {
        case 'orders':
          reportData = await generateOrdersReport(startDate, endDate);
          break;
        case 'charging':
          reportData = await generateChargingReport(startDate, endDate);
          break;
        case 'savings':
          reportData = await generateSavingsReport(startDate, endDate);
          break;
        case 'deposits':
          reportData = await generateDepositsReport(startDate, endDate);
          break;
        case 'expenses':
          reportData = await generateExpensesReport(startDate, endDate);
          break;
        case 'withdrawals':
          reportData = await generateWithdrawalsReport(startDate, endDate);
          break;
      }

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
      
      setReportType('');
      setDateFrom(undefined);
      setDateTo(undefined);
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const generateOrdersReport = async (startDate: string | null, endDate: string | null) => {
    let query = supabase.from('orders').select('*');
    if (startDate && endDate) query = query.gte('order_date', startDate).lte('order_date', endDate);
    const { data: orders } = await query.order('order_date', { ascending: false });
    const totalRevenue = orders?.reduce((sum, order) => sum + Number(order.total), 0) || 0;
    const totalOrders = orders?.length || 0;
    return { summary: { totalRevenue, totalOrders }, data: orders, dateRange: { from: startDate, to: endDate } };
  };

  const generateChargingReport = async (startDate: string | null, endDate: string | null) => {
    let query = supabase.from('charging_sessions').select('*');
    if (startDate && endDate) query = query.gte('session_date', startDate).lte('session_date', endDate);
    const { data: sessions } = await query.order('session_date', { ascending: false });
    const totalRevenue = sessions?.reduce((sum, session) => sum + Number(session.total_amount), 0) || 0;
    const totalSessions = sessions?.length || 0;
    return { summary: { totalRevenue, totalSessions }, data: sessions, dateRange: { from: startDate, to: endDate } };
  };

  const generateSavingsReport = async (startDate: string | null, endDate: string | null) => {
    let query = supabase.from('cooperative_savings').select('*');
    if (startDate && endDate) query = query.gte('contribution_date', startDate).lte('contribution_date', endDate);
    const { data: savings } = await query.order('contribution_date', { ascending: false });
    const totalSavings = savings?.reduce((sum, saving) => sum + Number(saving.contribution_amount), 0) || 0;
    const totalContributions = savings?.length || 0;
    return { summary: { totalSavings, totalContributions }, data: savings, dateRange: { from: startDate, to: endDate } };
  };

  const generateDepositsReport = async (startDate: string | null, endDate: string | null) => {
    let query = supabase.from('deposits').select('*');
    if (startDate && endDate) query = query.gte('deposit_date', startDate).lte('deposit_date', endDate);
    const { data: deposits } = await query.order('deposit_date', { ascending: false });
    const totalDeposits = deposits?.reduce((sum, deposit) => sum + Number(deposit.amount), 0) || 0;
    const totalTransactions = deposits?.length || 0;
    return { summary: { totalDeposits, totalTransactions }, data: deposits, dateRange: { from: startDate, to: endDate } };
  };

  const generateExpensesReport = async (startDate: string | null, endDate: string | null) => {
    let query = supabase.from('expenses').select('*');
    if (startDate && endDate) query = query.gte('expense_date', startDate).lte('expense_date', endDate);
    const { data: expenses } = await query.order('expense_date', { ascending: false });
    const totalExpenses = expenses?.reduce((sum, expense) => sum + Number(expense.amount), 0) || 0;
    const totalTransactions = expenses?.length || 0;
    return { summary: { totalExpenses, totalTransactions }, data: expenses, dateRange: { from: startDate, to: endDate } };
  };

  const generateWithdrawalsReport = async (startDate: string | null, endDate: string | null) => {
    let query = supabase.from('withdrawals').select('*');
    if (startDate && endDate) query = query.gte('withdrawal_date', startDate).lte('withdrawal_date', endDate);
    const { data: withdrawals } = await query.order('withdrawal_date', { ascending: false });
    const totalWithdrawals = withdrawals?.reduce((sum, withdrawal) => sum + Number(withdrawal.amount), 0) || 0;
    const totalTransactions = withdrawals?.length || 0;
    return { summary: { totalWithdrawals, totalTransactions }, data: withdrawals, dateRange: { from: startDate, to: endDate } };
  };

  const downloadReport = (report: ReportData) => {
    const csvData = convertToCSV(report.report_data.data, report.report_type);
    const dataBlob = new Blob([csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${report.report_type}_report_${format(new Date(report.created_at), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleViewReport = (report: ReportData) => {
    setViewingReportData(report);
    setIsReportViewerOpen(true);
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;

      toast.success('Report deleted successfully!');
      // Manually filter out the deleted report from the local state for an immediate UI update
      setReports(currentReports => currentReports.filter(report => report.id !== reportId));
      // Also re-fetch to ensure consistency, though the UI update is already handled.
      fetchReports();
    } catch (error) {
      console.error('Error deleting report:', error);
      toast.error('Failed to delete report.');
    }
  };

  const convertToCSV = (data: any[], reportType: string) => {
    if (!data || data.length === 0) return '';
    const reportSpecificOrder = REPORT_COLUMN_ORDERS[reportType] || [];
    const allKeysFromData = Object.keys(data[0]);
    let orderedKeys = reportSpecificOrder.filter(key => allKeysFromData.includes(key) && !EXCLUDED_KEYS_FROM_REPORTS.includes(key));
    allKeysFromData.forEach(key => {
      if (!orderedKeys.includes(key) && !EXCLUDED_KEYS_FROM_REPORTS.includes(key)) {
        orderedKeys.push(key);
      }
    });
    const headers = orderedKeys.join(',');
    const rows = data.map(row => 
      orderedKeys.map(key => {
        const value = row[key];
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value === null || value === undefined ? '' : value;
      }).join(',')
    ).join('\n');
    return `${headers}\n${rows}`;
  };

  const addStaticExpense = async () => {
    if (!user || !newExpenseName || !newExpenseAmount) {
      toast.error('Please fill in all fields');
      return;
    }
    try {
      const { error } = await supabase
        .from('static_expenses')
        .insert({ user_id: user.id, name: newExpenseName, amount: parseFloat(newExpenseAmount), is_recurring: isRecurring });
      if (error) throw error;
      toast.success('Static expense added successfully!');
      setNewExpenseName('');
      setNewExpenseAmount('');
      setIsRecurring(false);
      fetchStaticExpenses();
    } catch (error) {
      console.error('Error adding static expense:', error);
      toast.error('Failed to add static expense');
    }
  };

  const deleteStaticExpense = async (id: string) => {
    try {
      const { error } = await supabase.from('static_expenses').delete().eq('id', id);
      if (error) throw error;
      toast.success('Static expense deleted successfully!');
      fetchStaticExpenses();
    } catch (error) {
      console.error('Error deleting static expense:', error);
      toast.error('Failed to delete static expense');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900">Reports Generation</h2>
      </div>

      <Tabs defaultValue="individual" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="individual">Individual Reports</TabsTrigger>
          <TabsTrigger value="static-expenses">Static Expenses</TabsTrigger>
        </TabsList>

        <TabsContent value="individual" className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Filter className="h-4 w-4" />Generate Individual Report</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Report Type</label>
                  <Select value={reportType} onValueChange={setReportType}>
                    <SelectTrigger><SelectValue placeholder="Select report type" /></SelectTrigger>
                    <SelectContent>
                      {reportTypes.map((type) => (<SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">From Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left">
                        <CalendarIcon className="mr-2 h-4 w-4" />{dateFrom ? format(dateFrom, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus /></PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">To Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left">
                        <CalendarIcon className="mr-2 h-4 w-4" />{dateTo ? format(dateTo, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus /></PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">&nbsp;</label>
                  <Button onClick={generateReport} disabled={generating} className="w-full">{generating ? 'Generating...' : 'Generate Report'}</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Generated Reports ({reports.length})</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">Loading reports...</div>
              ) : reports.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No reports generated yet. Create your first report above.</div>
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
                          <TableCell><Badge variant="outline">{reportTypes.find(t => t.value === report.report_type)?.label || report.report_type}</Badge></TableCell>
                          <TableCell>{report.date_range_start && report.date_range_end ? `${format(new Date(report.date_range_start), 'MMM dd')} - ${format(new Date(report.date_range_end), 'MMM dd, yyyy')}` : 'All time'}</TableCell>
                          <TableCell>{format(new Date(report.created_at), 'MMM dd, yyyy HH:mm')}</TableCell>
                          <TableCell className="max-w-xs text-xs sm:text-sm">
                            {report.report_data.summary && (
                              <div className="flex flex-col space-y-1">
                                {Object.entries(report.report_data.summary).map(([key, value]) => (
                                  <div key={key} className="flex justify-between sm:justify-start sm:gap-1">
                                    <span className="font-medium">{key}:</span>
                                    <span>{typeof value === 'number' ? value.toLocaleString() : String(value)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleViewReport(report)} className="whitespace-nowrap"><Eye className="h-4 w-4 mr-1 sm:mr-2" />View</Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="destructive" size="sm" className="whitespace-nowrap"><Trash2 className="h-4 w-4 mr-1 sm:mr-2" />Delete</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="flex items-center"><AlertTriangle className="h-5 w-5 mr-2 text-red-500" />Confirm Deletion</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete the report: <strong>{reportTypes.find(t => t.value === report.report_type)?.label || report.report_type}</strong> generated on <strong>{format(new Date(report.created_at), 'MMM dd, yyyy HH:mm')}</strong>? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteReport(report.id)} className="bg-red-600 hover:bg-red-700">Delete Report</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
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

        <TabsContent value="static-expenses" className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="h-4 w-4" />Add Static/Recurring Expense</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expense-name">Expense Name</Label>
                  <Input id="expense-name" placeholder="Enter expense name" value={newExpenseName} onChange={(e) => setNewExpenseName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expense-amount">Amount (NRs.)</Label>
                  <Input id="expense-amount" type="number" placeholder="Enter amount" value={newExpenseAmount} onChange={(e) => setNewExpenseAmount(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2"><input type="radio" checked={!isRecurring} onChange={() => setIsRecurring(false)} /><span>Static</span></label>
                    <label className="flex items-center space-x-2"><input type="radio" checked={isRecurring} onChange={() => setIsRecurring(true)} /><span>Recurring</span></label>
                  </div>
                </div>
              </div>
              <Button onClick={addStaticExpense} className="mt-4"><Plus className="h-4 w-4 mr-2" />Add Expense</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Static & Recurring Expenses ({staticExpenses.length})</CardTitle></CardHeader>
            <CardContent>
              {staticExpenses.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No static expenses added yet. Add your first expense above.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Expense Name</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {staticExpenses.map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell className="font-medium">{expense.name}</TableCell>
                          <TableCell>NRs. {expense.amount.toLocaleString()}</TableCell>
                          <TableCell><Badge variant={expense.is_recurring ? "default" : "secondary"}>{expense.is_recurring ? "Recurring" : "Static"}</Badge></TableCell>
                          <TableCell><Button variant="outline" size="sm" onClick={() => deleteStaticExpense(expense.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
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

      {viewingReportData && (
        <Dialog open={isReportViewerOpen} onOpenChange={setIsReportViewerOpen}>
          <DialogContent className="sm:max-w-4xl max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Report: {reportTypes.find(t => t.value === viewingReportData.report_type)?.label || viewingReportData.report_type}</DialogTitle>
              <div className="text-sm text-muted-foreground">
                Generated: {format(new Date(viewingReportData.created_at), 'MMM dd, yyyy HH:mm')}
                {viewingReportData.date_range_start && viewingReportData.date_range_end && (
                  <span> | Range: {format(new Date(viewingReportData.date_range_start), 'PPP')} - {format(new Date(viewingReportData.date_range_end), 'PPP')}</span>
                )}
              </div>
            </DialogHeader>
            <div className="overflow-y-auto py-4 grow">
              {((): JSX.Element => {
                const tableData = viewingReportData.report_data?.data;
                if (!tableData || tableData.length === 0) {
                  return <p className="text-center text-muted-foreground">No detailed data available for this report.</p>;
                }
                const allKeysFromData = Object.keys(tableData[0]);
                let orderedKeys = (REPORT_COLUMN_ORDERS[viewingReportData.report_type] || []).filter(key => allKeysFromData.includes(key) && !EXCLUDED_KEYS_FROM_REPORTS.includes(key));
                allKeysFromData.forEach(key => {
                  if (!orderedKeys.includes(key) && !EXCLUDED_KEYS_FROM_REPORTS.includes(key)) {
                    orderedKeys.push(key);
                  }
                });
                return (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>{orderedKeys.map((key) => (<TableHead key={key}>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</TableHead>))}</TableRow>
                      </TableHeader>
                      <TableBody>
                        {tableData.map((row: any, rowIndex: number) => (
                          <TableRow key={rowIndex}>
                            {orderedKeys.map((key) => (
                              <TableCell key={key}>
                                {typeof row[key] === 'boolean' ? (row[key] ? 'Yes' : 'No') : row[key] instanceof Date ? format(row[key], 'PPP p') : (typeof row[key] === 'object' && row[key] !== null) ? JSON.stringify(row[key]) : String(row[key])}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                );
              })()}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsReportViewerOpen(false)}>Close</Button>
              <Button onClick={() => downloadReport(viewingReportData)}><Download className="h-4 w-4 mr-2" />Download CSV</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ReportsTab;
