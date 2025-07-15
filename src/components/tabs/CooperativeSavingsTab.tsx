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
  Users,
  Calendar as CalendarIcon,
  PiggyBank,
  TrendingUp,
  DollarSign,
  Target,
<<<<<<< HEAD
  Plus,
  Trash2,
  HandCoins,
=======
  Clock,
  Coins,
  Trash2,
>>>>>>> origin/main
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

interface CooperativeSaving {
  id: string;
  member_name: string;
  contribution_amount: number;
  contribution_type: string;
  payment_mode: string;
  contribution_date: string;
  remarks: string;
}

const CooperativeSavingsTab = () => {
  const [savings, setSavings] = useState<CooperativeSaving[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    memberName: "",
    contributionAmount: "",
    contributionType: "",
    paymentMode: "",
    remarks: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { page, range, onPageChange, onRangeChange, itemsPerPage } =
    useTableControls();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedSaving, setSelectedSaving] = useState<Saving | null>(null);
  const [canEditTransactions, setCanEditTransactions] = useState(false);

  const contributionTypes = [
    "Monthly Contribution",
    "Special Contribution",
    "Bonus Contribution",
    "Emergency Fund",
    "Development Fund",
    "Other",
  ];

<<<<<<< HEAD
  const paymentModes = [
    "Cash",
    "Esewa",
    "Fonepay",
    "Bank Transfer",
    "Cheque",
    "Mobile Banking",
    "Other",
  ];
=======
  const periodColors = {
    Weekly: "from-green-500 to-emerald-500",
    "Bi-weekly": "from-blue-500 to-cyan-500",
    Monthly: "from-purple-500 to-pink-500",
    Quarterly: "from-orange-500 to-red-500",
    "Semi-Annual": "from-indigo-500 to-blue-500",
    Annual: "from-violet-500 to-purple-500",
    "One-time": "from-gray-500 to-slate-500",
  };

  useEffect(() => {
    fetchSavings();
    const canEdit = localStorage.getItem("canEditTransactions");
    if (canEdit) {
      setCanEditTransactions(JSON.parse(canEdit));
    }
  }, [user, page, range]);
>>>>>>> origin/main

  const fetchSavings = async () => {
    if (!user) return;

    setLoading(true);
    try {
      let query = supabase
        .from("cooperative_savings")
        .select("*", { count: "exact" })
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

      const { data, error, count } = await query
        .order("contribution_date", { ascending: false })
        .range((page - 1) * itemsPerPage, page * itemsPerPage - 1);

      if (error) throw error;
      setSavings(data || []);
    } catch (error) {
      console.error("Error fetching savings:", error);
      toast.error("Failed to load cooperative savings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSavings();
    }
  }, [user, page, range]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.memberName ||
      !formData.contributionAmount ||
      !formData.contributionType ||
      !formData.paymentMode
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("cooperative_savings").insert({
        user_id: user!.id,
        member_name: formData.memberName,
        contribution_amount: parseFloat(formData.contributionAmount),
        contribution_type: formData.contributionType,
        payment_mode: formData.paymentMode,
        remarks: formData.remarks,
        contribution_date: new Date().toISOString().split("T")[0],
      });

      if (error) throw error;

      toast.success("Savings contribution recorded successfully!");
      setFormData({
        memberName: "",
        contributionAmount: "",
        contributionType: "",
        paymentMode: "",
        remarks: "",
      });
      fetchSavings();
    } catch (error) {
      console.error("Error adding savings:", error);
      toast.error("Failed to record savings contribution");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteSaving = async (id: string) => {
    try {
      const { error } = await supabase
        .from("cooperative_savings")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Savings record deleted successfully!");
      fetchSavings();
    } catch (error) {
      console.error("Error deleting saving:", error);
      toast.error("Failed to delete savings record");
    }
  };

  const totalSavings = savings.reduce(
    (sum, saving) => sum + saving.contribution_amount,
    0,
  );
  const memberTotals = savings.reduce(
    (acc, saving) => {
      acc[saving.member_name] =
        (acc[saving.member_name] || 0) + saving.contribution_amount;
      return acc;
    },
    {} as Record<string, number>,
  );
  const typeTotals = savings.reduce(
    (acc, saving) => {
      acc[saving.contribution_type] =
        (acc[saving.contribution_type] || 0) + saving.contribution_amount;
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
          <Users className="h-6 w-6 text-black" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-black">Cooperative Savings</h1>
          <p className="text-gray-600">
            Manage member savings and contributions
=======
  const topPeriod = Object.entries(periodBreakdown).sort(
    ([, a], [, b]) => b - a,
  )[0];
  const averageContribution =
    savings.length > 0 ? totalSavings / savings.length : 0;
  const uniqueMembers = new Set(savings.map((s) => s.member_id)).size;

  const logAction = async (
    action: string,
    record_id: string,
    details: any,
  ) => {
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
      console.error("Error deleting saving:", error);
      toast.error("Failed to delete saving");
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
      console.error("Error updating saving:", error);
      toast.error("Failed to update saving");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 relative overflow-hidden">
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Saving</DialogTitle>
          </DialogHeader>
          {selectedSaving && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="editContributionAmount">
                  Contribution Amount
                </Label>
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
                />
              </div>
              <div>
                <Label htmlFor="editMemberId">Member ID</Label>
                <Input
                  id="editMemberId"
                  value={selectedSaving.member_id}
                  onChange={(e) =>
                    setSelectedSaving({
                      ...selectedSaving,
                      member_id: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="editCyclePeriod">Cycle Period</Label>
                <Input
                  id="editCyclePeriod"
                  value={selectedSaving.cycle_period || ""}
                  onChange={(e) =>
                    setSelectedSaving({
                      ...selectedSaving,
                      cycle_period: e.target.value,
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
              Cooperative Savings
            </h1>
            <Sparkles className="h-8 w-8 text-cyan-500 animate-bounce" />
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Manage community savings contributions with comprehensive member
            tracking
>>>>>>> origin/main
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  Total Savings
                </p>
                <p className="text-2xl font-bold text-black">
                  NRs. {totalSavings.toLocaleString()}
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
                  Total Contributions
                </p>
                <p className="text-2xl font-bold text-black">
                  {savings.length}
                </p>
              </div>
              <div className="p-3 bg-brand-100 rounded-xl">
                <HandCoins className="h-6 w-6 text-black" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  Active Members
                </p>
                <p className="text-2xl font-bold text-black">
                  {Object.keys(memberTotals).length}
                </p>
              </div>
              <div className="p-3 bg-brand-100 rounded-xl">
                <Users className="h-6 w-6 text-black" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  Avg. Contribution
                </p>
                <p className="text-2xl font-bold text-black">
                  NRs.{" "}
                  {savings.length > 0
                    ? (totalSavings / savings.length).toFixed(2)
                    : "0"}
                </p>
              </div>
              <div className="p-3 bg-brand-100 rounded-xl">
                <TrendingUp className="h-6 w-6 text-black" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Add Contribution Form */}
        <Card className="border border-gray-200">
          <CardHeader className="bg-brand-50 border-b border-gray-200">
            <CardTitle className="flex items-center gap-3 text-black">
              <div className="p-2 bg-primary rounded-lg">
                <Plus className="h-5 w-5 text-black" />
              </div>
              Record New Contribution
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="member-name" className="text-black font-medium">
                  Member Name *
                </Label>
                <Input
                  id="member-name"
                  value={formData.memberName}
                  onChange={(e) =>
                    setFormData({ ...formData, memberName: e.target.value })
                  }
                  placeholder="Enter member name"
                  required
                  className="focus:ring-primary focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="contribution-amount"
                  className="text-black font-medium"
                >
                  Contribution Amount (NRs.) *
                </Label>
                <Input
                  id="contribution-amount"
                  type="number"
                  min="0"
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
                  className="focus:ring-primary focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="contribution-type"
                  className="text-black font-medium"
                >
                  Contribution Type *
                </Label>
                <Select
                  value={formData.contributionType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, contributionType: value })
                  }
                >
                  <SelectTrigger className="focus:ring-primary focus:border-primary">
                    <SelectValue placeholder="Select contribution type" />
                  </SelectTrigger>
                  <SelectContent>
                    {contributionTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                {isSubmitting ? "Recording..." : "Record Contribution"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Summary & Filters */}
        <div className="space-y-6">
          {/* Date Filter */}
          <Card className="border border-gray-200">
            <CardHeader className="bg-brand-50 border-b border-gray-200">
              <CardTitle className="text-black">Filter Contributions</CardTitle>
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

          {/* Top Members */}
          <Card className="border border-gray-200">
            <CardHeader className="bg-brand-50 border-b border-gray-200">
              <CardTitle className="flex items-center gap-3 text-black">
                <div className="p-2 bg-primary rounded-lg">
                  <Target className="h-5 w-5 text-black" />
                </div>
                Top Contributors
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {Object.keys(memberTotals).length === 0 ? (
                <div className="text-center py-8">
                  <PiggyBank className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">No contributions recorded yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(memberTotals)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 5)
                    .map(([member, amount]) => (
                      <div
                        key={member}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-primary rounded-full"></div>
                          <span className="font-medium text-black">
                            {member}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-black">
                            NRs. {amount.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500">
                            {((amount / totalSavings) * 100).toFixed(1)}%
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

      {/* Savings Table */}
      <Card className="border border-gray-200">
        <CardHeader className="bg-brand-50 border-b border-gray-200">
          <CardTitle className="flex items-center gap-3 text-black">
            <div className="p-2 bg-primary rounded-lg">
              <PiggyBank className="h-5 w-5 text-black" />
            </div>
<<<<<<< HEAD
            Contribution History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading contributions...</p>
            </div>
          ) : savings.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <p className="text-xl font-semibold text-gray-700 mb-2">
                No contributions found
              </p>
              <p className="text-gray-500">
                Record your first contribution using the form above!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-black">Date</TableHead>
                    <TableHead className="text-black">Member Name</TableHead>
                    <TableHead className="text-black">Amount</TableHead>
                    <TableHead className="text-black">Type</TableHead>
                    <TableHead className="text-black">Payment Method</TableHead>
                    <TableHead className="text-black">Remarks</TableHead>
                    <TableHead className="text-black">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {savings.map((saving) => (
                    <TableRow key={saving.id}>
                      <TableCell className="text-black">
                        {format(
                          new Date(saving.contribution_date),
                          "MMM dd, yyyy",
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-black">
                        {saving.member_name}
                      </TableCell>
                      <TableCell className="font-semibold text-black">
                        NRs. {saving.contribution_amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="border-primary text-primary"
                        >
                          {saving.contribution_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{saving.payment_mode}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-black">
                        {saving.remarks || "-"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteSaving(saving.id)}
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
                <div className="w-16 h-16 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full animate-spin mx-auto flex items-center justify-center mb-4">
                  <PiggyBank className="h-8 w-8 text-white" />
                </div>
                <p className="text-gray-600">Loading cooperative savings...</p>
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
                      <TableCell colSpan={2} className="font-bold text-right">
                        NRs. {totalSavings.toFixed(2)}
                      </TableCell>
                    </TableRow>
                    {savings.map((saving, index) => (
                      <TableRow
                        key={saving.id}
                        className="hover:bg-gradient-to-r hover:from-teal-50 hover:to-cyan-50 transition-all duration-200"
                        style={{ animationDelay: `${index * 50}ms` }}
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
                                  setSelectedSaving(saving);
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
                                      permanently delete the saving.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(saving.id)}
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
          {savings.length > 0 && (
            <div className="flex justify-center p-4 border-t border-gray-200">
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => onPageChange(page - 1)}
                  disabled={page === 1}
                  variant="outline"
                  className="hover:bg-gradient-to-r hover:from-teal-50 hover:to-cyan-50"
                >
                  Previous
                </Button>
                <span className="px-4 py-2 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg font-medium">
                  Page {page}
                </span>
                <Button
                  onClick={() => onPageChange(page + 1)}
                  disabled={savings.length < itemsPerPage}
                  variant="outline"
                  className="hover:bg-gradient-to-r hover:from-teal-50 hover:to-cyan-50"
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

export default CooperativeSavingsTab;
