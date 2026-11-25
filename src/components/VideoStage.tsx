import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useVideoPlayer, VideoView, type VideoSource } from "expo-video";
import { useTheme } from "../context/ThemeContext";

interface Props {
  source: VideoSource;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  onErrorChange?: (error: string | null) => void;
}

export default function VideoStage({
  source,
  muted = false,
  loop = false,
  controls = true,
  onErrorChange,
}: Props) {
  const { colors } = useTheme();
  const player = useVideoPlayer(source, (p) => {
    p.muted = muted;
    p.loop = loop;
    p.play();
  });

  const [status, setStatus] = useState<string>(player.status);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sub = player.addListener("statusChange", ({ status: nextStatus, error: err }) => {
      setStatus(nextStatus);
      const msg = nextStatus === "error" ? err?.message ?? "Playback failed" : null;
      setError(msg);
      onErrorChange?.(msg);
    });
    return () => sub.remove();
  }, [onErrorChange, player]);

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
