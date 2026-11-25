import { useCallback } from "react";
import { gatewayJson } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type {
  CreateUserRequest,
  CreateWorkspaceResponse,
  UserResponse,
} from "../types";

export function useOwnerApi() {
  const { session, ensureFreshAccessToken, refreshSession } = useAuth();

  const authToken = useCallback(async (): Promise<string> => {
    const token = (await ensureFreshAccessToken()) ?? session?.accessToken;
    if (!token) throw new Error("Not authenticated");
    return token;
  }, [ensureFreshAccessToken, session?.accessToken]);

  /** GET /api/v1/auth/users (OWNER only) */
  const listUsers = useCallback(async (): Promise<UserResponse[]> => {
    const token = await authToken();
    const list = await gatewayJson<UserResponse[]>("/api/v1/auth/users", {
      method: "GET",
      token,
      onUnauthorizedRefresh: refreshSession,
    });
    return Array.isArray(list) ? list : [];
  }, [authToken, refreshSession]);

  /** POST /api/v1/auth/users (OWNER only; creates RESIDENT or GUEST) */
  const createUser = useCallback(
    async (req: CreateUserRequest): Promise<UserResponse> => {
      const token = await authToken();
      return gatewayJson<UserResponse>("/api/v1/auth/users", {
        method: "POST",
        token,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
        onUnauthorizedRefresh: refreshSession,
      });
    },
    [authToken, refreshSession]
  );

  /** POST /api/v1/nas/workspace/create */
  const provisionWorkspace = useCallback(
    async (name: string): Promise<CreateWorkspaceResponse> => {
      const token = await authToken();
      return gatewayJson<CreateWorkspaceResponse>("/api/v1/nas/workspace/create", {
        method: "POST",
        token,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
        onUnauthorizedRefresh: refreshSession,
      });
    },
    [authToken, refreshSession]
  );

  /** DELETE /api/v1/nas/shared/clear (OWNER unconditional) */
  const clearShared = useCallback(async (): Promise<void> => {
    const token = await authToken();
    await gatewayJson<void>("/api/v1/nas/shared/clear", {
      method: "DELETE",
      token,
      onUnauthorizedRefresh: refreshSession,
    });
  }, [authToken, refreshSession]);

  return {
    listUsers,
    createUser,
    provisionWorkspace,
    clearShared,
  };
}
