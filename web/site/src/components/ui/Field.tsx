type Props = {
  label: string;
  help?: string;
  error?: string;
  children: React.ReactNode;
};
export default function Field({ label, help, error, children }: Props) {
  return (
    <label className="block">
      <span className="block text-sm mb-1">{label}</span>
      {children}
      {help && !error && <div className="mt-1 text-xs text-gray-500">{help}</div>}
      {error && <div className="mt-1 text-xs text-red-600">{error}</div>}
    </label>
  );
}
