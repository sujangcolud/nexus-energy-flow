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

interface WeeklyCooperativeSavings {
  week: string;
  total_savings: number;
}

interface DailyChargingSessions {
  date: string;
  sessions: number;
}

const SuperAdminDashboard = () => {
  const [monthlyFinancialSummary, setMonthlyFinancialSummary] = useState<MonthlyFinancialSummary[]>([]);
  const [weeklyCooperativeSavings, setWeeklyCooperativeSavings] = useState<WeeklyCooperativeSavings[]>([]);
  const [dailyChargingSessions, setDailyChargingSessions] = useState<DailyChargingSessions[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          financialSummaryResult,
          cooperativeSavingsResult,
          chargingSessionsResult,
        ] = await Promise.all([
          supabase.rpc('get_monthly_financial_summary_last_3_months'),
          supabase.rpc('get_weekly_cooperative_savings_last_10_weeks'),
          supabase.rpc('get_daily_charging_sessions'),
        ]);

        if (financialSummaryResult.error) throw financialSummaryResult.error;
        if (cooperativeSavingsResult.error) throw cooperativeSavingsResult.error;
        if (chargingSessionsResult.error) throw chargingSessionsResult.error;

        setMonthlyFinancialSummary(financialSummaryResult.data);
        setWeeklyCooperativeSavings(cooperativeSavingsResult.data);
        setDailyChargingSessions(chargingSessionsResult.data);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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
            <CardTitle>Revenue vs. Expenses (Last 3 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer className="h-64" config={{
              revenue: { label: "Revenue", color: "hsl(var(--chart-1))" },
              expenses: { label: "Expenses", color: "hsl(var(--chart-2))" }
            }}>
              <BarChart data={monthlyFinancialSummary}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
                <Bar dataKey="expenses" fill="var(--color-expenses)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profitability Trend (Last 3 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer className="h-64" config={{
              profit: { label: "Profit", color: "hsl(var(--chart-3))" }
            }}>
              <LineChart data={monthlyFinancialSummary}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line type="monotone" dataKey="profit" stroke="var(--color-profit)" />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Cooperative Savings Trend (Last 10 Weeks)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer className="h-64" config={{}}>
              <LineChart data={weeklyCooperativeSavings}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="week" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend />
                <Line type="monotone" dataKey="total_savings" stroke="var(--color-savings)" />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Daily Charging Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer className="h-64" config={{}}>
              <LineChart data={dailyChargingSessions}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend />
                <Line type="monotone" dataKey="sessions" stroke="var(--color-sessions)" />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;