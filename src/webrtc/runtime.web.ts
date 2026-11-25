import { createElement, useEffect, useRef } from "react";

export function ensureWebRtcGlobals(): { ok: boolean; error?: string } {
  if (typeof globalThis.RTCPeerConnection !== "function") {
    return { ok: false, error: "WebRTC is not supported in this browser." };
  }
  return { ok: true };
}

export function WebRtcVideoSurface({ stream }: { stream: MediaStream | null }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return createElement("video", {
    ref: videoRef,
    autoPlay: true,
    playsInline: true,
    muted: true,
    controls: true,
    style: {
      width: "100%",
      height: "100%",
      objectFit: "contain",
      backgroundColor: "#000",
    },
  });
}

