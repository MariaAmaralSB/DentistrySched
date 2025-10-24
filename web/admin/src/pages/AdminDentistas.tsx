import { useEffect, useMemo, useState } from "react";
import { AdminAPI } from "../api/client";
import VincularUsuarioModal from "../components/VincularUsuarioModal";

type Dentista = { id: string; nome: string; cro?: string };
type Procedimento = { id: string; nome: string; duracaoMin: number; bufferMin: number };

type Aba = "vincular" | "novo";

export default function AdminDentistas() {
  const [itens, setItens] = useState<Dentista[]>([]);
  const [loading, setLoading] = useState(true);

  const [nome, setNome] = useState("");
  const [cro, setCRO] = useState("");

  const [editId, setEditId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editCRO, setEditCRO] = useState("");

  const [showProcModal, setShowProcModal] = useState(false);
  const [aba, setAba] = useState<Aba>("vincular");
  const [dentistaProc, setDentistaProc] = useState<Dentista | null>(null);
  const [savingProc, setSavingProc] = useState(false);
  const [procAll, setProcAll] = useState<Procedimento[]>([]);
  const [procSelIds, setProcSelIds] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [novoNome, setNovoNome] = useState("");
  const [novoDur, setNovoDur] = useState<number | "">("");
  const [novoBuf, setNovoBuf] = useState<number | "">("");
  const [criando, setCriando] = useState(false);

  // --- Modal de Vincular Usuário ---
  const [showVincularUser, setShowVincularUser] = useState(false);
  const [selDentistaId, setSelDentistaId] = useState("");
  const [selDentistaNome, setSelDentistaNome] = useState("");

  const carregar = async () => {
    setLoading(true);
    const lista = await AdminAPI.dentistas();
    setItens(lista);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  const criar = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = nome.trim();
    if (!n) return;
    await AdminAPI.criarDentista({ nome: n, cro: cro.trim() || undefined });
    setNome(""); setCRO("");
    await carregar();
  };

  const iniciarEdicao = (d: Dentista) => {
    setEditId(d.id);
    setEditNome(d.nome);
    setEditCRO(d.cro ?? "");
  };

  const salvar = async () => {
    if (!editId) return;
    await AdminAPI.atualizarDentista(editId, { nome: editNome.trim(), cro: editCRO.trim() || undefined });
    setEditId(null);
    await carregar();
  };

  const remover = async (id: string) => {
    if (!confirm("Remover dentista?")) return;
    try {
      await AdminAPI.removerDentista(id);
      await carregar();
    } catch (e: any) {
      alert(e?.response?.data ?? "Erro ao remover. Verifique se há consultas associadas.");
    }
  };

  // --- Modal de Procedimentos ---
  const abrirModalProcedimentos = async (d: Dentista) => {
    setDentistaProc(d);
    setAba("vincular");
    setQ("");
    const [todos, doDentista] = await Promise.all([
      AdminAPI.procedimentos(),
      AdminAPI.procedimentosDoDentista(d.id),
    ]);
    setProcAll(todos);
    setProcSelIds(doDentista.map(p => p.id));
    setShowProcModal(true);
  };

  const toggleProc = (id: string) => {
    setProcSelIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return procAll;
    return procAll.filter(p =>
      p.nome.toLowerCase().includes(t) ||
      String(p.duracaoMin).includes(t)
    );
  }, [procAll, q]);

  const selecionarTudoFiltrado = () => {
    const idsFiltrados = filtered.map(p => p.id);
    setProcSelIds(prev => Array.from(new Set([...prev, ...idsFiltrados])));
  };

  const limparSelecao = () => setProcSelIds([]);

  const salvarProcedimentos = async () => {
    if (!dentistaProc) return;
    try {
      setSavingProc(true);
      await AdminAPI.salvarProcedimentosDoDentista(dentistaProc.id, procSelIds);
      setShowProcModal(false);
      setDentistaProc(null);
    } catch (e: any) {
      alert(e?.response?.data ?? "Erro ao salvar procedimentos.");
    } finally {
      setSavingProc(false);
    }
  };

  const criarProcedimento = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = novoNome.trim();
    const d = Number(novoDur);
    const b = Number(novoBuf);
    if (!n || !Number.isFinite(d) || !Number.isFinite(b) || d <= 0 || b < 0) {
      alert("Preencha Nome, Duração (>0) e Buffer (>=0).");
      return;
    }
    try {
      setCriando(true);
      // precisa existir AdminAPI.criarProcedimento no client
      const p = await AdminAPI.criarProcedimento({ nome: n, duracaoMin: d, bufferMin: b });
      setProcAll(prev => [p, ...prev]);
      setProcSelIds(prev => [p.id, ...prev]);
      setNovoNome(""); setNovoDur(""); setNovoBuf("");
      setAba("vincular");
    } catch (err: any) {
      alert(err?.response?.data ?? "Erro ao criar procedimento.");
    } finally {
      setCriando(false);
    }
  };

  // --- Abrir modal de vínculo de usuário ---
  const abrirVincularUsuario = (d: Dentista) => {
    setSelDentistaId(d.id);
    setSelDentistaNome(d.nome);
    setShowVincularUser(true);
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-2xl font-bold">Admin • Dentistas</h1>

        {/* Form criar */}
        <form onSubmit={criar} className="bg-white rounded-xl shadow p-4 grid md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Nome</label>
            <input className="w-full border rounded-lg p-2" value={nome} onChange={e => setNome(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">CRO (opcional)</label>
            <input className="w-full border rounded-lg p-2" value={cro} onChange={e => setCRO(e.target.value)} />
          </div>
          <div className="md:col-span-3">
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Cadastrar</button>
          </div>
        </form>

        {/* Tabela */}
        <div className="bg-white rounded-xl shadow p-4">
          {loading ? (
            <div>Carregando...</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2">Nome</th>
                  <th className="py-2">CRO</th>
                  <th className="py-2 w-[380px]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {itens.map(d => (
                  <tr key={d.id} className="border-b last:border-0">
                    <td className="py-2">
                      {editId === d.id ? (
                        <input className="border rounded p-1 w-full" value={editNome} onChange={e => setEditNome(e.target.value)} />
                      ) : d.nome}
                    </td>
                    <td className="py-2">
                      {editId === d.id ? (
                        <input className="border rounded p-1 w-full" value={editCRO} onChange={e => setEditCRO(e.target.value)} />
                      ) : (d.cro ?? "—")}
                    </td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-2">
                        {editId === d.id ? (
                          <>
                            <button onClick={salvar} className="px-3 py-1 rounded bg-green-600 text-white">Salvar</button>
                            <button onClick={() => setEditId(null)} className="px-3 py-1 rounded border">Cancelar</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => abrirModalProcedimentos(d)} className="px-3 py-1 rounded border">
                              Procedimentos
                            </button>
                            <button onClick={() => abrirVincularUsuario(d)} className="px-3 py-1 rounded border">
                              Vincular usuário
                            </button>
                            <button onClick={() => iniciarEdicao(d)} className="px-3 py-1 rounded border">Editar</button>
                            <button onClick={() => remover(d.id)} className="px-3 py-1 rounded bg-red-600 text-white">Remover</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {itens.length === 0 && (
                  <tr><td colSpan={3} className="py-6 text-center text-gray-500">Nenhum dentista cadastrado.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal de procedimentos */}
      {showProcModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-2xl rounded-xl shadow-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-semibold">Procedimentos do dentista</h2>
                {dentistaProc && <p className="text-xs text-gray-600">Dentista: <b>{dentistaProc.nome}</b></p>}
              </div>
              <button onClick={() => setShowProcModal(false)} className="px-2 py-1 rounded border">Fechar</button>
            </div>

            {/* Abas */}
            <div className="flex gap-2 mb-3">
              <button
                className={`px-3 py-1 rounded ${aba === "vincular" ? "bg-blue-600 text-white" : "border"}`}
                onClick={() => setAba("vincular")}
              >
                Vincular existentes
              </button>
              <button
                className={`px-3 py-1 rounded ${aba === "novo" ? "bg-blue-600 text-white" : "border"}`}
                onClick={() => setAba("novo")}
              >
                Criar novo
              </button>
            </div>

            {aba === "vincular" ? (
              <>
                {/* Toolbar */}
                <div className="flex items-center gap-2 mb-2">
                  <input
                    placeholder="Buscar por nome ou duração…"
                    className="flex-1 border rounded p-2"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                  <span className="text-xs text-gray-600">Selecionados: {procSelIds.length}</span>
                  <button onClick={selecionarTudoFiltrado} className="px-2 py-1 rounded border">Selecionar filtrados</button>
                  <button onClick={limparSelecao} className="px-2 py-1 rounded border">Limpar</button>
                </div>

                {/* Lista */}
                <div className="max-h-80 overflow-auto border rounded p-2 space-y-2">
                  {filtered.length === 0 ? (
                    <div className="text-sm text-gray-600">Nada encontrado.</div>
                  ) : filtered.map(p => (
                    <label key={p.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={procSelIds.includes(p.id)}
                        onChange={() => toggleProc(p.id)}
                      />
                      <span className="font-medium">{p.nome}</span>
                      <span className="text-xs text-gray-500 ml-auto">{p.duracaoMin}min + {p.bufferMin}min</span>
                    </label>
                  ))}
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <button onClick={() => setShowProcModal(false)} className="px-3 py-2 rounded border">Cancelar</button>
                  <button
                    onClick={salvarProcedimentos}
                    disabled={savingProc}
                    className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {savingProc ? "Salvando..." : "Salvar"}
                  </button>
                </div>
              </>
            ) : (
              // Aba: criar novo
              <form onSubmit={criarProcedimento} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-3">
                  <label className="block text-sm mb-1">Nome</label>
                  <input
                    className="w-full border rounded p-2"
                    value={novoNome}
                    onChange={(e) => setNovoNome(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Duração (min)</label>
                  <input
                    type="number" min={1}
                    className="w-full border rounded p-2"
                    value={novoDur}
                    onChange={(e) => setNovoDur(e.target.value === "" ? "" : Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Buffer (min)</label>
                  <input
                    type="number" min={0}
                    className="w-full border rounded p-2"
                    value={novoBuf}
                    onChange={(e) => setNovoBuf(e.target.value === "" ? "" : Number(e.target.value))}
                  />
                </div>
                <div className="md:col-span-3 flex justify-end gap-2">
                  <button type="button" onClick={() => setAba("vincular")} className="px-3 py-2 rounded border">Cancelar</button>
                  <button
                    type="submit"
                    disabled={criando}
                    className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {criando ? "Criando..." : "Criar e vincular"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal Vincular Usuário */}
      <VincularUsuarioModal
        open={showVincularUser}
        onClose={() => setShowVincularUser(false)}
        dentistaId={selDentistaId}
        dentistaNome={selDentistaNome}
      />
    </div>
  );
}
