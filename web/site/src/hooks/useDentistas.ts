import { useQuery } from "@tanstack/react-query";
import { AdminAPI } from "../api/client";

export type Dentista = { id: string; nome: string; cro?: string };

function normalizeDentista(x: any): Dentista {
  return {
    id: x?.id ?? x?.Id ?? x?.guid ?? "",
    nome: x?.nome ?? x?.Nome ?? "",
    cro: x?.cro ?? x?.CRO ?? x?.croNumber ?? undefined,
  };
}

export function useDentistas() {
  return useQuery({
    queryKey: ["dentistas"],
    queryFn: async (): Promise<Dentista[]> => {
      const data = await AdminAPI.dentistas();
      return (Array.isArray(data) ? data : []).map(normalizeDentista);
    },
    staleTime: 60_000,
    retry: 1,
  });
}
