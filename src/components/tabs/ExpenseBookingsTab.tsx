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
import { Trash2, BookMarked, Edit, PlusCircle, CheckCircle2, Calendar as CalendarIcon, Info, ChevronDown, ChevronRight, Package, Paperclip } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { extractErrorMessage, logError } from "@/utils/errorHandling";
import RecordAttachments from "@/components/RecordAttachments";
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
import { cn } from "@/lib/utils";

interface ExpenseBooking {
  id: string;
  description: string;
  amount: number;
  category: string;
  remarks: string | null;
  payment_date: string | null;
  is_inventory_purchase?: boolean;
  inventory_item_id?: string | null;
  quantity?: number | null;
  unit?: string | null;
  cost_per_unit?: number | null;
  supplier?: string | null;
  invoice_number?: string | null;
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
    description: "",
    supplier: "",
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
  const [expandedParties, setExpandedParties] = useState<Record<string, boolean>>({});

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<ExpenseBooking | null>(null);
  const [editFormData, setEditFormData] = useState({
    description: "",
    supplier: "",
    amount: "",
    category: "",
    remarks: "",
    paymentDate: "",
    is_inventory_purchase: false,
    inventory_item_id: "",
    quantity: "",
    unit: "",
    cost_per_unit: "",
    invoice_number: ""
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
    if (!formData.description || !formData.supplier || !formData.amount || !formData.category) {
      toast.error("Fill all required fields");
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("expense_bookings").insert([{
        user_id: user.id,
        description: formData.description,
        supplier: formData.supplier,
        amount: parseFloat(formData.amount),
        category: formData.category,
        remarks: formData.remarks || null,
        payment_date: formData.paymentDate || null,
      }]);
      if (error) throw error;
      toast.success("Booking added!");
      setFormData({
        description: "",
        supplier: "",
        amount: "",
        category: "",
        remarks: "",
        paymentDate: format(new Date(), "yyyy-MM-dd")
      });
      fetchBookings();
    } catch (error) {
      logError("fetching bookings", error);
      toast.error(`Failed to load bookings: ${extractErrorMessage(error)}`);
      logError("adding booking", error);
      toast.error(`Failed to add booking: ${extractErrorMessage(error)}`);
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
      logError("adding category", error);
      toast.error(`Failed to add category: ${extractErrorMessage(error)}`);
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
      description: booking.description,
      supplier: booking.supplier || "",
      amount: booking.amount.toString(),
      category: booking.category,
      remarks: booking.remarks || "",
      paymentDate: booking.payment_date || "",
      is_inventory_purchase: booking.is_inventory_purchase || false,
      inventory_item_id: booking.inventory_item_id || "",
      quantity: booking.quantity?.toString() || "",
      unit: booking.unit || "",
      cost_per_unit: booking.cost_per_unit?.toString() || "",
      invoice_number: booking.invoice_number || ""
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
          description: editFormData.description,
          supplier: editFormData.supplier,
          amount: parseFloat(editFormData.amount),
          category: editFormData.category,
          remarks: editFormData.remarks || null,
          payment_date: editFormData.paymentDate || null,
          is_inventory_purchase: editFormData.is_inventory_purchase,
          inventory_item_id: editFormData.inventory_item_id || null,
          quantity: editFormData.quantity ? parseFloat(editFormData.quantity) : null,
          unit: editFormData.unit || null,
          cost_per_unit: editFormData.cost_per_unit ? parseFloat(editFormData.cost_per_unit) : null,
          invoice_number: editFormData.invoice_number || null,
        })
        .eq("id", editingBooking.id);
      if (error) throw error;
      toast.success("Booking updated!");
      setIsEditDialogOpen(false);
      fetchBookings();
    } catch (error) {
      logError("updating booking", error);
      toast.error(`Failed to update booking: ${extractErrorMessage(error)}`);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("expense_bookings").delete().eq("id", id);
      if (error) throw error;
      toast.success("Booking deleted!");
      fetchBookings();
    } catch (error) {
      logError("deleting booking", error);
      toast.error(`Failed to delete booking: ${extractErrorMessage(error)}`);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      const { error } = await supabase.from("expense_booking_categories").delete().eq("id", id);
      if (error) throw error;
      toast.success("Category deleted!");
      fetchCategories();
    } catch (error) {
      logError("deleting category", error);
      toast.error(`Failed to delete category: ${extractErrorMessage(error)}`);
    }
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedBooking) return;
    try {
      const { data, error } = await supabase.rpc("process_inventory_expense", {
        p_user_id: user.id,
        p_description: selectedBooking.description,
        p_amount: selectedBooking.amount,
        p_category: selectedBooking.category,
        p_payment_mode: expenseFormData.paymentMode,
        p_remarks: expenseFormData.remarks || null,
        p_expense_date: expenseFormData.paymentDate,
        p_is_inventory_purchase: selectedBooking.is_inventory_purchase || false,
        p_inventory_item_id: selectedBooking.inventory_item_id || null,
        p_quantity: selectedBooking.quantity || null,
        p_unit: selectedBooking.unit || null,
        p_cost_per_unit: selectedBooking.cost_per_unit || null,
        p_supplier: selectedBooking.supplier || null,
        p_invoice_number: selectedBooking.invoice_number || null,
        p_is_credit: false, // Now it's being paid
        p_id: selectedBooking.id // Pass the ID to make it atomic
      });

      if (error) throw error;

      toast.success("Expense recorded and balance updated!");
      setTimeout(() => {
        setIsPaidDialogOpen(false);
        fetchBookings();
      }, 0);
    } catch (error) {
      logError("processing expense payment", error);
      toast.error(`Failed to process: ${extractErrorMessage(error)}`);
    }
  };

  const totalBookings = bookings.reduce((sum, b) => sum + b.amount, 0);

  const groupedBookings = bookings.reduce((acc, b) => {
    const key = b.supplier || "No Supplier";
    if (!acc[key]) acc[key] = [];
    acc[key].push(b);
    return acc;
  }, {} as Record<string, ExpenseBooking[]>);

  const toggleParty = (party: string) => {
    setExpandedParties(prev => ({ ...prev, [party]: !prev[party] }));
  };

  return (
    <div className="min-h-screen bg-background p-2 md:p-6 pb-24 md:pb-6">
      <Dialog open={isPaidDialogOpen} onOpenChange={setIsPaidDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-4 md:p-6 rounded-3xl" aria-describedby={undefined}>
          <DialogHeader className="mb-4"><DialogTitle className="text-xl font-bold text-primary">Mark as Paid</DialogTitle></DialogHeader>
          {selectedBooking && (
            <form onSubmit={handleExpenseSubmit} className="space-y-4 md:space-y-6">
              <div className="space-y-2 p-4 bg-primary/5 rounded-2xl border border-primary/10 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Party:</span>
                  <span className="font-bold">{selectedBooking.supplier || "N/A"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-bold text-primary text-base">₹ {selectedBooking.amount.toFixed(2)}</span>
                </div>
                <div className="pt-2 border-t border-primary/10 flex justify-between items-center">
                  <span className="text-muted-foreground">Details:</span>
                  <span className="font-medium">{selectedBooking.description}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Payment Date *</Label>
                <TransactionDatePicker
                  selectedDate={expenseFormData.paymentDate}
                  onDateChange={(d) => setExpenseFormData({ ...expenseFormData, paymentDate: d })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Payment Mode *</Label>
                <Select value={expenseFormData.paymentMode} onValueChange={(v) => setExpenseFormData({ ...expenseFormData, paymentMode: v })}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Esewa">Esewa</SelectItem>
                    <SelectItem value="Fonepay">Fonepay</SelectItem>
                    <SelectItem value="Bank">Bank</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Remarks</Label>
                <Textarea value={expenseFormData.remarks} onChange={(e) => setExpenseFormData({ ...expenseFormData, remarks: e.target.value })} className="rounded-xl min-h-[80px]" />
              </div>
              <RecordAttachments recordType="expense_booking" recordId={selectedBooking.id} compact />
              <DialogFooter className="pt-2">
                <Button type="submit" className="w-full h-12 rounded-xl text-lg font-bold shadow-lg shadow-primary/20">Confirm Payment</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-4 md:p-6 rounded-3xl" aria-describedby={undefined}>
          <DialogHeader className="mb-4"><DialogTitle className="text-xl font-bold text-primary">Edit Booking</DialogTitle></DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4 md:space-y-6">
            <div className="space-y-1.5"><Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description *</Label><Input value={editFormData.description} onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })} required className="h-11 rounded-xl" /></div>
            <div className="space-y-1.5"><Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Supplier/Party *</Label><Input value={editFormData.supplier} onChange={(e) => setEditFormData({ ...editFormData, supplier: e.target.value })} required className="h-11 rounded-xl" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Amount *</Label><Input type="number" value={editFormData.amount} onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })} required className="h-11 rounded-xl" /></div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Category *</Label>
                <Select value={editFormData.category} onValueChange={(v) => setEditFormData({ ...editFormData, category: v })}>
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Expected Payment Date</Label>
              <TransactionDatePicker
                selectedDate={editFormData.paymentDate}
                onDateChange={(d) => setEditFormData({ ...editFormData, paymentDate: d })}
              />
            </div>
            <div className="space-y-1.5"><Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Remarks</Label><Textarea value={editFormData.remarks} onChange={(e) => setEditFormData({ ...editFormData, remarks: e.target.value })} className="rounded-xl" /></div>

            <div className="border-t border-border pt-4 mt-4 space-y-4">
              <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Inventory Details</h3>
              <div className="flex items-center space-x-3 bg-muted/50 p-3 rounded-xl border border-border">
                <input
                  type="checkbox"
                  id="edit-is-inventory"
                  className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"
                  checked={editFormData.is_inventory_purchase}
                  onChange={(e) => setEditFormData({...editFormData, is_inventory_purchase: e.target.checked})}
                />
                <Label htmlFor="edit-is-inventory" className="font-medium cursor-pointer">Is Inventory Purchase?</Label>
              </div>

              {editFormData.is_inventory_purchase && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Item ID (UUID)</Label>
                    <Input value={editFormData.inventory_item_id} onChange={(e) => setEditFormData({...editFormData, inventory_item_id: e.target.value})} placeholder="UUID" className="h-11 rounded-xl" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Qty</Label><Input type="number" value={editFormData.quantity} onChange={(e) => setEditFormData({...editFormData, quantity: e.target.value})} className="h-11 rounded-xl" /></div>
                    <div className="space-y-1.5"><Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Unit</Label><Input value={editFormData.unit} onChange={(e) => setEditFormData({...editFormData, unit: e.target.value})} className="h-11 rounded-xl" /></div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="pt-2"><Button type="submit" className="w-full h-12 rounded-xl text-lg font-bold shadow-lg shadow-primary/20">Update Booking</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="space-y-4 md:space-y-6">
        <div className="bg-primary/5 p-4 rounded-3xl mb-4 md:mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-xl text-white">
              <BookMarked className="h-5 w-5 md:h-6 md:w-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground">Expense Bookings</h1>
              <p className="text-xs text-muted-foreground mt-0.5 italic">Track pending payments and liabilities</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden">
            <CardContent className="p-4 md:p-6">
              <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Bookings</p>
              <p className="text-sm md:text-xl font-bold text-foreground">{bookings.length}</p>
            </CardContent>
          </Card>
          <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden">
            <CardContent className="p-4 md:p-6">
              <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Amount</p>
              <p className="text-sm md:text-xl font-bold text-primary">₹ {totalBookings.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden hidden md:block">
            <CardContent className="p-4 md:p-6">
              <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Categories</p>
              <p className="text-sm md:text-xl font-bold text-foreground">{categories.length}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-muted/50/50 border-b border-border px-4 md:px-6 py-4">
                <CardTitle className="text-base md:text-lg font-bold">Active Liabilities</CardTitle>
              </CardHeader>
              <CardContent className="p-2 md:p-6">
                <div className="space-y-3">
                  {bookings.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground bg-muted/50 rounded-2xl border-2 border-dashed border-border">
                      <BookMarked className="h-10 w-10 mx-auto mb-3 opacity-20" />
                      <p className="font-medium">No pending expense bookings</p>
                    </div>
                  )}
                  {Object.entries(groupedBookings).map(([party, partyBookings]) => {
                    const partyTotal = partyBookings.reduce((sum, b) => sum + b.amount, 0);
                    const isExpanded = expandedParties[party];

                    return (
                      <div key={party} className="border border-border rounded-2xl overflow-hidden bg-white shadow-sm">
                        <div
                          className={cn(
                            "p-4 flex items-center justify-between cursor-pointer transition-all",
                            isExpanded ? "bg-primary/5" : "hover:bg-muted/50"
                          )}
                          onClick={() => toggleParty(party)}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "h-8 w-8 rounded-full flex items-center justify-center transition-transform duration-200",
                              isExpanded ? "bg-primary text-white rotate-90" : "bg-muted text-muted-foreground"
                            )}>
                              <ChevronRight className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="font-bold text-base md:text-lg text-foreground">{party}</div>
                              <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{partyBookings.length} booking(s)</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground font-bold uppercase tracking-tighter mb-0.5">Pending</div>
                            <div className="text-lg md:text-xl font-black text-primary">₹ {partyTotal.toLocaleString()}</div>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="border-t border-border p-0 animate-in slide-in-from-top-2 duration-200">
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader className="bg-muted/50/50">
                                  <TableRow>
                                    <TableHead className="text-[10px] font-black uppercase">Details</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase">Amount</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase text-right">Actions</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {partyBookings.map((b) => (
                                    <TableRow key={b.id} className="hover:bg-muted/50/50">
                                      <TableCell>
                                        <div className="space-y-1">
                                          <div className="flex items-center gap-1.5">
                                            {b.is_inventory_purchase && <Package className="h-3 w-3 text-amber-500" />}
                                            <span className="font-bold text-sm text-foreground">{b.description}</span>
                                          </div>
                                          <div className="flex flex-wrap gap-1">
                                            <Badge variant="secondary" className="text-[9px] h-4 px-1.5 rounded-md font-bold">{b.category}</Badge>
                                            {b.payment_date && (
                                              <Badge variant="outline" className="text-[9px] h-4 px-1.5 rounded-md font-bold text-accent border-orange-100 bg-accent/5/30">
                                                Due: {format(new Date(b.payment_date), "MMM dd")}
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <span className="font-black text-foreground">₹ {b.amount.toLocaleString()}</span>
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                          <Button size="icon" variant="ghost" className="h-8 w-8 text-success hover:bg-success/5 rounded-lg" onClick={() => handlePaid(b)}>
                                            <CheckCircle2 className="h-4 w-4" />
                                          </Button>
                                          <Button size="icon" variant="ghost" className="h-8 w-8 text-primary hover:bg-primary/5 rounded-lg" onClick={() => handleEdit(b)}>
                                            <Edit className="h-4 w-4" />
                                          </Button>
                                          <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg">
                                                <Trash2 className="h-4 w-4" />
                                              </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent className="rounded-3xl">
                                              <AlertDialogHeader>
                                                <AlertDialogTitle>Delete Booking?</AlertDialogTitle>
                                                <AlertDialogDescription>This will permanently remove this liability.</AlertDialogDescription>
                                              </AlertDialogHeader>
                                              <AlertDialogFooter>
                                                <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDelete(b.id)} className="bg-destructive hover:bg-destructive/90 rounded-xl">Delete</AlertDialogAction>
                                              </AlertDialogFooter>
                                            </AlertDialogContent>
                                          </AlertDialog>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4 md:space-y-6">
            <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-primary text-white p-4 md:px-6 py-4">
                <CardTitle className="text-base md:text-lg font-bold flex items-center gap-2">
                  <PlusCircle className="h-5 w-5" />
                  Add New Booking
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5"><Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description *</Label><Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="e.g. Meat purchase" required className="h-11 rounded-xl" /></div>
                  <div className="space-y-1.5"><Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Supplier (Party Name) *</Label><Input value={formData.supplier} onChange={(e) => setFormData({ ...formData, supplier: e.target.value })} placeholder="e.g. ABC Meat Shop" required className="h-11 rounded-xl" /></div>
                  <div className="space-y-1.5"><Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Amount *</Label><Input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} placeholder="0.00" required className="h-11 rounded-xl" /></div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Category *</Label>
                    <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                      <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Expected Payment Date</Label>
                    <TransactionDatePicker
                      selectedDate={formData.paymentDate}
                      onDateChange={(d) => setFormData({ ...formData, paymentDate: d })}
                    />
                  </div>
                  <div className="space-y-1.5"><Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Remarks</Label><Textarea value={formData.remarks} onChange={(e) => setFormData({ ...formData, remarks: e.target.value })} placeholder="Notes..." className="rounded-xl min-h-[80px]" /></div>
                  <Button type="submit" disabled={isSubmitting} className="w-full h-12 rounded-xl text-lg font-bold shadow-lg shadow-primary/20">{isSubmitting ? "Adding..." : "Create Booking"}</Button>
                </form>
              </CardContent>
            </Card>

            {canAddCategory && (
              <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden">
                <CardHeader className="bg-muted/50/50 border-b border-border px-4 md:px-6 py-4">
                  <CardTitle className="text-base md:text-lg font-bold">Categories</CardTitle>
                </CardHeader>
                <CardContent className="p-4 md:p-6">
                  <form onSubmit={handleAddCategory} className="flex gap-2 mb-6">
                    <Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="New category" className="h-11 rounded-xl" />
                    <Button type="submit" className="h-11 w-11 rounded-xl p-0 font-bold"><PlusCircle className="h-5 w-5" /></Button>
                  </form>
                  <div className="space-y-2">
                    {categories.map((c) => (
                      <div key={c.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-2xl border border-border group">
                        <span className="text-sm font-medium text-foreground">{c.name}</span>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-3xl">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Category?</AlertDialogTitle>
                              <AlertDialogDescription>Remove "{c.name}" from bookings.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteCategory(c.id)} className="bg-destructive hover:bg-destructive/90 rounded-xl">Delete</AlertDialogAction>
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
