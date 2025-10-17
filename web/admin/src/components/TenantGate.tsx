import { ReactNode } from "react";
import { getTenantId } from "../api/client";


export default function TenantGate({ children }: { children: ReactNode }) {
  const tid = getTenantId();
  if (!tid) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Selecione um tenant para continuar</h2>
        <p>Abra o seletor no topo e escolha uma clínica.</p>
      </div>
    );
  }
  return <>{children}</>;
}
