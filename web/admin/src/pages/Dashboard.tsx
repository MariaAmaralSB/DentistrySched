import StatTile from "../ui/StatTile";
import Card from "../ui/Card";
import { Clock, CalendarDays, CheckCircle, AlertCircle, Calendar } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-blue-700 bg-clip-text text-transparent">Dashboard</h1>
        <p className="text-slate-600">Visão geral das atividades do consultório</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatTile icon={Clock} value={0} title="Total do dia" />
        <StatTile icon={CalendarDays} value={0} title="Agendadas" color="from-emerald-500 to-teal-500" bg="from-emerald-50 to-teal-50" delay={.05}/>
        <StatTile icon={CheckCircle} value={0} title="Confirmadas" color="from-green-500 to-emerald-500" bg="from-green-50 to-emerald-50" delay={.1}/>
        <StatTile icon={AlertCircle} value={0} title="Canceladas" color="from-red-500 to-pink-500" bg="from-red-50 to-pink-50" delay={.15}/>
      </div>

      <Card>
        <div className="p-4 border-b border-blue-100 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Agenda do dia</h2>
          <button className="px-4 py-2 rounded-xl text-white bg-gradient-to-r from-blue-600 to-cyan-500">Atualizar</button>
        </div>
        <div className="p-8 text-center">
          <div className="size-16 rounded-full bg-slate-100 grid place-content-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-slate-500">Nenhuma consulta para os filtros atuais.</p>
          <button className="mt-4 px-6 py-3 rounded-xl text-white bg-gradient-to-r from-blue-600 to-cyan-500">Agendar consulta</button>
        </div>
      </Card>
    </div>
  );
}
