import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, setAuthToken, User } from "@/src/api";
import { storage } from "@/src/utils/storage";

const TOKEN_KEY = "vendo.auth.token";

type AuthCtx = {
  user: User | null;
  ready: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string, location?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const token = await storage.secureGet<string>(TOKEN_KEY, "");
        if (token) {
          setAuthToken(token);
          try { setUser(await api.me()); }
          catch { await storage.secureRemove(TOKEN_KEY); setAuthToken(null); }
        }
      } catch {
        // Never let session restore crash app boot.
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const accept = useCallback(async (res: { token: string; user: User }) => {
    await storage.secureSet(TOKEN_KEY, res.token);
    setAuthToken(res.token);
    setUser(res.user);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => accept(await api.login(email, password)), [accept]);
  const register = useCallback(async (email: string, password: string, displayName: string, location?: string) => accept(await api.register(email, password, displayName, location)), [accept]);
  const signOut = useCallback(async () => { await storage.secureRemove(TOKEN_KEY); setAuthToken(null); setUser(null); }, []);
  const refresh = useCallback(async () => { if (user) setUser(await api.me()); }, [user]);

  const value = useMemo(() => ({ user, ready, signIn, register, signOut, refresh }), [user, ready, signIn, register, signOut, refresh]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
