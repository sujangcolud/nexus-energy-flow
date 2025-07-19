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
import { extractErrorMessage, logError } from "@/utils/errorHandling";
import {
  TrendingUp,
  Calendar as CalendarIcon,
  CreditCard,
  PiggyBank,
  DollarSign,
  User,
  Sparkles,
  ArrowUpCircle,
  Wallet,
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
import { useIsMobile } from "@/hooks/use-mobile";
import MobileDateRange from "@/components/ui/mobile-date-range";
import MobileTable from "@/components/ui/mobile-table";
import MobileForm from "@/components/ui/mobile-form";

interface Deposit {
  id: string;
  amount: number;
  mode: string;
  deposited_by: string;
  deposit_date: string;
  remarks: string;
  sender_name: string;
  receiver_name: string;
  deposited_to: string;
  category: string;
}

interface Category {
  id: string;
  name: string;
  created_at: string;
}

const DepositsTab = () => {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    amount: "",
    mode: "",
    depositedBy: "",
    remarks: "",
    sender_name: "",
    receiver_name: "",
    deposited_to: "",
  });
  const [newCategory, setNewCategory] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { page, range, onPageChange, onRangeChange, itemsPerPage } =
    useTableControls();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null);
  const [canEditTransactions, setCanEditTransactions] = useState(false);
  const [canAddCategory, setCanAddCategory] = useState(false);
  const isMobile = useIsMobile();

  const depositModes = [
    "Cash",
    "Esewa",
    "Fonepay",
    "Bank Transfer",
    "Cheque",
    "Credit Card",
    "Mobile Banking",
    "Other",
  ];

  const depositedTo = ["Cash", "Esewa", "Fonepay", "Bank"];

  const modeColors = {
    Cash: "from-green-500 to-emerald-500",
    Esewa: "from-blue-500 to-cyan-500",
    Fonepay: "from-purple-500 to-pink-500",
    "Bank Transfer": "from-indigo-500 to-blue-500",
    Cheque: "from-orange-500 to-red-500",
    "Credit Card": "from-violet-500 to-purple-500",
    "Mobile Banking": "from-teal-500 to-cyan-500",
    Other: "from-gray-500 to-slate-500",
  };

  useEffect(() => {
    fetchDeposits();
    fetchCategories();
    const canEdit = localStorage.getItem("canEditTransactions");
    if (canEdit) {
      setCanEditTransactions(JSON.parse(canEdit));
    }
    const canAdd = localStorage.getItem("canAddDepositCategory");
    if (canAdd) {
      setCanAddCategory(JSON.parse(canAdd));
    }
  }, [user, page, range]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("deposit_categories")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      logError("fetching categories", error);
      toast.error(`Failed to load categories: ${extractErrorMessage(error)}`);
    }
  };

  const fetchDeposits = async () => {
    if (!user) return;

    setLoading(true);
    try {
      let query = supabase.from("deposits").select("*").eq("user_id", user.id);

      if (range?.from) {
        query = query.gte("deposit_date", format(range.from, "yyyy-MM-dd"));
      }
      if (range?.to) {
        query = query.lte("deposit_date", format(range.to, "yyyy-MM-dd"));
      }

      const { data, error } = await query
        .order("deposit_date", { ascending: false })
        .range((page - 1) * itemsPerPage, page * itemsPerPage - 1);

      if (error) throw error;

      setDeposits(data || []);
    } catch (error) {
      logError("fetching deposits", error);
      toast.error(`Failed to load deposits: ${extractErrorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Please log in to add deposits");
      return;
    }

    if (!formData.amount || !formData.mode || !formData.depositedBy) {
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

      switch (formData.mode) {
        case "Cash":
          newBalance.cash_in_hand += amount;
          break;
        case "Esewa":
          newBalance.esewa_balance += amount;
          break;
        case "Fonepay":
          newBalance.fonepay_balance += amount;
          break;
        case "Bank":
          newBalance.bank_balance += amount;
          break;
        default:
          break;
      }

      const { error: updateBalanceError } = await supabase
        .from("balances")
        .update(newBalance)
        .eq("id", balanceData.id);

      if (updateBalanceError) throw updateBalanceError;

      const { error } = await supabase.from("deposits").insert([
        {
          user_id: user.id,
          amount: parseFloat(formData.amount),
          mode: formData.mode,
          deposited_by: formData.depositedBy,
          remarks: formData.remarks || "",
          deposit_date: new Date().toISOString().split("T")[0],
          sender_name: formData.sender_name,
          receiver_name: formData.receiver_name,
          payment_mode: formData.mode,
          deposited_to: formData.deposited_to,
          category: "General",
        },
      ]);

      if (error) throw error;

      toast.success("Deposit added successfully!");
      setFormData({
        amount: "",
        mode: "",
        depositedBy: "",
        remarks: "",
        sender_name: "",
        receiver_name: "",
        deposited_to: "",
      });
      fetchDeposits();
    } catch (error) {
      logError("adding deposit", error);
      toast.error(`Failed to add deposit: ${extractErrorMessage(error)}`);
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
        .from("deposit_categories")
        .insert({ name: newCategory })
        .select();

      if (error) throw error;

      toast.success(`Category "${newCategory}" added successfully`);
      setNewCategory("");
      fetchCategories();
    } catch (error) {
      logError("adding category", error);
      toast.error(`Failed to add category: ${extractErrorMessage(error)}`);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      const { error } = await supabase
        .from("deposit_categories")
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

  const totalDeposits = deposits.reduce(
    (sum, deposit) => sum + deposit.amount,
    0,
  );
  const modeBreakdown = deposits.reduce(
    (acc, deposit) => {
      acc[deposit.mode] = (acc[deposit.mode] || 0) + deposit.amount;
      return acc;
    },
    {} as Record<string, number>,
  );

  const topMode = Object.entries(modeBreakdown).sort(
    ([, a], [, b]) => b - a,
  )[0];
  const averageDeposit =
    deposits.length > 0 ? totalDeposits / deposits.length : 0;

  const logAction = async (action: string, record_id: string, details: any) => {
    if (!user) return;
    await supabase.from("logs").insert({
      user_id: user.id,
      action,
      table_name: "deposits",
      record_id,
      details,
    });
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("deposits").delete().eq("id", id);

      if (error) throw error;

      toast.success("Deposit deleted successfully!");
      logAction("delete", id, { id });
      fetchDeposits();
    } catch (error) {
      logError("deleting deposit", error);
      toast.error(`Failed to delete deposit: ${extractErrorMessage(error)}`);
    }
  };

  const handleUpdate = async () => {
    if (!selectedDeposit) return;

    try {
      const { error } = await supabase
        .from("deposits")
        .update(selectedDeposit)
        .eq("id", selectedDeposit.id);

      if (error) throw error;

      toast.success("Deposit updated successfully!");
      logAction("update", selectedDeposit.id, selectedDeposit);
      setIsEditDialogOpen(false);
      fetchDeposits();
    } catch (error) {
      logError("updating deposit", error);
      toast.error(`Failed to update deposit: ${extractErrorMessage(error)}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 relative overflow-hidden">
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Deposit</DialogTitle>
          </DialogHeader>
          {selectedDeposit && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="editAmount">Amount</Label>
                <Input
                  id="editAmount"
                  value={selectedDeposit.amount}
                  onChange={(e) =>
                    setSelectedDeposit({
                      ...selectedDeposit,
                      amount: parseFloat(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="editMode">Mode</Label>
                <Input
                  id="editMode"
                  value={selectedDeposit.mode}
                  onChange={(e) =>
                    setSelectedDeposit({
                      ...selectedDeposit,
                      mode: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="editDepositedBy">Deposited By</Label>
                <Input
                  id="editDepositedBy"
                  value={selectedDeposit.deposited_by}
                  onChange={(e) =>
                    setSelectedDeposit({
                      ...selectedDeposit,
                      deposited_by: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="editRemarks">Remarks</Label>
                <Input
                  id="editRemarks"
                  value={selectedDeposit.remarks}
                  onChange={(e) =>
                    setSelectedDeposit({
                      ...selectedDeposit,
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
        <div className="absolute top-20 left-20 w-64 h-64 bg-gradient-to-r from-green-400/20 to-emerald-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute top-1/3 right-20 w-80 h-80 bg-gradient-to-r from-emerald-400/20 to-teal-500/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
        <div
          className="absolute bottom-20 left-1/4 w-72 h-72 bg-gradient-to-r from-teal-400/20 to-cyan-500/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>
      </div>

      <div className="relative z-10 space-y-8 p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-xl animate-pulse">
              <PiggyBank className="h-8 w-8" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Deposit Manager
            </h1>
            <Sparkles className="h-8 w-8 text-emerald-500 animate-bounce" />
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Track and manage all your financial deposits with comprehensive
            analytics
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">
                    Total Deposits
                  </p>
                  <p className="text-2xl font-bold text-green-800">
                    NRs. {totalDeposits.toFixed(2)}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl text-white">
                  <TrendingUp className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-emerald-600 font-medium">
                    Total Entries
                  </p>
                  <p className="text-2xl font-bold text-emerald-800">
                    {deposits.length}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl text-white">
                  <ArrowUpCircle className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-teal-50 to-cyan-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-teal-600 font-medium">
                    Average Deposit
                  </p>
                  <p className="text-2xl font-bold text-teal-800">
                    NRs. {averageDeposit.toFixed(2)}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-xl text-white">
                  <DollarSign className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-cyan-50 to-blue-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-cyan-600 font-medium">
                    Top Method
                  </p>
                  <p className="text-lg font-bold text-cyan-800 truncate">
                    {topMode ? topMode[0] : "None"}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl text-white">
                  <Wallet className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Add Deposit Form */}
          <MobileForm
            title="Record New Deposit"
            icon={<ArrowUpCircle />}
            onSubmit={handleSubmit}
            submitText="Record Deposit"
            isSubmitting={isSubmitting}
            submitIcon={<ArrowUpCircle className="h-5 w-5" />}
            className="bg-gradient-to-br from-white/90 to-green-50/90 backdrop-blur-sm hover:shadow-3xl transition-all duration-300"
          >
            <div className="space-y-2">
              <Label
                htmlFor="amount"
                className="text-sm font-medium text-gray-700 flex items-center gap-2"
              >
                <DollarSign className="h-4 w-4 text-green-600" />
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
                className="border-green-200 focus:border-green-500 focus:ring-green-500 h-12 text-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="mode"
                  className="text-sm font-medium text-gray-700 flex items-center gap-2"
                >
                  <CreditCard className="h-4 w-4 text-blue-600" />
                  Deposit Mode *
                </Label>
                <Select
                  value={formData.mode}
                  onValueChange={(value) =>
                    setFormData({ ...formData, mode: value })
                  }
                  required
                >
                  <SelectTrigger className="border-blue-200 focus:border-blue-500 focus:ring-blue-500 h-12">
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {depositModes.map((mode) => (
                      <SelectItem key={mode} value={mode}>
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-3 h-3 rounded-full bg-gradient-to-r ${modeColors[mode as keyof typeof modeColors]}`}
                          ></div>
                          {mode}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="depositedBy"
                  className="text-sm font-medium text-gray-700 flex items-center gap-2"
                >
                  <User className="h-4 w-4 text-purple-600" />
                  Deposited By *
                </Label>
                <Input
                  id="depositedBy"
                  value={formData.depositedBy}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      depositedBy: e.target.value,
                    })
                  }
                  placeholder="Enter depositor name"
                  required
                  className="border-purple-200 focus:border-purple-500 focus:ring-purple-500 h-12"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="deposited_to"
                className="text-sm font-medium text-gray-700"
              >
                Deposited To *
              </Label>
              <Select
                value={formData.deposited_to}
                onValueChange={(value) =>
                  setFormData({ ...formData, deposited_to: value })
                }
                required
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select where to deposit" />
                </SelectTrigger>
                <SelectContent>
                  {depositedTo.map((mode) => (
                    <SelectItem key={mode} value={mode}>
                      {mode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.mode === "Esewa" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="senderName"
                    className="text-sm font-medium text-gray-700"
                  >
                    Sender Name
                  </Label>
                  <Input
                    id="senderName"
                    value={formData.sender_name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sender_name: e.target.value,
                      })
                    }
                    placeholder="Enter sender name"
                    className="border-gray-200 focus:border-gray-500 focus:ring-gray-500 h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="receiverName"
                    className="text-sm font-medium text-gray-700"
                  >
                    Receiver Name
                  </Label>
                  <Input
                    id="receiverName"
                    value={formData.receiver_name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        receiver_name: e.target.value,
                      })
                    }
                    placeholder="Enter receiver name"
                    className="border-gray-200 focus:border-gray-500 focus:ring-gray-500 h-12"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label
                htmlFor="remarks"
                className="text-sm font-medium text-gray-700"
              >
                Remarks (Optional)
              </Label>
              <Textarea
                id="remarks"
                value={formData.remarks}
                onChange={(e) =>
                  setFormData({ ...formData, remarks: e.target.value })
                }
                placeholder="Additional notes or reference information"
                rows={3}
                className="border-gray-200 focus:border-gray-500 focus:ring-gray-500"
              />
            </div>
          </MobileForm>

          {/* Deposit Mode Breakdown */}
          <Card className="bg-gradient-to-br from-white/90 to-teal-50/90 backdrop-blur-sm border-0 shadow-2xl hover:shadow-3xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Wallet className="h-6 w-6" />
                </div>
                Deposit Methods
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {Object.keys(modeBreakdown).length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500 text-lg font-medium">
                    No deposits yet
                  </p>
                  <p className="text-gray-400">
                    Record your first deposit to see method breakdown!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(modeBreakdown)
                    .sort(([, a], [, b]) => b - a)
                    .map(([mode, amount], index) => {
                      const percentage = (amount / totalDeposits) * 100;
                      return (
                        <div
                          key={mode}
                          className="p-4 bg-gradient-to-r from-white to-teal-50 rounded-lg border border-teal-100 hover:shadow-md transition-all duration-200"
                          style={{ animationDelay: `${index * 100}ms` }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-4 h-4 rounded-full bg-gradient-to-r ${modeColors[mode as keyof typeof modeColors]}`}
                              ></div>
                              <span className="font-medium text-gray-800">
                                {mode}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-teal-600">
                                NRs. {amount.toFixed(2)}
                              </span>
                              <div className="text-sm text-gray-500">
                                {percentage.toFixed(1)}%
                              </div>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`bg-gradient-to-r ${modeColors[mode as keyof typeof modeColors]} h-2 rounded-full transition-all duration-500`}
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
                    <CreditCard className="h-6 w-6" />
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

        {/* Deposit History */}
        <Card className="bg-gradient-to-br from-white/90 to-gray-50/90 backdrop-blur-sm border-0 shadow-2xl">
          <CardHeader className="border-b border-gray-200/50 flex flex-row items-center justify-between">
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent">
              Deposit History
            </CardTitle>
            <div className="flex items-center gap-2">
              <MobileDateRange
                range={range}
                onRangeChange={onRangeChange}
                className={isMobile ? "w-full" : "w-[300px]"}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-10">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full animate-spin mx-auto flex items-center justify-center mb-4">
                  <PiggyBank className="h-8 w-8 text-white" />
                </div>
                <p className="text-gray-600">Loading deposits...</p>
              </div>
            ) : deposits.length === 0 ? (
              <div className="text-center py-12">
                <PiggyBank className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <p className="text-xl font-semibold text-gray-700 mb-2">
                  No deposits found
                </p>
                <p className="text-gray-500">
                  Start recording your deposits to see them here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-gray-50 to-teal-50">
                      <TableHead className="font-semibold text-gray-700">
                        Date
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        Amount
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        Mode
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        Deposited By
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        Sender
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        Receiver
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        Deposited To
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
                      <TableCell colSpan={8} className="font-bold">
                        NRs. {totalDeposits.toFixed(2)}
                      </TableCell>
                    </TableRow>
                    {deposits.map((deposit, index) => (
                      <TableRow
                        key={deposit.id}
                        className="hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-all duration-200"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <TableCell className="font-medium">
                          {format(
                            new Date(deposit.deposit_date),
                            "MMM dd, yyyy",
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="font-bold text-xl bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                            NRs. {deposit.amount.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`bg-gradient-to-r ${modeColors[deposit.mode as keyof typeof modeColors]} text-white border-0`}
                          >
                            {deposit.mode}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-gray-800">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-500" />
                            {deposit.deposited_by}
                          </div>
                        </TableCell>
                        <TableCell>{deposit.sender_name || "-"}</TableCell>
                        <TableCell>{deposit.receiver_name || "-"}</TableCell>
                        <TableCell>{deposit.deposited_to || "-"}</TableCell>
                        <TableCell className="max-w-xs">
                          <span
                            className="text-sm text-gray-600 truncate"
                            title={deposit.remarks}
                          >
                            {deposit.remarks || "-"}
                          </span>
                        </TableCell>
                        <TableCell>
                          {canEditTransactions && (
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedDeposit(deposit);
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
                                      permanently delete the deposit.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(deposit.id)}
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
          {deposits.length > 0 && (
            <div className="flex justify-center p-4 border-t border-gray-200">
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => onPageChange(page - 1)}
                  disabled={page === 1}
                  variant="outline"
                  className="hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50"
                >
                  Previous
                </Button>
                <span className="px-4 py-2 bg-gradient-to-r from-teal-50 to-emerald-50 rounded-lg font-medium">
                  Page {page}
                </span>
                <Button
                  onClick={() => onPageChange(page + 1)}
                  disabled={deposits.length < itemsPerPage}
                  variant="outline"
                  className="hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50"
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

export default DepositsTab;
