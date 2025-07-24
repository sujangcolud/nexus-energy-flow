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
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { extractErrorMessage, logError } from "@/utils/errorHandling";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import DailyClosingSystem from "./DailyClosingSystem";

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

  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      onDateRangeChange(dateRange);
    }
  }, [dateRange, onDateRangeChange]);

  const formatCurrency = (amount: number) => `NRs. ${amount.toFixed(2)}`;

  if (!summaryData) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              All-Time Summary
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-2">Loading summary data...</span>
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
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            All-Time Summary
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Calendar className="h-5 w-5 text-blue-600" />
            <DateRangePicker
              onUpdate={(range) => {
                if (range?.from && range?.to) {
                  setDateRange({ from: range.from, to: range.to });
                }
              }}
            />
            <Badge
              variant="outline"
              className="text-purple-600 border-purple-300"
            >
              {dataPoints} days of data
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-600 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Total Income
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-800">
                  {formatCurrency(totalIncome)}
                </div>
                <div className="mt-2 space-y-1">
                  <div className="text-xs text-green-600">
                    Orders: {formatCurrency(incomeBreakdown.fromOrders)}
                  </div>
                  <div className="text-xs text-green-600">
                    Charging: {formatCurrency(incomeBreakdown.fromCharging)}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-red-600 flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" />
                  Total Expenses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-800">
                  {formatCurrency(totalExpenses)}
                </div>
                <div className="mt-2">
                  <Badge
                    variant={netProfit >= 0 ? "default" : "destructive"}
                    className="text-xs"
                  >
                    Net Profit: {formatCurrency(netProfit)}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-purple-600 flex items-center gap-2">
                  <PiggyBank className="h-4 w-4" />
                  Cooperative Savings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-800">
                  {formatCurrency(cooperativeSavings)}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-600 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Total Deposits
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-800">
                  {formatCurrency(totalDeposits)}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-orange-600 flex items-center gap-2">
                  <Banknote className="h-4 w-4" />
                  Total Withdrawals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-800">
                  {formatCurrency(totalWithdrawals)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-gradient-to-br from-gray-50 to-slate-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-700">
                <DollarSign className="h-5 w-5" />
                Current Balances
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-sm text-gray-600">Cash</div>
                  <div className="text-lg font-semibold text-green-600">
                    {formatCurrency(currentBalances.cash)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600">eSewa</div>
                  <div className="text-lg font-semibold text-blue-600">
                    {formatCurrency(currentBalances.esewa)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600">Fonepay</div>
                  <div className="text-lg font-semibold text-purple-600">
                    {formatCurrency(currentBalances.fonepay)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600">Total Balance</div>
                  <div className="text-lg font-semibold text-gray-800">
                    {formatCurrency(currentBalances.total)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-700">
                <BarChart3 className="h-5 w-5" />
                Payment Method Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Banknote className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-gray-700">
                      Cash
                    </span>
                  </div>
                  <div className="text-lg font-semibold text-green-600">
                    {formatCurrency(paymentMethodBreakdown.cash)}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">
                      eSewa
                    </span>
                  </div>
                  <div className="text-lg font-semibold text-blue-600">
                    {formatCurrency(paymentMethodBreakdown.esewa)}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium text-gray-700">
                      Fonepay
                    </span>
                  </div>
                  <div className="text-lg font-semibold text-purple-600">
                    {formatCurrency(paymentMethodBreakdown.fonepay)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Daily Reports List */}
        <DailyReportsList />

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Daily Reports List Component
const DailyReportsList: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [dailyReports, setDailyReports] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isDailyModalOpen, setIsDailyModalOpen] = useState(false);

  useEffect(() => {
    fetchDailyReports();
  }, []);

  const fetchDailyReports = async () => {
    if (!user) return;

    setLoading(true);
    try {
      console.log("📅 Fetching daily reports list...");

      // Fetch all daily summaries ordered by date
      const { data: dailySummaries, error } = await supabase
        .from("daily_summary")
        .select("*")
        .order("summary_date", { ascending: false })
        .limit(30); // Show last 30 days

      if (error) {
        throw error;
      }

      setDailyReports(dailySummaries || []);
    } catch (error) {
      logError("fetching daily reports list", error);
      toast.error(`Error loading daily reports: ${extractErrorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDailyViewClick = (date: string) => {
    setSelectedDate(date);
    setIsDailyModalOpen(true);
  };

  const formatCurrency = (amount: number) => `NRs. ${amount.toFixed(2)}`;

  return (
    <>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Daily Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              Loading daily reports...
            </div>
          ) : dailyReports.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              No daily reports found
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              <div className="grid grid-cols-12 gap-2 text-sm font-medium text-gray-600 border-b pb-2">
                <div className="col-span-2">Date</div>
                <div className="col-span-2 text-right">Income</div>
                <div className="col-span-2 text-right">Expenses</div>
                <div className="col-span-2 text-right">Net Profit</div>
                <div className="col-span-2 text-right">Total Balance</div>
                <div className="col-span-2 text-center">Action</div>
              </div>
              {dailyReports.map((report) => {
                const totalIncome = (Number(report.total_income_from_orders) || 0) + (Number(report.total_income_from_charging) || 0);
                const totalExpenses = Number(report.total_expenses) || 0;
                const netProfit = totalIncome - totalExpenses;
                const totalBalance = Number(report.total_balance) || 0;

                return (
                  <div
                    key={report.id}
                    className="grid grid-cols-12 gap-2 py-3 text-sm border-b border-gray-100 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div className="col-span-2 font-medium">
                      {format(new Date(report.summary_date), "MMM dd, yyyy")}
                    </div>
                    <div className="col-span-2 text-right text-green-600 font-medium">
                      {formatCurrency(totalIncome)}
                    </div>
                    <div className="col-span-2 text-right text-red-600 font-medium">
                      {formatCurrency(totalExpenses)}
                    </div>
                    <div className={`col-span-2 text-right font-medium ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(netProfit)}
                    </div>
                    <div className="col-span-2 text-right text-blue-600 font-medium">
                      {formatCurrency(totalBalance)}
                    </div>
                    <div className="col-span-2 text-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDailyViewClick(report.summary_date)}
                        className="text-xs px-2 py-1"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View Details
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily Closing Modal */}
      {selectedDate && (
        <DailyClosingSystem
          isOpen={isDailyModalOpen}
          onClose={() => {
            setIsDailyModalOpen(false);
            setSelectedDate(null);
          }}
        />
      )}
    </>
  );
};

export default AllTimeSummaryModal;
