import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Switch } from "@/components/ui/switch"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { DateRange } from "react-day-picker"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { Checkbox } from "@/components/ui/checkbox"
import { ListTree } from "@/components/ui/list-tree"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { CardClose, CardDescription } from "@/components/ui/card"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { InputWithButton } from "@/components/ui/input-with-button"
import { MediaPicker } from "@/components/ui/media-picker"
import { MultiSelect } from "@/components/ui/multi-select"
import { NavigationMenu, NavigationMenuItem, NavigationMenuList, NavigationMenuContent, NavigationMenuLink, NavigationMenuTrigger, navigationMenuTriggerStyle } from "@/components/ui/navigation-menu"
import { Pagination } from "@/components/ui/pagination"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { RangeCalendar } from "@/components/ui/range-calendar"
import { ResizablePanel, ResizablePanelGroup, ResizableHandle } from "@/components/ui/resizable"
import { Skeleton } from "@/components/ui/skeleton"
import { Sonner } from 'sonner';
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { Icons } from "@/components/icons"
import { Link } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { toast as useToastReport } from "sonner"
import { useSearchParams, useRouter } from 'next/navigation';
import { AppRole } from "@/utils/roleBasedAccess";

interface Order {
  id: string;
  item_name: string;
  quantity: number;
  rate: number;
  total: number;
  payment_mode: string;
  order_date: string;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  payment_mode: string;
  expense_date: string;
}

interface Deposit {
  id: string;
  amount: number;
  mode: string;
  deposited_by: string;
  deposit_date: string;
}

interface Withdrawal {
  id: string;
  amount: number;
  purpose: string;
  payment_mode: string;
  withdrawal_date: string;
}

interface Saving {
  id: string;
  contribution_amount: number;
  contribution_date: string;
  payment_mode: string;
}

interface ChargingSession {
  id: string;
  total_amount: number;
  payment_mode: string;
  session_date: string;
}

