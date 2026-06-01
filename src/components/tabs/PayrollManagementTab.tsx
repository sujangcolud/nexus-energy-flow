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
} from "lucide-react";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StaffReportsTab from "./StaffReportsTab";

interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
  department: string;
  basic_salary: number;
  marital_status: string;
}

interface PayrollRecord {
  id: string;
  employee_id: string;
  month_year: string;
  gross_salary: number;
  employee_ssf: number;
  tax_deduction: number;
  advance_recovery: number;
  net_salary: number;
  status: string;
  employees: Employee;
}

const PayrollManagementTab = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("records");

  // Form states for new employee
  const [newEmployee, setNewEmployee] = useState({
    employee_code: "",
    full_name: "",
    department: "",
    basic_salary: "",
    marital_status: "single",
  });

  useEffect(() => {
    fetchEmployees();
    fetchPayrollRecords();
  }, []);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
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
        basic_salary: parseFloat(newEmployee.basic_salary),
      });
      if (error) throw error;
      toast.success("Employee added successfully");
      setNewEmployee({
        employee_code: "",
        full_name: "",
        department: "",
        basic_salary: "",
        marital_status: "single",
      });
      fetchEmployees();
    } catch (error) {
      logError("adding employee", error);
      toast.error("Failed to add employee");
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
          <TabsList className="grid grid-cols-4 w-full h-auto p-1 bg-muted rounded-2xl">
            <TabsTrigger value="records" className="rounded-xl py-2 font-bold">Payroll Records</TabsTrigger>
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
                            <Button variant="ghost" size="sm">View</Button>
                         </TableCell>
                       </TableRow>
                     ))}
                   </TableBody>
                 </Table>
              </CardContent>
            </Card>
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
                              <TableCell className="text-right">
                                <Button variant="ghost" size="sm">Edit</Button>
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
    </div>
  );
};

export default PayrollManagementTab;
