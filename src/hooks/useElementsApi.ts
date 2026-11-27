import { useCallback } from "react";
import { gatewayJson } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { ElementReadResponse, ElementStateResponse } from "../types";

export function useElementsApi() {
  const { session, ensureFreshAccessToken, refreshSession } = useAuth();

  const authToken = useCallback(async (): Promise<string> => {
    const token = (await ensureFreshAccessToken()) ?? session?.accessToken;
    if (!token) throw new Error("Not authenticated");
    return token;
  }, [ensureFreshAccessToken, session?.accessToken]);

  /** GET /api/v1/elements/{elementId} */
  const readElement = useCallback(
    async (elementId: string): Promise<ElementReadResponse> => {
      const token = await authToken();
      return gatewayJson<ElementReadResponse>(
        `/api/v1/elements/${encodeURIComponent(elementId.trim())}`,
        {
          method: "GET",
          token,
          onUnauthorizedRefresh: refreshSession,
        }
      );
    },
    [authToken, refreshSession]
  );

  /** PUT /api/v1/elements/{elementId}/state */
  const controlElement = useCallback(
    async (
      elementId: string,
      payload: Record<string, unknown>
    ): Promise<ElementStateResponse> => {
      const token = await authToken();
      return gatewayJson<ElementStateResponse>(
        `/api/v1/elements/${encodeURIComponent(elementId.trim())}/state`,
        {
          method: "PUT",
          token,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          onUnauthorizedRefresh: refreshSession,
        }
      );
    },
    [authToken, refreshSession]
  );

  return { readElement, controlElement };
}
