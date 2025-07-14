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

interface Saving {
  id: string;
  contribution_amount: number;
  member_id: string;
  cycle_period: string | null;
  contribution_date: string;
}

const CooperativeSavingsTab = () => {
  const [savings, setSavings] = useState<Saving[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    contributionAmount: "",
    memberId: "",
    cyclePeriod: "",
    remarks: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { page, range, onPageChange, onRangeChange, itemsPerPage } =
    useTableControls();

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
      console.error("Error fetching cooperative savings:", error);
      toast.error("Failed to load cooperative savings");
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
          contribution_date: new Date().toISOString().split("T")[0],
        },
      ]);

      if (error) throw error;

      toast.success("Cooperative saving recorded successfully!");
      setFormData({
        contributionAmount: "",
        memberId: "",
        cyclePeriod: "",
        remarks: "",
      });
      fetchSavings();
    } catch (error) {
      console.error("Error recording cooperative saving:", error);
      toast.error("Failed to record cooperative saving");
    } finally {
      setIsSubmitting(false);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 relative overflow-hidden">
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
                  <PiggyBank className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-cyan-50 to-blue-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-cyan-600 font-medium">
                    Active Members
                  </p>
                  <p className="text-2xl font-bold text-cyan-800">
                    {uniqueMembers}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl text-white">
                  <Users className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">
                    Average Contribution
                  </p>
                  <p className="text-2xl font-bold text-blue-800">
                    NRs. {averageContribution.toFixed(2)}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl text-white">
                  <TrendingUp className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-indigo-600 font-medium">
                    Top Cycle
                  </p>
                  <p className="text-lg font-bold text-indigo-800 truncate">
                    {topPeriod ? topPeriod[0] : "None"}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl text-white">
                  <Clock className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Add Saving Form */}
          <Card className="bg-gradient-to-br from-white/90 to-teal-50/90 backdrop-blur-sm border-0 shadow-2xl hover:shadow-3xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Plus className="h-6 w-6" />
                </div>
                Record New Contribution
                <Sparkles className="h-5 w-5 animate-pulse" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
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
                    value={formData.contributionAmount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
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
                    <Input
                      id="memberId"
                      value={formData.memberId}
                      onChange={(e) =>
                        setFormData({ ...formData, memberId: e.target.value })
                      }
                      placeholder="Enter member ID"
                      required
                      className="border-blue-200 focus:border-blue-500 focus:ring-blue-500 h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="cyclePeriod"
                      className="text-sm font-medium text-gray-700 flex items-center gap-2"
                    >
                      <Clock className="h-4 w-4 text-purple-600" />
                      Cycle Period *
                    </Label>
                    <select
                      id="cyclePeriod"
                      value={formData.cyclePeriod}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          cyclePeriod: e.target.value,
                        })
                      }
                      required
                      className="w-full h-12 border border-purple-200 rounded-md px-3 bg-white focus:border-purple-500 focus:ring-purple-500"
                    >
                      <option value="">Select cycle period</option>
                      {cyclePeriods.map((period) => (
                        <option key={period} value={period}>
                          {period}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="remarks"
                    className="text-sm font-medium text-gray-700"
                  >
                    Additional Notes (Optional)
                  </Label>
                  <Textarea
                    id="remarks"
                    value={formData.remarks}
                    onChange={(e) =>
                      setFormData({ ...formData, remarks: e.target.value })
                    }
                    placeholder="Any additional notes or remarks"
                    rows={3}
                    className="border-gray-200 focus:border-gray-500 focus:ring-gray-500"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500 hover:from-teal-600 hover:via-cyan-600 hover:to-blue-600 text-white font-semibold shadow-lg transition-all duration-300 transform hover:scale-105"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      Recording Contribution...
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
          <Card className="bg-gradient-to-br from-white/90 to-blue-50/90 backdrop-blur-sm border-0 shadow-2xl hover:shadow-3xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-white/20 rounded-lg">
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
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
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default CooperativeSavingsTab;
