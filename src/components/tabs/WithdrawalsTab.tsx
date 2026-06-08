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
import { logError, extractErrorMessage } from "@/utils/errorHandling";
import RecordAttachments from "@/components/RecordAttachments";
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
  Landmark,
  Paperclip,
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
import MultiWithdrawalEntry from "@/components/MultiWithdrawalEntry";
import HistoryDateRangeFilter from "@/components/HistoryDateRangeFilter";
import MobileTable from "@/components/ui/mobile-table";
import { Edit } from "lucide-react";

interface Withdrawal {
  id: string;
  amount: number;
  purpose: string;
  recipient: string | null;
  reference_number: string | null;
  remarks: string | null;
  withdrawal_date: string;
  source_cooperative?: string | null;
}

const WithdrawalsTab = () => {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    amount: "",
    purpose: "",
    recipient: "",
    referenceNumber: "",
    remarks: "",
    sourceCooperative: "",
    paymentMode: "Cash",
  });
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

  const purposeColors = {
    "Salary Payment": "from-primary to-primary/80",
    "Vendor Payment": "from-secondary to-secondary/80",
    "Utility Bills": "from-primary to-primary/80",
    "Office Rent": "from-secondary to-secondary/80",
    "Equipment Purchase": "from-primary to-primary/80",
    "Marketing Expenses": "from-secondary to-secondary/80",
    "Travel Expenses": "from-primary to-primary/80",
    Maintenance: "from-secondary to-secondary/80",
    "Emergency Fund": "from-primary to-primary/80",
    Other: "from-gray-500 to-slate-500",
  };

  useEffect(() => {
    fetchWithdrawals();
    // Default to true if no setting exists
    const canEdit = localStorage.getItem("canEditTransactions");
    setCanEditTransactions(canEdit === null ? true : JSON.parse(canEdit));
  }, [user, page, range]);

  const fetchWithdrawals = async () => {
    if (!user) return;

    setLoading(true);
    try {
      let query = supabase
        .from("withdrawals")
        .select("*");

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

    if (!formData.amount || !formData.purpose) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      // Prepare withdrawal data according to database schema
      const withdrawalData: any = {
        user_id: user.id,
        amount: parseFloat(formData.amount),
        purpose: formData.purpose,
        recipient: formData.recipient || null,
        reference_number: formData.referenceNumber || null,
        remarks: formData.remarks || null,
        description: formData.remarks || null,
        withdrawal_date: transactionDate,
        source_cooperative: formData.sourceCooperative || null,
        payment_mode: formData.paymentMode,
      };

      console.log("Attempting to insert withdrawal data:", withdrawalData);
      const { error } = await supabase
        .from("withdrawals")
        .insert([withdrawalData]);

      if (error) {
        console.error("Database error details:", error);
        throw error;
      }

      toast.success("Withdrawal recorded successfully!");
      setFormData({
        amount: "",
        purpose: "",
        recipient: "",
        referenceNumber: "",
        remarks: "",
        sourceCooperative: "",
        paymentMode: "Cash",
      });
      fetchWithdrawals();
    } catch (error) {
      logError("recording withdrawal", error);
      toast.error(`Error recording withdrawal: ${extractErrorMessage(error)}`);
    } finally {
      setIsSubmitting(false);
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
    <div className="min-h-screen bg-background p-2 md:p-6 pb-24 md:pb-6">
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-4 md:p-6 rounded-3xl" aria-describedby={undefined}>
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold text-primary">Edit Withdrawal</DialogTitle>
          </DialogHeader>
          {selectedWithdrawal && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="editAmount" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Amount</Label>
                <Input
                  id="editAmount"
                  value={selectedWithdrawal.amount}
                  onChange={(e) =>
                    setSelectedWithdrawal({
                      ...selectedWithdrawal,
                      amount: parseFloat(e.target.value),
                    })
                  }
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="editPurpose" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Purpose</Label>
                <Input
                  id="editPurpose"
                  value={selectedWithdrawal.purpose}
                  onChange={(e) =>
                    setSelectedWithdrawal({
                      ...selectedWithdrawal,
                      purpose: e.target.value,
                    })
                  }
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="editRecipient" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Recipient</Label>
                  <Input
                    id="editRecipient"
                    value={selectedWithdrawal.recipient || ""}
                    onChange={(e) =>
                      setSelectedWithdrawal({
                        ...selectedWithdrawal,
                        recipient: e.target.value,
                      })
                    }
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="editReferenceNumber" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ref No.</Label>
                  <Input
                    id="editReferenceNumber"
                    value={selectedWithdrawal.reference_number || ""}
                    onChange={(e) =>
                      setSelectedWithdrawal({
                        ...selectedWithdrawal,
                        reference_number: e.target.value,
                      })
                    }
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="editSourceCooperative" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Source</Label>
                <Input
                  id="editSourceCooperative"
                  value={selectedWithdrawal.source_cooperative || ""}
                  onChange={(e) =>
                    setSelectedWithdrawal({
                      ...selectedWithdrawal,
                      source_cooperative: e.target.value,
                    })
                  }
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="editPaymentMode" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Payment Mode</Label>
                <Select
                  value={(selectedWithdrawal as any).payment_mode || "Cash"}
                  onValueChange={(val) => setSelectedWithdrawal({...(selectedWithdrawal as any), payment_mode: val} as any)}
                >
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Cash", "Esewa", "Fonepay", "Bank", "Cheque"].map(mode => (
                      <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="editRemarks" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Remarks</Label>
                <Textarea
                  id="editRemarks"
                  value={selectedWithdrawal.remarks || ""}
                  onChange={(e) =>
                    setSelectedWithdrawal({
                      ...selectedWithdrawal,
                      remarks: e.target.value,
                    })
                  }
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="editWithdrawalDate" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Withdrawal Date</Label>
                <Input
                  id="editWithdrawalDate"
                  type="date"
                  value={selectedWithdrawal.withdrawal_date}
                  onChange={(e) =>
                    setSelectedWithdrawal({
                      ...selectedWithdrawal,
                      withdrawal_date: e.target.value,
                    })
                  }
                  className="h-11 rounded-xl"
                />
              </div>
              <RecordAttachments recordType="withdrawal" recordId={selectedWithdrawal.id} compact />
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
              <Banknote className="h-5 w-5 md:h-6 md:w-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground">
                Withdrawals
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Track withdrawals with detailed purpose tracking
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
            <HistoryDateRangeFilter range={range} onChange={onRangeChange} />
            <MultiWithdrawalEntry onComplete={fetchWithdrawals} />
          </div>
        </div>


        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
          {/* Add Withdrawal Form */}
          <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden">
            <CardHeader className="bg-primary text-white p-4 md:p-6">
              <CardTitle className="flex items-center gap-3 text-lg md:text-xl font-bold">
                <div className="p-2 bg-white/20 rounded-xl">
                  <ArrowDownCircle className="h-5 w-5 md:h-6 md:w-6" />
                </div>
                New Withdrawal
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
                    <DollarSign className="h-3.5 w-3.5 text-rose-600" />
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
                    className="h-12 text-xl font-bold rounded-xl border-rose-100 focus:border-rose-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="purpose"
                    className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2"
                  >
                    <Target className="h-3.5 w-3.5 text-indigo-600" />
                    Purpose *
                  </Label>
                  <Select
                    value={formData.purpose}
                    onValueChange={(val) => setFormData({...formData, purpose: val})}
                  >
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue placeholder="Select purpose" />
                    </SelectTrigger>
                    <SelectContent>
                      {commonPurposes.map(purpose => <SelectItem key={purpose} value={purpose}>{purpose}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="recipient"
                      className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                    >
                      Recipient
                    </Label>
                    <Input
                      id="recipient"
                      value={formData.recipient}
                      onChange={(e) =>
                        setFormData({ ...formData, recipient: e.target.value })
                      }
                      placeholder="Name"
                      className="h-11 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="referenceNumber"
                      className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                    >
                      Ref No.
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
                      placeholder="#"
                      className="h-11 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="sourceCooperative"
                      className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2"
                    >
                      <Landmark className="h-3.5 w-3.5 text-indigo-600" />
                      Source/Cooperative
                    </Label>
                    <Input
                      id="sourceCooperative"
                      value={formData.sourceCooperative}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sourceCooperative: e.target.value,
                        })
                      }
                      placeholder="e.g. Bank Account, Cooperative Name"
                      className="h-11 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="paymentMode"
                      className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2"
                    >
                      <CreditCard className="h-3.5 w-3.5 text-indigo-600" />
                      Mode
                    </Label>
                    <Select
                      value={formData.paymentMode}
                      onValueChange={(val) => setFormData({...formData, paymentMode: val})}
                    >
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Select mode" />
                      </SelectTrigger>
                      <SelectContent>
                        {["Cash", "Esewa", "Fonepay", "Bank", "Cheque"].map(mode => (
                          <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

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
                    className="rounded-xl min-h-[60px]"
                  />
                </div>

                {/* Transaction Date */}
                <TransactionDatePicker
                  selectedDate={transactionDate}
                  onDateChange={setTransactionDate}
                  label="Withdrawal Date"
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
                      <ArrowDownCircle className="h-5 w-5" />
                      Record Withdrawal
                    </div>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Purpose Breakdown */}
          <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden transition-all duration-300">
            <CardHeader className="bg-secondary text-white">
              <CardTitle className="flex items-center gap-3 text-xl font-bold">
                <div className="p-2 bg-white/20 rounded-xl">
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
            <MobileTable
              columns={[
                {
                  key: "withdrawal_date",
                  label: "Date",
                  render: (val) => format(new Date(val), "MMM dd, yyyy"),
                  mobileLabel: "Date",
                },
                {
                  key: "amount",
                  label: "Amount",
                  className: "text-right font-bold",
                  render: (val) => <span className="text-destructive">रु {Number(val).toFixed(0)}</span>,
                },
                {
                  key: "purpose",
                  label: "Purpose",
                  render: (val) => (
                    <Badge className={cn("bg-gradient-to-r text-white border-0", purposeColors[val as keyof typeof purposeColors] || "from-gray-400 to-gray-500")}>
                      {val}
                    </Badge>
                  ),
                },
                {
                  key: "source_cooperative",
                  label: "Source",
                  hideOnMobile: true,
                  render: (val) => val || "-",
                },
                {
                  key: "actions",
                  label: "Actions",
                  className: "text-right",
                  render: (_, withdrawal) => (
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedWithdrawal(withdrawal);
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
                            <AlertDialogAction onClick={() => handleDelete(withdrawal.id)}>
                              Continue
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ),
                },
              ]}
              data={withdrawals}
              loading={loading}
              emptyMessage="No withdrawals found."
              footer={
                <div className="flex justify-between items-center font-bold text-lg">
                  <span>Page Total</span>
                  <span className="text-destructive">
                    रु {totalWithdrawals.toFixed(2)}
                  </span>
                </div>
              }
            />
          </CardContent>
          {withdrawals.length > 0 && (
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
                  disabled={withdrawals.length < itemsPerPage}
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

export default WithdrawalsTab;
