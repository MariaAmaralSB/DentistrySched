import { useEffect, useState } from "react";
import { setTenantId, getTenantId } from "../api/client";

const TENANTS_DEMO = [
  { id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", nome: "Clínica A" },
  { id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", nome: "Clínica B" },
];

export default function TenantSwitcher() {
  const [tenant, setTenant] = useState(getTenantId());

  useEffect(() => setTenant(getTenantId()), []);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const tid = e.target.value;
    setTenantId(tid);
    setTenant(tid);
    window.location.reload();
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-slate-600">Tenant:</span>

      <div className="relative">
        <select
          value={tenant}
          onChange={handleChange}
          className="
            appearance-none
            min-w-[180px]
            rounded-xl border border-slate-200
            bg-white/90
            px-3 py-2 pr-9
            text-sm text-slate-700
            shadow-sm
            hover:border-slate-300
            focus:outline-none focus:ring-2 focus:ring-blue-500/20
            transition
          "
        >
          {TENANTS_DEMO.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome}
            </option>
          ))}
        </select>

        {/* Ícone do dropdown */}
        <svg
          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
    </div>
  );
}
