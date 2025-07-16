import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Plus, TrendingUp, DollarSign, Calendar, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface ShareInvestment {
  id: string;
  shareholder_name: string;
  contribution_amount: number;
  investment_date: string;
  payment_mode: string;
  created_at: string;
}

interface OpeningBalance {
  id: string;
  cutoff_date: string;
  opening_balance_amount: number;
  created_at: string;
}

interface NewInvestment {
  shareholder_name: string;
  contribution_amount: string;
  investment_date: string;
  payment_mode: string;
}

interface NewOpeningBalance {
  cutoff_date: string;
  opening_balance_amount: string;
}

const ShareInvestmentsTab = () => {
  const { user } = useAuth();
  const [investments, setInvestments] = useState<ShareInvestment[]>([]);
  const [openingBalance, setOpeningBalance] = useState<OpeningBalance | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [isAddingInvestment, setIsAddingInvestment] = useState(false);
  const [isSettingBalance, setIsSettingBalance] = useState(false);

  const [newInvestment, setNewInvestment] = useState<NewInvestment>({
    shareholder_name: "",
    contribution_amount: "",
    investment_date: new Date().toISOString().split("T")[0],
    payment_mode: "cash",
  });

  const [newOpeningBalance, setNewOpeningBalance] = useState<NewOpeningBalance>(
    {
      cutoff_date: new Date().toISOString().split("T")[0],
      opening_balance_amount: "",
    },
  );

  const paymentModes = ["cash", "bank_transfer", "cheque", "upi", "card"];

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch share investments
      const { data: investmentsData, error: investmentsError } = await supabase
        .from("share_investments")
        .select("*")
        .eq("user_id", user?.id)
        .order("investment_date", { ascending: false });

      if (investmentsError) throw investmentsError;
      setInvestments(investmentsData || []);

      // Fetch opening balance
      const { data: balanceData, error: balanceError } = await supabase
        .from("opening_balances")
        .select("*")
        .eq("user_id", user?.id)
        .single();

      if (balanceError && balanceError.code !== "PGRST116") {
        throw balanceError;
      }
      setOpeningBalance(balanceData);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddInvestment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newInvestment.shareholder_name || !newInvestment.contribution_amount) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsAddingInvestment(true);

    try {
      const { error } = await supabase.from("share_investments").insert({
        user_id: user?.id,
        shareholder_name: newInvestment.shareholder_name,
        contribution_amount: parseFloat(newInvestment.contribution_amount),
        investment_date: newInvestment.investment_date,
        payment_mode: newInvestment.payment_mode,
      });

      if (error) throw error;

      toast.success("Share investment added successfully.");
      setNewInvestment({
        shareholder_name: "",
        contribution_amount: "",
        investment_date: new Date().toISOString().split("T")[0],
        payment_mode: "cash",
      });
      fetchData();
    } catch (error: any) {
      console.error("Error adding investment:", error);
      toast.error("Failed to add investment.");
    } finally {
      setIsAddingInvestment(false);
    }
  };

  const handleSetOpeningBalance = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !newOpeningBalance.cutoff_date ||
      !newOpeningBalance.opening_balance_amount
    ) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSettingBalance(true);

    try {
      const { error } = await supabase.from("opening_balances").upsert({
        user_id: user?.id,
        cutoff_date: newOpeningBalance.cutoff_date,
        opening_balance_amount: parseFloat(
          newOpeningBalance.opening_balance_amount,
        ),
      });

      if (error) throw error;

      toast.success("Opening balance set successfully.");
      fetchData();
    } catch (error: any) {
      console.error("Error setting opening balance:", error);
      toast.error("Failed to set opening balance.");
    } finally {
      setIsSettingBalance(false);
    }
  };

  const handleDeleteInvestment = async (id: string) => {
    try {
      const { error } = await supabase
        .from("share_investments")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Investment deleted successfully.");
      fetchData();
    } catch (error: any) {
      console.error("Error deleting investment:", error);
      toast.error("Failed to delete investment.");
    }
  };

  const totalInvestments = investments.reduce(
    (sum, inv) => sum + inv.contribution_amount,
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <TrendingUp className="h-6 w-6 text-green-600" />
        <h2 className="text-2xl font-bold text-gray-900">Share Investments</h2>
      </div>

      {/* Opening Balance Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Opening Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {openingBalance ? (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Cutoff Date</p>
                  <p className="text-lg font-semibold">
                    {format(new Date(openingBalance.cutoff_date), "dd/MM/yyyy")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Opening Balance</p>
                  <p className="text-lg font-semibold text-green-600">
                    ₹{openingBalance.opening_balance_amount.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-4 p-4 bg-yellow-50 rounded-lg">
              <p className="text-yellow-800">
                No opening balance set. Please set the cutoff date and opening
                balance amount.
              </p>
            </div>
          )}

          <form onSubmit={handleSetOpeningBalance} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cutoff_date">Cutoff Date</Label>
                <Input
                  id="cutoff_date"
                  type="date"
                  value={newOpeningBalance.cutoff_date}
                  onChange={(e) =>
                    setNewOpeningBalance((prev) => ({
                      ...prev,
                      cutoff_date: e.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="opening_balance">
                  Opening Balance Amount (₹)
                </Label>
                <Input
                  id="opening_balance"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newOpeningBalance.opening_balance_amount}
                  onChange={(e) =>
                    setNewOpeningBalance((prev) => ({
                      ...prev,
                      opening_balance_amount: e.target.value,
                    }))
                  }
                  required
                />
              </div>
            </div>

            <Button type="submit" disabled={isSettingBalance}>
              <DollarSign className="h-4 w-4 mr-2" />
              {isSettingBalance ? "Setting..." : "Set Opening Balance"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Add Investment Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Share Investment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddInvestment} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shareholder_name">Shareholder Name</Label>
                <Input
                  id="shareholder_name"
                  type="text"
                  placeholder="Enter shareholder name"
                  value={newInvestment.shareholder_name}
                  onChange={(e) =>
                    setNewInvestment((prev) => ({
                      ...prev,
                      shareholder_name: e.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contribution_amount">
                  Contribution Amount (₹)
                </Label>
                <Input
                  id="contribution_amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newInvestment.contribution_amount}
                  onChange={(e) =>
                    setNewInvestment((prev) => ({
                      ...prev,
                      contribution_amount: e.target.value,
                    }))
                  }
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="investment_date">Investment Date</Label>
                <Input
                  id="investment_date"
                  type="date"
                  value={newInvestment.investment_date}
                  onChange={(e) =>
                    setNewInvestment((prev) => ({
                      ...prev,
                      investment_date: e.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_mode">Payment Mode</Label>
                <Select
                  value={newInvestment.payment_mode}
                  onValueChange={(value) =>
                    setNewInvestment((prev) => ({
                      ...prev,
                      payment_mode: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentModes.map((mode) => (
                      <SelectItem key={mode} value={mode}>
                        {mode.replace("_", " ").toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isAddingInvestment}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              {isAddingInvestment ? "Adding..." : "Add Investment"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Investments Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Investment Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600">Total Investments</p>
              <p className="text-2xl font-bold text-green-600">
                ₹{totalInvestments.toLocaleString()}
              </p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">Number of Investments</p>
              <p className="text-2xl font-bold text-blue-600">
                {investments.length}
              </p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-gray-600">Opening Balance</p>
              <p className="text-2xl font-bold text-purple-600">
                ₹
                {openingBalance
                  ? openingBalance.opening_balance_amount.toLocaleString()
                  : "0"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Investments List */}
      <Card>
        <CardHeader>
          <CardTitle>Investment History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading investments...</div>
          ) : investments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No share investments recorded yet.</p>
              <p className="text-sm">
                Add your first investment above to get started.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shareholder Name</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Payment Mode</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {investments.map((investment) => (
                  <TableRow key={investment.id}>
                    <TableCell className="font-medium">
                      {investment.shareholder_name}
                    </TableCell>
                    <TableCell className="text-green-600 font-semibold">
                      ₹{investment.contribution_amount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {format(
                        new Date(investment.investment_date),
                        "dd/MM/yyyy",
                      )}
                    </TableCell>
                    <TableCell className="capitalize">
                      {investment.payment_mode.replace("_", " ")}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteInvestment(investment.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ShareInvestmentsTab;
