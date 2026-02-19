// src/components/ui/select.jsx
export function Select({ children, ...props }) {
  return <select {...props} className="border rounded px-2 py-1">{children}</select>;
}

export function SelectItem({ value, children }) {
  return <option value={value}>{children}</option>;
}
