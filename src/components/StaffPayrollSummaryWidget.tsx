import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, Banknote, Clock, ShieldCheck, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const StaffPayrollSummaryWidget = () => {
  const [stats, setStats] = useState({
    totalAdvances: 0,
    outstandingAdvances: 0,
    pendingApprovals: 0,
    payrollExpense: 0,
    ssfLiability: 0,
    taxLiability: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // 1. Advances Stats
      const { data: advances } = await supabase
        .from("staff_advances")
        .select("amount, status");

      let total = 0;
      let outstanding = 0;
      let pending = 0;

      advances?.forEach(a => {
        if (a.status === 'Disbursed' || a.status === 'Partially Settled') {
          outstanding += a.amount;
        }
        if (a.status === 'Submitted') {
          pending++;
        }
        if (['Disbursed', 'Partially Settled', 'Fully Settled'].includes(a.status)) {
          total += a.amount;
        }
      });

      // 2. Payroll Stats (Recent month)
      const { data: payroll } = await supabase
        .from("payroll_records")
        .select("gross_salary, employee_ssf, employer_ssf, tax_deduction, net_salary")
        .eq("status", "Approved");

      let payrollExp = 0;
      let ssf = 0;
      let tax = 0;

      payroll?.forEach(p => {
        payrollExp += p.gross_salary + p.employer_ssf;
        ssf += p.employee_ssf + p.employer_ssf;
        tax += p.tax_deduction;
      });

      setStats({
        totalAdvances: total,
        outstandingAdvances: outstanding,
        pendingApprovals: pending,
        payrollExpense: payrollExp,
        ssfLiability: ssf,
        taxLiability: tax,
      });
    } catch (error) {
      console.error("Error fetching staff payroll stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Skeleton className="h-48 w-full rounded-3xl" />;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden">
        <CardContent className="p-5 flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase">Outstanding Advances</p>
            <p className="text-xl font-black text-slate-800">रु {stats.outstandingAdvances.toLocaleString()}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden">
        <CardContent className="p-5 flex items-center gap-4">
          <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase">Pending Approvals</p>
            <p className="text-xl font-black text-slate-800">{stats.pendingApprovals} Requests</p>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden">
        <CardContent className="p-5 flex items-center gap-4">
          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl">
            <Banknote className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase">Payroll Expense (MTD)</p>
            <p className="text-xl font-black text-slate-800">रु {stats.payrollExpense.toLocaleString()}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden">
        <CardContent className="p-5 flex items-center gap-4">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase">Compliance (SSF/Tax)</p>
            <p className="text-xl font-black text-slate-800">रु {(stats.ssfLiability + stats.taxLiability).toLocaleString()}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffPayrollSummaryWidget;
