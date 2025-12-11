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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Database,
  BarChart3,
  RefreshCw,
  Download,
  Search,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Zap,
  Wallet,
  PiggyBank,
  ArrowUpDown,
  LineChart,
  PieChart
} from "lucide-react";
import { toast } from "sonner";
import { format, subDays, parseISO, startOfDay } from "date-fns";
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from "recharts";

interface TableData {
  name: string;
  data: any[];
  loading: boolean;
  columns: string[];
}

const TABLE_CONFIG = [
  { name: "orders", icon: ShoppingCart, color: "text-blue-600", dateColumn: "order_date" },
  { name: "expenses", icon: Wallet, color: "text-red-600", dateColumn: "expense_date" },
  { name: "deposits", icon: TrendingUp, color: "text-green-600", dateColumn: "deposit_date" },
  { name: "withdrawals", icon: ArrowUpDown, color: "text-orange-600", dateColumn: "withdrawal_date" },
  { name: "charging_sessions", icon: Zap, color: "text-yellow-600", dateColumn: "session_date" },
  { name: "cooperative_savings", icon: PiggyBank, color: "text-purple-600", dateColumn: "contribution_date" },
  { name: "share_investments", icon: DollarSign, color: "text-indigo-600", dateColumn: "investment_date" },
  { name: "vat_entries", icon: Database, color: "text-cyan-600", dateColumn: "invoice_date" },
  { name: "daily_summary", icon: BarChart3, color: "text-emerald-600", dateColumn: "summary_date" },
];

