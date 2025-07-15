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
  Edit,
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
  session_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  energy_consumed: number;
  rate_per_kwh: number;
  total_amount: number;
  payment_mode: string;
  created_at: string;
}

const ChargingTab = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ChargingSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] =
    useState<ChargingSession | null>(null);
  const [canEditTransactions, setCanEditTransactions] = useState(false);
  const { page, range, onPageChange, onRangeChange, itemsPerPage } =
    useTableControls();

  // Form data
  const [formData, setFormData] = useState({
    session_date: new Date().toISOString().split("T")[0],
    start_time: "",
    end_time: "",
    energy_consumed: "",
    rate_per_kwh: "15",
    payment_mode: "",
  });

  const paymentModes = ["Cash", "Esewa", "Fonepay", "Bank", "Cheque", "Credit"];

  const fetchSessions = async () => {
    if (!user) return;

    setLoading(true);
    try {
      let query = supabase
        .from("charging_sessions")
        .select("*")
        .eq("user_id", user.id);

      if (range?.from) {
        query = query.gte("session_date", format(range.from, "yyyy-MM-dd"));
      }
      if (range?.to) {
        query = query.lte("session_date", format(range.to, "yyyy-MM-dd"));
      }

      const { data, error } = await query
        .order("created_at", { ascending: false })
        .range((page - 1) * itemsPerPage, page * itemsPerPage - 1);

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error("Error fetching charging sessions:", error);
      toast.error("Failed to load charging sessions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSessions();
    }
    const canEdit = localStorage.getItem("canEditTransactions");
    if (canEdit) {
      setCanEditTransactions(JSON.parse(canEdit));
    }
  }, [user, page, range]);

  const calculateDuration = (startTime: string, endTime: string): number => {
    if (!startTime || !endTime) return 0;

    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);

    if (end < start) {
      end.setDate(end.getDate() + 1);
    }

    return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (
      !formData.start_time ||
      !formData.end_time ||
      !formData.energy_consumed ||
      !formData.payment_mode
    ) {
      toast.error("Please fill all required fields");
      return;
    }

    setSubmitting(true);
    try {
      const duration = calculateDuration(
        formData.start_time,
        formData.end_time,
      );
      const energyConsumed = parseFloat(formData.energy_consumed);
      const ratePerKwh = parseFloat(formData.rate_per_kwh);
      const totalAmount = energyConsumed * ratePerKwh;

      const { error } = await supabase.from("charging_sessions").insert({
        user_id: user.id,
        session_date: formData.session_date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        duration_minutes: duration,
        energy_consumed: energyConsumed,
        rate_per_kwh: ratePerKwh,
        total_amount: totalAmount,
        payment_mode: formData.payment_mode,
      });

      if (error) throw error;

      toast.success("Charging session added successfully!");
      setFormData({
        session_date: new Date().toISOString().split("T")[0],
        start_time: "",
        end_time: "",
        energy_consumed: "",
        rate_per_kwh: "15",
        payment_mode: "",
      });
      fetchSessions();
    } catch (error) {
      console.error("Error adding charging session:", error);
      toast.error("Failed to add charging session");
    } finally {
      setSubmitting(false);
    }
  };

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

      toast.success("Charging session deleted successfully!");
      logAction("delete", id, { id });
      fetchSessions();
    } catch (error) {
      console.error("Error deleting charging session:", error);
      toast.error("Failed to delete charging session");
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

      toast.success("Charging session updated successfully!");
      logAction("update", selectedSession.id, selectedSession);
      setIsEditDialogOpen(false);
      fetchSessions();
    } catch (error) {
      console.error("Error updating charging session:", error);
      toast.error("Failed to update charging session");
    }
  };

  const totalEnergyConsumed = sessions.reduce(
    (acc, session) => acc + Number(session.energy_consumed),
    0,
  );
  const totalRevenue = sessions.reduce(
    (acc, session) => acc + Number(session.total_amount),
    0,
  );
  const averageSessionDuration =
    sessions.length > 0
      ? sessions.reduce(
          (acc, session) => acc + Number(session.duration_minutes),
          0,
        ) / sessions.length
      : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-primary rounded-xl">
          <Zap className="h-6 w-6 text-black" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-black">
            EV Charging Management
          </h1>
          <p className="text-gray-600">
            Track energy consumption and charging sessions
          </p>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Charging Session</DialogTitle>
          </DialogHeader>
          {selectedSession && (
            <div className="space-y-4">
              <div>
                <Label>Session Date</Label>
                <Input
                  type="date"
                  value={selectedSession.session_date}
                  onChange={(e) =>
                    setSelectedSession({
                      ...selectedSession,
                      session_date: e.target.value,
                    })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={selectedSession.start_time}
                    onChange={(e) =>
                      setSelectedSession({
                        ...selectedSession,
                        start_time: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    value={selectedSession.end_time}
                    onChange={(e) =>
                      setSelectedSession({
                        ...selectedSession,
                        end_time: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div>
                <Label>Energy Consumed (kWh)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={selectedSession.energy_consumed}
                  onChange={(e) =>
                    setSelectedSession({
                      ...selectedSession,
                      energy_consumed: parseFloat(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label>Rate per kWh (NRs.)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={selectedSession.rate_per_kwh}
                  onChange={(e) =>
                    setSelectedSession({
                      ...selectedSession,
                      rate_per_kwh: parseFloat(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label>Payment Mode</Label>
                <Select
                  value={selectedSession.payment_mode}
                  onValueChange={(value) =>
                    setSelectedSession({
                      ...selectedSession,
                      payment_mode: value,
                    })
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
            </div>
          )}
          <DialogFooter>
            <Button onClick={handleUpdate}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  Total Energy
                </p>
                <p className="text-2xl font-bold text-black">
                  {totalEnergyConsumed.toFixed(2)} kWh
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <BatteryCharging className="h-6 w-6 text-green-600" />
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
                  NRs. {totalRevenue.toFixed(2)}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  Avg Duration
                </p>
                <p className="text-2xl font-bold text-black">
                  {averageSessionDuration.toFixed(0)} min
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-xl">
                <Activity className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Add New Session Form */}
        <Card className="border border-gray-200">
          <CardHeader className="bg-brand-50 border-b border-gray-200">
            <CardTitle className="text-black">
              Add New Charging Session
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-black">Session Date</Label>
                <Input
                  type="date"
                  value={formData.session_date}
                  onChange={(e) =>
                    setFormData({ ...formData, session_date: e.target.value })
                  }
                  className="focus:ring-primary focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-black">Start Time</Label>
                  <Input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) =>
                      setFormData({ ...formData, start_time: e.target.value })
                    }
                    className="focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <Label className="text-black">End Time</Label>
                  <Input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) =>
                      setFormData({ ...formData, end_time: e.target.value })
                    }
                    className="focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <Label className="text-black">Energy Consumed (kWh)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Enter energy consumed"
                  value={formData.energy_consumed}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      energy_consumed: e.target.value,
                    })
                  }
                  className="focus:ring-primary focus:border-primary"
                />
              </div>

              <div>
                <Label className="text-black">Rate per kWh (NRs.)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Enter rate per kWh"
                  value={formData.rate_per_kwh}
                  onChange={(e) =>
                    setFormData({ ...formData, rate_per_kwh: e.target.value })
                  }
                  className="focus:ring-primary focus:border-primary"
                />
              </div>

              <div>
                <Label className="text-black">Payment Mode</Label>
                <Select
                  value={formData.payment_mode}
                  onValueChange={(value) =>
                    setFormData({ ...formData, payment_mode: value })
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

              {formData.start_time && formData.end_time && (
                <div className="p-3 bg-brand-50 rounded-lg">
                  <p className="text-sm text-black">
                    Duration:{" "}
                    {calculateDuration(formData.start_time, formData.end_time)}{" "}
                    minutes
                  </p>
                  {formData.energy_consumed && formData.rate_per_kwh && (
                    <p className="text-sm text-black">
                      Total Amount: NRs.{" "}
                      {(
                        parseFloat(formData.energy_consumed) *
                        parseFloat(formData.rate_per_kwh)
                      ).toFixed(2)}
                    </p>
                  )}
                </div>
              )}

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-primary hover:bg-brand-400 text-black"
              >
                {submitting ? "Adding..." : "Add Session"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Recent Sessions */}
        <Card className="border border-gray-200">
          <CardHeader className="bg-brand-50 border-b border-gray-200">
            <CardTitle className="text-black">Charging Sessions</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-gray-500 mt-2">Loading sessions...</p>
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-8">
                <Battery className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No charging sessions found</p>
                <p className="text-sm text-gray-400">
                  Add your first session to get started!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Energy</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment</TableHead>
                      {canEditTransactions && <TableHead>Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell>
                          {format(
                            new Date(session.session_date),
                            "MMM dd, yyyy",
                          )}
                        </TableCell>
                        <TableCell>{session.duration_minutes} min</TableCell>
                        <TableCell>{session.energy_consumed} kWh</TableCell>
                        <TableCell className="font-medium">
                          NRs. {Number(session.total_amount).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {session.payment_mode}
                          </Badge>
                        </TableCell>
                        {canEditTransactions && (
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedSession(session);
                                  setIsEditDialogOpen(true);
                                }}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="outline">
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Are you sure?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This action cannot be undone. This will
                                      permanently delete the charging session.
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
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChargingTab;
