import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { Button } from "./button";
import { Calendar } from "./calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover";

export default function DateRangePicker({
  dateRange,
  onDateRangeChange,
}) {
  const [open, setOpen] = React.useState(false);
  const [tempRange, setTempRange] = React.useState(dateRange);

  React.useEffect(() => {
    setTempRange(dateRange);
  }, [dateRange]);

  const handleApply = () => {
    onDateRangeChange?.(tempRange);
    setOpen(false);
  };

  const handleCancel = () => {
    setTempRange(dateRange);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="justify-start text-left w-[260px]"
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {dateRange?.from && dateRange?.to ? (
            <>
              {format(dateRange.from, "MMM dd, yyyy")} –{" "}
              {format(dateRange.to, "MMM dd, yyyy")}
            </>
          ) : (
            <span>Pick a date range</span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-4" align="start">
        <Calendar
          mode="range"
          selected={tempRange}
          onSelect={setTempRange}
          numberOfMonths={2}
        />

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleApply} disabled={!tempRange?.from}>
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
