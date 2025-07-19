import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { useIsMobile } from "@/hooks/use-mobile";

interface MobileDatePickerProps {
  date?: Date;
  onDateChange?: (date: Date | undefined) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export function MobileDatePicker({
  date,
  onDateChange,
  label,
  placeholder = "Pick a date",
  error,
  disabled,
  className,
}: MobileDatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const isMobile = useIsMobile();

  // On mobile, use native date input for better UX
  if (isMobile) {
    return (
      <div className="space-y-2">
        {label && <Label className="text-base font-medium">{label}</Label>}
        <div className="relative">
          <input
            type="date"
            value={date ? format(date, "yyyy-MM-dd") : ""}
            onChange={(e) => {
              if (e.target.value) {
                onDateChange?.(new Date(e.target.value));
              } else {
                onDateChange?.(undefined);
              }
            }}
            disabled={disabled}
            className={cn(
              "flex w-full rounded-2xl border border-gray-200 bg-white px-4 py-4 text-base ring-offset-white file:border-0 file:bg-transparent file:text-base file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
              error && "border-red-300 focus-visible:ring-red-500",
              className,
            )}
          />
        </div>
        {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
      </div>
    );
  }

  // Desktop version with popover calendar
  return (
    <div className="space-y-2">
      {label && <Label className="text-sm font-medium">{label}</Label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal h-12 px-3 rounded-xl border-gray-200",
              !date && "text-gray-500",
              error && "border-red-300",
              className,
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "PPP") : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(selectedDate) => {
              onDateChange?.(selectedDate);
              setOpen(false);
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
    </div>
  );
}
