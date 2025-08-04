
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Database,
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  ShoppingCart,
  Zap,
  Receipt,
  PiggyBank,
  Banknote,
  ArrowUpDown,
  BarChart3,
  Clock,
  AlertCircle,
  Download,
  X,
  RefreshCw,
  CheckCircle,
  Eye,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { extractErrorMessage, logError } from "@/utils/errorHandling";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";

interface AllTimeSummaryData {
  totalIncome: number;
  totalExpenses: number;
  totalDeposits: number;
  totalWithdrawals: number;
  cooperativeSavings: number;
  netProfit: number;
  currentBalances: {
    cash: number;
    esewa: number;
    fonepay: number;
    total: number;
  };
  incomeBreakdown: {
    fromOrders: number;
    fromCharging: number;
  };
  paymentMethodBreakdown: {
    cash: number;
    esewa: number;
    fonepay: number;
  };
  withdrawalBreakdown: {
    fromBank: number;
    fromSavings: number;
    fromEsewa: number;
    fromFonepay: number;
    total: number;
  };
  dataPoints: number;
  dateRange: {
    from: string;
    to: string;
  };
}

interface AllTimeSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  summaryData: AllTimeSummaryData | null;
  onDateRangeChange: (dateRange: DateRange) => void;
}

const AllTimeSummaryModal: React.FC<AllTimeSummaryModalProps> = ({
  isOpen,
  onClose,
  summaryData,
  onDateRangeChange,
}) => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedTab, setSelectedTab] = useState("summary");

  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      onDateRangeChange(dateRange);
    }
  }, [dateRange, onDateRangeChange]);

  const handleShowAllTime = () => {
    setDateRange(undefined);
    onDateRangeChange({} as DateRange);
  };

  const formatCurrency = (amount: number) => `NRs. ${Math.abs(amount).toFixed(2)}`;

  if (!summaryData) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-6 w-6 text-purple-600" />
              All-Time Financial Summary
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            <span className="ml-2">Loading all-time summary data...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const {
    totalIncome,
    totalExpenses,
    netProfit,
    totalDeposits,
    totalWithdrawals,
    cooperativeSavings,
    incomeBreakdown,
    paymentMethodBreakdown,
    currentBalances,
    dataPoints,
  } = summaryData;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-6 w-6 text-purple-600" />
            All-Time Financial Summary
            <Badge className="bg-purple-100 text-purple-800">
              <CheckCircle className="h-3 w-3 mr-1" />
              Complete
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Date Range Selector */}
          <div className="flex items-center gap-4 flex-wrap p-4 bg-purple-50 rounded-lg">
            <Calendar className="h-5 w-5 text-purple-600" />
            <DateRangePicker
              onUpdate={(range) => {
                if (range?.from && range?.to) {
                  setDateRange({ from: range.from, to: range.to });
                }
              }}
            />
            <Button
              onClick={handleShowAllTime}
              variant="outline"
              className="border-purple-300 text-purple-600 hover:bg-purple-50"
            >
              Show All Time
            </Button>
            <Badge
              variant="outline"
              className="text-purple-600 border-purple-300"
            >
              {dataPoints} days of data
            </Badge>
          </div>

          {/* Summary Cards - Same format as Daily Closing */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Total Income</p>
                    <p className="text-lg font-bold text-green-600">
                      {formatCurrency(totalIncome)}
                    </p>
                    <p className="text-xs text-gray-500">
                      All time revenue
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-sm text-gray-600">Total Expenses</p>
                    <p className="text-lg font-bold text-red-600">
                      {formatCurrency(totalExpenses)}
                    </p>
                    <p className="text-xs text-gray-500">
                      All time expenses
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Net Profit</p>
                    <p className={`text-lg font-bold ${netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatCurrency(netProfit)}
                    </p>
                    <p className="text-xs text-gray-500">
                      Total profit/loss
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-sm text-gray-600">Total Balance</p>
                    <p className="text-lg font-bold text-purple-600">
                      {formatCurrency(currentBalances.total)}
                    </p>
                    <p className="text-xs text-gray-500">
                      Current balances
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Tabs - Same format as Daily Closing */}
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="income">Income</TabsTrigger>
              <TabsTrigger value="expenses">Expenses</TabsTrigger>
              <TabsTrigger value="balances">Balances</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    All-Time Summary Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">Percentage</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="flex items-center gap-2">
                            <ShoppingCart className="h-4 w-4 text-blue-600" />
                            Orders Income
                          </TableCell>
                          <TableCell className="text-right font-medium text-green-600">
                            {formatCurrency(incomeBreakdown.fromOrders)}
                          </TableCell>
                          <TableCell className="text-right">
                            {totalIncome > 0 ? ((incomeBreakdown.fromOrders / totalIncome) * 100).toFixed(1) : 0}%
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-yellow-600" />
                            Charging Income
                          </TableCell>
                          <TableCell className="text-right font-medium text-green-600">
                            {formatCurrency(incomeBreakdown.fromCharging)}
                          </TableCell>
                          <TableCell className="text-right">
                            {totalIncome > 0 ? ((incomeBreakdown.fromCharging / totalIncome) * 100).toFixed(1) : 0}%
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="flex items-center gap-2">
                            <Receipt className="h-4 w-4 text-red-600" />
                            Total Expenses
                          </TableCell>
                          <TableCell className="text-right font-medium text-red-600">
                            -{formatCurrency(totalExpenses)}
                          </TableCell>
                          <TableCell className="text-right">
                            {totalIncome > 0 ? ((totalExpenses / totalIncome) * 100).toFixed(1) : 0}%
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="flex items-center gap-2">
                            <ArrowUpDown className="h-4 w-4 text-blue-600" />
                            Total Deposits
                          </TableCell>
                          <TableCell className="text-right font-medium text-blue-600">
                            {formatCurrency(totalDeposits)}
                          </TableCell>
                          <TableCell className="text-right">-</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="flex items-center gap-2">
                            <ArrowUpDown className="h-4 w-4 text-orange-600" />
                            Total Withdrawals
                          </TableCell>
                          <TableCell className="text-right font-medium text-orange-600">
                            -{formatCurrency(totalWithdrawals)}
                          </TableCell>
                          <TableCell className="text-right">-</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="flex items-center gap-2">
                            <PiggyBank className="h-4 w-4 text-purple-600" />
                            Cooperative Savings
                          </TableCell>
                          <TableCell className="text-right font-medium text-purple-600">
                            {formatCurrency(cooperativeSavings)}
                          </TableCell>
                          <TableCell className="text-right">-</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="income" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Income Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-lg font-semibold mb-4">By Source</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                          <span className="flex items-center gap-2">
                            <ShoppingCart className="h-4 w-4" />
                            Orders
                          </span>
                          <span className="font-semibold text-green-600">
                            {formatCurrency(incomeBreakdown.fromOrders)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-yellow-50 rounded">
                          <span className="flex items-center gap-2">
                            <Zap className="h-4 w-4" />
                            Charging
                          </span>
                          <span className="font-semibold text-green-600">
                            {formatCurrency(incomeBreakdown.fromCharging)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-lg font-semibold mb-4">By Payment Mode</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                          <span className="flex items-center gap-2">
                            <Banknote className="h-4 w-4" />
                            Cash
                          </span>
                          <span className="font-semibold text-green-600">
                            {formatCurrency(paymentMethodBreakdown.cash)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                          <span className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            eSewa
                          </span>
                          <span className="font-semibold text-blue-600">
                            {formatCurrency(paymentMethodBreakdown.esewa)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-purple-50 rounded">
                          <span className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            Fonepay
                          </span>
                          <span className="font-semibold text-purple-600">
                            {formatCurrency(paymentMethodBreakdown.fonepay)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="expenses" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5" />
                    Expenses & Outflows
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-lg font-semibold mb-4">Total Expenses</h4>
                      <div className="flex justify-between items-center p-4 bg-red-50 rounded">
                        <span className="flex items-center gap-2">
                          <Receipt className="h-5 w-5" />
                          All Expenses
                        </span>
                        <span className="font-bold text-red-600 text-lg">
                          {formatCurrency(totalExpenses)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">
                        Total business expenses
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="text-lg font-semibold mb-4">Other Outflows</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-orange-50 rounded">
                          <span className="flex items-center gap-2">
                            <ArrowUpDown className="h-4 w-4" />
                            Withdrawals
                          </span>
                          <span className="font-semibold text-orange-600">
                            {formatCurrency(totalWithdrawals)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-purple-50 rounded">
                          <span className="flex items-center gap-2">
                            <PiggyBank className="h-4 w-4" />
                            Savings
                          </span>
                          <span className="font-semibold text-purple-600">
                            {formatCurrency(cooperativeSavings)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="balances" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Current Account Balances
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-4 bg-green-50 rounded">
                        <span className="flex items-center gap-2">
                          <Banknote className="h-5 w-5" />
                          Cash Balance
                        </span>
                        <span className="font-bold text-green-600 text-lg">
                          {formatCurrency(currentBalances.cash)}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center p-4 bg-blue-50 rounded">
                        <span className="flex items-center gap-2">
                          <CreditCard className="h-5 w-5" />
                          eSewa Balance
                        </span>
                        <span className="font-bold text-blue-600 text-lg">
                          {formatCurrency(currentBalances.esewa)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-4 bg-purple-50 rounded">
                        <span className="flex items-center gap-2">
                          <CreditCard className="h-5 w-5" />
                          Fonepay Balance
                        </span>
                        <span className="font-bold text-purple-600 text-lg">
                          {formatCurrency(currentBalances.fonepay)}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center p-4 bg-orange-50 rounded">
                        <span className="flex items-center gap-2">
                          <PiggyBank className="h-5 w-5" />
                          Cooperative Savings
                        </span>
                        <span className="font-bold text-orange-600 text-lg">
                          {formatCurrency(cooperativeSavings)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 p-4 bg-gray-100 rounded">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">Total Balance</span>
                      <span className="text-2xl font-bold text-gray-800">
                        {formatCurrency(currentBalances.total)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AllTimeSummaryModal;
