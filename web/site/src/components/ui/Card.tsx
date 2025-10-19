export function Card({ children, className="" }: {children: React.ReactNode; className?: string}) {
  return <div className={`bg-white rounded-2xl shadow ${className}`}>{children}</div>;
}
export function CardHeader({ children, className="" }: any) {
  return <div className={`px-6 pt-6 ${className}`}>{children}</div>;
}
export function CardBody({ children, className="" }: any) {
  return <div className={`px-6 pb-6 ${className}`}>{children}</div>;
}
