import axios from "axios";

const API_BASE =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    (import.meta.env.VITE_API as string)) ||
  "http://localhost:5277";

const api = axios.create({ baseURL: API_BASE });

function safeGetTenantId(): string {
  const fallback = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
  if (typeof window === "undefined") return fallback;
  try {
    return localStorage.getItem("tenantId") || fallback;
  } catch {
    return fallback;
  }
}
export function getTenantId() { return safeGetTenantId(); }
export function setTenantId(id: string) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem("tenantId", id); } catch {}
}

api.interceptors.request.use((config) => {
  const tid = safeGetTenantId();
  config.headers = config.headers ?? {};
  (config.headers as any)["X-Tenant-Id"] = tid;
  return config;
});

export default api;

export type Dentista = { id: string; nome: string; cro?: string | null };
export type Procedimento = { id: string; nome: string; duracaoMin: number; bufferMin: number };
export type SlotDto = { horaISO: string };

export type CriarConsultaDto = {
  dentistaId: string;
  procedimentoId: string;
  inicio: string; // ISO
  pacienteNome: string;
  celularWhatsApp: string;
  email?: string | null;
  descricao?: string | null;
  sintomas: string[];
};

export const PublicAPI = {
  dentistas: async (): Promise<Dentista[]> => {
    const r = await api.get("/admin/dentistas");
    return Array.isArray(r.data) ? r.data : [];
  },

  procedimentos: async (dentistaId: string): Promise<Procedimento[]> => {
    if (!dentistaId) return [];
    const r = await api.get(`/admin/dentistas/${dentistaId}/procedimentos`);
    return Array.isArray(r.data) ? r.data : [];
  },

  slots: async (dentistaId: string, procedimentoId: string, dataISO: string): Promise<SlotDto[]> => {
    const r = await api.get("/public/slots", { params: { dentistaId, procedimentoId, data: dataISO } });

    const raw = Array.isArray(r.data)
      ? r.data
      : (Array.isArray(r.data?.slots) ? r.data.slots : []);

    const pickRawHora = (x: any) =>
      x?.horaISO ?? x?.HoraISO ?? x?.horaIso ??
      x?.inicioISO ?? x?.InicioISO ??
      x?.hora ?? x?.Hora ??
      x?.inicio ?? x?.Inicio ??
      (typeof x === "string" ? x : null);

    const toISO = (data: string, t: string): string => {
      if (!t) return t;
      if (t.includes("T")) return t;
      const hhmm = t.trim();
      if (/^\d{2}:\d{2}$/.test(hhmm)) return `${data}T${hhmm}:00`;
      return t;
    };

    return raw
      .map((item: any) => {
        const h = pickRawHora(item);
        if (!h) return null;
        return { horaISO: toISO(dataISO, h) } as SlotDto;
      })
      .filter(Boolean) as SlotDto[];
  },

  criarConsulta: async (dto: CriarConsultaDto): Promise<string> => {
    const r = await api.post("/public/consultas", dto);
    return r.data as string;
  },
};
