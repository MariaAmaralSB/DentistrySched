export default function Badge({ children, color="gray" }: { children: React.ReactNode; color?: "gray"|"green"|"red"|"blue" }) {
  const map = {
    gray:  "bg-gray-100 text-gray-800",
    green: "bg-green-100 text-green-800",
    red:   "bg-red-100 text-red-800",
    blue:  "bg-blue-100 text-blue-800",
  } as const;
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${map[color]}`}>{children}</span>;
}
