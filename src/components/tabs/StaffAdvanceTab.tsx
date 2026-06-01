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
import { extractErrorMessage, logError } from "@/utils/errorHandling";
import {
  Wallet,
  Calendar as CalendarIcon,
  PlusCircle,
  Clock,
  User,
  Download,
  Eye,
  Edit2,
  Save,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
  department: string;
  designation: string;
}

interface StaffAdvance {
  id: string;
  employee_id: string;
  request_date: string;
  amount: number;
  outstanding_amount: number;
  reason: string;
  settlement_method: string;
  expected_settlement_date: string;
  status: string;
  employees: Employee;
  disbursement_method?: string;
  transfer_date?: string;
  withdrawal_date?: string;
}

const StaffAdvanceTab = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [advances, setAdvances] = useState<StaffAdvance[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("requests");

  const [formData, setFormData] = useState({
    employeeId: "",
    amount: "",
    reason: "",
    settlementMethod: "Salary Deduction",
    expectedDate: format(new Date(), "yyyy-MM-dd"),
  });

  const [disburseDialog, setDisburseDialog] = useState<{open: boolean, advanceId: string | null}>({
    open: false,
    advanceId: null
  });

  const [disburseData, setDisburseData] = useState({
    method: "Bank Transfer",
    bankName: "",
    accountNumber: "",
    transactionId: "",
    date: format(new Date(), "yyyy-MM-dd"),
  });

  const [editDialog, setEditDialog] = useState<{open: boolean, advance: StaffAdvance | null}>({
    open: false,
    advance: null
  });

  useEffect(() => {
    fetchEmployees();
    fetchAdvances();
  }, [user]);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      logError("fetching employees", error);
    }
  };

  const fetchAdvances = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("staff_advances")
        .select("*, employees(*)")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setAdvances(data || []);
    } catch (error) {
      logError("fetching advances", error);
      toast.error("Failed to load advances");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeId || !formData.amount) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("staff_advances").insert({
        employee_id: formData.employeeId,
        amount: parseFloat(formData.amount),
        reason: formData.reason,
        settlement_method: formData.settlementMethod,
        expected_settlement_date: formData.expectedDate,
        status: "Submitted",
      });

      if (error) throw error;

      toast.success("Advance request submitted successfully");
      setFormData({
        employeeId: "",
        amount: "",
        reason: "",
        settlementMethod: "Salary Deduction",
        expectedDate: format(new Date(), "yyyy-MM-dd"),
      });
      fetchAdvances();
    } catch (error) {
      logError("submitting advance", error);
      toast.error(extractErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from("staff_advances")
        .update({ status, approved_by: user?.id, approval_date: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      toast.success(`Advance request ${status.toLowerCase()}`);
      fetchAdvances();
    } catch (error) {
      logError("updating advance status", error);
      toast.error("Failed to update status");
    }
  };

  const handleDisburse = async () => {
    if (!disburseDialog.advanceId) return;

    try {
      const updateData: any = {
        status: "Disbursed",
        disbursement_method: disburseData.method,
      };

      if (disburseData.method === "Bank Transfer") {
        updateData.bank_name = disburseData.bankName;
        updateData.account_number = disburseData.accountNumber;
        updateData.transaction_id = disburseData.transactionId;
        updateData.transfer_date = disburseData.date;
      } else {
        updateData.cash_source = "Counter Cash";
        updateData.withdrawal_date = disburseData.date;
      }

      const { error } = await supabase
        .from("staff_advances")
        .update(updateData)
        .eq("id", disburseDialog.advanceId);

      if (error) throw error;

      toast.success("Advance disbursed successfully");
      setDisburseDialog({ open: false, advanceId: null });
      fetchAdvances();
    } catch (error) {
      logError("disbursing advance", error);
      toast.error("Disbursement failed");
    }
  };

  const handleUpdateAdvance = async () => {
    if (!editDialog.advance) return;
    try {
      const { id, amount, reason, settlement_method, expected_settlement_date, status, disbursement_method, transfer_date, withdrawal_date } = editDialog.advance;

      const updateData: any = {
        amount,
        reason,
        settlement_method,
        expected_settlement_date,
        status,
        disbursement_method,
        transfer_date,
        withdrawal_date
      };

      const { error } = await supabase
        .from("staff_advances")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
      toast.success("Advance request updated");
      setEditDialog({ open: false, advance: null });
      fetchAdvances();
    } catch (error) {
      logError("updating advance", error);
      toast.error("Update failed");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Approved": return <Badge className="bg-green-500">Approved</Badge>;
      case "Rejected": return <Badge className="bg-red-500">Rejected</Badge>;
      case "Submitted": return <Badge className="bg-blue-500">Submitted</Badge>;
      case "Disbursed": return <Badge className="bg-purple-500">Disbursed</Badge>;
      case "Fully Settled": return <Badge className="bg-emerald-600">Fully Settled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background p-2 md:p-6 pb-24 md:pb-6">
      <div className="space-y-6">
        <div className="bg-primary/5 p-4 rounded-3xl mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-xl text-white">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Staff Advance Management</h1>
              <p className="text-xs text-muted-foreground">Manage employee advance requests and settlements</p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full h-auto p-1 bg-muted rounded-2xl">
            <TabsTrigger value="requests" className="rounded-xl py-2 font-bold">New Request</TabsTrigger>
            <TabsTrigger value="history" className="rounded-xl py-2 font-bold">Advance History</TabsTrigger>
            <TabsTrigger value="ledger" className="rounded-xl py-2 font-bold">Ledger</TabsTrigger>
            <TabsTrigger value="approvals" className="rounded-xl py-2 font-bold">Approvals</TabsTrigger>
          </TabsList>

          <TabsContent value="requests">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-1 rounded-3xl border-none shadow-sm overflow-hidden">
                <CardHeader className="bg-primary text-white p-4">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <PlusCircle className="h-5 w-5" /> New Advance Request
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Employee *</Label>
                      <Select value={formData.employeeId} onValueChange={(v) => setFormData({...formData, employeeId: v})}>
                        <SelectTrigger className="rounded-xl h-11">
                          <SelectValue placeholder="Select Employee" />
                        </SelectTrigger>
                        <SelectContent>
                          {employees.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.full_name} ({emp.employee_code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Amount (NRs.) *</Label>
                      <Input
                        type="number"
                        value={formData.amount}
                        onChange={(e) => setFormData({...formData, amount: e.target.value})}
                        placeholder="0.00"
                        className="rounded-xl h-11 font-bold text-lg"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Reason</Label>
                      <Textarea
                        value={formData.reason}
                        onChange={(e) => setFormData({...formData, reason: e.target.value})}
                        placeholder="Reason for advance"
                        className="rounded-xl"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                       <div className="space-y-2">
                        <Label>Settlement Method</Label>
                        <Select value={formData.settlementMethod} onValueChange={(v) => setFormData({...formData, settlementMethod: v})}>
                          <SelectTrigger className="rounded-xl h-11">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Salary Deduction">Salary Deduction</SelectItem>
                            <SelectItem value="Expense Settlement">Expense Settlement</SelectItem>
                            <SelectItem value="Mixed Settlement">Mixed Settlement</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Expected Settlement Date</Label>
                        <Input
                          type="date"
                          value={formData.expectedDate}
                          onChange={(e) => setFormData({...formData, expectedDate: e.target.value})}
                          className="rounded-xl h-11"
                        />
                      </div>
                    </div>

                    <Button type="submit" disabled={isSubmitting} className="w-full h-12 rounded-xl text-lg font-bold mt-4 shadow-lg">
                      {isSubmitting ? "Submitting..." : "Submit Request"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2 rounded-3xl border-none shadow-sm overflow-hidden">
                 <CardHeader className="p-4 bg-muted/50 border-b">
                   <CardTitle className="text-lg font-bold flex items-center gap-2">
                     <Clock className="h-5 w-5 text-primary" /> Recent Requests
                   </CardTitle>
                 </CardHeader>
                 <CardContent className="p-0">
                    <ScrollArea className="h-[500px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Employee</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {advances.slice(0, 10).map((adv) => (
                            <TableRow key={adv.id}>
                              <TableCell className="font-medium">{adv.employees?.full_name}</TableCell>
                              <TableCell>{format(new Date(adv.request_date), "MMM dd, yyyy")}</TableCell>
                              <TableCell className="font-bold">रु {adv.amount.toLocaleString()}</TableCell>
                              <TableCell>{getStatusBadge(adv.status)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                 </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
               <CardContent className="p-0">
                 <Table>
                   <TableHeader className="bg-muted/50">
                     <TableRow>
                       <TableHead>Date</TableHead>
                       <TableHead>Employee</TableHead>
                       <TableHead>Amount</TableHead>
                       <TableHead>Settlement</TableHead>
                       <TableHead>Status</TableHead>
                       <TableHead>Disbursement</TableHead>
                       <TableHead className="text-right">Action</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {advances.map((adv) => (
                       <TableRow key={adv.id}>
                         <TableCell>{format(new Date(adv.request_date), "MMM dd, yyyy")}</TableCell>
                         <TableCell className="font-medium">
                           <div>{adv.employees?.full_name}</div>
                           <div className="text-[10px] text-muted-foreground uppercase">{adv.employees?.department}</div>
                         </TableCell>
                         <TableCell className="font-black text-primary">रु {adv.amount.toLocaleString()}</TableCell>
                         <TableCell className="text-xs">{adv.settlement_method}</TableCell>
                         <TableCell>{getStatusBadge(adv.status)}</TableCell>
                         <TableCell>
                            {adv.disbursement_method ? (
                              <div className="text-xs">
                                <div>{adv.disbursement_method}</div>
                                <div className="text-muted-foreground">{adv.transfer_date || adv.withdrawal_date}</div>
                              </div>
                            ) : "-"}
                         </TableCell>
                         <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => setEditDialog({ open: true, advance: adv })}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                         </TableCell>
                       </TableRow>
                     ))}
                   </TableBody>
                 </Table>
               </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ledger">
            <div className="space-y-4">
              <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
                <CardHeader className="p-4 bg-muted/50 flex flex-row items-center justify-between">
                  <CardTitle className="text-lg font-bold">Advance Ledger Summary</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="rounded-xl">
                      <Download className="h-4 w-4 mr-2" /> Export PDF
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead className="text-right">Total Advance</TableHead>
                        <TableHead className="text-right">Total Settled</TableHead>
                        <TableHead className="text-right">Outstanding</TableHead>
                        <TableHead className="text-center">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employees.map((emp) => {
                        const empAdvances = advances.filter(a => a.employee_id === emp.id && (a.status === 'Disbursed' || a.status === 'Fully Settled' || a.status === 'Partially Settled'));
                        const total = empAdvances.reduce((sum, a) => sum + a.amount, 0);
                        const outstanding = empAdvances.reduce((sum, a) => sum + a.outstanding_amount, 0);
                        return (
                          <TableRow key={emp.id}>
                            <TableCell className="font-medium">{emp.full_name}</TableCell>
                            <TableCell className="text-right font-bold">रु {total.toLocaleString()}</TableCell>
                            <TableCell className="text-right text-emerald-600">रु {(total - outstanding).toLocaleString()}</TableCell>
                            <TableCell className="text-right text-rose-600 font-black">रु {outstanding.toLocaleString()}</TableCell>
                            <TableCell className="text-center">
                              <Button variant="ghost" size="sm" className="text-xs font-bold text-primary">
                                View Statement
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-800 text-white p-4">
                  <CardTitle className="text-lg font-bold">Employee Advance Statement</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right text-rose-600">Debit (Taken)</TableHead>
                        <TableHead className="text-right text-emerald-600">Credit (Settled)</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          Select an employee above to view detailed statement
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="approvals">
             <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
                <CardHeader className="bg-blue-600 text-white p-4">
                  <CardTitle className="text-lg font-bold">Pending Approvals & Disbursements</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Requested Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {advances.filter(a => ["Submitted", "Approved"].includes(a.status)).map((adv) => (
                        <TableRow key={adv.id}>
                          <TableCell className="font-medium">{adv.employees?.full_name}</TableCell>
                          <TableCell>{format(new Date(adv.request_date), "MMM dd, yyyy")}</TableCell>
                          <TableCell className="font-bold">रु {adv.amount.toLocaleString()}</TableCell>
                          <TableCell className="max-w-xs truncate text-xs">{adv.reason}</TableCell>
                          <TableCell>{getStatusBadge(adv.status)}</TableCell>
                          <TableCell className="text-right space-x-2">
                             {adv.status === "Submitted" && (
                               <>
                                 <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 h-8"
                                    onClick={() => handleStatusUpdate(adv.id, "Approved")}
                                  >
                                   Approve
                                 </Button>
                                 <Button
                                    size="sm"
                                    variant="destructive"
                                    className="h-8"
                                    onClick={() => handleStatusUpdate(adv.id, "Rejected")}
                                  >
                                   Reject
                                 </Button>
                               </>
                             )}
                             {adv.status === "Approved" && (
                               <Button
                                  size="sm"
                                  className="bg-purple-600 hover:bg-purple-700 h-8"
                                  onClick={() => setDisburseDialog({open: true, advanceId: adv.id})}
                                >
                                 Disburse
                               </Button>
                             )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
             </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Disbursement Dialog */}
      <Dialog open={disburseDialog.open} onOpenChange={(o) => setDisburseDialog({open: o, advanceId: null})}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Disburse Staff Advance</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
             <div className="space-y-2">
               <Label>Disbursement Method</Label>
               <Select value={disburseData.method} onValueChange={(v) => setDisburseData({...disburseData, method: v})}>
                 <SelectTrigger className="rounded-xl h-11">
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                   <SelectItem value="Cash Withdrawal">Cash Withdrawal</SelectItem>
                 </SelectContent>
               </Select>
             </div>

             {disburseData.method === "Bank Transfer" ? (
               <>
                 <div className="space-y-2">
                   <Label>Bank Name</Label>
                   <Input
                      value={disburseData.bankName}
                      onChange={(e) => setDisburseData({...disburseData, bankName: e.target.value})}
                      className="rounded-xl h-11"
                    />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <Label>Account Number</Label>
                     <Input
                        value={disburseData.accountNumber}
                        onChange={(e) => setDisburseData({...disburseData, accountNumber: e.target.value})}
                        className="rounded-xl h-11"
                      />
                   </div>
                   <div className="space-y-2">
                     <Label>Transaction ID</Label>
                     <Input
                        value={disburseData.transactionId}
                        onChange={(e) => setDisburseData({...disburseData, transactionId: e.target.value})}
                        className="rounded-xl h-11"
                      />
                   </div>
                 </div>
               </>
             ) : (
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                   <p className="text-sm text-amber-800">
                     Cash will be deducted from the counter balance automatically.
                   </p>
                </div>
             )}

             <div className="space-y-2">
               <Label>Date</Label>
               <Input
                  type="date"
                  value={disburseData.date}
                  onChange={(e) => setDisburseData({...disburseData, date: e.target.value})}
                  className="rounded-xl h-11"
                />
             </div>
          </div>
          <DialogFooter>
             <Button onClick={handleDisburse} className="w-full h-12 rounded-xl text-lg font-bold">
               Confirm Disbursement
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Advance Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(o) => !o && setEditDialog({open: false, advance: null})}>
        <DialogContent className="rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Advance Request</DialogTitle>
          </DialogHeader>

          {editDialog.advance && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount (NRs.)</Label>
                  <Input
                    type="number"
                    value={editDialog.advance.amount}
                    onChange={(e) => setEditDialog({
                      ...editDialog,
                      advance: {...editDialog.advance!, amount: parseFloat(e.target.value)}
                    })}
                    className="rounded-xl font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={editDialog.advance.status}
                    onValueChange={(v) => setEditDialog({
                      ...editDialog,
                      advance: {...editDialog.advance!, status: v}
                    })}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Submitted">Submitted</SelectItem>
                      <SelectItem value="Approved">Approved</SelectItem>
                      <SelectItem value="Rejected">Rejected</SelectItem>
                      <SelectItem value="Disbursed">Disbursed</SelectItem>
                      <SelectItem value="Partially Settled">Partially Settled</SelectItem>
                      <SelectItem value="Fully Settled">Fully Settled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Reason</Label>
                <Textarea
                  value={editDialog.advance.reason}
                  onChange={(e) => setEditDialog({
                    ...editDialog,
                    advance: {...editDialog.advance!, reason: e.target.value}
                  })}
                  className="rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Settlement Method</Label>
                  <Select
                    value={editDialog.advance.settlement_method}
                    onValueChange={(v) => setEditDialog({
                      ...editDialog,
                      advance: {...editDialog.advance!, settlement_method: v}
                    })}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Salary Deduction">Salary Deduction</SelectItem>
                      <SelectItem value="Expense Settlement">Expense Settlement</SelectItem>
                      <SelectItem value="Mixed Settlement">Mixed Settlement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Expected Settlement Date</Label>
                  <Input
                    type="date"
                    value={editDialog.advance.expected_settlement_date}
                    onChange={(e) => setEditDialog({
                      ...editDialog,
                      advance: {...editDialog.advance!, expected_settlement_date: e.target.value}
                    })}
                    className="rounded-xl"
                  />
                </div>
              </div>

              {editDialog.advance.status === "Disbursed" && (
                <div className="pt-4 border-t space-y-4">
                  <h3 className="font-bold text-sm">Disbursement Details</h3>
                  <div className="space-y-2">
                    <Label>Method</Label>
                    <Select
                      value={editDialog.advance.disbursement_method || ""}
                      onValueChange={(v) => setEditDialog({
                        ...editDialog,
                        advance: {...editDialog.advance!, disbursement_method: v}
                      })}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                        <SelectItem value="Cash Withdrawal">Cash Withdrawal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={editDialog.advance.transfer_date || editDialog.advance.withdrawal_date || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (editDialog.advance?.disbursement_method === "Bank Transfer") {
                          setEditDialog({...editDialog, advance: {...editDialog.advance!, transfer_date: val}});
                        } else {
                          setEditDialog({...editDialog, advance: {...editDialog.advance!, withdrawal_date: val}});
                        }
                      }}
                      className="rounded-xl"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
             <Button variant="outline" onClick={() => setEditDialog({open: false, advance: null})} className="rounded-xl">
               Cancel
             </Button>
             <Button onClick={handleUpdateAdvance} className="rounded-xl font-bold bg-primary px-8">
               <Save className="mr-2 h-4 w-4" /> Save Changes
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffAdvanceTab;
