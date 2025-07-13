import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Pie, PieChart, Cell, Line, LineChart } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Activity } from "lucide-react";

interface MonthlyFinancialSummary {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

interface IncomeBreakdown {
  source: string;
  amount: number;
}

interface ExpenseCategorization {
  category: string;
  amount: number;
}

interface MonthlyDepositsWithdrawals {
  month: string;
  deposits: number;
  withdrawals: number;
}

interface NewUserGrowth {
  month: string;
  new_users: number;
}

interface UserRoleDistribution {
  role: string;
  user_count: number;
}

interface TopSpender {
  email: string;
  total_spent: number;
}

interface PopularProduct {
  item_name: string;
  purchase_count: number;
}

interface SalesByPaymentMode {
  payment_mode: string;
  total_sales: number;
}

interface CooperativeSavingsTrend {
  month: string;
  total_savings: number;
}

interface MenuItemAvailability {
  status: string;
  item_count: number;
}

const SuperAdminDashboard = () => {
  const [monthlyFinancialSummary, setMonthlyFinancialSummary] = useState<MonthlyFinancialSummary[]>([]);
  const [incomeBreakdown, setIncomeBreakdown] = useState<IncomeBreakdown[]>([]);
  const [expenseCategorization, setExpenseCategorization] = useState<ExpenseCategorization[]>([]);
  const [monthlyDepositsWithdrawals, setMonthlyDepositsWithdrawals] = useState<MonthlyDepositsWithdrawals[]>([]);
  const [newUserGrowth, setNewUserGrowth] = useState<NewUserGrowth[]>([]);
  const [userRoleDistribution, setUserRoleDistribution] = useState<UserRoleDistribution[]>([]);
  const [topSpenders, setTopSpenders] = useState<TopSpender[]>([]);
  const [popularProducts, setPopularProducts] = useState<PopularProduct[]>([]);
  const [salesByPaymentMode, setSalesByPaymentMode] = useState<SalesByPaymentMode[]>([]);
  const [cooperativeSavingsTrend, setCooperativeSavingsTrend] = useState<CooperativeSavingsTrend[]>([]);
  const [menuItemAvailability, setMenuItemAvailability] = useState<MenuItemAvailability[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          financialSummaryResult,
          incomeBreakdownResult,
          expenseCategorizationResult,
          depositsWithdrawalsResult,
          newUserGrowthResult,
          userRoleDistributionResult,
          topSpendersResult,
          popularProductsResult,
          salesByPaymentModeResult,
          cooperativeSavingsTrendResult,
          menuItemAvailabilityResult,
        ] = await Promise.all([
          supabase.rpc('get_monthly_financial_summary'),
          supabase.rpc('get_income_breakdown'),
          supabase.rpc('get_expense_categorization'),
          supabase.rpc('get_monthly_deposits_withdrawals'),
          supabase.rpc('get_new_user_growth'),
          supabase.rpc('get_user_role_distribution'),
          supabase.rpc('get_top_spenders'),
          supabase.rpc('get_popular_products'),
          supabase.rpc('get_sales_by_payment_mode'),
          supabase.rpc('get_cooperative_savings_trend'),
          supabase.rpc('get_menu_item_availability'),
        ]);

        if (financialSummaryResult.error) throw financialSummaryResult.error;
        if (incomeBreakdownResult.error) throw incomeBreakdownResult.error;
        if (expenseCategorizationResult.error) throw expenseCategorizationResult.error;
        if (depositsWithdrawalsResult.error) throw depositsWithdrawalsResult.error;
        if (newUserGrowthResult.error) throw newUserGrowthResult.error;
        if (userRoleDistributionResult.error) throw userRoleDistributionResult.error;
        if (topSpendersResult.error) throw topSpendersResult.error;
        if (popularProductsResult.error) throw popularProductsResult.error;
        if (salesByPaymentModeResult.error) throw salesByPaymentModeResult.error;
        if (cooperativeSavingsTrendResult.error) throw cooperativeSavingsTrendResult.error;
        if (menuItemAvailabilityResult.error) throw menuItemAvailabilityResult.error;

        setMonthlyFinancialSummary(financialSummaryResult.data);
        setIncomeBreakdown(incomeBreakdownResult.data);
        setExpenseCategorization(expenseCategorizationResult.data);
        setMonthlyDepositsWithdrawals(depositsWithdrawalsResult.data);
        setNewUserGrowth(newUserGrowthResult.data);
        setUserRoleDistribution(userRoleDistributionResult.data);
        setTopSpenders(topSpendersResult.data);
        setPopularProducts(popularProductsResult.data);
        setSalesByPaymentMode(salesByPaymentModeResult.data);
        setCooperativeSavingsTrend(cooperativeSavingsTrendResult.data);
        setMenuItemAvailability(menuItemAvailabilityResult.data);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Activity className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">Super Admin Dashboard</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue vs. Expenses (Last 12 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer className="h-64" config={{}}>
              <BarChart data={monthlyFinancialSummary}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend />
                <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
                <Bar dataKey="expenses" fill="var(--color-expenses)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profitability Trend (Last 12 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer className="h-64" config={{}}>
              <LineChart data={monthlyFinancialSummary}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend />
                <Line type="monotone" dataKey="profit" stroke="var(--color-profit)" />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Income Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer className="h-64" config={{}}>
              <PieChart>
                <Pie data={incomeBreakdown} dataKey="amount" nameKey="source" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label>
                  {incomeBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expense Categorization</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer className="h-64" config={{}}>
              <PieChart>
                <Pie data={expenseCategorization} dataKey="amount" nameKey="category" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label>
                  {expenseCategorization.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Deposits vs. Withdrawals (Last 12 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer className="h-64" config={{}}>
              <LineChart data={monthlyDepositsWithdrawals}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend />
                <Line type="monotone" dataKey="deposits" stroke="var(--color-deposits)" />
                <Line type="monotone" dataKey="withdrawals" stroke="var(--color-withdrawals)" />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>New User Growth (Last 12 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer className="h-64" config={{}}>
              <BarChart data={newUserGrowth}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="new_users" fill="var(--color-new-users)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Role Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer className="h-64" config={{}}>
              <PieChart>
                <Pie data={userRoleDistribution} dataKey="user_count" nameKey="role" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label>
                  {userRoleDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top 5 Spenders</CardTitle>
          </CardHeader>
          <CardContent>
            <ul>
              {topSpenders.map((spender, index) => (
                <li key={index} className="flex justify-between py-1">
                  <span>{spender.email}</span>
                  <span>{spender.total_spent}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Popular Products/Services</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer className="h-64" config={{}}>
              <BarChart data={popularProducts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="item_name" type="category" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="purchase_count" fill="var(--color-popular-products)" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sales by Payment Mode</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer className="h-64" config={{}}>
              <PieChart>
                <Pie data={salesByPaymentMode} dataKey="total_sales" nameKey="payment_mode" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label>
                  {salesByPaymentMode.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cooperative Savings Trend (Last 12 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer className="h-64" config={{}}>
              <LineChart data={cooperativeSavingsTrend}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="total_savings" stroke="var(--color-savings)" />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Menu Item Availability</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer className="h-64" config={{}}>
              <PieChart>
                <Pie data={menuItemAvailability} dataKey="item_count" nameKey="status" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label>
                  {menuItemAvailability.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;