export function Tabs({ children }) {
  return <div>{children}</div>
}
export function TabsList({ children }) {
  return <div className="flex gap-2">{children}</div>
}
export function TabsTrigger({ children }) {
  return <button className="border px-3 py-1 rounded">{children}</button>
}
export function TabsContent({ children }) {
  return <div className="mt-4">{children}</div>
}
