
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { FileDown, Calendar, TrendingUp } from "lucide-react";
import { addDays, format } from "date-fns";
import { DateRangePicker } from "@/components/ui/date-range-picker";

interface SummaryData {
  total_income: number;
  total_expenses: number;
  total_deposits: number;
  total_withdrawals: number;
  net_profit: number;
  date_range: string;
}

const SummaryReportTab = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [reportType, setReportType] = useState("daily");
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | undefined>({
    from: new Date(),
    to: addDays(new Date(), 7)
  });

  const generateSummaryReport = async () => {
    if (!user || !dateRange?.from || !dateRange?.to) {
      toast.error("Please select a valid date range");
      return;
    }

    setLoading(true);
    try {
      const fromDate = format(dateRange.from, "yyyy-MM-dd");
      const toDate = format(dateRange.to, "yyyy-MM-dd");

      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("total")
        .eq("user_id", user.id)
        .gte("order_date", fromDate)
        .lte("order_date", toDate);

      if (ordersError) throw ordersError;

      const { data: expensesData, error: expensesError } = await supabase
        .from("expenses")
        .select("amount")
        .eq("user_id", user.id)
        .gte("expense_date", fromDate)
        .lte("expense_date", toDate);

      if (expensesError) throw expensesError;

      const { data: depositsData, error: depositsError } = await supabase
        .from("deposits")
        .select("amount")
        .eq("user_id", user.id)
        .gte("deposit_date", fromDate)
        .lte("deposit_date", toDate);

      if (depositsError) throw depositsError;

      const { data: withdrawalsData, error: withdrawalsError } = await supabase
        .from("withdrawals")
        .select("amount")
        .eq("user_id", user.id)
        .gte("withdrawal_date", fromDate)
        .lte("withdrawal_date", toDate);

      if (withdrawalsError) throw withdrawalsError;

      const totalIncome = ordersData?.reduce((sum, order) => sum + (order.total || 0), 0) || 0;
      const totalExpenses = expensesData?.reduce((sum, expense) => sum + (expense.amount || 0), 0) || 0;
      const totalDeposits = depositsData?.reduce((sum, deposit) => sum + (deposit.amount || 0), 0) || 0;
      const totalWithdrawals = withdrawalsData?.reduce((sum, withdrawal) => sum + (withdrawal.amount || 0), 0) || 0;
      const netProfit = totalIncome - totalExpenses;

      setSummaryData({
        total_income: totalIncome,
        total_expenses: totalExpenses,
        total_deposits: totalDeposits,
        total_withdrawals: totalWithdrawals,
        net_profit: netProfit,
        date_range: `${fromDate} to ${toDate}`
      });

      toast.success("Summary report generated successfully");
    } catch (error: any) {
      console.error("Error generating summary report:", error);
      toast.error("Failed to generate summary report");
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = () => {
    if (!summaryData) {
      toast.error("No data to download");
      return;
    }

    const csvContent = [
      "Metric,Amount",
      `Total Income,${summaryData.total_income}`,
      `Total Expenses,${summaryData.total_expenses}`,
      `Total Deposits,${summaryData.total_deposits}`,
      `Total Withdrawals,${summaryData.total_withdrawals}`,
      `Net Profit,${summaryData.net_profit}`,
      `Date Range,${summaryData.date_range}`
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `summary-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success("Report downloaded successfully");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-lg font-semibold text-foreground">Summary Report</h2>
      </div>

      <Card className="bg-card border">
        <CardHeader>
          <CardTitle className="text-base font-medium text-foreground">Generate Summary Report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reportType" className="text-foreground">Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Date Range</Label>
              <DateRangePicker onUpdate={setDateRange} />
            </div>
          </div>
          <Button onClick={generateSummaryReport} disabled={loading} className="w-full">
            <Calendar className="h-4 w-4 mr-2" />
            {loading ? "Generating..." : "Generate Report"}
          </Button>
        </CardContent>
      </Card>

      {summaryData && (
        <Card className="bg-card border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-medium text-foreground">Summary Results</CardTitle>
            <Button onClick={downloadReport} variant="outline" size="sm">
              <FileDown className="h-4 w-4 mr-2" />
              Download CSV
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="text-sm font-medium text-muted-foreground">Total Income</h3>
                <p className="text-xl font-bold text-foreground">
                  Rs. {summaryData.total_income.toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="text-sm font-medium text-muted-foreground">Total Expenses</h3>
                <p className="text-xl font-bold text-foreground">
                  Rs. {summaryData.total_expenses.toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="text-sm font-medium text-muted-foreground">Total Deposits</h3>
                <p className="text-xl font-bold text-foreground">
                  Rs. {summaryData.total_deposits.toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="text-sm font-medium text-muted-foreground">Total Withdrawals</h3>
                <p className="text-xl font-bold text-foreground">
                  Rs. {summaryData.total_withdrawals.toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="text-sm font-medium text-muted-foreground">Net Profit</h3>
                <p className="text-xl font-bold text-foreground">
                  Rs. {summaryData.net_profit.toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="text-sm font-medium text-muted-foreground">Date Range</h3>
                <p className="text-sm font-medium text-foreground">
                  {summaryData.date_range}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SummaryReportTab;
