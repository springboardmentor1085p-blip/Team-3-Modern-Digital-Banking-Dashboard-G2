// src/components/ui/label.jsx
export function Label({ children, ...props }) {
  return (
    <label {...props} className="block text-sm font-medium">
      {children}
    </label>
  );
}
