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
  items: any[];
}

const VatEntryTab = () => {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState("all");
  const [paymentMethod, setPaymentMethod] = useState("all");
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
  const [sellerInfo, setSellerInfo] = useState({
    name: "Energy Palace Pvt. Ltd.",
    address: "Kamalamai, Bhiman, Sindhuli",
    contactNumber: "",
    email: "",
    pan: "621143805",
    vatRegistrationNumber: "621143805",
  });

  useEffect(() => {
    fetchIncomes();
  }, [user, startDate, endDate, category, paymentMethod]);

  const fetchIncomes = async () => {
    if (!user) return;

    setLoading(true);
    try {
      let ordersQuery = supabase
        .from("orders")
        .select("id, total, payment_mode, order_date")
        .eq("user_id", user.id);
      let chargingQuery = supabase
        .from("charging_sessions")
        .select("id, total_amount, payment_mode, session_date")
        .eq("user_id", user.id);

      if (startDate) {
        ordersQuery = ordersQuery.gte("order_date", startDate);
        chargingQuery = chargingQuery.gte("session_date", startDate);
      }
      if (endDate) {
        ordersQuery = ordersQuery.lte("order_date", endDate);
        chargingQuery = chargingQuery.lte("session_date", endDate);
      }
      if (paymentMethod !== "all") {
        ordersQuery = ordersQuery.eq("payment_mode", paymentMethod);
        chargingQuery = chargingQuery.eq("payment_mode", paymentMethod);
      }

      const { data: orders, error: ordersError } = await ordersQuery;
      if (ordersError) throw ordersError;

      const orderIds = orders?.map((o) => o.id) || [];
      const { data: orderItems, error: orderItemsError } = await supabase
        .from("order_items")
        .select("*")
        .in("order_id", orderIds);
      if (orderItemsError) throw orderItemsError;

      const { data: charging, error: chargingError } = await chargingQuery;
      if (chargingError) throw chargingError;

      let allIncomes: Income[] = [];
      if (category === "all" || category === "orders") {
        allIncomes.push(
          ...((orders?.map((o) => ({
            ...o,
            items: orderItems?.filter((oi) => oi.order_id === o.id) || [],
          })) as Income[]) || [])
        );
      }
      if (category === "all" || category === "charging") {
        allIncomes.push(
          ...((charging?.map((c) => ({
            id: c.id,
            total: c.total_amount,
            payment_mode: c.payment_mode,
            order_date: c.session_date,
            items: [],
          })) as Income[]) || [])
        );
      }

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

  const openBillDialog = (income: Income) => {
    setSelectedIncome(income);
    setIsBillOpen(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!selectedIncome) return;

    const { base, vat } = calculateVAT(selectedIncome.total);
    const totals = {
      subTotal: base.toFixed(2),
      totalVAT: vat.toFixed(2),
      grandTotal: selectedIncome.total.toFixed(2),
    };

    const itemsHtml = selectedIncome.items
      .map(
        (item: any) =>
          `<tr class="item">
        <td>${item.item_name} (${item.quantity} ${item.unit || "pcs"} @ NPR ${item.price})</td>
        <td>NPR ${(item.quantity * item.price * 1.13).toFixed(2)}</td>
      </tr>`
      )
      .join("");

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>VAT Invoice - ${selectedIncome.id}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 40px;
      color: #333;
    }
    .invoice-box {
      max-width: 800px;
      margin: auto;
      border: 1px solid #eee;
      padding: 30px;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.15);
    }
    .title {
      font-size: 32px;
      line-height: 32px;
      color: #333;
    }
    table {
      width: 100%;
      line-height: inherit;
      border-collapse: collapse;
    }
    table td {
      padding: 5px;
      vertical-align: top;
    }
    table tr td:nth-child(2) {
      text-align: right;
    }
    table tr.top table td {
      padding-bottom: 20px;
    }
    table tr.heading td {
      background: #eee;
      border-bottom: 1px solid #ddd;
      font-weight: bold;
    }
    table tr.item td {
      border-bottom: 1px solid #eee;
    }
    table tr.item.last td {
      border-bottom: none;
    }
    table tr.total td:nth-child(2) {
      border-top: 2px solid #eee;
      font-weight: bold;
    }
    .footer {
      margin-top: 30px;
      text-align: center;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="invoice-box">
    <table cellpadding="0" cellspacing="0">
      <tr class="top">
        <td colspan="2">
          <table>
            <tr>
              <td class="title">
                VAT INVOICE
              </td>
              <td>
                Invoice #: ${selectedIncome.id}<br />
                Date: ${new Date(selectedIncome.order_date).toLocaleDateString()}<br />
                IRN: ${`IRN-${selectedIncome.id}`}
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr class="information">
        <td colspan="2">
          <table>
            <tr>
              <td>
                <strong>Seller:</strong><br />
                ${sellerInfo.name}<br />
                ${sellerInfo.address}<br />
                PAN/VAT: ${sellerInfo.vatRegistrationNumber}<br />
                Contact: ${sellerInfo.contactNumber}
              </td>
              <td>
                <strong>Buyer:</strong><br />
                ${billData.buyerName || "N/A"}<br />
                ${billData.buyerAddress || "N/A"}<br />
                PAN/VAT: ${billData.buyerPan || "N/A"}<br />
                Contact: ${billData.buyerContact || "N/A"}
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr class="heading">
        <td>Payment Method</td>
        <td>${selectedIncome.payment_mode}</td>
      </tr>
      <tr class="details">
        <td>Paid</td>
        <td>NPR ${selectedIncome.total.toFixed(2)}</td>
      </tr>
      <tr class="heading">
        <td>Item</td>
        <td>Amount</td>
      </tr>
      ${itemsHtml}
      <tr class="item last">
        <td>Subtotal</td>
        <td>NPR ${totals.subTotal}</td>
      </tr>
      <tr class="item">
        <td>VAT (13%)</td>
        <td>NPR ${totals.totalVAT}</td>
      </tr>
      <tr class="total">
        <td></td>
        <td>Grand Total: NPR ${totals.grandTotal}</td>
      </tr>
    </table>
    <div class="footer">
      Prepared By: ${billData.preparedBy || user?.email} | Approved By: ${billData.approvedBy || "Admin"}<br />
      Thank you for your business.<br />
      Goods once sold are not returnable.<br />
    </div>
  </div>
</body>
</html>
`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoice-${selectedIncome.id}.html`;
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
          <div className="flex space-x-4 mb-4">
            <div>
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="all">All</option>
                <option value="orders">Orders</option>
                <option value="charging">Charging</option>
              </select>
            </div>
            <div>
              <Label htmlFor="payment-method">Payment Method</Label>
              <select
                id="payment-method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="all">All</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="esewa">eSewa</option>
                <option value="fonepay">Fonepay</option>
              </select>
            </div>
          </div>
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
              <TableRow>
                <TableCell colSpan={2} className="font-bold">
                  Total
                </TableCell>
                <TableCell className="font-bold">
                  {incomes
                    .reduce((acc, income) => acc + income.total, 0)
                    .toFixed(2)}
                </TableCell>
                <TableCell className="font-bold">
                  {incomes
                    .reduce(
                      (acc, income) => acc + calculateVAT(income.total).base,
                      0,
                    )
                    .toFixed(2)}
                </TableCell>
                <TableCell className="font-bold">
                  {incomes
                    .reduce(
                      (acc, income) => acc + calculateVAT(income.total).vat,
                      0,
                    )
                    .toFixed(2)}
                </TableCell>
                <TableCell />
              </TableRow>
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
                      <Button onClick={() => openBillDialog(income)}>
                        Generate
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
            <div
              className="invoice-box"
              dangerouslySetInnerHTML={{
                __html: `
                <table cellpadding="0" cellspacing="0">
                  <tr class="top">
                    <td colspan="2">
                      <table>
                        <tr>
                          <td class="title">
                            VAT INVOICE
                          </td>
                          <td>
                            Invoice #: ${selectedIncome.id.slice(0, 8)}<br />
                            Date: ${selectedIncome.order_date}<br />
                            IRN: IRN-${selectedIncome.id.slice(0, 8)}
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr class="information">
                    <td colspan="2">
                      <table>
                        <tr>
                          <td>
                            <strong>Seller:</strong><br />
                            ${sellerInfo.name}<br />
                            ${sellerInfo.address}<br />
                            PAN/VAT: ${sellerInfo.pan}<br />
                            Contact: ${sellerInfo.contactNumber}
                          </td>
                          <td>
                            <strong>Buyer:</strong><br />
                            ${billData.buyerName || "Walk-in Customer"}<br />
                            ${billData.buyerAddress}<br />
                            PAN/VAT: ${billData.buyerPan}<br />
                            Contact: ${billData.buyerContact}
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr class="heading">
                    <td>Payment Method</td>
                    <td>${selectedIncome.payment_mode}</td>
                  </tr>
                  <tr class="details">
                    <td>Paid</td>
                    <td>NPR ${selectedIncome.total.toFixed(2)}</td>
                  </tr>
                  <tr class="heading">
                    <td>Item</td>
                    <td>Amount</td>
                  </tr>
                  <tr class="item">
                    <td>Service Charge</td>
                    <td>NPR ${selectedIncome.total.toFixed(2)}</td>
                  </tr>
                  <tr class="item last">
                    <td>Subtotal</td>
                    <td>NPR ${calculateVAT(selectedIncome.total).base.toFixed(
                      2,
                    )}</td>
                  </tr>
                  <tr class="item">
                    <td>VAT (13%)</td>
                    <td>NPR ${calculateVAT(selectedIncome.total).vat.toFixed(
                      2,
                    )}</td>
                  </tr>
                  <tr class="total">
                    <td></td>
                    <td>Grand Total: NPR ${selectedIncome.total.toFixed(2)}</td>
                  </tr>
                </table>
                <div class="footer">
                  Prepared By: ${
                    billData.preparedBy || user?.email
                  } | Approved By: ${
                  billData.approvedBy || "Finance Officer"
                }<br />
                  Thank you for your business.<br />
                  Goods once sold are not returnable.<br />
                </div>
              `,
              }}
            />
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
