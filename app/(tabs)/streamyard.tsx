import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter, type Href } from "expo-router";
import { File } from "expo-file-system";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import KeyboardModal from "../../src/components/KeyboardModal";
import ToastBanner from "../../src/components/ToastBanner";
import { useTheme } from "../../src/context/ThemeContext";
import { useNotifications } from "../../src/hooks/useNotifications";
import { useStreamApi } from "../../src/hooks/useStreamApi";
import { useToast } from "../../src/hooks/useToast";
import { isValidRelativePath } from "../../src/policies";
import type { PlaylistDto } from "../../src/types";

export default function Streamyard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { listPlaylists, uploadVideo, buildThumbnailUrl } = useStreamApi();
  const { toast, show, hide } = useToast(4500);

  const [playlists, setPlaylists] = useState<PlaylistDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [targetDir, setTargetDir] = useState("movies");
  const [uploadingPct, setUploadingPct] = useState<number | null>(null);
  const [failedThumbs, setFailedThumbs] = useState<Record<string, boolean>>({});

  const fabBottom = Math.max(insets.bottom, 12) + 88;

  const loadPlaylists = useCallback(
    async (isPull = false) => {
      if (isPull) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const list = await listPlaylists();
        setPlaylists(list);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load playlists.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [listPlaylists]
  );

  useEffect(() => {
    void loadPlaylists(false);
  }, [loadPlaylists]);

  const { connected } = useNotifications((notif) => {
    show(`Playlist ready: ${notif.rawPath}`, "success");
    void loadPlaylists(true);
  });

  const handlePickAndUploadVideo = async () => {
    const cleanDir = targetDir.trim().replace(/^\/+|\/+$/g, "");
    if (cleanDir && !isValidRelativePath(cleanDir)) {
      show('Invalid folder path (cannot contain "..", "\\", or "encoded").', "error");
      return;
    }

    try {
      const picked = await File.pickFileAsync({
        multipleFiles: false,
        mimeTypes: ["video/*"],
      });
      if (picked.canceled || !picked.result) return;

      setUploadModalOpen(false);
      setUploadingPct(0);
      await uploadVideo(picked.result, cleanDir, (pct) => setUploadingPct(pct));
      show(
        `Uploaded "${picked.result.name}". Encoding started — you'll be notified when ready.`,
        "success"
      );
    } catch (err) {
      show(err instanceof Error ? err.message : "Video upload failed.", "error");
    } finally {
      setUploadingPct(null);
    }
  };

  return (
    <View style={{ backgroundColor: colors.bg }} className="flex-1">
      {/* Live Status Bar */}
      <View
        style={{ borderBottomColor: colors.hairline, borderBottomWidth: 1 }}
        className="flex-row items-center justify-between px-4 py-3"
      >
        <Text style={{ color: colors.inkMuted }} className="text-xs font-medium tracking-wide">
          Library ·{" "}
          <Text style={{ color: colors.ink }} className="font-semibold">
            {playlists.length} {playlists.length === 1 ? "title" : "titles"}
          </Text>
        </Text>
        <View
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.hairline,
            borderWidth: 1,
          }}
          className="flex-row items-center rounded-full px-3 py-1"
        >
          <View
            style={{ backgroundColor: connected ? colors.emerald : colors.amber }}
            className="h-1.5 w-1.5 rounded-full"
          />
          <Text
            style={{ color: colors.inkMuted }}
            className="ml-1.5 text-[10px] font-semibold uppercase tracking-wider"
          >
            {connected ? "WS Live" : "Reconnecting"}
          </Text>
        </View>
      </View>

      <ToastBanner toast={toast} onDismiss={hide} />

      {uploadingPct !== null && (
        <View
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.hairlineStrong,
            borderWidth: 1,
          }}
          className="mx-4 mt-3 flex-row items-center rounded-xl px-4 py-2.5"
        >
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={{ color: colors.ink }} className="ml-2.5 text-xs font-medium">
            Uploading video to NAS pipeline ({uploadingPct}%)...
          </Text>
        </View>
      )}

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="small" color={colors.accent} />
          <Text
            style={{ color: colors.inkSubtle }}
            className="mt-3 text-xs uppercase tracking-wider"
          >
            Loading library
          </Text>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8 pb-24">
          <Ionicons name="alert-circle-outline" size={38} color={colors.crimson} />
          <Text
            style={{ color: colors.crimson }}
            className="mt-3 text-center text-xs leading-5"
          >
            {error}
          </Text>
          <Pressable
            onPress={() => void loadPlaylists(false)}
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.hairlineStrong,
              borderWidth: 1,
            }}
            className="mt-5 rounded-xl px-5 py-2.5"
          >
            <Text style={{ color: colors.ink }} className="text-xs font-semibold">
              Retry
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={playlists}
          keyExtractor={(p) => p.path}
          numColumns={2}
          contentContainerStyle={{ padding: 12, paddingBottom: fabBottom + 76 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadPlaylists(true)}
              tintColor={colors.accent}
            />
          }
          ListEmptyComponent={
            <View className="items-center px-8 pt-24">
              <View
                style={{
                  backgroundColor: colors.surface,
                  borderColor: colors.hairlineStrong,
                  borderWidth: 1,
                }}
                className="h-14 w-14 items-center justify-center rounded-2xl"
              >
                <Ionicons name="film-outline" size={26} color={colors.accentWarm} />
              </View>
              <Text
                style={{ color: colors.ink }}
                className="mt-4 text-center text-base font-semibold"
              >
                No encoded videos yet
              </Text>
              <Text
                style={{ color: colors.inkMuted }}
                className="mt-1.5 text-center text-xs leading-5"
              >
                Upload a video below. Once encoded via Kafka, it appears here automatically.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const thumbUri = !failedThumbs[item.path]
              ? buildThumbnailUrl(item.thumbnailUrl)
              : null;
            const title = item.path.split("/").pop() || item.path;

            return (
              <View className="w-1/2 p-1.5">
                <Pressable
                  onPress={() =>
                    router.push(`/stream/${encodeURIComponent(item.path)}` as Href)
                  }
                  style={{
                    backgroundColor: colors.surface,
                    borderColor: colors.hairline,
                    borderWidth: 1,
                  }}
                  className="overflow-hidden rounded-2xl"
                >
                  <View
                    style={{ backgroundColor: colors.recessed }}
                    className="relative h-28 items-center justify-center"
                  >
                    {thumbUri ? (
                      <Image
                        source={{ uri: thumbUri }}
                        style={{ width: "100%", height: "100%" }}
                        contentFit="cover"
                        onError={() =>
                          setFailedThumbs((prev) => ({ ...prev, [item.path]: true }))
                        }
                      />
                    ) : (
                      <Ionicons
                        name="play-circle-outline"
                        size={34}
                        color={colors.inkSubtle}
                      />
                    )}
                    <View className="absolute bottom-2 right-2 rounded-full bg-black/75 px-2 py-0.5">
                      <Text className="text-[9px] font-bold tracking-wider text-champagne">
                        HLS
                      </Text>
                    </View>
                  </View>
                  <View className="p-3">
                    <Text
                      style={{ color: colors.ink }}
                      className="text-xs font-semibold"
                      numberOfLines={1}
                    >
                      {title}
                    </Text>
                    <Text
                      style={{ color: colors.inkSubtle }}
                      className="mt-0.5 font-mono text-[10px]"
                      numberOfLines={1}
                    >
                      {item.path}
                    </Text>
                  </View>
                </Pressable>
              </View>
            );
          }}
        />
      )}

      {/* Upload Video FAB (lifted above floating glass bar) */}
      <Pressable
        onPress={() => setUploadModalOpen(true)}
        style={{
          bottom: fabBottom,
          backgroundColor: colors.accent,
        }}
        className="absolute right-5 flex-row items-center rounded-full px-5 py-3.5 shadow-lg"
      >
        <Ionicons name="videocam-outline" size={18} color={colors.accentInk} />
        <Text
          style={{ color: colors.accentInk }}
          className="ml-2 text-xs font-bold tracking-wide"
        >
          Upload Video
        </Text>
      </Pressable>

      {/* Video Upload Folder Modal */}
      <KeyboardModal
        visible={uploadModalOpen}
        variant="center"
        onRequestClose={() => setUploadModalOpen(false)}
      >
        <Text style={{ color: colors.ink }} className="text-base font-semibold">
          Upload Video for HLS
        </Text>
        <Text style={{ color: colors.inkMuted }} className="mt-1.5 text-xs leading-4">
          Uploads via /api/v1/videos/upload into your workspace, then transcodes
          automatically via Kafka.
        </Text>

        <Text
          style={{ color: colors.inkSubtle }}
          className="mb-1.5 mt-4 text-[11px] font-semibold uppercase tracking-[0.14em]"
        >
          Target Folder (optional)
        </Text>
        <TextInput
          value={targetDir}
          onChangeText={setTargetDir}
          placeholder="e.g. movies (or leave empty for root)"
          placeholderTextColor={colors.inkSubtle}
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            backgroundColor: colors.recessed,
            borderColor: colors.hairlineStrong,
            borderWidth: 1,
            color: colors.ink,
          }}
          className="rounded-xl px-4 py-3 text-sm"
        />

        <View className="mt-5 flex-row gap-3">
          <Pressable
            onPress={() => setUploadModalOpen(false)}
            style={{ borderColor: colors.hairlineStrong, borderWidth: 1 }}
            className="flex-1 items-center rounded-xl py-3"
          >
            <Text style={{ color: colors.inkMuted }} className="text-xs font-semibold">
              Cancel
            </Text>
          </Pressable>
          <Pressable
            onPress={() => void handlePickAndUploadVideo()}
            style={{ backgroundColor: colors.accent }}
            className="flex-1 items-center rounded-xl py-3"
          >
            <Text style={{ color: colors.accentInk }} className="text-xs font-bold">
              Pick Video
            </Text>
          </Pressable>
        </View>
      </KeyboardModal>
    </View>
  );
}
