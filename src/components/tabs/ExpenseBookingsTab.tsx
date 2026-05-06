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
import { Trash2, BookMarked } from "lucide-react";
import RecordAttachments from "@/components/RecordAttachments";
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
  const [formData, setFormData] = useState({ partyName: "", amount: "", category: "", remarks: "" });
  const [newCategory, setNewCategory] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const [canAddCategory, setCanAddCategory] = useState(false);
  const [isPaidDialogOpen, setIsPaidDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<ExpenseBooking | null>(null);
  const [expenseFormData, setExpenseFormData] = useState({ paymentMode: "", remarks: "" });

  useEffect(() => {
    fetchBookings();
    fetchCategories();
    const canAdd = localStorage.getItem("canAddExpenseBookingCategory");
    if (canAdd) setCanAddCategory(JSON.parse(canAdd));
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
      }]);
      if (error) throw error;
      toast.success("Booking added!");
      setFormData({ partyName: "", amount: "", category: "", remarks: "" });
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
    setIsPaidDialogOpen(true);
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
        remarks: expenseFormData.remarks || selectedBooking.remarks,
        expense_date: new Date().toISOString().split("T")[0],
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
              <div className="text-sm text-muted-foreground">
                <p>Party: {selectedBooking.party_name}</p>
                <p>Amount: NRs. {selectedBooking.amount}</p>
                <p>Category: {selectedBooking.category}</p>
              </div>
              <div><Label>Payment Mode *</Label><Select value={expenseFormData.paymentMode} onValueChange={(v) => setExpenseFormData({ ...expenseFormData, paymentMode: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="Cash">Cash</SelectItem><SelectItem value="Esewa">Esewa</SelectItem><SelectItem value="Fonepay">Fonepay</SelectItem><SelectItem value="Bank">Bank</SelectItem></SelectContent></Select></div>
              <div><Label>Remarks</Label><Textarea value={expenseFormData.remarks} onChange={(e) => setExpenseFormData({ ...expenseFormData, remarks: e.target.value })} /></div>
              <RecordAttachments recordType="expense_booking" recordId={selectedBooking.id} />
              <DialogFooter><Button type="submit">Submit</Button></DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <BookMarked className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold text-foreground">Expense Bookings</h1>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="bg-card border"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Bookings</p><p className="text-lg font-bold text-foreground">{bookings.length}</p></CardContent></Card>
          <Card className="bg-card border"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Amount</p><p className="text-lg font-bold text-foreground">NRs. {totalBookings.toFixed(2)}</p></CardContent></Card>
          <Card className="bg-card border"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Categories</p><p className="text-lg font-bold text-foreground">{categories.length}</p></CardContent></Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="bg-card border">
              <CardHeader className="pb-3"><CardTitle className="text-base">Bookings</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Party</TableHead><TableHead>Amount</TableHead><TableHead>Category</TableHead><TableHead>Remarks</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {bookings.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium">{b.party_name}</TableCell>
                        <TableCell>NRs. {b.amount.toFixed(2)}</TableCell>
                        <TableCell>{b.category}</TableCell>
                        <TableCell className="text-muted-foreground">{b.remarks || "-"}</TableCell>
                        <TableCell><Button size="sm" onClick={() => handlePaid(b)}>Paid</Button></TableCell>
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
                  <div><Label>Party Name *</Label><Input value={formData.partyName} onChange={(e) => setFormData({ ...formData, partyName: e.target.value })} required /></div>
                  <div><Label>Amount *</Label><Input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} required /></div>
                  <div><Label>Category *</Label><Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent></Select></div>
                  <div><Label>Remarks</Label><Textarea value={formData.remarks} onChange={(e) => setFormData({ ...formData, remarks: e.target.value })} /></div>
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
                      <div key={c.id} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm">{c.name}</span>
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
