import { useEffect, useMemo, useState } from "react";
import { AdminAPI } from "../api/client";
import VincularUsuarioModal from "../components/VincularUsuarioModal";

/* ===================== Tipos ===================== */
type Dentista = { id: string; nome: string; cro?: string };
type Procedimento = { id: string; nome: string; duracaoMin: number; bufferMin: number };
type Aba = "vincular" | "novo";

/* ===================== Ícones (inline SVG) ===================== */
const cn = (...cls: (string | false | undefined)[]) => cls.filter(Boolean).join(" ");

function SearchIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={1.8} {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}
function FilterIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={1.8} {...props}>
      <path d="M3 5h18" />
      <path d="M7 12h10" />
      <path d="M10 19h4" />
    </svg>
  );
}
function PlusIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={1.8} {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function EyeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={1.8} {...props}>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function ClipboardIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={1.8} {...props}>
      <rect x="7" y="3" width="10" height="4" rx="1" />
      <rect x="5" y="5" width="14" height="16" rx="2" />
      <path d="M9 11h6M9 15h6" />
    </svg>
  );
}
function UserPlusIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={1.8} {...props}>
      <circle cx="9" cy="7" r="3.5" />
      <path d="M16 21v-1a5 5 0 0 0-5-5H7a5 5 0 0 0-5 5v1" />
      <path d="M16 8h6M19 5v6" />
    </svg>
  );
}
function PencilIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={1.8} {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}
function TrashIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={1.8} {...props}>
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <rect x="5" y="6" width="14" height="14" rx="2" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

/* Badge do status */
function StatusBadge({ children }: { children: string }) {
  return (
    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
      {children}
    </span>
  );
}

/* Avatar com iniciais */
function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
  return (
    <span className="w-9 h-9 rounded-full grid place-items-center text-white text-xs font-semibold bg-gradient-to-br from-blue-600 to-cyan-500">
      {initials || "U"}
    </span>
  );
}

/* Botão de ação (ícone) */
function IconButton({
  title,
  children,
  onClick,
  color = "gray",
}: {
  title: string;
  children: React.ReactNode;
  onClick?: () => void;
  color?: "gray" | "blue" | "green" | "red";
}) {
  const styles: Record<string, string> = {
    gray: "text-slate-600 hover:bg-slate-100",
    blue: "text-blue-600 hover:bg-blue-50",
    green: "text-green-600 hover:bg-green-50",
    red: "text-red-600 hover:bg-red-50",
  };
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "inline-grid place-items-center w-9 h-9 rounded-lg border",
        styles[color]
      )}
    >
      {children}
    </button>
  );
}

