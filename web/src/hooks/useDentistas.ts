import { useEffect, useState } from "react";
import { AdminAPI } from "../api/client";

export type Dentista = { id: string; nome: string; cro?: string };

export function useDentistas() {
  const [list, setList] = useState<Dentista[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const refresh = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await AdminAPI.dentistas();
      // normaliza (id, nome, cro)
      const arr = (data ?? []).map((d: any) => ({
        id: d.id ?? d.Id ?? d.guid ?? "",
        nome: d.nome ?? d.Nome ?? "",
        cro: d.cro ?? d.CRO ?? d.croNumber ?? undefined,
      }));
      setList(arr);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);
  return { list, loading, error, refresh };
}
