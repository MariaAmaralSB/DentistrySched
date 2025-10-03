import { useMemo, useState } from "react";
import { AdminAPI } from "../api/client";
import { useQuery, useMutation, QueryClient, QueryClientProvider } from "@tanstack/react-query";

type Dia = 0|1|2|3|4|5|6;
type Dentista = { id: string; nome: string; cro?: string };
type Regra = { diaSemana: Dia; inicioManha?: string|null; fimManha?: string|null; inicioTarde?: string|null; fimTarde?: string|null };

const nomesDias = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

const primeiroDiaSemana = (y:number, m:number) => new Date(y, m-1, 1).getDay();
const qtdeDiasNoMes     = (y:number, m:number) => new Date(y, m, 0).getDate();

function isoDate(y:number, m:number, d:number){ 
  return new Date(y, m-1, d).toISOString().slice(0,10);
}

// ------------------------------------
// React Query setup (se ainda não existir no root)
// ------------------------------------
// Se você já tem um QueryClientProvider no root, pode remover isso aqui.
const client = new QueryClient();

// ------------------------------------
// Component
// ------------------------------------
export default function AdminAgenda(){
  return (
    // se já tiver QueryClientProvider no root, REMOVA esse wrapper
    <QueryClientProvider client={client}>
      <AdminAgendaInner />
    </QueryClientProvider>
  );
}

function AdminAgendaInner() {
  // seleção
  const [dentistaId, setDentistaId] = useState<string>("");
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth()+1);
  const [diaSelecionado, setDiaSelecionado] = useState<number|undefined>(undefined);

  // ---------------- Dentistas
  const qDentistas = useQuery({
    queryKey: ["dentistas"],
    queryFn: AdminAPI.dentistas,
    staleTime: 5*60*1000, // 5min
  });

  // auto-select primeiro dentista (sem guardar em estado gigante)
  const dentistaOptions = qDentistas.data ?? [];
  const dentistaIdVal = dentistaId || dentistaOptions[0]?.id || "";

  // ---------------- Regras semanais
  const qRegras = useQuery({
    queryKey: ["regras", dentistaIdVal],
    queryFn: () => AdminAPI.getAgendaRegras(dentistaIdVal),
    enabled: !!dentistaIdVal,
    staleTime: 60_000,
  });

  // ---------------- Resumo do mês (só números)
  const qMes = useQuery({
    queryKey: ["mes", dentistaIdVal, ano, mes],
    queryFn: () => AdminAPI.agendaMes(dentistaIdVal, ano, mes),
    enabled: !!dentistaIdVal,
    keepPreviousData: true,     // evita piscar e evita recriar estruturas
    staleTime: 30_000,
    gcTime: 60_000,             // coleta de lixo rápida
    select: (arr: any[]) => arr ?? [],
  });

  // ---------------- Detalhes do dia (somente quando clica)
  const dataISO = useMemo(
    () => (diaSelecionado ? isoDate(ano, mes, diaSelecionado) : undefined),
    [ano, mes, diaSelecionado]
  );

  const qDia = useQuery({
    queryKey: ["dia", dentistaIdVal, dataISO],
    queryFn: () => AdminAPI.agendaDia(dentistaIdVal, dataISO!), // você disse que já criou esse endpoint
    enabled: !!dentistaIdVal && !!dataISO,
    staleTime: 10_000,
    gcTime: 30_000,
  });

  // ---------------- Criação/edição/remoção de consulta (só quando usa)
  const mCriar = useMutation({
    mutationFn: AdminAPI.criarConsulta,
    onSuccess: () => client.invalidateQueries({ queryKey: ["dia", dentistaIdVal, dataISO] }),
  });
  const mAtualizar = useMutation({
    mutationFn: AdminAPI.atualizarConsulta,
    onSuccess: () => client.invalidateQueries({ queryKey: ["dia", dentistaIdVal, dataISO] }),
  });
  const mExcluir = useMutation({
    mutationFn: AdminAPI.excluirConsulta,
    onSuccess: () => client.invalidateQueries({ queryKey: ["dia", dentistaIdVal, dataISO] }),
  });

  // ---------------- Navegação de mês
  const mudarMes = (delta:number) => {
    const d = new Date(ano, mes-1, 1);
    d.setMonth(d.getMonth()+delta);
    setAno(d.getFullYear()); setMes(d.getMonth()+1);
    setDiaSelecionado(undefined);
  };

  // ---------------- UI
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
            onChange={(e)=>{ setDentistaId(e.target.value); setDiaSelecionado(undefined); }}
          >
            {dentistaOptions.map((d: Dentista)=>(
              <option key={d.id} value={d.id}>{d.nome}{d.cro ? ` • CRO ${d.cro}`:""}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Semana: você pode manter seu editor atual — qRegras.data já traz as regras */}
      <WeekRulesPanel regras={qRegras.data ?? []} carregando={qRegras.isLoading} dentistaId={dentistaIdVal} />

      {/* Calendário (mês) */}
      <div className="bg-white rounded-2xl shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-medium">Agenda do mês</div>
          <div className="flex gap-2 items-center">
            <button className="px-2 py-1 border rounded" onClick={()=>mudarMes(-1)}>◀</button>
            <span className="min-w-[140px] text-center">
              {new Date(ano, mes-1, 1).toLocaleDateString("pt-BR",{month:"long",year:"numeric"})}
            </span>
            <button className="px-2 py-1 border rounded" onClick={()=>mudarMes(1)}>▶</button>
          </div>
        </div>

        {qMes.isLoading ? (
          <div className="p-6 text-gray-600">Carregando...</div>
        ) : (
          <MonthGrid
            ano={ano}
            mes={mes}
            dados={qMes.data ?? []}
            diaSelecionado={diaSelecionado}
            onSelecionarDia={setDiaSelecionado}
          />
        )}

        {/* Detalhes do dia: carregados sob demanda */}
        <DayDetails
          dataISO={dataISO}
          isLoading={qDia.isLoading}
          itens={qDia.data ?? []}
          onCriar={(payload)=>mCriar.mutate(payload)}
          onEditar={(payload)=>mAtualizar.mutate(payload)}
          onExcluir={(id)=>mExcluir.mutate(id)}
          onFechar={()=>setDiaSelecionado(undefined)}
        />
      </div>
    </div>
  );
}

