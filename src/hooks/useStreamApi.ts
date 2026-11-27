import { useCallback } from "react";
import { File, UploadType } from "expo-file-system";
import type { VideoSourceObject } from "expo-video";
import { gatewayFetch, gatewayJson, parseErrorResponse } from "../api/client";
import { getGatewayUrl } from "../config";
import { useAuth } from "../context/AuthContext";
import type { PlaylistDto, StreamQualityOption } from "../types";

function formatBitrate(bps: number): string {
  if (bps >= 1_000_000) {
    return `${(bps / 1_000_000).toFixed(1)} Mbps`;
  }
  return `${Math.round(bps / 1_000)} kbps`;
}

/**
 * Parses an HLS master playlist (#EXTM3U / #EXT-X-STREAM-INF) into selectable
 * quality variants, resolving relative variant URIs against the master playlist URL.
 */
export function parseHlsMasterPlaylist(
  playlistText: string,
  masterUrl: string
): StreamQualityOption[] {
  const lines = playlistText.split(/\r?\n/).map((line) => line.trim());
  const variants: StreamQualityOption[] = [];
  const seenUris = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.startsWith("#EXT-X-STREAM-INF:")) continue;

    const attrs = line.slice("#EXT-X-STREAM-INF:".length);
    let uriLine = "";
    for (let j = i + 1; j < lines.length; j++) {
      const candidate = lines[j];
      if (!candidate || candidate.startsWith("#")) continue;
      uriLine = candidate;
      i = j;
      break;
    }
    if (!uriLine) continue;

    let resolvedUri = uriLine;
    try {
      resolvedUri = new URL(uriLine, masterUrl).toString();
    } catch {
      resolvedUri = uriLine;
    }
    if (seenUris.has(resolvedUri)) continue;
    seenUris.add(resolvedUri);

    const resMatch = attrs.match(/RESOLUTION=(\d+)x(\d+)/i);
    const width = resMatch ? Number(resMatch[1]) : undefined;
    const height = resMatch ? Number(resMatch[2]) : undefined;
    const resolution = width && height ? `${width}x${height}` : undefined;

    const bwMatch =
      attrs.match(/AVERAGE-BANDWIDTH=(\d+)/i) ?? attrs.match(/BANDWIDTH=(\d+)/i);
    const bandwidth = bwMatch ? Number(bwMatch[1]) : undefined;

    const nameMatch = attrs.match(/NAME="([^"]+)"/i);
    const label =
      nameMatch?.[1]?.trim() ||
      (height ? `${height}p` : undefined) ||
      (bandwidth ? formatBitrate(bandwidth) : `Quality ${variants.length + 1}`);

    variants.push({
      id: `${label}-${bandwidth ?? variants.length}`,
      label,
      resolution,
      width,
      height,
      bandwidth,
      uri: resolvedUri,
    });
  }

  return variants.sort((a, b) => {
    const heightDiff = (b.height ?? 0) - (a.height ?? 0);
    if (heightDiff !== 0) return heightDiff;
    return (b.bandwidth ?? 0) - (a.bandwidth ?? 0);
  });
}

export function useStreamApi() {
  const { session, ensureFreshAccessToken, refreshSession } = useAuth();

  const authToken = useCallback(async (): Promise<string> => {
    const token = (await ensureFreshAccessToken()) ?? session?.accessToken;
    if (!token) throw new Error("Not authenticated");
    return token;
  }, [ensureFreshAccessToken, session?.accessToken]);

  /** GET /api/v1/stream/playlists */
  const listPlaylists = useCallback(async (): Promise<PlaylistDto[]> => {
    const token = await authToken();
    const list = await gatewayJson<PlaylistDto[]>("/api/v1/stream/playlists", {
      method: "GET",
      token,
      onUnauthorizedRefresh: refreshSession,
    });
    return Array.isArray(list) ? list : [];
  }, [authToken, refreshSession]);

  /** POST /api/v1/videos/upload (multipart form-data with file + optional path) */
  const uploadVideo = useCallback(
    async (
      file: File,
      relativeDir: string = "",
      onProgress?: (pct: number) => void
    ): Promise<string> => {
      const token = await authToken();
      const qs = relativeDir ? `?path=${encodeURIComponent(relativeDir)}` : "";
      const url = `${getGatewayUrl()}/api/v1/videos/upload${qs}`;

      const task = file.createUploadTask(url, {
        httpMethod: "POST",
        uploadType: UploadType.MULTIPART,
        fieldName: "file",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        onProgress: ({ bytesSent, totalBytes }) => {
          const sent = Number(bytesSent);
          const total = Number(totalBytes);
          if (onProgress && total > 0) {
            onProgress(Math.min(100, Math.round((sent / total) * 100)));
          }
        },
      });

      const res = await task.uploadAsync();
      if (res.status < 200 || res.status >= 300) {
        let msg = `Video upload failed (HTTP ${res.status})`;
        try {
          const parsed = JSON.parse(res.body) as { message?: string; error?: string; code?: string };
          msg = parsed.message || parsed.error || parsed.code || msg;
        } catch {
          if (res.body) msg = res.body;
        }
        throw new Error(msg);
      }
      return res.body;
    },
    [authToken]
  );

  const fetchStreamQualities = useCallback(
    async (path: string): Promise<StreamQualityOption[]> => {
      const token = await authToken();
      const apiPath = `/api/v1/stream?path=${encodeURIComponent(path)}`;
      const res = await gatewayFetch(apiPath, {
        method: "GET",
        token,
        onUnauthorizedRefresh: refreshSession,
      });
      if (!res.ok) {
        throw await parseErrorResponse(res);
      }
      const text = await res.text();
      const masterUrl = res.url || `${getGatewayUrl()}${apiPath}`;
      return parseHlsMasterPlaylist(text, masterUrl);
    },
    [authToken, refreshSession]
  );

  /**
   * Builds authenticated HLS VideoSource for expo-video.
   * Uses Authorization header (not ?token=) so api-gateway strips the user JWT before
   * forwarding to streaming-service, allowing streaming-service to use its own service token
   * when calling nas-orchestrator gRPC, and explicitly sets contentType: "hls" for iOS AVPlayer.
   */
  const buildStreamSource = useCallback(
    (path: string, overrideUri?: string): VideoSourceObject => {
      const token = session?.accessToken ?? "";
      return {
        uri: overrideUri ?? `${getGatewayUrl()}/api/v1/stream?path=${encodeURIComponent(path)}`,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        contentType: "hls",
      };
    },
    [session?.accessToken]
  );

  /** Builds authenticated thumbnail preview URL via nas-orchestrator /files/preview */
  const buildThumbnailUrl = useCallback(
    (thumbnailPath: string | null): string | null => {
      if (!thumbnailPath) return null;
      const token = session?.accessToken ?? "";
      return `${getGatewayUrl()}/api/v1/nas/files/preview?path=${encodeURIComponent(
        thumbnailPath
      )}&token=${encodeURIComponent(token)}`;
    },
    [session?.accessToken]
  );

  return {
    listPlaylists,
    uploadVideo,
    fetchStreamQualities,
    buildStreamSource,
    buildThumbnailUrl,
  };
}
