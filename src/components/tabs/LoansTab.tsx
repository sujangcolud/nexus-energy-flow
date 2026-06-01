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
  Edit,
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
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { LoanSummary, LoanType, RepaymentFrequency } from "@/types/database";
import MobileTable from "@/components/ui/mobile-table";

const LoansTab = () => {
  const { user } = useAuth();
  const [loans, setLoans] = useState<LoanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddLoanOpen, setIsAddLoanOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingLoanId, setEditLoanId] = useState<string | null>(null);
  const [isRepayOpen, setIsRepayOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<LoanSummary | null>(null);

  // New Loan Form State
  const [loanForm, setLoanForm] = useState({
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

  const handleSaveLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (isEditMode && editingLoanId) {
        // Simple update for editing (metadata only recommended for consistency)
        const { error } = await supabase
          .from("loans")
          .update({
            loan_name: loanForm.loan_name,
            lender_name: loanForm.lender_name,
            loan_type: loanForm.loan_type,
            interest_rate: parseFloat(loanForm.interest_rate) || 0,
            repayment_frequency: loanForm.repayment_frequency,
            loan_date: loanForm.loan_date,
            maturity_date: loanForm.maturity_date || null,
            description: loanForm.description,
          })
          .eq("id", editingLoanId);

        if (error) throw error;
        toast.success("Loan details updated successfully!");
      } else {
        const { error } = await supabase.rpc("process_new_loan", {
          p_user_id: user.id,
          p_loan_name: loanForm.loan_name,
          p_lender_name: loanForm.lender_name,
          p_loan_type: loanForm.loan_type,
          p_principal_amount: parseFloat(loanForm.principal_amount) || 0,
          p_interest_rate: parseFloat(loanForm.interest_rate) || 0,
          p_repayment_frequency: loanForm.repayment_frequency,
          p_loan_date: loanForm.loan_date,
          p_maturity_date: loanForm.maturity_date || null,
          p_payment_mode: loanForm.payment_mode,
          p_description: loanForm.description,
        });

        if (error) throw error;
        toast.success("Loan added successfully and balance updated!");
      }

      setIsAddLoanOpen(false);
      resetForm();
      fetchLoans();
    } catch (error) {
      logError(isEditMode ? "updating loan" : "adding loan", error);
      toast.error(`Error: ${extractErrorMessage(error)}`);
    }
  };

  const resetForm = () => {
    setIsEditMode(false);
    setEditLoanId(null);
    setLoanForm({
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
  };

  const openEditModal = (loan: LoanSummary) => {
    setIsEditMode(true);
    setEditLoanId(loan.id);
    setLoanForm({
      loan_name: loan.loan_name,
      lender_name: loan.lender_name,
      loan_type: loan.loan_type,
      principal_amount: loan.principal_amount.toString(),
      interest_rate: loan.interest_rate.toString(),
      repayment_frequency: loan.repayment_frequency,
      loan_date: loan.loan_date,
      maturity_date: loan.maturity_date || "",
      payment_mode: (loan as any).payment_mode || "Cash",
      description: loan.description || "",
    });
    setIsAddLoanOpen(true);
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
    <div className="space-y-4 md:space-y-6 p-2 md:p-6 pb-24 md:pb-6">
      <div className="bg-primary/5 p-4 rounded-3xl mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2 text-primary">
            <Landmark className="h-5 w-5 md:h-6 md:w-6" />
            Loan Management
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Track your liabilities, repayments, and outstanding balances.
          </p>
        </div>
        <Dialog
          open={isAddLoanOpen}
          onOpenChange={(open) => {
            setIsAddLoanOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button className="w-full md:w-auto gap-2 rounded-xl h-11 md:h-10">
              <Plus className="h-4 w-4" />
              Add New Loan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-4 md:p-6 rounded-3xl" aria-describedby={undefined}>
            <DialogHeader className="mb-4">
              <DialogTitle className="text-xl font-bold text-primary">{isEditMode ? "Edit Loan" : "Add New Loan"}</DialogTitle>
              <DialogDescription className="text-xs">
                {isEditMode
                  ? "Update your loan details below. Note: Changing amounts won't re-adjust previous balances."
                  : "Enter the details of your new loan agreement here."
                }
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveLoan} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Loan Name</Label>
                  <Input
                    required
                    value={loanForm.loan_name}
                    onChange={(e) =>
                      setLoanForm({ ...loanForm, loan_name: e.target.value })
                    }
                    placeholder="e.g., Business Expansion"
                    className="h-11 md:h-10 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Lender Name</Label>
                  <Input
                    required
                    value={loanForm.lender_name}
                    onChange={(e) =>
                      setLoanForm({ ...loanForm, lender_name: e.target.value })
                    }
                    placeholder="e.g., Global Bank"
                    className="h-11 md:h-10 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Loan Type</Label>
                  <Select
                    value={loanForm.loan_type}
                    onValueChange={(val: LoanType) =>
                      setLoanForm({ ...loanForm, loan_type: val })
                    }
                  >
                    <SelectTrigger className="h-11 md:h-10 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="banking">Banking</SelectItem>
                      <SelectItem value="cooperative">Cooperative</SelectItem>
                      <SelectItem value="local">Local Finance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Frequency</Label>
                  <Select
                    value={loanForm.repayment_frequency}
                    onValueChange={(val: RepaymentFrequency) =>
                      setLoanForm({ ...loanForm, repayment_frequency: val })
                    }
                  >
                    <SelectTrigger className="h-11 md:h-10 rounded-xl">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Principal Amount</Label>
                  <Input
                    type="number"
                    required
                    disabled={isEditMode}
                    value={loanForm.principal_amount}
                    onChange={(e) =>
                      setLoanForm({
                        ...loanForm,
                        principal_amount: e.target.value,
                      })
                    }
                    className="h-11 md:h-10 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Interest Rate (% Annual)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    required
                    value={loanForm.interest_rate}
                    onChange={(e) =>
                      setLoanForm({ ...loanForm, interest_rate: e.target.value })
                    }
                    className="h-11 md:h-10 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TransactionDatePicker
                  label="Loan Date"
                  selectedDate={loanForm.loan_date}
                  onDateChange={(date) =>
                    setLoanForm({ ...loanForm, loan_date: date })
                  }
                />
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Maturity Date (Optional)</Label>
                  <Input
                    type="date"
                    value={loanForm.maturity_date}
                    onChange={(e) =>
                      setLoanForm({ ...loanForm, maturity_date: e.target.value })
                    }
                    className="h-11 md:h-10 rounded-xl"
                  />
                </div>
              </div>

              {!isEditMode && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Deposit Inflow To</Label>
                  <Select
                    value={loanForm.payment_mode}
                    onValueChange={(val) =>
                      setLoanForm({ ...loanForm, payment_mode: val })
                    }
                  >
                    <SelectTrigger className="h-11 md:h-10 rounded-xl">
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
              )}

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</Label>
                <Textarea
                  value={loanForm.description}
                  onChange={(e) =>
                    setLoanForm({ ...loanForm, description: e.target.value })
                  }
                  placeholder="Additional details..."
                  className="rounded-xl min-h-[80px]"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="submit" className="w-full h-12 rounded-xl text-lg font-bold shadow-lg shadow-primary/20">
                  {isEditMode ? "Update Loan" : "Create Loan"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <Card className="rounded-3xl bg-white border-none shadow-sm">
          <CardContent className="p-5 md:p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Total Outstanding</p>
                <h3 className="text-xl md:text-2xl font-bold text-destructive">NRs. {totalOutstanding.toLocaleString()}</h3>
              </div>
              <div className="h-10 w-10 md:h-12 md:w-12 bg-destructive/10 rounded-2xl flex items-center justify-center text-destructive">
                <TrendingDown className="h-5 w-5 md:h-6 md:w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl bg-white border-none shadow-sm">
          <CardContent className="p-5 md:p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Active Loans</p>
                <h3 className="text-xl md:text-2xl font-bold text-primary">
                  {loans.filter((l) => l.status === "active").length}
                </h3>
              </div>
              <div className="h-10 w-10 md:h-12 md:w-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                <Landmark className="h-5 w-5 md:h-6 md:w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl bg-white border-none shadow-sm">
          <CardContent className="p-5 md:p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Total Interest Paid</p>
                <h3 className="text-xl md:text-2xl font-bold text-foreground">
                  NRs. {loans.reduce((sum, l) => sum + Number(l.interest_paid), 0).toLocaleString()}
                </h3>
              </div>
              <div className="h-10 w-10 md:h-12 md:w-12 bg-secondary/10 rounded-2xl flex items-center justify-center text-secondary">
                <Percent className="h-5 w-5 md:h-6 md:w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50 border-b border-slate-100 p-4">
          <CardTitle className="text-base md:text-lg flex items-center gap-2 font-bold">
            <History className="h-5 w-5 text-primary" />
            Loan List
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <MobileTable
            columns={[
              {
                key: "loan_name",
                label: "Loan Details",
                render: (_, loan) => (
                  <div>
                    <div className="font-bold">{loan.loan_name}</div>
                    <div className="text-[10px] text-muted-foreground">{loan.lender_name}</div>
                  </div>
                ),
              },
              {
                key: "loan_type",
                label: "Type",
                render: (val) => <Badge variant="outline" className="text-[10px]">{val}</Badge>,
              },
              {
                key: "outstanding_principal",
                label: "Outstanding",
                className: "text-right font-bold text-destructive",
                render: (val) => `रु ${Number(val).toLocaleString()}`,
              },
              {
                key: "status",
                label: "Status",
                render: (val) => <Badge variant={val === "active" ? "default" : "secondary"}>{val}</Badge>,
              },
              {
                key: "actions",
                label: "Actions",
                className: "text-right",
                render: (_, loan) => (
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => openEditModal(loan)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2 text-[10px] font-bold"
                      disabled={loan.status !== "active"}
                      onClick={() => {
                        setSelectedLoan(loan);
                        setIsRepayOpen(true);
                      }}
                    >
                      Repay
                    </Button>
                  </div>
                ),
              },
            ]}
            data={loans}
            loading={loading}
            footer={
              <div className="flex justify-between items-center font-bold text-lg">
                <span>Total Outstanding</span>
                <span className="text-destructive">
                  रु {totalOutstanding.toLocaleString()}
                </span>
              </div>
            }
          />
        </CardContent>
      </Card>

      <Dialog open={isRepayOpen} onOpenChange={setIsRepayOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-4 md:p-6 rounded-3xl" aria-describedby={undefined}>
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold text-primary">Record Loan Repayment</DialogTitle>
            <DialogDescription className="text-xs">
              Submit a payment against your outstanding loan balance.
            </DialogDescription>
          </DialogHeader>
          {selectedLoan && (
            <form onSubmit={handleRepayment} className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-2xl text-sm space-y-2 border border-muted">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Loan:</span>
                  <span className="font-bold text-foreground">{selectedLoan.loan_name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Outstanding:</span>
                  <span className="font-bold text-red-600 text-base">
                    NRs. {Number(selectedLoan.outstanding_principal).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Repayment Amount</Label>
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
                  className="h-12 text-lg font-bold rounded-xl border-primary/20 focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Principal Portion</Label>
                  <Input
                    type="number"
                    required
                    value={repayment.principal_paid}
                    onChange={(e) =>
                      setRepayment({ ...repayment, principal_paid: e.target.value })
                    }
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Interest Portion</Label>
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
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TransactionDatePicker
                  label="Repayment Date"
                  selectedDate={repayment.repayment_date}
                  onDateChange={(date) =>
                    setRepayment({ ...repayment, repayment_date: date })
                  }
                />
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Payment Mode</Label>
                  <Select
                    value={repayment.payment_mode}
                    onValueChange={(val) =>
                      setRepayment({ ...repayment, payment_mode: val })
                    }
                  >
                    <SelectTrigger className="h-11 rounded-xl">
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

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Remarks</Label>
                <Textarea
                  value={repayment.remarks}
                  onChange={(e) =>
                    setRepayment({ ...repayment, remarks: e.target.value })
                  }
                  placeholder="Notes for this payment..."
                  className="rounded-xl min-h-[80px]"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="submit" className="w-full h-12 rounded-xl text-lg font-bold shadow-lg shadow-primary/20">
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
