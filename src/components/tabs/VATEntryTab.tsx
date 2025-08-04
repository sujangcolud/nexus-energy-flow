
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
import {
  Receipt,
  FileText,
  Download,
  Calendar,
  DollarSign,
  Percent,
  Building2,
  User,
  Hash,
  Sparkles,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";

// Updated interface to match the actual database schema
interface VATEntry {
  id: string;
  entry_type: string;
  entry_id: string;
  item_name: string;
  amount: number;
  vat_rate: number;
  vat_amount: number;
  total_with_vat: number;
  invoice_number: string;
  invoice_date: string;
  buyer_name: string;
  buyer_address: string;
  buyer_pan: string;
  buyer_email?: string;
  buyer_contact_number?: string;
  seller_name: string;
  seller_address: string;
  seller_pan: string;
  seller_email?: string;
  seller_contact_number?: string;
  payment_mode: string;
  created_at: string;
  user_id?: string;
}

interface IncomeEntry {
  id: string;
  type: "order" | "charging";
  item_name: string;
  amount: number;
  payment_mode: string;
  date: string;
  customer_name?: string;
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
  const [billForm, setBillForm] = useState({
    customer_name: "",
    customer_pan: "",
    bill_number: "",
  });

  const nepalVATRate = 13; // Nepal VAT rate

  // Calculate VAT from VAT-inclusive amount
  const calculateVATFromInclusive = (
    totalWithVAT: number,
    vatRate: number = nepalVATRate,
  ) => {
    const baseAmount = totalWithVAT / (1 + vatRate / 100);
    const vatAmount = totalWithVAT - baseAmount;
    return {
      baseAmount: Math.round(baseAmount * 100) / 100,
      vatAmount: Math.round(vatAmount * 100) / 100,
      totalWithVAT: totalWithVAT,
    };
  };

  // Calculate VAT from VAT-exclusive amount (for comparison)
  const calculateVATFromExclusive = (
    baseAmount: number,
    vatRate: number = nepalVATRate,
  ) => {
    const vatAmount = (baseAmount * vatRate) / 100;
    const totalWithVAT = baseAmount + vatAmount;
    return {
      baseAmount,
      vatAmount: Math.round(vatAmount * 100) / 100,
      totalWithVAT: Math.round(totalWithVAT * 100) / 100,
    };
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
      // Fetch orders
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("id, item_name, total, payment_mode, order_date")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (ordersError) throw ordersError;

      // Fetch charging sessions
      const { data: chargingData, error: chargingError } = await supabase
        .from("charging_sessions")
        .select("id, total_amount, payment_mode, session_date")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (chargingError) throw chargingError;

      // Combine and format data
      const combinedEntries: IncomeEntry[] = [
        ...(ordersData || []).map((order) => ({
          id: order.id,
          type: "order" as const,
          item_name: order.item_name,
          amount: order.total,
          payment_mode: order.payment_mode,
          date: order.order_date || new Date().toISOString().split("T")[0],
        })),
        ...(chargingData || []).map((session) => ({
          id: session.id,
          type: "charging" as const,
          item_name: "Charging Session",
          amount: session.total_amount,
          payment_mode: session.payment_mode,
          date: session.session_date || new Date().toISOString().split("T")[0],
        })),
      ];

      // Sort by date
      combinedEntries.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
      setIncomeEntries(combinedEntries);
    } catch (error) {
      logError("fetching income entries", error);
      const errorMessage = extractErrorMessage(error);
      toast.error(`Error loading income entries: ${errorMessage}`);
    }
  };

  const fetchVATEntries = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("vat_entries")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Map the database entries to match our interface
      const mappedEntries: VATEntry[] = (data || []).map((entry: any) => ({
        id: entry.id,
        entry_type: entry.entry_type || 'manual',
        entry_id: entry.entry_id || '',
        item_name: entry.item_name || '',
        amount: entry.amount || 0,
        vat_rate: entry.vat_rate || 13,
        vat_amount: entry.vat_amount || 0,
        total_with_vat: entry.total_with_vat || 0,
        invoice_number: entry.invoice_number || '',
        invoice_date: entry.invoice_date || '',
        buyer_name: entry.buyer_name || '',
        buyer_address: entry.buyer_address || '',
        buyer_pan: entry.buyer_pan || '',
        buyer_email: entry.buyer_email,
        buyer_contact_number: entry.buyer_contact_number,
        seller_name: entry.seller_name || '',
        seller_address: entry.seller_address || '',
        seller_pan: entry.seller_pan || '',
        seller_email: entry.seller_email,
        seller_contact_number: entry.seller_contact_number,
        payment_mode: entry.payment_mode || 'Cash',
        created_at: entry.created_at || '',
        user_id: entry.user_id
      }));
      
      setVatEntries(mappedEntries);
    } catch (error) {
      logError("fetching VAT entries", error);
      const errorMessage = extractErrorMessage(error);

      // Handle specific PGRST204 schema cache errors
      if (error?.code === "PGRST204") {
        console.warn("VAT entries table schema issue:", errorMessage);
        setVatEntries([]); // Set empty list instead of failing

        if (errorMessage.includes("entry_id")) {
          toast.error(
            "VAT entries table has schema issues with entry_id column. Please refresh the page or contact administrator.",
            { duration: 5000 },
          );
        } else {
          toast.error(
            `VAT entries table schema error: ${errorMessage}. Please refresh the page or contact administrator.`,
            { duration: 5000 },
          );
        }
      } else if (errorMessage.includes("schema cache")) {
        console.warn("Schema cache issue detected:", errorMessage);
        setVatEntries([]);
        toast.error(
          "Database schema cache issue. Please refresh the page and try again.",
          { duration: 5000 },
        );
      } else {
        toast.error(`Error loading VAT entries: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const createVATEntry = async () => {
    if (!user || !selectedEntry) return;

    try {
      // Calculate VAT from VAT-inclusive amount
      const vatCalculation = calculateVATFromInclusive(
        selectedEntry.amount,
        nepalVATRate,
      );

      const invoiceNumber = `VAT-${Date.now()}`;
      const currentDate = new Date().toISOString().split('T')[0];

      // Create VAT entry with all required fields
      const vatEntryData = {
        user_id: user.id,
        entry_type: selectedEntry.type,
        entry_id: selectedEntry.id,
        item_name: selectedEntry.item_name,
        amount: vatCalculation.baseAmount,
        vat_rate: nepalVATRate,
        vat_amount: vatCalculation.vatAmount,
        total_with_vat: vatCalculation.totalWithVAT,
        invoice_number: invoiceNumber,
        invoice_date: currentDate,
        buyer_name: 'Customer',
        buyer_address: 'Address',
        buyer_pan: '000000000',
        seller_name: 'Your Business',
        seller_address: 'Your Address',
        seller_pan: '123456789',
        payment_mode: selectedEntry.payment_mode,
        amount_due: 0,
        amount_paid: vatCalculation.totalWithVAT,
        grand_total: vatCalculation.totalWithVAT,
        vat_total: vatCalculation.vatAmount,
        sub_total: vatCalculation.baseAmount,
        items: [{ name: selectedEntry.item_name, quantity: 1, rate: vatCalculation.baseAmount, amount: vatCalculation.baseAmount }],
        seller_vat_registration_number: '123456789',
        buyer_vat_registration_number: '000000000'
      };

      const { error } = await supabase.from("vat_entries").insert(vatEntryData);

      if (error) {
        logError("creating VAT entry", error);
        throw error;
      }

      toast.success("VAT entry created successfully!");
      setVatDialogOpen(false);
      setSelectedEntry(null);
      fetchVATEntries();
    } catch (error) {
      logError("creating VAT entry", error);
      const errorMessage = extractErrorMessage(error);

      // Handle specific PGRST204 errors with detailed feedback
      if (error?.code === "PGRST204") {
        if (errorMessage.includes("entry_id")) {
          toast.error(
            "VAT entry creation failed: entry_id column issue. The database schema may need updating. Please contact administrator.",
            { duration: 6000 },
          );
        } else {
          toast.error(
            `VAT entry creation failed: Database schema error - ${errorMessage}. Please refresh the page and try again.`,
            { duration: 6000 },
          );
        }

        // Try to refresh the page after a delay to reload schema
        setTimeout(() => {
          toast.info("Refreshing page to reload database schema...");
          window.location.reload();
        }, 3000);
      } else if (errorMessage.includes("schema cache")) {
        toast.error(
          "Database schema cache issue detected. Please refresh the page and try again.",
          { duration: 5000 },
        );
      } else {
        toast.error(`Error creating VAT entry: ${errorMessage}`);
      }
    }
  };

  const generateBill = async () => {
    if (!selectedVATEntry || !billForm.customer_name) return;

    try {
      const billNumber = billForm.bill_number || `VAT-${Date.now()}`;

      const updateData = {
        buyer_name: billForm.customer_name,
        buyer_pan: billForm.customer_pan || '000000000',
        invoice_number: billNumber,
        invoice_date: new Date().toISOString().split("T")[0]
      };

      const { error } = await supabase
        .from("vat_entries")
        .update(updateData)
        .eq("id", selectedVATEntry.id);

      if (error) throw error;

      // Generate PDF bill (simplified)
      const billContent = `
=== VAT BILL ===
Bill Number: ${billNumber}
Date: ${format(new Date(), "yyyy-MM-dd")}
Customer: ${billForm.customer_name}
PAN: ${billForm.customer_pan || "N/A"}

Item: ${selectedVATEntry.item_name}
Amount: NPR ${selectedVATEntry.amount.toFixed(2)}
VAT (${selectedVATEntry.vat_rate}%): NPR ${selectedVATEntry.vat_amount.toFixed(2)}
Total: NPR ${selectedVATEntry.total_with_vat.toFixed(2)}

Thank you for your business!
      `;

      // Create and download bill
      const blob = new Blob([billContent], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `VAT_Bill_${billNumber}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("VAT bill generated and downloaded!");
      setBillDialogOpen(false);
      setBillForm({ customer_name: "", customer_pan: "", bill_number: "" });
      fetchVATEntries();
    } catch (error) {
      console.error("Error generating bill:", error);
      const errorMessage =
        error?.message || error?.details || "Failed to generate bill";
      toast.error(`Error generating bill: ${errorMessage}`);
    }
  };

  const totalVATAmount = vatEntries.reduce(
    (sum, entry) => sum + entry.vat_amount,
    0,
  );
  const totalIncomeWithVAT = vatEntries.reduce(
    (sum, entry) => sum + entry.total_with_vat,
    0,
  );
  const totalBaseAmount = vatEntries.reduce(
    (sum, entry) => sum + entry.amount,
    0,
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full animate-spin mx-auto flex items-center justify-center">
            <Receipt className="h-8 w-8 text-white" />
          </div>
          <p className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Loading VAT Entries...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-64 h-64 bg-gradient-to-r from-blue-400/20 to-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute bottom-20 right-20 w-80 h-80 bg-gradient-to-r from-purple-400/20 to-indigo-500/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
      </div>

      <div className="relative z-10 space-y-8 p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-xl animate-pulse">
              <Receipt className="h-8 w-8" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              VAT Entry Management
            </h1>
            <Sparkles className="h-8 w-8 text-purple-500 animate-bounce" />
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-4">
            Manage VAT entries and generate bills according to Nepal VAT
            regulations
          </p>
          <div className="max-w-3xl mx-auto">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-800">
                  <strong>VAT Calculation Mode:</strong> All amounts entered are
                  treated as VAT-inclusive. The system automatically extracts
                  the {nepalVATRate}% VAT component for proper accounting and
                  bill generation.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* VAT Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">
                    Total VAT Collected
                  </p>
                  <p className="text-2xl font-bold text-blue-800">
                    NPR {totalVATAmount.toFixed(2)}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl text-white">
                  <Percent className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 font-medium">
                    VAT Entries
                  </p>
                  <p className="text-2xl font-bold text-purple-800">
                    {vatEntries.length}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white">
                  <FileText className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">
                    Total with VAT
                  </p>
                  <p className="text-2xl font-bold text-green-800">
                    NPR {totalIncomeWithVAT.toFixed(2)}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl text-white">
                  <DollarSign className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Income Entries */}
          <Card className="bg-gradient-to-br from-white/90 to-blue-50/90 backdrop-blur-sm border-0 shadow-2xl">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-white/20 rounded-lg">
                  <DollarSign className="h-6 w-6" />
                </div>
                Income Entries
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {incomeEntries.map((entry) => (
                  <div
                    key={`${entry.type}-${entry.id}`}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-white to-blue-50 rounded-lg border border-blue-100 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant={
                            entry.type === "order" ? "default" : "secondary"
                          }
                        >
                          {entry.type === "order" ? "Order" : "Charging"}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {entry.date}
                        </span>
                      </div>
                      <h4 className="font-medium text-gray-800">
                        {entry.item_name}
                      </h4>
                      <p className="text-sm text-gray-600">
                        NPR {entry.amount.toFixed(2)} • {entry.payment_mode}
                      </p>
                    </div>
                    <Button
                      onClick={() => {
                        setSelectedEntry(entry);
                        setVatDialogOpen(true);
                      }}
                      size="sm"
                      className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
                    >
                      Add VAT
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* VAT Entries */}
          <Card className="bg-gradient-to-br from-white/90 to-purple-50/90 backdrop-blur-sm border-0 shadow-2xl">
            <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Receipt className="h-6 w-6" />
                </div>
                VAT Entries
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {vatEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-white to-purple-50 rounded-lg border border-purple-100 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant={
                            entry.entry_type === "order"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {entry.entry_type}
                        </Badge>
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Invoice: {entry.invoice_number}
                        </Badge>
                      </div>
                      <h4 className="font-medium text-gray-800">
                        {entry.item_name}
                      </h4>
                      <p className="text-sm text-gray-600">
                        Amount: NPR {entry.amount.toFixed(2)} • VAT: NPR{" "}
                        {entry.vat_amount.toFixed(2)}
                      </p>
                      <p className="text-sm font-semibold text-purple-600">
                        Total: NPR {entry.total_with_vat.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          setSelectedVATEntry(entry);
                          setBillDialogOpen(true);
                        }}
                        size="sm"
                        className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                      >
                        Generate Bill
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* VAT Creation Dialog */}
        <Dialog open={vatDialogOpen} onOpenChange={setVatDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create VAT Entry</DialogTitle>
            </DialogHeader>
            {selectedEntry &&
              (() => {
                const vatCalculation = calculateVATFromInclusive(
                  selectedEntry.amount,
                  nepalVATRate,
                );
                return (
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="font-medium text-gray-800 mb-3">
                        {selectedEntry.item_name}
                      </h4>
                      <div className="text-sm space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">
                            Total Amount (VAT Inclusive):
                          </span>
                          <span className="font-semibold text-blue-600">
                            NPR {selectedEntry.amount.toFixed(2)}
                          </span>
                        </div>
                        <div className="h-px bg-gray-200 my-2"></div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">
                            Base Amount (Excluding VAT):
                          </span>
                          <span className="text-gray-800">
                            NPR {vatCalculation.baseAmount.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">
                            VAT Amount ({nepalVATRate}%):
                          </span>
                          <span className="text-green-600 font-medium">
                            NPR {vatCalculation.vatAmount.toFixed(2)}
                          </span>
                        </div>
                        <div className="h-px bg-gray-200 my-2"></div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-500">Verification:</span>
                          <span className="text-gray-500">
                            {vatCalculation.baseAmount.toFixed(2)} +{" "}
                            {vatCalculation.vatAmount.toFixed(2)} ={" "}
                            {vatCalculation.totalWithVAT.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                        <div className="text-sm text-amber-800">
                          <strong>Note:</strong> This entry assumes the amount
                          you entered (NPR {selectedEntry.amount.toFixed(2)})
                          already includes VAT. The VAT component will be
                          extracted for proper accounting.
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            <DialogFooter>
              <Button variant="outline" onClick={() => setVatDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={createVATEntry}>Create VAT Entry</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bill Generation Dialog */}
        <Dialog open={billDialogOpen} onOpenChange={setBillDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate VAT Bill</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="customer_name">Customer Name *</Label>
                <Input
                  id="customer_name"
                  value={billForm.customer_name}
                  onChange={(e) =>
                    setBillForm((prev) => ({
                      ...prev,
                      customer_name: e.target.value,
                    }))
                  }
                  placeholder="Enter customer name"
                />
              </div>
              <div>
                <Label htmlFor="customer_pan">Customer PAN (Optional)</Label>
                <Input
                  id="customer_pan"
                  value={billForm.customer_pan}
                  onChange={(e) =>
                    setBillForm((prev) => ({
                      ...prev,
                      customer_pan: e.target.value,
                    }))
                  }
                  placeholder="Enter customer PAN number"
                />
              </div>
              <div>
                <Label htmlFor="bill_number">
                  Bill Number (Auto-generated if empty)
                </Label>
                <Input
                  id="bill_number"
                  value={billForm.bill_number}
                  onChange={(e) =>
                    setBillForm((prev) => ({
                      ...prev,
                      bill_number: e.target.value,
                    }))
                  }
                  placeholder="Enter custom bill number"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setBillDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={generateBill} disabled={!billForm.customer_name}>
                Generate Bill
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default VATEntryTab;
