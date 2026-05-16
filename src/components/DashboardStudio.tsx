import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Database, RefreshCw, Download, Search, ShoppingCart, Zap, Wallet, PiggyBank, ArrowUpDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { format, subDays } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from "recharts";

interface TableData {
  name: string;
  data: any[];
  loading: boolean;
  columns: string[];
}

const TABLE_CONFIG = [
  { name: "orders", icon: ShoppingCart, dateColumn: "order_date" },
  { name: "expenses", icon: Wallet, dateColumn: "expense_date" },
  { name: "deposits", icon: TrendingUp, dateColumn: "deposit_date" },
  { name: "withdrawals", icon: ArrowUpDown, dateColumn: "withdrawal_date" },
  { name: "charging_sessions", icon: Zap, dateColumn: "session_date" },
  { name: "cooperative_savings", icon: PiggyBank, dateColumn: "contribution_date" },
  { name: "daily_summary", icon: Database, dateColumn: "summary_date" },
];

const DashboardStudio: React.FC = () => {
  const [tableData, setTableData] = useState<Record<string, TableData>>({});
  const [selectedTable, setSelectedTable] = useState("orders");
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [summaryStats, setSummaryStats] = useState({ totalOrders: 0, totalExpenses: 0, totalIncome: 0, totalDeposits: 0, totalWithdrawals: 0, totalSavings: 0 });

  useEffect(() => { fetchAllData(); }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const promises = TABLE_CONFIG.map(async (table) => {
        let allData: any[] = [];
        let from = 0;
        const batchSize = 1000;
        let hasMore = true;
        while (hasMore) {
          const { data, error } = await supabase.from(table.name as any).select("*").order(table.dateColumn, { ascending: false }).range(from, from + batchSize - 1);
          if (error) break;
          if (data && data.length > 0) { allData = [...allData, ...data]; from += batchSize; hasMore = data.length === batchSize; } else { hasMore = false; }
        }
        return { name: table.name, data: allData, columns: allData.length > 0 ? Object.keys(allData[0]) : [] };
      });
      const results = await Promise.all(promises);
      const newTableData: Record<string, TableData> = {};
      results.forEach((result) => { newTableData[result.name] = { name: result.name, data: result.data, loading: false, columns: result.columns }; });
      setTableData(newTableData);
      calculateSummary(newTableData);
      toast.success("Data loaded!");
    } catch (error) {
      toast.error("Failed to load data");
    } finally { setLoading(false); }
  };

  const calculateSummary = (data: Record<string, TableData>) => {
    const orders = data.orders?.data || [];
    const expenses = data.expenses?.data || [];
    const deposits = data.deposits?.data || [];
    const withdrawals = data.withdrawals?.data || [];
    const savings = data.cooperative_savings?.data || [];
    const charging = data.charging_sessions?.data || [];
    setSummaryStats({
      totalOrders: orders.reduce((s, o) => s + (o.total || 0), 0),
      totalExpenses: expenses.reduce((s, e) => s + (e.amount || 0), 0),
      totalIncome: orders.reduce((s, o) => s + (o.total || 0), 0) + charging.reduce((s, c) => s + (c.total_amount || 0), 0),
      totalDeposits: deposits.reduce((s, d) => s + (d.amount || 0), 0),
      totalWithdrawals: withdrawals.reduce((s, w) => s + (w.amount || 0), 0),
      totalSavings: savings.reduce((s, sv) => s + (sv.contribution_amount || 0), 0),
    });
  };

  const chartData = useMemo(() => {
    const orders = tableData.orders?.data || [];
    const expenses = tableData.expenses?.data || [];
    const last30Days: Record<string, { date: string; orders: number; expenses: number; income: number }> = {};
    for (let i = 29; i >= 0; i--) {
      const date = format(subDays(new Date(), i), "yyyy-MM-dd");
      last30Days[date] = { date: format(subDays(new Date(), i), "MMM dd"), orders: 0, expenses: 0, income: 0 };
    }
    orders.forEach((o) => { const date = o.order_date || o.date; if (date && last30Days[date]) { last30Days[date].orders += o.total || 0; last30Days[date].income += o.total || 0; } });
    expenses.forEach((e) => { const date = e.expense_date || e.date; if (date && last30Days[date]) { last30Days[date].expenses += e.amount || 0; } });
    return Object.values(last30Days);
  }, [tableData]);

  const getFilteredData = () => {
    const currentData = tableData[selectedTable]?.data || [];
    if (!searchTerm) return currentData;
    return currentData.filter((row) => Object.values(row).some((v) => String(v).toLowerCase().includes(searchTerm.toLowerCase())));
  };

  const exportToCSV = () => {
    const data = getFilteredData();
    if (data.length === 0) { toast.error("No data"); return; }
    const columns = tableData[selectedTable]?.columns || [];
    const csv = [columns.join(","), ...data.map((row) => columns.map((c) => { const v = row[c]; if (v === null || v === undefined) return ""; if (typeof v === "object") return JSON.stringify(v); return String(v).includes(",") ? `"${v}"` : v; }).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${selectedTable}_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    toast.success("Exported!");
  };

  const formatCell = (value: any, col: string) => {
    if (value === null || value === undefined) return "-";
    if (typeof value === "object") return JSON.stringify(value);
    if (col.includes("date") || col.includes("_at")) { try { return format(new Date(value), "yyyy-MM-dd"); } catch { return value; } }
    if (typeof value === "number") return value.toLocaleString();
    return String(value);
  };

  const filteredData = getFilteredData();
  const columns = tableData[selectedTable]?.columns || [];

  return (
    <div className="space-y-6 p-4 sm:p-6 bg-background min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Dashboard Studio</h1>
          <p className="text-sm text-muted-foreground">Analyze all financial data</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchAllData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />Refresh
          </Button>
          <Button size="sm" onClick={exportToCSV}><Download className="h-4 w-4 mr-2" />Export</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <Card className="bg-card border shadow-sm rounded-2xl sm:rounded-3xl overflow-hidden"><CardContent className="p-3 sm:p-4"><div className="flex items-center gap-2"><ShoppingCart className="h-4 w-4 text-muted-foreground" /><div><p className="text-[10px] sm:text-xs text-muted-foreground uppercase font-bold">Orders</p><p className="text-sm sm:text-lg font-bold">Rs. {summaryStats.totalOrders.toLocaleString()}</p></div></div></CardContent></Card>
        <Card className="bg-card border shadow-sm rounded-2xl sm:rounded-3xl overflow-hidden"><CardContent className="p-3 sm:p-4"><div className="flex items-center gap-2"><Zap className="h-4 w-4 text-muted-foreground" /><div><p className="text-[10px] sm:text-xs text-muted-foreground uppercase font-bold">Income</p><p className="text-sm sm:text-lg font-bold">Rs. {summaryStats.totalIncome.toLocaleString()}</p></div></div></CardContent></Card>
        <Card className="bg-card border shadow-sm rounded-2xl sm:rounded-3xl overflow-hidden"><CardContent className="p-3 sm:p-4"><div className="flex items-center gap-2"><Wallet className="h-4 w-4 text-muted-foreground" /><div><p className="text-[10px] sm:text-xs text-muted-foreground uppercase font-bold">Expenses</p><p className="text-sm sm:text-lg font-bold">Rs. {summaryStats.totalExpenses.toLocaleString()}</p></div></div></CardContent></Card>
        <Card className="bg-card border shadow-sm rounded-2xl sm:rounded-3xl overflow-hidden"><CardContent className="p-3 sm:p-4"><div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-muted-foreground" /><div><p className="text-[10px] sm:text-xs text-muted-foreground uppercase font-bold">Deposits</p><p className="text-sm sm:text-lg font-bold">Rs. {summaryStats.totalDeposits.toLocaleString()}</p></div></div></CardContent></Card>
        <Card className="bg-card border shadow-sm rounded-2xl sm:rounded-3xl overflow-hidden"><CardContent className="p-3 sm:p-4"><div className="flex items-center gap-2"><ArrowUpDown className="h-4 w-4 text-muted-foreground" /><div><p className="text-[10px] sm:text-xs text-muted-foreground uppercase font-bold">Withdrawals</p><p className="text-sm sm:text-lg font-bold">Rs. {summaryStats.totalWithdrawals.toLocaleString()}</p></div></div></CardContent></Card>
        <Card className="bg-card border shadow-sm rounded-2xl sm:rounded-3xl overflow-hidden"><CardContent className="p-3 sm:p-4"><div className="flex items-center gap-2"><PiggyBank className="h-4 w-4 text-muted-foreground" /><div><p className="text-[10px] sm:text-xs text-muted-foreground uppercase font-bold">Savings</p><p className="text-sm sm:text-lg font-bold">Rs. {summaryStats.totalSavings.toLocaleString()}</p></div></div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border">
          <CardHeader className="pb-3"><CardTitle className="text-base">Income vs Expenses (30 Days)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
                <Legend />
                <Area type="monotone" dataKey="income" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.3} name="Income" />
                <Area type="monotone" dataKey="expenses" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" fillOpacity={0.3} name="Expenses" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="bg-card border">
          <CardHeader className="pb-3"><CardTitle className="text-base">Daily Orders (30 Days)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border rounded-3xl overflow-hidden shadow-sm">
        <CardHeader className="pb-3 border-b border-border bg-slate-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-base font-bold">Data Explorer</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Select value={selectedTable} onValueChange={setSelectedTable}>
                <SelectTrigger className="w-full sm:w-40 h-10 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>{TABLE_CONFIG.map((t) => <SelectItem key={t.name} value={t.name}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
              <div className="relative flex-grow sm:flex-grow-0">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-10 rounded-xl w-full sm:w-48" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground mb-2">{filteredData.length} records</div>
          <ScrollArea className="h-96">
            <Table>
              <TableHeader>
                <TableRow>{columns.slice(0, 8).map((col) => <TableHead key={col}>{col}</TableHead>)}</TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.slice(0, 100).map((row, i) => (
                  <TableRow key={i}>{columns.slice(0, 8).map((col) => <TableCell key={col} className="text-sm">{formatCell(row[col], col)}</TableCell>)}</TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardStudio;
