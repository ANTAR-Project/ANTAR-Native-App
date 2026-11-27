import {
  IMAGE_EXTENSIONS,
  PREVIEWABLE_EXTENSIONS,
  TEXT_EXTENSIONS,
  VIDEO_EXTENSIONS,
} from "./policies";
import type { JwtClaims, Session, UserRole } from "./types";

export function formatSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = bytes / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v < 10 ? 1 : 0)} ${units[i]}`;
}

export function formatDate(ts: number | string): string {
  const date = typeof ts === "number" ? new Date(ts) : new Date(ts);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(ts: number | string): string {
  const date = typeof ts === "number" ? new Date(ts) : new Date(ts);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getExtension(filename: string): string {
  const clean = filename.split("?")[0].replace(/\/+$/, "");
  const dot = clean.lastIndexOf(".");
  return dot === -1 ? "" : clean.slice(dot + 1).toLowerCase();
}

export function isPreviewable(filename: string): boolean {
  return PREVIEWABLE_EXTENSIONS.has(getExtension(filename));
}

export function isImageFile(filename: string): boolean {
  return IMAGE_EXTENSIONS.has(getExtension(filename));
}

export function isTextFile(filename: string): boolean {
  return TEXT_EXTENSIONS.has(getExtension(filename));
}

export function isVideoFile(filename: string): boolean {
  return VIDEO_EXTENSIONS.has(getExtension(filename));
}

function base64UrlDecode(input: string): string {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);

  if (typeof globalThis.atob === "function") {
    const binary = globalThis.atob(padded);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  // Fallback base64 decoder for JS runtimes without atob
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let out = "";
  let i = 0;
  const clean = padded.replace(/[^A-Za-z0-9+/=]/g, "");
  while (i < clean.length) {
    const enc1 = chars.indexOf(clean[i++]);
    const enc2 = chars.indexOf(clean[i++]);
    const enc3 = chars.indexOf(clean[i++]);
    const enc4 = chars.indexOf(clean[i++]);
    const chr1 = (enc1 << 2) | (enc2 >> 4);
    const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    const chr3 = ((enc3 & 3) << 6) | enc4;
    out += String.fromCharCode(chr1);
    if (enc3 !== 64 && enc3 !== -1) out += String.fromCharCode(chr2);
    if (enc4 !== 64 && enc4 !== -1) out += String.fromCharCode(chr3);
  }
  return out;
}

export function decodeJwtClaims(token: string): JwtClaims {
  const parts = token.split(".");
  if (parts.length < 2) {
    throw new Error("Malformed access token");
  }
  const json = base64UrlDecode(parts[1]);
  const parsed = JSON.parse(json) as Partial<JwtClaims>;
  const roleUpper = String(parsed.role ?? "GUEST").toUpperCase();
  const role: UserRole =
    roleUpper === "OWNER" || roleUpper === "RESIDENT" || roleUpper === "GUEST"
      ? roleUpper
      : "GUEST";

  return {
    sub: String(parsed.sub ?? ""),
    username: String(parsed.username ?? ""),
    role,
    sid: String(parsed.sid ?? ""),
    amr: Array.isArray(parsed.amr) ? parsed.amr.map(String) : undefined,
    iat: typeof parsed.iat === "number" ? parsed.iat : undefined,
    exp: typeof parsed.exp === "number" ? parsed.exp : undefined,
    jti: typeof parsed.jti === "string" ? parsed.jti : undefined,
    scope: typeof parsed.scope === "string" ? parsed.scope : undefined,
  };
}

export function sessionFromTokens(
  accessToken: string,
  refreshToken: string,
  expiresIn: number
): Session {
  const claims = decodeJwtClaims(accessToken);
  const expiresAtEpochMs = claims.exp
    ? claims.exp * 1000
    : Date.now() + expiresIn * 1000;

  return {
    accessToken,
    refreshToken,
    expiresIn,
    userId: claims.sub,
    username: claims.username,
    role: claims.role,
    sessionId: claims.sid,
    mustChangePassword: claims.scope === "pwd-change",
    expiresAtEpochMs,
  };
}

export function roleBadgeLabel(role: UserRole): string {
  switch (role) {
    case "OWNER":
      return "Owner";
    case "RESIDENT":
      return "Resident";
    case "GUEST":
      return "Guest";
  }
}
