import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { AuthAPI, LoginRequest, LoginResponse, MeResponse, getToken, setToken } from "../api/client";

type AuthState = {
  loading: boolean;
  user: MeResponse | null;
  roles: string[];
  token: string | null;
  login: (req: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (...rs: string[]) => boolean;
};

const AuthCtx = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<MeResponse | null>(null);
  const [token, setTok] = useState<string | null>(getToken());

  const roles = useMemo(() => user?.roles ?? [], [user]);

  useEffect(() => {
    (async () => {
      const t = getToken();
      if (!t) { setLoading(false); return; }
      try {
        const me = await AuthAPI.me();
        setUser(me);
      } catch {
        setToken(null);
        setTok(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (req: LoginRequest) => {
    const resp: LoginResponse = await AuthAPI.login(req);
    setToken(resp.token);
    setTok(resp.token);
    const me = await AuthAPI.me();
    setUser(me);
  };

  const logout = async () => {
    await AuthAPI.logout();
    setUser(null);
    setTok(null);
  };

  const hasRole = (...rs: string[]) => rs.some(r => roles.includes(r));

  const value: AuthState = { loading, user, roles, token, login, logout, hasRole };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider/>");
  return ctx;
}
