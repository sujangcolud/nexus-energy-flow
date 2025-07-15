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
  Plus,
  Trash2,
  HandCoins,
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

  const contributionTypes = [
    "Monthly Contribution",
    "Special Contribution",
    "Bonus Contribution",
    "Emergency Fund",
    "Development Fund",
    "Other",
  ];

  const paymentModes = [
    "Cash",
    "Esewa",
    "Fonepay",
    "Bank Transfer",
    "Cheque",
    "Mobile Banking",
    "Other",
  ];

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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CooperativeSavingsTab;
