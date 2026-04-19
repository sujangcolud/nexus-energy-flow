import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";

interface Props {
  range: DateRange | undefined;
  onChange: (r: DateRange | undefined) => void;
  className?: string;
}

const HistoryDateRangeFilter = ({ range, onChange, className }: Props) => {
  const label =
    range?.from && range?.to
      ? `${format(range.from, "MMM d")} - ${format(range.to, "MMM d, yyyy")}`
      : range?.from
        ? `From ${format(range.from, "MMM d, yyyy")}`
        : "All history";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <CalendarIcon className="h-4 w-4" />
            {label}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="range"
            defaultMonth={range?.from}
            selected={range}
            onSelect={onChange}
            numberOfMonths={2}
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
      {range?.from && (
        <Button variant="ghost" size="icon" onClick={() => onChange(undefined)} title="Clear filter">
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

export default HistoryDateRangeFilter;
