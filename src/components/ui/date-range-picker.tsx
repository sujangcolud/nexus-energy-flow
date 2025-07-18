import React, { useState } from 'react';
import { Button } from './button';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Calendar } from './calendar';
import { DateRange } from 'react-day-picker';

interface DateRangePickerProps {
  onUpdate: (range: { from: Date; to: Date } | undefined) => void;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({ onUpdate }) => {
  const [range, setRange] = useState<DateRange | undefined>(undefined);

  const handleSelect = (selectedRange: DateRange | undefined) => {
    setRange(selectedRange);
    if (selectedRange?.from && selectedRange?.to) {
      onUpdate({ from: selectedRange.from, to: selectedRange.to });
    } else {
      onUpdate(undefined);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">
          {range?.from ? (
            range.to ? (
              <>
                {range.from.toLocaleDateString()} - {range.to.toLocaleDateString()}
              </>
            ) : (
              range.from.toLocaleDateString()
            )
          ) : (
            <span>Pick a date range</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={range}
          onSelect={handleSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
};
