import { useCallback } from "react";
import { AUTH_API, MOCK_AUTH } from "../config";

export interface Credentials {
  username: string;
  password: string;
}
export interface LoginResponse {
  username: string;
  token: string;
}

async function request(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch {
    throw new Error("Cannot reach the server. Check your network and API host.");
  } finally {
    clearTimeout(timer);
  }
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function useAuthApi() {
  /** POST /register: 201 on success, 409 if the username is taken. */
  const register = useCallback(async (req: Credentials): Promise<void> => {
    if (MOCK_AUTH) return sleep(500);
    const res = await request(`${AUTH_API}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...req, accountType: "USER" }),
    });
    if (res.status === 409) throw new Error("Username already taken");
    if (!res.ok) throw new Error(`Registration failed (HTTP ${res.status})`);
  }, []);

  /** POST /login: returns a signed JWT, 401 on bad credentials. */
  const login = useCallback(async (req: Credentials): Promise<LoginResponse> => {
    if (MOCK_AUTH) {
      await sleep(500);
      return { username: req.username, token: `mock-token-${req.username}` };
    }
    const res = await request(`${AUTH_API}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    if (res.status === 401) throw new Error("Invalid username or password");
    if (!res.ok) throw new Error(`Login failed (HTTP ${res.status})`);
    return res.json();
  }, []);

  /** GET /tokens/validate: throws if the JWT is expired or invalid. */
  const validateToken = useCallback(async (token: string): Promise<void> => {
    if (MOCK_AUTH) return;
    const res = await request(
      `${AUTH_API}/tokens/validate?token=${encodeURIComponent(token)}`
    );
    if (!res.ok) throw new Error("Session expired");
  }, []);

  return { register, login, validateToken };
}