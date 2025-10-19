import { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  loading?: boolean;
};

export default function Button({ variant="primary", loading, className="", children, ...rest }: Props) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50";
  const styles: Record<string, string> = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-400",
    secondary:"bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-300",
    ghost:    "bg-transparent hover:bg-gray-100 text-gray-700 focus:ring-gray-300",
    danger:   "bg-red-600 text-white hover:bg-red-700 focus:ring-red-400",
  };
  return (
    <button className={`${base} ${styles[variant]} ${className}`} disabled={loading || rest.disabled} {...rest}>
      {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" />}
      {children}
    </button>
  );
}
