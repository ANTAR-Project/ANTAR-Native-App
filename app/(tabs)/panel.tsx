import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { MOCK_ELEMENTS, MOCK_RESIDENTS } from "../../src/data/mock";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const ITEMS: { title: string; desc: string; icon: IconName; href: string }[] = [
  {
    title: "Resident workspaces",
    desc: "Create or revoke a workspace for each resident.",
    icon: "people-outline",
    href: "/owner/workspaces",
  },
  {
    title: "Element permissions",
    desc: "Grant or revoke each resident's access to elements.",
    icon: "key-outline",
    href: "/owner/permissions",
  },
];

export default function Panel() {
  const router = useRouter();

  return (
    <ScrollView className="flex-1 bg-blue-950" contentContainerClassName="p-4 pb-10">
      <View className="flex-row gap-3">
        <View className="flex-1 rounded-2xl bg-blue-800 p-4">
          <Text className="text-2xl font-bold text-blue-100">{MOCK_RESIDENTS.length}</Text>
          <Text className="text-xs text-blue-300">residents</Text>
        </View>
        <View className="flex-1 rounded-2xl bg-blue-800 p-4">
          <Text className="text-2xl font-bold text-blue-100">{MOCK_ELEMENTS.length}</Text>
          <Text className="text-xs text-blue-300">elements</Text>
        </View>
      </View>

      <View className="mt-6 gap-3">
        {ITEMS.map((item) => (
          <Pressable
            key={item.href}
            onPress={() => router.push(item.href as Href)}
            className="flex-row items-center rounded-2xl border-2 border-blue-700 p-5"
          >
            <Ionicons name={item.icon} size={30} color="#bfdbfe" />
            <View className="ml-4 flex-1">
              <Text className="text-lg font-semibold text-blue-100">{item.title}</Text>
              <Text className="mt-1 text-sm text-blue-300">{item.desc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6b8bd6" />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}