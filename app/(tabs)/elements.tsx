import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { MOCK_ELEMENTS } from "../../src/data/mock";
import type { ElementKind } from "../../src/types";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const ICONS: Record<ElementKind, IconName> = {
  light: "bulb-outline",
  door: "lock-closed-outline",
  camera: "videocam-outline",
  thermostat: "thermometer-outline",
};

export default function Elements() {
  const router = useRouter();
  const online = MOCK_ELEMENTS.filter((e) => e.online).length;

  return (
    <ScrollView className="flex-1 bg-blue-950" contentContainerClassName="p-4 pb-10">
      {/* Summary */}
      <View className="flex-row items-center justify-between rounded-2xl bg-blue-800 p-4">
        <View>
          <Text className="text-2xl font-bold text-blue-100">
            {online} / {MOCK_ELEMENTS.length}
          </Text>
          <Text className="text-xs text-blue-300">elements online</Text>
        </View>
        <View className="flex-row items-center rounded-full bg-blue-950 px-3 py-1.5">
          <View className="h-2 w-2 rounded-full bg-green-400" />
          <Text className="ml-1.5 text-xs font-semibold text-blue-200">LIVE</Text>
        </View>
      </View>

      <Text className="mb-2 mt-6 text-sm font-semibold uppercase tracking-widest text-blue-400">
        All elements
      </Text>

      <View className="gap-2.5">
        {MOCK_ELEMENTS.map((el) => (
          <View key={el.id} className="rounded-2xl bg-blue-800 p-4">
            <View className="flex-row items-center">
              <Ionicons name={ICONS[el.kind]} size={26} color="#bfdbfe" />
              <View className="ml-3 flex-1">
                <Text className="text-base font-semibold text-blue-100">{el.name}</Text>
                <Text className="mt-0.5 text-xs text-blue-300">{el.detail}</Text>
              </View>
              <View className="flex-row items-center">
                <View
                  className={`h-2.5 w-2.5 rounded-full ${
                    el.online ? "bg-green-400" : "bg-red-400"
                  }`}
                />
                <Text className="ml-1.5 text-xs text-blue-300">
                  {el.online ? "Online" : "Offline"}
                </Text>
              </View>
            </View>

            {el.kind === "camera" && el.online && (
              <Pressable
                onPress={() => router.push(`/camera/${el.id}` as Href)}
                className="mt-3 flex-row items-center justify-center rounded-xl bg-blue-200 py-2.5"
              >
                <Ionicons name="radio-outline" size={18} color="#1e3a8a" />
                <Text className="ml-2 font-bold text-blue-900">View live</Text>
              </Pressable>
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}