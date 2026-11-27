import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const GATEWAY_URL_STORAGE_KEY = "antar_gateway_url";

function buildDefaultGatewayUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_GATEWAY_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  const scheme = process.env.EXPO_PUBLIC_API_SCHEME?.trim() || "http";
  const host = process.env.EXPO_PUBLIC_API_HOST?.trim() || "localhost";
  const port = process.env.EXPO_PUBLIC_API_PORT?.trim() || "8443";
  return `${scheme}://${host}:${port}`;
}

export const DEFAULT_GATEWAY_URL = buildDefaultGatewayUrl();

let currentGatewayUrl = DEFAULT_GATEWAY_URL;

export function normalizeGatewayUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed) return DEFAULT_GATEWAY_URL;

  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `http://${trimmed}`;

  try {
    const parsed = new URL(withScheme);
    if (!parsed.port && !trimmed.includes(":8443") && !/^https?:\/\/[^/:]+:\d+/.test(withScheme)) {
      parsed.port = "8443";
    }
    return parsed.toString().replace(/\/+$/, "");
  } catch {
    return withScheme;
  }
}

export function getGatewayUrl(): string {
  return currentGatewayUrl;
}

export function setGatewayUrlInMemory(url: string): string {
  currentGatewayUrl = normalizeGatewayUrl(url);
  return currentGatewayUrl;
}

export async function loadPersistedGatewayUrl(): Promise<string> {
  try {
    if (Platform.OS === "web" && typeof localStorage !== "undefined") {
      const v = localStorage.getItem(GATEWAY_URL_STORAGE_KEY);
      if (v) currentGatewayUrl = normalizeGatewayUrl(v);
      return currentGatewayUrl;
    }
    const stored = await SecureStore.getItemAsync(GATEWAY_URL_STORAGE_KEY);
    if (stored) {
      currentGatewayUrl = normalizeGatewayUrl(stored);
    }
  } catch {
    // Fallback to default
  }
  return currentGatewayUrl;
}

export async function saveGatewayUrl(url: string): Promise<string> {
  const normalized = setGatewayUrlInMemory(url);
  try {
    if (Platform.OS === "web" && typeof localStorage !== "undefined") {
      localStorage.setItem(GATEWAY_URL_STORAGE_KEY, normalized);
    } else {
      await SecureStore.setItemAsync(GATEWAY_URL_STORAGE_KEY, normalized);
    }
  } catch {
    // Ignore storage failure
  }
  return normalized;
}

export function getNotificationsWsUrl(token: string): string {
  const base = getGatewayUrl();
  const wsBase = base.replace(/^https:/i, "wss:").replace(/^http:/i, "ws:");
  return `${wsBase}/ws/notifications?token=${encodeURIComponent(token)}`;
}

const DEFAULT_IGNORED_FILES = [
  ".ds_store",
  "._*",
  "thumbs.db",
  "desktop.ini",
  ".spotlight-v100",
  ".trashes",
  ".fseventsd",
  ".temporaryitems",
];

function compilePattern(pattern: string): RegExp {
  const escaped = pattern
    .trim()
    .toLowerCase()
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`, "i");
}

const IGNORED_FILE_REGEXES: RegExp[] = (() => {
  const raw = process.env.EXPO_PUBLIC_IGNORED_FILES?.trim();
  const patterns = raw
    ? raw
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean)
    : DEFAULT_IGNORED_FILES;
  return patterns.map(compilePattern);
})();

export function isIgnoredNasEntry(name: string): boolean {
  const clean = name.replace(/\/+$/, "").trim();
  if (!clean) return false;
  return IGNORED_FILE_REGEXES.some((re) => re.test(clean));
}
