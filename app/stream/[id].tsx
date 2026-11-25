import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import VideoStage from "../../src/components/VideoStage";
import { useStreamApi } from "../../src/hooks/useStreamApi";

export default function StreamPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { buildStreamUrl } = useStreamApi();
  const [reloadNonce, setReloadNonce] = useState(0);

  const path = decodeURIComponent(String(id ?? ""));
  const uri = buildStreamUrl(path);

  return (
    <View className="flex-1 bg-blue-950">
      <Stack.Screen
        options={{
          headerShown: true,
          title: path.split("/").pop() || "Now playing",
          headerStyle: { backgroundColor: "#172554" },
          headerTintColor: "#bfdbfe",
          headerTitleStyle: { fontWeight: "700" },
          headerRight: () => (
            <Pressable
              onPress={() => setReloadNonce((n) => n + 1)}
              hitSlop={10}
              className="mr-2"
            >
              <Ionicons name="refresh" size={20} color="#bfdbfe" />
            </Pressable>
          ),
        }}
      />

      <VideoStage key={`${uri}-${reloadNonce}`} uri={uri} />

      <ScrollView contentContainerClassName="p-4">
        <Text className="text-xl font-bold text-blue-100">{path}</Text>

        <View className="mt-3 flex-row flex-wrap gap-2">
          <View className="rounded-full bg-blue-900 px-3 py-1">
            <Text className="text-xs font-medium text-blue-200">HLS · MPEG-TS</Text>
          </View>
          <View className="rounded-full bg-blue-900 px-3 py-1">
            <Text className="text-xs font-medium text-blue-200">Hearth Gateway</Text>
          </View>
        </View>

        <View className="mt-4 rounded-2xl border border-blue-800 bg-blue-900/50 p-4">
          <Text className="text-xs font-semibold uppercase tracking-wider text-blue-400">
            Stream Endpoint
          </Text>
          <Text selectable className="mt-1 font-mono text-[11px] text-blue-300">
            /api/v1/stream?path={encodeURIComponent(path)}
          </Text>
          <Text className="mt-3 text-xs leading-4 text-blue-300">
            If playback fails immediately after upload, transcoding may still be in
            progress. Pull to refresh Streamyard or tap reload above.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
