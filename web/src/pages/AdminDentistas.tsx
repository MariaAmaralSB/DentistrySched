import { useEffect, useState } from "react";
import { AdminAPI } from "../api/client";

type Dentista = { id: string; nome: string; cro?: string };

export default function AdminDentistas() {
  const [itens, setItens] = useState<Dentista[]>([]);
  const [loading, setLoading] = useState(true);

  // form
  const [nome, setNome] = useState("");
  const [cro, setCRO] = useState("");

  // edição
  const [editId, setEditId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editCRO, setEditCRO] = useState("");

  const carregar = async () => {
    setLoading(true);
    const lista = await AdminAPI.dentistas();
    setItens(lista);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  const criar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;
    await AdminAPI.criarDentista({ nome: nome.trim(), cro: cro.trim() || undefined });
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

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto space-y-8">
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
                  <th className="py-2 w-40">Ações</th>
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
                    <td className="py-2 space-x-2">
                      {editId === d.id ? (
                        <>
                          <button onClick={salvar} className="px-3 py-1 rounded bg-green-600 text-white">Salvar</button>
                          <button onClick={() => setEditId(null)} className="px-3 py-1 rounded border">Cancelar</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => iniciarEdicao(d)} className="px-3 py-1 rounded border">Editar</button>
                          <button onClick={() => remover(d.id)} className="px-3 py-1 rounded bg-red-600 text-white">Remover</button>
                        </>
                      )}
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
    </div>
  );
}
