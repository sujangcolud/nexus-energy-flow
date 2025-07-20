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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { extractErrorMessage, logError } from "@/utils/errorHandling";
import TransactionDatePicker from "@/components/ui/transaction-date-picker";
import { format } from "date-fns";
import {
  PiggyBank,
  Calendar as CalendarIcon,
  Users,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Plus,
  Sparkles,
  Target,
  Clock,
  Coins,
  Trash2,
  ArrowUpCircle,
  ArrowDownCircle,
  Banknote,
  CreditCard,
  Building2,
  Smartphone,
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
import { cn } from "@/lib/utils";
import useTableControls from "@/hooks/useTableControls";

interface Saving {
  id: string;
  contribution_amount: number;
  member_id: string;
  cycle_period: string | null;
  contribution_date: string;
  payment_mode: string;
  user_id: string;
  created_at: string;
}

interface Withdrawal {
  id: string;
  amount: number;
  purpose: string;
  recipient: string | null;
  reference_number: string | null;
  remarks: string | null;
  withdrawal_date: string;
  payment_mode: string;
  withdrawal_from: string;
  user_id: string;
  created_at: string;
}

const SavingsWithdrawalsTab = () => {
  const [savings, setSavings] = useState<Saving[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingsFormData, setSavingsFormData] = useState({
    contributionAmount: "",
    memberId: "",
    cyclePeriod: "",
    paymentMode: "",
    remarks: "",
  });
  const [withdrawalsFormData, setWithdrawalsFormData] = useState({
    amount: "",
    purpose: "",
    recipient: "",
    referenceNumber: "",
    paymentMode: "",
    withdrawalFrom: "",
    remarks: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transactionDate, setTransactionDate] = useState(
    format(new Date(), "yyyy-MM-dd"),
  );
  const { user } = useAuth();
  const { page, range, onPageChange, onRangeChange, itemsPerPage } =
    useTableControls();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Saving | Withdrawal | null>(
    null,
  );
  const [editType, setEditType] = useState<"saving" | "withdrawal">("saving");
  const [canEditTransactions, setCanEditTransactions] = useState(false);

  const cyclePeriods = [
    "Weekly",
    "Bi-weekly",
    "Monthly",
    "Quarterly",
    "Semi-Annual",
    "Annual",
    "One-time",
  ];

  const paymentModes = ["Cash", "Esewa", "Fonepay"];

  const withdrawalSources = ["Esewa", "Bank", "Cooperative"];

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

  const periodColors = {
    Weekly: "from-green-500 to-emerald-500",
    "Bi-weekly": "from-blue-500 to-cyan-500",
    Monthly: "from-purple-500 to-pink-500",
    Quarterly: "from-orange-500 to-red-500",
    "Semi-Annual": "from-indigo-500 to-blue-500",
    Annual: "from-violet-500 to-purple-500",
    "One-time": "from-gray-500 to-slate-500",
  };

  const paymentModeColors = {
    Cash: "from-green-500 to-emerald-500",
    Esewa: "from-blue-500 to-cyan-500",
    Fonepay: "from-purple-500 to-pink-500",
  };

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
    fetchSavings();
    fetchWithdrawals();
    const canEdit = localStorage.getItem("canEditTransactions");
    if (canEdit) {
      setCanEditTransactions(JSON.parse(canEdit));
    }
  }, [user, page, range]);

  const fetchSavings = async () => {
    if (!user) return;

    setLoading(true);
    try {
      let query = supabase
        .from("cooperative_savings")
        .select("*")
        .eq("user_id", user.id);

      if (range?.from) {
        query = query.gte(
          "contribution_date",
          format(range.from, "yyyy-MM-dd"),
        );
      }
      if (range?.to) {
        query = query.lte("contribution_date", format(range.to, "yyyy-MM-dd"));
      }

      const { data, error } = await query
        .order("contribution_date", { ascending: false })
        .range((page - 1) * itemsPerPage, page * itemsPerPage - 1);

      if (error) throw error;

      setSavings(data || []);
    } catch (error) {
      logError("fetching cooperative savings", error);
      toast.error(
        `Error loading cooperative savings: ${extractErrorMessage(error)}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchWithdrawals = async () => {
    if (!user) return;

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
      logError("fetching withdrawals", error);
      toast.error(`Error loading withdrawals: ${extractErrorMessage(error)}`);
    }
  };

  const handleSavingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Please log in to record savings");
      return;
    }

    if (
      !savingsFormData.contributionAmount ||
      !savingsFormData.memberId ||
      !savingsFormData.cyclePeriod ||
      !savingsFormData.paymentMode
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("cooperative_savings").insert([
        {
          user_id: user.id,
          contribution_amount: parseFloat(savingsFormData.contributionAmount),
          member_id: savingsFormData.memberId,
          cycle_period: savingsFormData.cyclePeriod,
          payment_mode: savingsFormData.paymentMode,
          contribution_date: transactionDate,
        },
      ]);

      if (error) throw error;

      toast.success("Cooperative saving recorded successfully!");
      setSavingsFormData({
        contributionAmount: "",
        memberId: "",
        cyclePeriod: "",
        paymentMode: "",
        remarks: "",
      });
      fetchSavings();
    } catch (error) {
      logError("recording cooperative saving", error);
      toast.error(
        `Error recording cooperative saving: ${extractErrorMessage(error)}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdrawalsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Please log in to record withdrawals");
      return;
    }

    if (
      !withdrawalsFormData.amount ||
      !withdrawalsFormData.purpose ||
      !withdrawalsFormData.paymentMode ||
      !withdrawalsFormData.withdrawalFrom
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("withdrawals").insert([
        {
          user_id: user.id,
          amount: parseFloat(withdrawalsFormData.amount),
          purpose: withdrawalsFormData.purpose,
          recipient: withdrawalsFormData.recipient || null,
          reference_number: withdrawalsFormData.referenceNumber || null,
          payment_mode: withdrawalsFormData.paymentMode,
          withdrawal_from: withdrawalsFormData.withdrawalFrom,
          remarks: withdrawalsFormData.remarks || null,
          withdrawal_date: transactionDate,
        },
      ]);

      if (error) throw error;

      toast.success("Withdrawal recorded successfully!");
      setWithdrawalsFormData({
        amount: "",
        purpose: "",
        recipient: "",
        referenceNumber: "",
        paymentMode: "",
        withdrawalFrom: "",
        remarks: "",
      });
      fetchWithdrawals();
    } catch (error) {
      logError("recording withdrawal", error);
      toast.error(`Error recording withdrawal: ${extractErrorMessage(error)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalSavings = savings.reduce(
    (sum, saving) => sum + saving.contribution_amount,
    0,
  );

  const totalWithdrawals = withdrawals.reduce(
    (sum, withdrawal) => sum + withdrawal.amount,
    0,
  );

  const savingsPaymentBreakdown = savings.reduce(
    (acc, saving) => {
      const mode = saving.payment_mode || "Cash";
      acc[mode] = (acc[mode] || 0) + saving.contribution_amount;
      return acc;
    },
    {} as Record<string, number>,
  );

  const withdrawalsPaymentBreakdown = withdrawals.reduce(
    (acc, withdrawal) => {
      const mode = withdrawal.payment_mode || "Cash";
      acc[mode] = (acc[mode] || 0) + withdrawal.amount;
      return acc;
    },
    {} as Record<string, number>,
  );

  const logAction = async (
    action: string,
    record_id: string,
    details: any,
    table: string,
  ) => {
    if (!user) return;
    await supabase.from("logs").insert({
      user_id: user.id,
      action,
      table_name: table,
      record_id,
      details,
    });
  };

  const handleDelete = async (id: string, type: "saving" | "withdrawal") => {
    try {
      const table = type === "saving" ? "cooperative_savings" : "withdrawals";
      const { error } = await supabase.from(table).delete().eq("id", id);

      if (error) throw error;

      toast.success(
        `${type === "saving" ? "Saving" : "Withdrawal"} deleted successfully!`,
      );
      logAction("delete", id, { id }, table);

      if (type === "saving") {
        fetchSavings();
      } else {
        fetchWithdrawals();
      }
    } catch (error) {
      logError(`deleting ${type}`, error);
      toast.error(`Error deleting ${type}: ${extractErrorMessage(error)}`);
    }
  };

  const handleUpdate = async () => {
    if (!selectedItem) return;

    try {
      const table =
        editType === "saving" ? "cooperative_savings" : "withdrawals";
      const { error } = await supabase
        .from(table)
        .update(selectedItem)
        .eq("id", selectedItem.id);

      if (error) throw error;

      toast.success(
        `${editType === "saving" ? "Saving" : "Withdrawal"} updated successfully!`,
      );
      logAction("update", selectedItem.id, selectedItem, table);
      setIsEditDialogOpen(false);

      if (editType === "saving") {
        fetchSavings();
      } else {
        fetchWithdrawals();
      }
    } catch (error) {
      logError(`updating ${editType}`, error);
      toast.error(`Error updating ${editType}: ${extractErrorMessage(error)}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 relative overflow-hidden">
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Edit {editType === "saving" ? "Saving" : "Withdrawal"}
            </DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              {editType === "saving" ? (
                <>
                  <div>
                    <Label htmlFor="editContributionAmount">
                      Contribution Amount
                    </Label>
                    <Input
                      id="editContributionAmount"
                      type="number"
                      value={(selectedItem as Saving).contribution_amount}
                      onChange={(e) =>
                        setSelectedItem({
                          ...selectedItem,
                          contribution_amount: parseFloat(e.target.value),
                        } as Saving)
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="editMemberId">Member ID</Label>
                    <Input
                      id="editMemberId"
                      value={(selectedItem as Saving).member_id}
                      onChange={(e) =>
                        setSelectedItem({
                          ...selectedItem,
                          member_id: e.target.value,
                        } as Saving)
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="editPaymentMode">Payment Mode</Label>
                    <Select
                      value={(selectedItem as Saving).payment_mode || ""}
                      onValueChange={(value) =>
                        setSelectedItem({
                          ...selectedItem,
                          payment_mode: value,
                        } as Saving)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
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
                </>
              ) : (
                <>
                  <div>
                    <Label htmlFor="editAmount">Amount</Label>
                    <Input
                      id="editAmount"
                      type="number"
                      value={(selectedItem as Withdrawal).amount}
                      onChange={(e) =>
                        setSelectedItem({
                          ...selectedItem,
                          amount: parseFloat(e.target.value),
                        } as Withdrawal)
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="editPurpose">Purpose</Label>
                    <Input
                      id="editPurpose"
                      value={(selectedItem as Withdrawal).purpose}
                      onChange={(e) =>
                        setSelectedItem({
                          ...selectedItem,
                          purpose: e.target.value,
                        } as Withdrawal)
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="editPaymentMode">Payment Mode</Label>
                    <Select
                      value={(selectedItem as Withdrawal).payment_mode || ""}
                      onValueChange={(value) =>
                        setSelectedItem({
                          ...selectedItem,
                          payment_mode: value,
                        } as Withdrawal)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
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
                  <div>
                    <Label htmlFor="editWithdrawalFrom">Withdrawal From</Label>
                    <Select
                      value={(selectedItem as Withdrawal).withdrawal_from || ""}
                      onValueChange={(value) =>
                        setSelectedItem({
                          ...selectedItem,
                          withdrawal_from: value,
                        } as Withdrawal)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {withdrawalSources.map((source) => (
                          <SelectItem key={source} value={source}>
                            {source}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={handleUpdate}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-64 h-64 bg-gradient-to-r from-teal-400/20 to-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute top-1/3 right-20 w-80 h-80 bg-gradient-to-r from-cyan-400/20 to-blue-500/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
        <div
          className="absolute bottom-20 left-1/4 w-72 h-72 bg-gradient-to-r from-blue-400/20 to-indigo-500/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>
      </div>

      <div className="relative z-10 space-y-8 p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-xl animate-pulse">
              <PiggyBank className="h-8 w-8" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 bg-clip-text text-transparent">
              Savings & Withdrawals
            </h1>
            <Sparkles className="h-8 w-8 text-cyan-500 animate-bounce" />
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Comprehensive management of cooperative savings and withdrawals with
            payment mode tracking
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-teal-50 to-cyan-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-teal-600 font-medium">
                    Total Savings
                  </p>
                  <p className="text-2xl font-bold text-teal-800">
                    NRs. {totalSavings.toFixed(2)}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-xl text-white">
                  <ArrowUpCircle className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-pink-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600 font-medium">
                    Total Withdrawals
                  </p>
                  <p className="text-2xl font-bold text-red-800">
                    NRs. {totalWithdrawals.toFixed(2)}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl text-white">
                  <ArrowDownCircle className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">
                    Net Position
                  </p>
                  <p className="text-2xl font-bold text-green-800">
                    NRs. {(totalSavings - totalWithdrawals).toFixed(2)}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl text-white">
                  <PiggyBank className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 font-medium">
                    Total Transactions
                  </p>
                  <p className="text-2xl font-bold text-purple-800">
                    {savings.length + withdrawals.length}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl text-white">
                  <Target className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="savings" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="savings" className="flex items-center gap-2">
              <ArrowUpCircle className="h-4 w-4" />
              Savings
            </TabsTrigger>
            <TabsTrigger
              value="withdrawals"
              className="flex items-center gap-2"
            >
              <ArrowDownCircle className="h-4 w-4" />
              Withdrawals
            </TabsTrigger>
          </TabsList>

          <TabsContent value="savings" className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Add Savings Form */}
              <Card className="bg-gradient-to-br from-white/90 to-teal-50/90 backdrop-blur-sm border-0 shadow-2xl hover:shadow-3xl transition-all duration-300">
                <CardHeader className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <Plus className="h-6 w-6" />
                    </div>
                    Record New Savings
                    <Sparkles className="h-5 w-5 animate-pulse" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <form onSubmit={handleSavingsSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label
                        htmlFor="contributionAmount"
                        className="text-sm font-medium text-gray-700 flex items-center gap-2"
                      >
                        <DollarSign className="h-4 w-4 text-teal-600" />
                        Contribution Amount (NRs.) *
                      </Label>
                      <Input
                        id="contributionAmount"
                        type="number"
                        step="0.01"
                        value={savingsFormData.contributionAmount}
                        onChange={(e) =>
                          setSavingsFormData({
                            ...savingsFormData,
                            contributionAmount: e.target.value,
                          })
                        }
                        placeholder="0.00"
                        required
                        className="border-teal-200 focus:border-teal-500 focus:ring-teal-500 h-12 text-lg"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label
                          htmlFor="memberId"
                          className="text-sm font-medium text-gray-700 flex items-center gap-2"
                        >
                          <Users className="h-4 w-4 text-blue-600" />
                          Member ID *
                        </Label>
                        <Select
                          value={savingsFormData.memberId}
                          onValueChange={(value) =>
                            setSavingsFormData({
                              ...savingsFormData,
                              memberId: value,
                            })
                          }
                          required
                        >
                          <SelectTrigger className="border-blue-200 focus:border-blue-500 focus:ring-blue-500 h-12">
                            <SelectValue placeholder="Select member ID" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="DF1">DF1</SelectItem>
                            <SelectItem value="SF1">SF1</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="cyclePeriod"
                          className="text-sm font-medium text-gray-700 flex items-center gap-2"
                        >
                          <Clock className="h-4 w-4 text-purple-600" />
                          Cycle Period *
                        </Label>
                        <Select
                          value={savingsFormData.cyclePeriod}
                          onValueChange={(value) =>
                            setSavingsFormData({
                              ...savingsFormData,
                              cyclePeriod: value,
                            })
                          }
                          required
                        >
                          <SelectTrigger className="border-purple-200 focus:border-purple-500 focus:ring-purple-500 h-12">
                            <SelectValue placeholder="Select period" />
                          </SelectTrigger>
                          <SelectContent>
                            {cyclePeriods.map((period) => (
                              <SelectItem key={period} value={period}>
                                {period}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="paymentMode"
                        className="text-sm font-medium text-gray-700 flex items-center gap-2"
                      >
                        <CreditCard className="h-4 w-4 text-green-600" />
                        Payment Mode *
                      </Label>
                      <Select
                        value={savingsFormData.paymentMode}
                        onValueChange={(value) =>
                          setSavingsFormData({
                            ...savingsFormData,
                            paymentMode: value,
                          })
                        }
                        required
                      >
                        <SelectTrigger className="border-green-200 focus:border-green-500 focus:ring-green-500 h-12">
                          <SelectValue placeholder="Select payment mode" />
                        </SelectTrigger>
                        <SelectContent>
                          {paymentModes.map((mode) => (
                            <SelectItem key={mode} value={mode}>
                              <div className="flex items-center gap-2">
                                {mode === "Cash" && (
                                  <Banknote className="h-4 w-4" />
                                )}
                                {mode === "Esewa" && (
                                  <Smartphone className="h-4 w-4" />
                                )}
                                {mode === "Fonepay" && (
                                  <CreditCard className="h-4 w-4" />
                                )}
                                {mode}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Transaction Date */}
                    <TransactionDatePicker
                      selectedDate={transactionDate}
                      onDateChange={setTransactionDate}
                      label="Contribution Date"
                      className="mb-4"
                    />

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-12 bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500 hover:from-teal-600 hover:via-cyan-600 hover:to-blue-600 text-white font-semibold shadow-lg transition-all duration-300 transform hover:scale-105"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                          Recording Savings...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Coins className="h-5 w-5" />
                          Record Savings
                        </div>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Savings Payment Mode Breakdown */}
              <Card className="bg-gradient-to-br from-white/90 to-blue-50/90 backdrop-blur-sm border-0 shadow-2xl hover:shadow-3xl transition-all duration-300">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <CreditCard className="h-6 w-6" />
                    </div>
                    Savings by Payment Mode
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {Object.keys(savingsPaymentBreakdown).length === 0 ? (
                    <div className="text-center py-8">
                      <CreditCard className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-500 text-lg font-medium">
                        No savings yet
                      </p>
                      <p className="text-gray-400">
                        Record your first savings to see breakdown!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(savingsPaymentBreakdown)
                        .sort(([, a], [, b]) => b - a)
                        .map(([mode, amount], index) => {
                          const percentage = (amount / totalSavings) * 100;
                          return (
                            <div
                              key={mode}
                              className="p-4 bg-gradient-to-r from-white to-blue-50 rounded-lg border border-blue-100 hover:shadow-md transition-all duration-200"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`w-4 h-4 rounded-full bg-gradient-to-r ${paymentModeColors[mode as keyof typeof paymentModeColors] || "from-gray-500 to-slate-500"}`}
                                  ></div>
                                  <span className="font-medium text-gray-800">
                                    {mode}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <span className="font-bold text-blue-600">
                                    NRs. {amount.toFixed(2)}
                                  </span>
                                  <div className="text-sm text-gray-500">
                                    {percentage.toFixed(1)}%
                                  </div>
                                </div>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className={`bg-gradient-to-r ${paymentModeColors[mode as keyof typeof paymentModeColors] || "from-gray-500 to-slate-500"} h-2 rounded-full transition-all duration-500`}
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

            {/* Savings History */}
            <Card className="bg-gradient-to-br from-white/90 to-gray-50/90 backdrop-blur-sm border-0 shadow-2xl">
              <CardHeader className="border-b border-gray-200/50 flex flex-row items-center justify-between">
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent">
                  Savings History
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-[300px] justify-start text-left font-normal hover:bg-gradient-to-r hover:from-teal-50 hover:to-blue-50",
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
                    <div className="w-16 h-16 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full animate-spin mx-auto flex items-center justify-center mb-4">
                      <PiggyBank className="h-8 w-8 text-white" />
                    </div>
                    <p className="text-gray-600">Loading savings...</p>
                  </div>
                ) : savings.length === 0 ? (
                  <div className="text-center py-12">
                    <PiggyBank className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-xl font-semibold text-gray-700 mb-2">
                      No savings found
                    </p>
                    <p className="text-gray-500">
                      Start recording contributions to see them here.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gradient-to-r from-gray-50 to-blue-50">
                          <TableHead className="font-semibold text-gray-700">
                            Date
                          </TableHead>
                          <TableHead className="font-semibold text-gray-700">
                            Member ID
                          </TableHead>
                          <TableHead className="font-semibold text-gray-700">
                            Amount
                          </TableHead>
                          <TableHead className="font-semibold text-gray-700">
                            Payment Mode
                          </TableHead>
                          <TableHead className="font-semibold text-gray-700">
                            Cycle Period
                          </TableHead>
                          <TableHead className="font-semibold text-gray-700">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell colSpan={2} className="font-bold">
                            Total
                          </TableCell>
                          <TableCell
                            colSpan={4}
                            className="font-bold text-right"
                          >
                            NRs. {totalSavings.toFixed(2)}
                          </TableCell>
                        </TableRow>
                        {savings.map((saving, index) => (
                          <TableRow
                            key={saving.id}
                            className="hover:bg-gradient-to-r hover:from-teal-50 hover:to-cyan-50 transition-all duration-200"
                          >
                            <TableCell className="font-medium">
                              {format(
                                new Date(saving.contribution_date),
                                "MMM dd, yyyy",
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-gray-500" />
                                <span className="font-medium text-gray-800">
                                  {saving.member_id}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-bold text-xl bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                                NRs. {saving.contribution_amount.toFixed(2)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={`bg-gradient-to-r ${paymentModeColors[saving.payment_mode as keyof typeof paymentModeColors] || "from-gray-500 to-slate-500"} text-white border-0`}
                              >
                                {saving.payment_mode || "Cash"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={`bg-gradient-to-r ${periodColors[saving.cycle_period as keyof typeof periodColors] || "from-gray-500 to-slate-500"} text-white border-0`}
                              >
                                {saving.cycle_period || "Unknown"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {canEditTransactions && (
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedItem(saving);
                                      setEditType("saving");
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
                                          This action cannot be undone. This
                                          will permanently delete the saving.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>
                                          Cancel
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() =>
                                            handleDelete(saving.id, "saving")
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
            </Card>
          </TabsContent>

          <TabsContent value="withdrawals" className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Add Withdrawals Form */}
              <Card className="bg-gradient-to-br from-white/90 to-red-50/90 backdrop-blur-sm border-0 shadow-2xl hover:shadow-3xl transition-all duration-300">
                <CardHeader className="bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <ArrowDownCircle className="h-6 w-6" />
                    </div>
                    Record New Withdrawal
                    <Sparkles className="h-5 w-5 animate-pulse" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <form
                    onSubmit={handleWithdrawalsSubmit}
                    className="space-y-6"
                  >
                    <div className="space-y-2">
                      <Label
                        htmlFor="amount"
                        className="text-sm font-medium text-gray-700 flex items-center gap-2"
                      >
                        <DollarSign className="h-4 w-4 text-red-600" />
                        Amount (NRs.) *
                      </Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        value={withdrawalsFormData.amount}
                        onChange={(e) =>
                          setWithdrawalsFormData({
                            ...withdrawalsFormData,
                            amount: e.target.value,
                          })
                        }
                        placeholder="0.00"
                        required
                        className="border-red-200 focus:border-red-500 focus:ring-red-500 h-12 text-lg"
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
                        value={withdrawalsFormData.purpose}
                        onChange={(e) =>
                          setWithdrawalsFormData({
                            ...withdrawalsFormData,
                            purpose: e.target.value,
                          })
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

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label
                          htmlFor="paymentMode"
                          className="text-sm font-medium text-gray-700 flex items-center gap-2"
                        >
                          <CreditCard className="h-4 w-4 text-green-600" />
                          Payment Mode *
                        </Label>
                        <Select
                          value={withdrawalsFormData.paymentMode}
                          onValueChange={(value) =>
                            setWithdrawalsFormData({
                              ...withdrawalsFormData,
                              paymentMode: value,
                            })
                          }
                          required
                        >
                          <SelectTrigger className="border-green-200 focus:border-green-500 focus:ring-green-500 h-12">
                            <SelectValue placeholder="Select payment mode" />
                          </SelectTrigger>
                          <SelectContent>
                            {paymentModes.map((mode) => (
                              <SelectItem key={mode} value={mode}>
                                <div className="flex items-center gap-2">
                                  {mode === "Cash" && (
                                    <Banknote className="h-4 w-4" />
                                  )}
                                  {mode === "Esewa" && (
                                    <Smartphone className="h-4 w-4" />
                                  )}
                                  {mode === "Fonepay" && (
                                    <CreditCard className="h-4 w-4" />
                                  )}
                                  {mode}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="withdrawalFrom"
                          className="text-sm font-medium text-gray-700 flex items-center gap-2"
                        >
                          <Building2 className="h-4 w-4 text-blue-600" />
                          Withdraw From *
                        </Label>
                        <Select
                          value={withdrawalsFormData.withdrawalFrom}
                          onValueChange={(value) =>
                            setWithdrawalsFormData({
                              ...withdrawalsFormData,
                              withdrawalFrom: value,
                            })
                          }
                          required
                        >
                          <SelectTrigger className="border-blue-200 focus:border-blue-500 focus:ring-blue-500 h-12">
                            <SelectValue placeholder="Select source" />
                          </SelectTrigger>
                          <SelectContent>
                            {withdrawalSources.map((source) => (
                              <SelectItem key={source} value={source}>
                                <div className="flex items-center gap-2">
                                  {source === "Bank" && (
                                    <Building2 className="h-4 w-4" />
                                  )}
                                  {source === "Esewa" && (
                                    <Smartphone className="h-4 w-4" />
                                  )}
                                  {source === "Cooperative" && (
                                    <PiggyBank className="h-4 w-4" />
                                  )}
                                  {source}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label
                          htmlFor="recipient"
                          className="text-sm font-medium text-gray-700"
                        >
                          Recipient (Optional)
                        </Label>
                        <Input
                          id="recipient"
                          value={withdrawalsFormData.recipient}
                          onChange={(e) =>
                            setWithdrawalsFormData({
                              ...withdrawalsFormData,
                              recipient: e.target.value,
                            })
                          }
                          placeholder="Enter recipient name"
                          className="border-gray-200 focus:border-gray-500 focus:ring-gray-500 h-12"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="referenceNumber"
                          className="text-sm font-medium text-gray-700"
                        >
                          Reference No. (Optional)
                        </Label>
                        <Input
                          id="referenceNumber"
                          value={withdrawalsFormData.referenceNumber}
                          onChange={(e) =>
                            setWithdrawalsFormData({
                              ...withdrawalsFormData,
                              referenceNumber: e.target.value,
                            })
                          }
                          placeholder="Enter reference number"
                          className="border-gray-200 focus:border-gray-500 focus:ring-gray-500 h-12"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="remarks"
                        className="text-sm font-medium text-gray-700"
                      >
                        Remarks (Optional)
                      </Label>
                      <Textarea
                        id="remarks"
                        value={withdrawalsFormData.remarks}
                        onChange={(e) =>
                          setWithdrawalsFormData({
                            ...withdrawalsFormData,
                            remarks: e.target.value,
                          })
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
                      className="w-full h-12 bg-gradient-to-r from-red-500 via-pink-500 to-rose-500 hover:from-red-600 hover:via-pink-600 hover:to-rose-600 text-white font-semibold shadow-lg transition-all duration-300 transform hover:scale-105"
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

              {/* Withdrawals Payment Mode Breakdown */}
              <Card className="bg-gradient-to-br from-white/90 to-pink-50/90 backdrop-blur-sm border-0 shadow-2xl hover:shadow-3xl transition-all duration-300">
                <CardHeader className="bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <CreditCard className="h-6 w-6" />
                    </div>
                    Withdrawals by Payment Mode
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {Object.keys(withdrawalsPaymentBreakdown).length === 0 ? (
                    <div className="text-center py-8">
                      <CreditCard className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-500 text-lg font-medium">
                        No withdrawals yet
                      </p>
                      <p className="text-gray-400">
                        Record your first withdrawal to see breakdown!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(withdrawalsPaymentBreakdown)
                        .sort(([, a], [, b]) => b - a)
                        .map(([mode, amount], index) => {
                          const percentage = (amount / totalWithdrawals) * 100;
                          return (
                            <div
                              key={mode}
                              className="p-4 bg-gradient-to-r from-white to-pink-50 rounded-lg border border-pink-100 hover:shadow-md transition-all duration-200"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`w-4 h-4 rounded-full bg-gradient-to-r ${paymentModeColors[mode as keyof typeof paymentModeColors] || "from-gray-500 to-slate-500"}`}
                                  ></div>
                                  <span className="font-medium text-gray-800">
                                    {mode}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <span className="font-bold text-pink-600">
                                    NRs. {amount.toFixed(2)}
                                  </span>
                                  <div className="text-sm text-gray-500">
                                    {percentage.toFixed(1)}%
                                  </div>
                                </div>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className={`bg-gradient-to-r ${paymentModeColors[mode as keyof typeof paymentModeColors] || "from-gray-500 to-slate-500"} h-2 rounded-full transition-all duration-500`}
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

            {/* Withdrawals History */}
            <Card className="bg-gradient-to-br from-white/90 to-gray-50/90 backdrop-blur-sm border-0 shadow-2xl">
              <CardHeader className="border-b border-gray-200/50 flex flex-row items-center justify-between">
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent">
                  Withdrawals History
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-[300px] justify-start text-left font-normal hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50",
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
                    <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-pink-500 rounded-full animate-spin mx-auto flex items-center justify-center mb-4">
                      <ArrowDownCircle className="h-8 w-8 text-white" />
                    </div>
                    <p className="text-gray-600">Loading withdrawals...</p>
                  </div>
                ) : withdrawals.length === 0 ? (
                  <div className="text-center py-12">
                    <ArrowDownCircle className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-xl font-semibold text-gray-700 mb-2">
                      No withdrawals found
                    </p>
                    <p className="text-gray-500">
                      Start recording withdrawals to see them here.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gradient-to-r from-gray-50 to-pink-50">
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
                            From
                          </TableHead>
                          <TableHead className="font-semibold text-gray-700">
                            Recipient
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
                          <TableCell colSpan={6} className="font-bold">
                            NRs. {totalWithdrawals.toFixed(2)}
                          </TableCell>
                        </TableRow>
                        {withdrawals.map((withdrawal, index) => (
                          <TableRow
                            key={withdrawal.id}
                            className="hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 transition-all duration-200"
                          >
                            <TableCell className="font-medium">
                              {format(
                                new Date(withdrawal.withdrawal_date),
                                "MMM dd, yyyy",
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="font-bold text-xl bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">
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
                                className={`bg-gradient-to-r ${paymentModeColors[withdrawal.payment_mode as keyof typeof paymentModeColors] || "from-gray-500 to-slate-500"} text-white border-0`}
                              >
                                {withdrawal.payment_mode || "Cash"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200"
                              >
                                {withdrawal.withdrawal_from}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {withdrawal.recipient ? (
                                <span className="font-medium text-gray-800">
                                  {withdrawal.recipient}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {canEditTransactions && (
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedItem(withdrawal);
                                      setEditType("withdrawal");
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
                                          This action cannot be undone. This
                                          will permanently delete the
                                          withdrawal.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>
                                          Cancel
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() =>
                                            handleDelete(
                                              withdrawal.id,
                                              "withdrawal",
                                            )
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
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SavingsWithdrawalsTab;
