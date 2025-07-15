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
import {
  Receipt,
  Calendar as CalendarIcon,
  TrendingDown,
  DollarSign,
  Tag,
  FileText,
  AlertCircle,
  PlusCircle,
  Trash2,
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

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  payment_mode: string;
  remarks: string | null;
  expense_date: string;
}

const ExpensesTab = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    paymentMode: "",
    category: "",
    remarks: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { page, range, onPageChange, onRangeChange, itemsPerPage } =
    useTableControls();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [canEditTransactions, setCanEditTransactions] = useState(false);

  const categories = [
    "Food & Beverages",
    "Transportation",
    "Utilities",
    "Office Supplies",
    "Marketing",
    "Equipment",
    "Maintenance",
    "Insurance",
    "Legal & Professional",
    "Other",
  ];

  const paymentModes = [
    "Cash",
    "Esewa",
    "Fonepay",
    "Bank Transfer",
    "Cheque",
    "Credit Card",
    "Other",
  ];

<<<<<<< HEAD
=======
  const categoryColors = {
    "Food & Beverages": "from-orange-500 to-red-500",
    Transportation: "from-blue-500 to-cyan-500",
    Utilities: "from-yellow-500 to-orange-500",
    "Office Supplies": "from-green-500 to-emerald-500",
    Marketing: "from-purple-500 to-pink-500",
    Equipment: "from-gray-500 to-slate-500",
    Maintenance: "from-red-500 to-pink-500",
    Insurance: "from-indigo-500 to-blue-500",
    "Legal & Professional": "from-violet-500 to-purple-500",
    Other: "from-teal-500 to-cyan-500",
  };

  useEffect(() => {
    fetchExpenses();
    const canEdit = localStorage.getItem("canEditTransactions");
    if (canEdit) {
      setCanEditTransactions(JSON.parse(canEdit));
    }
  }, [user, page, range]);

>>>>>>> origin/main
  const fetchExpenses = async () => {
    if (!user) return;

    setLoading(true);
    try {
      let query = supabase
        .from("expenses")
        .select("*", { count: "exact" })
        .eq("user_id", user.id);

      if (range?.from) {
        query = query.gte("expense_date", format(range.from, "yyyy-MM-dd"));
      }
      if (range?.to) {
        query = query.lte("expense_date", format(range.to, "yyyy-MM-dd"));
      }

      const { data, error, count } = await query
        .order("expense_date", { ascending: false })
        .range((page - 1) * itemsPerPage, page * itemsPerPage - 1);

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      toast.error("Failed to load expenses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchExpenses();
    }
  }, [user, page, range]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.description ||
      !formData.amount ||
      !formData.category ||
      !formData.paymentMode
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("expenses").insert({
        user_id: user!.id,
        description: formData.description,
        amount: parseFloat(formData.amount),
        category: formData.category,
        payment_mode: formData.paymentMode,
        remarks: formData.remarks || null,
        expense_date: new Date().toISOString().split("T")[0],
      });

      if (error) throw error;

      toast.success("Expense added successfully!");
      setFormData({
        description: "",
        amount: "",
        paymentMode: "",
        category: "",
        remarks: "",
      });
      fetchExpenses();
    } catch (error) {
      console.error("Error adding expense:", error);
      toast.error("Failed to add expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
      toast.success("Expense deleted successfully!");
      fetchExpenses();
    } catch (error) {
      console.error("Error deleting expense:", error);
      toast.error("Failed to delete expense");
    }
  };

  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + expense.amount,
    0,
  );
  const categoryTotals = expenses.reduce(
    (acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    },
    {} as Record<string, number>,
  );

<<<<<<< HEAD
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-primary rounded-xl">
          <Receipt className="h-6 w-6 text-black" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-black">Expense Management</h1>
          <p className="text-gray-600">Track and manage business expenses</p>
        </div>
