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
import { Banknote, TrendingDown } from "lucide-react";

const WithdrawalsTab = () => {
  const { user } = useAuth();
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [canEditTransactions, setCanEditTransactions] = useState(false);

  const [formData, setFormData] = useState({
    amount: "",
    purpose: "",
    mode: "Cash",
    withdrawal_date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    if (user) {
      fetchWithdrawals();
    }
    const canEdit = localStorage.getItem("canEditTransactions");
    if (canEdit) {
      setCanEditTransactions(JSON.parse(canEdit));
    }
  }, [user]);

  const fetchWithdrawals = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("withdrawals")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setWithdrawals(data || []);
    } catch (error) {
      console.error("Error fetching withdrawals:", error);
      toast.error("Failed to load withdrawals");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    try {
      const { error } = await supabase.from("withdrawals").insert({
        user_id: user.id,
        amount: parseFloat(formData.amount),
        purpose: formData.purpose,
        mode: formData.mode,
        withdrawal_date: formData.withdrawal_date,
      });

      if (error) throw error;

      toast.success("Withdrawal added successfully!");
      setFormData({
        amount: "",
        purpose: "",
        mode: "Cash",
        withdrawal_date: new Date().toISOString().split("T")[0],
      });
      fetchWithdrawals();
    } catch (error) {
      console.error("Error adding withdrawal:", error);
      toast.error("Failed to add withdrawal");
    }
  };

  const totalWithdrawals = withdrawals.reduce(
    (sum, withdrawal) => sum + Number(withdrawal.amount),
    0,
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-primary rounded-xl">
          <Banknote className="h-6 w-6 text-black" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-black">
            Withdrawal Management
          </h1>
          <p className="text-gray-600">Track cash outflows and withdrawals</p>
        </div>
      </div>

      <Card className="border border-gray-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">
                Total Withdrawals
              </p>
              <p className="text-2xl font-bold text-black">
                NRs. {totalWithdrawals.toFixed(2)}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-xl">
              <TrendingDown className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border border-gray-200">
          <CardHeader className="bg-brand-50 border-b border-gray-200">
            <CardTitle className="text-black">Add New Withdrawal</CardTitle>
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
                <Label className="text-black">Purpose</Label>
                <Input
                  value={formData.purpose}
                  onChange={(e) =>
                    setFormData({ ...formData, purpose: e.target.value })
                  }
                  placeholder="Enter withdrawal purpose"
                  required
                />
              </div>
              <div>
                <Label className="text-black">Withdrawal Date</Label>
                <Input
                  type="date"
                  value={formData.withdrawal_date}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      withdrawal_date: e.target.value,
                    })
                  }
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-brand-400 text-black"
              >
                Add Withdrawal
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardHeader className="bg-brand-50 border-b border-gray-200">
            <CardTitle className="text-black">Recent Withdrawals</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-gray-500 mt-2">Loading withdrawals...</p>
              </div>
            ) : withdrawals.length === 0 ? (
              <div className="text-center py-8">
                <Banknote className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No withdrawals found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawals.slice(0, 10).map((withdrawal) => (
                    <TableRow key={withdrawal.id}>
                      <TableCell>{withdrawal.purpose}</TableCell>
                      <TableCell className="font-medium">
                        NRs. {Number(withdrawal.amount).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {new Date(
                          withdrawal.withdrawal_date,
                        ).toLocaleDateString()}
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

export default WithdrawalsTab;
