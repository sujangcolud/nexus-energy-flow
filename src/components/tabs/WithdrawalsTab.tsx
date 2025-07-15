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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingDown,
  Calendar as CalendarIcon,
  Banknote,
  Wallet,
  DollarSign,
<<<<<<< HEAD
  ArrowDownCircle,
  Plus,
=======
  User,
  FileText,
  Sparkles,
  Target,
  Hash,
>>>>>>> origin/main
  Trash2,
} from "lucide-react";
import { DateRange } from "react-day-picker";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
<<<<<<< HEAD
  remarks: string;
=======
  payment_mode: string;
>>>>>>> origin/main
}

const WithdrawalsTab = () => {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    amount: "",
    paymentMode: "",
    withdrawnBy: "",
    remarks: "",
    payment_mode: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { page, range, onPageChange, onRangeChange, itemsPerPage } =
    useTableControls();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] =
    useState<Withdrawal | null>(null);
  const [canEditTransactions, setCanEditTransactions] = useState(false);

  const paymentModes = [
    "Cash",
    "Esewa",
    "Fonepay",
    "Bank Transfer",
    "Cheque",
    "Mobile Banking",
    "Other",
  ];

<<<<<<< HEAD
=======
  const paymentModes = ["Cash", "Esewa", "Fonepay", "Bank"];

  const purposeColors = {
    "Salary Payment": "from-green-500 to-emerald-500",
    "Vendor Payment": "from-blue-500 to-cyan-500",
    "Utility Bills": "from-yellow-500 to-orange-500",
    "Office Rent": "from-purple-500 to-pink-500",
    "Equipment Purchase": "from-indigo-500 to-blue-500",
    "Marketing Expenses": "from-red-500 to-pink-500",
    "Travel Expenses": "from-teal-500 to-cyan-500",
    Maintenance: "from-orange-500 to-red-500",
    "Emergency Fund": "from-violet-500 to-purple-500",
    Other: "from-gray-500 to-slate-500",
  };

  useEffect(() => {
    fetchWithdrawals();
    const canEdit = localStorage.getItem("canEditTransactions");
    if (canEdit) {
      setCanEditTransactions(JSON.parse(canEdit));
    }
  }, [user, page, range]);

>>>>>>> origin/main
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

