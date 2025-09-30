import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { AdminAPI, PublicAPI } from "../api/client";
import type { Dentista, Procedimento, SlotDto, CriarConsultaDto } from "../api/types";
import { useNavigate } from "react-router-dom";

export default function Booking() {
  const nav = useNavigate();
  const [dentistas, setDentistas] = useState<Dentista[]>([]);
  const [proceds, setProceds] = useState<Procedimento[]>([]);
  const [dentistaId, setDentistaId] = useState("");
  const [procedimentoId, setProcedimentoId] = useState("");
  const [data, setData] = useState<string>("");
  const [slots, setSlots] = useState<SlotDto[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [pacienteNome, setPacienteNome] = useState("");
  const [celular, setCelular] = useState("");
  const [email, setEmail] = useState("");
  const [descricao, setDescricao] = useState("");

  useEffect(() => {
    AdminAPI.dentistas().then(setDentistas);
    AdminAPI.procedimentos().then(setProceds);
  }, []);

  const podeBuscar = dentistaId && procedimentoId && data;
  useEffect(() => {
    if (!podeBuscar) { setSlots([]); return; }
    setLoadingSlots(true);
    PublicAPI.slots(dentistaId, procedimentoId, data)
      .then(setSlots)
      .finally(() => setLoadingSlots(false));
  }, [dentistaId, procedimentoId, data]);

  const submit = async (inicioISO: string) => {
    const dto: CriarConsultaDto = {
      dentistaId, procedimentoId, inicio: inicioISO,
      pacienteNome, celularWhatsApp: celular, email, descricao,
      sintomas: []
    };
    const id = await PublicAPI.criarConsulta(dto);
    nav(`/sucesso/${id}`);
  };

  const dataLabel = useMemo(() => data ? format(parseISO(data), "dd/MM/yyyy") : "", [data]);

  return (
    <div className="min-h-screen flex items-start justify-center pt-14">
      <div className="w-full max-w-3xl px-4">
        <h1 className="text-3xl font-bold text-center mb-8">Agendar Consulta</h1>

        <div className="bg-white rounded-2xl shadow p-6 space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm mb-1">Dentista</label>
              <select className="w-full border rounded-lg p-2"
                value={dentistaId} onChange={e => setDentistaId(e.target.value)}>
                <option value="">Selecione</option>
                {dentistas.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Procedimento</label>
              <select className="w-full border rounded-lg p-2"
                value={procedimentoId} onChange={e => setProcedimentoId(e.target.value)}>
                <option value="">Selecione</option>
                {proceds.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Data</label>
              <input type="date" className="w-full border rounded-lg p-2"
                value={data} onChange={e => setData(e.target.value)} />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm mb-1">Nome do paciente</label>
              <input className="w-full border rounded-lg p-2"
                value={pacienteNome} onChange={e => setPacienteNome(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1">WhatsApp</label>
              <input className="w-full border rounded-lg p-2"
                value={celular} onChange={e => setCelular(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1">Email (opcional)</label>
              <input className="w-full border rounded-lg p-2"
                value={email} onChange={e => setEmail(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1">Descrição (opcional)</label>
            <textarea className="w-full border rounded-lg p-2" rows={3}
              value={descricao} onChange={e => setDescricao(e.target.value)} />
          </div>

          <div className="space-y-2">
            <div className="font-medium">Horários {dataLabel && `(${dataLabel})`}</div>
            {!podeBuscar && <div className="text-sm text-gray-600">Selecione dentista, procedimento e data.</div>}
            {loadingSlots && <div>Carregando slots...</div>}
            <div className="flex flex-wrap gap-2">
              {slots.map(s => (
                <button key={s.horaISO}
                  onClick={() => submit(s.horaISO)}
                  className="border rounded-lg px-3 py-2 hover:bg-gray-100">
                  {format(new Date(s.horaISO), "HH:mm")}
                </button>
              ))}
            </div>
            {podeBuscar && !loadingSlots && slots.length === 0 &&
              <div className="text-sm text-red-600">Sem horários disponíveis para esta data.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}