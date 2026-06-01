import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { FileSpreadsheet, Download, Filter, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const StaffReportsTab = () => {
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState("outstanding_advances");
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState("all");

  useEffect(() => {
    fetchEmployees();
    generateReport();
  }, [reportType, selectedEmployee]);

  const fetchEmployees = async () => {
    const { data } = await supabase.from("employees").select("id, name");
    setEmployees(data || []);
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      if (reportType === "outstanding_advances") {
        let query = supabase
          .from("staff_advances")
          .select("*, employees(name, department)")
          .in("status", ["Disbursed", "Partially Settled"]);

        if (selectedEmployee !== "all") {
          query = query.eq("employee_id", selectedEmployee);
        }

        const { data } = await query;
        setReportData(data || []);
      } else if (reportType === "payroll_register") {
        let query = supabase
          .from("payroll_records")
          .select("*, employees(name, designation, pan_number, ssf_number)")
          .eq("status", "Paid");

        const { data } = await query;
        setReportData(data || []);
      }
    } catch (error) {
      console.error("Report error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden">
        <CardHeader className="bg-slate-50 border-b p-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle className="text-lg font-bold">Government Compliance & Internal Reports</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="rounded-xl h-10 font-bold border-slate-200">
                <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" /> Export Excel
              </Button>
              <Button size="sm" className="rounded-xl h-10 font-bold">
                <Download className="h-4 w-4 mr-2" /> Download PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="space-y-1.5">
              <Label className="text-xs font-black uppercase text-muted-foreground">Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger className="rounded-xl h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="outstanding_advances">Outstanding Advances Report</SelectItem>
                  <SelectItem value="payroll_register">Monthly Payroll Register</SelectItem>
                  <SelectItem value="ssf_compliance">SSF Government Report</SelectItem>
                  <SelectItem value="tds_report">TDS (Tax) Compliance Report</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-black uppercase text-muted-foreground">Employee Filter</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger className="rounded-xl h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-black uppercase text-muted-foreground">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search records..." className="rounded-xl h-11 pl-10" />
              </div>
            </div>
          </div>

          <div className="border rounded-2xl overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                {reportType === "outstanding_advances" ? (
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Disbursement Date</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Settled</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Aging</TableHead>
                  </TableRow>
                ) : (
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Gross</TableHead>
                    <TableHead>SSF (11%)</TableHead>
                    <TableHead>Tax</TableHead>
                    <TableHead>Advance Rec.</TableHead>
                    <TableHead>Net Paid</TableHead>
                  </TableRow>
                )}
              </TableHeader>
              <TableBody>
                {reportData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground font-medium">
                      No records found for the selected criteria
                    </TableCell>
                  </TableRow>
                ) : reportData.map((row) => (
                  <TableRow key={row.id}>
                    {reportType === "outstanding_advances" ? (
                      <>
                        <TableCell className="font-bold">{row.employees?.name}</TableCell>
                        <TableCell>{format(new Date(row.transfer_date || row.withdrawal_date), "MMM dd, yyyy")}</TableCell>
                        <TableCell>रु {row.amount.toLocaleString()}</TableCell>
                        <TableCell className="text-emerald-600">रु 0</TableCell>
                        <TableCell className="font-black text-rose-600">रु {row.amount.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-amber-600 border-amber-200">
                            {Math.floor((new Date().getTime() - new Date(row.transfer_date || row.withdrawal_date).getTime()) / (1000 * 3600 * 24))} Days
                          </Badge>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="font-bold">{row.employees?.name}</TableCell>
                        <TableCell>रु {row.gross_salary.toLocaleString()}</TableCell>
                        <TableCell>रु {row.employee_ssf.toLocaleString()}</TableCell>
                        <TableCell>रु {row.tax_deduction.toLocaleString()}</TableCell>
                        <TableCell>रु {row.advance_recovery.toLocaleString()}</TableCell>
                        <TableCell className="font-black text-indigo-600">रु {row.net_salary.toLocaleString()}</TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffReportsTab;
