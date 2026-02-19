import * as React from "react";

/**
 * Simple utility to merge class names
 * (no external dependency needed)
 */
function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function Button({
  children,
  className = "",
  variant = "default",
  size = "default",
  disabled = false,
  ...props
}) {
  const base =
    "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";

  const variants = {
    default:
      "bg-blue-600 text-white hover:bg-blue-700",
    outline:
      "border border-gray-300 bg-white text-gray-900 hover:bg-gray-100",
    secondary:
      "bg-gray-100 text-gray-900 hover:bg-gray-200",
    ghost:
      "bg-transparent text-gray-700 hover:bg-gray-100",
    destructive:
      "bg-red-600 text-white hover:bg-red-700"
  };

  const sizes = {
    sm: "h-8 px-3 text-sm",
    default: "h-10 px-4 text-sm",
    lg: "h-11 px-6 text-base"
  };

  return (
    <button
      className={cn(
        base,
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
