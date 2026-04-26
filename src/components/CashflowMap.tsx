import { ArrowRight } from "lucide-react";
import { formatCurrency } from "@/utils/unifiedCalculations";

interface FlowProps {
  data?: Record<string, number> | null;
}

interface Flow {
  from: string;
  to: string;
  amount: number;
}

const fmt = (n: number) => formatCurrency(Number(n) || 0);

/**
 * Lightweight cashflow visualization. Renders flows as horizontal
 * bars between accounts, scaled to the largest flow.
 * Avoids heavy d3-sankey dependency.
 */
export const CashflowMap = ({ data }: FlowProps) => {
  if (!data) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        Loading cashflow data…
      </p>
    );
  }

  const flows: Flow[] = [
    { from: "Orders", to: "Cash", amount: Number(data.income_to_cash || 0) * (Number(data.orders_total || 0) / Math.max(1, Number(data.orders_total || 0) + Number(data.charging_total || 0))) },
    { from: "Charging", to: "Cash", amount: Number(data.income_to_cash || 0) * (Number(data.charging_total || 0) / Math.max(1, Number(data.orders_total || 0) + Number(data.charging_total || 0))) },
    { from: "Income", to: "eSewa", amount: Number(data.income_to_esewa || 0) },
    { from: "Income", to: "Fonepay", amount: Number(data.income_to_fonepay || 0) },
    { from: "Cash", to: "Expenses", amount: Number(data.expense_from_cash || 0) },
    { from: "eSewa", to: "Expenses", amount: Number(data.expense_from_esewa || 0) },
    { from: "Fonepay", to: "Expenses", amount: Number(data.expense_from_fonepay || 0) },
    { from: "Cash", to: "Cooperative", amount: Number(data.savings_from_cash || 0) },
    { from: "eSewa", to: "Cooperative", amount: Number(data.savings_from_esewa || 0) },
    { from: "Fonepay", to: "Cooperative", amount: Number(data.savings_from_fonepay || 0) },
    { from: "Cash", to: "eSewa (Deposit)", amount: Number(data.deposit_to_esewa || 0) },
    { from: "Cooperative", to: "Wallets", amount: Number(data.withdraw_from_cooperative || 0) },
    { from: "Bank", to: "Wallets", amount: Number(data.withdraw_from_bank || 0) },
  ].filter((f) => f.amount > 0);

  if (flows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No flows in this period.
      </p>
    );
  }

  const max = Math.max(...flows.map((f) => f.amount));

  return (
    <div className="space-y-2">
      {flows
        .sort((a, b) => b.amount - a.amount)
        .map((f, i) => {
          const width = (f.amount / max) * 100;
          return (
            <div key={i} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-foreground">
                  <span className="font-medium">{f.from}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className="font-medium">{f.to}</span>
                </div>
                <span className="font-medium tabular-nums">{fmt(f.amount)}</span>
              </div>
              <div className="h-2 bg-muted rounded-sm overflow-hidden">
                <div
                  className="h-full bg-foreground rounded-sm"
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          );
        })}
    </div>
  );
};
