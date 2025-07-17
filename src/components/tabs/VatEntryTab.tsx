import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import jsPDF from "jspdf";
import "jspdf-autotable";

interface Income {
  id: string;
  total: number;
  payment_mode: string;
  order_date: string;
}

const VatEntryTab = () => {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [isBillOpen, setIsBillOpen] = useState(false);
  const [selectedIncome, setSelectedIncome] = useState<Income | null>(null);
  const [billData, setBillData] = useState({
    buyerName: "",
    buyerAddress: "",
    buyerContact: "",
    buyerEmail: "",
    buyerPan: "",
    preparedBy: "",
    approvedBy: "",
  });

  useEffect(() => {
    fetchIncomes();
  }, [user]);

  const fetchIncomes = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id, total, payment_mode, order_date")
        .eq("user_id", user.id);

      if (ordersError) throw ordersError;

      const { data: charging, error: chargingError } = await supabase
        .from("charging_sessions")
        .select("id, total_amount, payment_mode, session_date")
        .eq("user_id", user.id);

      if (chargingError) throw chargingError;

      const allIncomes = [
        ...(orders || []),
        ...(charging?.map((c) => ({
          id: c.id,
          total: c.total_amount,
          payment_mode: c.payment_mode,
          order_date: c.session_date,
        })) || []),
      ];
      setIncomes(allIncomes);
    } catch (error) {
      console.error("Error fetching incomes:", error);
      toast.error("Failed to load incomes");
    } finally {
      setLoading(false);
    }
  };

  const calculateVAT = (total: number) => {
    const base = total / 1.13;
    const vat = total - base;
    return { base, vat };
  };

  const generateBill = (income: Income) => {
    setSelectedIncome(income);
    setIsBillOpen(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!selectedIncome) return;

    const { base, vat } = calculateVAT(selectedIncome.total);

    const xml = `
<vatInvoice>
  <invoiceNumber>INV-${selectedIncome.id.slice(0, 8)}</invoiceNumber>
  <invoiceDate>${new Date().toISOString().split("T")[0]}</invoiceDate>
  <seller>
    <name>Your Company Name</name>
    <address>Your Company Address</address>
    <contactNumber>Your Contact</contactNumber>
    <email>Your Email</email>
    <pan>621143805</pan>
    <vatRegistrationNumber>621143805</vatRegistrationNumber>
  </seller>
  <buyer>
    <name>${billData.buyerName || "Walk-in Customer"}</name>
    <address>${billData.buyerAddress}</address>
    <contactNumber>${billData.buyerContact}</contactNumber>
    <email>${billData.buyerEmail}</email>
    <pan>${billData.buyerPan}</pan>
    <vatRegistrationNumber>${billData.buyerPan}</vatRegistrationNumber>
  </buyer>
  <items>
    ${selectedIncome.items
      .map(
        (item: any) => `
    <item>
      <itemCode>${item.itemCode || ""}</itemCode>
      <description>${item.description}</description>
      <hsnCode>${item.hsnCode || ""}</hsnCode>
      <quantity>${item.quantity}</quantity>
      <unit>${item.unit || "pcs"}</unit>
      <unitPrice>${item.unitPrice.toFixed(2)}</unitPrice>
      <discount>${(item.discount || 0).toFixed(2)}</discount>
      <totalWithoutVAT>${item.totalPriceWithoutVAT.toFixed(2)}</totalWithoutVAT>
      <vatRate>13</vatRate>
      <vatAmount>${item.vatAmount.toFixed(2)}</vatAmount>
      <totalWithVAT>${item.totalPriceWithVAT.toFixed(2)}</totalWithVAT>
    </item>
    `,
      )
      .join("")}
  </items>
  <totals>
    <subTotal>${base.toFixed(2)}</subTotal>
    <totalDiscount>0.00</totalDiscount>
    <totalVAT>${vat.toFixed(2)}</totalVAT>
    <grandTotal>${selectedIncome.total.toFixed(2)}</grandTotal>
  </totals>
  <paymentDetails>
    <paymentMode>${selectedIncome.payment_mode}</paymentMode>
    <amountPaid>${selectedIncome.total.toFixed(2)}</amountPaid>
    <amountDue>0.00</amountDue>
  </paymentDetails>
  <additionalDetails>
    <remarks>Goods sold are not returnable.</remarks>
    <irn>IRN-${selectedIncome.id.slice(0, 8)}</irn>
    <qrCodeData>QRDATA-${selectedIncome.id.slice(0, 8)}</qrCodeData>
    <preparedBy>${billData.preparedBy || user?.email}</preparedBy>
    <approvedBy>${billData.approvedBy || "Finance Officer"}</approvedBy>
  </additionalDetails>
</vatInvoice>
    `;

    const blob = new Blob([xml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoice-${selectedIncome.id.slice(0, 8)}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <Card>
        <CardHeader>
          <CardTitle>VAT Entry</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Payment Mode</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Base Amount</TableHead>
                <TableHead>VAT Amount</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incomes.map((income) => {
                const { base, vat } = calculateVAT(income.total);
                return (
                  <TableRow key={income.id}>
                    <TableCell>{income.order_date}</TableCell>
                    <TableCell>{income.payment_mode}</TableCell>
                    <TableCell>{income.total.toFixed(2)}</TableCell>
                    <TableCell>{base.toFixed(2)}</TableCell>
                    <TableCell>{vat.toFixed(2)}</TableCell>
                    <TableCell>
                      <Button onClick={() => generateBill(income)}>
                        Generate Bill
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isBillOpen} onOpenChange={setIsBillOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>VAT Bill</DialogTitle>
          </DialogHeader>
          {selectedIncome && (
            <div className="p-4" id="bill-content">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <h2 className="font-bold">Buyer Details</h2>
                  <div className="space-y-2">
                    <Input
                      placeholder="Buyer Name"
                      value={billData.buyerName}
                      onChange={(e) =>
                        setBillData({ ...billData, buyerName: e.target.value })
                      }
                    />
                    <Input
                      placeholder="Buyer Address"
                      value={billData.buyerAddress}
                      onChange={(e) =>
                        setBillData({
                          ...billData,
                          buyerAddress: e.target.value,
                        })
                      }
                    />
                    <Input
                      placeholder="Buyer Contact"
                      value={billData.buyerContact}
                      onChange={(e) =>
                        setBillData({
                          ...billData,
                          buyerContact: e.target.value,
                        })
                      }
                    />
                    <Input
                      placeholder="Buyer Email"
                      value={billData.buyerEmail}
                      onChange={(e) =>
                        setBillData({ ...billData, buyerEmail: e.target.value })
                      }
                    />
                    <Input
                      placeholder="Buyer PAN"
                      value={billData.buyerPan}
                      onChange={(e) =>
                        setBillData({ ...billData, buyerPan: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div>
                  <h2 className="font-bold">Additional Details</h2>
                  <div className="space-y-2">
                    <Input
                      placeholder="Prepared By"
                      value={billData.preparedBy}
                      onChange={(e) =>
                        setBillData({ ...billData, preparedBy: e.target.value })
                      }
                    />
                    <Input
                      placeholder="Approved By"
                      value={billData.approvedBy}
                      onChange={(e) =>
                        setBillData({ ...billData, approvedBy: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={handlePrint}>Print</Button>
            <Button onClick={handleDownload}>Download</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VatEntryTab;
