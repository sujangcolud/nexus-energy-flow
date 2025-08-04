import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/unifiedCalculations";
import { TrendingUp, DollarSign, Loader2 } from "lucide-react";

interface AllTimeTotalDisplayProps {
  type: 'orders' | 'charging' | 'expenses' | 'deposits' | 'withdrawals' | 'savings';
  className?: string;
}

interface TotalData {
  total: number;
  label: string;
  color: string;
  bgColor: string;
}

export const AllTimeTotalDisplay: React.FC<AllTimeTotalDisplayProps> = ({
  type,
  className = ""
}) => {
  const [loading, setLoading] = useState(true);
  const [totalData, setTotalData] = useState<TotalData>({
    total: 0,
    label: '',
    color: '',
    bgColor: ''
  });

  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'orders':
        return {
          label: 'All-Time Orders Revenue',
          color: 'text-green-700',
          bgColor: 'from-green-50 to-emerald-50 border-green-200',
          field: 'total_income_from_orders'
        };
      case 'charging':
        return {
          label: 'All-Time Charging Revenue',
          color: 'text-blue-700',
          bgColor: 'from-blue-50 to-cyan-50 border-blue-200',
          field: 'total_income_from_charging'
        };
      case 'expenses':
        return {
          label: 'All-Time Expenses',
          color: 'text-red-700',
          bgColor: 'from-red-50 to-rose-50 border-red-200',
          field: 'total_expenses'
        };
      case 'deposits':
        return {
          label: 'All-Time Deposits',
          color: 'text-blue-700',
          bgColor: 'from-blue-50 to-indigo-50 border-blue-200',
          field: 'total_deposits'
        };
      case 'withdrawals':
        return {
          label: 'All-Time Withdrawals',
          color: 'text-orange-700',
          bgColor: 'from-orange-50 to-amber-50 border-orange-200',
          field: 'total_withdrawals'
        };
      case 'savings':
        return {
          label: 'All-Time Cooperative Savings',
          color: 'text-purple-700',
          bgColor: 'from-purple-50 to-violet-50 border-purple-200',
          field: 'total_savings'
        };
      default:
        return {
          label: 'All-Time Total',
          color: 'text-gray-700',
          bgColor: 'from-gray-50 to-slate-50 border-gray-200',
          field: 'total_income'
        };
    }
  };

  const fetchAllTimeTotal = async () => {
    setLoading(true);
    try {
      console.log(`Fetching all-time ${type} total from daily_summary table`);
      
      const { data: dailySummaries, error } = await supabase
        .from('daily_summary')
        .select('*')
        .order('summary_date', { ascending: true });

      if (error) {
        console.error('Error fetching daily summaries:', error);
        throw error;
      }

      const config = getTypeConfig(type);
      
      // Helper function for safe field access
      const safeGet = (obj: any, field: string): number => {
        const value = Number(obj?.[field]);
        return isNaN(value) ? 0 : value;
      };

      // Calculate total from all daily summaries
      const total = dailySummaries?.reduce((sum, daily) => {
        return sum + safeGet(daily, config.field);
      }, 0) || 0;

      setTotalData({
        total,
        label: config.label,
        color: config.color,
        bgColor: config.bgColor
      });

      console.log(`${config.label}: ${formatCurrency(total)}`);
    } catch (error) {
      console.error(`Error fetching ${type} total:`, error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllTimeTotal();
  }, [type]);

  if (loading) {
    return (
      <Card className={`bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200 ${className}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
            <span className="ml-2 text-gray-600">Loading total...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`bg-gradient-to-br ${totalData.bgColor} shadow-lg hover:shadow-xl transition-all duration-300 ${className}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-white shadow-md">
              <TrendingUp className={`h-6 w-6 ${totalData.color}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">
                {totalData.label}
              </p>
              <p className={`text-3xl font-bold ${totalData.color}`}>
                {formatCurrency(totalData.total)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <Badge variant="secondary" className="bg-white/50 text-gray-700">
              <DollarSign className="h-4 w-4 mr-1" />
              All Time
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AllTimeTotalDisplay;
