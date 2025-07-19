import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Clock, AlertTriangle } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";

interface TransactionDatePickerProps {
  selectedDate: string; // ISO date string (YYYY-MM-DD)
  onDateChange: (date: string) => void;
  label?: string;
  maxDate?: Date;
  allowFutureDates?: boolean;
  showBackdateWarning?: boolean;
  className?: string;
}

const TransactionDatePicker: React.FC<TransactionDatePickerProps> = ({
  selectedDate,
  onDateChange,
  label = "Transaction Date",
  maxDate = new Date(),
  allowFutureDates = false,
  showBackdateWarning = true,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const today = new Date();
  const selectedDateObj = parseISO(selectedDate);
  const daysDifference = differenceInDays(today, selectedDateObj);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const isoString = format(date, "yyyy-MM-dd");
      onDateChange(isoString);
      setIsOpen(false);
    }
  };

  const isBackdated = daysDifference > 0;
  const isFutureDate = daysDifference < 0;

  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-sm font-medium flex items-center gap-2">
        <CalendarIcon className="h-4 w-4" />
        {label}
        {isBackdated && showBackdateWarning && (
          <span className="text-amber-600 text-xs bg-amber-50 px-2 py-1 rounded">
            {daysDifference} days ago
          </span>
        )}
        {isFutureDate && (
          <span className="text-red-600 text-xs bg-red-50 px-2 py-1 rounded">
            Future date
          </span>
        )}
      </Label>

      <div className="flex gap-2">
        {/* Direct input for quick entry */}
        <Input
          type="date"
          value={selectedDate}
          onChange={(e) => onDateChange(e.target.value)}
          max={allowFutureDates ? undefined : format(maxDate, "yyyy-MM-dd")}
          className="flex-1"
        />

        {/* Calendar popover for better UX */}
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "px-3",
                isBackdated && "border-amber-300 bg-amber-50",
                isFutureDate && "border-red-300 bg-red-50",
              )}
            >
              <CalendarIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={selectedDateObj}
              onSelect={handleDateSelect}
              disabled={(date) => {
                if (!allowFutureDates && date > maxDate) return true;
                return false;
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Warning for backdated entries */}
      {isBackdated && showBackdateWarning && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-amber-800">Backdated Entry</p>
            <p className="text-amber-700">
              You're entering data for{" "}
              {format(selectedDateObj, "MMMM dd, yyyy")}(
              {Math.abs(daysDifference)} day
              {Math.abs(daysDifference) !== 1 ? "s" : ""} ago). This will affect
              your daily summaries and reports.
            </p>
          </div>
        </div>
      )}

      {/* Warning for future dates */}
      {isFutureDate && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-red-800">Future Date Warning</p>
            <p className="text-red-700">
              You're entering data for a future date. This may cause reporting
              issues.
            </p>
          </div>
        </div>
      )}

      {/* Quick date buttons - Mobile optimized */}
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onDateChange(format(today, "yyyy-MM-dd"))}
          className="text-xs h-8 min-w-0 flex-1 sm:flex-none"
        >
          <Clock className="h-3 w-3 mr-1" />
          Today
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            onDateChange(
              format(
                new Date(today.getTime() - 24 * 60 * 60 * 1000),
                "yyyy-MM-dd",
              ),
            )
          }
          className="text-xs h-8 min-w-0 flex-1 sm:flex-none"
        >
          Yesterday
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            onDateChange(
              format(
                new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000),
                "yyyy-MM-dd",
              ),
            )
          }
          className="text-xs h-8 min-w-0 flex-1 sm:flex-none"
        >
          2 days ago
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            onDateChange(
              format(
                new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000),
                "yyyy-MM-dd",
              ),
            )
          }
          className="text-xs h-8 min-w-0 flex-1 sm:flex-none"
        >
          3 days ago
        </Button>
      </div>
    </div>
  );
};

export default TransactionDatePicker;
