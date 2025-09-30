import { useParams, Link } from "react-router-dom";

export default function Success() {
  const { id } = useParams();
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow p-8 text-center space-y-4">
        <h1 className="text-2xl font-semibold">Consulta agendada! 🎉</h1>
        <p>Seu protocolo é:</p>
        <code className="px-3 py-2 rounded border inline-block">{id}</code>
        <div><Link to="/" className="text-blue-600 underline">Agendar outra</Link></div>
      </div>
    </div>
  );
}