import { useCallback, useEffect, useRef, useState } from "react";
import { getNotificationsWsUrl } from "../config";
import { useAuth } from "../context/AuthContext";
import type { NotificationPayload } from "../types";

export interface NotificationItem extends NotificationPayload {
  id: string;
  receivedAt: number;
}

export function useNotifications(onPlaylistReady?: (item: NotificationItem) => void) {
  const { session, gatewayUrl } = useAuth();
  const [connected, setConnected] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const callbackRef = useRef(onPlaylistReady);
  callbackRef.current = onPlaylistReady;

  const clearNotifications = useCallback(() => setItems([]), []);

  useEffect(() => {
    const token = session?.accessToken;
    if (!token) {
      setConnected(false);
      return;
    }

    let closedIntentionally = false;
    let ws: WebSocket | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;

    const connect = () => {
      if (closedIntentionally) return;
      const url = getNotificationsWsUrl(token);
      try {
        ws = new WebSocket(url);
      } catch {
        setConnected(false);
        return;
      }

      ws.onopen = () => {
        attempt = 0;
        setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(String(event.data)) as NotificationPayload;
          const item: NotificationItem = {
            ...data,
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            receivedAt: Date.now(),
          };
          setItems((prev) => [item, ...prev].slice(0, 20));
          if (data.type === "PLAYLIST_READY") {
            callbackRef.current?.(item);
          }
        } catch {
          // ignore malformed messages
        }
      };

      ws.onerror = () => {
        setConnected(false);
      };

      ws.onclose = () => {
        setConnected(false);
        if (closedIntentionally) return;
        const delayMs = Math.min(30_000, 2_000 * Math.pow(2, attempt));
        attempt += 1;
        retryTimer = setTimeout(connect, delayMs);
      };
    };

    connect();

    return () => {
      closedIntentionally = true;
      if (retryTimer) clearTimeout(retryTimer);
      try {
        ws?.close();
      } catch {
        // ignore
      }
      setConnected(false);
    };
  }, [session?.accessToken, gatewayUrl]);

  return { connected, items, clearNotifications };
}
