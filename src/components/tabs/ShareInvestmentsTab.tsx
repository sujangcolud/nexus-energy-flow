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
import {
  TrendingUp,
  Users,
  DollarSign,
  Plus,
  Trash2,
  Edit,
  AlertCircle,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { format } from "date-fns";

interface ShareInvestment {
  id: string;
  shareholder_name: string;
  contribution_amount: number;
  investment_date: string;
  payment_mode: string;
  created_at: string;
}

const ShareInvestmentsTab = () => {
  const { user } = useAuth();
  const [investments, setInvestments] = useState<ShareInvestment[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedInvestment, setSelectedInvestment] = useState<ShareInvestment | null>(null);
  const [canEditTransactions, setCanEditTransactions] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    shareholder_name: "",
    contribution_amount: "",
    investment_date: new Date().toISOString().split("T")[0],
    payment_mode: "",
  });

  const paymentModes = ["Cash", "Esewa", "Fonepay", "Bank", "Cheque", "Credit"];

  const fetchInvestments = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("share_investments")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInvestments(data || []);
    } catch (error) {
      console.error("Error fetching share investments:", error);
      toast.error("Failed to load share investments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchInvestments();
    }
    const canEdit = localStorage.getItem("canEditTransactions");
    if (canEdit) {
      setCanEditTransactions(JSON.parse(canEdit));
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (
      !formData.shareholder_name ||
      !formData.contribution_amount ||
      !formData.payment_mode
    ) {
      toast.error("Please fill all required fields");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("share_investments").insert({
        user_id: user.id,
        shareholder_name: formData.shareholder_name,
        contribution_amount: parseFloat(formData.contribution_amount),
        investment_date: formData.investment_date,
        payment_mode: formData.payment_mode,
      });

      if (error) throw error;

      toast.success("Share investment added successfully!");
      setFormData({
        shareholder_name: "",
        contribution_amount: "",
        investment_date: new Date().toISOString().split("T")[0],
        payment_mode: "",
      });
      fetchInvestments();
    } catch (error) {
      console.error("Error adding share investment:", error);
      toast.error("Failed to add share investment");
    } finally {
      setSubmitting(false);
    }
  };

  const logAction = async (action: string, record_id: string, details: any) => {
    if (!user) return;
    await supabase.from("logs").insert({
      user_id: user.id,
      action,
      table_name: "share_investments",
      record_id,
      details,
    });
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("share_investments")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Share investment deleted successfully!");
      logAction("delete", id, { id });
      fetchInvestments();
    } catch (error) {
      console.error("Error deleting share investment:", error);
      toast.error("Failed to delete share investment");
    }
  };

  const handleUpdate = async () => {
    if (!selectedInvestment) return;

    try {
      const { error } = await supabase
        .from("share_investments")
        .update(selectedInvestment)
        .eq("id", selectedInvestment.id);

      if (error) throw error;

      toast.success("Share investment updated successfully!");
      logAction("update", selectedInvestment.id, selectedInvestment);
      setIsEditDialogOpen(false);
      fetchInvestments();
    } catch (error) {
      console.error("Error updating share investment:", error);
      toast.error("Failed to update share investment");
    }
  };

  const totalInvestments = investments.reduce(
    (sum, investment) => sum + Number(investment.contribution_amount),
    0
  );

  const uniqueShareholders = new Set(investments.map(inv => inv.shareholder_name)).size;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-primary rounded-xl">
          <TrendingUp className="h-6 w-6 text-black" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-black">Share Investments</h1>
          <p className="text-gray-600">
            Manage shareholder contributions and equity investments
          </p>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Share Investment</DialogTitle>
          </DialogHeader>
          {selectedInvestment && (
            <div className="space-y-4">
              <div>
                <Label>Shareholder Name</Label>
                <Input
                  value={selectedInvestment.shareholder_name}
                  onChange={(e) =>
                    setSelectedInvestment({
                      ...selectedInvestment,
                      shareholder_name: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label>Contribution Amount (NRs.)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={selectedInvestment.contribution_amount}
                  onChange={(e) =>
                    setSelectedInvestment({
                      ...selectedInvestment,
                      contribution_amount: parseFloat(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label>Investment Date</Label>
                <Input
                  type="date"
                  value={selectedInvestment.investment_date}
                  onChange={(e) =>
                    setSelectedInvestment({
                      ...selectedInvestment,
                      investment_date: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label>Payment Mode</Label>
                <Select
                  value={selectedInvestment.payment_mode}
                  onValueChange={(value) =>
                    setSelectedInvestment({
                      ...selectedInvestment,
                      payment_mode: value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentModes.map((mode) => (
                      <SelectItem key={mode} value={mode}>
                        {mode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={handleUpdate}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  Total Investments
                </p>
                <p className="text-2xl font-bold text-black">
                  NRs. {totalInvestments.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  Total Shareholders
                </p>
                <p className="text-2xl font-bold text-black">
                  {uniqueShareholders}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  Average Investment
                </p>
                <p className="text-2xl font-bold text-black">
                  NRs. {investments.length > 0 ? (totalInvestments / investments.length).toFixed(0) : "0"}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Add New Investment Form */}
        <Card className="border border-gray-200">
          <CardHeader className="bg-brand-50 border-b border-gray-200">
            <CardTitle className="text-black">Add New Share Investment</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-black">Shareholder Name *</Label>
                <Input
                  value={formData.shareholder_name}
                  onChange={(e) =>
                    setFormData({ ...formData, shareholder_name: e.target.value })
                  }
                  placeholder="Enter shareholder name"
                  required
                  className="focus:ring-primary focus:border-primary"
                />
              </div>

              <div>
                <Label className="text-black">Contribution Amount (NRs.) *</Label>
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
                  placeholder="Enter contribution amount"
                  required
                  className="focus:ring-primary focus:border-primary"
                />
              </div>

              <div>
                <Label className="text-black">Investment Date</Label>
                <Input
                  type="date"
                  value={formData.investment_date}
                  onChange={(e) =>
                    setFormData({ ...formData, investment_date: e.target.value })
                  }
                  className="focus:ring-primary focus:border-primary"
                />
              </div>

              <div>
                <Label className="text-black">Payment Mode *</Label>
                <Select
                  value={formData.payment_mode}
                  onValueChange={(value) =>
                    setFormData({ ...formData, payment_mode: value })
                  }
                >
                  <SelectTrigger className="focus:ring-primary focus:border-primary">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentModes.map((mode) => (
                      <SelectItem key={mode} value={mode}>
                        {mode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-primary hover:bg-brand-400 text-black"
              >
                {submitting ? "Adding..." : "Add Investment"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Recent Investments */}
        <Card className="border border-gray-200">
          <CardHeader className="bg-brand-50 border-b border-gray-200">
            <CardTitle className="text-black">Recent Investments</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-gray-500 mt-2">Loading investments...</p>
              </div>
            ) : investments.length === 0 ? (
              <div className="text-center py-8">
                <TrendingUp className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No investments found</p>
                <p className="text-sm text-gray-400">
                  Add your first share investment to get started!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Shareholder</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Payment</TableHead>
                      {canEditTransactions && <TableHead>Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {investments.slice(0, 10).map((investment) => (
                      <TableRow key={investment.id}>
                        <TableCell className="font-medium">
                          {investment.shareholder_name}
                        </TableCell>
                        <TableCell className="font-medium">
                          NRs. {Number(investment.contribution_amount).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {format(new Date(investment.investment_date), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {investment.payment_mode}
                          </Badge>
                        </TableCell>
                        {canEditTransactions && (
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedInvestment(investment);
                                  setIsEditDialogOpen(true);
                                }}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="outline">
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Are you sure?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This action cannot be undone. This will
                                      permanently delete the share investment.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(investment.id)}
                                    >
                                      Continue
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ShareInvestmentsTab;