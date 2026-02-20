import * as React from "react";

export function Popover({ open, onOpenChange, children }) {
  return (
    <div className="relative inline-block">
      {React.Children.map(children, (child) =>
        React.cloneElement(child, { open, onOpenChange })
      )}
    </div>
  );
}

export function PopoverTrigger({ asChild, children, open, onOpenChange }) {
  return React.cloneElement(children, {
    onClick: () => onOpenChange(!open),
  });
}

export function PopoverContent({ children, open, align = "start", className }) {
  if (!open) return null;

  return (
    <div
      className={`absolute z-50 mt-2 rounded-md border bg-white shadow-lg ${className}`}
    >
      {children}
    </div>
  );
}
