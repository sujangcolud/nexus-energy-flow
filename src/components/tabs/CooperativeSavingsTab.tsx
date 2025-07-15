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
import { Users, PiggyBank } from "lucide-react";

const CooperativeSavingsTab = () => {
  const { user } = useAuth();
  const [savings, setSavings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [canEditTransactions, setCanEditTransactions] = useState(false);

  const [formData, setFormData] = useState({
    member_name: "",
    contribution_amount: "",
    contribution_date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    if (user) {
      fetchSavings();
    }
    const canEdit = localStorage.getItem("canEditTransactions");
    if (canEdit) {
      setCanEditTransactions(JSON.parse(canEdit));
    }
  }, [user]);

  const fetchSavings = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("cooperative_savings")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSavings(data || []);
    } catch (error) {
      console.error("Error fetching savings:", error);
      toast.error("Failed to load savings");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    try {
      const { error } = await supabase.from("cooperative_savings").insert({
        user_id: user.id,
        member_name: formData.member_name,
        contribution_amount: parseFloat(formData.contribution_amount),
        contribution_date: formData.contribution_date,
      });

      if (error) throw error;

      toast.success("Contribution added successfully!");
      setFormData({
        member_name: "",
        contribution_amount: "",
        contribution_date: new Date().toISOString().split("T")[0],
      });
      fetchSavings();
    } catch (error) {
      console.error("Error adding contribution:", error);
      toast.error("Failed to add contribution");
    }
  };

  const totalContributions = savings.reduce(
    (sum, saving) => sum + Number(saving.contribution_amount),
    0,
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-primary rounded-xl">
          <Users className="h-6 w-6 text-black" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-black">Cooperative Savings</h1>
          <p className="text-gray-600">
            Manage member contributions and savings
          </p>
        </div>
      </div>

      <Card className="border border-gray-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">
                Total Contributions
              </p>
              <p className="text-2xl font-bold text-black">
                NRs. {totalContributions.toFixed(2)}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl">
              <PiggyBank className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border border-gray-200">
          <CardHeader className="bg-brand-50 border-b border-gray-200">
            <CardTitle className="text-black">Add New Contribution</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-black">Member Name</Label>
                <Input
                  value={formData.member_name}
                  onChange={(e) =>
                    setFormData({ ...formData, member_name: e.target.value })
                  }
                  placeholder="Enter member name"
                  required
                />
              </div>
              <div>
                <Label className="text-black">Contribution Amount (NRs.)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.contribution_amount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      contribution_amount: e.target.value,
                    })
                  }
                  placeholder="Enter amount"
                  required
                />
              </div>
              <div>
                <Label className="text-black">Contribution Date</Label>
                <Input
                  type="date"
                  value={formData.contribution_date}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      contribution_date: e.target.value,
                    })
                  }
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-brand-400 text-black"
              >
                Add Contribution
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardHeader className="bg-brand-50 border-b border-gray-200">
            <CardTitle className="text-black">Recent Contributions</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-gray-500 mt-2">Loading contributions...</p>
              </div>
            ) : savings.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No contributions found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {savings.slice(0, 10).map((saving) => (
                    <TableRow key={saving.id}>
                      <TableCell>{saving.member_name}</TableCell>
                      <TableCell className="font-medium">
                        NRs. {Number(saving.contribution_amount).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {new Date(
                          saving.contribution_date,
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

export default CooperativeSavingsTab;