=======
  const topCategory = Object.entries(categoryBreakdown).sort(
    ([, a], [, b]) => b - a,
  )[0];

  const logAction = async (
    action: string,
    record_id: string,
    details: any,
  ) => {
    if (!user) return;
    await supabase.from("logs").insert({
      user_id: user.id,
      action,
      table_name: "expenses",
      record_id,
      details,
    });
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("expenses").delete().eq("id", id);

      if (error) throw error;

      toast.success("Expense deleted successfully!");
      logAction("delete", id, { id });
      fetchExpenses();
    } catch (error) {
      console.error("Error deleting expense:", error);
      toast.error("Failed to delete expense");
    }
  };

  const handleUpdate = async () => {
    if (!selectedExpense) return;

    try {
      const { error } = await supabase
        .from("expenses")
        .update(selectedExpense)
        .eq("id", selectedExpense.id);

      if (error) throw error;

      toast.success("Expense updated successfully!");
      logAction("update", selectedExpense.id, selectedExpense);
      setIsEditDialogOpen(false);
      fetchExpenses();
    } catch (error) {
      console.error("Error updating expense:", error);
      toast.error("Failed to update expense");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-pink-50 to-purple-50 relative overflow-hidden">
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
          </DialogHeader>
          {selectedExpense && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="editDescription">Description</Label>
                <Input
                  id="editDescription"
                  value={selectedExpense.description}
                  onChange={(e) =>
                    setSelectedExpense({
                      ...selectedExpense,
                      description: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="editAmount">Amount</Label>
                <Input
                  id="editAmount"
                  type="number"
                  value={selectedExpense.amount}
                  onChange={(e) =>
                    setSelectedExpense({
                      ...selectedExpense,
                      amount: parseFloat(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="editCategory">Category</Label>
                <Input
                  id="editCategory"
                  value={selectedExpense.category}
                  onChange={(e) =>
                    setSelectedExpense({
                      ...selectedExpense,
                      category: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="editPaymentMode">Payment Mode</Label>
                <Input
                  id="editPaymentMode"
                  value={selectedExpense.payment_mode}
                  onChange={(e) =>
                    setSelectedExpense({
                      ...selectedExpense,
                      payment_mode: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="editRemarks">Remarks</Label>
                <Input
                  id="editRemarks"
                  value={selectedExpense.remarks || ""}
                  onChange={(e) =>
                    setSelectedExpense({
                      ...selectedExpense,
                      remarks: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={handleUpdate}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-64 h-64 bg-gradient-to-r from-red-400/20 to-pink-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute top-1/3 right-20 w-80 h-80 bg-gradient-to-r from-pink-400/20 to-purple-500/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
        <div
          className="absolute bottom-20 left-1/4 w-72 h-72 bg-gradient-to-r from-purple-400/20 to-indigo-500/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>
>>>>>>> origin/main
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  Total Expenses
                </p>
                <p className="text-2xl font-bold text-black">
                  NRs. {totalExpenses.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-brand-100 rounded-xl">
                <DollarSign className="h-6 w-6 text-black" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  Total Entries
                </p>
                <p className="text-2xl font-bold text-black">
                  {expenses.length}
                </p>
              </div>
              <div className="p-3 bg-brand-100 rounded-xl">
                <FileText className="h-6 w-6 text-black" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  Average Expense
                </p>
                <p className="text-2xl font-bold text-black">
                  NRs.{" "}
                  {expenses.length > 0
                    ? (totalExpenses / expenses.length).toFixed(2)
                    : "0"}
                </p>
              </div>
              <div className="p-3 bg-brand-100 rounded-xl">
                <TrendingDown className="h-6 w-6 text-black" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Add Expense Form */}
        <Card className="border border-gray-200">
          <CardHeader className="bg-brand-50 border-b border-gray-200">
            <CardTitle className="flex items-center gap-3 text-black">
              <div className="p-2 bg-primary rounded-lg">
                <PlusCircle className="h-5 w-5 text-black" />
              </div>
              Add New Expense
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description" className="text-black font-medium">
                  Description *
                </Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Enter expense description"
                  required
                  className="focus:ring-primary focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount" className="text-black font-medium">
                  Amount (NRs.) *
                </Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  placeholder="0.00"
                  required
                  className="focus:ring-primary focus:border-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category" className="text-black font-medium">
                  Category *
                </Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger className="focus:ring-primary focus:border-primary">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="payment-mode"
                  className="text-black font-medium"
                >
                  Payment Method *
                </Label>
                <Select
                  value={formData.paymentMode}
                  onValueChange={(value) =>
                    setFormData({ ...formData, paymentMode: value })
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

              <div className="space-y-2">
                <Label htmlFor="remarks" className="text-black font-medium">
                  Remarks
                </Label>
                <Textarea
                  id="remarks"
                  value={formData.remarks}
                  onChange={(e) =>
                    setFormData({ ...formData, remarks: e.target.value })
                  }
                  placeholder="Additional notes (optional)"
                  className="focus:ring-primary focus:border-primary"
                  rows={3}
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary hover:bg-brand-400 text-black"
              >
                {isSubmitting ? "Adding..." : "Add Expense"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Category Summary & Filters */}
        <div className="space-y-6">
          {/* Date Filter */}
          <Card className="border border-gray-200">
            <CardHeader className="bg-brand-50 border-b border-gray-200">
              <CardTitle className="text-black">Filter Expenses</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label className="text-black font-medium">Date Range</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !range && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {range?.from ? (
                          range.to ? (
                            <>
                              {format(range.from, "LLL dd, y")} -{" "}
                              {format(range.to, "LLL dd, y")}
                            </>
                          ) : (
                            format(range.from, "LLL dd, y")
                          )
                        ) : (
                          <span>Pick a date range</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={range?.from}
                        selected={range}
                        onSelect={onRangeChange}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Category Summary */}
          <Card className="border border-gray-200">
            <CardHeader className="bg-brand-50 border-b border-gray-200">
              <CardTitle className="flex items-center gap-3 text-black">
                <div className="p-2 bg-primary rounded-lg">
                  <Tag className="h-5 w-5 text-black" />
                </div>
                Expense Categories
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {Object.keys(categoryTotals).length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">No expenses recorded yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(categoryTotals)
                    .sort(([, a], [, b]) => b - a)
                    .map(([category, amount]) => (
                      <div
                        key={category}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-primary rounded-full"></div>
                          <span className="font-medium text-black">
                            {category}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-black">
                            NRs. {amount.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500">
                            {((amount / totalExpenses) * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Expenses Table */}
      <Card className="border border-gray-200">
        <CardHeader className="bg-brand-50 border-b border-gray-200">
          <CardTitle className="flex items-center gap-3 text-black">
            <div className="p-2 bg-primary rounded-lg">
              <FileText className="h-5 w-5 text-black" />
            </div>
<<<<<<< HEAD
            Expense History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading expenses...</p>
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <p className="text-xl font-semibold text-gray-700 mb-2">
                No expenses found
              </p>
              <p className="text-gray-500">
                Add your first expense using the form above!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-black">Date</TableHead>
                    <TableHead className="text-black">Description</TableHead>
                    <TableHead className="text-black">Category</TableHead>
                    <TableHead className="text-black">Amount</TableHead>
                    <TableHead className="text-black">Payment</TableHead>
                    <TableHead className="text-black">Remarks</TableHead>
                    <TableHead className="text-black">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="text-black">
                        {format(new Date(expense.expense_date), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell className="font-medium text-black">
                        {expense.description}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="border-primary text-primary"
                        >
                          {expense.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-black">
                        NRs. {expense.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{expense.payment_mode}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-black">
                        {expense.remarks || "-"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteExpense(expense.id)}
                          className="hover:bg-red-50 hover:border-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
=======
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-10">
                <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-pink-500 rounded-full animate-spin mx-auto flex items-center justify-center mb-4">
                  <Receipt className="h-8 w-8 text-white" />
                </div>
                <p className="text-gray-600">Loading expenses...</p>
              </div>
            ) : expenses.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <p className="text-xl font-semibold text-gray-700 mb-2">
                  No expenses found
                </p>
                <p className="text-gray-500">
                  Start tracking your expenses to see them here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-gray-50 to-purple-50">
                      <TableHead className="font-semibold text-gray-700">
                        Date
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        Description
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        Category
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        Amount
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        Payment
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        Remarks
                      </TableHead>
                      <TableHead className="font-semibold text-gray-700">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={3} className="font-bold">
                        Total
                      </TableCell>
                      <TableCell colSpan={3} className="font-bold text-right">
                        NRs. {totalExpenses.toFixed(2)}
                      </TableCell>
                    </TableRow>
                    {expenses.map((expense, index) => (
                      <TableRow
                        key={expense.id}
                        className="hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 transition-all duration-200"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <TableCell className="font-medium">
                          {format(
                            new Date(expense.expense_date),
                            "MMM dd, yyyy",
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div
                            className="font-medium text-gray-800 truncate"
                            title={expense.description}
                          >
                            {expense.description}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`bg-gradient-to-r ${categoryColors[expense.category as keyof typeof categoryColors]} text-white border-0`}
                          >
                            {expense.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-bold text-lg bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">
                            NRs. {expense.amount.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200"
                          >
                            {expense.payment_mode}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <span
                            className="text-sm text-gray-600 truncate"
                            title={expense.remarks || ""}
                          >
                            {expense.remarks || "-"}
                          </span>
                        </TableCell>
                        <TableCell>
                          {canEditTransactions && (
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedExpense(expense);
                                  setIsEditDialogOpen(true);
                                }}
                              >
                                Edit
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Are you sure?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This action cannot be undone. This will
                                      permanently delete the expense.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(expense.id)}
                                    >
                                      Continue
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
          {expenses.length > 0 && (
            <div className="flex justify-center p-4 border-t border-gray-200">
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => onPageChange(page - 1)}
                  disabled={page === 1}
                  variant="outline"
                  className="hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50"
                >
                  Previous
                </Button>
                <span className="px-4 py-2 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg font-medium">
                  Page {page}
                </span>
                <Button
                  onClick={() => onPageChange(page + 1)}
                  disabled={expenses.length < itemsPerPage}
                  variant="outline"
                  className="hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50"
                >
                  Next
                </Button>
              </div>
>>>>>>> origin/main
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpensesTab;
