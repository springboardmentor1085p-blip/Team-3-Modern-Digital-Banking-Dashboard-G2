export function DropdownMenu({ children }) {
  return <div>{children}</div>;
}

export function DropdownMenuItem({ children }) {
  return <div className="p-2 hover:bg-gray-100 cursor-pointer">{children}</div>;
}

export function DropdownMenuTrigger({ children }) {
  return <button>{children}</button>;
}
