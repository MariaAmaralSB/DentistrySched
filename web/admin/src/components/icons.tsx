import React from "react";

type IconProps = React.SVGProps<SVGSVGElement> & { size?: number };

// Wrapper para padronizar tamanho 20x20 por default
function SvgBase({ size = 20, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    />
  );
}

/** Ícones */
export function DashboardIcon(props: IconProps) {
  // Home
  return (
    <SvgBase {...props}>
      <path d="M3 11.5l9-7 9 7" />
      <path d="M5 10.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9.5" />
    </SvgBase>
  );
}

export function DentistsIcon(props: IconProps) {
  // Users (grupo)
  return (
    <SvgBase {...props}>
      <path d="M17 21v-1a4 4 0 0 0-4-4h-2a4 4 0 0 0-4 4v1" />
      <circle cx="12" cy="7" r="3.5" />
      <path d="M22 21v-1a4 4 0 0 0-3-3.87" />
      <path d="M2 21v-1a4 4 0 0 1 3-3.87" />
      <path d="M19 8.5a3 3 0 1 1-2.5-4.9" />
      <path d="M5 8.5a3 3 0 1 0 2.5-4.9" />
    </SvgBase>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <SvgBase {...props}>
      <rect x="3" y="4.5" width="18" height="16" rx="2" />
      <path d="M16 2.5v4" />
      <path d="M8 2.5v4" />
      <path d="M3 10.5h18" />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01M16 17h.01" />
    </SvgBase>
  );
}

export function ReportsIcon(props: IconProps) {
  // Chart bars
  return (
    <SvgBase {...props}>
      <path d="M3 21h18" />
      <rect x="5" y="11" width="3.5" height="7" rx="1" />
      <rect x="10.25" y="7" width="3.5" height="11" rx="1" />
      <rect x="15.5" y="4" width="3.5" height="14" rx="1" />
    </SvgBase>
  );
}

/** Badge para ícone (quadrado arredondado com gradiente) */
export function IconBadge({
  children,
  className = "",
  size = 36,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  size?: number;
  title?: string;
}) {
  return (
    <span
      className={
        "inline-grid place-items-center rounded-xl shadow " +
        "bg-gradient-to-br from-blue-600 to-cyan-500 " +
        (className ?? "")
      }
      style={{ width: size, height: size }}
      aria-label={title}
      title={title}
    >
      <span className="text-white">{children}</span>
    </span>
  );
}
