import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import VideoStage from "../../src/components/VideoStage";
import { useTheme } from "../../src/context/ThemeContext";
import { useStreamApi } from "../../src/hooks/useStreamApi";

export default function StreamPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { buildStreamSource } = useStreamApi();
  const [reloadNonce, setReloadNonce] = useState(0);
  const [playerError, setPlayerError] = useState<string | null>(null);

  const path = decodeURIComponent(String(id ?? ""));
  const source = buildStreamSource(path);

  return (
    <View style={{ backgroundColor: colors.bg }} className="flex-1">
      <Stack.Screen
        options={{
          headerShown: true,
          title: path.split("/").pop() || "Now playing",
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.ink,
          headerTitleStyle: { fontWeight: "600", fontSize: 16 },
          headerRight: () => (
            <Pressable
              onPress={() => {
                setPlayerError(null);
                setReloadNonce((n) => n + 1);
              }}
              hitSlop={10}
              className="mr-2"
            >
              <Ionicons name="refresh" size={19} color={colors.accent} />
            </Pressable>
          ),
        }}
      />

      <VideoStage
        key={`${source.uri}-${reloadNonce}`}
        source={source}
        onErrorChange={setPlayerError}
      />

      <ScrollView contentContainerClassName="p-5">
        <Text style={{ color: colors.ink }} className="text-lg font-semibold">
          {path}
        </Text>

        <View className="mt-3 flex-row flex-wrap gap-2">
          <View
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.hairlineStrong,
              borderWidth: 1,
            }}
            className="rounded-full px-3 py-1"
          >
            <Text
              style={{ color: colors.accentWarm }}
              className="text-[11px] font-semibold tracking-wider"
            >
              HLS · MPEG-TS
            </Text>
          </View>
          <View
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.hairline,
              borderWidth: 1,
            }}
            className="rounded-full px-3 py-1"
          >
            <Text style={{ color: colors.inkMuted }} className="text-[11px] font-medium">
              Bearer Auth
            </Text>
          </View>
        </View>

        {playerError && (
          <View
            style={{
              backgroundColor: colors.crimsonBg,
              borderColor: colors.crimsonBorder,
              borderWidth: 1,
            }}
            className="mt-4 rounded-2xl p-4"
          >
            <Text style={{ color: colors.crimson }} className="text-xs font-semibold">
              Playback Error
            </Text>
            <Text
              style={{ color: colors.crimson }}
              className="mt-1 text-xs leading-4 opacity-90"
            >
              {playerError}
            </Text>
          </View>
        )}

        <View
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.hairline,
            borderWidth: 1,
          }}
          className="mt-5 rounded-2xl p-4"
        >
          <Text
            style={{ color: colors.inkSubtle }}
            className="text-[10px] font-semibold uppercase tracking-[0.16em]"
          >
            Stream Endpoint
          </Text>
          <Text
            selectable
            style={{ color: colors.inkMuted }}
            className="mt-1.5 font-mono text-[11px]"
          >
            {source.uri}
          </Text>
          <Text style={{ color: colors.inkSubtle }} className="mt-3 text-xs leading-4">
            Master playlist requests /api/v1/stream with contentType=&quot;hls&quot; and
            Authorization header.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
