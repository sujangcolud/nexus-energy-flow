import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { extractErrorMessage, logError } from "@/utils/errorHandling";
import { useIsMobile } from "@/hooks/use-mobile";
import { Label } from "@/components/ui/label";
import AllTimeTotalDisplay from "@/components/AllTimeTotalDisplay";
import {
  Zap,
  Plus,
  Trash2,
  Calendar as CalendarIcon,
  Battery,
  BatteryCharging,
  TrendingUp,
  Activity,
  Sparkles,
} from "lucide-react";
import { DateRange } from "react-day-picker";
import TransactionDatePicker from "@/components/ui/transaction-date-picker";
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

interface ChargingSession {
  id: string;
  start_percentage: number;
  end_percentage: number;
  per_percent_rate: number;
  kcal: number;
  per_unit_rate: number;
  total_amount: number;
  payment_mode: string;
  session_date: string;
  created_at: string;
  category: string;
}

interface Category {
  id: string;
  name: string;
  created_at: string;
}

const ChargingTab = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ChargingSession[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { page, range, onPageChange, onRangeChange, itemsPerPage } =
    useTableControls();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] =
    useState<ChargingSession | null>(null);
  const [canEditTransactions, setCanEditTransactions] = useState(false);
  const [canAddCategory, setCanAddCategory] = useState(false);
  const [newCategory, setNewCategory] = useState("");

  // Form state
  const [startPercentage, setStartPercentage] = useState(0);
  const [endPercentage, setEndPercentage] = useState(0);
  const [perPercentRate, setPerPercentRate] = useState(0);
  const [kcal, setKcal] = useState(0);
  const [perUnitRate, setPerUnitRate] = useState(0);
  const [paymentMode, setPaymentMode] = useState("");
  const [category, setCategory] = useState("");
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const isMobile = useIsMobile();

  const paymentModes = ["Cash", "Esewa", "Fonepay", "Bank", "Cheque", "Credit"];

  const fetchSessions = async () => {
    if (!user) return;

    setLoading(true);
    try {
      let query = supabase
        .from("charging_sessions")
        .select("*", { count: "exact" })
        .eq("user_id", user.id);

      if (range?.from) {
        query = query.gte("session_date", format(range.from, "yyyy-MM-dd"));
      }
      if (range?.to) {
        query = query.lte("session_date", format(range.to, "yyyy-MM-dd"));
      }

      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range((page - 1) * itemsPerPage, page * itemsPerPage - 1);

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error("Error fetching charging sessions:", error);

      const errorMessage = extractErrorMessage(error);
      logError("fetch charging sessions", error);
      toast.error(`Failed to load charging sessions: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("charging_categories")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      logError("fetching categories", error);
      toast.error(`Failed to load categories: ${extractErrorMessage(error)}`);
    }
  };

  useEffect(() => {
    fetchSessions();
    fetchCategories();
    // Default to true if no setting exists
    const canEdit = localStorage.getItem("canEditTransactions");
    setCanEditTransactions(canEdit === null ? true : JSON.parse(canEdit));
    
    const canAdd = localStorage.getItem("canAddChargingCategory");
    setCanAddCategory(canAdd === null ? true : JSON.parse(canAdd));
  }, [user, page, range]);

  const calculateChargedPercentage = () => {
    return Math.max(0, endPercentage - startPercentage);
  };

  const calculatePercentageCost = () => {
    return calculateChargedPercentage() * perPercentRate;
  };

  const calculateKcalCost = () => {
    return kcal * perUnitRate;
  };

  const calculateTotalAmount = () => {
    return calculatePercentageCost() + calculateKcalCost();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("User not authenticated");
      return;
    }

    if (endPercentage <= startPercentage) {
      toast.error("End percentage must be greater than start percentage");
      return;
    }

    if (!paymentMode) {
      toast.error("Please select a payment mode");
      return;
    }

    setSubmitting(true);
    try {
      const totalAmount = calculateTotalAmount();

      const sessionDate = transactionDate;

      // Prepare session data with safe category handling
      const sessionData: any = {
        user_id: user.id,
        start_percentage: startPercentage,
        end_percentage: endPercentage,
        per_percent_rate: perPercentRate,
        kcal: kcal,
        per_unit_rate: perUnitRate,
        total_amount: totalAmount,
        payment_mode: paymentMode,
        session_date: sessionDate,
        date: sessionDate, // Add date field for compatibility
      };

      // Only add category if it's selected, not "none", and exists in categories
      if (category && category.trim() !== "" && category !== "none" && categories.some(cat => cat.name === category)) {
        sessionData.category = category;
      }

      const { error } = await supabase.from("charging_sessions").insert(sessionData);

      if (error) throw error;

      toast.success("Charging session recorded successfully!");

      // Reset form
      setStartPercentage(0);
      setEndPercentage(0);
      setPerPercentRate(0);
      setKcal(0);
      setPerUnitRate(0);
      setPaymentMode("");
      setCategory("");

      fetchSessions();
    } catch (error) {
      console.error("Error saving charging session:", error);

      const errorMessage = extractErrorMessage(error);
      logError("insert charging session", error);
      toast.error(`Failed to save charging session: ${errorMessage}`);
    } finally {
      setSubmitting(false);
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
        .from("charging_categories")
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
        .from("charging_categories")
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

  const totalSessionCost = sessions.reduce(
    (sum, session) => sum + session.total_amount,
    0,
  );
  const averageSessionCost =
    sessions.length > 0 ? totalSessionCost / sessions.length : 0;
  const totalKcal = sessions.reduce((sum, session) => sum + session.kcal, 0);

  const logAction = async (action: string, record_id: string, details: any) => {
    if (!user) return;
    await supabase.from("logs").insert({
      user_id: user.id,
      action,
      table_name: "charging_sessions",
      record_id,
      details,
    });
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("charging_sessions")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Session deleted successfully!");
      logAction("delete", id, { id });
      fetchSessions();
    } catch (error) {
      console.error("Error deleting session:", error);

      const errorMessage = extractErrorMessage(error);
      logError("delete charging session", error);
      toast.error(`Failed to delete charging session: ${errorMessage}`);
    }
  };

  const handleUpdate = async () => {
    if (!selectedSession) return;

    try {
      const { error } = await supabase
        .from("charging_sessions")
        .update(selectedSession)
        .eq("id", selectedSession.id);

      if (error) throw error;

      toast.success("Session updated successfully!");
      logAction("update", selectedSession.id, selectedSession);
      setIsEditDialogOpen(false);
      fetchSessions();
    } catch (error) {
      console.error("Error updating session:", error);

      const errorMessage = extractErrorMessage(error);
      logError("update charging session", error);
      toast.error(`Failed to update charging session: ${errorMessage}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Charging Session</DialogTitle>
          </DialogHeader>
          {selectedSession && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="editStartPercentage">Start Percentage</Label>
                <Input
                  id="editStartPercentage"
                  type="number"
                  value={selectedSession.start_percentage}
                  onChange={(e) =>
                    setSelectedSession({
                      ...selectedSession,
                      start_percentage: parseInt(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="editEndPercentage">End Percentage</Label>
                <Input
                  id="editEndPercentage"
                  type="number"
                  value={selectedSession.end_percentage}
                  onChange={(e) =>
                    setSelectedSession({
                      ...selectedSession,
                      end_percentage: parseInt(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="editPerPercentRate">Per Percent Rate</Label>
                <Input
                  id="editPerPercentRate"
                  type="number"
                  value={selectedSession.per_percent_rate}
                  onChange={(e) =>
                    setSelectedSession({
                      ...selectedSession,
                      per_percent_rate: parseFloat(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="editKcal">kCal</Label>
                <Input
                  id="editKcal"
                  type="number"
                  value={selectedSession.kcal}
                  onChange={(e) =>
                    setSelectedSession({
                      ...selectedSession,
                      kcal: parseFloat(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="editPerUnitRate">Per Unit Rate</Label>
                <Input
                  id="editPerUnitRate"
                  type="number"
                  value={selectedSession.per_unit_rate}
                  onChange={(e) =>
                    setSelectedSession({
                      ...selectedSession,
                      per_unit_rate: parseFloat(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="editTotalAmount">Total Amount</Label>
                <Input
                  id="editTotalAmount"
                  type="number"
                  value={selectedSession.total_amount}
                  onChange={(e) =>
                    setSelectedSession({
                      ...selectedSession,
                      total_amount: parseFloat(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="editPaymentMode">Payment Mode</Label>
                <Input
                  id="editPaymentMode"
                  value={selectedSession.payment_mode}
                  onChange={(e) =>
                    setSelectedSession({
                      ...selectedSession,
                      payment_mode: e.target.value,
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

      <div className="space-y-6 p-4 sm:p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-md bg-primary text-primary-foreground">
              <Zap className="h-4 w-4" />
            </div>
            <h1 className="text-xl font-semibold text-foreground">
              Charging Sessions
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Track and manage EV charging sessions
          </p>
        </div>

        {/* All-Time Total Display */}
        <AllTimeTotalDisplay type="charging" className="mb-6" />

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-card border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Total Revenue</p>
                  <p className="text-lg font-semibold text-foreground">
                    NRs. {totalSessionCost.toFixed(2)}
                  </p>
                </div>
                <div className="p-2 bg-muted rounded-md">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Total Sessions</p>
                  <p className="text-lg font-semibold text-foreground">{sessions.length}</p>
                </div>
                <div className="p-2 bg-muted rounded-md">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Avg. Cost</p>
                  <p className="text-lg font-semibold text-foreground">
                    NRs. {averageSessionCost.toFixed(2)}
                  </p>
                </div>
                <div className="p-2 bg-muted rounded-md">
                  <Battery className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Total kCal</p>
                  <p className="text-lg font-semibold text-foreground">{totalKcal.toFixed(2)}</p>
                </div>
                <div className="p-2 bg-muted rounded-md">
                  <BatteryCharging className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Charging Session Form */}
          <Card className="bg-gradient-to-br from-white/90 to-yellow-50/90 backdrop-blur-sm border-0 shadow-2xl hover:shadow-3xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Zap className="h-6 w-6" />
                </div>
                New Charging Session
                <Sparkles className="h-5 w-5 animate-pulse" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Battery Percentage Section */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Battery className="h-4 w-4 text-yellow-600" />
                      Start Battery %
                    </label>
                    <Input
                      type="number"
                      value={startPercentage}
                      onChange={(e) =>
                        setStartPercentage(Number(e.target.value))
                      }
                      placeholder="0"
                      min="0"
                      max="100"
                      required
                      className="border-yellow-200 focus:border-yellow-500 focus:ring-yellow-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <BatteryCharging className="h-4 w-4 text-green-600" />
                      End Battery %
                    </label>
                    <Input
                      type="number"
                      value={endPercentage}
                      onChange={(e) => setEndPercentage(Number(e.target.value))}
                      placeholder="0"
                      min="0"
                      max="100"
                      required
                      className="border-green-200 focus:border-green-500 focus:ring-green-500"
                    />
                  </div>
                </div>

                {/* Charging Progress Visualization */}
                {startPercentage > 0 && endPercentage > startPercentage && (
                  <div className="p-4 bg-gradient-to-r from-yellow-50 to-green-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">
                        Charging Progress
                      </span>
                      <span className="text-lg font-bold bg-gradient-to-r from-yellow-600 to-green-600 bg-clip-text text-transparent">
                        +{calculateChargedPercentage()}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-yellow-500 to-green-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${calculateChargedPercentage()}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Rates Section */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Rate per %
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={perPercentRate}
                      onChange={(e) =>
                        setPerPercentRate(Number(e.target.value))
                      }
                      placeholder="0.00"
                      min="0"
                      required
                      className="border-orange-200 focus:border-orange-500 focus:ring-orange-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      kCal Consumed
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={kcal}
                      onChange={(e) => setKcal(Number(e.target.value))}
                      placeholder="0.00"
                      min="0"
                      required
                      className="border-red-200 focus:border-red-500 focus:ring-red-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Rate per kCal
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={perUnitRate}
                      onChange={(e) => setPerUnitRate(Number(e.target.value))}
                      placeholder="0.00"
                      min="0"
                      required
                      className="border-purple-200 focus:border-purple-500 focus:ring-purple-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Payment Mode
                    </label>
                    <Select
                      value={paymentMode}
                      onValueChange={setPaymentMode}
                      required
                    >
                      <SelectTrigger className="border-blue-200 focus:border-blue-500 focus:ring-blue-500">
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
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Category (Optional)
                  </label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="border-blue-200 focus:border-blue-500 focus:ring-blue-500">
                      <SelectValue placeholder="Select category (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None / Skip Category</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))}
                      {categories.length === 0 && (
                        <SelectItem value="no-categories" disabled>
                          No categories available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Transaction Date */}
                <TransactionDatePicker
                  selectedDate={transactionDate}
                  onDateChange={setTransactionDate}
                  label="Charging Session Date"
                  className="mb-4"
                />

                {/* Cost Calculation Display */}
                {(startPercentage > 0 || kcal > 0) && (
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                    <h4 className="font-semibold text-gray-800 mb-3">
                      Cost Breakdown
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Percentage Cost:</span>
                        <span className="font-medium">
                          NRs. {calculatePercentageCost().toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>kCal Cost:</span>
                        <span className="font-medium">
                          NRs. {calculateKcalCost().toFixed(2)}
                        </span>
                      </div>
                      <div className="border-t border-blue-200 pt-2 flex justify-between font-bold text-lg">
                        <span>Total Amount:</span>
                        <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                          NRs. {calculateTotalAmount().toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-12 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 hover:from-yellow-600 hover:via-orange-600 hover:to-red-600 text-white font-semibold shadow-lg transition-all duration-300 transform hover:scale-105"
                >
                  {submitting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      Recording Session...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Plus className="h-5 w-5" />
                      Record Charging Session
                    </div>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Recent Sessions Preview */}
          <Card className="bg-gradient-to-br from-white/90 to-blue-50/90 backdrop-blur-sm border-0 shadow-2xl hover:shadow-3xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Activity className="h-6 w-6" />
                </div>
                Recent Sessions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {sessions.length === 0 ? (
                <div className="text-center py-8">
                  <BatteryCharging className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500 text-lg font-medium">
                    No charging sessions yet
                  </p>
                  <p className="text-gray-400">
                    Record your first session to get started!
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {sessions.slice(0, 5).map((session, index) => (
                    <div
                      key={session.id}
                      className="p-4 bg-gradient-to-r from-white to-blue-50 rounded-lg border border-blue-100 hover:shadow-md transition-all duration-200"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg text-white">
                            <Zap className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">
                              {session.start_percentage}% →{" "}
                              {session.end_percentage}%
                            </p>
                            <p className="text-sm text-gray-500">
                              {format(
                                new Date(session.session_date),
                                "MMM dd, yyyy",
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-blue-600">
                            NRs. {session.total_amount.toFixed(2)}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {session.payment_mode}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
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
                    <Zap className="h-6 w-6" />
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

        {/* Charging History */}
        <Card className="bg-gradient-to-br from-white/90 to-gray-50/90 backdrop-blur-sm border-0 shadow-2xl">
          <CardHeader className="border-b border-gray-200/50 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent">
                Charging History
              </CardTitle>
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full sm:w-[280px] justify-start text-left font-normal hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 text-xs sm:text-sm",
                        !range && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                      {range?.from ? (
                        range.to ? (
                          <>
                            {isMobile
                              ? `${format(range.from, "MMM dd")} - ${format(range.to, "MMM dd")}`
                              : `${format(range.from, "LLL dd, y")} - ${format(range.to, "LLL dd, y")}`}
                          </>
                        ) : (
                          format(
                            range.from,
                            isMobile ? "MMM dd, y" : "LLL dd, y",
                          )
                        )
                      ) : (
                        <span className="truncate">
                          {isMobile ? "Pick dates" : "Pick a date range"}
                        </span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto p-0"
                    align="end"
                    side="bottom"
                  >
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={range?.from}
                      selected={range}
                      onSelect={onRangeChange}
                      numberOfMonths={isMobile ? 1 : 2}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-10">
                <div className="w-16 h-16 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full animate-spin mx-auto flex items-center justify-center mb-4">
                  <Zap className="h-8 w-8 text-white" />
                </div>
                <p className="text-gray-600">Loading charging sessions...</p>
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-12">
                <BatteryCharging className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <p className="text-xl font-semibold text-gray-700 mb-2">
                  No sessions found
                </p>
                <p className="text-gray-500">
                  Start recording your charging sessions to see them here.
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
                        Battery Range
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        Energy (kCal)
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        Rates
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        Total Amount
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        Payment
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={4} className="font-bold">
                        Total
                      </TableCell>
                      <TableCell colSpan={2} className="font-bold text-right">
                        NRs. {totalSessionCost.toFixed(2)}
                      </TableCell>
                    </TableRow>
                    {sessions.map((session, index) => (
                      <TableRow
                        key={session.id}
                        className="hover:bg-gradient-to-r hover:from-yellow-50 hover:to-orange-50 transition-all duration-200"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <TableCell className="font-medium">
                          {format(
                            new Date(session.session_date),
                            "MMM dd, yyyy",
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Battery className="h-4 w-4 text-red-500" />
                            <span>{session.start_percentage}%</span>
                            <span className="text-gray-400">→</span>
                            <BatteryCharging className="h-4 w-4 text-green-500" />
                            <span>{session.end_percentage}%</span>
                          </div>
                        </TableCell>
                        <TableCell>{session.kcal} kCal</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>Per %: NRs. {session.per_percent_rate}</div>
                            <div>Per kCal: NRs. {session.per_unit_rate}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-bold text-lg bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                            NRs. {session.total_amount.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200"
                          >
                            {session.payment_mode}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedSession(session);
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
                                    permanently delete the session.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>
                                    Cancel
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(session.id)}
                                  >
                                    Continue
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
          {sessions.length > 0 && (
            <div className="flex justify-center p-4 border-t border-gray-200">
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => onPageChange(page - 1)}
                  disabled={page === 1}
                  variant="outline"
                  className="hover:bg-gradient-to-r hover:from-yellow-50 hover:to-orange-50"
                >
                  Previous
                </Button>
                <span className="px-4 py-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg font-medium">
                  Page {page}
                </span>
                <Button
                  onClick={() => onPageChange(page + 1)}
                  disabled={sessions.length < itemsPerPage}
                  variant="outline"
                  className="hover:bg-gradient-to-r hover:from-yellow-50 hover:to-orange-50"
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

export default ChargingTab;
