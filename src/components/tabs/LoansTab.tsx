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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { extractErrorMessage, logError } from "@/utils/errorHandling";
import TransactionDatePicker from "@/components/ui/transaction-date-picker";
import { format, addDays, addWeeks, addMonths, isBefore, startOfDay } from "date-fns";
import {
  Landmark,
  Plus,
  History,
  DollarSign,
  Calendar,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  TrendingDown,
  Percent,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { LoanSummary, LoanType, RepaymentFrequency } from "@/types/database";

const LoansTab = () => {
  const { user } = useAuth();
  const [loans, setLoans] = useState<LoanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddLoanOpen, setIsAddLoanOpen] = useState(false);
  const [isRepayOpen, setIsRepayOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<LoanSummary | null>(null);

  // New Loan Form State
  const [newLoan, setNewLoan] = useState({
    loan_name: "",
    lender_name: "",
    loan_type: "banking" as LoanType,
    principal_amount: "",
    interest_rate: "",
    repayment_frequency: "monthly" as RepaymentFrequency,
    loan_date: format(new Date(), "yyyy-MM-dd"),
    maturity_date: "",
    payment_mode: "Cash",
    description: "",
  });

  // Repayment Form State
  const [repayment, setRepayment] = useState({
    amount_paid: "",
    principal_paid: "",
    interest_paid: "",
    repayment_date: format(new Date(), "yyyy-MM-dd"),
    payment_mode: "Cash",
    remarks: "",
  });

  useEffect(() => {
    fetchLoans();
  }, [user]);

  const fetchLoans = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("loan_summaries")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLoans(data || []);
    } catch (error) {
      logError("fetching loans", error);
      toast.error(`Error loading loans: ${extractErrorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc("process_new_loan", {
        p_user_id: user.id,
        p_loan_name: newLoan.loan_name,
        p_lender_name: newLoan.lender_name,
        p_loan_type: newLoan.loan_type,
        p_principal_amount: parseFloat(newLoan.principal_amount) || 0,
        p_interest_rate: parseFloat(newLoan.interest_rate) || 0,
        p_repayment_frequency: newLoan.repayment_frequency,
        p_loan_date: newLoan.loan_date,
        p_maturity_date: newLoan.maturity_date || null,
        p_payment_mode: newLoan.payment_mode,
        p_description: newLoan.description,
      });

      if (error) throw error;

      toast.success("Loan added successfully and balance updated!");
      setIsAddLoanOpen(false);
      setNewLoan({
        loan_name: "",
        lender_name: "",
        loan_type: "banking",
        principal_amount: "",
        interest_rate: "",
        repayment_frequency: "monthly",
        loan_date: format(new Date(), "yyyy-MM-dd"),
        maturity_date: "",
        payment_mode: "Cash",
        description: "",
      });
      fetchLoans();
    } catch (error) {
      logError("adding loan", error);
      toast.error(`Error adding loan: ${extractErrorMessage(error)}`);
    }
  };

  const handleRepayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedLoan) return;

    try {
      const { error } = await supabase.rpc("process_loan_repayment", {
        p_loan_id: selectedLoan.id,
        p_user_id: user.id,
        p_amount_paid: parseFloat(repayment.amount_paid) || 0,
        p_principal_paid: parseFloat(repayment.principal_paid) || 0,
        p_interest_paid: parseFloat(repayment.interest_paid) || 0,
        p_repayment_date: repayment.repayment_date,
        p_payment_mode: repayment.payment_mode,
        p_remarks: repayment.remarks,
      });

      if (error) throw error;

      toast.success("Repayment recorded successfully and balance updated!");
      setIsRepayOpen(false);
      setRepayment({
        amount_paid: "",
        principal_paid: "",
        interest_paid: "",
        repayment_date: format(new Date(), "yyyy-MM-dd"),
        payment_mode: "Cash",
        remarks: "",
      });
      fetchLoans();
    } catch (error) {
      logError("recording repayment", error);
      toast.error(`Error recording repayment: ${extractErrorMessage(error)}`);
    }
  };

  const totalOutstanding = loans.reduce(
    (sum, loan) => sum + (loan.status === 'active' ? Number(loan.outstanding_principal) : 0),
    0
  );

  const calculateNextDueDate = (loan: LoanSummary) => {
    const lastDate = loan.last_repayment_date ? new Date(loan.last_repayment_date) : new Date(loan.loan_date);

    switch (loan.repayment_frequency) {
      case 'daily':
        return addDays(lastDate, 1);
      case 'weekly':
        return addWeeks(lastDate, 1);
      case 'monthly':
        return addMonths(lastDate, 1);
      default:
        return lastDate;
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Landmark className="h-6 w-6 text-primary" />
            Loan Management
          </h2>
          <p className="text-muted-foreground">
            Track your liabilities, repayments, and outstanding balances.
          </p>
        </div>
        <Dialog open={isAddLoanOpen} onOpenChange={setIsAddLoanOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add New Loan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Loan</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddLoan} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Loan Name</Label>
                  <Input
                    required
                    value={newLoan.loan_name}
                    onChange={(e) =>
                      setNewLoan({ ...newLoan, loan_name: e.target.value })
                    }
                    placeholder="e.g., Business Expansion"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Lender Name</Label>
                  <Input
                    required
                    value={newLoan.lender_name}
                    onChange={(e) =>
                      setNewLoan({ ...newLoan, lender_name: e.target.value })
                    }
                    placeholder="e.g., Global Bank"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Loan Type</Label>
                  <Select
                    value={newLoan.loan_type}
                    onValueChange={(val: LoanType) =>
                      setNewLoan({ ...newLoan, loan_type: val })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="banking">Banking</SelectItem>
                      <SelectItem value="cooperative">Cooperative</SelectItem>
                      <SelectItem value="local">Local Finance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select
                    value={newLoan.repayment_frequency}
                    onValueChange={(val: RepaymentFrequency) =>
                      setNewLoan({ ...newLoan, repayment_frequency: val })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Principal Amount</Label>
                  <Input
                    type="number"
                    required
                    value={newLoan.principal_amount}
                    onChange={(e) =>
                      setNewLoan({
                        ...newLoan,
                        principal_amount: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Interest Rate (% Annual)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    required
                    value={newLoan.interest_rate}
                    onChange={(e) =>
                      setNewLoan({ ...newLoan, interest_rate: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <TransactionDatePicker
                  label="Loan Date"
                  selectedDate={newLoan.loan_date}
                  onDateChange={(date) =>
                    setNewLoan({ ...newLoan, loan_date: date })
                  }
                />
                <div className="space-y-2">
                  <Label>Maturity Date (Optional)</Label>
                  <Input
                    type="date"
                    value={newLoan.maturity_date}
                    onChange={(e) =>
                      setNewLoan({ ...newLoan, maturity_date: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Deposit Inflow To</Label>
                <Select
                  value={newLoan.payment_mode}
                  onValueChange={(val) =>
                    setNewLoan({ ...newLoan, payment_mode: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash in Hand</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Account</SelectItem>
                    <SelectItem value="eSewa">eSewa Balance</SelectItem>
                    <SelectItem value="Fonepay">Fonepay Balance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={newLoan.description}
                  onChange={(e) =>
                    setNewLoan({ ...newLoan, description: e.target.value })
                  }
                  placeholder="Additional details..."
                />
              </div>

              <DialogFooter>
                <Button type="submit" className="w-full">
                  Create Loan
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-red-600">Total Outstanding Principal</p>
                <h3 className="text-2xl font-bold text-red-900">NRs. {totalOutstanding.toLocaleString()}</h3>
              </div>
              <div className="p-3 bg-red-500 rounded-full text-white">
                <TrendingDown className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-blue-600">Active Loans</p>
                <h3 className="text-2xl font-bold text-blue-900">
                  {loans.filter((l) => l.status === "active").length}
                </h3>
              </div>
              <div className="p-3 bg-blue-500 rounded-full text-white">
                <Landmark className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-green-600">Total Interest Paid</p>
                <h3 className="text-2xl font-bold text-green-900">
                  NRs. {loans.reduce((sum, l) => sum + Number(l.interest_paid), 0).toLocaleString()}
                </h3>
              </div>
              <div className="p-3 bg-green-500 rounded-full text-white">
                <Percent className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5" />
            Loan List
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loan Details</TableHead>
                  <TableHead>Type/Freq</TableHead>
                  <TableHead>Principal</TableHead>
                  <TableHead>Outstanding</TableHead>
                  <TableHead>Next Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Loading loans...
                    </TableCell>
                  </TableRow>
                ) : loans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No loans found.
                    </TableCell>
                  </TableRow>
                ) : (
                  loans.map((loan) => (
                    <TableRow key={loan.id}>
                      <TableCell>
                        <div className="font-medium">{loan.loan_name}</div>
                        <div className="text-xs text-muted-foreground">{loan.lender_name}</div>
                        <div className="text-[10px] text-muted-foreground">
                          Started: {format(new Date(loan.loan_date), "MMM dd, yyyy")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize text-[10px] mb-1 block w-fit">
                          {loan.loan_type}
                        </Badge>
                        <div className="text-xs capitalize">{loan.repayment_frequency}</div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {Number(loan.principal_amount).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-bold text-red-600">
                        {Number(loan.outstanding_principal).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {loan.status === 'active' && (
                          <div className="flex flex-col gap-1">
                            <span className={cn(
                              "text-xs font-medium",
                              isBefore(calculateNextDueDate(loan), startOfDay(new Date())) ? "text-red-600 animate-pulse" : "text-muted-foreground"
                            )}>
                              {format(calculateNextDueDate(loan), "MMM dd")}
                            </span>
                            {isBefore(calculateNextDueDate(loan), startOfDay(new Date())) && (
                              <Badge variant="destructive" className="text-[8px] h-4 px-1 w-fit">Overdue</Badge>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={loan.status === "active" ? "default" : "secondary"}
                          className="capitalize"
                        >
                          {loan.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={loan.status !== "active"}
                          onClick={() => {
                            setSelectedLoan(loan);
                            setIsRepayOpen(true);
                          }}
                        >
                          Repay
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isRepayOpen} onOpenChange={setIsRepayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Loan Repayment</DialogTitle>
          </DialogHeader>
          {selectedLoan && (
            <form onSubmit={handleRepayment} className="space-y-4">
              <div className="p-3 bg-muted rounded-md text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Loan:</span>
                  <span className="font-medium">{selectedLoan.loan_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Outstanding Principal:</span>
                  <span className="font-bold text-red-600">
                    NRs. {Number(selectedLoan.outstanding_principal).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Total Repayment Amount</Label>
                <Input
                  type="number"
                  required
                  value={repayment.amount_paid}
                  onChange={(e) => {
                    const total = e.target.value;
                    const parsedTotal = parseFloat(total) || 0;
                    const parsedInterest = parseFloat(repayment.interest_paid) || 0;
                    setRepayment({
                      ...repayment,
                      amount_paid: total,
                      // Auto-populate principal if interest is 0, or vice versa
                      principal_paid: (parsedTotal - parsedInterest).toString(),
                    });
                  }}
                  placeholder="Total amount including interest"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Principal Portion</Label>
                  <Input
                    type="number"
                    required
                    value={repayment.principal_paid}
                    onChange={(e) =>
                      setRepayment({ ...repayment, principal_paid: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Interest Portion</Label>
                  <Input
                    type="number"
                    required
                    value={repayment.interest_paid}
                    onChange={(e) => {
                      const int = e.target.value;
                      const parsedInt = parseFloat(int) || 0;
                      const parsedTotal = parseFloat(repayment.amount_paid) || 0;
                      setRepayment({
                        ...repayment,
                        interest_paid: int,
                        principal_paid: (parsedTotal - parsedInt).toString(),
                      });
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <TransactionDatePicker
                  label="Repayment Date"
                  selectedDate={repayment.repayment_date}
                  onDateChange={(date) =>
                    setRepayment({ ...repayment, repayment_date: date })
                  }
                />
                <div className="space-y-2">
                  <Label>Payment Mode</Label>
                  <Select
                    value={repayment.payment_mode}
                    onValueChange={(val) =>
                      setRepayment({ ...repayment, payment_mode: val })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Account</SelectItem>
                      <SelectItem value="eSewa">eSewa</SelectItem>
                      <SelectItem value="Fonepay">Fonepay</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Remarks</Label>
                <Textarea
                  value={repayment.remarks}
                  onChange={(e) =>
                    setRepayment({ ...repayment, remarks: e.target.value })
                  }
                  placeholder="Notes for this payment..."
                />
              </div>

              <DialogFooter>
                <Button type="submit" className="w-full">
                  Submit Repayment
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LoansTab;
