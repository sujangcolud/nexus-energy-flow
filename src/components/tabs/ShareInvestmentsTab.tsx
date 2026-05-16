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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, TrendingUp, TrendingDown, DollarSign, Trash2, ArrowUpDown, Minus, Paperclip } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import RecordAttachments, { type AttachmentRecordType } from "@/components/RecordAttachments";
import MobileTable from "@/components/ui/mobile-table";

interface ShareInvestment {
  id: string;
  shareholder_name: string;
  contribution_amount: number;
  investment_date: string;
  payment_mode: string;
  remarks: string | null;
  created_at: string;
  attachment_count?: number;
}

interface ShareExpense {
  id: string;
  description: string;
  amount: number;
  expense_date: string;
  payment_mode: string;
  category: string;
  remarks: string | null;
  created_at: string;
  attachment_count?: number;
}

interface OpeningBalance {
  id: string;
  cutoff_date: string;
  opening_balance_amount: number;
  created_at: string;
}

interface NewInvestment {
  shareholder_name: string;
  contribution_amount: string;
  investment_date: string;
  payment_mode: string;
  remarks: string;
}

interface NewExpense {
  description: string;
  amount: string;
  expense_date: string;
  payment_mode: string;
  category: string;
  remarks: string;
}

interface NewOpeningBalance {
  cutoff_date: string;
  opening_balance_amount: string;
}

