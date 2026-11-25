import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import {
  getGatewayUrl,
  loadPersistedGatewayUrl,
  saveGatewayUrl,
} from "../config";
import { gatewayFetch, parseErrorResponse } from "../api/client";
import type { LoginResponse, Session } from "../types";
import { sessionFromTokens } from "../utils";

const SESSION_KEY = "antar_active_session";
const VAULT_KEY = "antar_biometric_vault";

async function storeGet(key: string): Promise<string | null> {
  try {
    if (Platform.OS === "web" && typeof localStorage !== "undefined") {
      return localStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function storeSet(key: string, value: string): Promise<void> {
  try {
    if (Platform.OS === "web" && typeof localStorage !== "undefined") {
      localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  } catch {
    // ignore storage failures
  }
}

async function storeDelete(key: string): Promise<void> {
  try {
    if (Platform.OS === "web" && typeof localStorage !== "undefined") {
      localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  } catch {
    // ignore storage failures
  }
}

interface AuthContextValue {
  session: Session | null;
  booting: boolean;
  gatewayUrl: string;
  updateGatewayUrl: (url: string) => Promise<string>;
  signIn: (s: Session) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<string | null>;
  ensureFreshAccessToken: () => Promise<string | null>;
  readVault: () => Promise<Session | null>;
  saveVault: (s: Session) => Promise<void>;
  clearVault: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [booting, setBooting] = useState(true);
  const [gatewayUrl, setGatewayUrl] = useState(getGatewayUrl());

  const sessionRef = useRef<Session | null>(null);
  sessionRef.current = session;

  const refreshInFlightRef = useRef<Promise<string | null> | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const loadedUrl = await loadPersistedGatewayUrl();
      if (active) setGatewayUrl(loadedUrl);

      const raw = await storeGet(SESSION_KEY);
      if (raw && active) {
        try {
          const parsed = JSON.parse(raw) as Session;
          if (parsed?.accessToken && parsed?.refreshToken && parsed?.username) {
            setSession(parsed);
          }
        } catch {
          await storeDelete(SESSION_KEY);
        }
      }
      if (active) setBooting(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const updateGatewayUrl = useCallback(async (url: string): Promise<string> => {
    const saved = await saveGatewayUrl(url);
    setGatewayUrl(saved);
    return saved;
  }, []);

  const persistSessionEverywhere = useCallback(async (next: Session) => {
    sessionRef.current = next;
    setSession(next);
    await storeSet(SESSION_KEY, JSON.stringify(next));

    // Keep biometric vault synchronized so refresh token rotation never leaves a stale token in vault
    const existingVault = await storeGet(VAULT_KEY);
    if (existingVault) {
      await storeSet(VAULT_KEY, JSON.stringify(next));
    }
  }, []);

  const signIn = useCallback(
    async (s: Session) => {
      await persistSessionEverywhere(s);
    },
    [persistSessionEverywhere]
  );

  const clearLocalSession = useCallback(async () => {
    sessionRef.current = null;
    setSession(null);
    await storeDelete(SESSION_KEY);
  }, []);

  const logout = useCallback(async () => {
    const cur = sessionRef.current;
    await clearLocalSession();
    if (cur?.accessToken && cur?.sessionId) {
      try {
        await gatewayFetch("/api/v1/auth/logout", {
          method: "POST",
          token: cur.accessToken,
          headers: {
            "X-Session-Id": cur.sessionId,
          },
          timeoutMs: 5_000,
        });
      } catch {
        // Best-effort server revoke; local session is cleared either way
      }
    }
  }, [clearLocalSession]);

  const refreshSession = useCallback(async (): Promise<string | null> => {
    if (refreshInFlightRef.current) {
      return refreshInFlightRef.current;
    }

    const promise = (async (): Promise<string | null> => {
      const cur = sessionRef.current;
      if (!cur?.refreshToken) return null;

      try {
        const res = await gatewayFetch("/api/v1/auth/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: cur.refreshToken }),
        });

        if (!res.ok) {
          const err = await parseErrorResponse(res);
          if (err.status === 401 || err.status === 403) {
            await clearLocalSession();
            await storeDelete(VAULT_KEY);
          }
          return null;
        }

        const data = (await res.json()) as LoginResponse;
        const rotated = sessionFromTokens(
          data.accessToken,
          data.refreshToken,
          data.expiresIn
        );
        await persistSessionEverywhere(rotated);
        return rotated.accessToken;
      } catch {
        return null;
      } finally {
        refreshInFlightRef.current = null;
      }
    })();

    refreshInFlightRef.current = promise;
    return promise;
  }, [clearLocalSession, persistSessionEverywhere]);

  const ensureFreshAccessToken = useCallback(async (): Promise<string | null> => {
    const cur = sessionRef.current;
    if (!cur) return null;
    const expiresAt = cur.expiresAtEpochMs ?? 0;
    // Refresh proactively if within 60 seconds of expiry
    if (expiresAt > 0 && Date.now() >= expiresAt - 60_000) {
      return refreshSession();
    }
    return cur.accessToken;
  }, [refreshSession]);

  const readVault = useCallback(async (): Promise<Session | null> => {
    const raw = await storeGet(VAULT_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Session;
    } catch {
      return null;
    }
  }, []);

  const saveVault = useCallback(async (s: Session) => {
    await storeSet(VAULT_KEY, JSON.stringify(s));
  }, []);

  const clearVault = useCallback(async () => {
    await storeDelete(VAULT_KEY);
  }, []);

  const value = useMemo(
    () => ({
      session,
      booting,
      gatewayUrl,
      updateGatewayUrl,
      signIn,
      logout,
      refreshSession,
      ensureFreshAccessToken,
      readVault,
      saveVault,
      clearVault,
    }),
    [
      session,
      booting,
      gatewayUrl,
      updateGatewayUrl,
      signIn,
      logout,
      refreshSession,
      ensureFreshAccessToken,
      readVault,
      saveVault,
      clearVault,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
