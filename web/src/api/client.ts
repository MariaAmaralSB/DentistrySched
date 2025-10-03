import axios from "axios";

const api = axios.create({ baseURL: import.meta.env.VITE_API });
export default api;

export type AgendaDiaItem = {
  id: string;
  inicio: string;   // ISO
  fim: string;      // ISO
  status: number;

  dentistaId: string;
  dentistaNome: string;

  pacienteId: string;
  pacienteNome: string;

  procedimentoId: string;
  procedimentoNome: string;

  hora: string;     // "HH:mm" (quando existir)
};

/** Linha simples para “consultas do dia” numa UI enxuta */
export type ConsultaDia = {
  id: string;
  hora: string;           // "HH:mm"
  paciente: string;
  procedimento: string;
  status: number;
};

/** Status leve usado para pintar o calendário do mês */
export type DiaMesStatus = {
  dia: number;
  status: 0 | 1 | 2;       // 0=Aberto, 1=Fechado, 2=Parcial
  motivo?: string | null;
};

/** Exceção de um dia específico (abrir/fechar ou limitar intervalos) */
export type ExcecaoDia = {
  dentistaId: string;
  data: string;                 // "yyyy-MM-dd"
  fechadoDiaTodo?: boolean;
  abrirManhaDe?: string | null; // "HH:mm"
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
  slots: ConsultaDia[]; // array “leve” para UI
};

export const AdminAPI = {
  // ---------------- Dentistas
  dentistas: async () => {
    const r = await api.get("/admin/dentistas");
    return Array.isArray(r.data) ? r.data : [];
  },

  procedimentos: async () => {
  const r = await api.get("/admin/procedimentos");
  const d = r.data;
    if (Array.isArray(d)) return d;           // formato antigo: []
    if (Array.isArray(d?.items)) return d.items; // formato novo: { items: [] }
    return [];
  },

  criarDentista: async (payload: { nome: string; cro?: string }) => {
    const r = await api.post("/admin/dentistas", payload);
    return r.data;
  },

  atualizarDentista: async (id: string, payload: { nome: string; cro?: string }) => {
    await api.put(`/admin/dentistas/${id}`, payload);
  },

  removerDentista: async (id: string) => {
    await api.delete(`/admin/dentistas/${id}`);
  },

  // ---------------- Consultas do dia (admin/consultas) – legado
  agendaDoDia: async (dataISO: string, dentistaId?: string) => {
    const params: any = { data: dataISO };
    if (dentistaId) params.dentistaId = dentistaId;
    const r = await api.get<AgendaDiaItem[]>("/admin/consultas", { params });
    return Array.isArray(r.data) ? r.data : [];
  },

  // ---------------- Regras semanais
  getAgendaRegras: async (dentistaId: string) => {
    if (!dentistaId) return [];
    const r = await api.get("/admin/agenda-regras", { params: { dentistaId } });
    return Array.isArray(r.data) ? r.data : [];
  },

  salvarAgendaRegras: async (dentistaId: string, regras: any[]) => {
    await api.put(`/admin/agenda-regras/${dentistaId}`, regras);
  },

  criarOuAtualizarDiasAgenda: async (dentistaId: string, regras: any[]) => {
    await api.post(`/admin/agenda-regras/${dentistaId}`, regras);
  },

  // ---------------- Status leve do mês
  agendaMesStatus: async (dentistaId: string, ano: number, mes: number): Promise<DiaMesStatus[]> => {
    if (!dentistaId) return [];
    try {
      const r = await api.get("/admin/agenda-regras/mes", { params: { dentistaId, ano, mes } });
      return Array.isArray(r.data) ? (r.data as DiaMesStatus[]) : [];
    } catch (err) {
      console.error("Erro ao buscar status do mês:", err);
      return [];
    }
  },

  agendaMes: async (dentistaId: string, ano: number, mes: number, procedimentoId?: string) => {
    if (!dentistaId) return [];
    const params: any = { dentistaId, ano, mes };
    if (procedimentoId) params.procedimentoId = procedimentoId;
    try {
      const r = await api.get("/admin/agenda-mes", { params });
      return Array.isArray(r.data) ? r.data : [];
    } catch (err) {
      console.error("Erro ao buscar agenda do mês (legado):", err);
      return [];
    }
  },

  agendaDia: async (
    dentistaId: string,
    dataISO: string,
    procedimentoId?: string,
    signal?: AbortSignal
  ): Promise<ConsultaDia[]> => {
    try {
      const params: any = { dentistaId, data: dataISO };
      if (procedimentoId) params.procedimentoId = procedimentoId;

      const r = await api.get<AgendaDiaResp>("/admin/agenda-dia", { params, signal });

      const d = r.data;
      if (Array.isArray(d?.slots)) return d.slots;
      if (Array.isArray(d as any)) return d as any;
      return [];
    } catch (err) {
      // axios lança se 4xx/5xx ou cancelado — devolve array vazio
      if ((err as any)?.code !== 'ERR_CANCELED') {
        console.error("Erro ao buscar agenda do dia:", err);
      }
      return [];
    }
  },

  // ---------------- Exceções do dia
  getExcecaoDia: async (dentistaId: string, dataISO: string): Promise<ExcecaoDia | null> => {
    try {
      const r = await api.get("/admin/agenda-excecao", { params: { dentistaId, data: dataISO } });
      return r.data ?? null;
    } catch (err: any) {
      // Trate 404 como “sem exceção”
      if (err?.response?.status === 404) return null;
      console.error("Erro ao buscar exceção do dia:", err);
      return null;
    }
  },

  salvarExcecaoDia: async (ex: ExcecaoDia) => {
    await api.put("/admin/agenda-excecao", ex);
  },

  removerExcecaoDia: async (dentistaId: string, dataISO: string) => {
    await api.delete("/admin/agenda-excecao", { params: { dentistaId, data: dataISO } });
  },
  criarProcedimento: async (payload: { nome: string; duracaoMin: number; bufferMin: number }) => {
  const r = await api.post("/admin/procedimentos", payload);
  return r.data;
  },
  atualizarProcedimento: async (id: string, payload: { nome: string; duracaoMin: number; bufferMin: number }) => {
    await api.put(`/admin/procedimentos/${id}`, payload);
  },
  removerProcedimento: async (id: string) => {
    await api.delete(`/admin/procedimentos/${id}`);
  },
};

export const PublicAPI = {
  slots: async (dentistaId: string, procedimentoId: string, dataISO: string) => {
    const r = await api.get("/public/slots", { params: { dentistaId, procedimentoId, data: dataISO } });
    return Array.isArray(r.data) ? r.data : [];
  },
  criarConsulta: async (dto: any) => {
    const r = await api.post("/public/consultas", dto);
    return r.data as string;
  },
};