const ShareInvestmentsTab = () => {
  const { user } = useAuth();
  const [investments, setInvestments] = useState<ShareInvestment[]>([]);
  const [expenses, setExpenses] = useState<ShareExpense[]>([]);
  const [openingBalance, setOpeningBalance] = useState<OpeningBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddingInvestment, setIsAddingInvestment] = useState(false);
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [isSettingBalance, setIsSettingBalance] = useState(false);
  const [activeTab, setActiveTab] = useState("investments");
  const [attachmentTarget, setAttachmentTarget] = useState<{ type: AttachmentRecordType; id: string; title: string } | null>(null);

  const [newInvestment, setNewInvestment] = useState<NewInvestment>({
    shareholder_name: "",
    contribution_amount: "",
    investment_date: new Date().toISOString().split("T")[0],
    payment_mode: "cash",
    remarks: "",
  });

  const [newExpense, setNewExpense] = useState<NewExpense>({
    description: "",
    amount: "",
    expense_date: new Date().toISOString().split("T")[0],
    payment_mode: "cash",
    category: "general",
    remarks: "",
  });

  const [newOpeningBalance, setNewOpeningBalance] = useState<NewOpeningBalance>({
    cutoff_date: new Date().toISOString().split("T")[0],
    opening_balance_amount: "",
  });

  const paymentModes = ["cash", "bank_transfer", "cheque", "upi", "card"];
  const expenseCategories = ["general", "registration", "legal", "documentation", "meeting", "travel", "other"];

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch share investments (visible to all authenticated users)
      const { data: investmentsData, error: investmentsError } = await supabase
        .from("share_investments")
        .select("*")
        .order("investment_date", { ascending: false });

      if (investmentsError) throw investmentsError;

      // Fetch share expenses (visible to all authenticated users)
      const { data: expensesData, error: expensesError } = await supabase
        .from("share_expenses")
        .select("*")
        .order("expense_date", { ascending: false });

      if (expensesError) throw expensesError;

      // Fetch attachment counts
      const invIds = (investmentsData || []).map(i => i.id);
      const expIds = (expensesData || []).map(e => e.id);

      const { data: attachments, error: attachError } = await supabase
        .from("record_attachments")
        .select("record_id, record_type")
        .in("record_id", [...invIds, ...expIds])
        .in("record_type", ["share_investment", "share_expense"]);

      const counts: Record<string, number> = {};
      if (!attachError && attachments) {
        attachments.forEach((a: any) => {
          counts[a.record_id] = (counts[a.record_id] || 0) + 1;
        });
      }

      setInvestments((investmentsData || []).map(i => ({ ...i, attachment_count: counts[i.id] || 0 })));
      setExpenses((expensesData || []).map(e => ({ ...e, attachment_count: counts[e.id] || 0 })));

      // Fetch opening balance
      const { data: balanceData, error: balanceError } = await supabase
        .from("opening_balances")
        .select("*")
        .eq("user_id", user?.id)
        .single();

      if (balanceError && balanceError.code !== "PGRST116") {
        throw balanceError;
      }
      setOpeningBalance(balanceData);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddInvestment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newInvestment.shareholder_name || !newInvestment.contribution_amount) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsAddingInvestment(true);

    try {
      const { data, error } = await supabase.from("share_investments").insert({
        user_id: user?.id,
        shareholder_name: newInvestment.shareholder_name,
        contribution_amount: parseFloat(newInvestment.contribution_amount),
        investment_date: newInvestment.investment_date,
        payment_mode: newInvestment.payment_mode,
        remarks: newInvestment.remarks || null,
      }).select().single();

      if (error) throw error;

      toast.success("Share investment added! You can now add attachments.");
      setNewInvestment({
        shareholder_name: "",
        contribution_amount: "",
        investment_date: new Date().toISOString().split("T")[0],
        payment_mode: "cash",
        remarks: "",
      });
      fetchData();
      if (data) {
        setAttachmentTarget({
          type: "share_investment",
          id: data.id,
          title: `Investment - ${data.shareholder_name}`
        });
      }
    } catch (error: any) {
      console.error("Error adding investment:", error);
      toast.error("Failed to add investment.");
    } finally {
      setIsAddingInvestment(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newExpense.description || !newExpense.amount) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsAddingExpense(true);

    try {
      const { data, error } = await supabase.from("share_expenses").insert({
        user_id: user?.id,
        description: newExpense.description,
        amount: parseFloat(newExpense.amount),
        expense_date: newExpense.expense_date,
        payment_mode: newExpense.payment_mode,
        category: newExpense.category,
        remarks: newExpense.remarks || null,
      }).select().single();

      if (error) throw error;

      toast.success("Share expense added! You can now add attachments.");
      setNewExpense({
        description: "",
        amount: "",
        expense_date: new Date().toISOString().split("T")[0],
        payment_mode: "cash",
        category: "general",
        remarks: "",
      });
      fetchData();
      if (data) {
        setAttachmentTarget({
          type: "share_expense",
          id: data.id,
          title: `Expense - ${data.description}`
        });
      }
    } catch (error: any) {
      console.error("Error adding expense:", error);
      toast.error("Failed to add expense.");
    } finally {
      setIsAddingExpense(false);
    }
  };

  const handleSetOpeningBalance = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newOpeningBalance.cutoff_date || !newOpeningBalance.opening_balance_amount) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSettingBalance(true);

    try {
      const { error } = await supabase.from("opening_balances").upsert({
        user_id: user?.id,
        cutoff_date: newOpeningBalance.cutoff_date,
        opening_balance_amount: parseFloat(newOpeningBalance.opening_balance_amount),
      });

      if (error) throw error;

      toast.success("Opening balance set successfully.");
      fetchData();
    } catch (error: any) {
      console.error("Error setting opening balance:", error);
      toast.error("Failed to set opening balance.");
    } finally {
      setIsSettingBalance(false);
    }
  };

  const handleDeleteInvestment = async (id: string) => {
    try {
      const { error } = await supabase.from("share_investments").delete().eq("id", id);
      if (error) throw error;
      toast.success("Investment deleted successfully.");
      fetchData();
    } catch (error: any) {
      console.error("Error deleting investment:", error);
      toast.error("Failed to delete investment.");
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      const { error } = await supabase.from("share_expenses").delete().eq("id", id);
      if (error) throw error;
      toast.success("Expense deleted successfully.");
      fetchData();
    } catch (error: any) {
      console.error("Error deleting expense:", error);
      toast.error("Failed to delete expense.");
    }
  };

  const totalInvestments = investments.reduce((sum, inv) => sum + inv.contribution_amount, 0);
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const netBalance = totalInvestments - totalExpenses;

  return (
    <div className="space-y-4 md:space-y-6 p-2 md:p-0 pb-24 md:pb-6">
      <div className="bg-primary/5 p-4 rounded-3xl mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary rounded-xl text-white">
            <TrendingUp className="h-5 w-5 md:h-6 md:w-6" />
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-foreground">Share Investments & Expenses</h2>
        </div>
      </div>

      {/* Summary Cards - Investment vs Expense Comparison */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card className="rounded-3xl shadow-sm border-none bg-white">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col gap-2">
              <div className="p-2 bg-chart-2/10 w-fit rounded-xl">
                <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-chart-2" />
              </div>
              <div>
                <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-muted-foreground">Investments</p>
                <p className="text-sm md:text-xl font-bold text-chart-2">₹{totalInvestments.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl shadow-sm border-none bg-white">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col gap-2">
              <div className="p-2 bg-destructive/10 w-fit rounded-xl">
                <TrendingDown className="h-4 w-4 md:h-5 md:w-5 text-destructive" />
              </div>
              <div>
                <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-muted-foreground">Expenses</p>
                <p className="text-sm md:text-xl font-bold text-destructive">₹{totalExpenses.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl shadow-sm border-none bg-white">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col gap-2">
              <div className={`p-2 w-fit rounded-xl ${netBalance >= 0 ? "bg-primary/10" : "bg-chart-3/10"}`}>
                <ArrowUpDown className={`h-4 w-4 md:h-5 md:w-5 ${netBalance >= 0 ? "text-primary" : "text-chart-3"}`} />
              </div>
              <div>
                <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-muted-foreground">Net Balance</p>
                <p className={`text-sm md:text-xl font-bold ${netBalance >= 0 ? "text-primary" : "text-chart-3"}`}>
                  ₹{netBalance.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl shadow-sm border-none bg-white">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col gap-2">
              <div className="p-2 bg-chart-4/10 w-fit rounded-xl">
                <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-chart-4" />
              </div>
              <div>
                <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-muted-foreground">Opening</p>
                <p className="text-sm md:text-xl font-bold text-chart-4">
                  ₹{openingBalance ? openingBalance.opening_balance_amount.toLocaleString() : "0"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Opening Balance Section */}
      <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-4 md:px-6 py-4">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg font-bold">
            <DollarSign className="h-5 w-5 text-primary" />
            Opening Balance
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          {openingBalance ? (
            <div className="mb-6 p-4 bg-primary/5 border border-primary/10 rounded-2xl">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Cutoff Date</p>
                  <p className="text-sm md:text-base font-semibold">{format(new Date(openingBalance.cutoff_date), "dd/MM/yyyy")}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Opening Balance</p>
                  <p className="text-sm md:text-base font-bold text-primary">₹{openingBalance.opening_balance_amount.toLocaleString()}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-6 p-4 bg-secondary/5 border border-secondary/20 rounded-2xl">
              <p className="text-xs text-amber-800">No opening balance set. Please set the cutoff date and opening balance amount.</p>
            </div>
          )}

          <form onSubmit={handleSetOpeningBalance} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="cutoff_date" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Cutoff Date</Label>
                <Input
                  id="cutoff_date"
                  type="date"
                  value={newOpeningBalance.cutoff_date}
                  onChange={(e) => setNewOpeningBalance((prev) => ({ ...prev, cutoff_date: e.target.value }))}
                  required
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="opening_balance" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Opening Balance Amount (₹)</Label>
                <Input
                  id="opening_balance"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newOpeningBalance.opening_balance_amount}
                  onChange={(e) => setNewOpeningBalance((prev) => ({ ...prev, opening_balance_amount: e.target.value }))}
                  required
                  className="h-11 rounded-xl"
                />
              </div>
            </div>
            <Button type="submit" disabled={isSettingBalance} className="w-full md:w-auto h-11 rounded-xl px-6 font-bold shadow-lg shadow-primary/20">
              <DollarSign className="h-4 w-4 mr-2" />
              {isSettingBalance ? "Setting..." : "Set Opening Balance"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Tabs for Investments and Expenses */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="investments" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Investments ({investments.length})
          </TabsTrigger>
          <TabsTrigger value="expenses" className="flex items-center gap-2">
            <Minus className="h-4 w-4" />
            Share Expenses ({expenses.length})
          </TabsTrigger>
        </TabsList>

        {/* Investments Tab */}
        <TabsContent value="investments" className="space-y-4">
          <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-4 md:px-6 py-4">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg font-bold">
                <Plus className="h-5 w-5 text-primary" />
                Add Share Investment
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <form onSubmit={handleAddInvestment} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="shareholder_name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Shareholder Name</Label>
                    <Input
                      id="shareholder_name"
                      type="text"
                      placeholder="Enter shareholder name"
                      value={newInvestment.shareholder_name}
                      onChange={(e) => setNewInvestment((prev) => ({ ...prev, shareholder_name: e.target.value }))}
                      required
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contribution_amount" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Contribution Amount (₹)</Label>
                    <Input
                      id="contribution_amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={newInvestment.contribution_amount}
                      onChange={(e) => setNewInvestment((prev) => ({ ...prev, contribution_amount: e.target.value }))}
                      required
                      className="h-11 rounded-xl"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="investment_date" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Investment Date</Label>
                    <Input
                      id="investment_date"
                      type="date"
                      value={newInvestment.investment_date}
                      onChange={(e) => setNewInvestment((prev) => ({ ...prev, investment_date: e.target.value }))}
                      required
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="payment_mode" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Payment Mode</Label>
                    <Select
                      value={newInvestment.payment_mode}
                      onValueChange={(value) => setNewInvestment((prev) => ({ ...prev, payment_mode: value }))}
                    >
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentModes.map((mode) => (
                          <SelectItem key={mode} value={mode}>
                            {mode.replace("_", " ").toUpperCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="investment_remarks" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Remarks (Optional)</Label>
                  <Input
                    id="investment_remarks"
                    type="text"
                    placeholder="Enter remarks (optional)"
                    value={newInvestment.remarks}
                    onChange={(e) => setNewInvestment((prev) => ({ ...prev, remarks: e.target.value }))}
                    className="h-11 rounded-xl"
                  />
                </div>
                <Button type="submit" disabled={isAddingInvestment} className="w-full h-12 rounded-xl text-lg font-bold shadow-lg shadow-primary/20">
                  <Plus className="h-4 w-4 mr-2" />
                  {isAddingInvestment ? "Adding..." : "Add Investment"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-4">
              <CardTitle className="text-base font-bold">Investment History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <MobileTable
                columns={[
                  {
                    key: "shareholder_name",
                    label: "Shareholder",
                    render: (val, inv) => (
                      <div className="flex items-center gap-1.5">
                        {inv.attachment_count > 0 && <Paperclip className="h-3 w-3 text-muted-foreground" />}
                        <span className="font-bold">{val}</span>
                      </div>
                    ),
                  },
                  {
                    key: "contribution_amount",
                    label: "Amount",
                    className: "text-right font-bold text-chart-2",
                    render: (val) => `रु ${Number(val).toLocaleString()}`,
                  },
                  {
                    key: "investment_date",
                    label: "Date",
                    render: (val) => format(new Date(val), "dd/MM/yyyy"),
                  },
                  {
                    key: "actions",
                    label: "Actions",
                    className: "text-right",
                    render: (_, inv) => (
                      <div className="flex justify-end gap-1">
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setAttachmentTarget({ type: "share_investment", id: inv.id, title: `Investment - ${inv.shareholder_name}` })}>
                          <Paperclip className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => handleDeleteInvestment(inv.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ),
                  },
                ]}
                data={investments}
                loading={loading}
                emptyMessage="No share investments recorded yet."
                footer={
                  <div className="flex justify-between items-center font-bold text-lg">
                    <span>Total Investments</span>
                    <span className="text-chart-2">
                      रु {totalInvestments.toLocaleString()}
                    </span>
                  </div>
                }
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-4">
          <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-4 md:px-6 py-4">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg font-bold">
                <Minus className="h-5 w-5 text-primary" />
                Add Share Expense
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <form onSubmit={handleAddExpense} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="expense_description" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</Label>
                    <Input
                      id="expense_description"
                      type="text"
                      placeholder="Enter expense description"
                      value={newExpense.description}
                      onChange={(e) => setNewExpense((prev) => ({ ...prev, description: e.target.value }))}
                      required
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="expense_amount" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Amount (₹)</Label>
                    <Input
                      id="expense_amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={newExpense.amount}
                      onChange={(e) => setNewExpense((prev) => ({ ...prev, amount: e.target.value }))}
                      required
                      className="h-11 rounded-xl"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="expense_date" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Expense Date</Label>
                    <Input
                      id="expense_date"
                      type="date"
                      value={newExpense.expense_date}
                      onChange={(e) => setNewExpense((prev) => ({ ...prev, expense_date: e.target.value }))}
                      required
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="expense_payment_mode" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Payment Mode</Label>
                    <Select
                      value={newExpense.payment_mode}
                      onValueChange={(value) => setNewExpense((prev) => ({ ...prev, payment_mode: value }))}
                    >
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentModes.map((mode) => (
                          <SelectItem key={mode} value={mode}>
                            {mode.replace("_", " ").toUpperCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="expense_category" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Category</Label>
                    <Select
                      value={newExpense.category}
                      onValueChange={(value) => setNewExpense((prev) => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {expenseCategories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="expense_remarks" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Remarks (Optional)</Label>
                  <Input
                    id="expense_remarks"
                    type="text"
                    placeholder="Enter remarks (optional)"
                    value={newExpense.remarks}
                    onChange={(e) => setNewExpense((prev) => ({ ...prev, remarks: e.target.value }))}
                    className="h-11 rounded-xl"
                  />
                </div>
                <Button type="submit" disabled={isAddingExpense} className="w-full h-12 rounded-xl text-lg font-bold shadow-lg shadow-primary/20">
                  <Minus className="h-4 w-4 mr-2" />
                  {isAddingExpense ? "Adding..." : "Add Share Expense"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-4">
              <CardTitle className="text-base font-bold">Share Expense History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <MobileTable
                columns={[
                  {
                    key: "description",
                    label: "Description",
                    render: (val, exp) => (
                      <div className="flex items-center gap-1.5">
                        {exp.attachment_count > 0 && <Paperclip className="h-3 w-3 text-muted-foreground" />}
                        <span className="font-bold">{val}</span>
                      </div>
                    ),
                  },
                  {
                    key: "amount",
                    label: "Amount",
                    className: "text-right font-bold text-destructive",
                    render: (val) => `रु ${Number(val).toLocaleString()}`,
                  },
                  {
                    key: "expense_date",
                    label: "Date",
                    render: (val) => format(new Date(val), "dd/MM/yyyy"),
                  },
                  {
                    key: "actions",
                    label: "Actions",
                    className: "text-right",
                    render: (_, exp) => (
                      <div className="flex justify-end gap-1">
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setAttachmentTarget({ type: "share_expense", id: exp.id, title: `Expense - ${exp.description}` })}>
                          <Paperclip className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => handleDeleteExpense(exp.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ),
                  },
                ]}
                data={expenses}
                loading={loading}
                emptyMessage="No share expenses recorded yet."
                footer={
                  <div className="flex justify-between items-center font-bold text-lg">
                    <span>Total Expenses</span>
                    <span className="text-destructive">
                      रु {totalExpenses.toLocaleString()}
                    </span>
                  </div>
                }
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!attachmentTarget} onOpenChange={(o) => !o && setAttachmentTarget(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Supporting Documents — {attachmentTarget?.title}</DialogTitle>
          </DialogHeader>
          {attachmentTarget && (
            <RecordAttachments recordType={attachmentTarget.type} recordId={attachmentTarget.id} compact />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ShareInvestmentsTab;
