// src/pages/AdminAgenda.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { AdminAPI, DiaMesStatus, ExcecaoDia, ConsultaDia } from "../api/client";

type Dentista = { id: string; nome: string; cro?: string };
type DiaResumo = { dia: number };

const nomesDias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const primeiroDiaSemana = (y: number, m: number) => new Date(y, m - 1, 1).getDay();
const qtdeDiasNoMes     = (y: number, m: number) => new Date(y, m, 0).getDate();
const isoDate = (y: number, m: number, d: number) => {
  const mm = String(m).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}; 
const formatISOToBR = (iso: string) => {
  const [yy, mm, dd] = iso.split("-");
  return `${dd}/${mm}/${yy}`;
};

export default function AdminAgenda() {
  // ---- dentistas
  const [dentistas, setDentistas] = useState<Dentista[]>([]);
  const [dentistaId, setDentistaId] = useState("");
  useEffect(() => {
    let alive = true;
    (async () => {
      const ds = await AdminAPI.dentistas();
      if (!alive) return;
      setDentistas(ds);
      if (!dentistaId && ds.length) setDentistaId(ds[0].id);
    })();
    return () => { alive = false; };
  }, []);
  const dentistaIdVal = dentistaId || dentistas[0]?.id || "";

  // ---- mês visível (leve)
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

  // ---- status leve do mês
  const [mesStatus, setMesStatus] = useState<DiaMesStatus[]>([]);
  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!dentistaIdVal) return;
      const data = await AdminAPI.agendaMesStatus(dentistaIdVal, ano, mes);
      if (!cancel) setMesStatus(data);
    })();
    return () => { cancel = true; };
  }, [dentistaIdVal, ano, mes]);

  const statusMap = useMemo(() => {
    const m = new Map<number, DiaMesStatus>();
    for (const d of mesStatus) m.set(d.dia, d);
    return m;
  }, [mesStatus]);

  // ---- detalhe do dia (consultas) sob demanda
  const [diaSelecionado, setDiaSelecionado] = useState<number | undefined>();
  const [loadingDia, setLoadingDia] = useState(false);
  const [diaData, setDiaData] = useState<ConsultaDia[] | any>([]);
  const abortRef = useRef<AbortController | null>(null);

  const carregarDia = async (d: number) => {
    if (!dentistaIdVal) return;

    setDiaSelecionado(d);
    setLoadingDia(true);
    setDiaData([]);

    // cancela requisição anterior
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const dataISO = isoDate(ano, mes, d);
      const resp = await AdminAPI.agendaDia(dentistaIdVal, dataISO /*, ac.signal*/);

      // Pode vir { slots: [...] } OU um array direto
      const slots = Array.isArray(resp?.slots) ? resp.slots : (Array.isArray(resp) ? resp : []);
      setDiaData(slots);
    } catch (err) {
      console.error("Erro ao carregar dia:", err);
      setDiaData([]);
    } finally {
      setLoadingDia(false);
    }
  };
  useEffect(() => () => abortRef.current?.abort(), []);

  // ---- modal de exceção do dia
  const [showModal, setShowModal] = useState(false);
  const [ex, setEx] = useState<ExcecaoDia | null>(null);

  const abrirModalDia = (d: number) => {
    // Abre o modal imediatamente
    setShowModal(true);

    // Estado inicial para o modal (mostra o layout na hora)
    const dataISO = isoDate(ano, mes, d);
    setDiaSelecionado(d);
    setDiaData([]);
    setEx({
      dentistaId: dentistaIdVal,
      data: dataISO,
      fechadoDiaTodo: false,
      abrirManhaDe: null,
      abrirManhaAte: null,
      abrirTardeDe: null,
      abrirTardeAte: null,
      motivo: null,
    });

    // Carrega em background
    (async () => {
      try {
        await carregarDia(d);
      } catch (e) {
        console.error("Erro ao carregar slots do dia:", e);
      }
      try {
        const atual = await AdminAPI.getExcecaoDia(dentistaIdVal, dataISO);
        if (atual) setEx(atual);
      } catch (e) {
        console.error("Erro ao carregar exceção do dia:", e);
        // mantém ex default
      }
    })();
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

  // ---- helpers visuais
  const statusClass = (dia: number) => {
    const s = statusMap.get(dia)?.status;
    if (s === 1) return "bg-red-50 border-red-200";
    if (s === 2) return "bg-amber-50 border-amber-200";
    return "bg-gray-50";
  };
  const statusTitle = (dia: number) => {
    const s = statusMap.get(dia);
    if (!s) return undefined;
    const label = s.status === 1 ? "Fechado" : s.status === 2 ? "Aberto parcialmente" : "Aberto";
    return s.motivo ? `${label} • ${s.motivo}` : label;
  };

  // ---- presets
  const setPreset = (qual: "manha"|"tarde"|"comercial") => {
    if (!ex) return;
    const novo = { ...ex };
    if (qual === "manha" || qual === "comercial") {
      novo.abrirManhaDe = "08:00"; novo.abrirManhaAte = "12:00";
    } else {
      novo.abrirManhaDe = null; novo.abrirManhaAte = null;
    }
    if (qual === "tarde" || qual === "comercial") {
      novo.abrirTardeDe = "14:00"; novo.abrirTardeAte = "18:00";
    } else if (qual === "manha") {
      novo.abrirTardeDe = null; novo.abrirTardeAte = null;
    }
    setEx(novo);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Controle de Agenda</h1>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Dentista</label>
          <select
            className="border rounded-lg p-2 min-w-[240px]"
            value={dentistaIdVal}
            onChange={(e) => {
              setDentistaId(e.target.value);
              setDiaSelecionado(undefined);
              setDiaData([]);
            }}
          >
            {dentistas.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nome}{d.cro ? ` • CRO ${d.cro}` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Card Agenda do mês */}
      <div className="bg-white rounded-2xl shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-medium">Agenda do mês</div>
          <div className="flex gap-2 items-center">
            <button className="px-2 py-1 border rounded" onClick={() => mudarMes(-1)}>◀</button>
            <span className="min-w-[140px] text-center">
              {new Date(ano, mes - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
            </span>
            <button className="px-2 py-1 border rounded" onClick={() => mudarMes(1)}>▶</button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 text-sm">
          {nomesDias.map((h) => (
            <div key={h} className="text-center font-medium text-gray-600 py-1">{h}</div>
          ))}
          {cells.map((c, idx) =>
            c === null ? (
              <div key={idx} className="border rounded-xl h-24 bg-gray-50" />
            ) : (
              <button
                key={idx}
                onClick={() => abrirModalDia(c.dia)}
                className={`text-left border rounded-xl h-24 p-2 transition ${statusClass(c.dia)}`}
                title={statusTitle(c.dia)}
              >
                <div className="text-xs font-semibold mb-1">{c.dia}</div>
                <div className="text-[11px] text-gray-500">Clique para abrir/editar</div>
              </button>
            )
          )}
        </div>
      </div>

      {/* Modal de edição do dia */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow w-full max-w-2xl p-4">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">
                  {ex ? (
                    <>Abrir agenda — {formatISOToBR(ex.data)}</>
                  ) : (
                    <>Abrir agenda — Carregando…</>
                  )}
              </div>
              <button className="border rounded px-3 py-1" onClick={() => setShowModal(false)}>Fechar</button>
            </div>

            {!ex ? (
              <div className="p-6 text-gray-600">Carregando dia…</div>
            ) : (
              <div className="mt-3 space-y-3">
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
                  <button className="text-sm border rounded px-3 py-1" onClick={() => setPreset("manha")}>Manhã 08–12</button>
                  <button className="text-sm border rounded px-3 py-1" onClick={() => setPreset("tarde")}>Tarde 14–18</button>
                  <button className="text-sm border rounded px-3 py-1" onClick={() => setPreset("comercial")}>Comercial 08–12 / 14–18</button>
                  <button className="text-sm border rounded px-3 py-1" onClick={() => setEx({ ...ex, abrirManhaDe: null, abrirManhaAte: null, abrirTardeDe: null, abrirTardeAte: null })}>Limpar horários</button>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="border rounded-xl p-3">
                    <div className="font-medium mb-2">Manhã</div>
                    <div className="flex items-center gap-2">
                      <input type="time" className="border rounded p-1" value={ex.abrirManhaDe ?? ""} onChange={e => setEx({ ...ex, abrirManhaDe: e.target.value || null })} />
                      <span>–</span>
                      <input type="time" className="border rounded p-1" value={ex.abrirManhaAte ?? ""} onChange={e => setEx({ ...ex, abrirManhaAte: e.target.value || null })} />
                    </div>
                  </div>
                  <div className="border rounded-xl p-3">
                    <div className="font-medium mb-2">Tarde</div>
                    <div className="flex items-center gap-2">
                      <input type="time" className="border rounded p-1" value={ex.abrirTardeDe ?? ""} onChange={e => setEx({ ...ex, abrirTardeDe: e.target.value || null })} />
                      <span>–</span>
                      <input type="time" className="border rounded p-1" value={ex.abrirTardeAte ?? ""} onChange={e => setEx({ ...ex, abrirTardeAte: e.target.value || null })} />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">Motivo (opcional)</label>
                  <input
                    className="border rounded w-full p-2"
                    value={ex.motivo ?? ""}
                    onChange={(e) => setEx({ ...ex, motivo: e.target.value })}
                  />
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button className="border rounded px-3 py-1" onClick={limparExcecao}>Remover exceção</button>
                  <button className="border rounded px-3 py-1 bg-blue-600 text-white" onClick={salvarExcecao}>Salvar</button>
                </div>

                {/* Detalhes do dia (consultas) */}
                <div className="border-t pt-3 mt-2">
                  <div className="font-medium mb-1">Consultas do dia</div>
                  {loadingDia ? (
                    <div className="text-gray-600">Carregando...</div>
                  ) : (() => {
                    const safe: ConsultaDia[] = Array.isArray(diaData) ? diaData : [];
                    if (safe.length === 0) return <div className="text-gray-600">Nenhuma consulta.</div>;
                    return (
                      <ul className="space-y-2">
                        {safe.map((it) => (
                          <li key={it.id} className="bg-gray-50 rounded px-3 py-2 flex items-center justify-between">
                            <div className="text-sm">
                              <b>{it.hora}</b> — {it.paciente} <span className="text-gray-500">({it.procedimento})</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
