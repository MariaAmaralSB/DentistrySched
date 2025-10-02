import { useEffect, useMemo, useState } from "react";
import { AdminAPI } from "../api/client";

type Dentista = { id: string; nome: string; cro?: string };
type Dia = 0 | 1 | 2 | 3 | 4 | 5 | 6;

type Regra = {
  diaSemana: Dia;
  inicioManha?: string | null;
  fimManha?: string | null;
  inicioTarde?: string | null;
  fimTarde?: string | null;
};

const nomesDias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function AdminAgenda() {
  const [dentistas, setDentistas] = useState<Dentista[]>([]);
  const [dentistaId, setDentistaId] = useState<string>("");

  // Semana
  const semanaVazia: Regra[] = useMemo(
    () => [0, 1, 2, 3, 4, 5, 6].map((d) => ({ diaSemana: d as Dia })),
    []
  );
  const [regras, setRegras] = useState<Regra[]>(semanaVazia);
  const [loadingRegras, setLoadingRegras] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Mês
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth() + 1); // 1..12
  const [diasMes, setDiasMes] = useState<
    { dia: number; fechado: boolean; livres: number; ocupados: number; total: number; motivo?: string | null }[]
  >([]);
  const [loadingMes, setLoadingMes] = useState(false);

  // Carrega dentistas
  useEffect(() => {
    AdminAPI.dentistas().then(setDentistas);
  }, []);

  // Seleciona automático o primeiro dentista quando carregar
  useEffect(() => {
    if (!dentistaId && dentistas.length > 0) {
      setDentistaId(dentistas[0].id);
    }
  }, [dentistas, dentistaId]);

  // Carrega REGRAS da semana
  useEffect(() => {
    const load = async () => {
      if (!dentistaId) return;
      setLoadingRegras(true);
      try {
        const r = await AdminAPI.getAgendaRegras(dentistaId);
        const map = new Map<number, Regra>();
        r.forEach((x: any) => {
          map.set(x.diaSemana, {
            diaSemana: x.diaSemana as Dia,
            inicioManha: x.inicioManha ?? null,
            fimManha: x.fimManha ?? null,
            inicioTarde: x.inicioTarde ?? null,
            fimTarde: x.fimTarde ?? null,
          });
        });
        const full = [0, 1, 2, 3, 4, 5, 6].map(
          (d) => map.get(d) ?? { diaSemana: d as Dia }
        );
        setRegras(full);
      } finally {
        setLoadingRegras(false);
      }
    };
    load();
  }, [dentistaId]);

  // Carrega AGENDA DO MÊS  (*** corrigido: usa AdminAPI.agendaMes ***)
  useEffect(() => {
    const loadMes = async () => {
      if (!dentistaId) return;
      setLoadingMes(true);
      try {
        const r = await AdminAPI.agendaMes(dentistaId, ano, mes);
        setDiasMes(r);
      } finally {
        setLoadingMes(false);
      }
    };
    loadMes();
  }, [dentistaId, ano, mes]);

  // Helpers semana
  const setCampo = (i: number, campo: keyof Regra, value: string | null) => {
    setRegras((prev) => {
      const novo = [...prev];
      (novo[i] as any)[campo] = value || null;
      return novo;
    });
  };

  const PRESETS = {
    manha: { inicio: "07:00", fim: "12:00" },
    tarde: { inicio: "14:00", fim: "18:00" },
    comercial: {
      manha: { inicio: "08:00", fim: "12:00" },
      tarde: { inicio: "14:00", fim: "18:00" },
    },
  } as const;

  const defaultFor = (campo: keyof Regra) =>
    campo === "inicioManha"
      ? "07:00"
      : campo === "fimManha"
      ? "12:00"
      : campo === "inicioTarde"
      ? "14:00"
      : "18:00";

  const onFocusAuto =
    (i: number, campo: keyof Regra) =>
    (e: React.FocusEvent<HTMLInputElement>) => {
      if (!e.currentTarget.value) setCampo(i, campo, defaultFor(campo));
    };

  const applyPresetWeek = (preset: "manha" | "tarde" | "comercial") => {
    setRegras((prev) =>
      prev.map((r) => {
        const n = { ...r };
        if (preset === "manha" || preset === "comercial") {
          const p =
            preset === "manha" ? PRESETS.manha : PRESETS.comercial.manha;
          n.inicioManha = p.inicio;
          n.fimManha = p.fim;
        }
        if (preset === "tarde" || preset === "comercial") {
          const p =
            preset === "tarde" ? PRESETS.tarde : PRESETS.comercial.tarde;
          n.inicioTarde = p.inicio;
          n.fimTarde = p.fim;
        }
        return n;
      })
    );
  };

  const clearWeek = (col: "manha" | "tarde" | "both") => {
    setRegras((prev) =>
      prev.map((r) => ({
        ...r,
        ...(col !== "tarde" ? { inicioManha: null, fimManha: null } : {}),
        ...(col !== "manha" ? { inicioTarde: null, fimTarde: null } : {}),
      }))
    );
  };

  const applyPresetDay = (i: number, col: "manha" | "tarde") => {
    setRegras((prev) => {
      const arr = [...prev];
      if (col === "manha") {
        arr[i].inicioManha = PRESETS.manha.inicio;
        arr[i].fimManha = PRESETS.manha.fim;
      } else {
        arr[i].inicioTarde = PRESETS.tarde.inicio;
        arr[i].fimTarde = PRESETS.tarde.fim;
      }
      return arr;
    });
  };

  const montarPayload = (lista: Regra[]) =>
    lista.map((r) => ({
      diaSemana: r.diaSemana,
      inicioManha: r.inicioManha || null,
      fimManha: r.fimManha || null,
      inicioTarde: r.inicioTarde || null,
      fimTarde: r.fimTarde || null,
    }));

  const salvarDias = async () => {
    if (!dentistaId) {
      alert("Selecione um dentista.");
      return;
    }
    setSalvando(true);
    try {
      const diasComHorario = regras.filter(
        (r) =>
          (r.inicioManha && r.fimManha) || (r.inicioTarde && r.fimTarde)
      );
      if (diasComHorario.length === 0) {
        alert("Preencha ao menos um período em algum dia para usar o POST.");
        return;
      }
      await AdminAPI.criarOuAtualizarDiasAgenda(
        dentistaId,
        montarPayload(diasComHorario)
      );
      alert("Dias atualizados!");
    } catch (e: any) {
      alert(e?.response?.data ?? "Erro ao salvar dias.");
    } finally {
      setSalvando(false);
    }
  };

  const salvarSemana = async () => {
    if (!dentistaId) {
      alert("Selecione um dentista.");
      return;
    }
    setSalvando(true);
    try {
      await AdminAPI.salvarAgendaRegras(dentistaId, montarPayload(regras));
      alert("Semana salva!");
    } catch (e: any) {
      alert(e?.response?.data ?? "Erro ao salvar semana.");
    } finally {
      setSalvando(false);
    }
  };

  // Helpers mês (calendário)
  const mudarMes = (delta: number) => {
    const d = new Date(ano, mes - 1, 1);
    d.setMonth(d.getMonth() + delta);
    setAno(d.getFullYear());
    setMes(d.getMonth() + 1);
  };
  const primeiroDiaSemana = (y: number, m: number) =>
    new Date(y, m - 1, 1).getDay(); // 0..6
  const qtdeDiasNoMes = (y: number, m: number) => new Date(y, m, 0).getDate();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Controle de Agenda</h1>

        <div>
          <label className="block text-xs text-gray-600 mb-1">Dentista</label>
          <select
            className="border rounded-lg p-2 min-w-[240px]"
            value={dentistaId}
            onChange={(e) => setDentistaId(e.target.value)}
          >
            <option value="">Selecione</option>
            {dentistas.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nome}
                {d.cro ? ` • CRO ${d.cro}` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Card Semana */}
      <div className="bg-white rounded-2xl shadow">
        {/* Toolbar semana */}
        <div className="p-4 border-b flex items-center justify-between gap-3 flex-wrap">
          <div className="font-medium">Semana</div>

          <div className="flex gap-2 items-center flex-wrap">
            <span className="text-xs text-gray-500 mr-1">Presets:</span>
            <button className="text-sm border rounded-lg px-3 py-1" onClick={() => applyPresetWeek("manha")}>
              Manhã 07–12
            </button>
            <button className="text-sm border rounded-lg px-3 py-1" onClick={() => applyPresetWeek("tarde")}>
              Tarde 14–18
            </button>
            <button className="text-sm border rounded-lg px-3 py-1" onClick={() => applyPresetWeek("comercial")}>
              Comercial 08–12 / 14–18
            </button>

            <span className="text-xs text-gray-500 mx-1">•</span>
            <button className="text-sm border rounded-lg px-3 py-1" onClick={() => clearWeek("both")}>
              Limpar tudo
            </button>

            <span className="text-xs text-gray-500 mx-1">•</span>
            <button
              onClick={salvarDias}
              disabled={!dentistaId || salvando}
              className="text-sm border rounded-lg px-3 py-1 disabled:opacity-50"
            >
              {salvando ? "Salvando..." : "Salvar dias (POST)"}
            </button>
            <button
              onClick={salvarSemana}
              disabled={!dentistaId || salvando}
              className="text-sm border rounded-lg px-3 py-1 disabled:opacity-50"
            >
              {salvando ? "Salvando..." : "Substituir semana (PUT)"}
            </button>
          </div>
        </div>

        {/* Tabela de regras */}
        {loadingRegras ? (
          <div className="p-6 text-gray-600">Carregando regras...</div>
        ) : !dentistaId ? (
          <div className="p-6 text-gray-600">Selecione um dentista.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 px-4">Dia</th>
                  <th className="py-2 px-4">Manhã (início – fim)</th>
                  <th className="py-2 px-4">Tarde (início – fim)</th>
                </tr>
              </thead>
              <tbody>
                {regras.map((r, i) => (
                  <tr key={r.diaSemana} className="border-b last:border-0">
                    <td className="py-2 px-4">
                      <div className="flex items-center gap-2">
                        {nomesDias[r.diaSemana]}
                        <button
                          type="button"
                          className="text-xs border rounded px-2 py-0.5"
                          onClick={() => applyPresetDay(i, "manha")}
                          title="Preencher manhã 07–12"
                        >
                          Manhã
                        </button>
                        <button
                          type="button"
                          className="text-xs border rounded px-2 py-0.5"
                          onClick={() => applyPresetDay(i, "tarde")}
                          title="Preencher tarde 14–18"
                        >
                          Tarde
                        </button>
                      </div>
                    </td>

                    {/* Manhã */}
                    <td className="py-2 px-4 space-x-2">
                      <input
                        type="time"
                        step={300}
                        className="border rounded p-1"
                        value={r.inicioManha ?? ""}
                        onChange={(e) => setCampo(i, "inicioManha", e.target.value || null)}
                        onFocus={onFocusAuto(i, "inicioManha")}
                      />
                      <span>–</span>
                      <input
                        type="time"
                        step={300}
                        className="border rounded p-1"
                        value={r.fimManha ?? ""}
                        onChange={(e) => setCampo(i, "fimManha", e.target.value || null)}
                        onFocus={onFocusAuto(i, "fimManha")}
                      />
                    </td>

                    {/* Tarde */}
                    <td className="py-2 px-4 space-x-2">
                      <input
                        type="time"
                        step={300}
                        className="border rounded p-1"
                        value={r.inicioTarde ?? ""}
                        onChange={(e) => setCampo(i, "inicioTarde", e.target.value || null)}
                        onFocus={onFocusAuto(i, "inicioTarde")}
                      />
                      <span>–</span>
                      <input
                        type="time"
                        step={300}
                        className="border rounded p-1"
                        value={r.fimTarde ?? ""}
                        onChange={(e) => setCampo(i, "fimTarde", e.target.value || null)}
                        onFocus={onFocusAuto(i, "fimTarde")}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="p-4 text-xs text-gray-500">
              Dica: deixe vazio para não abrir atendimento naquele período/dia.
            </div>
          </div>
        )}
      </div>

      {/* Card Agenda do mês */}
      <div className="bg-white rounded-2xl shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-medium">Agenda do mês</div>
          <div className="flex gap-2 items-center">
            <button className="px-2 py-1 border rounded" onClick={() => mudarMes(-1)}>◀</button>
            <span className="min-w-[120px] text-center">
              {new Date(ano, mes - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
            </span>
            <button className="px-2 py-1 border rounded" onClick={() => mudarMes(1)}>▶</button>
          </div>
        </div>

        {loadingMes ? (
          <div className="p-6 text-gray-600">Carregando agenda...</div>
        ) : !dentistaId ? (
          <div className="p-6 text-gray-600">Selecione um dentista.</div>
        ) : (
          (() => {
            const iniSemana = primeiroDiaSemana(ano, mes);
            const diasNoMes = qtdeDiasNoMes(ano, mes);

            const cells: Array<
              | { vazio: true }
              | { dia: number; fechado: boolean; livres: number; ocupados: number; total: number; motivo?: string | null }
            > = [];

            for (let i = 0; i < iniSemana; i++) cells.push({ vazio: true });
            for (let d = 1; d <= diasNoMes; d++) {
              const data = diasMes.find((x) => x.dia === d) || {
                dia: d, fechado: false, livres: 0, ocupados: 0, total: 0, motivo: null,
              };
              cells.push(data);
            }
            while (cells.length % 7 !== 0) cells.push({ vazio: true });

            return (
              <div className="grid grid-cols-7 gap-2 text-sm">
                {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map((h) => (
                  <div key={h} className="text-center font-medium text-gray-600 py-1">{h}</div>
                ))}
                {cells.map((c, i) =>
                  "vazio" in c ? (
                    <div key={i} className="border rounded-xl h-24 bg-gray-50" />
                  ) : (
                    <div
                      key={i}
                      className={`border rounded-xl h-24 p-2 flex flex-col ${
                        c.fechado ? "bg-red-50 border-red-200" : "bg-gray-50"
                      }`}
                      title={c.motivo || undefined}
                    >
                      <div className="text-xs font-semibold mb-1">{c.dia}</div>
                      {c.fechado ? (
                        <div className="text-[11px] text-red-600">Fechado{c.motivo ? ` • ${c.motivo}` : ""}</div>
                      ) : (
                        <div className="text-[11px] leading-4">
                          <div>Livres: {c.livres}</div>
                          <div>Ocupados: {c.ocupados}</div>
                          <div className="text-gray-500">Total: {c.total}</div>
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
}
