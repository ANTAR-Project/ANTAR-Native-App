import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useElementsApi } from "../../src/hooks/useElementsApi";
import type { ElementReadResponse } from "../../src/types";

export default function ElementDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const elementId = String(id ?? "");
  const { readElement } = useElementsApi();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ElementReadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await readElement(elementId);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load element.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (elementId) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elementId]);

  return (
    <View className="flex-1 bg-blue-950 p-4">
      <Stack.Screen
        options={{
          headerShown: true,
          title: elementId || "Element",
          headerStyle: { backgroundColor: "#172554" },
          headerTintColor: "#bfdbfe",
          headerTitleStyle: { fontWeight: "700" },
        }}
      />

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#bfdbfe" />
        </View>
      ) : error ? (
        <View className="rounded-2xl border border-red-400/50 bg-red-950/50 p-4">
          <Text className="text-sm text-red-200">{error}</Text>
          <Pressable
            onPress={() => void load()}
            className="mt-4 self-start rounded-xl bg-blue-200 px-4 py-2"
          >
            <Text className="text-xs font-bold text-blue-950">Retry</Text>
          </Pressable>
        </View>
      ) : (
        <View className="rounded-2xl border border-blue-800 bg-blue-900/60 p-4">
          <Text className="text-base font-bold text-blue-100">{data?.elementId}</Text>
          <Text className="mt-1 text-xs text-blue-300">
            Type: {data?.type} · Qualifier: {data?.qualifier}
          </Text>
          <Text className="mt-1 text-xs text-blue-300">
            Requested by: {data?.requestedBy}
          </Text>
        </View>
      )}
    </View>
  );
}