const DashboardStudio: React.FC = () => {
  const [tableData, setTableData] = useState<Record<string, TableData>>({});
  const [selectedTable, setSelectedTable] = useState("orders");
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [summaryStats, setSummaryStats] = useState({
    totalOrders: 0,
    totalExpenses: 0,
    totalIncome: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
    totalSavings: 0
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const promises = TABLE_CONFIG.map(async (table) => {
        // Fetch all data using pagination (no limit)
        let allData: any[] = [];
        let from = 0;
        const batchSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabase
            .from(table.name as any)
            .select("*")
            .order(table.dateColumn, { ascending: false })
            .range(from, from + batchSize - 1);

          if (error) {
            console.error(`Error fetching ${table.name}:`, error);
            break;
          }

          if (data && data.length > 0) {
            allData = [...allData, ...data];
            from += batchSize;
            hasMore = data.length === batchSize;
          } else {
            hasMore = false;
          }
        }

        const columns = allData.length > 0 ? Object.keys(allData[0]) : [];
        return { name: table.name, data: allData, columns };
      });

      const results = await Promise.all(promises);
      
      const newTableData: Record<string, TableData> = {};
      results.forEach((result) => {
        newTableData[result.name] = {
          name: result.name,
          data: result.data,
          loading: false,
          columns: result.columns
        };
      });

      setTableData(newTableData);
      calculateSummary(newTableData);
      toast.success("All data loaded successfully!");
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load some data");
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = (data: Record<string, TableData>) => {
    const orders = data.orders?.data || [];
    const expenses = data.expenses?.data || [];
    const deposits = data.deposits?.data || [];
    const withdrawals = data.withdrawals?.data || [];
    const savings = data.cooperative_savings?.data || [];
    const charging = data.charging_sessions?.data || [];

    setSummaryStats({
      totalOrders: orders.reduce((sum, o) => sum + (o.total || 0), 0),
      totalExpenses: expenses.reduce((sum, e) => sum + (e.amount || 0), 0),
      totalIncome: orders.reduce((sum, o) => sum + (o.total || 0), 0) + 
                   charging.reduce((sum, c) => sum + (c.total_amount || 0), 0),
      totalDeposits: deposits.reduce((sum, d) => sum + (d.amount || 0), 0),
      totalWithdrawals: withdrawals.reduce((sum, w) => sum + (w.amount || 0), 0),
      totalSavings: savings.reduce((sum, s) => sum + (s.contribution_amount || 0), 0)
    });
  };

  // Chart data calculations
  const chartData = useMemo(() => {
    const orders = tableData.orders?.data || [];
    const expenses = tableData.expenses?.data || [];
    const charging = tableData.charging_sessions?.data || [];
    const deposits = tableData.deposits?.data || [];
    const withdrawals = tableData.withdrawals?.data || [];

    // Last 30 days trend
    const last30Days: Record<string, { date: string; orders: number; expenses: number; income: number; deposits: number; withdrawals: number }> = {};
    for (let i = 29; i >= 0; i--) {
      const date = format(subDays(new Date(), i), "yyyy-MM-dd");
      last30Days[date] = { date: format(subDays(new Date(), i), "MMM dd"), orders: 0, expenses: 0, income: 0, deposits: 0, withdrawals: 0 };
    }

    orders.forEach((o) => {
      const date = o.order_date || o.date;
      if (date && last30Days[date]) {
        last30Days[date].orders += o.total || 0;
        last30Days[date].income += o.total || 0;
      }
    });

    charging.forEach((c) => {
      const date = c.session_date || c.date;
      if (date && last30Days[date]) {
        last30Days[date].income += c.total_amount || 0;
      }
    });

    expenses.forEach((e) => {
      const date = e.expense_date || e.date;
      if (date && last30Days[date]) {
        last30Days[date].expenses += e.amount || 0;
      }
    });

    deposits.forEach((d) => {
      const date = d.deposit_date || d.date;
      if (date && last30Days[date]) {
        last30Days[date].deposits += d.amount || 0;
      }
    });

    withdrawals.forEach((w) => {
      const date = w.withdrawal_date || w.date;
      if (date && last30Days[date]) {
        last30Days[date].withdrawals += w.amount || 0;
      }
    });

    const trendData = Object.values(last30Days);

    // Payment mode distribution
    const paymentModes: Record<string, number> = {};
    orders.forEach((o) => {
      const mode = o.payment_mode || "Unknown";
      paymentModes[mode] = (paymentModes[mode] || 0) + (o.total || 0);
    });
    charging.forEach((c) => {
      const mode = c.payment_mode || "Unknown";
      paymentModes[mode] = (paymentModes[mode] || 0) + (c.total_amount || 0);
    });

    const paymentModeData = Object.entries(paymentModes).map(([name, value]) => ({ name, value }));

    // Expense categories
    const expenseCategories: Record<string, number> = {};
    expenses.forEach((e) => {
      const cat = e.category || "Other";
      expenseCategories[cat] = (expenseCategories[cat] || 0) + (e.amount || 0);
    });
    const expenseCategoryData = Object.entries(expenseCategories).map(([name, value]) => ({ name, value }));

    return { trendData, paymentModeData, expenseCategoryData };
  }, [tableData]);

  const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

  const getFilteredData = () => {
    const currentData = tableData[selectedTable]?.data || [];
    if (!searchTerm) return currentData;

    return currentData.filter((row) =>
      Object.values(row).some((value) =>
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  };

  const exportToCSV = () => {
    const data = getFilteredData();
    if (data.length === 0) {
      toast.error("No data to export");
      return;
    }

    const columns = tableData[selectedTable]?.columns || [];
    const csvContent = [
      columns.join(","),
      ...data.map((row) =>
        columns.map((col) => {
          const value = row[col];
          if (value === null || value === undefined) return "";
          if (typeof value === "object") return JSON.stringify(value);
          return String(value).includes(",") ? `"${value}"` : value;
        }).join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${selectedTable}_export_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    toast.success("Data exported successfully!");
  };

  const formatCellValue = (value: any, columnName: string) => {
    if (value === null || value === undefined) return "-";
    if (typeof value === "object") return JSON.stringify(value);
    if (columnName.includes("date") || columnName.includes("_at")) {
      try {
        return format(new Date(value), "yyyy-MM-dd HH:mm");
      } catch {
        return value;
      }
    }
    if (typeof value === "number") {
      return value.toLocaleString();
    }
    return String(value);
  };

  const currentTableConfig = TABLE_CONFIG.find((t) => t.name === selectedTable);
  const filteredData = getFilteredData();
  const columns = tableData[selectedTable]?.columns || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard Studio</h1>
          <p className="text-muted-foreground mt-2">
            Analyze all your financial data in one place - like a connected spreadsheet
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchAllData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-xs text-muted-foreground">Total Orders</p>
                <p className="text-lg font-bold">Rs. {summaryStats.totalOrders.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-xs text-muted-foreground">Total Income</p>
                <p className="text-lg font-bold">Rs. {summaryStats.totalIncome.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-xs text-muted-foreground">Total Expenses</p>
                <p className="text-lg font-bold">Rs. {summaryStats.totalExpenses.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-xs text-muted-foreground">Total Deposits</p>
                <p className="text-lg font-bold">Rs. {summaryStats.totalDeposits.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-xs text-muted-foreground">Total Withdrawals</p>
                <p className="text-lg font-bold">Rs. {summaryStats.totalWithdrawals.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <PiggyBank className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-xs text-muted-foreground">Total Savings</p>
                <p className="text-lg font-bold">Rs. {summaryStats.totalSavings.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income vs Expenses Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5 text-primary" />
              Income vs Expenses (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData.trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--background))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px"
                  }} 
                  formatter={(value: number) => [`Rs. ${value.toLocaleString()}`, ""]}
                />
                <Legend />
                <Area type="monotone" dataKey="income" stackId="1" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.6} name="Income" />
                <Area type="monotone" dataKey="expenses" stackId="2" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" fillOpacity={0.6} name="Expenses" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Orders Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Daily Orders Revenue (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--background))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px"
                  }}
                  formatter={(value: number) => [`Rs. ${value.toLocaleString()}`, "Orders"]}
                />
                <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payment Mode Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-green-600" />
              Payment Mode Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={chartData.paymentModeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.paymentModeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--background))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px"
                  }}
                  formatter={(value: number) => [`Rs. ${value.toLocaleString()}`, ""]}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Expense Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-red-600" />
              Expense Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.expenseCategoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={100} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--background))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px"
                  }}
                  formatter={(value: number) => [`Rs. ${value.toLocaleString()}`, ""]}
                />
                <Bar dataKey="value" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Deposits vs Withdrawals */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              Deposits vs Withdrawals (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsLineChart data={chartData.trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--background))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px"
                  }}
                  formatter={(value: number) => [`Rs. ${value.toLocaleString()}`, ""]}
                />
                <Legend />
                <Line type="monotone" dataKey="deposits" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} name="Deposits" />
                <Line type="monotone" dataKey="withdrawals" stroke="hsl(var(--chart-4))" strokeWidth={2} dot={false} name="Withdrawals" />
              </RechartsLineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Data Explorer */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data Explorer
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Select value={selectedTable} onValueChange={setSelectedTable}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TABLE_CONFIG.map((table) => {
                    const Icon = table.icon;
                    const count = tableData[table.name]?.data?.length || 0;
                    return (
                      <SelectItem key={table.name} value={table.name}>
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${table.color}`} />
                          <span className="capitalize">{table.name.replace(/_/g, " ")}</span>
                          <Badge variant="secondary" className="ml-1">{count}</Badge>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search data..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-[200px]"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading all data...</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No data found in {selectedTable.replace(/_/g, " ")}</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  Showing {filteredData.length} of {tableData[selectedTable]?.data?.length || 0} records
                </p>
                {currentTableConfig && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    {React.createElement(currentTableConfig.icon, { className: `h-3 w-3 ${currentTableConfig.color}` })}
                    {selectedTable.replace(/_/g, " ")}
                  </Badge>
                )}
              </div>
              <ScrollArea className="h-[500px] rounded-md border">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      {columns.map((col) => (
                        <TableHead key={col} className="whitespace-nowrap font-semibold">
                          {col.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((row, idx) => (
                      <TableRow key={row.id || idx}>
                        {columns.map((col) => (
                          <TableCell key={col} className="whitespace-nowrap max-w-[200px] truncate">
                            {formatCellValue(row[col], col)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats by Table */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TABLE_CONFIG.slice(0, 6).map((table) => {
          const Icon = table.icon;
          const count = tableData[table.name]?.data?.length || 0;
          return (
            <Card key={table.name} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedTable(table.name)}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className={`h-8 w-8 ${table.color}`} />
                    <div>
                      <p className="font-medium capitalize">{table.name.replace(/_/g, " ")}</p>
                      <p className="text-sm text-muted-foreground">{count} records</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">View</Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default DashboardStudio;
