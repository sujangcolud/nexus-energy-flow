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
import { toast } from "sonner";
import { extractErrorMessage, logError } from "@/utils/errorHandling";
import TransactionDatePicker from "@/components/ui/transaction-date-picker";
import { format } from "date-fns";
import RecordAttachments from "@/components/RecordAttachments";
import {
  PiggyBank,
  Calendar as CalendarIcon,
  Users,
  TrendingUp,
  DollarSign,
  Plus,
  Sparkles,
  Target,
  Clock,
  Coins,
  Trash2,
  Edit,
  CreditCard,
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
import MultiSavingsEntry from "@/components/MultiSavingsEntry";
import HistoryDateRangeFilter from "@/components/HistoryDateRangeFilter";
import MobileTable from "@/components/ui/mobile-table";

interface Saving {
  id: string;
  contribution_amount: number;
  member_id: string;
  cycle_period: string | null;
  contribution_date: string;
  user_id: string;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
  created_at: string;
}

const CooperativeSavingsTab = () => {
  const [savings, setSavings] = useState<Saving[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    contributionAmount: "",
    memberId: "",
    cyclePeriod: "",
    remarks: "",
    paymentMode: "Cash",
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
  const [selectedSaving, setSelectedSaving] = useState<Saving | null>(null);
  const [canEditTransactions, setCanEditTransactions] = useState(false);
  const [canAddCategory, setCanAddCategory] = useState(false);

  const cyclePeriods = [
    "Weekly",
    "Bi-weekly",
    "Monthly",
    "Quarterly",
    "Semi-Annual",
    "Annual",
    "One-time",
  ];

  const periodColors = {
    Weekly: "from-primary to-primary/80",
    "Bi-weekly": "from-secondary to-secondary/80",
    Monthly: "from-primary to-primary/80",
    Quarterly: "from-secondary to-secondary/80",
    "Semi-Annual": "from-primary to-primary/80",
    Annual: "from-secondary to-secondary/80",
    "One-time": "from-gray-500 to-slate-500",
  };

  useEffect(() => {
    fetchSavings();
    fetchCategories();
    // Default to true if no setting exists
    const canEdit = localStorage.getItem("canEditTransactions");
    setCanEditTransactions(canEdit === null ? true : JSON.parse(canEdit));
    
    const canAdd = localStorage.getItem("canAddSavingsCategory");
    setCanAddCategory(canAdd === null ? true : JSON.parse(canAdd));
  }, [user, page, range]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("savings_categories")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      logError("fetching categories", error);
      toast.error(`Error loading categories: ${extractErrorMessage(error)}`);
    }
  };

  const fetchSavings = async () => {
    if (!user) return;

    setLoading(true);
    try {
      let query = supabase
        .from("cooperative_savings")
        .select("*");

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Please log in to record savings");
      return;
    }

    if (
      !formData.contributionAmount ||
      !formData.memberId ||
      !formData.cyclePeriod
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("cooperative_savings").insert([
        {
          user_id: user.id,
          contribution_amount: parseFloat(formData.contributionAmount),
          member_id: formData.memberId,
          cycle_period: formData.cyclePeriod,
          contribution_date: transactionDate,
          payment_mode: formData.paymentMode,
        },
      ]);

      if (error) throw error;

      toast.success("Cooperative saving recorded successfully!");
      setFormData({
        contributionAmount: "",
        memberId: "",
        cyclePeriod: "",
        remarks: "",
        paymentMode: "Cash",
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

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory) {
      toast.error("Please enter a category name");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("savings_categories")
        .insert({ name: newCategory })
        .select();

      if (error) throw error;

      toast.success(`Category "${newCategory}" added successfully`);
      setNewCategory("");
      fetchCategories();
    } catch (error) {
      logError("adding category", error);
      toast.error(`Error adding category: ${extractErrorMessage(error)}`);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      const { error } = await supabase
        .from("savings_categories")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Category deleted successfully");
      fetchCategories();
    } catch (error) {
      logError("deleting category", error);
      toast.error(`Error deleting category: ${extractErrorMessage(error)}`);
    }
  };

  const totalSavings = savings.reduce(
    (sum, saving) => sum + saving.contribution_amount,
    0,
  );
  const periodBreakdown = savings.reduce(
    (acc, saving) => {
      const period = saving.cycle_period || "Unknown";
      acc[period] = (acc[period] || 0) + saving.contribution_amount;
      return acc;
    },
    {} as Record<string, number>,
  );

  const topPeriod = Object.entries(periodBreakdown).sort(
    ([, a], [, b]) => b - a,
  )[0];
  const averageContribution =
    savings.length > 0 ? totalSavings / savings.length : 0;
  const uniqueMembers = new Set(savings.map((s) => s.member_id)).size;

  const logAction = async (action: string, record_id: string, details: any) => {
    if (!user) return;
    await supabase.from("logs").insert({
      user_id: user.id,
      action,
      table_name: "cooperative_savings",
      record_id,
      details,
    });
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("cooperative_savings")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Saving deleted successfully!");
      logAction("delete", id, { id });
      fetchSavings();
    } catch (error) {
      logError("deleting saving", error);
      toast.error(`Error deleting saving: ${extractErrorMessage(error)}`);
    }
  };

  const handleUpdate = async () => {
    if (!selectedSaving) return;

    try {
      const { error } = await supabase
        .from("cooperative_savings")
        .update(selectedSaving)
        .eq("id", selectedSaving.id);

      if (error) throw error;

      toast.success("Saving updated successfully!");
      logAction("update", selectedSaving.id, selectedSaving);
      setIsEditDialogOpen(false);
      fetchSavings();
    } catch (error) {
      logError("updating saving", error);
      toast.error(`Error updating saving: ${extractErrorMessage(error)}`);
    }
  };

  return (
    <div className="min-h-screen bg-background p-2 md:p-6 pb-24 md:pb-6">
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-4 md:p-6 rounded-3xl" aria-describedby={undefined}>
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold text-primary">Edit Saving</DialogTitle>
          </DialogHeader>
          {selectedSaving && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="editContributionAmount" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Amount</Label>
                <Input
                  id="editContributionAmount"
                  type="number"
                  value={selectedSaving.contribution_amount}
                  onChange={(e) =>
                    setSelectedSaving({
                      ...selectedSaving,
                      contribution_amount: parseFloat(e.target.value),
                    })
                  }
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="editPaymentMode" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Payment Mode</Label>
                <Select
                  value={(selectedSaving as any).payment_mode || "Cash"}
                  onValueChange={(val) => setSelectedSaving({...selectedSaving, payment_mode: val} as any)}
                >
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Cash", "Esewa", "Fonepay", "Bank"].map(mode => (
                      <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="editMemberId" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Member ID</Label>
                <Input
                  id="editMemberId"
                  value={selectedSaving.member_id}
                  onChange={(e) =>
                    setSelectedSaving({
                      ...selectedSaving,
                      member_id: e.target.value,
                    })
                  }
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="editCyclePeriod" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Cycle Period</Label>
                <Input
                  id="editCyclePeriod"
                  value={selectedSaving.cycle_period || ""}
                  onChange={(e) =>
                    setSelectedSaving({
                      ...selectedSaving,
                      cycle_period: e.target.value,
                    })
                  }
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="editContributionDate" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Contribution Date</Label>
                <Input
                  id="editContributionDate"
                  type="date"
                  value={selectedSaving.contribution_date}
                  onChange={(e) =>
                    setSelectedSaving({
                      ...selectedSaving,
                      contribution_date: e.target.value,
                    })
                  }
                  className="h-11 rounded-xl"
                />
              </div>
              <RecordAttachments recordType="cooperative_saving" recordId={selectedSaving.id} compact />
            </div>
          )}
          <DialogFooter className="pt-2">
            <Button onClick={handleUpdate} className="w-full h-12 rounded-xl text-lg font-bold shadow-lg">Save Changes</Button>
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
                Savings
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Track cooperative savings and member contributions
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
            <HistoryDateRangeFilter range={range} onChange={onRangeChange} />
            <MultiSavingsEntry onComplete={fetchSavings} />
          </div>
        </div>


        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
          {/* Add Saving Form */}
          <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden">
            <CardHeader className="bg-primary text-white p-4 md:p-6">
              <CardTitle className="flex items-center gap-3 text-lg md:text-xl font-bold">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Plus className="h-5 w-5 md:h-6 md:w-6" />
                </div>
                New Contribution
                <Sparkles className="h-4 w-4 md:h-5 md:w-5 ml-auto opacity-70" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6 space-y-6">
              <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="contributionAmount"
                    className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2"
                  >
                    <DollarSign className="h-3.5 w-3.5 text-teal-600" />
                    Amount (NRs.) *
                  </Label>
                  <Input
                    id="contributionAmount"
                    type="number"
                    step="0.01"
                    value={formData.contributionAmount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contributionAmount: e.target.value,
                      })
                    }
                    placeholder="0.00"
                    required
                    className="h-12 text-xl font-bold rounded-xl border-teal-100 focus:border-teal-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="memberId"
                      className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2"
                    >
                      <Users className="h-3.5 w-3.5 text-blue-600" />
                      Member ID *
                    </Label>
                    <Select
                      value={formData.memberId}
                      onValueChange={(value) =>
                        setFormData({ ...formData, memberId: value })
                      }
                    >
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="ID" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DF1">DF1</SelectItem>
                        <SelectItem value="SF1">SF1</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="cyclePeriod"
                      className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2"
                    >
                      <Clock className="h-3.5 w-3.5 text-purple-600" />
                      Cycle *
                    </Label>
                    <Select
                      value={formData.cyclePeriod}
                      onValueChange={(value) =>
                        setFormData({ ...formData, cyclePeriod: value })
                      }
                      required
                    >
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Period" />
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

                <div className="space-y-1.5">
                  <Label
                    htmlFor="paymentMode"
                    className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2"
                  >
                    <CreditCard className="h-3.5 w-3.5 text-indigo-600" />
                    Payment Mode *
                  </Label>
                  <Select
                    value={formData.paymentMode}
                    onValueChange={(value) =>
                      setFormData({ ...formData, paymentMode: value })
                    }
                    required
                  >
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue placeholder="Select mode" />
                    </SelectTrigger>
                    <SelectContent>
                      {["Cash", "Esewa", "Fonepay", "Bank"].map((mode) => (
                        <SelectItem key={mode} value={mode}>
                          {mode}
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
                />

                <div className="space-y-1.5">
                  <Label
                    htmlFor="remarks"
                    className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                  >
                    Remarks
                  </Label>
                  <Textarea
                    id="remarks"
                    value={formData.remarks}
                    onChange={(e) =>
                      setFormData({ ...formData, remarks: e.target.value })
                    }
                    placeholder="Notes..."
                    rows={2}
                    className="rounded-xl min-h-[80px]"
                  />
                </div>

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
                      <Coins className="h-5 w-5" />
                      Record Contribution
                    </div>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Cycle Period Breakdown */}
          <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden transition-all duration-300">
            <CardHeader className="bg-secondary text-white">
              <CardTitle className="flex items-center gap-3 text-xl font-bold">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Target className="h-6 w-6" />
                </div>
                Cycle Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {Object.keys(periodBreakdown).length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500 text-lg font-medium">
                    No contributions yet
                  </p>
                  <p className="text-gray-400">
                    Record your first contribution to see cycle breakdown!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(periodBreakdown)
                    .sort(([, a], [, b]) => b - a)
                    .map(([period, amount], index) => {
                      const percentage = (amount / totalSavings) * 100;
                      return (
                        <div
                          key={period}
                          className="p-4 bg-gradient-to-r from-white to-blue-50 rounded-lg border border-blue-100 hover:shadow-md transition-all duration-200"
                          style={{ animationDelay: `${index * 100}ms` }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-4 h-4 rounded-full bg-gradient-to-r ${periodColors[period as keyof typeof periodColors] || "from-gray-500 to-slate-500"}`}
                              ></div>
                              <span className="font-medium text-gray-800">
                                {period}
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
                              className={`bg-gradient-to-r ${periodColors[period as keyof typeof periodColors] || "from-gray-500 to-slate-500"} h-2 rounded-full transition-all duration-500`}
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
                    <PiggyBank className="h-6 w-6" />
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
            <MobileTable
              columns={[
                {
                  key: "contribution_date",
                  label: "Date",
                  render: (val) => format(new Date(val), "MMM dd, yyyy"),
                  mobileLabel: "Date",
                },
                {
                  key: "member_id",
                  label: "Member",
                  render: (val) => (
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <span className="font-bold">{val}</span>
                    </div>
                  ),
                },
                {
                  key: "contribution_amount",
                  label: "Amount",
                  className: "text-right font-bold",
                  render: (val) => <span className="text-primary">रु {Number(val).toFixed(0)}</span>,
                },
                {
                  key: "cycle_period",
                  label: "Cycle",
                  render: (val) => (
                    <Badge className={cn("bg-gradient-to-r text-white border-0", periodColors[val as keyof typeof periodColors] || "from-gray-400 to-gray-500")}>
                      {val || "Unknown"}
                    </Badge>
                  ),
                },
                {
                  key: "actions",
                  label: "Actions",
                  className: "text-right",
                  render: (_, saving) => (
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedSaving(saving);
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
                            <AlertDialogAction onClick={() => handleDelete(saving.id)}>
                              Continue
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ),
                },
              ]}
              data={savings}
              loading={loading}
              emptyMessage="No savings found."
            />
          </CardContent>
          {savings.length > 0 && (
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
                  disabled={savings.length < itemsPerPage}
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

export default CooperativeSavingsTab;
