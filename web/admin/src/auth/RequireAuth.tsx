import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./useAuth";

type Props = { roles?: string[] };

export default function RequireAuth({ roles }: Props) {
  const { loading, user, roles: myRoles } = useAuth();

  if (loading) return null; // ou um spinner

  if (!user) return <Navigate to="/admin/login" replace />;

  if (roles && roles.length > 0 && !roles.some(r => myRoles.includes(r))) {
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
}
