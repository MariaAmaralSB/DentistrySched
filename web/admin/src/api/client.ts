import axios from "axios";

/** Base da API */
const API_BASE =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    (import.meta.env.VITE_API as string)) ||
  "http://localhost:5227";

const api = axios.create({ baseURL: API_BASE });

/** Tenant Id salvo no localStorage (já existia) */
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

/** Token helpers */
const TOKEN_KEY = "auth:token";
export function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function setToken(tok: string | null) {
  try {
    if (tok) localStorage.setItem(TOKEN_KEY, tok);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

/** Intercepta cada request: tenant + bearer */
api.interceptors.request.use((config) => {
  config.headers = config.headers ?? {};
  (config.headers as any)["X-Tenant-Id"] = safeGetTenantId();

  const t = getToken();
  if (t) (config.headers as any)["Authorization"] = `Bearer ${t}`;
  return config;
});

/* ------------------ Tipos ------------------ */
export type ConsultaDia = {
  id: string;
  hora: string;
  paciente: string;
  procedimento: string;
  status: number;
};

export type DiaMesStatus = {
  dia: number;
  status: 0 | 1 | 2;
  motivo?: string | null;
};

export type ExcecaoDia = {
  dentistaId: string;
  data: string;
  fechadoDiaTodo?: boolean;
  abrirManhaDe?: string | null;
  abrirManhaAte?: string | null;
  abrirTardeDe?: string | null;
  abrirTardeAte?: string | null;
  motivo?: string | null;
};

export type AgendaDiaResp = {
  dia: number;
  livres: number;
  ocupados: number;
  total: number;
  slots: ConsultaDia[];
};

export type AgendaDataView = {
  data: string;
  manhaDe?: string | null;
  manhaAte?: string | null;
  tardeDe?: string | null;
  tardeAte?: string | null;
  observacao?: string | null;
};

export type AgendaDataUpsert = {
  data: string;
  manhaDe?: string | null;
  manhaAte?: string | null;
  tardeDe?: string | null;
  tardeAte?: string | null;
  observacao?: string | null;
};

export type AgendaRegraUpsertDto = {
  diaSemana: number;
  inicioManha?: string | null;
  fimManha?: string | null;
  inicioTarde?: string | null;
  fimTarde?: string | null;
};

export type Procedimento = {
  id: string;
  nome: string;
  duracaoMin: number;
  bufferMin: number;
};

export type SlotDto = { horaISO: string };

export type RetornoSugestaoDto = {
  dia: string;
  horarios: string[];
};

export type CriarRetornoDto = {
  dentistaId?: string;
  procedimentoId?: string;
  inicio: string;
};

/** Auth */
export type LoginRequest = { email: string; password: string };
export type LoginResponse = {
  token: string;
  name: string;
  email: string;
  roles: string[];
  tenantId: string;
  dentistaId?: string | null;
};
export type MeResponse = {
  id: string;
  email: string;
  name: string;
  tenant: string;
  dentistaId?: string | null;
  roles: string[];
};

/* ------------------ APIs ------------------ */
export const AuthAPI = {
  login: async (req: LoginRequest) => {
    const r = await api.post<LoginResponse>("/auth/login", req);
    return r.data;
  },
  me: async () => {
    const r = await api.get<MeResponse>("/auth/me");
    return r.data;
  },
  logout: async () => {
    setToken(null);
  }
};

export const PublicAPI = {
  slots: async (dentistaId: string, procedimentoId: string, dataISO: string): Promise<SlotDto[]> => {
    const r = await api.get("/public/slots", {
      params: { dentistaId, procedimentoId, data: dataISO },
    });

    const raw = Array.isArray(r.data)
      ? r.data
      : Array.isArray(r.data?.slots)
      ? r.data.slots
      : [];

    const pickRawHora = (x: any) =>
      x?.horaISO ?? x?.HoraISO ?? x?.horaIso ?? x?.inicioISO ?? x?.InicioISO ??
      x?.hora ?? x?.Hora ?? x?.inicio ?? x?.Inicio ?? (typeof x === "string" ? x : null);

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

  criarConsulta: async (dto: any) =>
    (await api.post("/public/consultas", dto)).data as string,
};

const normalizaRegras = (regras: AgendaRegraUpsertDto[]) =>
  (regras ?? []).map((r) => ({
    ...r,
    diaSemana: r.diaSemana === 7 ? 0 : r.diaSemana,
  }));

export const AdminAPI = {
  dentistas: async () => {
    const r = await api.get("/admin/dentistas");
    return Array.isArray(r.data) ? r.data : [];
  },

  criarDentista: async (dto: { nome: string; cro?: string }) => {
    await api.post("/admin/dentistas", dto);
  },

  atualizarDentista: async (id: string, dto: { nome: string; cro?: string }) => {
    await api.put(`/admin/dentistas/${id}`, dto);
  },

  removerDentista: async (id: string) => {
    await api.delete(`/admin/dentistas/${id}`);
  },

  procedimentos: async (): Promise<Procedimento[]> => {
    const r = await api.get("/admin/procedimentos");
    const d = r.data;
    if (Array.isArray(d)) return d;
    if (Array.isArray(d?.items)) return d.items;
    return [];
  },

  procedimentosDoDentista: async (dentistaId: string): Promise<Procedimento[]> => {
    const r = await api.get(`/admin/dentistas/${dentistaId}/procedimentos`);
    return Array.isArray(r.data) ? r.data : [];
  },

  salvarProcedimentosDoDentista: async (dentistaId: string, procedimentoIds: string[]) => {
    await api.put(`/admin/dentistas/${dentistaId}/procedimentos`, procedimentoIds);
  },

  getAgendaRegras: async (dentistaId: string) => {
    if (!dentistaId) return [];
    const r = await api.get("/admin/agenda-regras", { params: { dentistaId } });
    return Array.isArray(r.data) ? r.data : [];
  },

  salvarAgendaRegras: async (dentistaId: string, regras: AgendaRegraUpsertDto[]) => {
    await api.put(`/admin/agenda-regras/${dentistaId}`, normalizaRegras(regras));
  },

  criarOuAtualizarDiasAgenda: async (dentistaId: string, regras: AgendaRegraUpsertDto[]) => {
    await api.post(`/admin/agenda-regras/${dentistaId}`, normalizaRegras(regras));
  },

  agendaMesStatus: async (dentistaId: string, ano: number, mes: number): Promise<DiaMesStatus[]> => {
    if (!dentistaId) return [];
    const r = await api.get("/admin/agenda-regras/mes", { params: { dentistaId, ano, mes } });
    return Array.isArray(r.data) ? r.data : [];
  },

  agendaDoDia: async (dataISO: string, dentistaId?: string) => {
    const params: any = { data: dataISO };
    if (dentistaId) params.dentistaId = dentistaId;
    const r = await api.get("/admin/consultas", { params });
    return Array.isArray(r.data) ? r.data : [];
  },

  agendaDia: async (dentistaId: string, dataISO: string, procedimentoId?: string, signal?: AbortSignal) => {
    const params: any = { dentistaId, data: dataISO };
    if (procedimentoId) params.procedimentoId = procedimentoId;
    try {
      const r = await api.get<AgendaDiaResp>("/admin/agenda-dia", { params, signal });
      const d = r.data;
      if (Array.isArray(d?.slots)) return d.slots;
      if (Array.isArray(d as any)) return d as any;
      return [];
    } catch (err: any) {
      if (err?.code !== "ERR_CANCELED") console.error(err);
      return [];
    }
  },

  getExcecaoDia: async (dentistaId: string, dataISO: string): Promise<ExcecaoDia | null> => {
    try {
      const r = await api.get("/admin/agenda-excecao", {
        params: { dentistaId, data: dataISO },
      });
      return r.data ?? null;
    } catch (err: any) {
      if (err?.response?.status === 404) return null;
      console.error(err);
      return null;
    }
  },

  salvarExcecaoDia: async (ex: ExcecaoDia) => {
    await api.put("/admin/agenda-excecao", ex);
  },

  removerExcecaoDia: async (dentistaId: string, dataISO: string) => {
    await api.delete(`/admin/agenda-excecao`, { params: { dentistaId, data: dataISO } });
  },

  getAgendaDatas: async (dentistaId: string, ano: number, mes: number) => {
    if (!dentistaId) return [] as AgendaDataView[];
    const r = await api.get("/admin/agenda-datas", { params: { dentistaId, ano, mes } });
    return Array.isArray(r.data) ? (r.data as AgendaDataView[]) : [];
  },

  salvarAgendaDatas: async (dentistaId: string, dias: AgendaDataUpsert[]) => {
    await api.put(`/admin/agenda-datas/${dentistaId}`, dias);
  },

  removerAgendaData: async (dentistaId: string, dataISO: string) => {
    const [y, m, d] = dataISO.split("-").map(Number);
    await api.delete(`/admin/agenda-datas/${dentistaId}/${y}-${m}-${d}`);
  },
};

export default api;