const MobileDashboard = () => {
  const { user, userRole } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [savings, setSavings] = useState<Saving[]>([]);
  const [chargingSessions, setChargingSessions] = useState<ChargingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [dailyClosingOpen, setDailyClosingOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, date]);

  const formatDate = (date: Date | undefined): string => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const formattedDate = formatDate(date);

      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .eq('order_date', formattedDate);

      if (ordersError) throw ordersError;
      setOrders(ordersData || []);

      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .eq('expense_date', formattedDate);

      if (expensesError) throw expensesError;
      setExpenses(expensesData || []);

      const { data: depositsData, error: depositsError } = await supabase
        .from('deposits')
        .select('*')
        .eq('user_id', user.id)
        .eq('deposit_date', formattedDate);

      if (depositsError) throw depositsError;
      setDeposits(depositsData || []);

      const { data: withdrawalsData, error: withdrawalsError } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('user_id', user.id)
        .eq('withdrawal_date', formattedDate);

      if (withdrawalsError) throw withdrawalsError;
      setWithdrawals(withdrawalsData || []);

      const { data: savingsData, error: savingsError } = await supabase
        .from('cooperative_savings')
        .select('*')
        .eq('user_id', user.id)
        .eq('contribution_date', formattedDate);

      if (savingsError) throw savingsError;
      setSavings(savingsData || []);

      const { data: chargingSessionsData, error: chargingSessionsError } = await supabase
        .from('charging_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('session_date', formattedDate);

      if (chargingSessionsError) throw chargingSessionsError;
      setChargingSessions(chargingSessionsData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = (items: any[], field: string): number => {
    return items.reduce((acc, item) => acc + (item[field] || 0), 0);
  };

  const totalOrders = calculateTotal(orders, 'total');
  const totalExpenses = calculateTotal(expenses, 'amount');
  const totalDeposits = calculateTotal(deposits, 'amount');
  const totalWithdrawals = calculateTotal(withdrawals, 'amount');
  const totalSavings = calculateTotal(savings, 'contribution_amount');
  const totalCharging = calculateTotal(chargingSessions, 'total_amount');

  const totalIncome = totalOrders + totalCharging;
  const netBalance = totalIncome + totalDeposits - totalExpenses - totalWithdrawals - totalSavings;

  const handleDateSelect = (newDate: Date | undefined) => {
    setDate(newDate);
  };

  const handleTabNavigation = (tab: string) => {
    setSearchParams({ tab });
    router.push(`/MobileDashboard?tab=${tab}`);
  };

  const currentTab = searchParams.get('tab') || 'summary';

  return (
    <div className="min-h-screen bg-gray-100 py-6">
      <Sonner />
      <div className="container mx-auto px-4">
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">
            Welcome, {user?.email?.split('@')[0] || 'User'}
          </h2>
          <p className="text-gray-600">
            Role: {userRole.charAt(0).toUpperCase() + userRole.slice(1).replace('_', ' ')}
          </p>
        </div>

        <div className="mb-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-[240px] justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <Calendar
                mode="single"
                selected={date}
                onSelect={handleDateSelect}
                disabled={(date) =>
                  date > new Date()
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="bg-white shadow rounded">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Income</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">Rs. {totalIncome.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card className="bg-white shadow rounded">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">Rs. {totalExpenses.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card className="bg-white shadow rounded">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Deposits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">Rs. {totalDeposits.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card className="bg-white shadow rounded">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-800">Rs. {netBalance.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-4">
          <nav className="flex space-x-4" aria-label="Tabs">
            <Button
              variant={currentTab === 'summary' ? 'default' : 'outline'}
              onClick={() => handleTabNavigation('summary')}
            >
              Summary
            </Button>
            <Button
              variant={currentTab === 'orders' ? 'default' : 'outline'}
              onClick={() => handleTabNavigation('orders')}
            >
              Orders
            </Button>
            <Button
              variant={currentTab === 'expenses' ? 'default' : 'outline'}
              onClick={() => handleTabNavigation('expenses')}
            >
              Expenses
            </Button>
            <Button
              variant={currentTab === 'deposits' ? 'default' : 'outline'}
              onClick={() => handleTabNavigation('deposits')}
            >
              Deposits
            </Button>
            <Button
              variant={currentTab === 'withdrawals' ? 'default' : 'outline'}
              onClick={() => handleTabNavigation('withdrawals')}
            >
              Withdrawals
            </Button>
            <Button
              variant={currentTab === 'savings' ? 'default' : 'outline'}
              onClick={() => handleTabNavigation('savings')}
            >
              Savings
            </Button>
            <Button
              variant={currentTab === 'charging' ? 'default' : 'outline'}
              onClick={() => handleTabNavigation('charging')}
            >
              Charging
            </Button>
          </nav>
        </div>

        {loading ? (
          <div className="text-center">Loading data...</div>
        ) : (
          <div>
            {currentTab === 'summary' && (
              <Card className="bg-white shadow rounded">
                <CardHeader>
                  <CardTitle className="text-lg font-medium">Daily Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Total Orders: Rs. {totalOrders.toFixed(2)}</p>
                  <p>Total Expenses: Rs. {totalExpenses.toFixed(2)}</p>
                  <p>Total Deposits: Rs. {totalDeposits.toFixed(2)}</p>
                  <p>Total Withdrawals: Rs. {totalWithdrawals.toFixed(2)}</p>
                  <p>Total Savings: Rs. {totalSavings.toFixed(2)}</p>
                  <p>Total Charging: Rs. {totalCharging.toFixed(2)}</p>
                  <p className="font-bold">Net Balance: Rs. {netBalance.toFixed(2)}</p>
                </CardContent>
              </Card>
            )}

            {currentTab === 'orders' && (
              <Card className="bg-white shadow rounded">
                <CardHeader>
                  <CardTitle className="text-lg font-medium">Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  {orders.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell>{order.item_name}</TableCell>
                            <TableCell>{order.quantity}</TableCell>
                            <TableCell>Rs. {order.total.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div>No orders for this date.</div>
                  )}
                </CardContent>
              </Card>
            )}

            {currentTab === 'expenses' && (
              <Card className="bg-white shadow rounded">
                <CardHeader>
                  <CardTitle className="text-lg font-medium">Expenses</CardTitle>
                </CardHeader>
                <CardContent>
                  {expenses.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Description</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Category</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenses.map((expense) => (
                          <TableRow key={expense.id}>
                            <TableCell>{expense.description}</TableCell>
                            <TableCell>Rs. {expense.amount.toFixed(2)}</TableCell>
                            <TableCell>{expense.category}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div>No expenses for this date.</div>
                  )}
                </CardContent>
              </Card>
            )}

            {currentTab === 'deposits' && (
              <Card className="bg-white shadow rounded">
                <CardHeader>
                  <CardTitle className="text-lg font-medium">Deposits</CardTitle>
                </CardHeader>
                <CardContent>
                  {deposits.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Deposited By</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Mode</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {deposits.map((deposit) => (
                          <TableRow key={deposit.id}>
                            <TableCell>{deposit.deposited_by}</TableCell>
                            <TableCell>Rs. {deposit.amount.toFixed(2)}</TableCell>
                            <TableCell>{deposit.mode}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div>No deposits for this date.</div>
                  )}
                </CardContent>
              </Card>
            )}

            {currentTab === 'withdrawals' && (
              <Card className="bg-white shadow rounded">
                <CardHeader>
                  <CardTitle className="text-lg font-medium">Withdrawals</CardTitle>
                </CardHeader>
                <CardContent>
                  {withdrawals.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Purpose</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Payment Mode</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {withdrawals.map((withdrawal) => (
                          <TableRow key={withdrawal.id}>
                            <TableCell>{withdrawal.purpose}</TableCell>
                            <TableCell>Rs. {withdrawal.amount.toFixed(2)}</TableCell>
                            <TableCell>{withdrawal.payment_mode}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div>No withdrawals for this date.</div>
                  )}
                </CardContent>
              </Card>
            )}

            {currentTab === 'savings' && (
              <Card className="bg-white shadow rounded">
                <CardHeader>
                  <CardTitle className="text-lg font-medium">Savings</CardTitle>
                </CardHeader>
                <CardContent>
                  {savings.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Amount</TableHead>
                          <TableHead>Payment Mode</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {savings.map((saving) => (
                          <TableRow key={saving.id}>
                            <TableCell>Rs. {saving.contribution_amount.toFixed(2)}</TableCell>
                            <TableCell>{saving.payment_mode}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div>No savings for this date.</div>
                  )}
                </CardContent>
              </Card>
            )}

            {currentTab === 'charging' && (
              <Card className="bg-white shadow rounded">
                <CardHeader>
                  <CardTitle className="text-lg font-medium">Charging Sessions</CardTitle>
                </CardHeader>
                <CardContent>
                  {chargingSessions.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Amount</TableHead>
                          <TableHead>Payment Mode</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {chargingSessions.map((session) => (
                          <TableRow key={session.id}>
                            <TableCell>Rs. {session.total_amount.toFixed(2)}</TableCell>
                            <TableCell>{session.payment_mode}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div>No charging sessions for this date.</div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      <AllTimeSummaryModal
        isOpen={summaryModalOpen}
        onClose={() => setSummaryModalOpen(false)}
        summaryData={null}
        onDateRangeChange={() => {}}
      />
      <DailyClosingSystem
        isOpen={dailyClosingOpen}
        onClose={() => setDailyClosingOpen(false)}
      />
    </div>
  );
};

export default MobileDashboard;
