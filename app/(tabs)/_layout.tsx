import { Alert, Pressable, Text, View } from "react-native";
import { Redirect, Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../src/context/AuthContext";
import { roleBadgeLabel } from "../../src/utils";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: "files", title: "Files", icon: "folder-open-outline" },
  { name: "workspace", title: "Workspace", icon: "server-outline" },
  { name: "streamyard", title: "Streamyard", icon: "play-circle-outline" },
  { name: "elements", title: "Elements", icon: "options-outline" },
  { name: "panel", title: "Owner", icon: "shield-checkmark-outline" },
];

export default function TabsLayout() {
  const { session, booting, logout } = useAuth();

  if (booting) return null;
  if (!session) return <Redirect href="/" />;

  const isOwner = session.role === "OWNER";

  const confirmLogout = () => {
    Alert.alert(
      "Sign out?",
      `Revoke session for ${session.username} (${roleBadgeLabel(session.role)})?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Sign out", style: "destructive", onPress: () => void logout() },
      ]
    );
  };

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#172554" },
        headerTintColor: "#bfdbfe",
        headerTitleStyle: { fontWeight: "700" },
        tabBarStyle: { backgroundColor: "#172554", borderTopColor: "#1e3a8a" },
        tabBarActiveTintColor: "#bfdbfe",
        tabBarInactiveTintColor: "#6b8bd6",
        headerRight: () => (
          <View className="mr-4 flex-row items-center gap-3">
            <View className="rounded-full border border-blue-700 bg-blue-900 px-2.5 py-1">
              <Text className="text-[11px] font-semibold text-blue-200">
                {session.username} · {session.role}
              </Text>
            </View>
            <Pressable onPress={confirmLogout} hitSlop={12}>
              <Ionicons name="log-out-outline" size={22} color="#bfdbfe" />
            </Pressable>
          </View>
        ),
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            // Only OWNER sees the Owner tab (enforced by AuthController + policy-registry)
            href: t.name === "panel" && !isOwner ? null : undefined,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name={t.icon} size={size} color={color as string} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