<<<<<<< HEAD
    if (!formData.amount || !formData.paymentMode || !formData.withdrawnBy) {
=======
    if (!user) {
      toast.error("Please log in to record withdrawals");
      return;
    }

    if (!formData.amount || !formData.purpose || !formData.payment_mode) {
>>>>>>> origin/main
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
<<<<<<< HEAD
      const { error } = await supabase.from("withdrawals").insert({
        user_id: user!.id,
        amount: parseFloat(formData.amount),
        payment_mode: formData.paymentMode,
        withdrawn_by: formData.withdrawnBy,
        remarks: formData.remarks,
        withdrawal_date: new Date().toISOString().split("T")[0],
      });
=======
      let { data: balanceData, error: balanceError } = await supabase
        .from("balances")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (balanceError && balanceError.code !== "PGRST116") {
        throw balanceError;
      }

      if (!balanceData) {
        // Create a new balance record if one doesn't exist
        const { data: newBalanceData, error: newBalanceError } = await supabase
          .from("balances")
          .insert({ user_id: user.id })
          .select()
          .single();
        if (newBalanceError) throw newBalanceError;
        balanceData = newBalanceData;
      }

      const newBalance = { ...balanceData };
      const amount = parseFloat(formData.amount);

      switch (formData.payment_mode) {
        case "Cash":
          newBalance.cash_in_hand -= amount;
          break;
        case "Esewa":
          newBalance.esewa_balance -= amount;
          break;
        case "Fonepay":
          newBalance.fonepay_balance -= amount;
          break;
        case "Bank":
          newBalance.bank_balance -= amount;
          break;
        default:
          break;
      }

      const { error: updateBalanceError } = await supabase
        .from("balances")
        .update(newBalance)
        .eq("id", balanceData.id);

      if (updateBalanceError) throw updateBalanceError;

      const { error } = await supabase.from("withdrawals").insert([
        {
          user_id: user.id,
          amount: parseFloat(formData.amount),
          purpose: formData.purpose,
          recipient: formData.recipient || null,
          reference_number: formData.referenceNumber || null,
          remarks: formData.remarks || null,
          withdrawal_date: new Date().toISOString().split("T")[0],
          payment_mode: formData.payment_mode,
        },
      ]);
>>>>>>> origin/main

      if (error) throw error;

      toast.success("Withdrawal recorded successfully!");
      setFormData({
        amount: "",
        paymentMode: "",
        withdrawnBy: "",
        remarks: "",
        payment_mode: "",
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

<<<<<<< HEAD
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
=======
  const topPurpose = Object.entries(purposeBreakdown).sort(
    ([, a], [, b]) => b - a,
  )[0];
  const averageWithdrawal =
    withdrawals.length > 0 ? totalWithdrawals / withdrawals.length : 0;

  const logAction = async (
    action: string,
    record_id: string,
    details: any,
  ) => {
    if (!user) return;
    await supabase.from("logs").insert({
      user_id: user.id,
      action,
      table_name: "withdrawals",
      record_id,
      details,
    });
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("withdrawals")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Withdrawal deleted successfully!");
      logAction("delete", id, { id });
      fetchWithdrawals();
    } catch (error) {
      console.error("Error deleting withdrawal:", error);
      toast.error("Failed to delete withdrawal");
    }
  };

  const handleUpdate = async () => {
    if (!selectedWithdrawal) return;

    try {
      const { error } = await supabase
        .from("withdrawals")
        .update(selectedWithdrawal)
        .eq("id", selectedWithdrawal.id);

      if (error) throw error;

      toast.success("Withdrawal updated successfully!");
      logAction("update", selectedWithdrawal.id, selectedWithdrawal);
      setIsEditDialogOpen(false);
      fetchWithdrawals();
    } catch (error) {
      console.error("Error updating withdrawal:", error);
      toast.error("Failed to update withdrawal");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Withdrawal</DialogTitle>
          </DialogHeader>
          {selectedWithdrawal && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="editAmount">Amount</Label>
                <Input
                  id="editAmount"
                  value={selectedWithdrawal.amount}
                  onChange={(e) =>
                    setSelectedWithdrawal({
                      ...selectedWithdrawal,
                      amount: parseFloat(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="editPurpose">Purpose</Label>
                <Input
                  id="editPurpose"
                  value={selectedWithdrawal.purpose}
                  onChange={(e) =>
                    setSelectedWithdrawal({
                      ...selectedWithdrawal,
                      purpose: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="editRecipient">Recipient</Label>
                <Input
                  id="editRecipient"
                  value={selectedWithdrawal.recipient || ""}
                  onChange={(e) =>
                    setSelectedWithdrawal({
                      ...selectedWithdrawal,
                      recipient: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="editReferenceNumber">Reference Number</Label>
                <Input
                  id="editReferenceNumber"
                  value={selectedWithdrawal.reference_number || ""}
                  onChange={(e) =>
                    setSelectedWithdrawal({
                      ...selectedWithdrawal,
                      reference_number: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="editRemarks">Remarks</Label>
                <Input
                  id="editRemarks"
                  value={selectedWithdrawal.remarks || ""}
                  onChange={(e) =>
                    setSelectedWithdrawal({
                      ...selectedWithdrawal,
                      remarks: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={handleUpdate}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-64 h-64 bg-gradient-to-r from-blue-400/20 to-indigo-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute top-1/3 right-20 w-80 h-80 bg-gradient-to-r from-indigo-400/20 to-purple-500/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
        <div
          className="absolute bottom-20 left-1/4 w-72 h-72 bg-gradient-to-r from-purple-400/20 to-pink-500/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>
>>>>>>> origin/main
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

<<<<<<< HEAD
              <div className="space-y-2">
                <Label
                  htmlFor="payment-mode"
                  className="text-black font-medium"
=======
                <div className="space-y-2">
                  <Label
                    htmlFor="purpose"
                    className="text-sm font-medium text-gray-700 flex items-center gap-2"
                  >
                    <Target className="h-4 w-4 text-purple-600" />
                    Purpose *
                  </Label>
                  <Input
                    id="purpose"
                    value={formData.purpose}
                    onChange={(e) =>
                      setFormData({ ...formData, purpose: e.target.value })
                    }
                    placeholder="Enter withdrawal purpose"
                    required
                    className="border-purple-200 focus:border-purple-500 focus:ring-purple-500 h-12"
                    list="purpose-suggestions"
                  />
                  <datalist id="purpose-suggestions">
                    {commonPurposes.map((purpose) => (
                      <option key={purpose} value={purpose} />
                    ))}
                  </datalist>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="payment_mode"
                    className="text-sm font-medium text-gray-700"
                  >
                    Payment Mode *
                  </Label>
                  <Select
                    value={formData.payment_mode}
                    onValueChange={(value) =>
                      setFormData({ ...formData, payment_mode: value })
                    }
                    required
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select payment mode" />
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="recipient"
                      className="text-sm font-medium text-gray-700 flex items-center gap-2"
                    >
                      <User className="h-4 w-4 text-green-600" />
                      Recipient (Optional)
                    </Label>
                    <Input
                      id="recipient"
                      value={formData.recipient}
                      onChange={(e) =>
                        setFormData({ ...formData, recipient: e.target.value })
                      }
                      placeholder="Enter recipient name"
                      className="border-green-200 focus:border-green-500 focus:ring-green-500 h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="referenceNumber"
                      className="text-sm font-medium text-gray-700 flex items-center gap-2"
                    >
                      <Hash className="h-4 w-4 text-orange-600" />
                      Reference No. (Optional)
                    </Label>
                    <Input
                      id="referenceNumber"
                      value={formData.referenceNumber}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          referenceNumber: e.target.value,
                        })
                      }
                      placeholder="Enter reference number"
                      className="border-orange-200 focus:border-orange-500 focus:ring-orange-500 h-12"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="remarks"
                    className="text-sm font-medium text-gray-700 flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4 text-gray-600" />
                    Remarks (Optional)
                  </Label>
                  <Textarea
                    id="remarks"
                    value={formData.remarks}
                    onChange={(e) =>
                      setFormData({ ...formData, remarks: e.target.value })
                    }
                    placeholder="Additional notes or details"
                    rows={3}
                    className="border-gray-200 focus:border-gray-500 focus:ring-gray-500"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 hover:from-blue-600 hover:via-indigo-600 hover:to-purple-600 text-white font-semibold shadow-lg transition-all duration-300 transform hover:scale-105"
>>>>>>> origin/main
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
<<<<<<< HEAD
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
=======
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-10">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full animate-spin mx-auto flex items-center justify-center mb-4">
                  <Banknote className="h-8 w-8 text-white" />
                </div>
                <p className="text-gray-600">Loading withdrawals...</p>
              </div>
            ) : withdrawals.length === 0 ? (
              <div className="text-center py-12">
                <Banknote className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <p className="text-xl font-semibold text-gray-700 mb-2">
                  No withdrawals found
                </p>
                <p className="text-gray-500">
                  Start recording your withdrawals to see them here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-gray-50 to-purple-50">
                      <TableHead className="font-semibold text-gray-700">
                        Date
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        Amount
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        Purpose
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        Payment Mode
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        Recipient
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        Reference
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        Remarks
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={1} className="font-bold">
                        Total
                      </TableCell>
                      <TableCell colSpan={7} className="font-bold">
                        NRs. {totalWithdrawals.toFixed(2)}
                      </TableCell>
                    </TableRow>
                    {withdrawals.map((withdrawal, index) => (
                      <TableRow
                        key={withdrawal.id}
                        className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <TableCell className="font-medium">
                          {format(
                            new Date(withdrawal.withdrawal_date),
                            "MMM dd, yyyy",
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="font-bold text-xl bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            NRs. {withdrawal.amount.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`bg-gradient-to-r ${purposeColors[withdrawal.purpose as keyof typeof purposeColors] || "from-gray-500 to-slate-500"} text-white border-0`}
                          >
                            {withdrawal.purpose}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`bg-gradient-to-r ${purposeColors[withdrawal.payment_mode as keyof typeof purposeColors] || "from-gray-500 to-slate-500"} text-white border-0`}
                          >
                            {withdrawal.payment_mode}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-gray-800">
                          {withdrawal.recipient ? (
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-500" />
                              {withdrawal.recipient}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {withdrawal.reference_number ? (
                            <Badge
                              variant="outline"
                              className="bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200"
                            >
                              {withdrawal.reference_number}
                            </Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <span
                            className="text-sm text-gray-600 truncate"
                            title={withdrawal.remarks || ""}
                          >
                            {withdrawal.remarks || "-"}
                          </span>
                        </TableCell>
                        <TableCell>
                          {canEditTransactions && (
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedWithdrawal(withdrawal);
                                  setIsEditDialogOpen(true);
                                }}
                              >
                                Edit
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Are you sure?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This action cannot be undone. This will
                                      permanently delete the withdrawal.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() =>
                                        handleDelete(withdrawal.id)
                                      }
                                    >
                                      Continue
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
          {withdrawals.length > 0 && (
            <div className="flex justify-center p-4 border-t border-gray-200">
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => onPageChange(page - 1)}
                  disabled={page === 1}
                  variant="outline"
                  className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50"
                >
                  Previous
                </Button>
                <span className="px-4 py-2 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg font-medium">
                  Page {page}
                </span>
                <Button
                  onClick={() => onPageChange(page + 1)}
                  disabled={withdrawals.length < itemsPerPage}
                  variant="outline"
                  className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50"
                >
                  Next
                </Button>
              </div>
>>>>>>> origin/main
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WithdrawalsTab;
