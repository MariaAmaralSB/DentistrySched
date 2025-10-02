import axios from "axios";
const api = axios.create({ baseURL: import.meta.env.VITE_API });
export default api;

export type AgendaDiaItem = {
  id: string;
  inicio: string;   
  fim: string;      
  status: number;

  dentistaId: string;
  dentistaNome: string;

  pacienteId: string;
  pacienteNome: string;

  procedimentoId: string;
  procedimentoNome: string;

  hora: string; 
};

export const AdminAPI = {
  dentistas: async () => {
    const r = await api.get("/admin/dentistas");
    return Array.isArray(r.data) ? r.data : [];
  },
  procedimentos: async () => {
    const r = await api.get("/admin/procedimentos");
    return Array.isArray(r.data) ? r.data : [];
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

  agendaDoDia: async (dataISO: string, dentistaId?: string) => {
    const params: any = { data: dataISO };
    if (dentistaId) params.dentistaId = dentistaId;
    const r = await api.get<AgendaDiaItem[]>("/admin/consultas", { params });
    return Array.isArray(r.data) ? r.data : [];
  },

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

  agendaMes: async (dentistaId: string, ano: number, mes: number, procedimentoId?: string) => {
    if (!dentistaId) return [];

    const params: any = { dentistaId, ano, mes };
    if (procedimentoId) params.procedimentoId = procedimentoId;

    try {
      const r = await api.get("/admin/agenda-mes", { params });
      return Array.isArray(r.data) ? r.data : [];
    } catch (err) {
      console.error("Erro ao buscar agenda do mês:", err);
      return [];
    }
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
