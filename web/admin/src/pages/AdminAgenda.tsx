import { useEffect, useMemo, useRef, useState } from "react";
import { AdminAPI, DiaMesStatus, ExcecaoDia } from "../api/client";
import RetornoModal from "../components/RetornoModal";

/* ===================== Tipos ===================== */
type Dentista = { id: string; nome: string; cro?: string };
type DiaResumo = { dia: number };

const nomesDias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const nomesDiasLongos = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];
const primeiroDiaSemana = (y: number, m: number) => new Date(y, m - 1, 1).getDay();
const qtdeDiasNoMes = (y: number, m: number) => new Date(y, m, 0).getDate();
const isoDate = (y: number, m: number, d: number) =>
  `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const formatISOToBR = (iso: string) => {
  const [yy, mm, dd] = iso.split("-");
  return `${dd}/${mm}/${yy}`;
};

type AgendaItem = {
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
};

type RegraSemana = {
  diaSemana: number;
  inicioManha?: string | null;
  fimManha?: string | null;
  inicioTarde?: string | null;
  fimTarde?: string | null;
};

const vazioRegra = (diaSemana: number): RegraSemana => ({
  diaSemana,
  inicioManha: null,
  fimManha: null,
  inicioTarde: null,
  fimTarde: null,
});

/* ===================== Ícones inline ===================== */
const Icon = {
  ChevronLeft: (p: any) => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  ),
  ChevronRight: (p: any) => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  ),
  Settings: (p: any) => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.33 1.82l.02.07a2 2 0 1 1-3.38 0l.02-.07A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.82-1l-.07.02a2 2 0 1 1 0-3.38l.07.02a1.65 1.65 0 0 0 1.82-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6c.35 0 .69-.12.96-.33.27-.21.49-.5.6-1l.02-.07a2 2 0 1 1 3.38 0l-.02.07c-.1.5-.33.79-.6 1-.27.21-.6.33-.96.33" />
    </svg>
  ),
  Calendar: (p: any) => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  ),
  Sun: (p: any) => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  ),
  Sunset: (p: any) => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path d="M17 18a5 5 0 1 0-10 0" />
      <path d="M12 9V2M4 18h16" />
    </svg>
  ),
  Clock: (p: any) => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
};

/* ===================== UI helpers ===================== */
function IconButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="inline-grid place-items-center w-9 h-9 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
    >
      {children}
    </button>
  );
}

function Legend({ color, children }: { color: "slate" | "amber" | "rose"; children: React.ReactNode }) {
  const map: Record<string, string> = {
    slate: "bg-slate-100 text-slate-700 border-slate-200",
    amber: "bg-amber-100 text-amber-800 border-amber-200",
    rose: "bg-rose-100 text-rose-800 border-rose-200",
  };
  return <span className={`px-2 py-0.5 rounded-full text-[11px] border ${map[color]}`}>{children}</span>;
}

/* ===================== Página ===================== */
export default function AdminAgenda() {
  const [dentistas, setDentistas] = useState<Dentista[]>([]);
  const [dentistaId, setDentistaId] = useState("");
  const dentistaIdVal = dentistaId || dentistas[0]?.id || "";

  useEffect(() => {
    (async () => {
      const ds = await AdminAPI.dentistas();
      setDentistas(ds);
      if (!dentistaId && ds.length) setDentistaId(ds[0].id);
    })();
  }, []);

  const [regras, setRegras] = useState<RegraSemana[]>(Array.from({ length: 7 }, (_, d) => vazioRegra(d)));
  const [salvandoRegras, setSalvandoRegras] = useState(false);
  const [view, setView] = useState<"horarios" | "calendario">("horarios");

  // carregar regras
  useEffect(() => {
    (async () => {
      if (!dentistaIdVal) return;
      const r = await AdminAPI.getAgendaRegras(dentistaIdVal);
      const base = Array.from({ length: 7 }, (_, d) => vazioRegra(d));
      for (const it of (r as any[]) ?? []) {
        const d = (it?.diaSemana ?? 0) as number;
        if (d >= 0 && d <= 6) {
          base[d] = {
            diaSemana: d,
            inicioManha: it.inicioManha ?? null,
            fimManha: it.fimManha ?? null,
            inicioTarde: it.inicioTarde ?? null,
            fimTarde: it.fimTarde ?? null,
          };
        }
      }
      setRegras(base);
    })();
  }, [dentistaIdVal]);

  const setHora = (dia: number, campo: keyof RegraSemana, val: string) =>
    setRegras((prev) => prev.map((r) => (r.diaSemana === dia ? { ...r, [campo]: val || null } : r)));

  const aplicarATodos = (de: number) => {
    const ref = regras.find((x) => x.diaSemana === de)!;
    setRegras((prev) =>
      prev.map((r) =>
        r.diaSemana === de
          ? r
          : {
              ...r,
              inicioManha: ref.inicioManha,
              fimManha: ref.fimManha,
              inicioTarde: ref.inicioTarde,
              fimTarde: ref.fimTarde,
            }
      )
    );
  };

  const salvarRegras = async () => {
    if (!dentistaIdVal) return;
    setSalvandoRegras(true);
    try {
      const payload = regras
        .filter((r) => (r.inicioManha && r.fimManha) || (r.inicioTarde && r.fimTarde))
        .map((r) => ({
          diaSemana: r.diaSemana,
          inicioManha: r.inicioManha ?? null,
          fimManha: r.fimManha ?? null,
          inicioTarde: r.inicioTarde ?? null,
          fimTarde: r.fimTarde ?? null,
        }));
      await AdminAPI.salvarAgendaRegras(dentistaIdVal, payload);
    } finally {
      setSalvandoRegras(false);
    }
  };

  /* ===== Calendário ===== */
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth() + 1);

  const cells: Array<null | DiaResumo> = useMemo(() => {
    const ini = primeiroDiaSemana(ano, mes);
    const dias = qtdeDiasNoMes(ano, mes);
    const arr: Array<null | DiaResumo> = [];
    for (let i = 0; i < ini; i++) arr.push(null);
    for (let d = 1; d <= dias; d++) arr.push({ dia: d });
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [ano, mes]);

  const mudarMes = (delta: number) => {
    const d = new Date(ano, mes - 1, 1);
    d.setMonth(d.getMonth() + delta);
    setAno(d.getFullYear());
    setMes(d.getMonth() + 1);
  };

  const [mesStatus, setMesStatus] = useState<DiaMesStatus[]>([]);
  useEffect(() => {
    (async () => {
      if (!dentistaIdVal) return;
      const data = await AdminAPI.agendaMesStatus(dentistaIdVal, ano, mes);
      setMesStatus(data);
    })();
  }, [dentistaIdVal, ano, mes]);

  const statusMap = useMemo(() => {
    const m = new Map<number, DiaMesStatus>();
    for (const d of mesStatus) m.set(d.dia, d);
    return m;
  }, [mesStatus]);

  const statusClass = (dia: number) => {
    const s = statusMap.get(dia)?.status;
    if (s === 1) return "bg-rose-50/70 border-rose-100";
    if (s === 2) return "bg-amber-50/70 border-amber-100";
    return "bg-slate-50/70 border-slate-100";
  };
  const statusTitle = (dia: number) => {
    const s = statusMap.get(dia);
    if (!s) return undefined;
    const label = s.status === 1 ? "Fechado" : s.status === 2 ? "Aberto parcialmente" : "Aberto";
    return s.motivo ? `${label} • ${s.motivo}` : label;
  };

  const [diaSelecionado, setDiaSelecionado] = useState<number | undefined>();
  const [diaData, setDiaData] = useState<AgendaItem[]>([]);
  const [loadingDia, setLoadingDia] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const carregarDia = async (d: number) => {
    if (!dentistaIdVal) return;
    setDiaSelecionado(d);
    setLoadingDia(true);
    setDiaData([]);
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const dataISO = isoDate(ano, mes, d);
      const items = await AdminAPI.agendaDoDia(dataISO, dentistaIdVal);
      setDiaData(items as AgendaItem[]);
    } finally {
      setLoadingDia(false);
    }
  };

  /* ===== Exceção/abertura de dia ===== */
  const [showModal, setShowModal] = useState(false);
  const [ex, setEx] = useState<ExcecaoDia | null>(null);

  const abrirModalDia = async (d: number) => {
    const dataISO = isoDate(ano, mes, d);
    setShowModal(true);
    setDiaSelecionado(d);
    setDiaData([]);

    const novo: ExcecaoDia = {
      dentistaId: dentistaIdVal,
      data: dataISO,
      fechadoDiaTodo: false,
      abrirManhaDe: null,
      abrirManhaAte: null,
      abrirTardeDe: null,
      abrirTardeAte: null,
      motivo: null,
    };
    setEx(novo);

    try {
      await carregarDia(d);
      const atual = await AdminAPI.getExcecaoDia(dentistaIdVal, dataISO);
      if (atual) setEx(atual);
    } catch {}
  };

  const salvarExcecao = async () => {
    if (!ex) return;
    await AdminAPI.salvarExcecaoDia(ex);
    const s = await AdminAPI.agendaMesStatus(dentistaIdVal, ano, mes);
    setMesStatus(s);
    setShowModal(false);
  };

  const limparExcecao = async () => {
    if (!ex) return;
    await AdminAPI.removerExcecaoDia(ex.dentistaId, ex.data);
    const s = await AdminAPI.agendaMesStatus(dentistaIdVal, ano, mes);
    setMesStatus(s);
    setShowModal(false);
  };

  const setPresetEx = (qual: "manha" | "tarde" | "comercial") => {
    if (!ex) return;
    const novo = { ...ex };
    if (qual === "manha" || qual === "comercial") {
      novo.abrirManhaDe = "08:00";
      novo.abrirManhaAte = "12:00";
    } else {
      novo.abrirManhaDe = null;
      novo.abrirManhaAte = null;
    }
    if (qual === "tarde" || qual === "comercial") {
      novo.abrirTardeDe = "14:00";
      novo.abrirTardeAte = "18:00";
    } else if (qual === "manha") {
      novo.abrirTardeDe = null;
      novo.abrirTardeAte = null;
    }
    setEx(novo);
  };

  /* ===== Retorno ===== */
  const [retOpen, setRetOpen] = useState(false);
  const [retConsulta, setRetConsulta] = useState<AgendaItem | null>(null);
  function abrirRetorno(c: AgendaItem) {
    setRetConsulta(c);
    setRetOpen(true);
  }

  /* ===================== UI ===================== */
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="px-4 sm:px-6 md:px-8 py-6 bg-gradient-to-br from-slate-50 to-blue-50/60 border-b border-slate-200/60">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              <span className="text-slate-800">Controle de </span>
              <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">Agenda</span>
            </h1>
            <p className="text-slate-500 mt-1">Configure horários e gerencie a agenda dos profissionais</p>
          </div>

          <div className="flex items-center gap-3">
            <select
              className="border border-slate-200 rounded-xl px-3 py-2 min-w-[220px] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              value={dentistaIdVal}
              onChange={(e) => setDentistaId(e.target.value)}
            >
              {dentistas.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nome}
                  {d.cro ? ` • CRO ${d.cro}` : ""}
                </option>
              ))}
            </select>

            <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
              <button
                onClick={() => setView("horarios")}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                  view === "horarios" ? "bg-violet-600 text-white" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Icon.Clock /> Horários
              </button>
              <button
                onClick={() => setView("calendario")}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                  view === "calendario" ? "bg-violet-600 text-white" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Icon.Calendar /> Calendário
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Conteúdo */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-6 space-y-6">
        {view === "horarios" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 grid place-items-center rounded-xl bg-violet-600 text-white shadow">
                  <Icon.Settings />
                </div>
                <div>
                  <div className="font-semibold text-slate-800 text-lg">Regras Semanais</div>
                  <div className="text-sm text-slate-500">Configure os horários de funcionamento</div>
                </div>
              </div>

              <button
                onClick={salvarRegras}
                disabled={salvandoRegras}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow disabled:opacity-60"
              >
                {salvandoRegras ? "Salvando..." : "Salvar regras"}
              </button>
            </div>

            {regras.map((r) => (
              <div key={r.diaSemana} className="mb-3 border rounded-2xl p-4 bg-slate-50/40">
                <div className="font-medium text-slate-800 mb-2">{nomesDiasLongos[r.diaSemana]}</div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-sm text-slate-700">
                    <Icon.Sun className="text-amber-500" /> Manhã
                  </span>
                  <input
                    type="time"
                    className="border rounded-xl px-3 py-2 w-28"
                    value={r.inicioManha ?? ""}
                    onChange={(e) => setHora(r.diaSemana, "inicioManha", e.target.value)}
                  />
                  <span className="text-slate-400">às</span>
                  <input
                    type="time"
                    className="border rounded-xl px-3 py-2 w-28"
                    value={r.fimManha ?? ""}
                    onChange={(e) => setHora(r.diaSemana, "fimManha", e.target.value)}
                  />

                  <span className="inline-flex items-center gap-1 text-sm text-slate-700 ml-4">
                    <Icon.Sunset className="text-orange-600" /> Tarde
                  </span>
                  <input
                    type="time"
                    className="border rounded-xl px-3 py-2 w-28"
                    value={r.inicioTarde ?? ""}
                    onChange={(e) => setHora(r.diaSemana, "inicioTarde", e.target.value)}
                  />
                  <span className="text-slate-400">às</span>
                  <input
                    type="time"
                    className="border rounded-xl px-3 py-2 w-28"
                    value={r.fimTarde ?? ""}
                    onChange={(e) => setHora(r.diaSemana, "fimTarde", e.target.value)}
                  />

                  <button
                    className="ml-auto text-sm border rounded-xl px-3 py-1.5 hover:bg-white"
                    onClick={() => aplicarATodos(r.diaSemana)}
                    title="Aplicar os horários deste dia a todos os outros dias"
                  >
                    Aplicar a todos
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {view === "calendario" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="font-semibold text-slate-800">Agenda do Mês</div>
                <div className="hidden sm:flex items-center gap-2 text-xs">
                  <Legend color="slate">Aberto</Legend>
                  <Legend color="amber">Parcial</Legend>
                  <Legend color="rose">Fechado</Legend>
                </div>
              </div>
              <div className="flex gap-2 items-center">
                <IconButton title="Mês anterior" onClick={() => mudarMes(-1)}>
                  <Icon.ChevronLeft />
                </IconButton>
                <span className="min-w-[180px] text-center font-medium text-slate-700 capitalize">
                  {new Date(ano, mes - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                </span>
                <IconButton title="Próximo mês" onClick={() => mudarMes(1)}>
                  <Icon.ChevronRight />
                </IconButton>
              </div>
            </div>

            <div className="p-4 grid grid-cols-7 gap-2 text-sm">
              {nomesDias.map((h) => (
                <div key={h} className="text-center font-medium text-slate-500 py-1">
                  {h}
                </div>
              ))}

              {cells.map((c, idx) =>
                c === null ? (
                  <div key={idx} className="border border-dashed border-slate-100 rounded-xl h-24" />
                ) : (
                  <button
                    key={idx}
                    onClick={() => abrirModalDia(c.dia)}
                    className={`text-left border rounded-xl h-24 p-2 transition ${statusClass(
                      c.dia
                    )} hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                    title={statusTitle(c.dia)}
                  >
                    <div className="text-xs font-semibold mb-1">{c.dia}</div>
                    <div className="text-[11px] text-gray-500">Clique para abrir/editar</div>
                  </button>
                )
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODAL EXCEÇÃO DO DIA */}
      {showModal && ex && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow w-full max-w-3xl p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-lg font-semibold">Abrir agenda — {formatISOToBR(ex.data)}</div>
              <button className="border rounded-lg px-3 py-1 hover:bg-slate-50" onClick={() => setShowModal(false)}>
                Fechar
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!ex.fechadoDiaTodo}
                    onChange={(e) => setEx({ ...ex, fechadoDiaTodo: e.target.checked })}
                  />
                  Fechar dia todo
                </label>
                <span className="text-xs text-gray-500">(ignora horários abaixo)</span>
              </div>

              <div className="flex flex-wrap gap-2">
                <button className="text-sm border rounded-lg px-3 py-1 hover:bg-slate-50" onClick={() => setPresetEx("manha")}>
                  Manhã 08–12
                </button>
                <button className="text-sm border rounded-lg px-3 py-1 hover:bg-slate-50" onClick={() => setPresetEx("tarde")}>
                  Tarde 14–18
                </button>
                <button
                  className="text-sm border rounded-lg px-3 py-1 hover:bg-slate-50"
                  onClick={() => setPresetEx("comercial")}
                >
                  Comercial 08–12 / 14–18
                </button>
                <button
                  className="text-sm border rounded-lg px-3 py-1 hover:bg-slate-50"
                  onClick={() =>
                    setEx({
                      ...ex,
                      abrirManhaDe: null,
                      abrirManhaAte: null,
                      abrirTardeDe: null,
                      abrirTardeAte: null,
                    })
                  }
                >
                  Limpar horários
                </button>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="border rounded-2xl p-3">
                  <div className="font-medium mb-2">Manhã</div>
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      className="border rounded-lg p-1 w-28"
                      value={ex.abrirManhaDe ?? ""}
                      onChange={(e) => setEx({ ...ex, abrirManhaDe: e.target.value || null })}
                    />
                    <span>–</span>
                    <input
                      type="time"
                      className="border rounded-lg p-1 w-28"
                      value={ex.abrirManhaAte ?? ""}
                      onChange={(e) => setEx({ ...ex, abrirManhaAte: e.target.value || null })}
                    />
                  </div>
                </div>

                <div className="border rounded-2xl p-3">
                  <div className="font-medium mb-2">Tarde</div>
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      className="border rounded-lg p-1 w-28"
                      value={ex.abrirTardeDe ?? ""}
                      onChange={(e) => setEx({ ...ex, abrirTardeDe: e.target.value || null })}
                    />
                    <span>–</span>
                    <input
                      type="time"
                      className="border rounded-lg p-1 w-28"
                      value={ex.abrirTardeAte ?? ""}
                      onChange={(e) => setEx({ ...ex, abrirTardeAte: e.target.value || null })}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Motivo (opcional)</label>
                <input
                  className="border rounded-xl w-full p-2"
                  value={ex.motivo ?? ""}
                  onChange={(e) => setEx({ ...ex, motivo: e.target.value })}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button className="border rounded-xl px-3 py-2 hover:bg-slate-50" onClick={limparExcecao}>
                  Remover exceção
                </button>
                <button className="rounded-xl px-3 py-2 bg-blue-600 text-white hover:bg-blue-700" onClick={salvarExcecao}>
                  Salvar
                </button>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">Consultas do dia</div>
                  {loadingDia && <div className="text-sm text-gray-500">Carregando…</div>}
                </div>

                {Array.isArray(diaData) && diaData.length > 0 ? (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {diaData.map((it) => (
                      <div
                        key={it.id}
                        className="flex items-center justify-between border rounded-2xl px-3 py-2 bg-gray-50 hover:bg-gray-100 transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-base font-semibold tabular-nums">
                            {new Date(it.inicio).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                          <div className="text-sm">
                            <div className="font-medium">{it.pacienteNome}</div>
                            <div className="text-gray-500">{it.procedimentoNome}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={
                              "text-[11px] px-2 py-0.5 rounded-full " +
                              (it.status ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700")
                            }
                            title={it.status ? "Ocupado" : "Livre"}
                          >
                            {it.status ? "ocupado" : "livre"}
                          </span>

                          <button
                            className="text-xs border rounded-lg px-2 py-1 hover:bg-white"
                            onClick={() => abrirRetorno(it)}
                            title="Agendar retorno para esta consulta"
                          >
                            Retorno
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-600">Nenhuma consulta.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE RETORNO */}
      <RetornoModal
        open={retOpen}
        consulta={
          retConsulta
            ? {
                id: retConsulta.id,
                dentistaId: retConsulta.dentistaId,
                dentistaNome: retConsulta.dentistaNome,
                procedimentoId: retConsulta.procedimentoId,
                procedimentoNome: retConsulta.procedimentoNome,
                inicio: retConsulta.inicio,
              }
            : null
        }
        onClose={(created) => {
          setRetOpen(false);
          setRetConsulta(null);
          if (created && diaSelecionado) carregarDia(diaSelecionado);
        }}
      />
    </div>
  );
}
