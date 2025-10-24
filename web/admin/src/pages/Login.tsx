import { FormEvent, useState } from "react";
import { useAuth } from "../auth/useAuth";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("admin@clinic.local");
  const [password, setPassword] = useState("Admin@123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ email, password });
      // redireciona automático pelo guard (ou use navigate)
      window.location.href = "/admin";
    } catch (err: any) {
      setError("Login inválido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <form onSubmit={submit} className="bg-white w-full max-w-sm p-6 rounded-2xl shadow">
        <h1 className="text-xl font-semibold mb-4">Entrar</h1>

        <label className="block text-sm mb-1">E-mail</label>
        <input
          className="w-full border rounded-lg p-2 mb-3"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email"
        />

        <label className="block text-sm mb-1">Senha</label>
        <input
          type="password"
          className="w-full border rounded-lg p-2 mb-4"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="senha"
        />

        {error && <div className="text-red-600 text-sm mb-3">{error}</div>}

        <button
          type="submit"
          className="w-full bg-blue-600 text-white rounded-lg py-2 disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
