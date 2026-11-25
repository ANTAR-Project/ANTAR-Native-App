import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import * as SecureStore from "expo-secure-store";

export type Role = "owner" | "resident";

export interface Session {
  token: string;
  username: string;
  role: Role;
}

interface AuthContextValue {
  session: Session | null;
  signIn: (s: Session) => void;
  logout: () => void;
  readVault: () => Promise<Session | null>;
  saveVault: (s: Session) => Promise<void>;
  clearVault: () => Promise<void>;
}

const VAULT_KEY = "antar_biometric_vault";
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);

  const signIn = useCallback((s: Session) => setSession(s), []);
  const logout = useCallback(() => setSession(null), []);

  const readVault = useCallback(async (): Promise<Session | null> => {
    try {
      const raw = await SecureStore.getItemAsync(VAULT_KEY);
      return raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      return null; // unsupported (web) or corrupted
    }
  }, []);

  const saveVault = useCallback(async (s: Session) => {
    await SecureStore.setItemAsync(VAULT_KEY, JSON.stringify(s));
  }, []);

  const clearVault = useCallback(async () => {
    try {
      await SecureStore.deleteItemAsync(VAULT_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({ session, signIn, logout, readVault, saveVault, clearVault }),
    [session, signIn, logout, readVault, saveVault, clearVault]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}