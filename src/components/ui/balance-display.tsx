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
  const cardClass = size === "sm" ? "p-3" : size === "lg" ? "p-6" : "p-4";
  const titleSize =
    size === "sm" ? "text-sm" : size === "lg" ? "text-lg" : "text-base";
  const valueSize =
    size === "sm" ? "text-lg" : size === "lg" ? "text-2xl" : "text-xl";

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
      <CardHeader className={cardClass}>
        <CardTitle className={`flex items-center gap-2 ${titleSize}`}>
          <DollarSign className="h-5 w-5 text-blue-600" />
          Current Balances
        </CardTitle>
      </CardHeader>
      <CardContent className={cardClass}>
        <div className="space-y-3">
          {/* Total Balance */}
          <div className="bg-white rounded-lg p-3 border border-blue-100">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">
                Total Balance
              </span>
              <span className={`font-bold text-blue-600 ${valueSize}`}>
                {formatCurrency(totalBalance)}
              </span>
            </div>
          </div>

          {showDetails && (
            <div className="grid grid-cols-2 gap-2">
              {/* Cash Balance */}
              <div className="bg-orange-50 rounded-lg p-2 border border-orange-100">
                <div className="flex items-center gap-2 mb-1">
                  <Wallet className="h-4 w-4 text-orange-600" />
                  <span className="text-xs font-medium text-orange-700">
                    Cash
                  </span>
                </div>
                <div className="text-sm font-semibold text-orange-800">
                  {formatCurrency(cashBalance)}
                </div>
              </div>

              {/* Bank/Fonepay Balance */}
              <div className="bg-blue-50 rounded-lg p-2 border border-blue-100">
                <div className="flex items-center gap-2 mb-1">
                  <CreditCard className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-medium text-blue-700">
                    Bank/Fonepay
                  </span>
                </div>
                <div className="text-sm font-semibold text-blue-800">
                  {formatCurrency(bankBalance)}
                </div>
              </div>

              {/* Cooperative Balance */}
              <div className="bg-green-50 rounded-lg p-2 border border-green-100">
                <div className="flex items-center gap-2 mb-1">
                  <PiggyBank className="h-4 w-4 text-green-600" />
                  <span className="text-xs font-medium text-green-700">
                    Cooperative
                  </span>
                </div>
                <div className="text-sm font-semibold text-green-800">
                  {formatCurrency(cooperativeBalance)}
                </div>
              </div>

              {/* Esewa Balance */}
              <div className="bg-purple-50 rounded-lg p-2 border border-purple-100">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4 text-purple-600" />
                  <span className="text-xs font-medium text-purple-700">
                    Esewa
                  </span>
                </div>
                <div className="text-sm font-semibold text-purple-800">
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
