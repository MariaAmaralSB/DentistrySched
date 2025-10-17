import { useEffect, useMemo, useRef, useState } from "react";
import {
  AdminAPI,
  DiaMesStatus,
  ExcecaoDia,
  ConsultaDia,
  AgendaRegraUpsertDto,
} from "../api/client";

/** Tipos locais */
type Dentista = { id: string; nome: string; cro?: string };
type DiaResumo = { dia: number };

const nomesDias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const primeiroDiaSemana = (y: number, m: number) => new Date(y, m - 1, 1).getDay();
const qtdeDiasNoMes = (y: number, m: number) => new Date(y, m, 0).getDate();
const isoDate = (y: number, m: number, d: number) =>
  `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const formatISOToBR = (iso: string) => {
  const [yy, mm, dd] = iso.split("-");
  return `${dd}/${mm}/${yy}`;
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

export default function AdminAgenda() {
  // ---------------- Dentistas ----------------
  const [dentistas, setDentistas] = useState<Dentista[]>([]);
  const [dentistaId, setDentistaId] = useState("");
  const dentistaIdVal = dentistaId || dentistas[0]?.id || "";

  useEffect(() => {
    (async () => {
      const ds = await AdminAPI.dentistas();
      setDentistas(ds);
      if (!dentistaId && ds.length) setDentistaId(ds[0].id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------- Regras semanais ----------------
  const [regras, setRegras] = useState<RegraSemana[]>(
    Array.from({ length: 7 }, (_, d) => vazioRegra(d))
  );
  const [salvandoRegras, setSalvandoRegras] = useState(false);

  // estado de exibir/recolher (salvo no localStorage)
  const [showRegras, setShowRegras] = useState<boolean>(() => {
    const v = localStorage.getItem("agenda:showRegras");
    return v ? v === "1" : false;
  });
  useEffect(() => {
    localStorage.setItem("agenda:showRegras", showRegras ? "1" : "0");
  }, [showRegras]);

  // carrega regras existentes ao trocar de dentista
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

  const setHora = (d: number, campo: keyof RegraSemana, val: string) => {
    setRegras((prev) =>
      prev.map((r) => (r.diaSemana === d ? { ...r, [campo]: val || null } : r))
    );
  };

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
      const payload: AgendaRegraUpsertDto[] = regras
        .filter(
          (r) => (r.inicioManha && r.fimManha) || (r.inicioTarde && r.fimTarde)
        )
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

  // ---------------- Mês / calendário ----------------
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
    setDiaSelecionado(undefined);
    setDiaData([]);
  };

  // ---------------- Status leve do mês ----------------
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

  // ---------------- Dia selecionado / slots ----------------
  const [diaSelecionado, setDiaSelecionado] = useState<number | undefined>();
  const [diaData, setDiaData] = useState<ConsultaDia[] | any>([]);
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
      const resp = await AdminAPI.agendaDia(dentistaIdVal, dataISO);
      const slots = Array.isArray((resp as any)?.slots)
        ? (resp as any).slots
        : Array.isArray(resp)
        ? resp
        : [];
      setDiaData(slots);
    } finally {
      setLoadingDia(false);
    }
  };

  // ---------------- Modal de exceção ----------------
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

  const statusClass = (dia: number) => {
    const s = statusMap.get(dia)?.status;
    if (s === 1) return "bg-rose-50 border-rose-100";
    if (s === 2) return "bg-amber-50 border-amber-100";
    return "bg-slate-50 border-slate-100";
  };
  const statusTitle = (dia: number) => {
    const s = statusMap.get(dia);
    if (!s) return undefined;
    const label =
      s.status === 1 ? "Fechado" : s.status === 2 ? "Aberto parcialmente" : "Aberto";
    return s.motivo ? `${label} • ${s.motivo}` : label;
  };

  // =======================================================================
  // RENDER
  // =======================================================================
  return (
    <div className="space-y-6 text-slate-800">
      {/* HEADER */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Controle de Agenda</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Defina janelas padrão e abra dias específicos.
          </p>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Dentista</label>
          <select
            className="border border-slate-200 rounded-lg p-2 min-w-[240px] bg-white focus:outline-none focus:ring-2 focus:ring-slate-200"
            value={dentistaIdVal}
            onChange={(e) => {
              setDentistaId(e.target.value);
              setDiaSelecionado(undefined);
              setDiaData([]);
            }}
          >
            {dentistas.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nome}
                {d.cro ? ` • CRO ${d.cro}` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* REGRAS SEMANAIS (colapsável) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={() => setShowRegras((v) => !v)}
            className="group inline-flex items-center gap-3"
            aria-expanded={showRegras}
            aria-controls="regras-semanais-body"
            title={showRegras ? "Recolher regras semanais" : "Expandir regras semanais"}
          >
            <span
              className="inline-flex size-6 items-center justify-center rounded-lg border border-slate-200 text-slate-600
                         group-hover:bg-slate-50 transition"
            >
              {showRegras ? "–" : "+"}
            </span>
            <span className="font-medium">Regras semanais (manhã/tarde)</span>
            {!showRegras && (
              <span className="ml-2 text-xs text-slate-500">
                (opcional • use o calendário abaixo para abrir dias específicos)
              </span>
            )}
          </button>

          {showRegras && (
            <button
              className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-60"
              disabled={salvandoRegras}
              onClick={salvarRegras}
            >
              {salvandoRegras ? "Salvando..." : "Salvar regras"}
            </button>
          )}
        </div>

        <div
          id="regras-semanais-body"
          className={`grid grid-cols-1 gap-2 px-4 pb-4 transition duration-200 ${
            showRegras ? "opacity-100" : "opacity-0 hidden"
          }`}
        >
          {regras.map((r) => (
            <div
              key={r.diaSemana}
              className="flex flex-wrap items-center gap-3 border rounded-xl p-2 bg-slate-50/40"
            >
              <div className="w-16 font-medium">{nomesDias[r.diaSemana]}</div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Manhã</span>
                <input
                  type="time"
                  className="border rounded p-1"
                  value={r.inicioManha ?? ""}
                  onChange={(e) => setHora(r.diaSemana, "inicioManha", e.target.value)}
                />
                <span>–</span>
                <input
                  type="time"
                  className="border rounded p-1"
                  value={r.fimManha ?? ""}
                  onChange={(e) => setHora(r.diaSemana, "fimManha", e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Tarde</span>
                <input
                  type="time"
                  className="border rounded p-1"
                  value={r.inicioTarde ?? ""}
                  onChange={(e) => setHora(r.diaSemana, "inicioTarde", e.target.value)}
                />
                <span>–</span>
                <input
                  type="time"
                  className="border rounded p-1"
                  value={r.fimTarde ?? ""}
                  onChange={(e) => setHora(r.diaSemana, "fimTarde", e.target.value)}
                />
              </div>

              <button
                className="ml-auto text-sm border rounded px-2 py-1"
                title="Aplicar os horários deste dia a todos os outros dias"
                onClick={() => aplicarATodos(r.diaSemana)}
              >
                Aplicar a todos
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* CALENDÁRIO DO MÊS */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="font-medium">Agenda do mês</div>
          <div className="flex gap-2 items-center">
            <button
              className="px-2 py-1 border border-slate-200 rounded-md hover:bg-slate-50"
              onClick={() => mudarMes(-1)}
            >
              ◀
            </button>
            <span className="min-w-[160px] text-center text-slate-700">
              {new Date(ano, mes - 1, 1).toLocaleDateString("pt-BR", {
                month: "long",
                year: "numeric",
              })}
            </span>
            <button
              className="px-2 py-1 border border-slate-200 rounded-md hover:bg-slate-50"
              onClick={() => mudarMes(1)}
            >
              ▶
            </button>
          </div>
        </div>

        <div className="p-3 grid grid-cols-7 gap-2 text-sm">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((h) => (
            <div key={h} className="text-center font-medium text-slate-500 py-1">
              {h}
            </div>
          ))}

          {cells.map((c, idx) =>
            c === null ? (
              <div
                key={idx}
                className="border border-dashed border-slate-100 rounded-lg h-24"
              />
            ) : (
              <button
                key={idx}
                onClick={() => abrirModalDia(c.dia)}
                className={`text-left border rounded-lg h-24 p-2 transition ${statusClass(
                  c.dia
                )} hover:shadow-sm`}
                title={statusTitle(c.dia)}
              >
                <div className="text-xs font-semibold mb-1">{c.dia}</div>
                <div className="text-[11px] text-gray-500">Clique para abrir/editar</div>
              </button>
            )
          )}
        </div>
      </div>

      {/* MODAL EXCEÇÃO DO DIA */}
      {showModal && ex && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow w-full max-w-3xl p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-lg font-semibold">
                Abrir agenda — {formatISOToBR(ex.data)}
              </div>
              <button
                className="border rounded px-3 py-1"
                onClick={() => setShowModal(false)}
              >
                Fechar
              </button>
            </div>

            <div className="mt-3 space-y-4">
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!ex.fechadoDiaTodo}
                    onChange={(e) => setEx({ ...ex, fechadoDiaTodo: e.target.checked })}
                  />
                  Fechar dia todo
                </label>
                <span className="text-xs text-gray-500">
                  (ignora horários abaixo)
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  className="text-sm border rounded px-3 py-1"
                  onClick={() => setPresetEx("manha")}
                >
                  Manhã 08–12
                </button>
                <button
                  className="text-sm border rounded px-3 py-1"
                  onClick={() => setPresetEx("tarde")}
                >
                  Tarde 14–18
                </button>
                <button
                  className="text-sm border rounded px-3 py-1"
                  onClick={() => setPresetEx("comercial")}
                >
                  Comercial 08–12 / 14–18
                </button>
                <button
                  className="text-sm border rounded px-3 py-1"
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
                <div className="border rounded-xl p-3">
                  <div className="font-medium mb-2">Manhã</div>
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      className="border rounded p-1"
                      value={ex.abrirManhaDe ?? ""}
                      onChange={(e) =>
                        setEx({ ...ex, abrirManhaDe: e.target.value || null })
                      }
                    />
                    <span>–</span>
                    <input
                      type="time"
                      className="border rounded p-1"
                      value={ex.abrirManhaAte ?? ""}
                      onChange={(e) =>
                        setEx({ ...ex, abrirManhaAte: e.target.value || null })
                      }
                    />
                  </div>
                </div>

                <div className="border rounded-xl p-3">
                  <div className="font-medium mb-2">Tarde</div>
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      className="border rounded p-1"
                      value={ex.abrirTardeDe ?? ""}
                      onChange={(e) =>
                        setEx({ ...ex, abrirTardeDe: e.target.value || null })
                      }
                    />
                    <span>–</span>
                    <input
                      type="time"
                      className="border rounded p-1"
                      value={ex.abrirTardeAte ?? ""}
                      onChange={(e) =>
                        setEx({ ...ex, abrirTardeAte: e.target.value || null })
                      }
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Motivo (opcional)
                </label>
                <input
                  className="border rounded w-full p-2"
                  value={ex.motivo ?? ""}
                  onChange={(e) => setEx({ ...ex, motivo: e.target.value })}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button className="border rounded px-3 py-1" onClick={limparExcecao}>
                  Remover exceção
                </button>
                <button
                  className="border rounded px-3 py-1 bg-blue-600 text-white"
                  onClick={salvarExcecao}
                >
                  Salvar
                </button>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">Consultas do dia</div>
                  {loadingDia && (
                    <div className="text-sm text-gray-500">Carregando…</div>
                  )}
                </div>

                {Array.isArray(diaData) && diaData.length > 0 ? (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {diaData.map((it: ConsultaDia, idx: number) => (
                      <div
                        key={it.id ?? `${it.hora}-${idx}`}
                        className="flex items-center justify-between border rounded-xl px-3 py-2 bg-gray-50 hover:bg-gray-100 transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-base font-semibold tabular-nums">
                            {it.hora}
                          </div>
                          <div className="text-sm">
                            <div className="font-medium">{it.paciente}</div>
                            <div className="text-gray-500">{it.procedimento}</div>
                          </div>
                        </div>
                        <span
                          className={
                            "text-[11px] px-2 py-0.5 rounded-full " +
                            (it.status
                              ? "bg-red-100 text-red-700"
                              : "bg-emerald-100 text-emerald-700")
                          }
                          title={it.status ? "Ocupado" : "Livre"}
                        >
                          {it.status ? "ocupado" : "livre"}
                        </span>
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
    </div>
  );
}