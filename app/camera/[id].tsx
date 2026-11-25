import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useTheme } from "../../src/context/ThemeContext";
import { useElementsApi } from "../../src/hooks/useElementsApi";
import type { ElementReadResponse } from "../../src/types";

export default function ElementDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const elementId = String(id ?? "");
  const { colors } = useTheme();
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
    <View style={{ backgroundColor: colors.bg }} className="flex-1 p-4">
      <Stack.Screen
        options={{
          headerShown: true,
          title: elementId || "Element",
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.ink,
          headerTitleStyle: { fontWeight: "600", fontSize: 16 },
        }}
      />

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      ) : error ? (
        <View
          style={{
            backgroundColor: colors.crimsonBg,
            borderColor: colors.crimsonBorder,
            borderWidth: 1,
          }}
          className="rounded-2xl p-4"
        >
          <Text style={{ color: colors.crimson }} className="text-xs leading-5">
            {error}
          </Text>
          <Pressable
            onPress={() => void load()}
            style={{ backgroundColor: colors.accent }}
            className="mt-4 self-start rounded-xl px-4 py-2"
          >
            <Text style={{ color: colors.accentInk }} className="text-xs font-bold">
              Retry
            </Text>
          </Pressable>
        </View>
      ) : (
        <View
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.hairline,
            borderWidth: 1,
          }}
          className="rounded-2xl p-4"
        >
          <Text style={{ color: colors.ink }} className="font-mono text-base font-semibold">
            {data?.elementId}
          </Text>
          <Text style={{ color: colors.inkMuted }} className="mt-1 text-xs">
            Type: {data?.type} · Qualifier: {data?.qualifier}
          </Text>
          <Text style={{ color: colors.inkSubtle }} className="mt-1 text-xs">
            Requested by: {data?.requestedBy}
          </Text>
        </View>
      )}
    </View>
  );
}
