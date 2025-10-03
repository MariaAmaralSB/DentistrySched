import { useEffect, useMemo, useState } from "react";
import { AdminAPI } from "../api/client";

/** Itens que o /admin/consultas está retornando agora */
type AgendaItem = {
  id: string;

  inicio: string;   // ISO do backend
  fim: string;      // ISO do backend
  hora?: string;    // opcional (o backend já manda "HH:mm"; se vier, usamos)

  status: number;   // agora é numérico (ex.: 0=Agendada, 1=Confirmada, 2=Cancelada)

  dentistaId: string;
  dentistaNome: string;

  pacienteId: string;
  pacienteNome: string;

  procedimentoId: string;
  procedimentoNome: string;
};

type Dentista = { id: string; nome: string; cro?: string };

const STATUS_INFO: Record<
  number,
  { text: string; className: string }
> = {
  0: { text: "Agendada",  className: "bg-gray-100 text-gray-800" },
  1: { text: "Confirmada", className: "bg-green-100 text-green-800" },
  2: { text: "Cancelada",  className: "bg-red-100 text-red-800" },
  3: { text: "No-show",    className: "bg-yellow-100 text-yellow-800" },
  4: { text: "Remarcada",  className: "bg-blue-100 text-blue-800" },
};

export default function Dashboard() {
  const [data, setData] = useState(() =>
    new Date().toISOString().slice(0, 10)
  ); 
  const [dentistas, setDentistas] = useState<Dentista[]>([]);
  const [dentistaId, setDentistaId] = useState("");
  const [itens, setItens] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    AdminAPI.dentistas().then(setDentistas);
  }, []);

  const carregar = async () => {
    setLoading(true);
    const lista = await AdminAPI.agendaDoDia(data, dentistaId || undefined);
    setItens(lista as AgendaItem[]); 
    setLoading(false);
  };

  useEffect(() => {
    carregar();
  }, [data, dentistaId]);

  const kpis = useMemo(() => {
    const total = itens.length;
    const confirmadas = itens.filter((i) => i.status === 1).length;
    const canceladas = itens.filter((i) => i.status === 2).length;
    const agendadas = total - confirmadas - canceladas;
    return { total, confirmadas, canceladas, agendadas };
  }, [itens]);

  const formatHora = (c: AgendaItem) =>
    c.hora ||
    new Date(c.inicio).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Dashboard</h1>

        {/* Filtros */}
        <div className="flex items-center gap-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Data</label>
            <input
              type="date"
              className="border rounded-lg p-2"
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Dentista</label>
            <select
              className="border rounded-lg p-2 min-w-[220px]"
              value={dentistaId}
              onChange={(e) => setDentistaId(e.target.value)}
            >
              <option value="">Todos</option>
              {dentistas.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nome}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi title="Total do dia" value={kpis.total} />
        <Kpi title="Agendadas" value={kpis.agendadas} />
        <Kpi title="Confirmadas" value={kpis.confirmadas} />
        <Kpi title="Canceladas" value={kpis.canceladas} />
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-2xl shadow">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="font-medium">Agenda do dia</div>
          <button
            onClick={carregar}
            className="text-sm border rounded-lg px-3 py-1"
          >
            Atualizar
          </button>
        </div>

        {loading ? (
          <div className="p-6 text-gray-600">Carregando...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 px-4">Hora</th>
                  <th className="py-2 px-4">Paciente</th>
                  <th className="py-2 px-4">Dentista</th>
                  <th className="py-2 px-4">Procedimento</th>
                  <th className="py-2 px-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((c) => {
                  const s = STATUS_INFO[c.status] ?? {
                    text: String(c.status),
                    className: "bg-gray-100 text-gray-800",
                  };
                  return (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="py-2 px-4">{formatHora(c)}</td>
                      <td className="py-2 px-4">{c.pacienteNome}</td>
                      <td className="py-2 px-4">{c.dentistaNome}</td>
                      <td className="py-2 px-4">{c.procedimentoNome}</td>
                      <td className="py-2 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${s.className}`}
                        >
                          {s.text}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {itens.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-6 text-center text-gray-500"
                    >
                      Nenhuma consulta para os filtros atuais.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({ title, value }: { title: string; value: number | string }) {
  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}
