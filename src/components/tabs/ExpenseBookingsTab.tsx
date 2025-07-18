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
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PlusCircle,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface ExpenseBooking {
  id: string;
  party_name: string;
  amount: number;
  category: string;
  remarks: string | null;
}

interface Category {
  id: string;
  name: string;
}

const ExpenseBookingsTab = () => {
  const [bookings, setBookings] = useState<ExpenseBooking[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    partyName: "",
    amount: "",
    category: "",
    remarks: "",
  });
  const [newCategory, setNewCategory] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const [canAddCategory, setCanAddCategory] = useState(false);
  const [isPaidDialogOpen, setIsPaidDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<ExpenseBooking | null>(
    null,
  );
  const [expenseFormData, setExpenseFormData] = useState({
    paymentMode: "",
    remarks: "",
  });

  useEffect(() => {
    fetchBookings();
    fetchCategories();
    const canAdd = localStorage.getItem("canAddExpenseBookingCategory");
    if (canAdd) {
      setCanAddCategory(JSON.parse(canAdd));
    }
  }, [user]);

  const fetchBookings = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("expense_bookings")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setBookings(data || []);
    } catch (error) {
      console.error("Error fetching expense bookings:", error);
      toast.error("Failed to load expense bookings");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("expense_booking_categories")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.error("Failed to load categories");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Please log in to add expense bookings");
      return;
    }

    if (!formData.partyName || !formData.amount || !formData.category) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("expense_bookings").insert([
        {
          user_id: user.id,
          party_name: formData.partyName,
          amount: parseFloat(formData.amount),
          category: formData.category,
          remarks: formData.remarks || null,
        },
      ]);

      if (error) throw error;

      toast.success("Expense booking added successfully!");
      setFormData({
        partyName: "",
        amount: "",
        category: "",
        remarks: "",
      });
      fetchBookings();
    } catch (error) {
      console.error("Error adding expense booking:", error);
      toast.error("Failed to add expense booking");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory) {
      toast.error("Please enter a category name");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("expense_booking_categories")
        .insert({ name: newCategory })
        .select();

      if (error) throw error;

      toast.success(`Category "${newCategory}" added successfully`);
      setNewCategory("");
      fetchCategories();
    } catch (error) {
      console.error("Error adding category:", error);
      toast.error("Failed to add category");
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      const { error } = await supabase
        .from("expense_booking_categories")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Category deleted successfully");
      fetchCategories();
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error("Failed to delete category");
    }
  };

  const handlePaid = (booking: ExpenseBooking) => {
    setSelectedBooking(booking);
    setIsPaidDialogOpen(true);
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedBooking) return;

    try {
      const { error } = await supabase.from("expenses").insert([
        {
          user_id: user.id,
          description: selectedBooking.party_name,
          amount: selectedBooking.amount,
          category: selectedBooking.category,
          payment_mode: expenseFormData.paymentMode,
          remarks: expenseFormData.remarks || selectedBooking.remarks,
          expense_date: new Date().toISOString().split("T")[0],
        },
      ]);

      if (error) throw error;

      await supabase
        .from("expense_bookings")
        .delete()
        .eq("id", selectedBooking.id);

      toast.success("Expense recorded and booking removed successfully!");
      setIsPaidDialogOpen(false);
      fetchBookings();
    } catch (error) {
      console.error("Error handling paid booking:", error);
      toast.error("Failed to handle paid booking");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 p-6">
      <Dialog open={isPaidDialogOpen} onOpenChange={setIsPaidDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Paid</DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <form onSubmit={handleExpenseSubmit} className="space-y-4">
              <div>
                <Label>Party Name: {selectedBooking.party_name}</Label>
              </div>
              <div>
                <Label>Amount: {selectedBooking.amount}</Label>
              </div>
              <div>
                <Label>Category: {selectedBooking.category}</Label>
              </div>
              <div>
                <Label htmlFor="paymentMode">Payment Mode</Label>
                <Select
                  value={expenseFormData.paymentMode}
                  onValueChange={(value) =>
                    setExpenseFormData({ ...expenseFormData, paymentMode: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Esewa">Esewa</SelectItem>
                    <SelectItem value="Fonepay">Fonepay</SelectItem>
                    <SelectItem value="Bank">Bank</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="remarks">Remarks</Label>
                <Textarea
                  id="remarks"
                  value={expenseFormData.remarks}
                  onChange={(e) =>
                    setExpenseFormData({
                      ...expenseFormData,
                      remarks: e.target.value,
                    })
                  }
                />
              </div>
              <DialogFooter>
                <Button type="submit">Submit</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Expense Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Party Name</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Remarks</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell>{booking.party_name}</TableCell>
                      <TableCell>{booking.amount}</TableCell>
                      <TableCell>{booking.category}</TableCell>
                      <TableCell>{booking.remarks}</TableCell>
                      <TableCell>
                        <Button onClick={() => handlePaid(booking)}>Paid</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Add Expense Booking</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="partyName">Party Name</Label>
                  <Input
                    id="partyName"
                    value={formData.partyName}
                    onChange={(e) =>
                      setFormData({ ...formData, partyName: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      setFormData({ ...formData, category: value })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="remarks">Remarks</Label>
                  <Textarea
                    id="remarks"
                    value={formData.remarks}
                    onChange={(e) =>
                      setFormData({ ...formData, remarks: e.target.value })
                    }
                  />
                </div>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Adding..." : "Add Booking"}
                </Button>
              </form>
            </CardContent>
          </Card>
          {canAddCategory && (
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>Manage Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddCategory} className="space-y-4">
                  <Input
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Enter new category"
                  />
                  <Button type="submit">Add Category</Button>
                </form>
                <div className="mt-6 space-y-2">
                  {categories.map((cat) => (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between"
                    >
                      <span>{cat.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCategory(cat.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExpenseBookingsTab;
