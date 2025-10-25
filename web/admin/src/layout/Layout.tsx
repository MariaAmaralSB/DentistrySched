// src/layout/Layout.tsx
import { NavLink, Outlet, Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import TenantSwitcher from "../components/TenantSwitcher";
import { AuthAPI } from "../api/client";
import Logo from "../components/Logo";
import {
  IconBadge,
  DashboardIcon,
  DentistsIcon,
  CalendarIcon,
  ReportsIcon,
} from "../components/icons";

const API_URL =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    (import.meta.env.VITE_API as string)) ||
  "http://localhost:5277";

const navItem =
  "flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100 text-sm font-medium";
const active = "bg-slate-100 text-slate-900";

export default function Layout() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const onLogout = async () => {
    try {
      await AuthAPI.logout();
      qc.clear();
    } finally {
      navigate("/admin/login", { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto h-14 px-4 flex items-center justify-between">
          <Logo full={false} />

          <nav className="hidden sm:flex items-center gap-4 text-sm text-gray-600">
            <TenantSwitcher />
            <button
              onClick={onLogout}
              className="px-3 py-1.5 rounded-lg border hover:bg-gray-100"
              title="Sair"
            >
              Sair
            </button>
          </nav>
        </div>
      </header>

      {/* GRID */}
      <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
        {/* Sidebar */}
        <aside className="bg-white/90 backdrop-blur rounded-2xl shadow p-3 h-max border border-slate-200">
          <div className="text-xs uppercase text-gray-500 px-2 mb-2">Menu</div>
          <div className="flex flex-col gap-1">
            <NavLink
              to="/admin"
              end
              className={({ isActive }) => `${navItem} ${isActive ? active : ""}`}
            >
              <IconBadge size={34} title="Dashboard">
                <DashboardIcon size={18} />
              </IconBadge>
              Dashboard
            </NavLink>

            <NavLink
              to="/admin/dentistas"
              className={({ isActive }) => `${navItem} ${isActive ? active : ""}`}
            >
              <IconBadge size={34} title="Dentistas">
                <DentistsIcon size={18} />
              </IconBadge>
              Dentistas
            </NavLink>

            <NavLink
              to="/admin/agenda"
              className={({ isActive }) => `${navItem} ${isActive ? active : ""}`}
            >
              <IconBadge size={34} title="Controle de Agenda">
                <CalendarIcon size={18} />
              </IconBadge>
              Controle de Agenda
            </NavLink>

            <NavLink
              to="/admin/relatorios"
              className={({ isActive }) => `${navItem} ${isActive ? active : ""}`}
            >
              <IconBadge size={34} title="Relatórios">
                <ReportsIcon size={18} />
              </IconBadge>
              Relatórios
            </NavLink>

            <div className="mt-3 p-3 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 grid place-content-center text-white text-xs">
                  CA
                </div>
                <div className="text-sm">
                  <div className="font-semibold text-slate-800">Clínica A</div>
                  <div className="text-slate-500">Admin</div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Conteúdo */}
        <main className="min-h-[60vh]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
