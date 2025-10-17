import { NavLink, Outlet, Link } from "react-router-dom";
import TenantSwitcher from "../components/TenantSwitcher";

const API_URL =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    (import.meta.env.VITE_API as string)) ||
  "http://localhost:5277";

const navItem =
  "flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 text-sm font-medium";
const active = "bg-gray-100 text-gray-900";

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="h-14 border-b bg-white">
        <div className="max-w-6xl mx-auto h-full flex items-center justify-between px-4">
          <div className="font-semibold">DentistrySched • Admin</div>

          <nav className="hidden sm:flex items-center gap-4 text-sm text-gray-600">
            <Link className="hover:text-gray-900" to="/site">Site</Link>
            <a
              className="hover:text-gray-900"
              target="_blank"
              rel="noreferrer"
              href={`${API_URL}/swagger`}
            >
              Swagger
            </a>

            <TenantSwitcher />
          </nav>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
        <aside className="bg-white rounded-2xl shadow p-3 h-max">
          <div className="text-xs uppercase text-gray-500 px-2 mb-2">Menu</div>
          <div className="flex flex-col gap-1">
            <NavLink to="/admin" end className={({ isActive }) => `${navItem} ${isActive ? active : ""}`}>🏠 Dashboard</NavLink>
            <NavLink to="/admin/dentistas" className={({ isActive }) => `${navItem} ${isActive ? active : ""}`}>🧑‍⚕️ Dentistas</NavLink>
            <NavLink to="/admin/agenda" className={({ isActive }) => `${navItem} ${isActive ? active : ""}`}>📅 Controle de Agenda</NavLink>
          </div>
        </aside>

        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
