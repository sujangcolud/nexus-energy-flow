import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
        .select("id, total_amount as total, payment_mode, session_date as order_date")
        .eq("user_id", user.id);

      if (chargingError) throw chargingError;

      const allIncomes = [...(orders || []), ...(charging || [])];
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

    const doc = new jsPDF();
    const { base, vat } = calculateVAT(selectedIncome.total);

    doc.text("VAT Bill", 20, 20);
    doc.text(`Invoice Number: INV-${selectedIncome.id.slice(0, 8)}`, 20, 30);
    doc.text(`Invoice Date: ${new Date().toLocaleDateString()}`, 20, 40);
    doc.text("Seller: Your Company Name", 20, 50);
    doc.text("VAT Number: 621143805", 20, 60);

    (doc as any).autoTable({
      startY: 70,
      head: [["Description", "Amount"]],
      body: [
        ["Base Amount", base.toFixed(2)],
        ["VAT (13%)", vat.toFixed(2)],
        ["Total", selectedIncome.total.toFixed(2)],
      ],
    });

    doc.save(`invoice-${selectedIncome.id.slice(0, 8)}.pdf`);
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>VAT Bill</DialogTitle>
          </DialogHeader>
          {selectedIncome && (
            <div>
              <p>Invoice Number: INV-{selectedIncome.id.slice(0, 8)}</p>
              <p>Invoice Date: {new Date().toLocaleDateString()}</p>
              <p>Seller: Your Company Name</p>
              <p>VAT Number: 621143805</p>
              <hr />
              <p>Base Amount: {calculateVAT(selectedIncome.total).base.toFixed(2)}</p>
              <p>VAT (13%): {calculateVAT(selectedIncome.total).vat.toFixed(2)}</p>
              <p>Total: {selectedIncome.total.toFixed(2)}</p>
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
