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
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <span>Tenant:</span>
      <select value={tenant} onChange={handleChange}>
        {TENANTS_DEMO.map(t => (
          <option key={t.id} value={t.id}>{t.nome}</option>
        ))}
      </select>
    </div>
  );
}
