import { Redirect, Stack, type Href } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import { useTheme } from "../../src/context/ThemeContext";

export default function OwnerLayout() {
  const { session, booting } = useAuth();
  const { colors } = useTheme();

  if (booting) return null;
  if (!session) return <Redirect href="/" />;
  if (session.role !== "OWNER") return <Redirect href={"/(tabs)/files" as Href} />;

  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.ink,
        headerTitleStyle: { fontWeight: "600", fontSize: 16 },
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Owner Console" }} />
      <Stack.Screen name="workspaces" options={{ title: "Users & Workspaces" }} />
      <Stack.Screen name="permissions" options={{ title: "Hearth Policy Matrix" }} />
    </Stack>
  );
}
