import axios from "axios";
const api = axios.create({ baseURL: import.meta.env.VITE_API });
export default api;

export const AdminAPI = {
  dentistas: () => api.get("/admin/dentistas").then(r => r.data),
  procedimentos: () => api.get("/admin/procedimentos").then(r => r.data),
};

export const PublicAPI = {
  slots: (dentistaId: string, procedimentoId: string, dataISO: string) =>
    api.get("/public/slots", { params: { dentistaId, procedimentoId, data: dataISO } }).then(r => r.data),
  criarConsulta: (dto: any) => api.post("/public/consultas", dto).then(r => r.data as string),
};