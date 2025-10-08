  import axios from "axios";

  const api = axios.create({ baseURL: import.meta.env.VITE_API });
  export default api;

  /** --------- Tipos “leves” usados no front ---------- */
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
    slots: ConsultaDia[];
  };

  export type AgendaDataView = {
    data: string;        // "yyyy-MM-dd"
    manhaDe?: string | null;  // "HH:mm"
    manhaAte?: string | null;
    tardeDe?: string | null;
    tardeAte?: string | null;
    observacao?: string | null;
  };

  export type AgendaDataUpsert = {
    data: string;             // "yyyy-MM-dd"
    manhaDe?: string | null;
    manhaAte?: string | null;
    tardeDe?: string | null;
    tardeAte?: string | null;
    observacao?: string | null;
  };

  /** Regras semanais */
  export type AgendaRegraUpsertDto = {
    diaSemana: number;            // 0..6 (Dom=0). Se vier 7, converto pra 0.
    inicioManha?: string | null;  // "HH:mm"
    fimManha?: string | null;
    inicioTarde?: string | null;
    fimTarde?: string | null;
  };

  /** Slots públicos */
  export type SlotDto = { horaISO: string };

  export const PublicAPI = {
    slots: async (dentistaId: string, procedimentoId: string, dataISO: string): Promise<SlotDto[]> => {
      const r = await api.get("/public/slots", { params: { dentistaId, procedimentoId, data: dataISO } });

      // o backend pode devolver [] direto OU { slots: [] }
      const raw = Array.isArray(r.data)
        ? r.data
        : (Array.isArray(r.data?.slots) ? r.data.slots : []);

      // tenta capturar vários nomes possíveis para o campo de hora
      const pickRawHora = (x: any) =>
        x?.horaISO ?? x?.HoraISO ?? x?.horaIso ??
        x?.inicioISO ?? x?.InicioISO ??
        x?.hora ?? x?.Hora ??
        x?.inicio ?? x?.Inicio ??
        (typeof x === "string" ? x : null);

      // garante que sempre vira ISO completo YYYY-MM-DDTHH:mm:ss
      const toISO = (data: string, t: string): string => {
        if (!t) return t;
        if (t.includes("T")) return t;              // já é ISO
        const hhmm = t.trim();
        if (/^\d{2}:\d{2}$/.test(hhmm)) return `${data}T${hhmm}:00`;
        return t; // fallback
      };

      return raw
        .map((item: any) => {
          const h = pickRawHora(item);
          if (!h) return null;
          return { horaISO: toISO(dataISO, h) } as SlotDto;
        })
        .filter(Boolean) as SlotDto[];
    },

    criarConsulta: async (dto: any) => {
      const r = await api.post("/public/consultas", dto);
      return r.data as string;
    },
  };

  /** ------- Admin ------- */
  const normalizaRegras = (regras: AgendaRegraUpsertDto[]) =>
    (regras ?? []).map(r => ({ ...r, diaSemana: r.diaSemana === 7 ? 0 : r.diaSemana }));

  export const AdminAPI = {
    dentistas: async () => {
      const r = await api.get("/admin/dentistas");
      return Array.isArray(r.data) ? r.data : [];
    },

    procedimentos: async () => {
      const r = await api.get("/admin/procedimentos");
      const d = r.data;
      // aceita os dois formatos: [] OU { items: [] }
      if (Array.isArray(d)) return d;
      if (Array.isArray(d?.items)) return d.items;
      return [];
    },

    // ---------- REGRAS SEMANAIS ----------
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

    // ---------- STATUS/AGENDA DO MÊS/DIA ----------
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
        const r = await api.get("/admin/agenda-excecao", { params: { dentistaId, data: dataISO } });
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
      await api.delete("/admin/agenda-excecao", { params: { dentistaId, data: dataISO } });
    },
    // Datas do mês (view)
    getAgendaDatas: async (dentistaId: string, ano: number, mes: number) => {
      if (!dentistaId) return [] as AgendaDataView[];
      const r = await api.get("/admin/agenda-datas", { params: { dentistaId, ano, mes } });
      return Array.isArray(r.data) ? (r.data as AgendaDataView[]) : [];
    },

    // Upsert em lote por data
    salvarAgendaDatas: async (dentistaId: string, dias: AgendaDataUpsert[]) => {
      await api.put(`/admin/agenda-datas/${dentistaId}`, dias);
    },

    // Remover uma data específica
    removerAgendaData: async (dentistaId: string, dataISO: string) => {
      const [y, m, d] = dataISO.split("-").map(Number);
      await api.delete(`/admin/agenda-datas/${dentistaId}/${y}-${m}-${d}`);
    },
  };