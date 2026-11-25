import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import {
  DEFAULT_CAMERA_ENTITY_ID,
  resolveCameraEntityId,
  useCameraApi,
} from "../hooks/useCameraApi";
import type {
  CameraDevice,
  CameraPtzCommand,
  CameraRecordResponse,
  CameraScanResponse,
  CameraStatusResponse,
  CameraStreamUrlsResponse,
} from "../types";
import { formatSize } from "../utils";
import CameraStreamStage, { type CameraStreamMode } from "./CameraStreamStage";

interface Props {
  onToast: (message: string, kind?: "success" | "error" | "info") => void;
}

const STREAM_MODES: { key: CameraStreamMode; label: string }[] = [
  { key: "webrtc", label: "WebRTC" },
  { key: "mjpeg", label: "MJPEG" },
  { key: "snapshot", label: "Snapshot" },
];

const DURATION_PRESETS = [15, 30, 60, 180];
const PTZ_SPEEDS = [2, 4, 6, 8];

export default function CameraConsole({ onToast }: Props) {
  const { colors } = useTheme();
  const {
    discoverDevices,
    getStreamUrls,
    sendPtzCommand,
    recordClip,
    getCameraStatus,
    scanSubnet,
  } = useCameraApi();

  const [entityId, setEntityId] = useState(DEFAULT_CAMERA_ENTITY_ID);
  const [entityInput, setEntityInput] = useState(DEFAULT_CAMERA_ENTITY_ID);
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [discovering, setDiscovering] = useState(false);

  const [streamMode, setStreamMode] = useState<CameraStreamMode>("webrtc");
  const [streamActive, setStreamActive] = useState(false);
  const [streamStatus, setStreamStatus] = useState<string>("Idle");

  const [ptzSpeed, setPtzSpeed] = useState(4);
  const [ptzBusy, setPtzBusy] = useState<string | null>(null);

  const [durationInput, setDurationInput] = useState("15");
  const [recordingBusy, setRecordingBusy] = useState(false);
  const [lastRecording, setLastRecording] = useState<CameraRecordResponse | null>(null);

  const [streamUrls, setStreamUrls] = useState<CameraStreamUrlsResponse | null>(null);
  const [urlsLoading, setUrlsLoading] = useState(false);

  const [cameraStatus, setCameraStatus] = useState<CameraStatusResponse | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const [scanTarget, setScanTarget] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<CameraScanResponse | null>(null);

  const loadStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const res = await getCameraStatus();
      setCameraStatus(res);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Failed to load camera status.", "error");
    } finally {
      setStatusLoading(false);
    }
  }, [getCameraStatus, onToast]);

  const handleDiscover = useCallback(async () => {
    setDiscovering(true);
    try {
      const list = await discoverDevices();
      const cams = list.filter((d) => {
        const id = resolveCameraEntityId(d);
        return id ? id.startsWith("camera.") || d.type === "camera" : false;
      });
      const finalList = cams.length > 0 ? cams : list;
      setDevices(finalList);
      onToast(
        finalList.length > 0
          ? `Discovered ${finalList.length} device(s).`
          : "No devices returned by /api/v1/devices.",
        "info"
      );
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Device discovery failed.", "error");
    } finally {
      setDiscovering(false);
    }
  }, [discoverDevices, onToast]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const applyEntityId = (next: string) => {
    const clean = next.trim() || DEFAULT_CAMERA_ENTITY_ID;
    setEntityId(clean);
    setEntityInput(clean);
    setStreamUrls(null);
  };

  const handlePtz = async (command: CameraPtzCommand) => {
    setPtzBusy(command);
    try {
      await sendPtzCommand(entityId, command, ptzSpeed);
      onToast(`PTZ ${command} (speed ${ptzSpeed})`, "success");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "PTZ command failed.", "error");
    } finally {
      setPtzBusy(null);
    }
  };

  const handleRecord = async () => {
    const parsed = Number.parseInt(durationInput, 10);
    const duration = Number.isFinite(parsed) ? Math.max(5, Math.min(180, parsed)) : 15;
    setDurationInput(String(duration));
    setRecordingBusy(true);
    try {
      const res = await recordClip(entityId, duration);
      setLastRecording(res);
      onToast(`Recorded ${res.recording?.filename ?? "clip"} to shared NAS.`, "success");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Recording failed.", "error");
    } finally {
      setRecordingBusy(false);
    }
  };

  const handleFetchUrls = async () => {
    setUrlsLoading(true);
    try {
      const res = await getStreamUrls(entityId);
      setStreamUrls(res);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Failed to fetch stream URLs.", "error");
    } finally {
      setUrlsLoading(false);
    }
  };

  const handleScan = async () => {
    setScanning(true);
    try {
      const res = await scanSubnet(scanTarget);
      setScanResult(res);
      onToast(`Subnet scan found ${res.count} camera(s).`, "success");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Subnet scan failed.", "error");
    } finally {
      setScanning(false);
    }
  };

  return (
    <View className="mt-4 gap-4">
      {/* Camera Entity Selector & Discovery */}
      <View
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.hairline,
          borderWidth: 1,
        }}
        className="rounded-2xl p-4"
      >
        <View className="flex-row items-center justify-between">
          <Text style={{ color: colors.ink }} className="text-sm font-semibold">
            Camera Entity
          </Text>
          <Pressable
            onPress={() => void handleDiscover()}
            disabled={discovering}
            style={{
              backgroundColor: colors.recessed,
              borderColor: colors.hairlineStrong,
              borderWidth: 1,
            }}
            className="flex-row items-center rounded-full px-3 py-1"
          >
            {discovering ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <>
                <Ionicons name="search-outline" size={12} color={colors.accentWarm} />
                <Text style={{ color: colors.ink }} className="ml-1.5 text-[11px] font-semibold">
                  Discover
                </Text>
              </>
            )}
          </Pressable>
        </View>

        <View className="mt-3 flex-row gap-2">
          <TextInput
            value={entityInput}
            onChangeText={setEntityInput}
            placeholder={DEFAULT_CAMERA_ENTITY_ID}
            placeholderTextColor={colors.inkSubtle}
            autoCapitalize="none"
            autoCorrect={false}
            style={{
              backgroundColor: colors.recessed,
              borderColor: colors.hairlineStrong,
              borderWidth: 1,
              color: colors.ink,
            }}
            className="flex-1 rounded-xl px-3.5 py-2.5 font-mono text-xs"
          />
          <Pressable
            onPress={() => applyEntityId(entityInput)}
            style={{ backgroundColor: colors.accent }}
            className="items-center justify-center rounded-xl px-4"
          >
            <Text style={{ color: colors.accentInk }} className="text-xs font-bold">
              Select
            </Text>
          </Pressable>
        </View>

        {devices.length > 0 && (
          <View className="mt-3 flex-row flex-wrap gap-2">
            {devices.map((d, idx) => {
              const id = resolveCameraEntityId(d) ?? `camera-${idx}`;
              const selected = id === entityId;
              return (
                <Pressable
                  key={id}
                  onPress={() => applyEntityId(id)}
                  style={{
                    backgroundColor: selected ? colors.accent : colors.recessed,
                    borderColor: selected ? colors.accent : colors.hairlineStrong,
                    borderWidth: 1,
                  }}
                  className="rounded-full px-3 py-1"
                >
                  <Text
                    style={{ color: selected ? colors.accentInk : colors.inkMuted }}
                    className="font-mono text-[11px] font-medium"
                  >
                    {id}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {/* Live Stream Card */}
      <View
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.hairline,
          borderWidth: 1,
        }}
        className="rounded-2xl p-4"
      >
        <View className="mb-3 flex-row items-center justify-between">
          <View className="flex-1">
            <Text style={{ color: colors.ink }} className="text-sm font-semibold">
              Live Stream
            </Text>
            <Text style={{ color: colors.inkMuted }} className="mt-0.5 font-mono text-[11px]">
              {entityId} · {streamActive ? streamStatus : "Paused"}
            </Text>
          </View>

          <Pressable
            onPress={() => setStreamActive((v) => !v)}
            style={{
              backgroundColor: streamActive ? colors.crimsonBg : colors.accent,
              borderColor: streamActive ? colors.crimsonBorder : colors.accent,
              borderWidth: 1,
            }}
            className="flex-row items-center rounded-xl px-3.5 py-2"
          >
            <Ionicons
              name={streamActive ? "stop-circle-outline" : "play-circle-outline"}
              size={14}
              color={streamActive ? colors.crimson : colors.accentInk}
            />
            <Text
              style={{ color: streamActive ? colors.crimson : colors.accentInk }}
              className="ml-1.5 text-xs font-bold"
            >
              {streamActive ? "Stop" : "Start Live"}
            </Text>
          </Pressable>
        </View>

        <View className="mb-3 flex-row gap-1.5">
          {STREAM_MODES.map((m) => {
            const active = streamMode === m.key;
            return (
              <Pressable
                key={m.key}
                onPress={() => setStreamMode(m.key)}
                style={{
                  backgroundColor: active ? colors.elevated : colors.recessed,
                  borderColor: active ? colors.accent : colors.hairline,
                  borderWidth: 1,
                }}
                className="flex-1 items-center rounded-lg py-1.5"
              >
                <Text
                  style={{ color: active ? colors.accent : colors.inkMuted }}
                  className="text-[11px] font-semibold"
                >
                  {m.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <CameraStreamStage
          entityId={entityId}
          mode={streamMode}
          active={streamActive}
          onStatusText={setStreamStatus}
        />
      </View>

      {/* PTZ Control */}
      <View
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.hairline,
          borderWidth: 1,
        }}
        className="rounded-2xl p-4"
      >
        <View className="flex-row items-center justify-between">
          <Text style={{ color: colors.ink }} className="text-sm font-semibold">
            PTZ Control
          </Text>
          <View className="flex-row items-center gap-1.5">
            <Text style={{ color: colors.inkSubtle }} className="text-[11px]">
              Speed
            </Text>
            {PTZ_SPEEDS.map((spd) => {
              const active = ptzSpeed === spd;
              return (
                <Pressable
                  key={spd}
                  onPress={() => setPtzSpeed(spd)}
                  style={{
                    backgroundColor: active ? colors.accent : colors.recessed,
                    borderColor: active ? colors.accent : colors.hairlineStrong,
                    borderWidth: 1,
                  }}
                  className="h-6 w-6 items-center justify-center rounded-md"
                >
                  <Text
                    style={{ color: active ? colors.accentInk : colors.inkMuted }}
                    className="text-[11px] font-bold"
                  >
                    {spd}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="mt-4 flex-row items-center justify-between gap-4">
          {/* D-Pad */}
          <View className="items-center gap-1.5">
            <Pressable
              disabled={!!ptzBusy}
              onPress={() => void handlePtz("PTZ_UP")}
              style={{
                backgroundColor: colors.recessed,
                borderColor: colors.hairlineStrong,
                borderWidth: 1,
              }}
              className="h-10 w-12 items-center justify-center rounded-xl"
            >
              <Ionicons name="chevron-up" size={18} color={colors.ink} />
            </Pressable>
            <View className="flex-row gap-1.5">
              <Pressable
                disabled={!!ptzBusy}
                onPress={() => void handlePtz("PTZ_LEFT")}
                style={{
                  backgroundColor: colors.recessed,
                  borderColor: colors.hairlineStrong,
                  borderWidth: 1,
                }}
                className="h-10 w-12 items-center justify-center rounded-xl"
              >
                <Ionicons name="chevron-back" size={18} color={colors.ink} />
              </Pressable>
              <Pressable
                disabled={!!ptzBusy}
                onPress={() => void handlePtz("PTZ_STOP")}
                style={{
                  backgroundColor: colors.elevated,
                  borderColor: colors.hairlineStrong,
                  borderWidth: 1,
                }}
                className="h-10 w-12 items-center justify-center rounded-xl"
              >
                {ptzBusy ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : (
                  <Ionicons name="stop" size={14} color={colors.accentWarm} />
                )}
              </Pressable>
              <Pressable
                disabled={!!ptzBusy}
                onPress={() => void handlePtz("PTZ_RIGHT")}
                style={{
                  backgroundColor: colors.recessed,
                  borderColor: colors.hairlineStrong,
                  borderWidth: 1,
                }}
                className="h-10 w-12 items-center justify-center rounded-xl"
              >
                <Ionicons name="chevron-forward" size={18} color={colors.ink} />
              </Pressable>
            </View>
            <Pressable
              disabled={!!ptzBusy}
              onPress={() => void handlePtz("PTZ_DOWN")}
              style={{
                backgroundColor: colors.recessed,
                borderColor: colors.hairlineStrong,
                borderWidth: 1,
              }}
              className="h-10 w-12 items-center justify-center rounded-xl"
            >
              <Ionicons name="chevron-down" size={18} color={colors.ink} />
            </Pressable>
          </View>

          {/* Zoom */}
          <View className="flex-1 gap-2">
            <Pressable
              disabled={!!ptzBusy}
              onPress={() => void handlePtz("PTZ_ZOOM_IN")}
              style={{
                backgroundColor: colors.recessed,
                borderColor: colors.hairlineStrong,
                borderWidth: 1,
              }}
              className="flex-row items-center justify-center rounded-xl py-3"
            >
              <Ionicons name="add-circle-outline" size={16} color={colors.ink} />
              <Text style={{ color: colors.ink }} className="ml-2 text-xs font-semibold">
                Zoom In
              </Text>
            </Pressable>
            <Pressable
              disabled={!!ptzBusy}
              onPress={() => void handlePtz("PTZ_ZOOM_OUT")}
              style={{
                backgroundColor: colors.recessed,
                borderColor: colors.hairlineStrong,
                borderWidth: 1,
              }}
              className="flex-row items-center justify-center rounded-xl py-3"
            >
              <Ionicons name="remove-circle-outline" size={16} color={colors.ink} />
              <Text style={{ color: colors.ink }} className="ml-2 text-xs font-semibold">
                Zoom Out
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Record Clip to Shared NAS */}
      <View
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.hairline,
          borderWidth: 1,
        }}
        className="rounded-2xl p-4"
      >
        <Text style={{ color: colors.ink }} className="text-sm font-semibold">
          Record Clip to Shared NAS
        </Text>
        <Text style={{ color: colors.inkMuted }} className="mt-1 text-xs">
          Captures 5–180s to shared/&lt;filename&gt;
        </Text>

        <View className="mt-3 flex-row gap-1.5">
          {DURATION_PRESETS.map((sec) => {
            const active = durationInput === String(sec);
            return (
              <Pressable
                key={sec}
                onPress={() => setDurationInput(String(sec))}
                style={{
                  backgroundColor: active ? colors.accent : colors.recessed,
                  borderColor: active ? colors.accent : colors.hairlineStrong,
                  borderWidth: 1,
                }}
                className="flex-1 items-center rounded-lg py-1.5"
              >
                <Text
                  style={{ color: active ? colors.accentInk : colors.inkMuted }}
                  className="text-xs font-semibold"
                >
                  {sec}s
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View className="mt-3 flex-row gap-2">
          <TextInput
            value={durationInput}
            onChangeText={setDurationInput}
            keyboardType="number-pad"
            placeholder="15"
            placeholderTextColor={colors.inkSubtle}
            style={{
              backgroundColor: colors.recessed,
              borderColor: colors.hairlineStrong,
              borderWidth: 1,
              color: colors.ink,
            }}
            className="w-24 rounded-xl px-3.5 py-2.5 text-center font-mono text-xs"
          />
          <Pressable
            disabled={recordingBusy}
            onPress={() => void handleRecord()}
            style={{ backgroundColor: colors.crimson }}
            className="flex-1 flex-row items-center justify-center rounded-xl py-2.5"
          >
            {recordingBusy ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="radio-button-on" size={14} color="#fff" />
                <Text className="ml-1.5 text-xs font-bold text-white">
                  Record to NAS
                </Text>
              </>
            )}
          </Pressable>
        </View>

        {lastRecording?.recording && (
          <View
            style={{
              backgroundColor: colors.emeraldBg,
              borderColor: colors.emeraldBorder,
              borderWidth: 1,
            }}
            className="mt-3 rounded-xl p-3"
          >
            <Text style={{ color: colors.emerald }} className="text-xs font-semibold">
              Saved: shared/{lastRecording.recording.filename}
            </Text>
            <Text style={{ color: colors.inkMuted }} className="mt-0.5 text-[11px]">
              {formatSize(lastRecording.recording.sizeBytes)} · Status:{" "}
              {lastRecording.recording.status}
            </Text>
          </View>
        )}
      </View>

      {/* Stream URLs Inspector */}
      <View
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.hairline,
          borderWidth: 1,
        }}
        className="rounded-2xl p-4"
      >
        <View className="flex-row items-center justify-between">
          <Text style={{ color: colors.ink }} className="text-sm font-semibold">
            Stream URLs
          </Text>
          <Pressable
            disabled={urlsLoading}
            onPress={() => void handleFetchUrls()}
            style={{
              backgroundColor: colors.recessed,
              borderColor: colors.hairlineStrong,
              borderWidth: 1,
            }}
            className="rounded-full px-3 py-1"
          >
            {urlsLoading ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Text style={{ color: colors.ink }} className="text-[11px] font-semibold">
                Fetch URLs
              </Text>
            )}
          </Pressable>
        </View>

        {streamUrls && (
          <View className="mt-3 gap-1.5">
            <Text style={{ color: colors.inkMuted }} className="font-mono text-[11px]">
              protocol: {streamUrls.protocol} · device: {streamUrls.device_id}
            </Text>
            <Text style={{ color: colors.inkSubtle }} className="font-mono text-[10px]">
              HLS: {streamUrls.hls_stream_url}
            </Text>
            <Text style={{ color: colors.inkSubtle }} className="font-mono text-[10px]">
              Live: {streamUrls.live_stream_url}
            </Text>
            <Text style={{ color: colors.inkSubtle }} className="font-mono text-[10px]">
              Snapshot: {streamUrls.snapshot_url}
            </Text>
            <Text style={{ color: colors.inkSubtle }} className="font-mono text-[10px]">
              RTSP Main: {streamUrls.mainstream_rtsp}
            </Text>
            <Text style={{ color: colors.inkSubtle }} className="font-mono text-[10px]">
              RTSP Sub: {streamUrls.substream_rtsp}
            </Text>
          </View>
        )}
      </View>

      {/* Camera Status & Subnet Scan */}
      <View
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.hairline,
          borderWidth: 1,
        }}
        className="rounded-2xl p-4"
      >
        <View className="flex-row items-center justify-between">
          <Text style={{ color: colors.ink }} className="text-sm font-semibold">
            Camera Network Status
          </Text>
          <Pressable
            disabled={statusLoading}
            onPress={() => void loadStatus()}
            hitSlop={8}
          >
            {statusLoading ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Ionicons name="refresh-outline" size={16} color={colors.inkMuted} />
            )}
          </Pressable>
        </View>

        {cameraStatus && (
          <View className="mt-2.5 gap-1">
            <Text style={{ color: colors.ink }} className="text-xs font-medium">
              Online: {cameraStatus.online_cameras} / {cameraStatus.total_cameras}
            </Text>
            <Text style={{ color: colors.inkMuted }} className="font-mono text-[11px]">
              Subnet {cameraStatus.subnet} · IP {cameraStatus.default_ip} · RTSP{" "}
              {cameraStatus.rtsp_port} · HTTP {cameraStatus.http_port}
            </Text>
          </View>
        )}

        <View className="mt-3.5 flex-row gap-2">
          <TextInput
            value={scanTarget}
            onChangeText={setScanTarget}
            placeholder="Subnet CIDR (optional, e.g. 192.168.30.0/24)"
            placeholderTextColor={colors.inkSubtle}
            autoCapitalize="none"
            autoCorrect={false}
            style={{
              backgroundColor: colors.recessed,
              borderColor: colors.hairlineStrong,
              borderWidth: 1,
              color: colors.ink,
            }}
            className="flex-1 rounded-xl px-3.5 py-2.5 font-mono text-xs"
          />
          <Pressable
            disabled={scanning}
            onPress={() => void handleScan()}
            style={{ backgroundColor: colors.accent }}
            className="items-center justify-center rounded-xl px-4"
          >
            {scanning ? (
              <ActivityIndicator size="small" color={colors.accentInk} />
            ) : (
              <Text style={{ color: colors.accentInk }} className="text-xs font-bold">
                Scan
              </Text>
            )}
          </Pressable>
        </View>

        {scanResult && (
          <View className="mt-3 gap-2">
            <Text style={{ color: colors.inkMuted }} className="text-xs">
              Scan found {scanResult.count} camera(s):
            </Text>
            {scanResult.cameras.map((cam, idx) => {
              const id = resolveCameraEntityId(cam) ?? `cam-${idx}`;
              return (
                <Pressable
                  key={`${id}-${idx}`}
                  onPress={() => applyEntityId(id)}
                  style={{
                    backgroundColor: colors.recessed,
                    borderColor: colors.hairlineStrong,
                    borderWidth: 1,
                  }}
                  className="flex-row items-center justify-between rounded-xl px-3 py-2"
                >
                  <Text style={{ color: colors.ink }} className="font-mono text-xs">
                    {id}
                  </Text>
                  <Text style={{ color: colors.inkSubtle }} className="text-[11px]">
                    {cam.ip ? String(cam.ip) : "Select"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}
