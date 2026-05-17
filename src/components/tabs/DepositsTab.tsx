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
import TransactionDatePicker from "@/components/ui/transaction-date-picker";
import RecordAttachments from "@/components/RecordAttachments";
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
import MultiDepositEntry from "@/components/MultiDepositEntry";
import HistoryDateRangeFilter from "@/components/HistoryDateRangeFilter";

interface Deposit {
  id: string;
  amount: number;
  mode: string;
  deposited_by: string;
  deposited_by_type?: string;
  deposit_date: string;
  remarks: string;
  user_id: string;
  created_at: string;
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
    depositedByType: "",
    deposited_to: "",
    sender_name: "",
    receiver_name: "",
    remarks: "",
  });
  const [newCategory, setNewCategory] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { page, range, onPageChange, onRangeChange, itemsPerPage } =
    useTableControls();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null);
  const [canEditTransactions, setCanEditTransactions] = useState(false);
  const [transactionDate, setTransactionDate] = useState(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [canAddCategory, setCanAddCategory] = useState(false);
  const isMobile = useIsMobile();

  // Table columns configuration for mobile responsive table
  const tableColumns = [
    {
      key: "deposit_date",
      label: "Date",
      className: "font-semibold text-gray-700",
      render: (value: string) => format(new Date(value), "MMM dd, yyyy"),
    },
    {
      key: "amount",
      label: "Amount",
      className: "font-semibold text-gray-700",
      render: (value: number) => (
        <span className="font-bold text-xl text-primary">
          NRs. {value.toFixed(2)}
        </span>
      ),
    },
    {
      key: "mode",
      label: "Mode",
      className: "font-semibold text-gray-700",
      render: (value: string) => (
        <Badge
          className={`bg-gradient-to-r ${modeColors[value as keyof typeof modeColors]} text-white border-0`}
        >
          {value}
        </Badge>
      ),
    },
    {
      key: "deposited_by",
      label: "Deposited By",
      className: "font-semibold text-gray-700",
      render: (value: string, deposit: Deposit) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-gray-500" />
            {value}
          </div>
          <div className="text-xs text-gray-500">
            ({(deposit as any).deposited_by_type || "N/A"})
          </div>
        </div>
      ),
    },
    // Removed sender_name, receiver_name, deposited_to columns as they don't exist in database
    {
      key: "remarks",
      label: "Remarks",
      className: "font-semibold text-gray-700 max-w-xs",
      hideOnMobile: true,
      render: (value: string) => (
        <span className="text-sm text-gray-600 truncate" title={value}>
          {value || "-"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      className: "font-semibold text-gray-700",
      render: (_: any, deposit: Deposit) => (
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
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete
                    the deposit.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDelete(deposit.id)}>
                    Continue
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ),
    },
  ];

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

  const depositedByTypes = ["Customer", "Staff"];

  const modeColors = {
    Cash: "from-primary to-primary/80",
    Esewa: "from-secondary to-secondary/80",
    Fonepay: "from-primary to-primary/80",
    "Bank Transfer": "from-secondary to-secondary/80",
    Cheque: "from-primary to-primary/80",
    "Credit Card": "from-secondary to-secondary/80",
    "Mobile Banking": "from-primary to-primary/80",
    Other: "from-gray-500 to-slate-500",
  };

  useEffect(() => {
    fetchDeposits();
    fetchCategories();
    // Default to true if no setting exists
    const canEdit = localStorage.getItem("canEditTransactions");
    setCanEditTransactions(canEdit === null ? true : JSON.parse(canEdit));
    
    const canAdd = localStorage.getItem("canAddDepositCategory");
    setCanAddCategory(canAdd === null ? true : JSON.parse(canAdd));
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
      let query = supabase.from("deposits").select("*");

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

    if (
      !formData.amount ||
      !formData.mode ||
      !formData.depositedBy ||
      !formData.depositedByType
    ) {
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
          deposited_by_type: formData.depositedByType,
          remarks: formData.remarks || "",
          deposit_date: transactionDate,
          // Removed non-existent columns: sender_name, receiver_name, payment_mode, deposited_to, category
        },
      ]);

      if (error) throw error;

      toast.success("Deposit added successfully!");
      setFormData({
        amount: "",
        mode: "",
        depositedBy: "",
        depositedByType: "",
        deposited_to: "",
        sender_name: "",
        receiver_name: "",
        remarks: "",
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
    <div className="min-h-screen bg-background p-2 md:p-6 pb-24 md:pb-6">
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-4 md:p-6 rounded-3xl" aria-describedby={undefined}>
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold text-primary">Edit Deposit</DialogTitle>
          </DialogHeader>
          {selectedDeposit && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="editAmount" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Amount</Label>
                <Input
                  id="editAmount"
                  value={selectedDeposit.amount}
                  onChange={(e) =>
                    setSelectedDeposit({
                      ...selectedDeposit,
                      amount: parseFloat(e.target.value),
                    })
                  }
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="editMode" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Mode</Label>
                <Input
                  id="editMode"
                  value={selectedDeposit.mode}
                  onChange={(e) =>
                    setSelectedDeposit({
                      ...selectedDeposit,
                      mode: e.target.value,
                    })
                  }
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="editDepositedByType" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Depositor Type</Label>
                <Select
                  value={(selectedDeposit as any).deposited_by_type || ""}
                  onValueChange={(value) =>
                    setSelectedDeposit({
                      ...selectedDeposit,
                      deposited_by_type: value,
                    } as any)
                  }
                >
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {depositedByTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="editDepositedBy" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Depositor Name</Label>
                <Input
                  id="editDepositedBy"
                  value={selectedDeposit.deposited_by}
                  onChange={(e) =>
                    setSelectedDeposit({
                      ...selectedDeposit,
                      deposited_by: e.target.value,
                    })
                  }
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="editRemarks" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Remarks</Label>
                <Textarea
                  id="editRemarks"
                  value={selectedDeposit.remarks}
                  onChange={(e) =>
                    setSelectedDeposit({
                      ...selectedDeposit,
                      remarks: e.target.value,
                    })
                  }
                  className="rounded-xl"
                />
              </div>
              <RecordAttachments recordType="deposit" recordId={selectedDeposit.id} compact />
            </div>
          )}
          <DialogFooter className="pt-2">
            <Button onClick={handleUpdate} className="w-full h-12 rounded-xl text-lg font-bold">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="bg-primary/5 p-4 rounded-3xl mb-4 md:mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-xl text-white">
              <PiggyBank className="h-5 w-5 md:h-6 md:w-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground">
                Deposits
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Track and manage all financial deposits
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
            <HistoryDateRangeFilter range={range} onChange={onRangeChange} />
            <MultiDepositEntry onComplete={fetchDeposits} />
          </div>
        </div>


        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
          {/* Add Deposit Form */}
          <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden">
            <CardHeader className="bg-primary text-white p-4 md:p-6">
              <CardTitle className="flex items-center gap-3 text-lg md:text-xl font-bold">
                <div className="p-2 bg-white/20 rounded-xl">
                  <ArrowUpCircle className="h-5 w-5 md:h-6 md:w-6" />
                </div>
                New Deposit
                <Sparkles className="h-4 w-4 md:h-5 md:w-5 ml-auto opacity-70" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="amount"
                    className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2"
                  >
                    <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
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
                    className="h-12 text-xl font-bold rounded-xl border-emerald-100 focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="mode"
                      className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2"
                    >
                      <CreditCard className="h-3.5 w-3.5 text-blue-600" />
                      Mode *
                    </Label>
                    <Select
                      value={formData.mode}
                      onValueChange={(value) =>
                        setFormData({ ...formData, mode: value })
                      }
                      required
                    >
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {depositModes.map((mode) => (
                          <SelectItem key={mode} value={mode}>
                            {mode}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="depositedByType"
                      className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2"
                    >
                      <User className="h-3.5 w-3.5 text-purple-600" />
                      By *
                    </Label>
                    <Select
                      value={formData.depositedByType}
                      onValueChange={(value) =>
                        setFormData({ ...formData, depositedByType: value })
                      }
                      required
                    >
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {depositedByTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="depositedBy"
                    className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2"
                  >
                    <User className="h-3.5 w-3.5 text-indigo-600" />
                    Depositor Name *
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
                    placeholder="Name"
                    required
                    className="h-11 rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="deposited_to"
                    className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
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
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue placeholder="Select" />
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

                <div className="space-y-1.5">
                  <Label
                    htmlFor="remarks"
                    className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                  >
                    Remarks (Optional)
                  </Label>
                  <Textarea
                    id="remarks"
                    value={formData.remarks}
                    onChange={(e) =>
                      setFormData({ ...formData, remarks: e.target.value })
                    }
                    placeholder="Notes..."
                    rows={2}
                    className="rounded-xl min-h-[60px]"
                  />
                </div>

                {/* Transaction Date */}
                <TransactionDatePicker
                  selectedDate={transactionDate}
                  onDateChange={setTransactionDate}
                  label="Deposit Date"
                />

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 md:h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-lg shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      Recording...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <ArrowUpCircle className="h-5 w-5" />
                      Record Deposit
                    </div>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Deposit Mode Breakdown */}
          <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden transition-all duration-300">
            <CardHeader className="bg-secondary text-white">
              <CardTitle className="flex items-center gap-3 text-xl font-bold">
                <div className="p-2 bg-white/20 rounded-xl">
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
            <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden transition-all duration-300">
              <CardHeader className="bg-primary text-white">
                <CardTitle className="flex items-center gap-3 text-xl font-bold">
                  <div className="p-2 bg-white/20 rounded-xl">
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
                    className="h-11 rounded-xl"
                  />
                  <Button
                    type="submit"
                    className="w-full h-12 bg-primary text-white rounded-xl font-bold"
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
            <MobileTable
              columns={[
                {
                  key: "deposit_date",
                  label: "Date",
                  render: (val) => format(new Date(val), "MMM dd, yyyy"),
                  mobileLabel: "Date",
                },
                {
                  key: "amount",
                  label: "Amount",
                  className: "text-right font-bold",
                  render: (val) => <span className="text-primary">रु {Number(val).toFixed(0)}</span>,
                },
                {
                  key: "mode",
                  label: "Mode",
                  render: (val) => (
                    <Badge className={cn("bg-gradient-to-r text-white border-0", modeColors[val as keyof typeof modeColors] || "from-gray-400 to-gray-500")}>
                      {val}
                    </Badge>
                  ),
                },
                {
                  key: "deposited_by",
                  label: "By",
                  hideOnMobile: true,
                  render: (val) => val,
                },
                {
                  key: "actions",
                  label: "Actions",
                  className: "text-right",
                  render: (_, deposit) => (
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedDeposit(deposit);
                          setIsEditDialogOpen(true);
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(deposit.id)}>
                              Continue
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ),
                },
              ]}
              data={deposits}
              loading={loading}
              emptyMessage="No deposits found."
              footer={
                <div className="flex justify-between items-center font-bold text-lg">
                  <span>Page Total</span>
                  <span className="text-primary">
                    रु {totalDeposits.toFixed(2)}
                  </span>
                </div>
              }
            />
          </CardContent>
          {deposits.length > 0 && (
            <div className="flex justify-center p-4 border-t border-gray-200">
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => onPageChange(page - 1)}
                  disabled={page === 1}
                  variant="outline"
                  className="hover:bg-primary/5"
                >
                  Previous
                </Button>
                <span className="px-4 py-2 bg-primary/5 rounded-lg font-medium">
                  Page {page}
                </span>
                <Button
                  onClick={() => onPageChange(page + 1)}
                  disabled={deposits.length < itemsPerPage}
                  variant="outline"
                  className="hover:bg-primary/5"
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
