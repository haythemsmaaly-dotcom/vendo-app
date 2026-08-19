import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { api, setAuthToken, User } from "@/src/api";

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
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token) {
        setAuthToken(token);
        try { setUser(await api.me()); }
        catch { await SecureStore.deleteItemAsync(TOKEN_KEY); setAuthToken(null); }
      }
      setReady(true);
    })();
  }, []);

  const accept = useCallback(async (res: { token: string; user: User }) => {
    await SecureStore.setItemAsync(TOKEN_KEY, res.token);
    setAuthToken(res.token);
    setUser(res.user);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => accept(await api.login(email, password)), [accept]);
  const register = useCallback(async (email: string, password: string, displayName: string, location?: string) => accept(await api.register(email, password, displayName, location)), [accept]);
  const signOut = useCallback(async () => { await SecureStore.deleteItemAsync(TOKEN_KEY); setAuthToken(null); setUser(null); }, []);
  const refresh = useCallback(async () => { if (user) setUser(await api.me()); }, [user]);

  const value = useMemo(() => ({ user, ready, signIn, register, signOut, refresh }), [user, ready, signIn, register, signOut, refresh]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
