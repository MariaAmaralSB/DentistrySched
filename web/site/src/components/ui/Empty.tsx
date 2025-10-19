export default function Empty({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="text-center text-sm text-gray-600 py-6">
      <div className="font-medium">{title}</div>
      {subtitle && <div className="mt-1">{subtitle}</div>}
    </div>
  );
}
