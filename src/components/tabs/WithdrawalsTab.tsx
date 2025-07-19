import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { toast } from "sonner";
import TransactionDatePicker from "@/components/ui/transaction-date-picker";
import { format } from "date-fns";
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
  ArrowDownCircle,
  Banknote,
  DollarSign,
  User,
  FileText,
  Sparkles,
  Target,
  Hash,
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
  purpose: string;
  recipient: string | null;
  reference_number: string | null;
  remarks: string | null;
  withdrawal_date: string;
  payment_mode: string;
  category: string;
}

interface Category {
  id: string;
  name: string;
  created_at: string;
}

const WithdrawalsTab = () => {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    amount: "",
    purpose: "",
    recipient: "",
    referenceNumber: "",
    remarks: "",
    payment_mode: "",
  });
  const [newCategory, setNewCategory] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transactionDate, setTransactionDate] = useState(
    format(new Date(), "yyyy-MM-dd"),
  );
  const { user } = useAuth();
  const { page, range, onPageChange, onRangeChange, itemsPerPage } =
    useTableControls();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] =
    useState<Withdrawal | null>(null);
  const [canEditTransactions, setCanEditTransactions] = useState(false);
  const [canAddCategory, setCanAddCategory] = useState(false);

  const commonPurposes = [
    "Salary Payment",
    "Vendor Payment",
    "Utility Bills",
    "Office Rent",
    "Equipment Purchase",
    "Marketing Expenses",
    "Travel Expenses",
    "Maintenance",
    "Emergency Fund",
    "Other",
  ];

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
    fetchCategories();
    const canEdit = localStorage.getItem("canEditTransactions");
    if (canEdit) {
      setCanEditTransactions(JSON.parse(canEdit));
    }
    const canAdd = localStorage.getItem("canAddWithdrawalCategory");
    if (canAdd) {
      setCanAddCategory(JSON.parse(canAdd));
    }
  }, [user, page, range]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("withdrawal_categories")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.error("Failed to load categories");
    }
  };

  const fetchWithdrawals = async () => {
    if (!user) return;

    setLoading(true);
    try {
      let query = supabase
        .from("withdrawals")
        .select("*")
        .eq("user_id", user.id);

      if (range?.from) {
        query = query.gte("withdrawal_date", format(range.from, "yyyy-MM-dd"));
      }
      if (range?.to) {
        query = query.lte("withdrawal_date", format(range.to, "yyyy-MM-dd"));
      }

      const { data, error } = await query
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Please log in to record withdrawals");
      return;
    }

    if (!formData.amount || !formData.purpose || !formData.payment_mode) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
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
          withdrawal_date: transactionDate,
          payment_mode: formData.payment_mode,
          category: "General",
        },
      ]);

      if (error) throw error;

      toast.success("Withdrawal recorded successfully!");
      setFormData({
        amount: "",
        purpose: "",
        recipient: "",
        referenceNumber: "",
        remarks: "",
        payment_mode: "",
      });
      fetchWithdrawals();
    } catch (error) {
      console.error("Error recording withdrawal:", error);
      toast.error("Failed to record withdrawal");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory) {
      toast.error("Please enter a category name");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("withdrawal_categories")
        .insert({ name: newCategory })
        .select();

      if (error) throw error;

      toast.success(`Category "${newCategory}" added successfully`);
      setNewCategory("");
      fetchCategories();
    } catch (error) {
      console.error("Error adding category:", error);
      toast.error("Failed to add category");
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      const { error } = await supabase
        .from("withdrawal_categories")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Category deleted successfully");
      fetchCategories();
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error("Failed to delete category");
    }
  };

  const totalWithdrawals = withdrawals.reduce(
    (sum, withdrawal) => sum + withdrawal.amount,
    0,
  );
  const purposeBreakdown = withdrawals.reduce(
    (acc, withdrawal) => {
      acc[withdrawal.purpose] =
        (acc[withdrawal.purpose] || 0) + withdrawal.amount;
      return acc;
    },
    {} as Record<string, number>,
  );

  const topPurpose = Object.entries(purposeBreakdown).sort(
    ([, a], [, b]) => b - a,
  )[0];
  const averageWithdrawal =
    withdrawals.length > 0 ? totalWithdrawals / withdrawals.length : 0;

  const logAction = async (action: string, record_id: string, details: any) => {
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
      </div>

      <div className="relative z-10 space-y-8 p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-xl animate-pulse">
              <Banknote className="h-8 w-8" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Withdrawal Manager
            </h1>
            <Sparkles className="h-8 w-8 text-indigo-500 animate-bounce" />
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Track and manage cash withdrawals with detailed purpose tracking and
            analytics
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">
                    Total Withdrawals
                  </p>
                  <p className="text-2xl font-bold text-blue-800">
                    NRs. {totalWithdrawals.toFixed(2)}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl text-white">
                  <TrendingDown className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-indigo-600 font-medium">
                    Total Entries
                  </p>
                  <p className="text-2xl font-bold text-indigo-800">
                    {withdrawals.length}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl text-white">
                  <ArrowDownCircle className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 font-medium">
                    Average Amount
                  </p>
                  <p className="text-2xl font-bold text-purple-800">
                    NRs. {averageWithdrawal.toFixed(2)}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white">
                  <DollarSign className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-pink-50 to-red-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-pink-600 font-medium">
                    Top Purpose
                  </p>
                  <p className="text-lg font-bold text-pink-800 truncate">
                    {topPurpose ? topPurpose[0] : "None"}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-pink-500 to-red-500 rounded-xl text-white">
                  <Target className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Add Withdrawal Form */}
          <Card className="bg-gradient-to-br from-white/90 to-blue-50/90 backdrop-blur-sm border-0 shadow-2xl hover:shadow-3xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-white/20 rounded-lg">
                  <ArrowDownCircle className="h-6 w-6" />
                </div>
                Record New Withdrawal
                <Sparkles className="h-5 w-5 animate-pulse" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="amount"
                    className="text-sm font-medium text-gray-700 flex items-center gap-2"
                  >
                    <DollarSign className="h-4 w-4 text-blue-600" />
                    Amount (NRs.) *
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    placeholder="0.00"
                    required
                    className="border-blue-200 focus:border-blue-500 focus:ring-blue-500 h-12 text-lg"
                  />
                </div>

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

                {/* Transaction Date */}
                <TransactionDatePicker
                  selectedDate={transactionDate}
                  onDateChange={setTransactionDate}
                  label="Withdrawal Date"
                  className="mb-4"
                />

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 hover:from-blue-600 hover:via-indigo-600 hover:to-purple-600 text-white font-semibold shadow-lg transition-all duration-300 transform hover:scale-105"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      Recording Withdrawal...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <ArrowDownCircle className="h-5 w-5" />
                      Record Withdrawal
                    </div>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Purpose Breakdown */}
          <Card className="bg-gradient-to-br from-white/90 to-purple-50/90 backdrop-blur-sm border-0 shadow-2xl hover:shadow-3xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Target className="h-6 w-6" />
                </div>
                Purpose Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {Object.keys(purposeBreakdown).length === 0 ? (
                <div className="text-center py-8">
                  <Target className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500 text-lg font-medium">
                    No withdrawals yet
                  </p>
                  <p className="text-gray-400">
                    Record your first withdrawal to see purpose breakdown!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(purposeBreakdown)
                    .sort(([, a], [, b]) => b - a)
                    .map(([purpose, amount], index) => {
                      const percentage = (amount / totalWithdrawals) * 100;
                      return (
                        <div
                          key={purpose}
                          className="p-4 bg-gradient-to-r from-white to-purple-50 rounded-lg border border-purple-100 hover:shadow-md transition-all duration-200"
                          style={{ animationDelay: `${index * 100}ms` }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-4 h-4 rounded-full bg-gradient-to-r ${purposeColors[purpose as keyof typeof purposeColors] || "from-gray-500 to-slate-500"}`}
                              ></div>
                              <span className="font-medium text-gray-800">
                                {purpose}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-purple-600">
                                NRs. {amount.toFixed(2)}
                              </span>
                              <div className="text-sm text-gray-500">
                                {percentage.toFixed(1)}%
                              </div>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`bg-gradient-to-r ${purposeColors[purpose as keyof typeof purposeColors] || "from-gray-500 to-slate-500"} h-2 rounded-full transition-all duration-500`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {canAddCategory && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Manage Categories */}
            <Card className="bg-gradient-to-br from-white/90 to-red-50/90 backdrop-blur-sm border-0 shadow-2xl hover:shadow-3xl transition-all duration-300">
              <CardHeader className="bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Banknote className="h-6 w-6" />
                  </div>
                  Manage Categories
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleAddCategory} className="space-y-4">
                  <Input
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Enter new category"
                    className="h-12"
                  />
                  <Button
                    type="submit"
                    className="w-full h-12 bg-gradient-to-r from-red-500 to-pink-500 text-white"
                  >
                    Add Category
                  </Button>
                </form>
                <div className="mt-6 space-y-2">
                  {categories.map((cat) => (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm"
                    >
                      <span className="font-medium">{cat.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCategory(cat.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Withdrawal History */}
        <Card className="bg-gradient-to-br from-white/90 to-gray-50/90 backdrop-blur-sm border-0 shadow-2xl">
          <CardHeader className="border-b border-gray-200/50 flex flex-row items-center justify-between">
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent">
              Withdrawal History
            </CardTitle>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[300px] justify-start text-left font-normal hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50",
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
                <PopoverContent className="w-auto p-0" align="end">
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
                                    <AlertDialogCancel>
                                      Cancel
                                    </AlertDialogCancel>
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
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default WithdrawalsTab;
