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
import { Plus, TrendingUp, TrendingDown, DollarSign, Calendar, Trash2, ArrowUpDown, Minus, Paperclip } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import RecordAttachments, { type AttachmentRecordType } from "@/components/RecordAttachments";

interface ShareInvestment {
  id: string;
  shareholder_name: string;
  contribution_amount: number;
  investment_date: string;
  payment_mode: string;
  created_at: string;
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
      setInvestments(investmentsData || []);

      // Fetch share expenses (visible to all authenticated users)
      const { data: expensesData, error: expensesError } = await supabase
        .from("share_expenses")
        .select("*")
        .order("expense_date", { ascending: false });

      if (expensesError) throw expensesError;
      setExpenses(expensesData || []);

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
      const { error } = await supabase.from("share_investments").insert({
        user_id: user?.id,
        shareholder_name: newInvestment.shareholder_name,
        contribution_amount: parseFloat(newInvestment.contribution_amount),
        investment_date: newInvestment.investment_date,
        payment_mode: newInvestment.payment_mode,
      });

      if (error) throw error;

      toast.success("Share investment added successfully.");
      setNewInvestment({
        shareholder_name: "",
        contribution_amount: "",
        investment_date: new Date().toISOString().split("T")[0],
        payment_mode: "cash",
      });
      fetchData();
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
      const { error } = await supabase.from("share_expenses").insert({
        user_id: user?.id,
        description: newExpense.description,
        amount: parseFloat(newExpense.amount),
        expense_date: newExpense.expense_date,
        payment_mode: newExpense.payment_mode,
        category: newExpense.category,
        remarks: newExpense.remarks || null,
      });

      if (error) throw error;

      toast.success("Share expense added successfully.");
      setNewExpense({
        description: "",
        amount: "",
        expense_date: new Date().toISOString().split("T")[0],
        payment_mode: "cash",
        category: "general",
        remarks: "",
      });
      fetchData();
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
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <TrendingUp className="h-6 w-6 text-green-600" />
        <h2 className="text-2xl font-bold text-foreground">Share Investments & Expenses</h2>
      </div>

