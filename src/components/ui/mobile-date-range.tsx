import React from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { useIsMobile } from "@/hooks/use-mobile";

interface MobileDateRangeProps {
  range?: DateRange;
  onRangeChange: (range: DateRange | undefined) => void;
  className?: string;
}

const MobileDateRange: React.FC<MobileDateRangeProps> = ({
  range,
  onRangeChange,
  className,
}) => {
  const isMobile = useIsMobile();

  const formatRange = () => {
    if (range?.from) {
      if (range.to) {
        return `${format(range.from, "MMM dd")} - ${format(range.to, "MMM dd")}`;
      }
      return format(range.from, "MMM dd, yyyy");
    }
    return "Pick a date range";
  };

  const handleQuickSelect = (days: number) => {
    const today = new Date();
    const from = new Date(today);
    from.setDate(today.getDate() - days + 1);
    onRangeChange({ from, to: today });
  };

  const DateRangeSelector = () => (
    <div className="space-y-4">
      {/* Quick Select Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleQuickSelect(1)}
          className="text-xs"
        >
          Today
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleQuickSelect(7)}
          className="text-xs"
        >
          7 Days
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleQuickSelect(30)}
          className="text-xs"
        >
          30 Days
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleQuickSelect(90)}
          className="text-xs"
        >
          90 Days
        </Button>
      </div>

      {/* Manual Date Inputs for Mobile */}
      {isMobile && (
        <div className="space-y-3">
          <div>
            <Label htmlFor="start-date" className="text-sm">
              Start Date
            </Label>
            <Input
              id="start-date"
              type="date"
              value={range?.from ? format(range.from, "yyyy-MM-dd") : ""}
              onChange={(e) => {
                const date = e.target.value
                  ? new Date(e.target.value)
                  : undefined;
                onRangeChange({ from: date, to: range?.to });
              }}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="end-date" className="text-sm">
              End Date
            </Label>
            <Input
              id="end-date"
              type="date"
              value={range?.to ? format(range.to, "yyyy-MM-dd") : ""}
              onChange={(e) => {
                const date = e.target.value
                  ? new Date(e.target.value)
                  : undefined;
                onRangeChange({ from: range?.from, to: date });
              }}
              className="mt-1"
            />
          </div>
        </div>
      )}

      {/* Calendar for Desktop */}
      {!isMobile && (
        <Calendar
          initialFocus
          mode="range"
          defaultMonth={range?.from}
          selected={range}
          onSelect={onRangeChange}
          numberOfMonths={1}
          className="rounded-md border"
        />
      )}
    </div>
  );

  // Use Sheet for mobile, Popover for desktop
  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !range && "text-muted-foreground",
              className,
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatRange()}
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[70vh]">
          <SheetHeader>
            <SheetTitle>Select Date Range</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <DateRangeSelector />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-[280px] justify-start text-left font-normal",
            !range && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formatRange()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <DateRangeSelector />
      </PopoverContent>
    </Popover>
  );
};

export default MobileDateRange;
