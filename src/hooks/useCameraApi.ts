import { useCallback } from "react";
import { gatewayFetch, gatewayJson, parseErrorResponse } from "../api/client";
import { getGatewayUrl } from "../config";
import { useAuth } from "../context/AuthContext";
import type {
  CameraDevice,
  CameraPtzCommand,
  CameraRecordResponse,
  CameraScanResponse,
  CameraStatusResponse,
  CameraStreamUrlsResponse,
} from "../types";

export const DEFAULT_CAMERA_ENTITY_ID = "camera.front_porch_cam";

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i];
    const b2 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b3 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const triplet = (b1 << 16) | (b2 << 8) | b3;
    out += chars[(triplet >> 18) & 63];
    out += chars[(triplet >> 12) & 63];
    out += i + 1 < bytes.length ? chars[(triplet >> 6) & 63] : "=";
    out += i + 2 < bytes.length ? chars[triplet & 63] : "=";
  }
  return out;
}

export function resolveCameraEntityId(device: CameraDevice): string | null {
  const id = device.entity_id ?? device.entityId;
  return typeof id === "string" && id.trim() ? id.trim() : null;
}

export function useCameraApi() {
  const { session, ensureFreshAccessToken, refreshSession } = useAuth();

  const authToken = useCallback(async (): Promise<string> => {
    const token = (await ensureFreshAccessToken()) ?? session?.accessToken;
    if (!token) throw new Error("Not authenticated");
    return token;
  }, [ensureFreshAccessToken, session?.accessToken]);

  /** GET /api/v1/devices */
  const discoverDevices = useCallback(async (): Promise<CameraDevice[]> => {
    const token = await authToken();
    const res = await gatewayJson<CameraDevice[] | { devices?: CameraDevice[] }>(
      "/api/v1/devices",
      {
        method: "GET",
        token,
        onUnauthorizedRefresh: refreshSession,
      }
    );
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.devices)) return res.devices;
    return [];
  }, [authToken, refreshSession]);

  /**
   * POST /api/v1/camera/{entityId}/webrtc
   * Sends raw SDP offer (Content-Type: application/sdp) and returns raw SDP answer.
   */
  const negotiateWebRtc = useCallback(
    async (entityId: string, sdpOffer: string): Promise<string> => {
      const token = await authToken();
      const res = await gatewayFetch(
        `/api/v1/camera/${encodeURIComponent(entityId.trim())}/webrtc`,
        {
          method: "POST",
          token,
          headers: { "Content-Type": "application/sdp" },
          body: sdpOffer,
          timeoutMs: 10_000,
          onUnauthorizedRefresh: refreshSession,
        }
      );
      if (!res.ok) {
        throw await parseErrorResponse(res);
      }
      return res.text();
    },
    [authToken, refreshSession]
  );

  /** Public MJPEG live stream route */
  const getMjpegStreamUrl = useCallback((entityId: string): string => {
    return `${getGatewayUrl()}/api/v1/camera/${encodeURIComponent(entityId.trim())}/stream`;
  }, []);

  /** GET /api/v1/camera/{entityId}/snapshot (authenticated JPEG bytes -> data URI) */
  const fetchSnapshotDataUri = useCallback(
    async (entityId: string): Promise<string> => {
      const token = await authToken();
      const ts = Date.now();
      const res = await gatewayFetch(
        `/api/v1/camera/${encodeURIComponent(entityId.trim())}/snapshot?t=${ts}`,
        {
          method: "GET",
          token,
          timeoutMs: 10_000,
          onUnauthorizedRefresh: refreshSession,
        }
      );
      if (!res.ok) {
        throw await parseErrorResponse(res);
      }
      const buffer = await res.arrayBuffer();
      const contentType = res.headers.get("content-type") || "image/jpeg";
      const base64 = arrayBufferToBase64(buffer);
      return `data:${contentType};base64,${base64}`;
    },
    [authToken, refreshSession]
  );

  /** GET /api/v1/camera/{entityId}/stream-url */
  const getStreamUrls = useCallback(
    async (entityId: string): Promise<CameraStreamUrlsResponse> => {
      const token = await authToken();
      return gatewayJson<CameraStreamUrlsResponse>(
        `/api/v1/camera/${encodeURIComponent(entityId.trim())}/stream-url`,
        {
          method: "GET",
          token,
          onUnauthorizedRefresh: refreshSession,
        }
      );
    },
    [authToken, refreshSession]
  );

  /** POST /api/v1/camera/{entityId}/ptz */
  const sendPtzCommand = useCallback(
    async (
      entityId: string,
      command: CameraPtzCommand,
      speed: number = 4
    ): Promise<Record<string, unknown>> => {
      const token = await authToken();
      return gatewayJson<Record<string, unknown>>(
        `/api/v1/camera/${encodeURIComponent(entityId.trim())}/ptz`,
        {
          method: "POST",
          token,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ command, speed }),
          onUnauthorizedRefresh: refreshSession,
        }
      );
    },
    [authToken, refreshSession]
  );

  /** POST /api/v1/camera/{entityId}/record?duration=15 (5-180s) */
  const recordClip = useCallback(
    async (entityId: string, duration: number = 15): Promise<CameraRecordResponse> => {
      const token = await authToken();
      const clamped = Math.max(5, Math.min(180, Math.round(duration)));
      return gatewayJson<CameraRecordResponse>(
        `/api/v1/camera/${encodeURIComponent(entityId.trim())}/record?duration=${clamped}`,
        {
          method: "POST",
          token,
          timeoutMs: (clamped + 20) * 1000,
          onUnauthorizedRefresh: refreshSession,
        }
      );
    },
    [authToken, refreshSession]
  );

  /** GET /api/v1/camera/status */
  const getCameraStatus = useCallback(async (): Promise<CameraStatusResponse> => {
    const token = await authToken();
    return gatewayJson<CameraStatusResponse>("/api/v1/camera/status", {
      method: "GET",
      token,
      onUnauthorizedRefresh: refreshSession,
    });
  }, [authToken, refreshSession]);

  /** POST /api/v1/camera/scan */
  const scanSubnet = useCallback(
    async (target?: string): Promise<CameraScanResponse> => {
      const token = await authToken();
      const cleanTarget = target?.trim();
      return gatewayJson<CameraScanResponse>("/api/v1/camera/scan", {
        method: "POST",
        token,
        headers: cleanTarget ? { "Content-Type": "application/json" } : undefined,
        body: cleanTarget ? JSON.stringify({ target: cleanTarget }) : undefined,
        timeoutMs: 30_000,
        onUnauthorizedRefresh: refreshSession,
      });
    },
    [authToken, refreshSession]
  );

  return {
    discoverDevices,
    negotiateWebRtc,
    getMjpegStreamUrl,
    fetchSnapshotDataUri,
    getStreamUrls,
    sendPtzCommand,
    recordClip,
    getCameraStatus,
    scanSubnet,
  };
}
