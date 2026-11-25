import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
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
import ToastBanner from "../../src/components/ToastBanner";
import { useNotifications } from "../../src/hooks/useNotifications";
import { useStreamApi } from "../../src/hooks/useStreamApi";
import { useToast } from "../../src/hooks/useToast";
import { isValidRelativePath } from "../../src/policies";
import type { PlaylistDto } from "../../src/types";

export default function Streamyard() {
  const router = useRouter();
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
    <View className="flex-1 bg-blue-950">
      {/* Live status header */}
      <View className="flex-row items-center justify-between border-b border-blue-900 px-4 py-2.5">
        <Text className="text-xs font-medium text-blue-300">
          Video library · {playlists.length} {playlists.length === 1 ? "video" : "videos"}
        </Text>
        <View className="flex-row items-center rounded-full bg-blue-900 px-2.5 py-1">
          <View
            className={`h-2 w-2 rounded-full ${
              connected ? "bg-emerald-400" : "bg-amber-400"
            }`}
          />
          <Text className="ml-1.5 text-[11px] font-semibold text-blue-200">
            {connected ? "WS Live" : "WS Reconnecting"}
          </Text>
        </View>
      </View>

      <ToastBanner toast={toast} onDismiss={hide} />

      {uploadingPct !== null && (
        <View className="mx-4 mt-3 flex-row items-center rounded-xl bg-blue-900 px-4 py-2.5">
          <ActivityIndicator size="small" color="#bfdbfe" />
          <Text className="ml-2.5 text-xs font-medium text-blue-100">
            Uploading video to NAS & Kafka pipeline ({uploadingPct}%)...
          </Text>
        </View>
      )}

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#bfdbfe" />
          <Text className="mt-3 text-sm text-blue-300">Loading Streamyard library...</Text>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="alert-circle-outline" size={48} color="#f87171" />
          <Text className="mt-3 text-center text-sm text-red-200">{error}</Text>
          <Pressable
            onPress={() => void loadPlaylists(false)}
            className="mt-5 rounded-xl bg-blue-800 px-5 py-2.5"
          >
            <Text className="font-semibold text-blue-100">Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={playlists}
          keyExtractor={(p) => p.path}
          numColumns={2}
          contentContainerClassName="p-2.5 pb-28"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadPlaylists(true)}
              tintColor="#bfdbfe"
            />
          }
          ListEmptyComponent={
            <View className="items-center px-6 pt-20">
              <Ionicons name="film-outline" size={50} color="#3b5bb5" />
              <Text className="mt-3 text-center text-base font-semibold text-blue-200">
                No encoded videos yet
              </Text>
              <Text className="mt-1 text-center text-xs text-blue-400">
                Upload a video using the button below. Once encoded, it will appear here
                automatically via WebSocket notification.
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
                  className="overflow-hidden rounded-2xl border border-blue-800 bg-blue-900/70"
                >
                  <View className="h-28 items-center justify-center bg-blue-800">
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
                      <Ionicons name="play-circle" size={44} color="#bfdbfe" />
                    )}
                  </View>
                  <View className="p-3">
                    <Text className="text-sm font-semibold text-blue-100" numberOfLines={1}>
                      {title}
                    </Text>
                    <Text className="mt-0.5 text-[11px] text-blue-400" numberOfLines={1}>
                      {item.path}
                    </Text>
                    <View className="mt-2 flex-row items-center">
                      <View className="h-2 w-2 rounded-full bg-emerald-400" />
                      <Text className="ml-1.5 text-[11px] text-blue-300">HLS Ready</Text>
                    </View>
                  </View>
                </Pressable>
              </View>
            );
          }}
        />
      )}

      {/* Upload Video FAB */}
      <Pressable
        onPress={() => setUploadModalOpen(true)}
        className="absolute bottom-6 right-6 flex-row items-center rounded-full bg-blue-200 px-4 py-3.5 shadow-lg"
      >
        <Ionicons name="videocam-outline" size={22} color="#172554" />
        <Text className="ml-2 text-sm font-bold text-blue-950">Upload Video</Text>
      </Pressable>

      {/* Video Upload Folder Modal */}
      <Modal
        visible={uploadModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setUploadModalOpen(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/70 px-6">
          <View className="w-full max-w-md rounded-3xl border border-blue-700 bg-blue-900 p-6">
            <Text className="text-lg font-bold text-blue-100">Upload Video for HLS</Text>
            <Text className="mt-1 text-xs text-blue-300">
              Uploads via /api/v1/videos/upload into your workspace, then transcodes
              automatically via Kafka.
            </Text>

            <Text className="mb-1.5 mt-4 text-xs font-semibold uppercase tracking-wider text-blue-400">
              Target Folder (optional)
            </Text>
            <TextInput
              value={targetDir}
              onChangeText={setTargetDir}
              placeholder="e.g. movies (or leave empty for root)"
              placeholderTextColor="#6b8bd6"
              autoCapitalize="none"
              autoCorrect={false}
              className="rounded-xl bg-blue-950 px-4 py-3 text-sm text-blue-100"
            />

            <View className="mt-5 flex-row gap-3">
              <Pressable
                onPress={() => setUploadModalOpen(false)}
                className="flex-1 items-center rounded-xl border border-blue-700 py-3"
              >
                <Text className="font-semibold text-blue-200">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => void handlePickAndUploadVideo()}
                className="flex-1 items-center rounded-xl bg-blue-200 py-3"
              >
                <Text className="font-bold text-blue-950">Pick Video</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
