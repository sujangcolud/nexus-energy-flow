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
import {
  Zap,
  Plus,
  Trash2,
  Calendar as CalendarIcon,
  Battery,
  BatteryCharging,
  TrendingUp,
  Activity,
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
}

const ChargingTab = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ChargingSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { page, range, onPageChange, onRangeChange, itemsPerPage } =
    useTableControls();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] =
    useState<ChargingSession | null>(null);
  const [canEditTransactions, setCanEditTransactions] = useState(false);

  // Form state
  const [startPercentage, setStartPercentage] = useState(0);
  const [endPercentage, setEndPercentage] = useState(0);
  const [perPercentRate, setPerPercentRate] = useState(0);
  const [kcal, setKcal] = useState(0);
  const [perUnitRate, setPerUnitRate] = useState(0);
  const [paymentMode, setPaymentMode] = useState("");

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
      console.error("Error fetching sessions:", error);
      toast.error("Failed to load charging sessions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
<<<<<<< HEAD
    if (user) {
      fetchSessions();
=======
    fetchSessions();
    const canEdit = localStorage.getItem("canEditTransactions");
    if (canEdit) {
      setCanEditTransactions(JSON.parse(canEdit));
>>>>>>> origin/main
    }
  }, [user, page, range]);

  const calculateTotal = () => {
    const percentageAmount = (endPercentage - startPercentage) * perPercentRate;
    const unitAmount = kcal * perUnitRate;
    return percentageAmount + unitAmount;
  };

  const submitSession = async () => {
    if (endPercentage <= startPercentage) {
      toast.error("End percentage must be greater than start percentage!");
      return;
    }

    if (!paymentMode) {
      toast.error("Please select a payment method!");
      return;
    }

    setSubmitting(true);
    try {
      const totalAmount = calculateTotal();

      const { error } = await supabase.from("charging_sessions").insert({
        user_id: user!.id,
        start_percentage: startPercentage,
        end_percentage: endPercentage,
        per_percent_rate: perPercentRate,
        kcal: kcal,
        per_unit_rate: perUnitRate,
        total_amount: totalAmount,
        payment_mode: paymentMode,
        session_date: new Date().toISOString().split("T")[0],
      });

      if (error) throw error;

      toast.success("Charging session recorded successfully!");

      // Reset form
      setStartPercentage(0);
      setEndPercentage(0);
      setPerPercentRate(0);
      setKcal(0);
      setPerUnitRate(0);
      setPaymentMode("");

      fetchSessions();
    } catch (error) {
      console.error("Error submitting session:", error);
      toast.error("Failed to record charging session");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteSession = async (id: string) => {
    try {
      const { error } = await supabase
        .from("charging_sessions")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Session deleted successfully!");
      fetchSessions();
    } catch (error) {
      console.error("Error deleting session:", error);
      toast.error("Failed to delete session");
    }
  };

  const totalRevenue = sessions.reduce(
    (sum, session) => sum + session.total_amount,
    0,
  );
  const totalKcal = sessions.reduce((sum, session) => sum + session.kcal, 0);

  const logAction = async (
    action: string,
    record_id: string,
    details: any,
  ) => {
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
      toast.error("Failed to delete session");
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
      toast.error("Failed to update session");
    }
  };

  return (
<<<<<<< HEAD
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-primary rounded-xl">
          <Zap className="h-6 w-6 text-black" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-black">Energy Charging</h1>
          <p className="text-gray-600">
            Track charging sessions and energy consumption
=======
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50 relative overflow-hidden">
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
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-64 h-64 bg-gradient-to-r from-yellow-400/20 to-orange-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute top-1/3 right-20 w-80 h-80 bg-gradient-to-r from-orange-400/20 to-red-500/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
        <div
          className="absolute bottom-20 left-1/4 w-72 h-72 bg-gradient-to-r from-red-400/20 to-pink-500/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>
      </div>

      <div className="relative z-10 space-y-8 p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-yellow-500 to-orange-600 text-white shadow-xl animate-pulse">
              <Zap className="h-8 w-8" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-600 via-orange-600 to-red-600 bg-clip-text text-transparent">
              Energy Charging Station
            </h1>
            <Zap className="h-8 w-8 text-yellow-500 animate-bounce" />
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Track your electric vehicle charging sessions with precision and
            style
>>>>>>> origin/main
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  Total Sessions
                </p>
                <p className="text-2xl font-bold text-black">
                  {sessions.length}
                </p>
              </div>
              <div className="p-3 bg-brand-100 rounded-xl">
                <BatteryCharging className="h-6 w-6 text-black" />
              </div>
            </div>
<<<<<<< HEAD
=======
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
                          {canEditTransactions && (
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
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(session.id)}
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
>>>>>>> origin/main
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  Total Energy
                </p>
                <p className="text-2xl font-bold text-black">
                  {totalKcal} kCal
                </p>
              </div>
              <div className="p-3 bg-brand-100 rounded-xl">
                <Battery className="h-6 w-6 text-black" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  Total Revenue
                </p>
                <p className="text-2xl font-bold text-black">
                  NRs. {totalRevenue.toLocaleString()}
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
        {/* New Session Form */}
        <Card className="border border-gray-200">
          <CardHeader className="bg-brand-50 border-b border-gray-200">
            <CardTitle className="flex items-center gap-3 text-black">
              <div className="p-2 bg-primary rounded-lg">
                <Plus className="h-5 w-5 text-black" />
              </div>
              New Charging Session
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="start-percentage"
                  className="text-black font-medium"
                >
                  Start Percentage
                </Label>
                <Input
                  id="start-percentage"
                  type="number"
                  min="0"
                  max="100"
                  value={startPercentage}
                  onChange={(e) => setStartPercentage(Number(e.target.value))}
                  placeholder="0"
                  className="focus:ring-primary focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="end-percentage"
                  className="text-black font-medium"
                >
                  End Percentage
                </Label>
                <Input
                  id="end-percentage"
                  type="number"
                  min="0"
                  max="100"
                  value={endPercentage}
                  onChange={(e) => setEndPercentage(Number(e.target.value))}
                  placeholder="100"
                  className="focus:ring-primary focus:border-primary"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="per-percent-rate"
                className="text-black font-medium"
              >
                Rate per Percentage (NRs.)
              </Label>
              <Input
                id="per-percent-rate"
                type="number"
                min="0"
                step="0.01"
                value={perPercentRate}
                onChange={(e) => setPerPercentRate(Number(e.target.value))}
                placeholder="0.00"
                className="focus:ring-primary focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="kcal" className="text-black font-medium">
                  Energy (kCal)
                </Label>
                <Input
                  id="kcal"
                  type="number"
                  min="0"
                  value={kcal}
                  onChange={(e) => setKcal(Number(e.target.value))}
                  placeholder="0"
                  className="focus:ring-primary focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="per-unit-rate"
                  className="text-black font-medium"
                >
                  Rate per kCal (NRs.)
                </Label>
                <Input
                  id="per-unit-rate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={perUnitRate}
                  onChange={(e) => setPerUnitRate(Number(e.target.value))}
                  placeholder="0.00"
                  className="focus:ring-primary focus:border-primary"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-mode" className="text-black font-medium">
                Payment Method
              </Label>
              <Select value={paymentMode} onValueChange={setPaymentMode}>
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

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium text-black">Total Amount:</span>
                <span className="text-xl font-bold text-black">
                  NRs. {calculateTotal().toFixed(2)}
                </span>
              </div>
            </div>

            <Button
              onClick={submitSession}
              disabled={submitting}
              className="w-full bg-primary hover:bg-brand-400 text-black"
            >
              {submitting ? "Recording..." : "Record Session"}
            </Button>
          </CardContent>
        </Card>

        {/* Date Filter */}
        <Card className="border border-gray-200">
          <CardHeader className="bg-brand-50 border-b border-gray-200">
            <CardTitle className="text-black">Filter Sessions</CardTitle>
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

              <div className="pt-4 space-y-3 border-t border-gray-200">
                <h4 className="font-medium text-black">Quick Stats</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-gray-600">Avg. per Session</p>
                    <p className="font-semibold text-black">
                      {sessions.length > 0
                        ? `NRs. ${(totalRevenue / sessions.length).toFixed(2)}`
                        : "N/A"}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-gray-600">Avg. Energy</p>
                    <p className="font-semibold text-black">
                      {sessions.length > 0
                        ? `${(totalKcal / sessions.length).toFixed(1)} kCal`
                        : "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sessions History */}
      <Card className="border border-gray-200">
        <CardHeader className="bg-brand-50 border-b border-gray-200">
          <CardTitle className="flex items-center gap-3 text-black">
            <div className="p-2 bg-primary rounded-lg">
              <Activity className="h-5 w-5 text-black" />
            </div>
            Charging Sessions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading sessions...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8">
              <Zap className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <p className="text-xl font-semibold text-gray-700 mb-2">
                No charging sessions found
              </p>
              <p className="text-gray-500">
                Record your first charging session above!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-black">Date</TableHead>
                    <TableHead className="text-black">Battery Range</TableHead>
                    <TableHead className="text-black">Energy (kCal)</TableHead>
                    <TableHead className="text-black">Rate/% (NRs.)</TableHead>
                    <TableHead className="text-black">
                      Rate/kCal (NRs.)
                    </TableHead>
                    <TableHead className="text-black">Total (NRs.)</TableHead>
                    <TableHead className="text-black">Payment</TableHead>
                    <TableHead className="text-black">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell className="text-black">
                        {format(new Date(session.session_date), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell className="text-black">
                        {session.start_percentage}% → {session.end_percentage}%
                      </TableCell>
                      <TableCell className="text-black">
                        {session.kcal}
                      </TableCell>
                      <TableCell className="text-black">
                        {session.per_percent_rate}
                      </TableCell>
                      <TableCell className="text-black">
                        {session.per_unit_rate}
                      </TableCell>
                      <TableCell className="font-semibold text-black">
                        {session.total_amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="border-primary text-primary"
                        >
                          {session.payment_mode}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteSession(session.id)}
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

export default ChargingTab;
