import { useTheme } from "../theme";

export default function DarkToggle() {
  const { dark, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className="inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm
                 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700
                 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
      title={dark ? "Modo claro" : "Modo escuro"}
    >
      <span className="i-lucide-sun hidden dark:inline" />
      <span className="i-lucide-moon inline dark:hidden" />
      {dark ? "Claro" : "Escuro"}
    </button>
  );
}
