import { Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import VideoStage from "../../src/components/VideoStage";
import { DEMO_HLS } from "../../src/config";
import { MOCK_ELEMENTS } from "../../src/data/mock";

export default function CameraPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const camera = MOCK_ELEMENTS.find((e) => e.id === String(id));

  return (
    <View className="flex-1 bg-blue-950">
      <Stack.Screen
        options={{
          headerShown: true,
          title: camera?.name ?? "Camera",
          headerStyle: { backgroundColor: "#1e3a8a" },
          headerTintColor: "#bfdbfe",
          headerTitleStyle: { fontWeight: "700" },
        }}
      />

      {/* TODO: replace DEMO_HLS with the camera's real stream URL once the backend exists */}
      <VideoStage uri={DEMO_HLS} muted loop controls={false} />

      <View className="p-4">
        <View className="flex-row items-center">
          <View className="flex-row items-center rounded-full bg-red-500/20 px-3 py-1">
            <View className="h-2 w-2 rounded-full bg-red-400" />
            <Text className="ml-1.5 text-xs font-bold text-red-300">LIVE</Text>
          </View>
          <Text className="ml-3 text-sm text-blue-300">{camera?.detail}</Text>
        </View>

        <Text className="mt-4 text-sm text-blue-400">
          Demo feed. The real security camera stream connects once the Element Control
          backend is available.
        </Text>
      </View>
    </View>
  );
}