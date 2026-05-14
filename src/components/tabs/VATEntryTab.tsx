import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { extractErrorMessage, logError } from "@/utils/errorHandling";
import { Receipt, Download } from "lucide-react";
import { format } from "date-fns";

interface VATEntry {
  id: string;
  entry_type: string;
  item_name: string;
  amount: number;
  vat_rate: number;
  vat_amount: number;
  total_with_vat: number;
  invoice_number: string;
  invoice_date: string;
  buyer_name: string;
  buyer_pan: string;
  payment_mode: string;
  created_at: string;
}

interface IncomeEntry {
  id: string;
  type: "order" | "charging";
  item_name: string;
  amount: number;
  payment_mode: string;
  date: string;
}

const VATEntryTab = () => {
  const { user } = useAuth();
  const [vatEntries, setVatEntries] = useState<VATEntry[]>([]);
  const [incomeEntries, setIncomeEntries] = useState<IncomeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<IncomeEntry | null>(null);
  const [vatDialogOpen, setVatDialogOpen] = useState(false);
  const [billDialogOpen, setBillDialogOpen] = useState(false);
  const [selectedVATEntry, setSelectedVATEntry] = useState<VATEntry | null>(null);
  const [billForm, setBillForm] = useState({ customer_name: "", customer_pan: "", bill_number: "" });

  const nepalVATRate = 13;

  const calculateVATFromInclusive = (totalWithVAT: number, vatRate: number = nepalVATRate) => {
    const baseAmount = totalWithVAT / (1 + vatRate / 100);
    const vatAmount = totalWithVAT - baseAmount;
    return { baseAmount: Math.round(baseAmount * 100) / 100, vatAmount: Math.round(vatAmount * 100) / 100, totalWithVAT };
  };

  useEffect(() => {
    if (user) {
      fetchIncomeEntries();
      fetchVATEntries();
    }
  }, [user]);

  const fetchIncomeEntries = async () => {
    if (!user) return;
    try {
      const { data: ordersData } = await supabase.from("orders").select("id, item_name, total, payment_mode, order_date").order("created_at", { ascending: false });
      const { data: chargingData } = await supabase.from("charging_sessions").select("id, total_amount, payment_mode, session_date").order("created_at", { ascending: false });
      const combined: IncomeEntry[] = [
        ...(ordersData || []).map((o) => ({ id: o.id, type: "order" as const, item_name: o.item_name, amount: o.total, payment_mode: o.payment_mode, date: o.order_date || new Date().toISOString().split("T")[0] })),
        ...(chargingData || []).map((c) => ({ id: c.id, type: "charging" as const, item_name: "Charging Session", amount: c.total_amount, payment_mode: c.payment_mode, date: c.session_date || new Date().toISOString().split("T")[0] })),
      ];
      combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setIncomeEntries(combined);
    } catch (error) {
      logError("fetching income entries", error);
      toast.error(`Error: ${extractErrorMessage(error)}`);
    }
  };

  const fetchVATEntries = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.from("vat_entries").select("*").order("invoice_date", { ascending: false }).order("created_at", { ascending: false });
      if (error) throw error;
      setVatEntries((data || []).map((e: any) => ({
        id: e.id, entry_type: e.entry_type || "manual", item_name: e.item_name || "", amount: e.amount || 0,
        vat_rate: e.vat_rate || 13, vat_amount: e.vat_amount || 0, total_with_vat: e.total_with_vat || 0,
        invoice_number: e.invoice_number || "", invoice_date: e.invoice_date || "", buyer_name: e.buyer_name || "",
        buyer_pan: e.buyer_pan || "", payment_mode: e.payment_mode || "Cash", created_at: e.created_at || "",
      })));
    } catch (error) {
      logError("fetching VAT entries", error);
      setVatEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const createVATEntry = async () => {
    if (!user || !selectedEntry) return;
    try {
      const vatCalc = calculateVATFromInclusive(selectedEntry.amount, nepalVATRate);
      const invoiceNumber = `VAT-${Date.now()}`;
      const currentDate = new Date().toISOString().split("T")[0];
      const { error } = await supabase.from("vat_entries").insert({
        user_id: user.id, entry_type: selectedEntry.type, entry_id: selectedEntry.id, item_name: selectedEntry.item_name,
        amount: vatCalc.baseAmount, vat_rate: nepalVATRate, vat_amount: vatCalc.vatAmount, total_with_vat: vatCalc.totalWithVAT,
        invoice_number: invoiceNumber, invoice_date: currentDate, buyer_name: "Customer", buyer_address: "Address",
        buyer_pan: "000000000", seller_name: "Your Business", seller_address: "Your Address", seller_pan: "123456789",
        payment_mode: selectedEntry.payment_mode, amount_due: 0, amount_paid: vatCalc.totalWithVAT, grand_total: vatCalc.totalWithVAT,
        vat_total: vatCalc.vatAmount, sub_total: vatCalc.baseAmount, items: [{ name: selectedEntry.item_name, quantity: 1, rate: vatCalc.baseAmount, amount: vatCalc.baseAmount }],
        seller_vat_registration_number: "123456789", buyer_vat_registration_number: "000000000",
      });
      if (error) throw error;
      toast.success("VAT entry created!");
      setVatDialogOpen(false);
      setSelectedEntry(null);
      fetchVATEntries();
    } catch (error) {
      logError("creating VAT entry", error);
      toast.error(`Error: ${extractErrorMessage(error)}`);
    }
  };

  const generateBill = async () => {
    if (!selectedVATEntry || !billForm.customer_name) return;
    try {
      const billNumber = billForm.bill_number || `VAT-${Date.now()}`;
      await supabase.from("vat_entries").update({ buyer_name: billForm.customer_name, buyer_pan: billForm.customer_pan || "000000000", invoice_number: billNumber, invoice_date: new Date().toISOString().split("T")[0] }).eq("id", selectedVATEntry.id);
      const content = `=== VAT BILL ===\nBill: ${billNumber}\nDate: ${format(new Date(), "yyyy-MM-dd")}\nCustomer: ${billForm.customer_name}\nPAN: ${billForm.customer_pan || "N/A"}\n\nItem: ${selectedVATEntry.item_name}\nAmount: NPR ${selectedVATEntry.amount.toFixed(2)}\nVAT (${selectedVATEntry.vat_rate}%): NPR ${selectedVATEntry.vat_amount.toFixed(2)}\nTotal: NPR ${selectedVATEntry.total_with_vat.toFixed(2)}`;
      const blob = new Blob([content], { type: "text/plain" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `VAT_Bill_${billNumber}.txt`;
      a.click();
      toast.success("Bill generated!");
      setBillDialogOpen(false);
      setBillForm({ customer_name: "", customer_pan: "", bill_number: "" });
      fetchVATEntries();
    } catch (error) {
      toast.error("Error generating bill");
    }
  };

  const totalVAT = vatEntries.reduce((sum, e) => sum + e.vat_amount, 0);
  const totalBase = vatEntries.reduce((sum, e) => sum + e.amount, 0);

  if (loading) return <div className="p-6 animate-pulse"><div className="h-8 bg-muted rounded w-1/4 mb-4"></div><div className="h-64 bg-muted rounded"></div></div>;

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <Dialog open={vatDialogOpen} onOpenChange={setVatDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Create VAT Entry</DialogTitle></DialogHeader>
          {selectedEntry && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Item: {selectedEntry.item_name}</p>
              <p className="text-sm text-muted-foreground">Amount: NPR {selectedEntry.amount.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">VAT ({nepalVATRate}%): NPR {calculateVATFromInclusive(selectedEntry.amount).vatAmount.toFixed(2)}</p>
            </div>
          )}
          <DialogFooter><Button onClick={createVATEntry}>Create Entry</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={billDialogOpen} onOpenChange={setBillDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Generate VAT Bill</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Customer Name *</Label><Input value={billForm.customer_name} onChange={(e) => setBillForm({ ...billForm, customer_name: e.target.value })} /></div>
            <div><Label>Customer PAN</Label><Input value={billForm.customer_pan} onChange={(e) => setBillForm({ ...billForm, customer_pan: e.target.value })} /></div>
            <div><Label>Bill Number</Label><Input value={billForm.bill_number} onChange={(e) => setBillForm({ ...billForm, bill_number: e.target.value })} placeholder="Auto-generated if empty" /></div>
          </div>
          <DialogFooter><Button onClick={generateBill}>Generate Bill</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold text-foreground">VAT Entry</h1>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card border"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total VAT</p><p className="text-lg font-bold text-foreground">NPR {totalVAT.toFixed(2)}</p></CardContent></Card>
          <Card className="bg-card border"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Base Amount</p><p className="text-lg font-bold text-foreground">NPR {totalBase.toFixed(2)}</p></CardContent></Card>
          <Card className="bg-card border"><CardContent className="p-4"><p className="text-xs text-muted-foreground">VAT Entries</p><p className="text-lg font-bold text-foreground">{vatEntries.length}</p></CardContent></Card>
          <Card className="bg-card border"><CardContent className="p-4"><p className="text-xs text-muted-foreground">VAT Rate</p><p className="text-lg font-bold text-foreground">{nepalVATRate}%</p></CardContent></Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-card border">
            <CardHeader className="pb-3"><CardTitle className="text-base">Income Entries</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Item</TableHead><TableHead>Amount</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {incomeEntries.slice(0, 20).map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>{format(new Date(e.date), "MMM dd")}</TableCell>
                      <TableCell>{e.item_name}</TableCell>
                      <TableCell>NPR {e.amount.toFixed(2)}</TableCell>
                      <TableCell><Button size="sm" variant="outline" onClick={() => { setSelectedEntry(e); setVatDialogOpen(true); }}>Add VAT</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="bg-card border">
            <CardHeader className="pb-3"><CardTitle className="text-base">VAT Entries</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Item</TableHead><TableHead>VAT</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {vatEntries.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>{e.invoice_number}</TableCell>
                      <TableCell>{e.item_name}</TableCell>
                      <TableCell>NPR {e.vat_amount.toFixed(2)}</TableCell>
                      <TableCell><Button size="sm" variant="outline" onClick={() => { setSelectedVATEntry(e); setBillDialogOpen(true); }}><Download className="h-3 w-3" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default VATEntryTab;
