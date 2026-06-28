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
import { logError } from "@/utils/errorHandling";
import {
  Receipt,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRightLeft,
  FileText,
  Upload,
  Edit2,
  Save,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface Employee {
  id: string;
  full_name: string;
}

interface StaffAdvance {
  id: string;
  amount: number;
  employees: Employee;
  status: string;
}

interface Settlement {
  id: string;
  advance_id: string;
  amount: number;
  settlement_type: string;
  settlement_date: string;
  status: string;
  description: string;
  staff_advances: StaffAdvance;
}

const AdvanceSettlementTab = () => {
  const { user } = useAuth();
  const [activeAdvances, setActiveAdvances] = useState<StaffAdvance[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editDialog, setEditDialog] = useState<{open: boolean, settlement: Settlement | null}>({
    open: false,
    settlement: null
  });

  const [formData, setFormData] = useState({
    advanceId: "",
    amount: "",
    settlementType: "Expense Bill",
    expenseType: "",
    description: "",
    date: format(new Date(), "yyyy-MM-dd"),
  });

  useEffect(() => {
    fetchActiveAdvances();
    fetchSettlements();
  }, []);

  const fetchActiveAdvances = async () => {
    try {
      const { data, error } = await supabase
        .from("staff_advances")
        .select("*, employees(id, full_name)")
        .in("status", ["Disbursed", "Partially Settled"]);
      if (error) throw error;
      setActiveAdvances(data || []);
    } catch (error) {
      logError("fetching active advances", error);
    }
  };

  const fetchSettlements = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("advance_settlements")
        .select("*, staff_advances(amount, employees(full_name))")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setSettlements(data || []);
    } catch (error) {
      logError("fetching settlements", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.advanceId || !formData.amount) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("advance_settlements").insert({
        advance_id: formData.advanceId,
        amount: parseFloat(formData.amount),
        settlement_type: formData.settlementType,
        expense_type: formData.expenseType,
        description: formData.description,
        settlement_date: formData.date,
        status: "Pending Verification",
      });

      if (error) throw error;

      toast.success("Settlement submitted for verification");
      setFormData({
        advanceId: "",
        amount: "",
        settlementType: "Expense Bill",
        expenseType: "",
        description: "",
        date: format(new Date(), "yyyy-MM-dd"),
      });
      fetchSettlements();
    } catch (error) {
      logError("submitting settlement", error);
      toast.error("Submission failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async (id: string, advanceId: string, amount: number, status: string) => {
    try {
      const { error } = await supabase.rpc("process_advance_settlement", {
        p_settlement_id: id,
        p_verifier_remarks: "Approved via dashboard",
        p_status: status
      });

      if (error) throw error;

      toast.success(`Settlement ${status.toLowerCase()} and balances updated`);
      fetchSettlements();
      fetchActiveAdvances();
    } catch (error) {
      logError("verifying settlement", error);
      toast.error(`Verification failed: ${error.message}`);
    }
  };

  const handleDeleteSettlement = async (id: string) => {
    if (!confirm("Are you sure you want to delete this settlement?")) return;
    try {
      const { error } = await supabase
        .from("advance_settlements")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      toast.success("Settlement deleted");
      fetchSettlements();
    } catch (error) {
      logError("deleting settlement", error);
      toast.error("Delete failed");
    }
  };

  const handleUpdateSettlement = async () => {
    if (!editDialog.settlement) return;
    try {
      const { id, amount, settlement_type, expense_type, description, settlement_date, status } = editDialog.settlement;

      const { error } = await supabase
        .from("advance_settlements")
        .update({
          amount,
          settlement_type,
          expense_type,
          description,
          settlement_date,
          status
        })
        .eq("id", id);

      if (error) throw error;
      toast.success("Settlement updated");
      setEditDialog({ open: false, settlement: null });
      fetchSettlements();
    } catch (error) {
      logError("updating settlement", error);
      toast.error("Update failed");
    }
  };

  return (
    <div className="min-h-screen bg-background p-2 md:p-6 pb-24 md:pb-6">
      <div className="space-y-6">
        <div className="bg-primary/5 p-4 rounded-3xl mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600 rounded-xl text-white">
              <Receipt className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Advance Settlement</h1>
              <p className="text-xs text-muted-foreground">Settle outstanding staff advances with expense bills</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           <Card className="lg:col-span-1 rounded-3xl border-none shadow-sm overflow-hidden">
             <CardHeader className="bg-emerald-600 text-white p-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <ArrowRightLeft className="h-5 w-5" /> Submit Settlement
                </CardTitle>
             </CardHeader>
             <CardContent className="p-4 space-y-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                   <div className="space-y-2">
                     <Label>Active Advance *</Label>
                     <Select value={formData.advanceId} onValueChange={(v) => setFormData({...formData, advanceId: v})}>
                       <SelectTrigger className="rounded-xl h-11">
                         <SelectValue placeholder="Select Advance" />
                       </SelectTrigger>
                       <SelectContent>
                         {activeAdvances.map((adv) => (
                           <SelectItem key={adv.id} value={adv.id}>
                             {adv.employees?.full_name} (रु {adv.amount.toLocaleString()})
                           </SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                   </div>

                   <div className="space-y-2">
                     <Label>Settlement Amount *</Label>
                     <Input
                        type="number"
                        value={formData.amount}
                        onChange={(e) => setFormData({...formData, amount: e.target.value})}
                        placeholder="0.00"
                        className="rounded-xl h-11 font-bold text-lg"
                      />
                   </div>

                   <div className="space-y-2">
                     <Label>Expense Category</Label>
                     <Input
                        value={formData.expenseType}
                        onChange={(e) => setFormData({...formData, expenseType: e.target.value})}
                        placeholder="e.g. Travel, Food"
                        className="rounded-xl"
                      />
                   </div>

                   <div className="space-y-2">
                     <Label>Description</Label>
                     <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        placeholder="Bill details..."
                        className="rounded-xl"
                      />
                   </div>

                   <div className="space-y-2">
                      <Label>Bill/Receipt Attachment</Label>
                      <div className="border-2 border-dashed border-muted rounded-xl p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors">
                        <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-xs text-muted-foreground">Click or drag bill images here</p>
                      </div>
                   </div>

                   <Button type="submit" disabled={isSubmitting} className="w-full h-12 rounded-xl text-lg font-bold mt-4 bg-emerald-600 shadow-lg">
                      {isSubmitting ? "Submitting..." : "Submit for Verification"}
                   </Button>
                </form>
             </CardContent>
           </Card>

           <Card className="lg:col-span-2 rounded-3xl border-none shadow-sm overflow-hidden">
             <CardHeader className="p-4 bg-muted/50 border-b">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Clock className="h-5 w-5 text-emerald-600" /> Recent Settlements
                </CardTitle>
             </CardHeader>
             <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {settlements.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>{format(new Date(s.settlement_date), "MMM dd, yyyy")}</TableCell>
                        <TableCell className="font-medium">{s.staff_advances?.employees?.full_name}</TableCell>
                        <TableCell className="font-bold">रु {s.amount.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={s.status === "Approved" ? "default" : "outline"}>
                            {s.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                           <div className="flex justify-end gap-2">
                             <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => setEditDialog({ open: true, settlement: s })}
                              >
                               <Edit2 className="h-4 w-4" />
                             </Button>
                             {s.status === "Pending Verification" && (
                               <>
                                 <Button
                                    size="sm"
                                    className="bg-emerald-600 h-8"
                                    onClick={() => handleVerify(s.id, s.advance_id, s.amount, "Approved")}
                                  >
                                   Approve
                                 </Button>
                                 <Button
                                    size="sm"
                                    variant="destructive"
                                    className="h-8"
                                    onClick={() => handleVerify(s.id, s.advance_id, s.amount, "Rejected")}
                                  >
                                   Reject
                                 </Button>
                               </>
                             )}
                           </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
             </CardContent>
           </Card>
        </div>
      </div>

      {/* Edit Settlement Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(o) => !o && setEditDialog({open: false, settlement: null})}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Edit Advance Settlement</DialogTitle>
          </DialogHeader>

          {editDialog.settlement && (
            <div className="space-y-4 py-4">
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input
                      type="number"
                      value={editDialog.settlement.amount}
                      onChange={(e) => setEditDialog({
                        ...editDialog,
                        settlement: {...editDialog.settlement!, amount: parseFloat(e.target.value)}
                      })}
                      className="rounded-xl font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={editDialog.settlement.settlement_date}
                      onChange={(e) => setEditDialog({
                        ...editDialog,
                        settlement: {...editDialog.settlement!, settlement_date: e.target.value}
                      })}
                      className="rounded-xl"
                    />
                  </div>
               </div>

               <div className="space-y-2">
                 <Label>Status</Label>
                 <Select
                    value={editDialog.settlement.status}
                    onValueChange={(v) => setEditDialog({
                      ...editDialog,
                      settlement: {...editDialog.settlement!, status: v}
                    })}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pending Verification">Pending Verification</SelectItem>
                      <SelectItem value="Approved">Approved</SelectItem>
                      <SelectItem value="Rejected">Rejected</SelectItem>
                    </SelectContent>
                 </Select>
               </div>

               <div className="space-y-2">
                 <Label>Expense Category</Label>
                 <Input
                    value={editDialog.settlement.expense_type || ""}
                    onChange={(e) => setEditDialog({
                      ...editDialog,
                      settlement: {...editDialog.settlement!, expense_type: e.target.value}
                    })}
                    className="rounded-xl"
                  />
               </div>

               <div className="space-y-2">
                 <Label>Description</Label>
                 <Textarea
                    value={editDialog.settlement.description || ""}
                    onChange={(e) => setEditDialog({
                      ...editDialog,
                      settlement: {...editDialog.settlement!, description: e.target.value}
                    })}
                    className="rounded-xl"
                  />
               </div>
            </div>
          )}

          <DialogFooter className="justify-between items-center">
            <Button
              variant="destructive"
              onClick={() => {
                if (editDialog.settlement) {
                  handleDeleteSettlement(editDialog.settlement.id);
                  setEditDialog({open: false, settlement: null});
                }
              }}
              className="rounded-xl"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditDialog({open: false, settlement: null})} className="rounded-xl">
                Cancel
              </Button>
              <Button onClick={handleUpdateSettlement} className="bg-emerald-600 rounded-xl font-bold px-8 text-white">
                <Save className="mr-2 h-4 w-4" /> Save Changes
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdvanceSettlementTab;
