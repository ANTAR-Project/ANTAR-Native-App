import { ScrollView, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import VideoStage from "../../src/components/VideoStage";
import { useAuth } from "../../src/context/AuthContext";
import { DEMO_HLS, MOCK_DATA, STREAM_API } from "../../src/config";

export default function StreamPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();

  const path = String(id ?? "");
  const uri = MOCK_DATA
    ? DEMO_HLS
    : `${STREAM_API}?path=${encodeURIComponent(path)}&token=${encodeURIComponent(
        session?.token ?? ""
      )}`;

  return (
    <View className="flex-1 bg-blue-950">
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Now playing",
          headerStyle: { backgroundColor: "#1e3a8a" },
          headerTintColor: "#bfdbfe",
          headerTitleStyle: { fontWeight: "700" },
        }}
      />

      <VideoStage uri={uri} />

      <ScrollView contentContainerClassName="p-4">
        <Text className="text-xl font-bold text-blue-100">{path}</Text>

        <View className="mt-3 flex-row flex-wrap gap-2">
          <View className="rounded-full bg-blue-800 px-3 py-1">
            <Text className="text-xs font-medium text-blue-200">HLS</Text>
          </View>
          {MOCK_DATA && (
            <View className="rounded-full bg-amber-500/20 px-3 py-1">
              <Text className="text-xs font-medium text-amber-300">Demo stream</Text>
            </View>
          )}
        </View>

        <Text className="mt-4 text-sm text-blue-300">
          {MOCK_DATA
            ? "Mock mode is on, so a public demo video plays instead of your file."
            : "If playback fails, the video may still be encoding. Try again in a minute."}
        </Text>
      </ScrollView>
    </View>
  );
}