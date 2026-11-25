import { useCallback } from "react";
import { File, UploadType } from "expo-file-system";
import type { VideoSourceObject } from "expo-video";
import { gatewayJson } from "../api/client";
import { getGatewayUrl } from "../config";
import { useAuth } from "../context/AuthContext";
import type { PlaylistDto } from "../types";

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

  /**
   * Builds authenticated HLS VideoSource for expo-video.
   * Uses Authorization header (not ?token=) so api-gateway strips the user JWT before
   * forwarding to streaming-service, allowing streaming-service to use its own service token
   * when calling nas-orchestrator gRPC, and explicitly sets contentType: "hls" for iOS AVPlayer.
   */
  const buildStreamSource = useCallback(
    (path: string): VideoSourceObject => {
      const token = session?.accessToken ?? "";
      return {
        uri: `${getGatewayUrl()}/api/v1/stream?path=${encodeURIComponent(path)}`,
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
    buildStreamSource,
    buildThumbnailUrl,
  };
}
