import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { VideoTrack } from "expo-video";
import VideoStage from "../../src/components/VideoStage";
import { useTheme } from "../../src/context/ThemeContext";
import { useStreamApi } from "../../src/hooks/useStreamApi";
import type { StreamQualityOption } from "../../src/types";

function formatBitrateShort(bps?: number): string | null {
  if (!bps || bps <= 0) return null;
  if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(1)} Mbps`;
  return `${Math.round(bps / 1_000)} kbps`;
}

export default function StreamPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { buildStreamSource, fetchStreamQualities } = useStreamApi();
  const [reloadNonce, setReloadNonce] = useState(0);
  const [playerError, setPlayerError] = useState<string | null>(null);

  const [qualities, setQualities] = useState<StreamQualityOption[]>([]);
  const [qualitiesLoading, setQualitiesLoading] = useState(true);
  const [qualitiesError, setQualitiesError] = useState<string | null>(null);
  const [selectedQualityId, setSelectedQualityId] = useState<string>("auto");
  const [activeTrack, setActiveTrack] = useState<VideoTrack | null>(null);

  const path = decodeURIComponent(String(id ?? ""));

  const loadQualities = useCallback(async () => {
    if (!path) return;
    setQualitiesLoading(true);
    setQualitiesError(null);
    try {
      const parsed = await fetchStreamQualities(path);
      setQualities(parsed);
    } catch (err) {
      setQualitiesError(
        err instanceof Error ? err.message : "Could not load playlist qualities."
      );
    } finally {
      setQualitiesLoading(false);
    }
  }, [fetchStreamQualities, path]);

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    fetchStreamQualities(path)
      .then((parsed) => {
        if (!cancelled) {
          setQualities(parsed);
          setQualitiesError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setQualitiesError(
            err instanceof Error ? err.message : "Could not load playlist qualities."
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setQualitiesLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [fetchStreamQualities, path]);

  const selectedQuality = useMemo(
    () => qualities.find((q) => q.id === selectedQualityId) ?? null,
    [qualities, selectedQualityId]
  );

  const source = useMemo(
    () => buildStreamSource(path, selectedQuality?.uri),
    [buildStreamSource, path, selectedQuality?.uri]
  );

  const activeTrackLabel = useMemo(() => {
    if (selectedQuality) return selectedQuality.label;
    if (activeTrack?.size?.height) return `Auto · ${activeTrack.size.height}p`;
    return "Auto";
  }, [activeTrack?.size?.height, selectedQuality]);

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
                void loadQualities();
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
        key={`${path}-${reloadNonce}`}
        source={source}
        onErrorChange={setPlayerError}
        onVideoTrackChange={setActiveTrack}
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
              {activeTrackLabel}
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
          <View className="flex-row items-center justify-between">
            <Text
              style={{ color: colors.inkSubtle }}
              className="text-[10px] font-semibold uppercase tracking-[0.16em]"
            >
              Stream Quality
            </Text>
            {qualitiesLoading && <ActivityIndicator size="small" color={colors.accent} />}
          </View>

          {qualitiesError ? (
            <View className="mt-3 flex-row items-center justify-between">
              <Text style={{ color: colors.inkMuted }} className="flex-1 text-xs">
                {qualitiesError}
              </Text>
              <Pressable
                onPress={() => void loadQualities()}
                style={{
                  borderColor: colors.hairlineStrong,
                  borderWidth: 1,
                }}
                className="ml-3 rounded-lg px-3 py-1.5"
              >
                <Text style={{ color: colors.ink }} className="text-xs font-semibold">
                  Retry
                </Text>
              </Pressable>
            </View>
          ) : (
            <View className="mt-3 flex-row flex-wrap gap-2">
              <Pressable
                onPress={() => {
                  setPlayerError(null);
                  setSelectedQualityId("auto");
                }}
                style={{
                  backgroundColor:
                    selectedQualityId === "auto" ? colors.accent : colors.recessed,
                  borderColor:
                    selectedQualityId === "auto" ? colors.accent : colors.hairlineStrong,
                  borderWidth: 1,
                }}
                className="rounded-xl px-3.5 py-2"
              >
                <Text
                  style={{
                    color: selectedQualityId === "auto" ? colors.accentInk : colors.ink,
                  }}
                  className="text-xs font-semibold"
                >
                  Auto
                </Text>
              </Pressable>

              {qualities.map((q) => {
                const active = selectedQualityId === q.id;
                const bitrateLabel = formatBitrateShort(q.bandwidth);
                return (
                  <Pressable
                    key={q.id}
                    onPress={() => {
                      setPlayerError(null);
                      setSelectedQualityId(q.id);
                    }}
                    style={{
                      backgroundColor: active ? colors.accent : colors.recessed,
                      borderColor: active ? colors.accent : colors.hairlineStrong,
                      borderWidth: 1,
                    }}
                    className="rounded-xl px-3.5 py-2"
                  >
                    <Text
                      style={{ color: active ? colors.accentInk : colors.ink }}
                      className="text-xs font-semibold"
                    >
                      {q.label}
                      {bitrateLabel ? ` · ${bitrateLabel}` : ""}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {!qualitiesLoading && !qualitiesError && qualities.length === 0 && (
            <Text style={{ color: colors.inkSubtle }} className="mt-2.5 text-xs">
              Single-quality stream served by playlist.
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
