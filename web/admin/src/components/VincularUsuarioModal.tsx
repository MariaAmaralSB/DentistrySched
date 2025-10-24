import { useState, useEffect } from "react";
import { AuthAPI, RegisterUserRequest } from "../api/client";

type Props = {
  open: boolean;
  onClose: () => void;
  dentistaId: string;
  dentistaNome: string;
};

export default function VincularUsuarioModal({ open, onClose, dentistaId, dentistaNome }: Props) {
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [role, setRole] = useState<"Dentista" | "Recepcao" | "Admin">("Dentista");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const disabled = !email || !senha || loading;

  useEffect(() => {
    if (open) {
      setEmail("");
      setNome(dentistaNome || "");
      setSenha("");
      setRole("Dentista");
      setError(null);
    }
  }, [open, dentistaNome]);

  if (!open) return null;

  const submit = async () => {
    try {
      setLoading(true);
      setError(null);

      const payload: RegisterUserRequest = {
        email,
        password: senha,
        name: nome || undefined,
        dentistaId,
        role,
      };

      await AuthAPI.register(payload);
      onClose();
      alert("Usuário vinculado com sucesso!");
    } catch (e: any) {
      const msg = e?.response?.data || e?.message || "Falha ao criar usuário.";
      setError(typeof msg === "string" ? msg : "Erro ao criar usuário.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-white w-full max-w-lg rounded-2xl p-4 shadow">
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-semibold">Vincular usuário ao dentista</div>
          <button className="border rounded px-3 py-1" onClick={onClose}>Fechar</button>
        </div>

        <div className="text-sm text-slate-600 mb-3">
          Dentista: <span className="font-medium">{dentistaNome}</span>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-sm text-slate-600">Nome</label>
            <input
              className="w-full border rounded p-2"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Dra Ana"
            />
          </div>

          <div>
            <label className="text-sm text-slate-600">E-mail</label>
            <input
              className="w-full border rounded p-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
              type="email"
            />
          </div>

          <div>
            <label className="text-sm text-slate-600">Senha</label>
            <input
              className="w-full border rounded p-2"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
              type="password"
            />
          </div>

          <div>
            <label className="text-sm text-slate-600">Função</label>
            <select
              className="w-full border rounded p-2 bg-white"
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
            >
              <option value="Dentista">Dentista</option>
              <option value="Recepcao">Recepção</option>
              <option value="Admin">Admin</option>
            </select>
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <div className="flex justify-end gap-2 pt-2">
            <button className="border rounded px-3 py-1" onClick={onClose}>
              Cancelar
            </button>
            <button
              className="rounded px-3 py-1 bg-blue-600 text-white disabled:opacity-60"
              disabled={disabled}
              onClick={submit}
            >
              {loading ? "Criando…" : "Vincular usuário"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
