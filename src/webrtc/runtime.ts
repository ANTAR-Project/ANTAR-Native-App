import { createElement, useEffect, useState } from "react";
import { View } from "react-native";
import { RTCView, registerGlobals } from "react-native-webrtc";

let initialized = false;
let initError: string | null = null;

export function ensureWebRtcGlobals(): { ok: boolean; error?: string } {
  if (initialized) {
    return initError ? { ok: false, error: initError } : { ok: true };
  }
  initialized = true;
  try {
    registerGlobals();
    if (typeof globalThis.RTCPeerConnection !== "function") {
      initError =
        "WebRTC native module is not linked. Run a development build (npx expo run:android / run:ios or eas build --profile development) instead of Expo Go.";
      return { ok: false, error: initError };
    }
    return { ok: true };
  } catch (err) {
    initError =
      err instanceof Error
        ? err.message
        : "WebRTC native module is not linked. Build a development client instead of Expo Go.";
    return { ok: false, error: initError };
  }
}

export function WebRtcVideoSurface({ stream }: { stream: MediaStream | null }) {
  const [streamUrl, setStreamUrl] = useState<string>("");

  useEffect(() => {
    const maybeNativeStream = stream as (MediaStream & { toURL?: () => string }) | null;
    if (maybeNativeStream && typeof maybeNativeStream.toURL === "function") {
      setStreamUrl(maybeNativeStream.toURL());
    } else {
      setStreamUrl("");
    }
  }, [stream]);

  if (!streamUrl) {
    return createElement(View, { className: "h-full w-full bg-black" });
  }

  return createElement(RTCView, {
    streamURL: streamUrl,
    objectFit: "contain",
    style: { width: "100%", height: "100%", backgroundColor: "#000" },
  });
}

