
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

const BatchDailyClosingSystem = () => {
  const { user } = useAuth();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentDate, setCurrentDate] = useState("");

  const processBatchClosing = async () => {
    if (!user) {
      toast.error("Please log in to perform batch closing");
      return;
    }

    if (!startDate || !endDate) {
      toast.error("Please select both start and end dates");
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast.error("Start date cannot be after end date");
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    try {
      // Get all dates between start and end
      const start = new Date(startDate);
      const end = new Date(endDate);
      const dates: string[] = [];
      
      const currentDateLoop = new Date(start);
      while (currentDateLoop <= end) {
        dates.push(currentDateLoop.toISOString().split('T')[0]);
        currentDateLoop.setDate(currentDateLoop.getDate() + 1);
      }

      const totalDates = dates.length;
      let processedCount = 0;

      for (const date of dates) {
        setCurrentDate(date);
        
        try {
          // Call the enhanced daily summary function
          const { error } = await supabase.rpc('update_enhanced_daily_summary', {
            target_date: date
          });

          if (error) {
            console.error(`Error processing date ${date}:`, error);
            toast.error(`Failed to process date ${date}: ${error.message}`);
          }

          processedCount++;
          setProgress((processedCount / totalDates) * 100);
          
          // Small delay to prevent overwhelming the database
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          console.error(`Error processing date ${date}:`, error);
          toast.error(`Failed to process date ${date}`);
        }
      }

      toast.success(`Batch closing completed for ${processedCount} dates`);
      
    } catch (error) {
      console.error("Batch closing error:", error);
      toast.error("Failed to complete batch closing");
    } finally {
      setIsProcessing(false);
      setProgress(0);
      setCurrentDate("");
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Batch Daily Closing System</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={isProcessing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={isProcessing}
            />
          </div>
        </div>

        {isProcessing && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Processing Progress</Label>
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-gray-600">
                {progress.toFixed(1)}% complete
                {currentDate && ` - Currently processing: ${currentDate}`}
              </p>
            </div>
          </div>
        )}

        <Button
          onClick={processBatchClosing}
          disabled={isProcessing || !startDate || !endDate}
          className="w-full"
        >
          {isProcessing ? "Processing..." : "Start Batch Closing"}
        </Button>

        <div className="text-sm text-gray-600">
          <p>
            <strong>Note:</strong> This will process daily summaries for all dates
            between the selected range. This operation may take several minutes
            for large date ranges.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default BatchDailyClosingSystem;
