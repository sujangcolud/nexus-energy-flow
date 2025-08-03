
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Calendar, DollarSign, TrendingUp, TrendingDown } from "lucide-react";

interface DailySummaryData {
  id: number;
  summary_date: string;
  total_income_from_orders: number;
  total_income_from_charging: number;
  total_expenses: number;
  total_deposits: number;
  total_savings: number;
  total_withdrawals: number;
  total_income: number;
  cash_balance: number;
  esewa_balance: number;
  fonepay_balance: number;
  cooperative_balance: number;
  total_balance: number;
  created_at: string;
  updated_at: string;
}

const DailyClosingSystem = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [summaryData, setSummaryData] = useState<DailySummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user && selectedDate) {
      fetchDailySummary();
    }
  }, [user, selectedDate]);

  const fetchDailySummary = async () => {
    if (!user || !selectedDate) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("daily_summary")
        .select("*")
        .eq("summary_date", selectedDate)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setSummaryData(data);
    } catch (error) {
      console.error("Error fetching daily summary:", error);
      toast.error("Failed to fetch daily summary");
    } finally {
      setIsLoading(false);
    }
  };

  const performDailyClosing = async () => {
    if (!user || !selectedDate) {
      toast.error("Please select a date and ensure you're logged in");
      return;
    }

    setIsLoading(true);
    try {
      // Call the enhanced daily summary function
      const { error } = await supabase.rpc('update_enhanced_daily_summary', {
        target_date: selectedDate
      });

      if (error) {
        throw error;
      }

      toast.success("Daily closing completed successfully!");
      await fetchDailySummary();
    } catch (error) {
      console.error("Daily closing error:", error);
      toast.error("Failed to perform daily closing");
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `NRs. ${amount?.toFixed(2) || "0.00"}`;
  };

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return "text-green-600";
    if (balance < 0) return "text-red-600";
    return "text-gray-600";
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Daily Closing System
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Label htmlFor="date">Select Date</Label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <Button
              onClick={performDailyClosing}
              disabled={isLoading}
              className="min-w-[120px]"
            >
              {isLoading ? "Processing..." : "Process Closing"}
            </Button>
          </div>

          {summaryData && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  Daily Summary - {summaryData.summary_date}
                </h3>
                <Badge variant="secondary">
                  Last Updated: {new Date(summaryData.updated_at).toLocaleString()}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Income Section */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-green-600 flex items-center gap-1">
                      <TrendingUp className="h-4 w-4" />
                      Total Income
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(summaryData.total_income)}
                    </div>
                    <div className="text-sm text-gray-600 mt-2">
                      <div>Orders: {formatCurrency(summaryData.total_income_from_orders)}</div>
                      <div>Charging: {formatCurrency(summaryData.total_income_from_charging)}</div>
                    </div>
                  </CardContent>
                </Card>

                {/* Expenses Section */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-red-600 flex items-center gap-1">
                      <TrendingDown className="h-4 w-4" />
                      Total Expenses
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {formatCurrency(summaryData.total_expenses)}
                    </div>
                  </CardContent>
                </Card>

                {/* Deposits Section */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-blue-600 flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      Total Deposits
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency(summaryData.total_deposits)}
                    </div>
                  </CardContent>
                </Card>

                {/* Savings Section */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-purple-600">
                      Savings & Withdrawals
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-semibold text-purple-600">
                      {formatCurrency(summaryData.total_savings)}
                    </div>
                    <div className="text-sm text-gray-600">
                      Withdrawals: {formatCurrency(summaryData.total_withdrawals)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Separator className="my-6" />

              {/* Balance Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Cash Balance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-xl font-bold ${getBalanceColor(summaryData.cash_balance)}`}>
                      {formatCurrency(summaryData.cash_balance)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Esewa Balance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-xl font-bold ${getBalanceColor(summaryData.esewa_balance)}`}>
                      {formatCurrency(summaryData.esewa_balance)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Fonepay Balance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-xl font-bold ${getBalanceColor(summaryData.fonepay_balance)}`}>
                      {formatCurrency(summaryData.fonepay_balance)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Cooperative Balance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-xl font-bold ${getBalanceColor(summaryData.cooperative_balance)}`}>
                      {formatCurrency(summaryData.cooperative_balance)}
                    </div>
                  </CardContent>
                </Card>

                <Card className="md:col-span-1">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold">Total Balance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${getBalanceColor(summaryData.total_balance)}`}>
                      {formatCurrency(summaryData.total_balance)}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {!summaryData && !isLoading && (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">
                  No daily summary found for {selectedDate}. 
                  Click "Process Closing" to generate one.
                </p>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DailyClosingSystem;
