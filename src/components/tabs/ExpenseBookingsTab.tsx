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
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, BookMarked, Edit, PlusCircle, CheckCircle2, Calendar as CalendarIcon } from "lucide-react";
import RecordAttachments from "@/components/RecordAttachments";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import TransactionDatePicker from "@/components/ui/transaction-date-picker";
import { format } from "date-fns";

interface ExpenseBooking {
  id: string;
  party_name: string;
  amount: number;
  category: string;
  remarks: string | null;
  payment_date: string | null;
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
    paymentDate: format(new Date(), "yyyy-MM-dd")
  });
  const [newCategory, setNewCategory] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const [canAddCategory, setCanAddCategory] = useState(true); // Default to true as per request
  const [isPaidDialogOpen, setIsPaidDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<ExpenseBooking | null>(null);
  const [expenseFormData, setExpenseFormData] = useState({ paymentMode: "", remarks: "", paymentDate: "" });

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<ExpenseBooking | null>(null);
  const [editFormData, setEditFormData] = useState({
    partyName: "",
    amount: "",
    category: "",
    remarks: "",
    paymentDate: ""
  });

  useEffect(() => {
    fetchBookings();
    fetchCategories();
    const canAdd = localStorage.getItem("canAddExpenseBookingCategory");
    if (canAdd !== null) setCanAddCategory(JSON.parse(canAdd));
  }, [user]);

  const fetchBookings = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from("expense_bookings").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase.from("expense_booking_categories").select("*").order("name");
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error("Please log in"); return; }
    if (!formData.partyName || !formData.amount || !formData.category) {
      toast.error("Fill all required fields");
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("expense_bookings").insert([{
        user_id: user.id,
        party_name: formData.partyName,
        amount: parseFloat(formData.amount),
        category: formData.category,
        remarks: formData.remarks || null,
        payment_date: formData.paymentDate || null,
      }]);
      if (error) throw error;
      toast.success("Booking added!");
      setFormData({
        partyName: "",
        amount: "",
        category: "",
        remarks: "",
        paymentDate: format(new Date(), "yyyy-MM-dd")
      });
      fetchBookings();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to add booking");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory) { toast.error("Enter category name"); return; }
    try {
      const { error } = await supabase.from("expense_booking_categories").insert({ name: newCategory });
      if (error) throw error;
      toast.success(`Category "${newCategory}" added`);
      setNewCategory("");
      fetchCategories();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to add category");
    }
  };

  const handlePaid = (booking: ExpenseBooking) => {
    setSelectedBooking(booking);
    setExpenseFormData({
      paymentMode: "Cash",
      remarks: booking.remarks || "",
      paymentDate: booking.payment_date || format(new Date(), "yyyy-MM-dd")
    });
    setIsPaidDialogOpen(true);
  };

  const handleEdit = (booking: ExpenseBooking) => {
    setEditingBooking(booking);
    setEditFormData({
      partyName: booking.party_name,
      amount: booking.amount.toString(),
      category: booking.category,
      remarks: booking.remarks || "",
      paymentDate: booking.payment_date || ""
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingBooking) return;
    try {
      const { error } = await supabase
        .from("expense_bookings")
        .update({
          party_name: editFormData.partyName,
          amount: parseFloat(editFormData.amount),
          category: editFormData.category,
          remarks: editFormData.remarks || null,
          payment_date: editFormData.paymentDate || null,
        })
        .eq("id", editingBooking.id);
      if (error) throw error;
      toast.success("Booking updated!");
      setIsEditDialogOpen(false);
      fetchBookings();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to update booking");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("expense_bookings").delete().eq("id", id);
      if (error) throw error;
      toast.success("Booking deleted!");
      fetchBookings();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to delete booking");
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      const { error } = await supabase.from("expense_booking_categories").delete().eq("id", id);
      if (error) throw error;
      toast.success("Category deleted!");
      fetchCategories();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to delete category");
    }
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedBooking) return;
    try {
      const { error } = await supabase.from("expenses").insert([{
        user_id: user.id,
        description: selectedBooking.party_name,
        amount: selectedBooking.amount,
        category: selectedBooking.category,
        payment_mode: expenseFormData.paymentMode,
        remarks: expenseFormData.remarks,
        expense_date: expenseFormData.paymentDate,
      }]);
      if (error) throw error;
      await supabase.from("expense_bookings").delete().eq("id", selectedBooking.id);
      toast.success("Expense recorded!");
      setIsPaidDialogOpen(false);
      fetchBookings();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to process");
    }
  };

  const totalBookings = bookings.reduce((sum, b) => sum + b.amount, 0);

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <Dialog open={isPaidDialogOpen} onOpenChange={setIsPaidDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Mark as Paid</DialogTitle></DialogHeader>
          {selectedBooking && (
            <form onSubmit={handleExpenseSubmit} className="space-y-4">
              <div className="space-y-2 p-3 bg-muted rounded-md text-sm">
                <div className="flex justify-between"><span>Party:</span><span className="font-medium">{selectedBooking.party_name}</span></div>
                <div className="flex justify-between"><span>Amount:</span><span className="font-medium">NRs. {selectedBooking.amount.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Category:</span><span className="font-medium">{selectedBooking.category}</span></div>
              </div>
              <div>
                <Label>Payment Date *</Label>
                <TransactionDatePicker
                  selectedDate={expenseFormData.paymentDate}
                  onDateChange={(d) => setExpenseFormData({ ...expenseFormData, paymentDate: d })}
                />
              </div>
              <div><Label>Payment Mode *</Label><Select value={expenseFormData.paymentMode} onValueChange={(v) => setExpenseFormData({ ...expenseFormData, paymentMode: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="Cash">Cash</SelectItem><SelectItem value="Esewa">Esewa</SelectItem><SelectItem value="Fonepay">Fonepay</SelectItem><SelectItem value="Bank">Bank</SelectItem></SelectContent></Select></div>
              <div><Label>Remarks</Label><Textarea value={expenseFormData.remarks} onChange={(e) => setExpenseFormData({ ...expenseFormData, remarks: e.target.value })} /></div>
              <RecordAttachments recordType="expense_booking" recordId={selectedBooking.id} />
              <DialogFooter><Button type="submit" className="w-full">Confirm Payment</Button></DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Booking</DialogTitle></DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div><Label>Party Name *</Label><Input value={editFormData.partyName} onChange={(e) => setEditFormData({ ...editFormData, partyName: e.target.value })} required /></div>
            <div><Label>Amount *</Label><Input type="number" value={editFormData.amount} onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })} required /></div>
            <div><Label>Category *</Label><Select value={editFormData.category} onValueChange={(v) => setEditFormData({ ...editFormData, category: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent></Select></div>
            <div>
              <Label>Payment Date</Label>
              <TransactionDatePicker
                selectedDate={editFormData.paymentDate}
                onDateChange={(d) => setEditFormData({ ...editFormData, paymentDate: d })}
              />
            </div>
            <div><Label>Remarks</Label><Textarea value={editFormData.remarks} onChange={(e) => setEditFormData({ ...editFormData, remarks: e.target.value })} /></div>
            <DialogFooter><Button type="submit" className="w-full">Update Booking</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BookMarked className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-lg font-semibold text-foreground">Expense Bookings</h1>
          </div>
          <p className="text-sm text-muted-foreground italic">Track pending payments and liabilities</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="bg-card border"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Bookings</p><p className="text-lg font-bold text-foreground">{bookings.length}</p></CardContent></Card>
          <Card className="bg-card border"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Amount</p><p className="text-lg font-bold text-foreground">NRs. {totalBookings.toFixed(2)}</p></CardContent></Card>
          <Card className="bg-card border"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Categories</p><p className="text-lg font-bold text-foreground">{categories.length}</p></CardContent></Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="bg-card border">
              <CardHeader className="pb-3"><CardTitle className="text-base">Active Liabilities</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Party</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Expected Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No pending expense bookings found.</TableCell></TableRow>
                    )}
                    {bookings.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell>
                          <div className="font-medium">{b.party_name}</div>
                          {b.remarks && <div className="text-[10px] text-muted-foreground truncate max-w-[150px]">{b.remarks}</div>}
                        </TableCell>
                        <TableCell className="font-semibold">NRs. {b.amount.toFixed(2)}</TableCell>
                        <TableCell><Badge variant="outline">{b.category}</Badge></TableCell>
                        <TableCell className="text-xs">
                          {b.payment_date ? (
                            <div className="flex items-center gap-1"><CalendarIcon className="h-3 w-3" /> {format(new Date(b.payment_date), "MMM dd, yyyy")}</div>
                          ) : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handlePaid(b)} title="Mark as Paid">
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => handleEdit(b)} title="Edit">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" title="Delete">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Booking?</AlertDialogTitle>
                                  <AlertDialogDescription>This will permanently remove the booking for {b.party_name}.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(b.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="bg-card border">
              <CardHeader className="pb-3"><CardTitle className="text-base">Add Booking</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div><Label>Party Name *</Label><Input value={formData.partyName} onChange={(e) => setFormData({ ...formData, partyName: e.target.value })} placeholder="e.g. Supplier Name" required /></div>
                  <div><Label>Amount *</Label><Input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} placeholder="0.00" required /></div>
                  <div><Label>Category *</Label><Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent></Select></div>
                  <div>
                    <Label>Expected Payment Date</Label>
                    <TransactionDatePicker
                      selectedDate={formData.paymentDate}
                      onDateChange={(d) => setFormData({ ...formData, paymentDate: d })}
                    />
                  </div>
                  <div><Label>Remarks</Label><Textarea value={formData.remarks} onChange={(e) => setFormData({ ...formData, remarks: e.target.value })} placeholder="Optional notes" /></div>
                  <Button type="submit" disabled={isSubmitting} className="w-full">{isSubmitting ? "Adding..." : "Add Booking"}</Button>
                </form>
              </CardContent>
            </Card>

            {canAddCategory && (
              <Card className="bg-card border">
                <CardHeader className="pb-3"><CardTitle className="text-base">Categories</CardTitle></CardHeader>
                <CardContent>
                  <form onSubmit={handleAddCategory} className="flex gap-2 mb-4">
                    <Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="New category" />
                    <Button type="submit">Add</Button>
                  </form>
                  <div className="space-y-2">
                    {categories.map((c) => (
                      <div key={c.id} className="flex items-center justify-between p-2 bg-muted rounded group">
                        <span className="text-sm font-medium">{c.name}</span>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Category?</AlertDialogTitle>
                              <AlertDialogDescription>This will remove the category "{c.name}".</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteCategory(c.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpenseBookingsTab;
