import { Redirect, Stack, type Href } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";

export default function OwnerLayout() {
  const { session } = useAuth();

  if (!session) return <Redirect href="/" />;
  if (session.role !== "owner") return <Redirect href={"/files" as Href} />;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#1e3a8a" },
        headerTintColor: "#bfdbfe",
        headerTitleStyle: { fontWeight: "700" },
        contentStyle: { backgroundColor: "#172554" },
      }}
    >
      <Stack.Screen name="workspaces" options={{ title: "Resident workspaces" }} />
      <Stack.Screen name="permissions" options={{ title: "Element permissions" }} />
    </Stack>
  );
}