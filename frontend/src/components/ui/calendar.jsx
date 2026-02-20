import * as React from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

export function Calendar({
  mode = "single",
  selected,
  onSelect,
  numberOfMonths = 1,
}) {
  return (
    <DayPicker
      mode={mode}
      selected={selected}
      onSelect={onSelect}
      numberOfMonths={numberOfMonths}
      className="rounded-md border p-2"
    />
  );
}