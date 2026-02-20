import React, { useEffect } from "react";

/* Root */
export function Dialog({ open, onOpenChange, children }) {
  // Close on ESC
  useEffect(() => {
    if (!open) return;

    const onEsc = (e) => {
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    };

    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onOpenChange]);

  if (!open) return null;

  return <>{children}</>;
}

/* Trigger (kept for compatibility) */
export function DialogTrigger({ children }) {
  return <>{children}</>;
}

/* Content */
export function DialogContent({ children, className = "" }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className={`bg-white rounded-lg w-full max-w-lg max-h-[85vh] overflow-y-auto p-6 ${className}`}
      >
        {children}
      </div>
    </div>
  );
}

/* Header */
export function DialogHeader({ children }) {
  return <div className="mb-4">{children}</div>;
}

/* Title */
export function DialogTitle({ children }) {
  return (
    <h2 className="text-lg font-semibold leading-none tracking-tight">
      {children}
    </h2>
  );
}

/* Description */
export function DialogDescription({ children }) {
  return (
    <p className="text-sm text-muted-foreground mt-1">
      {children}
    </p>
  );
}

/* Footer */
export function DialogFooter({ children }) {
  return (
    <div className="mt-6 flex justify-end gap-2 sticky bottom-0 bg-white pt-4">
      {children}
    </div>
  );
}
