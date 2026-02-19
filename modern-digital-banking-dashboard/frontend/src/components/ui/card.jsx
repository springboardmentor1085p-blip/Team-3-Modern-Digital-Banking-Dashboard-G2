import * as React from "react";

export function Card({ className = "", ...props }) {
  return (
    <div
      className={`rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-md ${className}`}
      {...props}
    />
  );
}

export function CardHeader({ className = "", ...props }) {
  return (
    <div
      className={`flex flex-col space-y-1.5 px-6 pt-6 pb-4 ${className}`}
      {...props}
    />
  );
}

export function CardTitle({ className = "", children, ...props }) {
  return (
    <h3
      className={`text-lg font-semibold leading-tight tracking-tight ${className}`}
      {...props}
    >
      {children || <span className="sr-only">Card title</span>}
    </h3>
  );
}


export function CardDescription({ className = "", children, ...props }) {
  return (
    <p
      className={`text-sm text-gray-500 ${className}`}
      {...props}
    >
      {children}
    </p>
  );
}

export function CardContent({ className = "", ...props }) {
  return (
    <div
      className={`px-6 pb-6 ${className}`}
      {...props}
    />
  );
}

export function CardFooter({ className = "", ...props }) {
  return (
    <div
      className={`flex items-center justify-between border-t px-6 py-4 bg-gray-50 ${className}`}
      {...props}
    />
  );
}
