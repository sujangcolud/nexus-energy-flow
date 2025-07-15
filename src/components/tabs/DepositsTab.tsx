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
import { toast } from "sonner";
import { CreditCard, TrendingUp } from "lucide-react";

const DepositsTab = () => {
  const { user } = useAuth();
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [canEditTransactions, setCanEditTransactions] = useState(false);

  const [formData, setFormData] = useState({
    amount: "",
    source: "",
    mode: "Cash",
    deposit_date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    if (user) {
      fetchDeposits();
    }
    const canEdit = localStorage.getItem("canEditTransactions");
    if (canEdit) {
      setCanEditTransactions(JSON.parse(canEdit));
    }
  }, [user]);

  const fetchDeposits = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("deposits")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDeposits(data || []);
    } catch (error) {
      console.error("Error fetching deposits:", error);
      toast.error("Failed to load deposits");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    try {
      const { error } = await supabase.from("deposits").insert({
        user_id: user.id,
        amount: parseFloat(formData.amount),
        source: formData.source,
        mode: formData.mode,
        deposit_date: formData.deposit_date,
      });

      if (error) throw error;

      toast.success("Deposit added successfully!");
      setFormData({
        amount: "",
        source: "",
        mode: "Cash",
        deposit_date: new Date().toISOString().split("T")[0],
      });
      fetchDeposits();
    } catch (error) {
      console.error("Error adding deposit:", error);
      toast.error("Failed to add deposit");
    }
  };

  const totalDeposits = deposits.reduce(
    (sum, deposit) => sum + Number(deposit.amount),
    0,
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-primary rounded-xl">
          <CreditCard className="h-6 w-6 text-black" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-black">Deposit Management</h1>
          <p className="text-gray-600">Track cash inflows and deposits</p>
        </div>
      </div>

      <Card className="border border-gray-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">
                Total Deposits
              </p>
              <p className="text-2xl font-bold text-black">
                NRs. {totalDeposits.toFixed(2)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-xl">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border border-gray-200">
          <CardHeader className="bg-brand-50 border-b border-gray-200">
            <CardTitle className="text-black">Add New Deposit</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-black">Amount (NRs.)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  placeholder="Enter amount"
                  required
                />
              </div>
              <div>
                <Label className="text-black">Source</Label>
                <Input
                  value={formData.source}
                  onChange={(e) =>
                    setFormData({ ...formData, source: e.target.value })
                  }
                  placeholder="Enter deposit source"
                  required
                />
              </div>
              <div>
                <Label className="text-black">Deposit Date</Label>
                <Input
                  type="date"
                  value={formData.deposit_date}
                  onChange={(e) =>
                    setFormData({ ...formData, deposit_date: e.target.value })
                  }
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-brand-400 text-black"
              >
                Add Deposit
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardHeader className="bg-brand-50 border-b border-gray-200">
            <CardTitle className="text-black">Recent Deposits</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-gray-500 mt-2">Loading deposits...</p>
              </div>
            ) : deposits.length === 0 ? (
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No deposits found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deposits.slice(0, 10).map((deposit) => (
                    <TableRow key={deposit.id}>
                      <TableCell>{deposit.source}</TableCell>
                      <TableCell className="font-medium">
                        NRs. {Number(deposit.amount).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {new Date(deposit.deposit_date).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DepositsTab;
