import { Link } from "react-router-dom";

export default function Logo({ full = false }: { full?: boolean }) {
  return (
    <Link to="/admin" className="flex items-center gap-3">
      {full ? (
        <img src="/dentify-logo.svg" alt="Dentify" className="h-8 w-auto" />
      ) : (
        <>
          <img src="/dentify-icon-circle.svg" alt="Dentify" className="w-8 h-8 rounded-lg shadow" />
          <div className="font-semibold">Dentify • Admin</div>
        </>
      )}
    </Link>
  );
}