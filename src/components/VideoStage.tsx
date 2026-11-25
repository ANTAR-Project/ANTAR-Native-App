import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";

interface Props {
  uri: string;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
}

export default function VideoStage({
  uri,
  muted = false,
  loop = false,
  controls = true,
}: Props) {
  const player = useVideoPlayer(uri, (p) => {
    p.muted = muted;
    p.loop = loop;
    p.play();
  });

  const [status, setStatus] = useState<string>(player.status);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sub = player.addListener("statusChange", ({ status: nextStatus, error: err }) => {
      setStatus(nextStatus);
      setError(nextStatus === "error" ? err?.message ?? "Playback failed" : null);
    });
    return () => sub.remove();
  }, [player]);

  return (
    <View className="aspect-video w-full bg-black">
      <VideoView
        player={player}
        style={{ width: "100%", height: "100%" }}
        nativeControls={controls}
        fullscreenOptions={{ enable: true }}
        allowsPictureInPicture
      />
      {status === "loading" && (
        <View className="pointer-events-none absolute inset-0 items-center justify-center">
          <ActivityIndicator color="#bfdbfe" />
        </View>
      )}
      {error && (
        <View className="absolute inset-0 items-center justify-center bg-black/80 px-6">
          <Text className="text-center text-sm text-red-300">{error}</Text>
        </View>
      )}
    </View>
  );
}
