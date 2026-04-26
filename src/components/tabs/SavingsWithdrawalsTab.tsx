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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { extractErrorMessage, logError } from "@/utils/errorHandling";
import TransactionDatePicker from "@/components/ui/transaction-date-picker";
import { format } from "date-fns";
import {
  PiggyBank,
  Trash2,
  ArrowUpCircle,
  ArrowDownCircle,
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
import { cn } from "@/lib/utils";
import useTableControls from "@/hooks/useTableControls";

interface Saving {
  id: string;
  contribution_amount: number;
  member_id: string;
  cycle_period: string | null;
  contribution_date: string;
  payment_mode: string;
  savings_to: string;
  user_id: string;
  created_at: string;
}

interface Withdrawal {
  id: string;
  amount: number;
  purpose: string;
  recipient: string | null;
  reference_number: string | null;
  remarks: string | null;
  withdrawal_date: string;
  payment_mode: string;
  withdrawal_from: string;
  user_id: string;
  created_at: string;
}

const SavingsWithdrawalsTab = () => {
  const [savings, setSavings] = useState<Saving[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingsFormData, setSavingsFormData] = useState({
    contributionAmount: "",
    memberId: "",
    cyclePeriod: "",
    paymentMode: "",
    savingsTo: "",
    remarks: "",
  });
  const [withdrawalsFormData, setWithdrawalsFormData] = useState({
    amount: "",
    purpose: "",
    recipient: "",
    referenceNumber: "",
    paymentMode: "",
    withdrawalFrom: "",
    remarks: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transactionDate, setTransactionDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const { user } = useAuth();
  const { page, range, onPageChange, onRangeChange, itemsPerPage } = useTableControls();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Saving | Withdrawal | null>(null);
  const [editType, setEditType] = useState<"saving" | "withdrawal">("saving");
  const [canEditTransactions, setCanEditTransactions] = useState(false);

  const cyclePeriods = ["Weekly", "Bi-weekly", "Monthly", "Quarterly", "Semi-Annual", "Annual", "One-time"];
  const paymentModes = ["Cash", "Esewa", "Fonepay"];
  const savingsToOptions = ["Bank", "Cooperative"];
  const withdrawalSources = ["Esewa", "Bank", "Cooperative"];
  const commonPurposes = ["Salary Payment", "Vendor Payment", "Utility Bills", "Office Rent", "Equipment Purchase", "Other"];

  useEffect(() => {
    fetchSavings();
    fetchWithdrawals();
    const canEdit = localStorage.getItem("canEditTransactions");
    setCanEditTransactions(canEdit === null ? true : JSON.parse(canEdit));
  }, [user, page, range]);

  const fetchSavings = async () => {
    if (!user) return;
    setLoading(true);
    try {
      let query = supabase.from("cooperative_savings").select("*");
      if (range?.from) query = query.gte("contribution_date", format(range.from, "yyyy-MM-dd"));
      if (range?.to) query = query.lte("contribution_date", format(range.to, "yyyy-MM-dd"));
      const { data, error } = await query.order("contribution_date", { ascending: false }).range((page - 1) * itemsPerPage, page * itemsPerPage - 1);
      if (error) throw error;
      setSavings(data || []);
    } catch (error) {
      logError("fetching cooperative savings", error);
      toast.error(`Error loading savings: ${extractErrorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchWithdrawals = async () => {
    if (!user) return;
    try {
      let query = supabase.from("withdrawals").select("*");
      if (range?.from) query = query.gte("withdrawal_date", format(range.from, "yyyy-MM-dd"));
      if (range?.to) query = query.lte("withdrawal_date", format(range.to, "yyyy-MM-dd"));
      const { data, error } = await query.order("withdrawal_date", { ascending: false }).range((page - 1) * itemsPerPage, page * itemsPerPage - 1);
      if (error) throw error;
      setWithdrawals(data || []);
    } catch (error) {
      logError("fetching withdrawals", error);
      toast.error(`Error loading withdrawals: ${extractErrorMessage(error)}`);
    }
  };

  const handleSavingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error("Please log in"); return; }
    if (!savingsFormData.contributionAmount || !savingsFormData.memberId || !savingsFormData.cyclePeriod || !savingsFormData.paymentMode || !savingsFormData.savingsTo) {
      toast.error("Please fill in all required fields");
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("cooperative_savings").insert([{
        user_id: user.id,
        contribution_amount: parseFloat(savingsFormData.contributionAmount),
        member_id: savingsFormData.memberId,
        cycle_period: savingsFormData.cyclePeriod,
        payment_mode: savingsFormData.paymentMode,
        savings_to: savingsFormData.savingsTo,
        contribution_date: transactionDate,
      }]);
      if (error) throw error;
      toast.success("Saving recorded successfully!");
      setSavingsFormData({ contributionAmount: "", memberId: "", cyclePeriod: "", paymentMode: "", savingsTo: "", remarks: "" });
      fetchSavings();
    } catch (error) {
      logError("recording saving", error);
      toast.error(`Error: ${extractErrorMessage(error)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdrawalsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error("Please log in"); return; }
    if (!withdrawalsFormData.amount || !withdrawalsFormData.purpose || !withdrawalsFormData.paymentMode || !withdrawalsFormData.withdrawalFrom) {
      toast.error("Please fill in all required fields");
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("withdrawals").insert([{
        user_id: user.id,
        amount: parseFloat(withdrawalsFormData.amount),
        purpose: withdrawalsFormData.purpose,
        recipient: withdrawalsFormData.recipient || null,
        reference_number: withdrawalsFormData.referenceNumber || null,
        payment_mode: withdrawalsFormData.paymentMode,
        withdrawal_from: withdrawalsFormData.withdrawalFrom,
        remarks: withdrawalsFormData.remarks || null,
        withdrawal_date: transactionDate,
      }]);
      if (error) throw error;
      toast.success("Withdrawal recorded successfully!");
      setWithdrawalsFormData({ amount: "", purpose: "", recipient: "", referenceNumber: "", paymentMode: "", withdrawalFrom: "", remarks: "" });
      fetchWithdrawals();
    } catch (error) {
      logError("recording withdrawal", error);
      toast.error(`Error: ${extractErrorMessage(error)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalSavings = savings.reduce((sum, s) => sum + s.contribution_amount, 0);
  const totalWithdrawals = withdrawals.reduce((sum, w) => sum + w.amount, 0);

  const handleDelete = async (id: string, type: "saving" | "withdrawal") => {
    try {
      const table = type === "saving" ? "cooperative_savings" : "withdrawals";
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
      toast.success(`${type === "saving" ? "Saving" : "Withdrawal"} deleted!`);
      type === "saving" ? fetchSavings() : fetchWithdrawals();
    } catch (error) {
      logError(`deleting ${type}`, error);
      toast.error(`Error: ${extractErrorMessage(error)}`);
    }
  };

  const handleUpdate = async () => {
    if (!selectedItem) return;
    try {
      const table = editType === "saving" ? "cooperative_savings" : "withdrawals";
      const { error } = await supabase.from(table).update(selectedItem).eq("id", selectedItem.id);
      if (error) throw error;
      toast.success("Updated successfully!");
      setIsEditDialogOpen(false);
      editType === "saving" ? fetchSavings() : fetchWithdrawals();
    } catch (error) {
      logError(`updating ${editType}`, error);
      toast.error(`Error: ${extractErrorMessage(error)}`);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {editType === "saving" ? "Saving" : "Withdrawal"}</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              {editType === "saving" ? (
                <>
                  <div><Label>Amount</Label><Input type="number" value={(selectedItem as Saving).contribution_amount} onChange={(e) => setSelectedItem({ ...selectedItem, contribution_amount: parseFloat(e.target.value) } as Saving)} /></div>
                  <div><Label>Member ID</Label><Input value={(selectedItem as Saving).member_id} onChange={(e) => setSelectedItem({ ...selectedItem, member_id: e.target.value } as Saving)} /></div>
                </>
              ) : (
                <>
                  <div><Label>Amount</Label><Input type="number" value={(selectedItem as Withdrawal).amount} onChange={(e) => setSelectedItem({ ...selectedItem, amount: parseFloat(e.target.value) } as Withdrawal)} /></div>
                  <div><Label>Purpose</Label><Input value={(selectedItem as Withdrawal).purpose} onChange={(e) => setSelectedItem({ ...selectedItem, purpose: e.target.value } as Withdrawal)} /></div>
                </>
              )}
            </div>
          )}
          <DialogFooter><Button onClick={handleUpdate}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <PiggyBank className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold text-foreground">Savings & Withdrawals</h1>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card border"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Savings</p><p className="text-lg font-bold text-foreground">NRs. {totalSavings.toFixed(2)}</p></CardContent></Card>
          <Card className="bg-card border"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Withdrawals</p><p className="text-lg font-bold text-foreground">NRs. {totalWithdrawals.toFixed(2)}</p></CardContent></Card>
          <Card className="bg-card border"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Savings Count</p><p className="text-lg font-bold text-foreground">{savings.length}</p></CardContent></Card>
          <Card className="bg-card border"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Withdrawals Count</p><p className="text-lg font-bold text-foreground">{withdrawals.length}</p></CardContent></Card>
        </div>

        <Tabs defaultValue="savings" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="savings" className="flex items-center gap-2"><ArrowUpCircle className="h-4 w-4" />Savings</TabsTrigger>
            <TabsTrigger value="withdrawals" className="flex items-center gap-2"><ArrowDownCircle className="h-4 w-4" />Withdrawals</TabsTrigger>
          </TabsList>

          <TabsContent value="savings" className="space-y-4">
            <Card className="bg-card border">
              <CardHeader className="pb-3"><CardTitle className="text-base">Add Saving</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={handleSavingsSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div><Label>Amount *</Label><Input type="number" value={savingsFormData.contributionAmount} onChange={(e) => setSavingsFormData({ ...savingsFormData, contributionAmount: e.target.value })} required /></div>
                  <div><Label>Member ID *</Label><Input value={savingsFormData.memberId} onChange={(e) => setSavingsFormData({ ...savingsFormData, memberId: e.target.value })} required /></div>
                  <div><Label>Cycle Period *</Label><Select value={savingsFormData.cyclePeriod} onValueChange={(v) => setSavingsFormData({ ...savingsFormData, cyclePeriod: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{cyclePeriods.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div>
                  <div><Label>Payment Mode *</Label><Select value={savingsFormData.paymentMode} onValueChange={(v) => setSavingsFormData({ ...savingsFormData, paymentMode: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{paymentModes.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
                  <div><Label>Savings To *</Label><Select value={savingsFormData.savingsTo} onValueChange={(v) => setSavingsFormData({ ...savingsFormData, savingsTo: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{savingsToOptions.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div>
                  <div><Label>Date</Label><Input type="date" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} /></div>
                  <div className="md:col-span-3"><Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Add Saving"}</Button></div>
                </form>
              </CardContent>
            </Card>
            <Card className="bg-card border">
              <CardHeader className="pb-3"><CardTitle className="text-base">Savings History</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Amount</TableHead><TableHead>Member</TableHead><TableHead>Mode</TableHead><TableHead>To</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {savings.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>{format(new Date(s.contribution_date), "MMM dd, yyyy")}</TableCell>
                        <TableCell className="font-medium">NRs. {s.contribution_amount.toFixed(2)}</TableCell>
                        <TableCell>{s.member_id}</TableCell>
                        <TableCell><Badge variant="outline">{s.payment_mode}</Badge></TableCell>
                        <TableCell>{s.savings_to}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {canEditTransactions && <Button variant="outline" size="sm" onClick={() => { setSelectedItem(s); setEditType("saving"); setIsEditDialogOpen(true); }}>Edit</Button>}
                            <AlertDialog><AlertDialogTrigger asChild><Button variant="outline" size="sm"><Trash2 className="h-3 w-3" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(s.id, "saving")}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="withdrawals" className="space-y-4">
            <Card className="bg-card border">
              <CardHeader className="pb-3"><CardTitle className="text-base">Add Withdrawal</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={handleWithdrawalsSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div><Label>Amount *</Label><Input type="number" value={withdrawalsFormData.amount} onChange={(e) => setWithdrawalsFormData({ ...withdrawalsFormData, amount: e.target.value })} required /></div>
                  <div><Label>Purpose *</Label><Select value={withdrawalsFormData.purpose} onValueChange={(v) => setWithdrawalsFormData({ ...withdrawalsFormData, purpose: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{commonPurposes.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div>
                  <div><Label>From *</Label><Select value={withdrawalsFormData.withdrawalFrom} onValueChange={(v) => setWithdrawalsFormData({ ...withdrawalsFormData, withdrawalFrom: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{withdrawalSources.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
                  <div><Label>Payment Mode *</Label><Select value={withdrawalsFormData.paymentMode} onValueChange={(v) => setWithdrawalsFormData({ ...withdrawalsFormData, paymentMode: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{paymentModes.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
                  <div><Label>Recipient</Label><Input value={withdrawalsFormData.recipient} onChange={(e) => setWithdrawalsFormData({ ...withdrawalsFormData, recipient: e.target.value })} /></div>
                  <div><Label>Date</Label><Input type="date" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} /></div>
                  <div className="md:col-span-3"><Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Add Withdrawal"}</Button></div>
                </form>
              </CardContent>
            </Card>
            <Card className="bg-card border">
              <CardHeader className="pb-3"><CardTitle className="text-base">Withdrawals History</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Amount</TableHead><TableHead>Purpose</TableHead><TableHead>From</TableHead><TableHead>Mode</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {withdrawals.map((w) => (
                      <TableRow key={w.id}>
                        <TableCell>{format(new Date(w.withdrawal_date), "MMM dd, yyyy")}</TableCell>
                        <TableCell className="font-medium">NRs. {w.amount.toFixed(2)}</TableCell>
                        <TableCell>{w.purpose}</TableCell>
                        <TableCell>{w.withdrawal_from}</TableCell>
                        <TableCell><Badge variant="outline">{w.payment_mode}</Badge></TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {canEditTransactions && <Button variant="outline" size="sm" onClick={() => { setSelectedItem(w); setEditType("withdrawal"); setIsEditDialogOpen(true); }}>Edit</Button>}
                            <AlertDialog><AlertDialogTrigger asChild><Button variant="outline" size="sm"><Trash2 className="h-3 w-3" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(w.id, "withdrawal")}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SavingsWithdrawalsTab;
