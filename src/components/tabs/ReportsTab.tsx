
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
import { FileText, Download, Calendar as CalendarIcon, Filter, Plus, Trash2, Eye, AlertTriangle, List } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
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

type ValidTableName = 'orders' | 'charging_sessions' | 'expenses' | 'deposits' | 'withdrawals' | 'cooperative_savings';

const REPORT_COLUMN_ORDERS: Record<ValidTableName, string[]> = {
  orders: ['item_name', 'quantity', 'rate', 'total', 'payment_mode', 'order_date'],
  charging_sessions: ['total_amount', 'payment_mode', 'start_percentage', 'end_percentage', 'kcal', 'per_unit_rate', 'per_percent_rate', 'session_date'],
  expenses: ['description', 'category', 'amount', 'payment_mode', 'remarks', 'expense_date'],
  deposits: ['deposited_by', 'amount', 'mode', 'deposit_date'],
  withdrawals: ['purpose', 'recipient', 'amount', 'reference_number', 'remarks', 'withdrawal_date'],
  cooperative_savings: ['member_id', 'contribution_amount', 'cycle_period', 'contribution_date'],
};

const EXCLUDED_KEYS_FROM_REPORTS = ['id', 'user_id', 'created_at', 'updated_at'];

// New Component for Detailed View
const DetailedReportView = ({ dataType, columns }: { dataType: ValidTableName, columns: string[] }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const ROWS_PER_PAGE = 15;
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  const fetchDetailedData = async () => {
    setLoading(true);
    try {
      const from = (page - 1) * ROWS_PER_PAGE;
      const to = from + ROWS_PER_PAGE - 1;

      let query = supabase.from(dataType).select('*', { count: 'exact' });

      if (dateFrom) {
        query = query.gte('created_at', format(dateFrom, 'yyyy-MM-dd'));
      }
      if (dateTo) {
        query = query.lte('created_at', format(dateTo, 'yyyy-MM-dd'));
      }

      const { data: pageData, error, count: totalCount } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      setData(pageData || []);
      setCount(totalCount || 0);
    } catch (error) {
      toast.error(`Failed to load ${dataType} data.`);
      console.error(`Error fetching ${dataType}:`, error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetailedData();
  }, [page, dataType, dateFrom, dateTo]);

  const totalPages = Math.ceil(count / ROWS_PER_PAGE);

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline"><CalendarIcon className="mr-2 h-4 w-4" />{dateFrom ? format(dateFrom, 'PPP') : 'From Date'}</Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus /></PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline"><CalendarIcon className="mr-2 h-4 w-4" />{dateTo ? format(dateTo, 'PPP') : 'To Date'}</Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus /></PopoverContent>
        </Popover>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map(col => <TableHead key={col}>{col.replace(/_/g, ' ')}</TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow><TableCell colSpan={columns.length} className="text-center">Loading...</TableCell></TableRow>
          ) : data.length === 0 ? (
            <TableRow><TableCell colSpan={columns.length} className="text-center">No data found.</TableCell></TableRow>
          ) : (
            data.map((row) => (
              <TableRow key={row.id}>
                {columns.map(col => <TableCell key={col}>{row[col]}</TableCell>)}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setPage(p => Math.max(1, p - 1)); }} />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#">Page {page} of {totalPages}</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationNext href="#" onClick={(e) => { e.preventDefault(); setPage(p => Math.min(totalPages, p + 1)); }} />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
};


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
    { value: 'charging_sessions', label: 'Charging Sessions Report' },
    { value: 'savings', label: 'Savings Report' },
    { value: 'deposits', label: 'Deposits Report' },
    { value: 'expenses', label: 'Expenses Report' },
    { value: 'withdrawals', label: 'Withdrawals Report' }
  ];

  const fetchReports = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('reports').select('*').order('created_at', { ascending: false });
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
      const { data, error } = await supabase.from('static_expenses').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
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
      let query;
      switch (reportType) {
        case 'orders':
          query = supabase.from('orders').select('*');
          if (startDate && endDate) query = query.gte('order_date', startDate).lte('order_date', endDate);
          const { data: orders } = await query;
          reportData = { data: orders };
          break;
        // Add cases for other report types here
      }
      const { error } = await supabase.from('reports').insert({
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

  const downloadReport = (report: ReportData) => {
    // ... download logic
  };

  const handleViewReport = (report: ReportData) => {
    setViewingReportData(report);
    setIsReportViewerOpen(true);
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from('reports').delete().eq('id', reportId);
      if (error) throw error;
      toast.success('Report deleted successfully!');
      setReports(reports.filter(r => r.id !== reportId));
    } catch (error) {
      console.error('Error deleting report:', error);
      toast.error('Failed to delete report.');
    }
  };

  const addStaticExpense = async () => {
    // ...
  };

  const deleteStaticExpense = async (id: string) => {
    // ...
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900">Reports</h2>
      </div>

      <Tabs defaultValue="generator" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="generator">Report Generator</TabsTrigger>
          <TabsTrigger value="details">Detailed View</TabsTrigger>
          <TabsTrigger value="static-expenses">Static Expenses</TabsTrigger>
        </TabsList>

        <TabsContent value="generator" className="space-y-6">
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
                      <Button variant="outline" className="w-full justify-start text-left"><CalendarIcon className="mr-2 h-4 w-4" />{dateFrom ? format(dateFrom, 'PPP') : 'Pick a date'}</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus /></PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">To Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left"><CalendarIcon className="mr-2 h-4 w-4" />{dateTo ? format(dateTo, 'PPP') : 'Pick a date'}</Button>
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
              {/* Table of generated reports */}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><List className="h-5 w-5" />Detailed Transaction View</CardTitle></CardHeader>
            <CardContent>
              <Tabs defaultValue="orders" className="w-full">
                <TabsList>
                  {Object.keys(REPORT_COLUMN_ORDERS).map(key => <TabsTrigger key={key} value={key}>{key.replace(/_/g, ' ')}</TabsTrigger>)}
                </TabsList>
                {Object.entries(REPORT_COLUMN_ORDERS).map(([key, columns]) => (
                  <TabsContent key={key} value={key}>
                    <DetailedReportView dataType={key as ValidTableName} columns={columns} />
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="static-expenses" className="space-y-6">
          {/* Static expenses content */}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
    </div>
  );
};

export default ReportsTab;
