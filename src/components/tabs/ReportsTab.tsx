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

const REPORT_COLUMN_ORDERS: Record<string, string[]> = {
  orders: ['item_name', 'quantity', 'rate', 'total', 'payment_mode', 'order_date'],
  charging: ['total_amount', 'payment_mode', 'start_percentage', 'end_percentage', 'kcal', 'per_unit_rate', 'per_percent_rate', 'session_date'],
  expenses: ['description', 'category', 'amount', 'payment_mode', 'remarks', 'expense_date'],
  deposits: ['deposited_by', 'amount', 'mode', 'deposit_date'],
  withdrawals: ['purpose', 'recipient', 'amount', 'reference_number', 'remarks', 'withdrawal_date'],
  savings: ['member_id', 'contribution_amount', 'cycle_period', 'contribution_date'],
};

const EXCLUDED_KEYS_FROM_REPORTS = ['id', 'user_id', 'created_at', 'updated_at'];

// New Component for Detailed View
const DetailedReportView = ({ dataType, columns }: { dataType: string, columns: string[] }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const ROWS_PER_PAGE = 15;

  const fetchDetailedData = async () => {
    setLoading(true);
    try {
      const from = (page - 1) * ROWS_PER_PAGE;
      const to = from + ROWS_PER_PAGE - 1;

      const { data: pageData, error, count: totalCount } = await supabase
        .from(dataType)
        .select('*', { count: 'exact' })
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
  }, [page, dataType]);

  const totalPages = Math.ceil(count / ROWS_PER_PAGE);

  return (
    <div className="space-y-4">
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
    { value: 'charging', label: 'Charging Sessions Report' },
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
    // ... (generateReport logic remains the same)
  };

  const downloadReport = (report: ReportData) => {
    // ... (downloadReport logic remains the same)
  };

  const handleViewReport = (report: ReportData) => {
    setViewingReportData(report);
    setIsReportViewerOpen(true);
  };

  const handleDeleteReport = async (reportId: string) => {
    // ... (handleDeleteReport logic remains the same)
  };

  const addStaticExpense = async () => {
    // ... (addStaticExpense logic remains the same)
  };

  const deleteStaticExpense = async (id: string) => {
    // ... (deleteStaticExpense logic remains the same)
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
              {/* Form for generating reports */}
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
                    <DetailedReportView dataType={key} columns={columns} />
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