// ------------------------------------
// Subcomponentes leves
// ------------------------------------
function MonthGrid({
  ano, mes, dados, diaSelecionado, onSelecionarDia
}:{
  ano:number; mes:number;
  dados: Array<{dia:number; fechado:boolean; livres:number; ocupados:number; total:number; motivo?:string|null}>;
  diaSelecionado?: number;
  onSelecionarDia: (d:number)=>void;
}){
  const ini = primeiroDiaSemana(ano, mes);
  const dias = qtdeDiasNoMes(ano, mes);

  // mapa dia->resumo (para lookup O(1))
  const map = useMemo(()=>{
    const m = new Map<number, any>();
    for(const d of dados) m.set(d.dia, d);
    return m;
  },[dados]);

  const cells: (null|any)[] = [];
  for(let i=0;i<ini;i++) cells.push(null);
  for(let d=1; d<=dias; d++) cells.push(map.get(d) ?? {dia:d,fechado:false,livres:0,ocupados:0,total:0});

  while(cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="grid grid-cols-7 gap-2 text-sm">
      {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map((h)=>(
        <div key={h} className="text-center font-medium text-gray-600 py-1">{h}</div>
      ))}
      {cells.map((c,idx)=>(
        c === null ? (
          <div key={idx} className="border rounded-xl h-24 bg-gray-50"/>
        ) : (
          <button
            key={idx}
            onClick={()=>onSelecionarDia(c.dia)}
            className={`text-left border rounded-xl h-24 p-2 transition
              ${c.dia===diaSelecionado? "ring-2 ring-blue-400": ""}
              ${c.fechado ? "bg-red-50 border-red-200":"bg-gray-50"}`}
            title={c.motivo || undefined}
          >
            <div className="text-xs font-semibold mb-1">{c.dia}</div>
            {c.fechado ? (
              <div className="text-[11px] text-red-600">Fechado{c.motivo ? ` • ${c.motivo}`:""}</div>
            ) : (
              <div className="text-[11px] leading-4">
                <div>Livres: {c.livres}</div>
                <div>Ocupados: {c.ocupados}</div>
                <div className="text-gray-500">Total: {c.total}</div>
              </div>
            )}
          </button>
        )
      ))}
    </div>
  );
}

function DayDetails({
  dataISO, isLoading, itens, onCriar, onEditar, onExcluir, onFechar
}:{
  dataISO?: string;
  isLoading: boolean;
  itens: Array<{id:string; hora:string; paciente:string; status:number; procedimento:string}>;
  onCriar: (p:any)=>void;
  onEditar: (p:any)=>void;
  onExcluir: (id:string)=>void;
  onFechar: ()=>void;
}){
  return (
    <div className="mt-4 border rounded-2xl p-4 bg-gray-50">
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium">Detalhes do dia {dataISO ? new Date(dataISO).toLocaleDateString() : ""}</div>
        <button className="text-sm border rounded px-3 py-1" onClick={onFechar}>Fechar</button>
      </div>

      {!dataISO ? (
        <div className="text-gray-600">Selecione um dia no calendário.</div>
      ) : isLoading ? (
        <div className="text-gray-600">Carregando...</div>
      ) : itens.length === 0 ? (
        <div className="text-gray-600">Nenhuma consulta.</div>
      ) : (
        <ul className="space-y-2">
          {itens.map(it=>(
            <li key={it.id} className="bg-white rounded-xl px-3 py-2 flex items-center justify-between">
              <div className="text-sm">
                <div><b>{it.hora}</b> — {it.paciente}</div>
                <div className="text-gray-500">{it.procedimento}</div>
              </div>
              <div className="flex gap-2">
                <button className="text-sm border rounded px-2 py-1" onClick={()=>onEditar(it)}>Editar</button>
                <button className="text-sm border rounded px-2 py-1" onClick={()=>onExcluir(it.id)}>Excluir</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* botão de criar aqui (abre modal simples, omitido pra ser curto) */}
      {/* <button className="mt-3 text-sm border rounded px-3 py-1" onClick={()=>onCriar({...})}>Nova consulta</button> */}
    </div>
  );
}

function WeekRulesPanel({ regras, carregando, dentistaId }:{
  regras: Regra[]; carregando:boolean; dentistaId:string;
}){
  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <div className="font-medium mb-2">Semana</div>
      {carregando ? (
        <div className="text-gray-600">Carregando regras...</div>
      ) : !dentistaId ? (
        <div className="text-gray-600">Selecione um dentista.</div>
      ) : (
        <div className="text-gray-600 text-sm">[Seu editor de regras aqui – usando qRegras.data]</div>
      )}
    </div>
  );
}
