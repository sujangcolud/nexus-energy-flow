import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Info,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";

interface OpeningBalance {
  id: string;
  cutoff_date: string;
  opening_balance_amount: number;
  created_at: string;
  updated_at: string;
}

const OpeningBalanceTab = () => {
  const { user } = useAuth();
  const [openingBalance, setOpeningBalance] = useState<OpeningBalance | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    cutoff_date: new Date().toISOString().split("T")[0],
    opening_balance_amount: "",
  });

  const fetchOpeningBalance = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("opening_balances")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
        throw error;
      }
      
      if (data) {
        setOpeningBalance(data);
        setFormData({
          cutoff_date: data.cutoff_date,
          opening_balance_amount: data.opening_balance_amount.toString(),
        });
      }
    } catch (error) {
      console.error("Error fetching opening balance:", error);
      toast.error("Failed to load opening balance");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchOpeningBalance();
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.cutoff_date || !formData.opening_balance_amount) {
      toast.error("Please fill all required fields");
      return;
    }

    setSubmitting(true);
    try {
      const balanceData = {
        user_id: user.id,
        cutoff_date: formData.cutoff_date,
        opening_balance_amount: parseFloat(formData.opening_balance_amount),
      };

      if (openingBalance) {
        // Update existing opening balance
        const { error } = await supabase
          .from("opening_balances")
          .update(balanceData)
          .eq("id", openingBalance.id);

        if (error) throw error;
        toast.success("Opening balance updated successfully!");
      } else {
        // Create new opening balance
        const { error } = await supabase
          .from("opening_balances")
          .insert(balanceData);

        if (error) throw error;
        toast.success("Opening balance set successfully!");
      }

      fetchOpeningBalance();
    } catch (error) {
      console.error("Error saving opening balance:", error);
      toast.error("Failed to save opening balance");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    if (openingBalance) {
      setFormData({
        cutoff_date: openingBalance.cutoff_date,
        opening_balance_amount: openingBalance.opening_balance_amount.toString(),
      });
    } else {
      setFormData({
        cutoff_date: new Date().toISOString().split("T")[0],
        opening_balance_amount: "",
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-primary rounded-xl">
          <Calendar className="h-6 w-6 text-black" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-black">Opening Balance</h1>
          <p className="text-gray-600">
            Set the cutoff date and opening balance for financial calculations
          </p>
        </div>
      </div>

      {/* Information Alert */}
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          The opening balance represents your business's financial position at the cutoff date. 
          This will be used as the starting point for all financial calculations and reports.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Opening Balance Form */}
        <Card className="border border-gray-200">
          <CardHeader className="bg-brand-50 border-b border-gray-200">
            <CardTitle className="text-black">
              {openingBalance ? "Update Opening Balance" : "Set Opening Balance"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label className="text-black font-medium">Cutoff Date *</Label>
                <Input
                  type="date"
                  value={formData.cutoff_date}
                  onChange={(e) =>
                    setFormData({ ...formData, cutoff_date: e.target.value })
                  }
                  required
                  className="focus:ring-primary focus:border-primary"
                />
                <p className="text-sm text-gray-600 mt-1">
                  Select the date from which you want to start tracking your business finances
                </p>
              </div>

              <div>
                <Label className="text-black font-medium">Opening Balance Amount (NRs.) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.opening_balance_amount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      opening_balance_amount: e.target.value,
                    })
                  }
                  placeholder="Enter opening balance amount"
                  required
                  className="focus:ring-primary focus:border-primary"
                />
                <p className="text-sm text-gray-600 mt-1">
                  Enter the total cash and bank balance as of the cutoff date
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-primary hover:bg-brand-400 text-black"
                >
                  {submitting
                    ? "Saving..."
                    : openingBalance
                      ? "Update Balance"
                      : "Set Balance"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                  className="hover:bg-brand-50"
                >
                  Reset
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Current Status */}
        <Card className="border border-gray-200">
          <CardHeader className="bg-brand-50 border-b border-gray-200">
            <CardTitle className="text-black">Current Status</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-gray-500 mt-2">Loading status...</p>
              </div>
            ) : openingBalance ? (
              <div className="space-y-6">
                <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                  <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-green-800">Opening Balance Set</p>
                    <p className="text-sm text-green-700">
                      Your financial tracking is properly configured
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-gray-600" />
                      <div>
                        <p className="font-medium text-black">Cutoff Date</p>
                        <p className="text-sm text-gray-600">Financial tracking starts from</p>
                      </div>
                    </div>
                    <p className="font-bold text-black">
                      {format(new Date(openingBalance.cutoff_date), "MMM dd, yyyy")}
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-5 w-5 text-gray-600" />
                      <div>
                        <p className="font-medium text-black">Opening Balance</p>
                        <p className="text-sm text-gray-600">Starting financial position</p>
                      </div>
                    </div>
                    <p className="font-bold text-black">
                      NRs. {Number(openingBalance.opening_balance_amount).toLocaleString()}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Last updated</p>
                      <p className="font-medium text-black">
                        {format(new Date(openingBalance.updated_at), "MMM dd, yyyy 'at' HH:mm")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <AlertCircle className="h-6 w-6 text-yellow-600 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-yellow-800">No Opening Balance Set</p>
                    <p className="text-sm text-yellow-700">
                      Please set your opening balance to start tracking finances
                    </p>
                  </div>
                </div>

                <div className="text-center py-8">
                  <Calendar className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-xl font-semibold text-gray-700 mb-2">
                    Set Your Opening Balance
                  </p>
                  <p className="text-gray-500 max-w-sm mx-auto">
                    Configure your cutoff date and opening balance to begin accurate financial tracking
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OpeningBalanceTab;