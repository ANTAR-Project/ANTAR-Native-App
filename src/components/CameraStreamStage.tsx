import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useCameraApi } from "../hooks/useCameraApi";
import { ensureWebRtcGlobals, WebRtcVideoSurface } from "../webrtc/runtime";

export type CameraStreamMode = "webrtc" | "mjpeg" | "snapshot";

interface Props {
  entityId: string;
  mode: CameraStreamMode;
  active: boolean;
  onStatusText?: (text: string) => void;
}

const STUN_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.cloudflare.com:3478" },
  { urls: "stun:stun.l.google.com:19302" },
];

async function waitForIceGathering(pc: RTCPeerConnection, timeoutMs = 600): Promise<void> {
  if (pc.iceGatheringState === "complete") return;
  await new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      pc.removeEventListener("icegatheringstatechange", onStateChange);
      clearTimeout(timer);
      resolve();
    };
    const onStateChange = () => {
      if (pc.iceGatheringState === "complete") finish();
    };
    const timer = setTimeout(finish, timeoutMs);
    pc.addEventListener("icegatheringstatechange", onStateChange);
  });
}

export default function CameraStreamStage({
  entityId,
  mode,
  active,
  onStatusText,
}: Props) {
  const { colors } = useTheme();
  const {
    negotiateWebRtc,
    getMjpegStreamUrl,
    fetchSnapshotDataUri,
  } = useCameraApi();

  const [webrtcConnecting, setWebrtcConnecting] = useState(false);
  const [webrtcError, setWebrtcError] = useState<string | null>(null);
  const [webrtcStream, setWebrtcStream] = useState<MediaStream | null>(null);
  const [snapshotUri, setSnapshotUri] = useState<string | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  const [mjpegTick, setMjpegTick] = useState(0);

  const pcRef = useRef<RTCPeerConnection | null>(null);

  const mjpegUrl = useMemo(() => {
    const base = getMjpegStreamUrl(entityId);
    return mjpegTick > 0 ? `${base}?t=${mjpegTick}` : base;
  }, [entityId, getMjpegStreamUrl, mjpegTick]);

  const closePeerConnection = useCallback(() => {
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch {
        // ignore
      }
      pcRef.current = null;
    }
    setWebrtcStream(null);
  }, []);

  const refreshSnapshot = useCallback(async () => {
    if (!entityId.trim()) return;
    setSnapshotLoading(true);
    setSnapshotError(null);
    try {
      const uri = await fetchSnapshotDataUri(entityId);
      setSnapshotUri(uri);
    } catch (err) {
      setSnapshotError(err instanceof Error ? err.message : "Failed to load snapshot.");
    } finally {
      setSnapshotLoading(false);
    }
  }, [entityId, fetchSnapshotDataUri]);

  // WebRTC WHEP negotiation when mode === "webrtc" and active === true
  useEffect(() => {
    if (!active || mode !== "webrtc" || !entityId.trim()) {
      closePeerConnection();
      setWebrtcConnecting(false);
      setWebrtcError(null);
      return;
    }

    const runtime = ensureWebRtcGlobals();
    if (!runtime.ok || typeof globalThis.RTCPeerConnection !== "function") {
      setWebrtcError(runtime.error ?? "WebRTC runtime unavailable.");
      onStatusText?.("WebRTC Unavailable");
      return;
    }

    const PeerConn = globalThis.RTCPeerConnection;
    let cancelled = false;
    setWebrtcConnecting(true);
    setWebrtcError(null);
    onStatusText?.("Connecting WebRTC...");

    (async () => {
      try {
        const pc = new PeerConn({ iceServers: STUN_SERVERS });
        pcRef.current = pc;

        const remoteStream =
          typeof MediaStream === "function" ? new MediaStream() : null;

        pc.ontrack = (event) => {
          if (cancelled) return;
          if (event.streams && event.streams[0]) {
            setWebrtcStream(event.streams[0]);
          } else if (remoteStream && event.track) {
            remoteStream.addTrack(event.track);
            setWebrtcStream(remoteStream);
          }
        };

        pc.onconnectionstatechange = () => {
          if (cancelled) return;
          if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
            setWebrtcError(`WebRTC connection ${pc.connectionState}.`);
            onStatusText?.(`WebRTC ${pc.connectionState}`);
          } else if (pc.connectionState === "connected") {
            onStatusText?.("WebRTC WHEP Live");
          }
        };

        pc.addTransceiver("video", { direction: "recvonly" });
        pc.addTransceiver("audio", { direction: "recvonly" });

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await waitForIceGathering(pc, 600);

        const localSdp = pc.localDescription?.sdp;
        if (!localSdp) {
          throw new Error("Failed to generate local SDP offer.");
        }

        const answerSdp = await negotiateWebRtc(entityId, localSdp);
        if (cancelled) {
          pc.close();
          return;
        }

        const answerDesc =
          typeof globalThis.RTCSessionDescription === "function"
            ? new globalThis.RTCSessionDescription({ type: "answer", sdp: answerSdp })
            : { type: "answer" as const, sdp: answerSdp };

        await pc.setRemoteDescription(answerDesc);
        setWebrtcConnecting(false);
        onStatusText?.("WebRTC WHEP Live");
      } catch (err) {
        if (cancelled) return;
        closePeerConnection();
        setWebrtcConnecting(false);
        const msg = err instanceof Error ? err.message : "WebRTC negotiation failed.";
        setWebrtcError(msg);
        onStatusText?.("WebRTC Error");
      }
    })();

    return () => {
      cancelled = true;
      closePeerConnection();
    };
  }, [active, closePeerConnection, entityId, mode, negotiateWebRtc, onStatusText]);

  // Load initial snapshot when entering snapshot mode
  useEffect(() => {
    if (active && mode === "snapshot") {
      void refreshSnapshot();
    }
  }, [active, mode, refreshSnapshot]);

  useEffect(() => {
    if (!active) return;
    if (mode === "mjpeg") onStatusText?.("MJPEG Stream");
    if (mode === "snapshot") onStatusText?.("Snapshot");
  }, [active, mode, onStatusText]);

  if (!active) {
    return (
      <View
        style={{
          backgroundColor: colors.recessed,
          borderColor: colors.hairline,
          borderWidth: 1,
        }}
        className="aspect-video w-full items-center justify-center rounded-xl"
      >
        <Ionicons name="videocam-outline" size={30} color={colors.inkSubtle} />
        <Text style={{ color: colors.inkMuted }} className="mt-2 text-xs">
          Stream paused · Tap Start Live to connect
        </Text>
      </View>
    );
  }

  return (
    <View className="overflow-hidden rounded-xl bg-black">
      {mode === "webrtc" ? (
        <View className="aspect-video w-full items-center justify-center bg-black">
          <WebRtcVideoSurface stream={webrtcStream} />
          {webrtcConnecting && (
            <View className="absolute inset-0 items-center justify-center bg-black/75">
              <ActivityIndicator color={colors.accentWarm} />
              <Text className="mt-2 text-xs text-white/80">
                Negotiating WebRTC WHEP...
              </Text>
            </View>
          )}
          {webrtcError && (
            <View className="absolute inset-0 items-center justify-center bg-black/85 px-6">
              <Ionicons name="warning-outline" size={24} color={colors.crimson} />
              <Text className="mt-2 text-center text-xs leading-5 text-red-300">
                {webrtcError}
              </Text>
            </View>
          )}
        </View>
      ) : mode === "mjpeg" ? (
        <View className="aspect-video w-full bg-black">
          <Image
            source={{ uri: mjpegUrl }}
            style={{ width: "100%", height: "100%" }}
            contentFit="contain"
          />
          <Pressable
            onPress={() => setMjpegTick((n) => n + 1)}
            className="absolute bottom-2 right-2 flex-row items-center rounded-full bg-black/70 px-2.5 py-1"
          >
            <Ionicons name="refresh-outline" size={12} color="#fff" />
            <Text className="ml-1 text-[10px] font-semibold text-white">Reconnect</Text>
          </Pressable>
        </View>
      ) : (
        <View className="aspect-video w-full items-center justify-center bg-black">
          {snapshotUri ? (
            <Image
              source={{ uri: snapshotUri }}
              style={{ width: "100%", height: "100%" }}
              contentFit="contain"
            />
          ) : snapshotError ? (
            <Text className="px-4 text-center text-xs text-red-300">{snapshotError}</Text>
          ) : (
            <ActivityIndicator color={colors.accentWarm} />
          )}

          <Pressable
            onPress={() => void refreshSnapshot()}
            disabled={snapshotLoading}
            className="absolute bottom-2 right-2 flex-row items-center rounded-full bg-black/75 px-3 py-1.5"
          >
            {snapshotLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="camera-outline" size={13} color="#fff" />
                <Text className="ml-1.5 text-[11px] font-semibold text-white">
                  Refresh Snapshot
                </Text>
              </>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}
