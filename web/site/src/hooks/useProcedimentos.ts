import { useQuery } from "@tanstack/react-query";
import api from "../api/client";

export type Procedimento = { id: string; nome: string; duracaoMin: number };

export function useProcedimentos(dentistaId?: string) {
  return useQuery({
    queryKey: ["procedimentos", dentistaId ?? "all"],
    queryFn: async () => {
      if (!dentistaId) return [];
      const r = await api.get(`/admin/dentistas/${dentistaId}/procedimentos`);
      return Array.isArray(r.data) ? (r.data as Procedimento[]) : [];
    },
    enabled: !!dentistaId,
    staleTime: 60_000,
  });
}
