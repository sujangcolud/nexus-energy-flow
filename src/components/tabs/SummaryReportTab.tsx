
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, FileText, Calendar, TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { DailySummary } from "@/types/database";

interface SummaryData {
  totalIncome: number;
  totalExpenses: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalSavings: number;
  netProfit: number;
  currentBalances: {
    cash: number;
    esewa: number;
    fonepay: number;
    cooperative: number;
    total: number;
  };
}

const SummaryReportTab = () => {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [dailySummaries, setDailySummaries] = useState<DailySummary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSummaryData();
    }
  }, [user, dateRange]);

  const fetchSummaryData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('daily_summary')
        .select('*')
        .gte('summary_date', dateRange.start)
        .lte('summary_date', dateRange.end)
        .order('summary_date', { ascending: false });

      if (error) throw error;

      setDailySummaries(data || []);
      
      // Calculate summary totals
      const summary = (data || []).reduce((acc, item) => ({
        totalIncome: acc.totalIncome + (item.total_income || 0),
        totalExpenses: acc.totalExpenses + (item.total_expenses || 0),
        totalDeposits: acc.totalDeposits + (item.total_deposits || 0),
        totalWithdrawals: acc.totalWithdrawals + (item.total_withdrawals || 0),
        totalSavings: acc.totalSavings + (item.total_savings || 0),
        netProfit: acc.netProfit + ((item.total_income || 0) - (item.total_expenses || 0)),
        currentBalances: {
          cash: item.cash_balance || 0, // Use latest entry
          esewa: item.esewa_balance || 0,
          fonepay: item.fonepay_balance || 0,
          cooperative: item.cooperative_balance || 0,
          total: item.total_balance || 0,
        }
      }), {
        totalIncome: 0,
        totalExpenses: 0,
        totalDeposits: 0,
        totalWithdrawals: 0,
        totalSavings: 0,
        netProfit: 0,
        currentBalances: {
          cash: 0,
          esewa: 0,
          fonepay: 0,
          cooperative: 0,
          total: 0,
        }
      });

      // Use the latest balances from the most recent entry
      if (data && data.length > 0) {
        const latest = data[0];
        summary.currentBalances = {
          cash: latest.cash_balance || 0,
          esewa: latest.esewa_balance || 0,
          fonepay: latest.fonepay_balance || 0,
          cooperative: latest.cooperative_balance || 0,
          total: latest.total_balance || 0,
        };
      }

      setSummaryData(summary);
    } catch (error) {
      console.error('Error fetching summary data:', error);
      toast.error('Failed to load summary data');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (dailySummaries.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = [
      'Date',
      'Total Income',
      'Total Expenses',
      'Total Deposits',
      'Total Withdrawals',
      'Total Savings',
      'Net Profit',
      'Cash Balance',
      'Esewa Balance',
      'Fonepay Balance',
      'Cooperative Balance',
      'Total Balance'
    ];

    const csvData = dailySummaries.map(item => [
      item.summary_date,
      item.total_income || 0,
      item.total_expenses || 0,
      item.total_deposits || 0,
      item.total_withdrawals || 0,
      item.total_savings || 0,
      (item.total_income || 0) - (item.total_expenses || 0),
      item.cash_balance || 0,
      item.esewa_balance || 0,
      item.fonepay_balance || 0,
      item.cooperative_balance || 0,
      item.total_balance || 0
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `summary-report-${dateRange.start}-to-${dateRange.end}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const generatePDFReport = () => {
    if (!summaryData) {
      toast.error('No data available for PDF generation');
      return;
    }

    // Create a simple text-based report
    const reportContent = `
FINANCIAL SUMMARY REPORT
Period: ${dateRange.start} to ${dateRange.end}
Generated: ${new Date().toLocaleString()}

TOTALS:
- Total Income: Rs. ${summaryData.totalIncome.toLocaleString()}
- Total Expenses: Rs. ${summaryData.totalExpenses.toLocaleString()}
- Net Profit: Rs. ${summaryData.netProfit.toLocaleString()}
- Total Deposits: Rs. ${summaryData.totalDeposits.toLocaleString()}
- Total Withdrawals: Rs. ${summaryData.totalWithdrawals.toLocaleString()}
- Total Savings: Rs. ${summaryData.totalSavings.toLocaleString()}

CURRENT BALANCES:
- Cash: Rs. ${summaryData.currentBalances.cash.toLocaleString()}
- Esewa: Rs. ${summaryData.currentBalances.esewa.toLocaleString()}
- Fonepay: Rs. ${summaryData.currentBalances.fonepay.toLocaleString()}
- Cooperative: Rs. ${summaryData.currentBalances.cooperative.toLocaleString()}
- Total Balance: Rs. ${summaryData.currentBalances.total.toLocaleString()}
    `.trim();

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `summary-report-${dateRange.start}-to-${dateRange.end}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h2 className="text-2xl font-bold">Summary Report</h2>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex gap-2">
            <div>
              <Label htmlFor="start-date">From</Label>
              <Input
                id="start-date"
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="end-date">To</Label>
              <Input
                id="end-date"
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={exportToCSV} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={generatePDFReport}>
              <FileText className="h-4 w-4 mr-2" />
              Download Report
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : summaryData ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Income</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  Rs. {summaryData.totalIncome.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  Rs. {summaryData.totalExpenses.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                <TrendingUp className={`h-4 w-4 ${summaryData.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${summaryData.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  Rs. {summaryData.netProfit.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Deposits</CardTitle>
                <Calendar className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  Rs. {summaryData.totalDeposits.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Withdrawals</CardTitle>
                <TrendingDown className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  Rs. {summaryData.totalWithdrawals.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Savings</CardTitle>
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  Rs. {summaryData.totalSavings.toLocaleString()}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Current Balances */}
          <Card>
            <CardHeader>
              <CardTitle>Current Balances</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-sm text-gray-600">Cash</div>
                  <div className="text-xl font-bold">Rs. {summaryData.currentBalances.cash.toLocaleString()}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600">Esewa</div>
                  <div className="text-xl font-bold">Rs. {summaryData.currentBalances.esewa.toLocaleString()}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600">Fonepay</div>
                  <div className="text-xl font-bold">Rs. {summaryData.currentBalances.fonepay.toLocaleString()}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600">Cooperative</div>
                  <div className="text-xl font-bold">Rs. {summaryData.currentBalances.cooperative.toLocaleString()}</div>
                </div>
                <div className="text-center border-l pl-4">
                  <div className="text-sm text-gray-600">Total</div>
                  <div className="text-2xl font-bold text-blue-600">
                    Rs. {summaryData.currentBalances.total.toLocaleString()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Period Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Report Period: {dateRange.start} to {dateRange.end}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600">
                This report covers {dailySummaries.length} days of financial data.
                Generated on {new Date().toLocaleString()}.
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
              <p className="text-gray-500">No financial data found for the selected period.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SummaryReportTab;
