import { getGatewayUrl } from "../config";
import type { GatewayProblem } from "../types";

export class ApiError extends Error {
  status: number;
  code: string;
  intentId?: string;

  constructor(status: number, code: string, message: string, intentId?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.intentId = intentId;
  }
}

const CODE_MESSAGES: Record<string, string> = {
  POLICY_DENIED: "Blocked by Hearth Policy Registry (403 POLICY_DENIED).",
  AUTH_INVALID: "Authentication invalid or expired.",
  TOKEN_EXPIRED: "Your session token has expired.",
  SESSION_REVOKED: "Your session has been signed out or revoked.",
  AUTH_UNAVAILABLE: "Auth verification service is temporarily unavailable.",
  INVALID_CREDENTIALS: "Invalid username or password.",
  ACCOUNT_SUSPENDED: "Your account has been suspended by the Owner.",
  ACCOUNT_EXPIRED: "Your guest access has expired.",
  INVALID_REFRESH_TOKEN: "Session expired. Please sign in again.",
  USERNAME_ALREADY_EXISTS: "Username already exists.",
  CANNOT_CREATE_OWNER_ROLE: "Only one Owner is allowed; cannot create another Owner.",
  FORBIDDEN_OWNER_REQUIRED: "Owner role is required for this action.",
  ROUTE_NOT_FOUND: "Endpoint not found on API Gateway.",
};

export function humanizeBackendError(
  status: number,
  code: string,
  fallback?: string
): string {
  if (code && CODE_MESSAGES[code]) return CODE_MESSAGES[code];
  if (fallback && fallback.trim()) return fallback;
  if (status === 401) return "Unauthorized. Please sign in again.";
  if (status === 403) return "Forbidden by backend policy.";
  if (status === 404) return "Requested resource was not found.";
  if (status === 409) return "Resource already exists.";
  if (status === 415) return "File type is not supported for inline preview.";
  return `Request failed (HTTP ${status})`;
}

export async function parseErrorResponse(res: Response): Promise<ApiError> {
  const raw = await res.text().catch(() => "");
  let parsed: GatewayProblem | null = null;
  if (raw) {
    try {
      parsed = JSON.parse(raw) as GatewayProblem;
    } catch {
      parsed = null;
    }
  }

  const code =
    parsed?.code ||
    parsed?.error ||
    `HTTP_${res.status}`;
  const msg = humanizeBackendError(
    res.status,
    code,
    parsed?.message || parsed?.error || parsed?.title || raw
  );
  return new ApiError(res.status, code, msg, parsed?.intentId);
}

export interface GatewayFetchOptions extends RequestInit {
  token?: string | null;
  timeoutMs?: number;
  /** Optional callback to refresh an expired token once on 401. */
  onUnauthorizedRefresh?: () => Promise<string | null>;
}

export async function gatewayFetch(
  path: string,
  options: GatewayFetchOptions = {}
): Promise<Response> {
  const {
    token,
    timeoutMs = 15_000,
    onUnauthorizedRefresh,
    headers: initHeaders,
    ...rest
  } = options;

  const exec = async (bearer: string | null | undefined): Promise<Response> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const headers = new Headers(initHeaders);
    if (bearer) {
      headers.set("Authorization", `Bearer ${bearer}`);
    }
    const url = `${getGatewayUrl()}${path.startsWith("/") ? path : `/${path}`}`;
    try {
      return await fetch(url, {
        ...rest,
        headers,
        signal: controller.signal,
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new ApiError(408, "REQUEST_TIMEOUT", "Request timed out reaching the API Gateway.");
      }
      throw new ApiError(
        0,
        "NETWORK_ERROR",
        `Cannot reach API Gateway at ${getGatewayUrl()}. Check host IP, port 8443, and network.`
      );
    } finally {
      clearTimeout(timer);
    }
  };

  let res = await exec(token);

  if (res.status === 401 && onUnauthorizedRefresh) {
    const nextToken = await onUnauthorizedRefresh();
    if (nextToken) {
      res = await exec(nextToken);
    }
  }

  return res;
}

export async function gatewayJson<T>(
  path: string,
  options: GatewayFetchOptions = {}
): Promise<T> {
  const res = await gatewayFetch(path, options);
  if (!res.ok) {
    throw await parseErrorResponse(res);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export async function testGatewayConnection(urlOverride?: string): Promise<{
  ok: boolean;
  latencyMs: number;
  detail: string;
}> {
  const target = (urlOverride || getGatewayUrl()).replace(/\/+$/, "");
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5_000);
  try {
    const res = await fetch(`${target}/.well-known/jwks.json`, {
      method: "GET",
      signal: controller.signal,
    });
    const latencyMs = Date.now() - start;
    if (!res.ok) {
      return {
        ok: false,
        latencyMs,
        detail: `Gateway responded HTTP ${res.status}`,
      };
    }
    return {
      ok: true,
      latencyMs,
      detail: `Connected (${latencyMs} ms)`,
    };
  } catch (err) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      detail:
        err instanceof Error && err.name === "AbortError"
          ? "Connection timed out"
          : `Unreachable at ${target}`,
    };
  } finally {
    clearTimeout(timer);
  }
}
