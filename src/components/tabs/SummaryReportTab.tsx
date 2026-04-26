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
import { addDays, format, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  processTransactions,
  calculateFinancialSummary,
  formatCurrency,
  normalizePaymentMode,
} from "@/utils/unifiedCalculations";

interface FullSummary {
  date_range: string;
  total_income_from_orders: number;
  total_income_from_charging: number;
  total_income: number;
  total_cash_income: number;
  total_esewa_income: number;
  total_fonepay_income: number;
  total_expenses: number;
  total_expenses_cash: number;
  total_expenses_esewa: number;
  total_expenses_fonepay: number;
  total_deposits: number;
  total_deposits_cash: number;
  total_deposits_esewa: number;
  total_deposits_fonepay: number;
  total_savings: number;
  total_savings_cash: number;
  total_savings_esewa: number;
  total_savings_fonepay: number;
  total_withdrawals: number;
  total_withdrawals_cooperative: number;
  total_withdrawals_bank: number;
  cash_balance: number;
  esewa_balance: number;
  fonepay_balance: number;
  cooperative_balance: number;
  total_balance: number;
}

const SummaryReportTab = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<FullSummary | null>(null);
  const [reportType, setReportType] = useState("daily");
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | undefined>({
    from: new Date(),
    to: new Date(),
  });

  const resolveRange = (): { from: Date; to: Date } | null => {
    const today = new Date();
    if (reportType === "daily") return { from: startOfDay(today), to: today };
    if (reportType === "weekly") return { from: startOfWeek(today), to: today };
    if (reportType === "monthly") return { from: startOfMonth(today), to: today };
    if (dateRange?.from && dateRange?.to) return { from: dateRange.from, to: dateRange.to };
    return null;
  };

  const generate = async () => {
    if (!user) return;
    const range = resolveRange();
    if (!range) {
      toast.error("Please select a valid date range");
      return;
    }
    setLoading(true);
    try {
      const fromDate = format(range.from, "yyyy-MM-dd");
      const toDate = format(range.to, "yyyy-MM-dd");

      const [
        { data: orders = [] },
        { data: charging = [] },
        { data: expenses = [] },
        { data: deposits = [] },
        { data: withdrawals = [] },
        { data: savings = [] },
      ] = await Promise.all([
        supabase.from("orders").select("total, payment_mode")
          .gte("order_date", fromDate).lte("order_date", toDate),
        supabase.from("charging_sessions").select("total_amount, payment_mode")
          .gte("session_date", fromDate).lte("session_date", toDate),
        supabase.from("expenses").select("amount, payment_mode")
          .gte("expense_date", fromDate).lte("expense_date", toDate),
        supabase.from("deposits").select("amount, mode, deposited_to, payment_mode")
          .gte("deposit_date", fromDate).lte("deposit_date", toDate),
        supabase.from("withdrawals").select("amount, payment_mode, withdrawal_from")
          .gte("withdrawal_date", fromDate).lte("withdrawal_date", toDate),
        supabase.from("cooperative_savings").select("contribution_amount, payment_mode")
          .gte("contribution_date", fromDate).lte("contribution_date", toDate),
      ]);

      const data = {
        orders: processTransactions(orders || [], "total", "payment_mode"),
        charging: processTransactions(charging || [], "total_amount", "payment_mode"),
        expenses: processTransactions(expenses || [], "amount", "payment_mode"),
        deposits: processTransactions(deposits || [], "amount", "payment_mode"),
        withdrawals: processTransactions(withdrawals || [], "amount", "payment_mode"),
        cooperative_savings: processTransactions(savings || [], "contribution_amount", "payment_mode"),
      };

      const s = calculateFinancialSummary(data, {
        deposits: deposits || [],
        withdrawals: withdrawals || [],
      });

      // Deposits split by destination wallet
      const depositsCash = (deposits || [])
        .filter((d: any) => !d.deposited_to || normalizePaymentMode(d.deposited_to) === "cash")
        .reduce((sum: number, d: any) => sum + (Number(d.amount) || 0), 0);
      const depositsEsewa = (deposits || [])
        .filter((d: any) => normalizePaymentMode(d.deposited_to || "") === "esewa")
        .reduce((sum: number, d: any) => sum + (Number(d.amount) || 0), 0);
      const depositsFonepay = (deposits || [])
        .filter((d: any) => {
          const t = normalizePaymentMode(d.deposited_to || "");
          return t === "fonepay" || t === "bank";
        })
        .reduce((sum: number, d: any) => sum + (Number(d.amount) || 0), 0);

      // Withdrawal source split
      const withdrawalsCoop = (withdrawals || [])
        .filter((w: any) => (w.withdrawal_from || "").toLowerCase().includes("cooperative"))
        .reduce((sum: number, w: any) => sum + (Number(w.amount) || 0), 0);
      const withdrawalsBank = (withdrawals || [])
        .filter((w: any) => (w.withdrawal_from || "").toLowerCase().includes("bank"))
        .reduce((sum: number, w: any) => sum + (Number(w.amount) || 0), 0);

      setSummary({
        date_range: `${fromDate} to ${toDate}`,
        total_income_from_orders: s.income.fromOrders,
        total_income_from_charging: s.income.fromCharging,
        total_income: s.income.total,
        total_cash_income: s.paymentModes.cash,
        total_esewa_income: s.paymentModes.esewa,
        total_fonepay_income: s.paymentModes.fonepay + s.paymentModes.bank,
        total_expenses: s.expenses.total,
        total_expenses_cash: s.expenses.byPayment.cash,
        total_expenses_esewa: s.expenses.byPayment.esewa,
        total_expenses_fonepay: s.expenses.byPayment.fonepay + s.expenses.byPayment.bank,
        total_deposits: s.deposits.total,
        total_deposits_cash: depositsCash,
        total_deposits_esewa: depositsEsewa,
        total_deposits_fonepay: depositsFonepay,
        total_savings: s.savings.total,
        total_savings_cash: s.savings.byPayment.cash,
        total_savings_esewa: s.savings.byPayment.esewa,
        total_savings_fonepay: s.savings.byPayment.fonepay + s.savings.byPayment.bank,
        total_withdrawals: s.withdrawals.total,
        total_withdrawals_cooperative: withdrawalsCoop,
        total_withdrawals_bank: withdrawalsBank,
        cash_balance: s.balances.cash,
        esewa_balance: s.balances.esewa,
        fonepay_balance: s.balances.fonepay,
        cooperative_balance: s.balances.cooperative,
        total_balance: s.balances.total,
      });

      toast.success("Summary report generated");
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to generate summary report");
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    if (!summary) return;
    const rows = Object.entries(summary).map(([k, v]) => `${k},${v}`);
    const csv = ["Metric,Value", ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `summary-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded");
  };

  const Cell = ({ label, value }: { label: string; value: number | string }) => (
    <div className="p-3 bg-muted rounded-md border">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold text-foreground mt-1">
        {typeof value === "number" ? formatCurrency(value, "Rs.") : value}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-lg font-semibold text-foreground">Summary Report</h2>
      </div>

      <Card className="bg-card border">
        <CardHeader>
          <CardTitle className="text-base font-medium">Generate Summary Report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily (today)</SelectItem>
                  <SelectItem value="weekly">Weekly (this week)</SelectItem>
                  <SelectItem value="monthly">Monthly (this month)</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {reportType === "custom" && (
              <div className="space-y-2">
                <Label>Date Range</Label>
                <DateRangePicker onUpdate={setDateRange} />
              </div>
            )}
          </div>
          <Button onClick={generate} disabled={loading} className="w-full">
            <Calendar className="h-4 w-4 mr-2" />
            {loading ? "Generating..." : "Generate Report"}
          </Button>
        </CardContent>
      </Card>

      {summary && (
        <Card className="bg-card border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-medium">
              Summary: {summary.date_range}
            </CardTitle>
            <Button onClick={downloadCSV} variant="outline" size="sm">
              <FileDown className="h-4 w-4 mr-2" />
              Download CSV
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            <section>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Income</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Cell label="From Orders" value={summary.total_income_from_orders} />
                <Cell label="From Charging" value={summary.total_income_from_charging} />
                <Cell label="Total Income" value={summary.total_income} />
                <Cell label="Cash Income" value={summary.total_cash_income} />
                <Cell label="eSewa Income" value={summary.total_esewa_income} />
                <Cell label="Fonepay Income" value={summary.total_fonepay_income} />
              </div>
            </section>

            <section>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Expenses</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Cell label="Total Expenses" value={summary.total_expenses} />
                <Cell label="Cash" value={summary.total_expenses_cash} />
                <Cell label="eSewa" value={summary.total_expenses_esewa} />
                <Cell label="Fonepay/Bank" value={summary.total_expenses_fonepay} />
              </div>
            </section>

            <section>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Deposits (Cash → Wallet)</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Cell label="Total Deposits" value={summary.total_deposits} />
                <Cell label="To Cash" value={summary.total_deposits_cash} />
                <Cell label="To eSewa" value={summary.total_deposits_esewa} />
                <Cell label="To Fonepay" value={summary.total_deposits_fonepay} />
              </div>
            </section>

            <section>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Cooperative Savings</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Cell label="Total Savings" value={summary.total_savings} />
                <Cell label="Cash" value={summary.total_savings_cash} />
                <Cell label="eSewa" value={summary.total_savings_esewa} />
                <Cell label="Fonepay" value={summary.total_savings_fonepay} />
              </div>
            </section>

            <section>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Withdrawals</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Cell label="Total Withdrawals" value={summary.total_withdrawals} />
                <Cell label="From Cooperative" value={summary.total_withdrawals_cooperative} />
                <Cell label="From Bank" value={summary.total_withdrawals_bank} />
              </div>
            </section>

            <section>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Balances</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Cell label="Cash Balance" value={summary.cash_balance} />
                <Cell label="eSewa Balance" value={summary.esewa_balance} />
                <Cell label="Fonepay Balance" value={summary.fonepay_balance} />
                <Cell label="Cooperative Balance" value={summary.cooperative_balance} />
                <Cell label="Total Balance" value={summary.total_balance} />
              </div>
            </section>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SummaryReportTab;