/* ===================== Página ===================== */
export default function AdminDentistas() {
  const [itens, setItens] = useState<Dentista[]>([]);
  const [loading, setLoading] = useState(true);

  // busca local
  const [busca, setBusca] = useState("");

  // criar dentista (modal)
  const [modalNovoOpen, setModalNovoOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [cro, setCRO] = useState("");

  // edição inline
  const [editId, setEditId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editCRO, setEditCRO] = useState("");

  // modal de procedimentos
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

  // vincular usuário
  const [showVincularUser, setShowVincularUser] = useState(false);
  const [selDentistaId, setSelDentistaId] = useState("");
  const [selDentistaNome, setSelDentistaNome] = useState("");

  const carregar = async () => {
    setLoading(true);
    const lista = await AdminAPI.dentistas();
    setItens(lista);
    setLoading(false);
  };

  useEffect(() => {
    carregar();
  }, []);

  const criar = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = nome.trim();
    if (!n) return;
    await AdminAPI.criarDentista({ nome: n, cro: cro.trim() || undefined });
    setNome("");
    setCRO("");
    setModalNovoOpen(false);
    await carregar();
  };

  const iniciarEdicao = (d: Dentista) => {
    setEditId(d.id);
    setEditNome(d.nome);
    setEditCRO(d.cro ?? "");
  };

  const salvar = async () => {
    if (!editId) return;
    await AdminAPI.atualizarDentista(editId, {
      nome: editNome.trim(),
      cro: editCRO.trim() || undefined,
    });
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

  /* -------- Procedimentos -------- */
  const abrirModalProcedimentos = async (d: Dentista) => {
    setDentistaProc(d);
    setAba("vincular");
    setQ("");
    const [todos, doDentista] = await Promise.all([
      AdminAPI.procedimentos(),
      AdminAPI.procedimentosDoDentista(d.id),
    ]);
    setProcAll(todos);
    setProcSelIds(doDentista.map((p) => p.id));
    setShowProcModal(true);
  };
  const toggleProc = (id: string) => {
    setProcSelIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev]));
  };
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return procAll;
    return procAll.filter(
      (p) => p.nome.toLowerCase().includes(t) || String(p.duracaoMin).includes(t)
    );
  }, [procAll, q]);
  const selecionarTudoFiltrado = () => {
    const idsFiltrados = filtered.map((p) => p.id);
    setProcSelIds((prev) => Array.from(new Set([...prev, ...idsFiltrados])));
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

  /* -------- Vincular usuário -------- */
  const abrirVincularUsuario = (d: Dentista) => {
    setSelDentistaId(d.id);
    setSelDentistaNome(d.nome);
    setShowVincularUser(true);
  };

  /* -------- Busca -------- */
  const itensFiltrados = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (!t) return itens;
    return itens.filter(
      (d) =>
        d.nome.toLowerCase().includes(t) ||
        (d.cro ?? "").toLowerCase().includes(t)
    );
  }, [itens, busca]);

  return (
    <div className="min-h-screen">
      {/* Hero / Header da página */}
      <section className="px-4 sm:px-6 md:px-8 py-6 bg-gradient-to-br from-slate-50 to-blue-50/60 border-b border-slate-200/60">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">
            Dentistas
          </h1>
          <p className="text-slate-500 mt-1">
            Gerencie a equipe de profissionais
          </p>
        </div>
      </section>

      {/* Conteúdo */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-6">
        {/* Card com toolbar */}
        <div className="bg-white/90 backdrop-blur rounded-2xl border border-slate-200 shadow">
          <div className="flex items-center gap-3 p-4 border-b border-slate-200/70">
            {/* Busca */}
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar profissionais (nome, CRO)..."
                className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>

            {/* Botão filtro (placeholder visual) */}
            <IconButton title="Filtrar" color="gray">
              <FilterIcon className="w-5 h-5" />
            </IconButton>

            {/* Adicionar */}
            <button
              onClick={() => setModalNovoOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-medium shadow hover:opacity-95"
            >
              <PlusIcon className="w-5 h-5 text-white" />
              Adicionar Dentista
            </button>
          </div>

          {/* Cabeçalho da lista */}
          <div className="px-4 pt-4 pb-2">
            <h2 className="font-semibold text-slate-800">Lista de Profissionais</h2>
          </div>

          {/* Tabela */}
          <div className="px-2 pb-4">
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              {loading ? (
                <div className="p-6 text-center text-slate-500">Carregando...</div>
              ) : itensFiltrados.length === 0 ? (
                <div className="p-6 text-center text-slate-500">
                  Nenhum dentista encontrado.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-slate-600">
                      <th className="py-3 px-4">Profissional</th>
                      <th className="py-3 px-4">CRO</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-center">Consultas</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {itensFiltrados.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50/50">
                        {/* Profissional */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <Avatar name={d.nome} />
                            {editId === d.id ? (
                              <input
                                className="border rounded-lg px-2 py-1 w-64"
                                value={editNome}
                                onChange={(e) => setEditNome(e.target.value)}
                              />
                            ) : (
                              <div className="font-medium text-slate-800">{d.nome}</div>
                            )}
                          </div>
                        </td>

                        {/* CRO */}
                        <td className="py-3 px-4">
                          {editId === d.id ? (
                            <input
                              className="border rounded-lg px-2 py-1 w-36"
                              value={editCRO}
                              onChange={(e) => setEditCRO(e.target.value)}
                            />
                          ) : (
                            <span className="text-slate-700">{d.cro ?? "—"}</span>
                          )}
                        </td>

                        {/* Status (mock: Ativo) */}
                        <td className="py-3 px-4">
                          <StatusBadge>Ativo</StatusBadge>
                        </td>

                        {/* Consultas (mock: 0) */}
                        <td className="py-3 px-4 text-center text-slate-700">0</td>

                        {/* Ações */}
                        <td className="py-3 px-4">
                          <div className="flex justify-end gap-2">
                            {editId === d.id ? (
                              <>
                                <button
                                  onClick={salvar}
                                  className="px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
                                >
                                  Salvar
                                </button>
                                <button
                                  onClick={() => setEditId(null)}
                                  className="px-3 py-2 rounded-lg border hover:bg-slate-50"
                                >
                                  Cancelar
                                </button>
                              </>
                            ) : (
                              <>
                                <IconButton title="Procedimentos" color="blue" onClick={() => abrirModalProcedimentos(d)}>
                                  <ClipboardIcon className="w-5 h-5" />
                                </IconButton>
                                <IconButton title="Vincular usuário" color="green" onClick={() => abrirVincularUsuario(d)}>
                                  <UserPlusIcon className="w-5 h-5" />
                                </IconButton>
                                <IconButton title="Editar" color="gray" onClick={() => iniciarEdicao(d)}>
                                  <PencilIcon className="w-5 h-5" />
                                </IconButton>
                                <IconButton title="Remover" color="red" onClick={() => remover(d.id)}>
                                  <TrashIcon className="w-5 h-5" />
                                </IconButton>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Novo dentista */}
      {modalNovoOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <form
            onSubmit={criar}
            className="bg-white w-full max-w-2xl rounded-2xl shadow-lg p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Adicionar Dentista</h3>
              <button
                type="button"
                className="px-2 py-1 rounded border"
                onClick={() => setModalNovoOpen(false)}
              >
                Fechar
              </button>
            </div>
            <div className="grid md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-sm mb-1">Nome</label>
                <input
                  className="w-full border rounded-lg p-2"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm mb-1">CRO (opcional)</label>
                <input
                  className="w-full border rounded-lg p-2"
                  value={cro}
                  onChange={(e) => setCRO(e.target.value)}
                />
              </div>
              <div className="md:col-span-3 flex justify-end">
                <button className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700">
                  Cadastrar
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Modal de procedimentos */}
      {showProcModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-semibold">Procedimentos do dentista</h2>
                {dentistaProc && (
                  <p className="text-xs text-gray-600">
                    Dentista: <b>{dentistaProc.nome}</b>
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowProcModal(false)}
                className="px-2 py-1 rounded border"
              >
                Fechar
              </button>
            </div>

            {/* Abas */}
            <div className="flex gap-2 mb-3">
              <button
                className={cn(
                  "px-3 py-1 rounded",
                  aba === "vincular" ? "bg-blue-600 text-white" : "border"
                )}
                onClick={() => setAba("vincular")}
              >
                Vincular existentes
              </button>
              <button
                className={cn(
                  "px-3 py-1 rounded",
                  aba === "novo" ? "bg-blue-600 text-white" : "border"
                )}
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
                  <span className="text-xs text-gray-600">
                    Selecionados: {procSelIds.length}
                  </span>
                  <button onClick={selecionarTudoFiltrado} className="px-2 py-1 rounded border">
                    Selecionar filtrados
                  </button>
                  <button onClick={limparSelecao} className="px-2 py-1 rounded border">
                    Limpar
                  </button>
                </div>

                {/* Lista */}
                <div className="max-h-80 overflow-auto border rounded p-2 space-y-2">
                  {filtered.length === 0 ? (
                    <div className="text-sm text-gray-600">Nada encontrado.</div>
                  ) : (
                    filtered.map((p) => (
                      <label key={p.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={procSelIds.includes(p.id)}
                          onChange={() => toggleProc(p.id)}
                        />
                        <span className="font-medium">{p.nome}</span>
                        <span className="text-xs text-gray-500 ml-auto">
                          {p.duracaoMin}min + {p.bufferMin}min
                        </span>
                      </label>
                    ))
                  )}
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <button
                    onClick={() => setShowProcModal(false)}
                    className="px-3 py-2 rounded border"
                  >
                    Cancelar
                  </button>
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
                    type="number"
                    min={1}
                    className="w-full border rounded p-2"
                    value={novoDur}
                    onChange={(e) =>
                      setNovoDur(e.target.value === "" ? "" : Number(e.target.value))
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Buffer (min)</label>
                  <input
                    type="number"
                    min={0}
                    className="w-full border rounded p-2"
                    value={novoBuf}
                    onChange={(e) =>
                      setNovoBuf(e.target.value === "" ? "" : Number(e.target.value))
                    }
                  />
                </div>
                <div className="md:col-span-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setAba("vincular")}
                    className="px-3 py-2 rounded border"
                  >
                    Cancelar
                  </button>
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
