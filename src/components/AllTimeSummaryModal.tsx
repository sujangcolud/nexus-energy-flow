import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/unifiedCalculations";
import { cn } from "@/lib/utils";

interface AllTimeSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  summaryData: any;
  onDateRangeChange: (dateRange: any) => void;
}

export const AllTimeSummaryModal: React.FC<AllTimeSummaryModalProps> = ({
  isOpen,
  onClose,
  summaryData,
  onDateRangeChange
}) => {
  const [date, setDate] = React.useState<Date | undefined>(new Date())

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>All-Time Financial Summary</DialogTitle>
        </DialogHeader>

        {/* Date Range Selection */}
        <div className="flex flex-wrap gap-4 items-center border-b pb-4">
          {/* Add date range controls here if needed */}
        </div>

        {/* Display summary data */}
        {summaryData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Income Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">Total Income</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-2xl font-bold">{formatCurrency(summaryData.totalIncome)}</div>
                  <div className="space-y-1 text-sm">
                    <div>Orders: {formatCurrency(summaryData.incomeBreakdown?.fromOrders || 0)}</div>
                    <div>Charging: {formatCurrency(summaryData.incomeBreakdown?.fromCharging || 0)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Current Balances */}
            <Card>
              <CardHeader>
                <CardTitle>Current Balances</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-orange-600">Cash:</span>
                    <span>{formatCurrency(summaryData.currentBalances?.cash || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-600">eSewa:</span>
                    <span>{formatCurrency(summaryData.currentBalances?.esewa || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-600">Fonepay:</span>
                    <span>{formatCurrency(summaryData.currentBalances?.fonepay || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-600">Cooperative:</span>
                    <span>{formatCurrency(summaryData.currentBalances?.cooperative || 0)}</span>
                  </div>
                  <hr className="my-2" />
                  <div className="flex justify-between font-bold">
                    <span>Total Balance:</span>
                    <span className="text-green-600">
                      {formatCurrency(summaryData.currentBalances?.total || 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
