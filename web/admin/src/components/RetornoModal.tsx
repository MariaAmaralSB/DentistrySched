import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { AdminAPI } from "../api/client";

type AgendaItem = {
  id: string;
  dentistaId: string;
  dentistaNome: string;
  procedimentoId: string;
  procedimentoNome: string;
  inicio: string; 
};

type Props = {
  open: boolean;
  onClose: () => void;
  consulta: AgendaItem | null;
};

export default function RetornoModal({ open, onClose, consulta }: Props) {
  const [loading, setLoading] = useState(false);
  const [sugestoes, setSugestoes] = useState<{ dia: string; horarios: string[] }[]>([]);
  const [dias, setDias] = useState<number[]>([]); 
  const [dentistaId, setDentistaId] = useState("");
  const [procedimentoId, setProcedimentoId] = useState("");

  useEffect(() => {
    if (!open || !consulta) return;
    setDentistaId(consulta.dentistaId);
    setProcedimentoId(consulta.procedimentoId);
    setLoading(true);
    AdminAPI.retornoSugestoes(consulta.id, dias)
      .then(setSugestoes)
      .finally(() => setLoading(false));
  }, [open, consulta, dias]);

  const handleCriar = async (inicioISO: string) => {
    if (!consulta) return;
    setLoading(true);
    try {
      await AdminAPI.criarRetorno(consulta.id, {
        dentistaId: dentistaId || undefined,
        procedimentoId: procedimentoId || undefined,
        inicio: inicioISO,
      });
      onClose(); 
    } finally {
      setLoading(false);
    }
  };

  if (!open || !consulta) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Agendar retorno</h2>
          <button onClick={onClose} className="px-2 py-1 rounded hover:bg-gray-100">Fechar</button>
        </div>

        <div className="grid md:grid-cols-2 gap-3 mb-4">
          <div className="text-sm">
            <div className="text-gray-500">Paciente</div>
            {/* se tiver nome do paciente na sua AgendaItem, mostre aqui */}
            {/* <div className="font-medium">{consulta.pacienteNome}</div> */}
          </div>
          <div className="text-sm">
            <div className="text-gray-500">Consulta origem</div>
            <div className="font-medium">
              {consulta.procedimentoNome} — {format(parseISO(consulta.inicio), "dd/MM/yyyy HH:mm")}
            </div>
          </div>

          {/* Se quiser permitir trocar dentista/procedimento do retorno */}
          {/* <select value={dentistaId} onChange={e => setDentistaId(e.target.value)}>{...}</select>
              <select value={procedimentoId} onChange={e => setProcedimentoId(e.target.value)}>{...}</select> */}
        </div>

        <div className="mb-2 text-sm font-medium">Sugestões</div>
        {loading && <div className="text-sm">Carregando...</div>}

        {!loading && sugestoes.length === 0 && (
          <div className="text-sm text-gray-600">Sem sugestões disponíveis.</div>
        )}

        <div className="space-y-3 max-h-80 overflow-auto pr-1">
          {sugestoes.map((s) => (
            <div key={s.dia} className="border rounded-xl p-3">
              <div className="text-sm font-medium mb-2">
                {format(parseISO(s.dia + "T00:00:00"), "EEE, dd/MM/yyyy")}
              </div>
              <div className="flex flex-wrap gap-2">
                {s.horarios.map((h) => (
                  <button
                    key={h}
                    onClick={() => handleCriar(h)}
                    className="px-3 py-2 rounded-lg border hover:bg-gray-100"
                  >
                    {format(parseISO(h), "HH:mm")}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="px-3 py-2 rounded-lg border hover:bg-gray-100">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
