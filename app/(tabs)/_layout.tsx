import { Pressable } from "react-native";
import { Redirect, Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../src/context/AuthContext";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: "files", title: "Files", icon: "folder-open-outline" },
  { name: "workspace", title: "Workspace", icon: "server-outline" },
  { name: "streamyard", title: "Streamyard", icon: "play-circle-outline" },
  { name: "elements", title: "Elements", icon: "options-outline" },
  { name: "panel", title: "Owner", icon: "shield-checkmark-outline" },
];

export default function TabsLayout() {
  const { session, logout } = useAuth();

  if (!session) return <Redirect href="/" />;

  const isOwner = session.role === "owner";

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#1e3a8a" },
        headerTintColor: "#bfdbfe",
        headerTitleStyle: { fontWeight: "700" },
        tabBarStyle: { backgroundColor: "#1e3a8a", borderTopColor: "#1d4ed8" },
        tabBarActiveTintColor: "#bfdbfe",
        tabBarInactiveTintColor: "#6b8bd6",
        headerRight: () => (
          <Pressable onPress={logout} hitSlop={12} className="mr-4">
            <Ionicons name="log-out-outline" size={24} color="#bfdbfe" />
          </Pressable>
        ),
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            // Hide the Owner tab for residents
            href: t.name === "panel" && !isOwner ? null : undefined,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name={t.icon} size={size} color={color as any} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}