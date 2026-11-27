import { useCallback } from "react";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { gatewayJson } from "../api/client";
import type { LoginResponse, Session } from "../types";
import { sessionFromTokens } from "../utils";

export interface Credentials {
  username: string;
  password: string;
}

function resolveDeviceId(): string {
  const model = Device.modelName || Platform.OS;
  return `expo-${Platform.OS}-${model}`.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 64);
}

export function useAuthApi() {
  /** POST /api/v1/auth/login -> { accessToken, refreshToken, expiresIn } */
  const login = useCallback(async (req: Credentials): Promise<Session> => {
    const data = await gatewayJson<LoginResponse>("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: req.username.trim(),
        password: req.password,
        deviceId: resolveDeviceId(),
      }),
    });
    return sessionFromTokens(data.accessToken, data.refreshToken, data.expiresIn);
  }, []);

  /** POST /api/v1/auth/refresh -> rotates refresh token and issues a new pair */
  const refreshWithToken = useCallback(async (refreshToken: string): Promise<Session> => {
    const data = await gatewayJson<LoginResponse>("/api/v1/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    return sessionFromTokens(data.accessToken, data.refreshToken, data.expiresIn);
  }, []);

  return { login, refreshWithToken };
}
