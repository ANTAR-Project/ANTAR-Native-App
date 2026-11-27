import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useVideoPlayer, VideoView, type VideoSource, type VideoTrack } from "expo-video";
import { useTheme } from "../context/ThemeContext";

interface Props {
  source: VideoSource;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  onErrorChange?: (error: string | null) => void;
  onVideoTrackChange?: (track: VideoTrack | null) => void;
}

function getSourceKey(source: VideoSource): string {
  if (typeof source === "object" && source !== null) {
    return source.uri ?? String(source.assetId ?? "");
  }
  return String(source ?? "");
}

export default function VideoStage({
  source,
  muted = false,
  loop = false,
  controls = true,
  onErrorChange,
  onVideoTrackChange,
}: Props) {
  const { colors } = useTheme();
  const [initialSource] = useState(source);
  const lastSourceKeyRef = useRef(getSourceKey(source));
  const pendingResumeRef = useRef<{ time: number; play: boolean } | null>(null);

  const player = useVideoPlayer(initialSource, (p) => {
    p.muted = muted;
    p.loop = loop;
    p.play();
  });

  const [status, setStatus] = useState<string>(player.status);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const nextKey = getSourceKey(source);
    if (nextKey === lastSourceKeyRef.current) return;
    lastSourceKeyRef.current = nextKey;

    const resumeTime = Number.isFinite(player.currentTime) ? player.currentTime : 0;
    const wasPlaying = player.playing;
    pendingResumeRef.current = { time: resumeTime, play: wasPlaying };
    setError(null);
    onErrorChange?.(null);

    void player.replaceAsync(source).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to switch stream quality";
      setError(msg);
      onErrorChange?.(msg);
    });
  }, [onErrorChange, player, source]);

  useEffect(() => {
    const statusSub = player.addListener("statusChange", ({ status: nextStatus, error: err }) => {
      setStatus(nextStatus);
      const msg = nextStatus === "error" ? err?.message ?? "Playback failed" : null;
      setError(msg);
      onErrorChange?.(msg);

      if (nextStatus === "readyToPlay" && pendingResumeRef.current) {
        const { time, play } = pendingResumeRef.current;
        pendingResumeRef.current = null;
        if (time > 0) {
          player.currentTime = time;
        }
        if (play) {
          player.play();
        }
      }
    });

    const trackSub = player.addListener("videoTrackChange", ({ videoTrack }) => {
      onVideoTrackChange?.(videoTrack);
    });

    return () => {
      statusSub.remove();
      trackSub.remove();
    };
  }, [onErrorChange, onVideoTrackChange, player]);

  return (
    <View
      style={{ borderBottomColor: colors.hairline, borderBottomWidth: 1 }}
      className="aspect-video w-full bg-black"
    >
      <VideoView
        player={player}
        style={{ width: "100%", height: "100%" }}
        nativeControls={controls}
        fullscreenOptions={{ enable: true }}
        allowsPictureInPicture
      />
      {status === "loading" && (
        <View className="pointer-events-none absolute inset-0 items-center justify-center">
          <ActivityIndicator color={colors.accentWarm} />
        </View>
      )}
      {error && (
        <View className="absolute inset-0 items-center justify-center bg-black/85 px-6">
          <Text className="text-center text-xs leading-5 text-red-300">{error}</Text>
        </View>
      )}
    </View>
  );
}
