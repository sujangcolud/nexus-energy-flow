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

interface VATEntry {
  id: string;
  entry_type: string;
  entry_id: string;
  item_name: string;
  amount: number;
  vat_rate: number;
  vat_amount: number;
  total_with_vat: number;
  bill_generated: boolean;
  bill_number: string | null;
  bill_date: string | null;
  customer_pan: string | null;
  customer_name: string | null;
  created_at: string;
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
  const [selectedVATEntry, setSelectedVATEntry] = useState<VATEntry | null>(
    null,
  );
  const [billForm, setBillForm] = useState({
    customer_name: "",
    customer_pan: "",
    bill_number: "",
  });

  const nepalVATRate = 13; // Nepal VAT rate

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
      setVatEntries(data || []);
    } catch (error) {
      logError("fetching VAT entries", error);
      const errorMessage = extractErrorMessage(error);
      toast.error(`Error loading VAT entries: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const createVATEntry = async () => {
    if (!user || !selectedEntry) return;

    try {
      const { error } = await supabase.from("vat_entries").insert({
        user_id: user.id,
        entry_type: selectedEntry.type,
        entry_id: selectedEntry.id,
        item_name: selectedEntry.item_name,
        amount: selectedEntry.amount,
        vat_rate: nepalVATRate,
      });

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
      toast.error(`Error creating VAT entry: ${errorMessage}`);
    }
  };

  const generateBill = async () => {
    if (!selectedVATEntry || !billForm.customer_name) return;

    try {
      const billNumber = billForm.bill_number || `VAT-${Date.now()}`;

      const { error } = await supabase
        .from("vat_entries")
        .update({
          bill_generated: true,
          bill_number: billNumber,
          bill_date: new Date().toISOString().split("T")[0],
          customer_name: billForm.customer_name,
          customer_pan: billForm.customer_pan,
        })
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
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Manage VAT entries and generate bills according to Nepal VAT
            regulations
          </p>
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
                        {entry.bill_generated ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Billed
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-orange-600 border-orange-200"
                          >
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        )}
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
                      {!entry.bill_generated && (
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
                      )}
                      {entry.bill_generated && (
                        <Badge className="bg-green-100 text-green-800">
                          Bill: {entry.bill_number}
                        </Badge>
                      )}
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
            {selectedEntry && (
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-800 mb-2">
                    {selectedEntry.item_name}
                  </h4>
                  <p className="text-sm text-gray-600">
                    Base Amount: NPR {selectedEntry.amount.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600">
                    VAT ({nepalVATRate}%): NPR{" "}
                    {((selectedEntry.amount * nepalVATRate) / 100).toFixed(2)}
                  </p>
                  <p className="text-sm font-semibold text-blue-600">
                    Total with VAT: NPR{" "}
                    {(
                      selectedEntry.amount +
                      (selectedEntry.amount * nepalVATRate) / 100
                    ).toFixed(2)}
                  </p>
                </div>
              </div>
            )}
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
