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
import { toast } from "sonner";
import { logError } from "@/utils/errorHandling";
import {
  Users,
  Banknote,
  Calculator,
  PlusCircle,
  FileSpreadsheet,
  Settings,
  CreditCard,
  Building2,
  Edit2,
  Save,
  Trash2,
  Clock,
  History,
  CheckCircle,
} from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import StaffReportsTab from "./StaffReportsTab";

interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
  department: string;
  basic_salary: number;
  marital_status: string;
  overtime_rate: number;
}

interface PayrollRecord {
  id: string;
  employee_id: string;
  month_year: string;
  basic_salary: number;
  allowance: number;
  other_benefits: number;
  overtime_hours: number;
  overtime_pay: number;
  gross_salary: number;
  employee_ssf: number;
  tax_deduction: number;
  advance_recovery: number;
  net_salary: number;
  status: string;
  payment_date?: string;
  payment_mode?: string;
  other_deductions?: number;
  employees: Employee;
}

interface OvertimeEntry {
  id: string;
  employee_id: string;
  overtime_date: string;
  hours: number;
  rate_at_time: number;
  total_amount: number;
  reason: string;
  status: string;
  employees: Employee;
}

const PayrollManagementTab = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [overtimeEntries, setOvertimeEntries] = useState<OvertimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("records");

  // Edit Employee State
  const [editEmployee, setEditEmployee] = useState<{open: boolean, employee: Employee | null}>({
    open: false,
    employee: null
  });

  // Form states for new employee
  const [newEmployee, setNewEmployee] = useState({
    employee_code: "",
    full_name: "",
    department: "",
    basic_salary: "",
    overtime_rate: "",
    marital_status: "single",
  });

  // Edit Payroll State
  const [editPayroll, setEditPayroll] = useState<{open: boolean, record: PayrollRecord | null}>({
    open: false,
    record: null
  });

  // Overtime Form State
  const [overtimeForm, setOvertimeForm] = useState({
    employee_id: "",
    overtime_date: format(new Date(), "yyyy-MM-dd"),
    hours: "",
    reason: ""
  });

  // Edit Overtime State
  const [editOvertime, setEditOvertime] = useState<{open: boolean, entry: OvertimeEntry | null}>({
    open: false,
    entry: null
  });

  useEffect(() => {
    fetchEmployees();
    fetchPayrollRecords();
    fetchOvertimeEntries();
  }, []);

  const fetchOvertimeEntries = async () => {
    try {
      const { data, error } = await supabase
        .from("employee_overtime")
        .select("*, employees(*)")
        .is("deleted_at", null)
        .order("overtime_date", { ascending: false });
      if (error) throw error;
      setOvertimeEntries(data || []);
    } catch (error) {
      logError("fetching overtime", error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .is("deleted_at", null)
        .order("full_name");
      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      logError("fetching employees", error);
    }
  };

  const fetchPayrollRecords = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("payroll_records")
        .select("*, employees(*)")
        .is("deleted_at", null)
        .order("month_year", { ascending: false });
      if (error) throw error;
      setPayrollRecords(data || []);
    } catch (error) {
      logError("fetching payroll records", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from("employees").insert({
        ...newEmployee,
        basic_salary: parseFloat(newEmployee.basic_salary) || 0,
        overtime_rate: parseFloat(newEmployee.overtime_rate) || 0,
      });
      if (error) throw error;
      toast.success("Employee added successfully");
      setNewEmployee({
        employee_code: "",
        full_name: "",
        department: "",
        basic_salary: "",
        overtime_rate: "",
        marital_status: "single",
      });
      fetchEmployees();
    } catch (error) {
      logError("adding employee", error);
      toast.error("Failed to add employee");
    }
  };

  const handleUpdateEmployee = async () => {
    if (!editEmployee.employee) return;
    try {
      const { id, ...updateData } = editEmployee.employee;
      const { error } = await supabase
        .from("employees")
        .update(updateData)
        .eq("id", id);
      if (error) throw error;
      toast.success("Employee updated");
      setEditEmployee({ open: false, employee: null });
      fetchEmployees();
    } catch (error) {
      logError("updating employee", error);
      toast.error("Update failed");
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm("Are you sure you want to delete this employee?")) return;
    try {
      const { error } = await supabase
        .from("employees")
        .update({ deleted_at: new Date().toISOString(), is_active: false })
        .eq("id", id);
      if (error) throw error;
      toast.success("Employee deleted");
      fetchEmployees();
    } catch (error) {
      logError("deleting employee", error);
      toast.error("Delete failed");
    }
  };

  const handleDeletePayroll = async (id: string) => {
    if (!confirm("Are you sure you want to delete this payroll record?")) return;
    try {
      const { error } = await supabase
        .from("payroll_records")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      toast.success("Payroll record deleted");
      fetchPayrollRecords();
    } catch (error) {
      logError("deleting payroll", error);
      toast.error("Delete failed");
    }
  };

  const handleUpdatePayroll = async () => {
    if (!editPayroll.record) return;
    try {
      const rec = editPayroll.record;
      // Recalculate gross and net if needed, or trust the user input
      const gross = (Number(rec.basic_salary) || 0) +
                    (Number(rec.allowance) || 0) +
                    (Number(rec.other_benefits) || 0) +
                    (Number(rec.overtime_pay) || 0);

      const net = gross -
                  (Number(rec.employee_ssf) || 0) -
                  (Number(rec.tax_deduction) || 0) -
                  (Number(rec.advance_recovery) || 0) -
                  (Number(rec.other_deductions) || 0);

      const { error } = await supabase
        .from("payroll_records")
        .update({
          basic_salary: rec.basic_salary,
          allowance: rec.allowance,
          other_benefits: rec.other_benefits,
          overtime_hours: rec.overtime_hours,
          overtime_pay: rec.overtime_pay,
          gross_salary: gross,
          employee_ssf: rec.employee_ssf,
          tax_deduction: rec.tax_deduction,
          advance_recovery: rec.advance_recovery,
          other_deductions: rec.other_deductions,
          net_salary: net,
          status: rec.status,
          payment_date: rec.payment_date,
          payment_mode: rec.payment_mode,
        })
        .eq("id", rec.id);

      if (error) throw error;
      toast.success("Payroll record updated");
      setEditPayroll({ open: false, record: null });
      fetchPayrollRecords();
    } catch (error) {
      logError("updating payroll", error);
      toast.error("Update failed");
    }
  };

  const handleUpdateOvertime = async () => {
    if (!editOvertime.entry) return;
    try {
      const { id, hours, overtime_date, reason } = editOvertime.entry;
      const { error } = await supabase
        .from("employee_overtime")
        .update({ hours, overtime_date, reason })
        .eq("id", id);
      if (error) throw error;
      toast.success("Overtime record updated");
      setEditOvertime({ open: false, entry: null });
      fetchOvertimeEntries();
    } catch (error) {
      logError("updating overtime", error);
      toast.error("Update failed");
    }
  };

  const handleDeleteOvertime = async (id: string) => {
    if (!confirm("Are you sure you want to delete this overtime record?")) return;
    try {
      const { error } = await supabase
        .from("employee_overtime")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      toast.success("Overtime record deleted");
      fetchOvertimeEntries();
    } catch (error) {
      logError("deleting overtime", error);
      toast.error("Delete failed");
    }
  };

  const handleAddOvertime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overtimeForm.employee_id || !overtimeForm.hours) {
      toast.error("Fill required fields");
      return;
    }
    try {
      const emp = employees.find(e => e.id === overtimeForm.employee_id);
      if (!emp) return;

      const { error } = await supabase.from("employee_overtime").insert({
        employee_id: overtimeForm.employee_id,
        overtime_date: overtimeForm.overtime_date,
        hours: parseFloat(overtimeForm.hours),
        rate_at_time: emp.overtime_rate || 0,
        reason: overtimeForm.reason,
        status: 'Approved' // Auto-approve for now as per simplicity or add logic
      });

      if (error) throw error;
      toast.success("Overtime logged");
      setOvertimeForm({
        employee_id: "",
        overtime_date: format(new Date(), "yyyy-MM-dd"),
        hours: "",
        reason: ""
      });
      fetchOvertimeEntries();
    } catch (error) {
      logError("adding overtime", error);
      toast.error("Failed to log overtime");
    }
  };

  const generatePayroll = async () => {
    toast.info("Processing payroll using tax engine...");
    try {
      const currentMonth = format(new Date(), "yyyy-MM-01");
      const { error } = await supabase.rpc("process_monthly_payroll", {
        p_month_year: currentMonth,
        p_user_id: user?.id
      });

      if (error) throw error;

      toast.success("Payroll processed successfully with Tax & Advance deductions");
      fetchPayrollRecords();
    } catch (error) {
      logError("generating payroll", error);
      toast.error(`Payroll failed: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-background p-2 md:p-6 pb-24 md:pb-6">
      <div className="space-y-6">
        <div className="bg-primary/5 p-4 rounded-3xl mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl text-white">
              <Banknote className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Payroll Management</h1>
              <p className="text-xs text-muted-foreground">Manage employees and monthly salary processing</p>
            </div>
          </div>
          <Button onClick={generatePayroll} className="bg-indigo-600 hover:bg-indigo-700 h-12 rounded-xl font-bold">
            <Calculator className="mr-2 h-5 w-5" /> Generate Current Month Payroll
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-5 w-full h-auto p-1 bg-muted rounded-2xl">
            <TabsTrigger value="records" className="rounded-xl py-2 font-bold">Payroll Records</TabsTrigger>
            <TabsTrigger value="overtime" className="rounded-xl py-2 font-bold">Overtime Tracking</TabsTrigger>
            <TabsTrigger value="employees" className="rounded-xl py-2 font-bold">Employees</TabsTrigger>
            <TabsTrigger value="reports" className="rounded-xl py-2 font-bold">Compliance Reports</TabsTrigger>
            <TabsTrigger value="settings" className="rounded-xl py-2 font-bold">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="records">
            <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
              <CardContent className="p-0">
                 <Table>
                   <TableHeader className="bg-muted/50">
                     <TableRow>
                       <TableHead>Month</TableHead>
                       <TableHead>Employee</TableHead>
                         <TableHead className="text-right">Gross</TableHead>
                         <TableHead className="text-right">Overtime</TableHead>
                         <TableHead className="text-right">SSF (11%)</TableHead>
                         <TableHead className="text-right">Tax</TableHead>
                         <TableHead className="text-right">Adv. Recovery</TableHead>
                         <TableHead className="text-right">Net Payable</TableHead>
                       <TableHead>Status</TableHead>
                       <TableHead className="text-right">Action</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {payrollRecords.map((rec) => (
                       <TableRow key={rec.id}>
                         <TableCell>{format(new Date(rec.month_year), "MMMM yyyy")}</TableCell>
                         <TableCell className="font-medium">{rec.employees?.full_name}</TableCell>
                         <TableCell className="text-right">रु {rec.gross_salary.toLocaleString()}</TableCell>
                         <TableCell className="text-right text-emerald-600">
                           रु {rec.overtime_pay?.toLocaleString() || 0}
                           <div className="text-[10px] text-muted-foreground">{rec.overtime_hours || 0} hrs</div>
                         </TableCell>
                         <TableCell className="text-right text-muted-foreground">रु {rec.employee_ssf.toLocaleString()}</TableCell>
                         <TableCell className="text-right text-rose-500">रु {rec.tax_deduction.toLocaleString()}</TableCell>
                         <TableCell className="text-right text-amber-600">रु {rec.advance_recovery.toLocaleString()}</TableCell>
                         <TableCell className="text-right font-black text-indigo-600">रु {rec.net_salary.toLocaleString()}</TableCell>
                         <TableCell>
                            <Badge variant={rec.status === "Paid" ? "default" : (rec.status === "Calculated" ? "secondary" : "outline")}>
                              {rec.status}
                            </Badge>
                         </TableCell>
                         <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditPayroll({ open: true, record: rec })}
                            >
                              <Edit2 className="h-4 w-4 mr-1" /> Edit
                            </Button>
                         </TableCell>
                       </TableRow>
                     ))}
                   </TableBody>
                 </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="overtime">
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1 rounded-3xl border-none shadow-sm overflow-hidden">
                  <CardHeader className="bg-emerald-600 text-white p-4">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Clock className="h-5 w-5" /> Log Overtime
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    <form onSubmit={handleAddOvertime} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Employee *</Label>
                        <Select value={overtimeForm.employee_id} onValueChange={(v) => setOvertimeForm({...overtimeForm, employee_id: v})}>
                          <SelectTrigger className="rounded-xl h-11">
                            <SelectValue placeholder="Select Employee" />
                          </SelectTrigger>
                          <SelectContent>
                            {employees.map((emp) => (
                              <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Date *</Label>
                          <Input
                            type="date"
                            value={overtimeForm.overtime_date}
                            onChange={(e) => setOvertimeForm({...overtimeForm, overtime_date: e.target.value})}
                            className="rounded-xl h-11"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Hours *</Label>
                          <Input
                            type="number"
                            step="0.5"
                            value={overtimeForm.hours}
                            onChange={(e) => setOvertimeForm({...overtimeForm, hours: e.target.value})}
                            placeholder="0.0"
                            className="rounded-xl h-11 font-bold"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Reason/Remarks</Label>
                        <Input
                          value={overtimeForm.reason}
                          onChange={(e) => setOvertimeForm({...overtimeForm, reason: e.target.value})}
                          placeholder="e.g. Extra shift"
                          className="rounded-xl h-11"
                        />
                      </div>
                      <Button type="submit" className="w-full h-12 rounded-xl text-lg font-bold mt-4 bg-emerald-600">
                        Submit Overtime
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2 rounded-3xl border-none shadow-sm overflow-hidden">
                   <CardHeader className="p-4 bg-muted/50 border-b">
                     <CardTitle className="text-lg font-bold flex items-center gap-2">
                       <History className="h-5 w-5 text-emerald-600" /> Overtime History
                     </CardTitle>
                   </CardHeader>
                   <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Employee</TableHead>
                            <TableHead>Hours</TableHead>
                            <TableHead>Rate</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {overtimeEntries.map((entry) => (
                            <TableRow key={entry.id}>
                              <TableCell>{format(new Date(entry.overtime_date), "MMM dd, yyyy")}</TableCell>
                              <TableCell className="font-medium">{entry.employees?.full_name}</TableCell>
                              <TableCell className="font-bold">{entry.hours} hrs</TableCell>
                              <TableCell>रु {entry.rate_at_time}</TableCell>
                              <TableCell className="font-bold text-emerald-600">रु {entry.total_amount.toLocaleString()}</TableCell>
                              <TableCell>
                                <Badge variant={entry.status === "Processed" ? "default" : "secondary"}>
                                  {entry.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                {entry.status !== "Processed" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEditOvertime({ open: true, entry: entry })}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                   </CardContent>
                </Card>
             </div>
          </TabsContent>

          <TabsContent value="employees">
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1 rounded-3xl border-none shadow-sm overflow-hidden">
                  <CardHeader className="bg-indigo-600 text-white p-4">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <PlusCircle className="h-5 w-5" /> Add New Employee
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                     <form onSubmit={handleAddEmployee} className="space-y-4">
                        <div className="space-y-2">
                          <Label>Employee ID *</Label>
                          <Input
                            value={newEmployee.employee_code}
                            onChange={(e) => setNewEmployee({...newEmployee, employee_code: e.target.value})}
                            placeholder="EMP001"
                            className="rounded-xl"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Full Name *</Label>
                          <Input
                            value={newEmployee.full_name}
                            onChange={(e) => setNewEmployee({...newEmployee, full_name: e.target.value})}
                            placeholder="John Doe"
                            className="rounded-xl"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Basic Salary *</Label>
                            <Input
                              type="number"
                              value={newEmployee.basic_salary}
                              onChange={(e) => setNewEmployee({...newEmployee, basic_salary: e.target.value})}
                              placeholder="0.00"
                              className="rounded-xl font-bold"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>OT Rate (per hr)</Label>
                            <Input
                              type="number"
                              value={newEmployee.overtime_rate}
                              onChange={(e) => setNewEmployee({...newEmployee, overtime_rate: e.target.value})}
                              placeholder="0.00"
                              className="rounded-xl font-bold text-emerald-600"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Marital Status</Label>
                            <Select value={newEmployee.marital_status} onValueChange={(v) => setNewEmployee({...newEmployee, marital_status: v})}>
                              <SelectTrigger className="rounded-xl">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="single">Single</SelectItem>
                                <SelectItem value="married">Married</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Department</Label>
                            <Input
                              value={newEmployee.department}
                              onChange={(e) => setNewEmployee({...newEmployee, department: e.target.value})}
                              placeholder="Kitchen"
                              className="rounded-xl"
                            />
                          </div>
                        </div>
                        <Button type="submit" className="w-full h-12 rounded-xl text-lg font-bold mt-4 bg-indigo-600">
                          Register Employee
                        </Button>
                     </form>
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2 rounded-3xl border-none shadow-sm overflow-hidden">
                   <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Salary</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {employees.map((emp) => (
                            <TableRow key={emp.id}>
                              <TableCell>
                                <div className="font-medium">{emp.full_name}</div>
                                <div className="text-xs text-muted-foreground">{emp.employee_code} | {emp.department}</div>
                              </TableCell>
                              <TableCell className="font-bold">रु {emp.basic_salary.toLocaleString()}</TableCell>
                              <TableCell><Badge variant="outline" className="text-green-600">Active</Badge></TableCell>
                              <TableCell className="text-right space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditEmployee({ open: true, employee: emp })}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-rose-600"
                                  onClick={() => handleDeleteEmployee(emp.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                   </CardContent>
                </Card>
             </div>
          </TabsContent>

          <TabsContent value="reports">
            <StaffReportsTab />
          </TabsContent>

          <TabsContent value="settings">
             <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
               <CardHeader className="bg-slate-800 text-white p-4">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Settings className="h-5 w-5" /> Payroll & Tax Configurations
                  </CardTitle>
               </CardHeader>
               <CardContent className="p-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                       <h3 className="font-bold text-lg border-b pb-2">SSF Contribution Rates</h3>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Employee Contribution (%)</Label>
                            <Input defaultValue="11" className="rounded-xl font-bold" />
                          </div>
                          <div className="space-y-2">
                            <Label>Employer Contribution (%)</Label>
                            <Input defaultValue="20" className="rounded-xl font-bold" />
                          </div>
                       </div>
                       <Button variant="outline" className="rounded-xl font-bold">Update Rates</Button>
                    </div>

                    <div className="space-y-4">
                       <h3 className="font-bold text-lg border-b pb-2">Compliance Reports</h3>
                       <div className="grid grid-cols-1 gap-2">
                          <Button variant="outline" className="justify-start h-12 rounded-xl">
                            <FileSpreadsheet className="mr-2 h-5 w-5 text-green-600" /> Export Monthly SSF Report
                          </Button>
                          <Button variant="outline" className="justify-start h-12 rounded-xl">
                            <FileSpreadsheet className="mr-2 h-5 w-5 text-blue-600" /> Export TDS (Tax) Register
                          </Button>
                       </div>
                    </div>
                 </div>
               </CardContent>
             </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Payroll Dialog */}
      <Dialog open={editPayroll.open} onOpenChange={(o) => !o && setEditPayroll({open: false, record: null})}>
        <DialogContent className="max-w-4xl rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Edit2 className="h-6 w-6 text-indigo-600" />
              Edit Payroll: {editPayroll.record?.employees?.full_name} ({editPayroll.record?.month_year ? format(new Date(editPayroll.record.month_year), "MMMM yyyy") : ""})
            </DialogTitle>
          </DialogHeader>

          {editPayroll.record && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              <div className="space-y-4">
                <h3 className="font-bold text-lg border-b pb-2 flex items-center gap-2">
                  <PlusCircle className="h-4 w-4 text-emerald-600" /> Earnings
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Basic Salary</Label>
                    <Input
                      type="number"
                      value={editPayroll.record.basic_salary}
                      onChange={(e) => setEditPayroll({
                        ...editPayroll,
                        record: {...editPayroll.record!, basic_salary: parseFloat(e.target.value)}
                      })}
                      className="rounded-xl font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Allowance</Label>
                    <Input
                      type="number"
                      value={editPayroll.record.allowance}
                      onChange={(e) => setEditPayroll({
                        ...editPayroll,
                        record: {...editPayroll.record!, allowance: parseFloat(e.target.value)}
                      })}
                      className="rounded-xl font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Other Benefits</Label>
                    <Input
                      type="number"
                      value={editPayroll.record.other_benefits}
                      onChange={(e) => setEditPayroll({
                        ...editPayroll,
                        record: {...editPayroll.record!, other_benefits: parseFloat(e.target.value)}
                      })}
                      className="rounded-xl font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Overtime Pay</Label>
                    <Input
                      type="number"
                      value={editPayroll.record.overtime_pay}
                      onChange={(e) => setEditPayroll({
                        ...editPayroll,
                        record: {...editPayroll.record!, overtime_pay: parseFloat(e.target.value)}
                      })}
                      className="rounded-xl font-bold text-emerald-600"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-bold text-lg border-b pb-2 flex items-center gap-2 text-rose-600">
                  <Trash2 className="h-4 w-4" /> Deductions
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>SSF (Employee 11%)</Label>
                    <Input
                      type="number"
                      value={editPayroll.record.employee_ssf}
                      onChange={(e) => setEditPayroll({
                        ...editPayroll,
                        record: {...editPayroll.record!, employee_ssf: parseFloat(e.target.value)}
                      })}
                      className="rounded-xl font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tax Deduction</Label>
                    <Input
                      type="number"
                      value={editPayroll.record.tax_deduction}
                      onChange={(e) => setEditPayroll({
                        ...editPayroll,
                        record: {...editPayroll.record!, tax_deduction: parseFloat(e.target.value)}
                      })}
                      className="rounded-xl font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Advance Recovery</Label>
                    <Input
                      type="number"
                      value={editPayroll.record.advance_recovery}
                      onChange={(e) => setEditPayroll({
                        ...editPayroll,
                        record: {...editPayroll.record!, advance_recovery: parseFloat(e.target.value)}
                      })}
                      className="rounded-xl font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Other Deductions</Label>
                    <Input
                      type="number"
                      value={editPayroll.record.other_deductions || 0}
                      onChange={(e) => setEditPayroll({
                        ...editPayroll,
                        record: {...editPayroll.record!, other_deductions: parseFloat(e.target.value)}
                      })}
                      className="rounded-xl font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 space-y-4 pt-4 border-t">
                <h3 className="font-bold text-lg flex items-center gap-2">
                   <Settings className="h-4 w-4" /> Payment Status & Mode
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={editPayroll.record.status}
                      onValueChange={(v) => setEditPayroll({
                        ...editPayroll,
                        record: {...editPayroll.record!, status: v}
                      })}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Calculated">Calculated</SelectItem>
                        <SelectItem value="Approved">Approved</SelectItem>
                        <SelectItem value="Paid">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Mode</Label>
                    <Select
                      value={editPayroll.record.payment_mode || "Cash"}
                      onValueChange={(v) => setEditPayroll({
                        ...editPayroll,
                        record: {...editPayroll.record!, payment_mode: v}
                      })}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Bank">Bank</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Date</Label>
                    <Input
                      type="date"
                      value={editPayroll.record.payment_date || format(new Date(), "yyyy-MM-dd")}
                      onChange={(e) => setEditPayroll({
                        ...editPayroll,
                        record: {...editPayroll.record!, payment_date: e.target.value}
                      })}
                      className="rounded-xl"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="justify-between items-center">
            <Button
              variant="destructive"
              onClick={() => {
                if (editPayroll.record) {
                  handleDeletePayroll(editPayroll.record.id);
                  setEditPayroll({open: false, record: null});
                }
              }}
              className="rounded-xl h-12"
            >
              <Trash2 className="mr-2 h-5 w-5" /> Delete Record
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditPayroll({open: false, record: null})} className="rounded-xl h-12">
                Cancel
              </Button>
              <Button onClick={handleUpdatePayroll} className="bg-indigo-600 rounded-xl h-12 px-8 font-bold text-white">
                <Save className="mr-2 h-5 w-5" /> Save Changes
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog open={editEmployee.open} onOpenChange={(o) => !o && setEditEmployee({open: false, employee: null})}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6 text-indigo-600" /> Edit Employee Details
            </DialogTitle>
          </DialogHeader>

          {editEmployee.employee && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Employee Code</Label>
                  <Input
                    value={editEmployee.employee.employee_code}
                    onChange={(e) => setEditEmployee({
                      ...editEmployee,
                      employee: {...editEmployee.employee!, employee_code: e.target.value}
                    })}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input
                    value={editEmployee.employee.full_name}
                    onChange={(e) => setEditEmployee({
                      ...editEmployee,
                      employee: {...editEmployee.employee!, full_name: e.target.value}
                    })}
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Basic Salary</Label>
                  <Input
                    type="number"
                    value={editEmployee.employee.basic_salary}
                    onChange={(e) => setEditEmployee({
                      ...editEmployee,
                      employee: {...editEmployee.employee!, basic_salary: parseFloat(e.target.value)}
                    })}
                    className="rounded-xl font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label>OT Rate (per hr)</Label>
                  <Input
                    type="number"
                    value={editEmployee.employee.overtime_rate}
                    onChange={(e) => setEditEmployee({
                      ...editEmployee,
                      employee: {...editEmployee.employee!, overtime_rate: parseFloat(e.target.value)}
                    })}
                    className="rounded-xl font-bold text-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Input
                    value={editEmployee.employee.department}
                    onChange={(e) => setEditEmployee({
                      ...editEmployee,
                      employee: {...editEmployee.employee!, department: e.target.value}
                    })}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Marital Status</Label>
                  <Select
                    value={editEmployee.employee.marital_status}
                    onValueChange={(v) => setEditEmployee({
                      ...editEmployee,
                      employee: {...editEmployee.employee!, marital_status: v}
                    })}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single</SelectItem>
                      <SelectItem value="married">Married</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditEmployee({open: false, employee: null})} className="rounded-xl h-12 px-6">
              Cancel
            </Button>
            <Button onClick={handleUpdateEmployee} className="bg-indigo-600 rounded-xl h-12 px-8 font-bold text-white">
              <Save className="mr-2 h-5 w-5" /> Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Overtime Dialog */}
      <Dialog open={editOvertime.open} onOpenChange={(o) => !o && setEditOvertime({open: false, entry: null})}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Clock className="h-6 w-6 text-emerald-600" /> Edit Overtime Record
            </DialogTitle>
          </DialogHeader>

          {editOvertime.entry && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Employee</Label>
                <Input value={editOvertime.entry.employees?.full_name} disabled className="rounded-xl bg-muted" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={editOvertime.entry.overtime_date}
                    onChange={(e) => setEditOvertime({
                      ...editOvertime,
                      entry: {...editOvertime.entry!, overtime_date: e.target.value}
                    })}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hours</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={editOvertime.entry.hours}
                    onChange={(e) => setEditOvertime({
                      ...editOvertime,
                      entry: {...editOvertime.entry!, hours: parseFloat(e.target.value)}
                    })}
                    className="rounded-xl font-bold"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Reason/Remarks</Label>
                <Input
                  value={editOvertime.entry.reason || ""}
                  onChange={(e) => setEditOvertime({
                    ...editOvertime,
                    entry: {...editOvertime.entry!, reason: e.target.value}
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
                if (editOvertime.entry) {
                  handleDeleteOvertime(editOvertime.entry.id);
                  setEditOvertime({open: false, entry: null});
                }
              }}
              className="rounded-xl h-12"
            >
              <Trash2 className="mr-2 h-5 w-5" /> Delete
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditOvertime({open: false, entry: null})} className="rounded-xl h-12">
                Cancel
              </Button>
              <Button onClick={handleUpdateOvertime} className="bg-emerald-600 rounded-xl h-12 px-8 font-bold text-white">
                <Save className="mr-2 h-5 w-5" /> Save Changes
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PayrollManagementTab;