      {/* Summary Cards - Investment vs Expense Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-chart-2/15 rounded-lg">
                <TrendingUp className="h-5 w-5 text-chart-2" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Investments</p>
                <p className="text-xl font-bold text-chart-2">₹{totalInvestments.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/15 rounded-lg">
                <TrendingDown className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Share Expenses</p>
                <p className="text-xl font-bold text-destructive">₹{totalExpenses.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${netBalance >= 0 ? "bg-primary/15" : "bg-chart-3/15"}`}>
                <ArrowUpDown className={`h-5 w-5 ${netBalance >= 0 ? "text-primary" : "text-chart-3"}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Net Balance</p>
                <p className={`text-xl font-bold ${netBalance >= 0 ? "text-primary" : "text-chart-3"}`}>
                  ₹{netBalance.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-chart-4/15 rounded-lg">
                <DollarSign className="h-5 w-5 text-chart-4" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Opening Balance</p>
                <p className="text-xl font-bold text-chart-4">
                  ₹{openingBalance ? openingBalance.opening_balance_amount.toLocaleString() : "0"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Opening Balance Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Opening Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {openingBalance ? (
            <div className="mb-4 p-4 bg-accent rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Cutoff Date</p>
                  <p className="text-lg font-semibold">{format(new Date(openingBalance.cutoff_date), "dd/MM/yyyy")}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Opening Balance</p>
                  <p className="text-lg font-semibold text-chart-2">₹{openingBalance.opening_balance_amount.toLocaleString()}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <p className="text-yellow-800 dark:text-yellow-200">No opening balance set. Please set the cutoff date and opening balance amount.</p>
            </div>
          )}

          <form onSubmit={handleSetOpeningBalance} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cutoff_date">Cutoff Date</Label>
                <Input
                  id="cutoff_date"
                  type="date"
                  value={newOpeningBalance.cutoff_date}
                  onChange={(e) => setNewOpeningBalance((prev) => ({ ...prev, cutoff_date: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="opening_balance">Opening Balance Amount (₹)</Label>
                <Input
                  id="opening_balance"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newOpeningBalance.opening_balance_amount}
                  onChange={(e) => setNewOpeningBalance((prev) => ({ ...prev, opening_balance_amount: e.target.value }))}
                  required
                />
              </div>
            </div>
            <Button type="submit" disabled={isSettingBalance}>
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Add Share Investment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddInvestment} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="shareholder_name">Shareholder Name</Label>
                    <Input
                      id="shareholder_name"
                      type="text"
                      placeholder="Enter shareholder name"
                      value={newInvestment.shareholder_name}
                      onChange={(e) => setNewInvestment((prev) => ({ ...prev, shareholder_name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contribution_amount">Contribution Amount (₹)</Label>
                    <Input
                      id="contribution_amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={newInvestment.contribution_amount}
                      onChange={(e) => setNewInvestment((prev) => ({ ...prev, contribution_amount: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="investment_date">Investment Date</Label>
                    <Input
                      id="investment_date"
                      type="date"
                      value={newInvestment.investment_date}
                      onChange={(e) => setNewInvestment((prev) => ({ ...prev, investment_date: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payment_mode">Payment Mode</Label>
                    <Select
                      value={newInvestment.payment_mode}
                      onValueChange={(value) => setNewInvestment((prev) => ({ ...prev, payment_mode: value }))}
                    >
                      <SelectTrigger>
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
                <Button type="submit" disabled={isAddingInvestment} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  {isAddingInvestment ? "Adding..." : "Add Investment"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Investment History</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">Loading investments...</div>
              ) : investments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No share investments recorded yet.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Shareholder Name</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Payment Mode</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {investments.map((investment) => (
                      <TableRow key={investment.id}>
                        <TableCell className="font-medium">{investment.shareholder_name}</TableCell>
                        <TableCell className="text-chart-2 font-semibold">₹{investment.contribution_amount.toLocaleString()}</TableCell>
                        <TableCell>{format(new Date(investment.investment_date), "dd/MM/yyyy")}</TableCell>
                        <TableCell className="capitalize">{investment.payment_mode.replace("_", " ")}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteInvestment(investment.id)} className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Minus className="h-5 w-5" />
                Add Share Expense
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddExpense} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="expense_description">Description</Label>
                    <Input
                      id="expense_description"
                      type="text"
                      placeholder="Enter expense description"
                      value={newExpense.description}
                      onChange={(e) => setNewExpense((prev) => ({ ...prev, description: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expense_amount">Amount (₹)</Label>
                    <Input
                      id="expense_amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={newExpense.amount}
                      onChange={(e) => setNewExpense((prev) => ({ ...prev, amount: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="expense_date">Expense Date</Label>
                    <Input
                      id="expense_date"
                      type="date"
                      value={newExpense.expense_date}
                      onChange={(e) => setNewExpense((prev) => ({ ...prev, expense_date: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expense_payment_mode">Payment Mode</Label>
                    <Select
                      value={newExpense.payment_mode}
                      onValueChange={(value) => setNewExpense((prev) => ({ ...prev, payment_mode: value }))}
                    >
                      <SelectTrigger>
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
                  <div className="space-y-2">
                    <Label htmlFor="expense_category">Category</Label>
                    <Select
                      value={newExpense.category}
                      onValueChange={(value) => setNewExpense((prev) => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
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
                <div className="space-y-2">
                  <Label htmlFor="expense_remarks">Remarks (Optional)</Label>
                  <Input
                    id="expense_remarks"
                    type="text"
                    placeholder="Additional notes"
                    value={newExpense.remarks}
                    onChange={(e) => setNewExpense((prev) => ({ ...prev, remarks: e.target.value }))}
                  />
                </div>
                <Button type="submit" disabled={isAddingExpense} className="w-full">
                  <Minus className="h-4 w-4 mr-2" />
                  {isAddingExpense ? "Adding..." : "Add Share Expense"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Share Expense History</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">Loading expenses...</div>
              ) : expenses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingDown className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No share expenses recorded yet.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Payment Mode</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell className="font-medium">{expense.description}</TableCell>
                        <TableCell className="text-destructive font-semibold">₹{expense.amount.toLocaleString()}</TableCell>
                        <TableCell>{format(new Date(expense.expense_date), "dd/MM/yyyy")}</TableCell>
                        <TableCell className="capitalize">{expense.category}</TableCell>
                        <TableCell className="capitalize">{expense.payment_mode.replace("_", " ")}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteExpense(expense.id)} className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ShareInvestmentsTab;