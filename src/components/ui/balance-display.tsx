import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/calculations";
import { DollarSign, Wallet, PiggyBank, CreditCard } from "lucide-react";

interface BalanceDisplayProps {
  cashBalance: number;
  bankBalance: number;
  cooperativeBalance: number;
  esewaBalance?: number;
  totalBalance: number;
  size?: "sm" | "md" | "lg";
  showDetails?: boolean;
}

export const BalanceDisplay: React.FC<BalanceDisplayProps> = ({
  cashBalance,
  bankBalance,
  cooperativeBalance,
  esewaBalance = 0,
  totalBalance,
  size = "md",
  showDetails = true,
}) => {
  // Validate balance calculations
  const isValidBalance = totalBalance === (cashBalance + bankBalance + cooperativeBalance + esewaBalance);
  
  if (!isValidBalance) {
    console.warn('⚠️ Balance Display: Total balance does not match sum of individual balances', {
      calculated: cashBalance + bankBalance + cooperativeBalance + esewaBalance,
      provided: totalBalance
    });
  }
  const cardClass = size === "sm" ? "p-3" : size === "lg" ? "p-6" : "p-4";
  const titleSize =
    size === "sm" ? "text-sm" : size === "lg" ? "text-lg" : "text-base";
  const valueSize =
    size === "sm" ? "text-lg" : size === "lg" ? "text-2xl" : "text-xl";

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
      <CardHeader className={cardClass}>
        <CardTitle className={`flex items-center gap-2 ${titleSize}`}>
          <DollarSign className="h-5 w-5 text-primary" />
          Current Balances
        </CardTitle>
      </CardHeader>
      <CardContent className={cardClass}>
        <div className="space-y-3">
          {/* Total Balance */}
          <div className="bg-white rounded-lg p-3 border border-primary/10">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">
                Total Balance
              </span>
              <span className={`font-bold text-primary ${valueSize}`}>
                {formatCurrency(totalBalance)}
              </span>
            </div>
          </div>

          {showDetails && (
            <div className="grid grid-cols-2 gap-2">
              {/* Cash Balance */}
              <div className="bg-secondary/5 rounded-lg p-2 border border-secondary/20">
                <div className="flex items-center gap-2 mb-1">
                  <Wallet className="h-4 w-4 text-secondary" />
                  <span className="text-xs font-medium text-secondary-foreground">
                    Cash
                  </span>
                </div>
                <div className="text-sm font-semibold text-secondary-foreground">
                  {formatCurrency(cashBalance)}
                </div>
              </div>

              {/* Bank/Fonepay Balance */}
              <div className="bg-primary/5 rounded-lg p-2 border border-primary/20">
                <div className="flex items-center gap-2 mb-1">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium text-primary">
                    Bank/Fonepay
                  </span>
                </div>
                <div className="text-sm font-semibold text-primary">
                  {formatCurrency(bankBalance)}
                </div>
              </div>

              {/* Cooperative Balance */}
              <div className="bg-primary/10 rounded-lg p-2 border border-primary/20">
                <div className="flex items-center gap-2 mb-1">
                  <PiggyBank className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium text-primary">
                    Cooperative
                  </span>
                </div>
                <div className="text-sm font-semibold text-primary">
                  {formatCurrency(cooperativeBalance)}
                </div>
              </div>

              {/* Esewa Balance */}
              <div className="bg-primary/5 rounded-lg p-2 border border-primary/10">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium text-primary">
                    Esewa
                  </span>
                </div>
                <div className="text-sm font-semibold text-primary">
                  {formatCurrency(esewaBalance)}
                </div>
              </div>
            </div>
          )}

          {/* Balance Status */}
          <div className="flex items-center justify-center mt-3">
            <Badge
              variant={totalBalance >= 0 ? "default" : "destructive"}
              className={totalBalance >= 0 ? "bg-green-100 text-green-800" : ""}
            >
              {totalBalance >= 0 ? "Positive Balance" : "Negative Balance"}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BalanceDisplay;
