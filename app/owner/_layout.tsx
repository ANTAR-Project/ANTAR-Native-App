import { Redirect, Stack, type Href } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";

export default function OwnerLayout() {
  const { session, booting } = useAuth();

  if (booting) return null;
  if (!session) return <Redirect href="/" />;
  if (session.role !== "OWNER") return <Redirect href={"/(tabs)/files" as Href} />;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#172554" },
        headerTintColor: "#bfdbfe",
        headerTitleStyle: { fontWeight: "700" },
        contentStyle: { backgroundColor: "#172554" },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Owner Console" }} />
      <Stack.Screen name="workspaces" options={{ title: "Users & Workspaces" }} />
      <Stack.Screen name="permissions" options={{ title: "Hearth Policy Matrix" }} />
    </Stack>
  );
}
