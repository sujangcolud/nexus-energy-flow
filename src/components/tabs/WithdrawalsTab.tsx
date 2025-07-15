import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  TrendingDown,
  Calendar as CalendarIcon,
  Banknote,
  Wallet,
  DollarSign,
  ArrowDownCircle,
  Plus,
  Trash2,
} from "lucide-react";
import { DateRange } from "react-day-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import useTableControls from "@/hooks/useTableControls";

interface Withdrawal {
  id: string;
  amount: number;
  payment_mode: string;
  withdrawn_by: string;
  withdrawal_date: string;
  remarks: string;
}

const WithdrawalsTab = () => {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    amount: "",
    paymentMode: "",
    withdrawnBy: "",
    remarks: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { page, range, onPageChange, onRangeChange, itemsPerPage } =
    useTableControls();

  const paymentModes = [
    "Cash",
    "Esewa",
    "Fonepay",
    "Bank Transfer",
    "Cheque",
    "Mobile Banking",
    "Other",
  ];

  const fetchWithdrawals = async () => {
    if (!user) return;

    setLoading(true);
    try {
      let query = supabase
        .from("withdrawals")
        .select("*", { count: "exact" })
        .eq("user_id", user.id);

      if (range?.from) {
        query = query.gte("withdrawal_date", format(range.from, "yyyy-MM-dd"));
      }
      if (range?.to) {
        query = query.lte("withdrawal_date", format(range.to, "yyyy-MM-dd"));
      }

      const { data, error, count } = await query
        .order("withdrawal_date", { ascending: false })
        .range((page - 1) * itemsPerPage, page * itemsPerPage - 1);

      if (error) throw error;
      setWithdrawals(data || []);
    } catch (error) {
      console.error("Error fetching withdrawals:", error);
      toast.error("Failed to load withdrawals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchWithdrawals();
    }
  }, [user, page, range]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.amount || !formData.paymentMode || !formData.withdrawnBy) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("withdrawals").insert({
        user_id: user!.id,
        amount: parseFloat(formData.amount),
        payment_mode: formData.paymentMode,
        withdrawn_by: formData.withdrawnBy,
        remarks: formData.remarks,
        withdrawal_date: new Date().toISOString().split("T")[0],
      });

      if (error) throw error;

      toast.success("Withdrawal recorded successfully!");
      setFormData({
        amount: "",
        paymentMode: "",
        withdrawnBy: "",
        remarks: "",
      });
      fetchWithdrawals();
    } catch (error) {
      console.error("Error adding withdrawal:", error);
      toast.error("Failed to record withdrawal");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteWithdrawal = async (id: string) => {
    try {
      const { error } = await supabase
        .from("withdrawals")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Withdrawal deleted successfully!");
      fetchWithdrawals();
    } catch (error) {
      console.error("Error deleting withdrawal:", error);
      toast.error("Failed to delete withdrawal");
    }
  };

  const totalWithdrawals = withdrawals.reduce(
    (sum, withdrawal) => sum + withdrawal.amount,
    0,
  );
  const modeTotals = withdrawals.reduce(
    (acc, withdrawal) => {
      acc[withdrawal.payment_mode] =
        (acc[withdrawal.payment_mode] || 0) + withdrawal.amount;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-primary rounded-xl">
          <Banknote className="h-6 w-6 text-black" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-black">
            Withdrawal Management
          </h1>
          <p className="text-gray-600">Track outgoing funds and withdrawals</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  Total Withdrawals
                </p>
                <p className="text-2xl font-bold text-black">
                  NRs. {totalWithdrawals.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-brand-100 rounded-xl">
                <DollarSign className="h-6 w-6 text-black" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  Total Transactions
                </p>
                <p className="text-2xl font-bold text-black">
                  {withdrawals.length}
                </p>
              </div>
              <div className="p-3 bg-brand-100 rounded-xl">
                <ArrowDownCircle className="h-6 w-6 text-black" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  Average Withdrawal
                </p>
                <p className="text-2xl font-bold text-black">
                  NRs.{" "}
                  {withdrawals.length > 0
                    ? (totalWithdrawals / withdrawals.length).toFixed(2)
                    : "0"}
                </p>
              </div>
              <div className="p-3 bg-brand-100 rounded-xl">
                <TrendingDown className="h-6 w-6 text-black" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Add Withdrawal Form */}
        <Card className="border border-gray-200">
          <CardHeader className="bg-brand-50 border-b border-gray-200">
            <CardTitle className="flex items-center gap-3 text-black">
              <div className="p-2 bg-primary rounded-lg">
                <Plus className="h-5 w-5 text-black" />
              </div>
              Record New Withdrawal
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-black font-medium">
                  Amount (NRs.) *
                </Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  placeholder="0.00"
                  required
                  className="focus:ring-primary focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="payment-mode"
                  className="text-black font-medium"
                >
                  Payment Method *
                </Label>
                <Select
                  value={formData.paymentMode}
                  onValueChange={(value) =>
                    setFormData({ ...formData, paymentMode: value })
                  }
                >
                  <SelectTrigger className="focus:ring-primary focus:border-primary">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentModes.map((mode) => (
                      <SelectItem key={mode} value={mode}>
                        {mode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="withdrawn-by"
                  className="text-black font-medium"
                >
                  Withdrawn By *
                </Label>
                <Input
                  id="withdrawn-by"
                  value={formData.withdrawnBy}
                  onChange={(e) =>
                    setFormData({ ...formData, withdrawnBy: e.target.value })
                  }
                  placeholder="Name of person/entity"
                  required
                  className="focus:ring-primary focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="remarks" className="text-black font-medium">
                  Remarks
                </Label>
                <Textarea
                  id="remarks"
                  value={formData.remarks}
                  onChange={(e) =>
                    setFormData({ ...formData, remarks: e.target.value })
                  }
                  placeholder="Additional notes (optional)"
                  className="focus:ring-primary focus:border-primary"
                  rows={3}
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary hover:bg-brand-400 text-black"
              >
                {isSubmitting ? "Recording..." : "Record Withdrawal"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Payment Method Summary & Filters */}
        <div className="space-y-6">
          {/* Date Filter */}
          <Card className="border border-gray-200">
            <CardHeader className="bg-brand-50 border-b border-gray-200">
              <CardTitle className="text-black">Filter Withdrawals</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label className="text-black font-medium">Date Range</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !range && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {range?.from ? (
                          range.to ? (
                            <>
                              {format(range.from, "LLL dd, y")} -{" "}
                              {format(range.to, "LLL dd, y")}
                            </>
                          ) : (
                            format(range.from, "LLL dd, y")
                          )
                        ) : (
                          <span>Pick a date range</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={range?.from}
                        selected={range}
                        onSelect={onRangeChange}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Method Summary */}
          <Card className="border border-gray-200">
            <CardHeader className="bg-brand-50 border-b border-gray-200">
              <CardTitle className="flex items-center gap-3 text-black">
                <div className="p-2 bg-primary rounded-lg">
                  <Wallet className="h-5 w-5 text-black" />
                </div>
                Payment Methods
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {Object.keys(modeTotals).length === 0 ? (
                <div className="text-center py-8">
                  <Banknote className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">No withdrawals recorded yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(modeTotals)
                    .sort(([, a], [, b]) => b - a)
                    .map(([mode, amount]) => (
                      <div
                        key={mode}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-primary rounded-full"></div>
                          <span className="font-medium text-black">{mode}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-black">
                            NRs. {amount.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500">
                            {((amount / totalWithdrawals) * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Withdrawals Table */}
      <Card className="border border-gray-200">
        <CardHeader className="bg-brand-50 border-b border-gray-200">
          <CardTitle className="flex items-center gap-3 text-black">
            <div className="p-2 bg-primary rounded-lg">
              <ArrowDownCircle className="h-5 w-5 text-black" />
            </div>
            Withdrawal History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading withdrawals...</p>
            </div>
          ) : withdrawals.length === 0 ? (
            <div className="text-center py-8">
              <Banknote className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <p className="text-xl font-semibold text-gray-700 mb-2">
                No withdrawals found
              </p>
              <p className="text-gray-500">
                Record your first withdrawal using the form above!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-black">Date</TableHead>
                    <TableHead className="text-black">Amount</TableHead>
                    <TableHead className="text-black">Payment Method</TableHead>
                    <TableHead className="text-black">Withdrawn By</TableHead>
                    <TableHead className="text-black">Remarks</TableHead>
                    <TableHead className="text-black">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawals.map((withdrawal) => (
                    <TableRow key={withdrawal.id}>
                      <TableCell className="text-black">
                        {format(
                          new Date(withdrawal.withdrawal_date),
                          "MMM dd, yyyy",
                        )}
                      </TableCell>
                      <TableCell className="font-semibold text-black">
                        NRs. {withdrawal.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="border-primary text-primary"
                        >
                          {withdrawal.payment_mode}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-black">
                        {withdrawal.withdrawn_by}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-black">
                        {withdrawal.remarks || "-"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteWithdrawal(withdrawal.id)}
                          className="hover:bg-red-50 hover:border-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
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

export default WithdrawalsTab;
