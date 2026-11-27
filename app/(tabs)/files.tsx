import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter, type Href } from "expo-router";
import { File } from "expo-file-system";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError } from "../../src/api/client";
import KeyboardModal from "../../src/components/KeyboardModal";
import ToastBanner from "../../src/components/ToastBanner";
import { useAuth } from "../../src/context/AuthContext";
import { useTheme } from "../../src/context/ThemeContext";
import { type NasScope, useNasApi } from "../../src/hooks/useNasApi";
import { useToast } from "../../src/hooks/useToast";
import { getRoleCapabilities, isValidRelativePath } from "../../src/policies";
import type { FileEntry } from "../../src/types";
import { formatDate, formatSize, isPreviewable, isVideoFile } from "../../src/utils";

function sortEntries(entries: FileEntry[]): FileEntry[] {
  return [...entries].sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export default function Files() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { colors } = useTheme();
  const {
    listFiles,
    createFolder,
    deleteEntry,
    clearSharedWorkspace,
    uploadPickedFile,
    downloadFileToCache,
    createWorkspace,
  } = useNasApi();
  const { toast, show, hide } = useToast();

  const [scope, setScope] = useState<NasScope>("own");
  const [pathSegments, setPathSegments] = useState<string[]>([]);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [workspaceMissing, setWorkspaceMissing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [mkdirModalOpen, setMkdirModalOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [uploadPct, setUploadPct] = useState<number | null>(null);

  const caps = getRoleCapabilities(session?.role ?? "GUEST");
  const currentRelPath = pathSegments.join("/");
  const fabBottom = Math.max(insets.bottom, 12) + 88;

  const loadDirectory = useCallback(
    async (isPull = false) => {
      if (isPull) setRefreshing(true);
      else setLoading(true);
      setErrorMsg(null);
      setWorkspaceMissing(false);

      try {
        const res = await listFiles(currentRelPath, scope);
        setEntries(sortEntries(res.entry ?? []));
      } catch (err) {
        if (
          err instanceof ApiError &&
          err.status === 404 &&
          scope === "own" &&
          pathSegments.length === 0
        ) {
          setWorkspaceMissing(true);
          setEntries([]);
        } else {
          const msg = err instanceof Error ? err.message : "Failed to list files.";
          setErrorMsg(msg);
          setEntries([]);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [currentRelPath, listFiles, pathSegments.length, scope]
  );

  useEffect(() => {
    void loadDirectory(false);
  }, [loadDirectory]);

  const switchScope = (next: NasScope) => {
    if (next === scope) return;
    setPathSegments([]);
    setScope(next);
  };

  const handleProvisionOwnWorkspace = async () => {
    if (!session?.username) return;
    setBusyAction("Creating workspace...");
    try {
      await createWorkspace(session.username);
      show(`Workspace "${session.username}" provisioned.`, "success");
      await loadDirectory(false);
    } catch (err) {
      show(err instanceof Error ? err.message : "Could not create workspace.", "error");
    } finally {
      setBusyAction(null);
    }
  };

  const handleCreateFolder = async () => {
    const clean = folderName.trim().replace(/^\/+|\/+$/g, "");
    if (!clean) return;
    const target = currentRelPath ? `${currentRelPath}/${clean}` : clean;
    if (!isValidRelativePath(target)) {
      show('Invalid folder name (cannot contain "..", "\\", or "encoded").', "error");
      return;
    }

    setBusyAction("Creating folder...");
    try {
      await createFolder(target, scope);
      setMkdirModalOpen(false);
      setFolderName("");
      show(`Created "${clean}".`, "success");
      await loadDirectory(false);
    } catch (err) {
      show(err instanceof Error ? err.message : "Could not create folder.", "error");
    } finally {
      setBusyAction(null);
    }
  };

  const handleUpload = async () => {
    try {
      const picked = await File.pickFileAsync({ multipleFiles: false });
      if (picked.canceled || !picked.result) return;

      setUploadPct(0);
      setBusyAction(`Uploading ${picked.result.name}...`);
      const res = await uploadPickedFile(currentRelPath, picked.result, scope, (pct) =>
        setUploadPct(pct)
      );
      show(`Uploaded ${res.path} (${formatSize(res.size)})`, "success");
      await loadDirectory(false);
    } catch (err) {
      show(err instanceof Error ? err.message : "Upload failed.", "error");
    } finally {
      setUploadPct(null);
      setBusyAction(null);
    }
  };

  const handleDownload = async (entry: FileEntry) => {
    const target = currentRelPath ? `${currentRelPath}/${entry.name}` : entry.name;
    setBusyAction(`Downloading ${entry.name}...`);
    try {
      const localFile = await downloadFileToCache(target, entry.name, scope);
      const canNativePreview = await localFile.canPreview().catch(() => false);
      if (canNativePreview) {
        await localFile.preview({ title: entry.name });
      } else {
        show(`Saved "${entry.name}" to app cache.`, "success");
      }
    } catch (err) {
      show(err instanceof Error ? err.message : "Download failed.", "error");
    } finally {
      setBusyAction(null);
    }
  };

  const confirmDelete = (entry: FileEntry) => {
    const cleanName = entry.name.replace(/\/+$/, "");
    const target = currentRelPath ? `${currentRelPath}/${cleanName}` : cleanName;
    Alert.alert(
      `Delete ${entry.isDirectory ? "folder" : "file"}?`,
      `"${cleanName}" will be permanently removed from ${
        scope === "shared" ? "Shared Space" : "your workspace"
      }.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setBusyAction(`Deleting ${cleanName}...`);
            try {
              await deleteEntry(target, scope);
              show(`Deleted "${cleanName}".`, "success");
              await loadDirectory(false);
            } catch (err) {
              show(err instanceof Error ? err.message : "Delete failed.", "error");
            } finally {
              setBusyAction(null);
            }
          },
        },
      ]
    );
  };

  const confirmClearShared = () => {
    Alert.alert(
      "Clear Shared Space?",
      "All files and folders in /shared will be deleted. Only OWNER can perform this action.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear Shared",
          style: "destructive",
          onPress: async () => {
            setBusyAction("Clearing shared workspace...");
            try {
              await clearSharedWorkspace();
              show("Shared workspace cleared.", "success");
              setPathSegments([]);
              await loadDirectory(false);
            } catch (err) {
              show(err instanceof Error ? err.message : "Clear failed.", "error");
            } finally {
              setBusyAction(null);
            }
          },
        },
      ]
    );
  };

  const openEntry = (entry: FileEntry) => {
    const cleanName = entry.name.replace(/\/+$/, "");
    if (entry.isDirectory) {
      if (cleanName === "encoded") {
        show("The 'encoded' folder is reserved for internal HLS streaming.", "error");
        return;
      }
      setPathSegments((prev) => [...prev, cleanName]);
      return;
    }

    const relPath = currentRelPath ? `${currentRelPath}/${cleanName}` : cleanName;
    if (isPreviewable(cleanName)) {
      router.push({
        pathname: "/file_preview",
        params: { path: relPath, scope },
      } as Href);
      return;
    }

    if (isVideoFile(cleanName) && scope === "own") {
      Alert.alert(cleanName, "Choose an action for this video file.", [
        { text: "Cancel", style: "cancel" },
        { text: "Download", onPress: () => void handleDownload(entry) },
        {
          text: "Open Streamyard",
          onPress: () => router.push("/(tabs)/streamyard" as Href),
        },
      ]);
      return;
    }

    void handleDownload(entry);
  };

  return (
    <View style={{ backgroundColor: colors.bg }} className="flex-1">
      {/* Scope Switcher */}
      <View
        style={{ borderBottomColor: colors.hairline, borderBottomWidth: 1 }}
        className="px-4 py-3"
      >
        <View
          style={{
            backgroundColor: colors.recessed,
            borderColor: colors.hairline,
            borderWidth: 1,
          }}
          className="flex-row rounded-xl p-1"
        >
          <Pressable
            onPress={() => switchScope("own")}
            style={{
              backgroundColor: scope === "own" ? colors.elevated : "transparent",
            }}
            className="flex-1 flex-row items-center justify-center rounded-lg py-2"
          >
            <Ionicons
              name="person-outline"
              size={14}
              color={scope === "own" ? colors.accent : colors.inkSubtle}
            />
            <Text
              style={{ color: scope === "own" ? colors.ink : colors.inkSubtle }}
              className="ml-1.5 text-xs font-semibold"
            >
              My Workspace
            </Text>
          </Pressable>

          <Pressable
            onPress={() => switchScope("shared")}
            style={{
              backgroundColor: scope === "shared" ? colors.elevated : "transparent",
            }}
            className="flex-1 flex-row items-center justify-center rounded-lg py-2"
          >
            <Ionicons
              name="people-outline"
              size={14}
              color={scope === "shared" ? colors.accent : colors.inkSubtle}
            />
            <Text
              style={{ color: scope === "shared" ? colors.ink : colors.inkSubtle }}
              className="ml-1.5 text-xs font-semibold"
            >
              Shared Space
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Breadcrumb + Toolbar */}
      <View
        style={{ borderBottomColor: colors.hairline, borderBottomWidth: 1 }}
        className="flex-row items-center px-4"
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="max-h-12 flex-1"
          contentContainerClassName="items-center"
        >
          <Pressable
            onPress={() => setPathSegments([])}
            className="flex-row items-center py-3"
          >
            <Ionicons
              name={scope === "shared" ? "globe-outline" : "home-outline"}
              size={14}
              color={colors.accentWarm}
            />
            <Text style={{ color: colors.ink }} className="ml-1.5 text-xs font-semibold">
              {scope === "shared" ? "shared" : session?.username ?? "home"}
            </Text>
          </Pressable>

          {pathSegments.map((seg, i) => (
            <Pressable
              key={`${seg}-${i}`}
              onPress={() => setPathSegments(pathSegments.slice(0, i + 1))}
              className="flex-row items-center py-3"
            >
              <Ionicons name="chevron-forward" size={13} color={colors.inkSubtle} />
              <Text style={{ color: colors.inkMuted }} className="text-xs font-medium">
                {seg}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View className="ml-2 flex-row items-center gap-2">
          {scope === "shared" && caps.canClearSharedNas && (
            <Pressable
              onPress={confirmClearShared}
              hitSlop={8}
              style={{
                backgroundColor: colors.crimsonBg,
                borderColor: colors.crimsonBorder,
                borderWidth: 1,
              }}
              className="rounded-lg px-2.5 py-1.5"
            >
              <Text style={{ color: colors.crimson }} className="text-[11px] font-semibold">
                Clear
              </Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => setMkdirModalOpen(true)}
            hitSlop={8}
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.hairlineStrong,
              borderWidth: 1,
            }}
            className="flex-row items-center rounded-lg px-2.5 py-1.5"
          >
            <Ionicons name="add" size={14} color={colors.accentWarm} />
            <Text style={{ color: colors.ink }} className="ml-1 text-[11px] font-semibold">
              Folder
            </Text>
          </Pressable>
        </View>
      </View>

      {scope === "shared" && (
        <View
          style={{
            backgroundColor: colors.surface,
            borderBottomColor: colors.hairline,
            borderBottomWidth: 1,
          }}
          className="px-4 py-2"
        >
          <Text style={{ color: colors.inkMuted }} className="text-[11px]">
            Shared policy: LIST & READ enabled · Writes require SELF ownership
            {session?.role === "OWNER" ? " · Owner may clear all" : ""}.
          </Text>
        </View>
      )}

      <ToastBanner toast={toast} onDismiss={hide} />

      {busyAction && (
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
            {busyAction}
            {uploadPct !== null ? ` (${uploadPct}%)` : ""}
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
            Loading directory
          </Text>
        </View>
      ) : workspaceMissing ? (
        <View className="flex-1 items-center justify-center px-8 pb-24">
          <View
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.hairlineStrong,
              borderWidth: 1,
            }}
            className="h-14 w-14 items-center justify-center rounded-2xl"
          >
            <Ionicons name="server-outline" size={26} color={colors.accentWarm} />
          </View>
          <Text
            style={{ color: colors.ink }}
            className="mt-4 text-center text-base font-semibold"
          >
            Workspace Not Provisioned
          </Text>
          <Text
            style={{ color: colors.inkMuted }}
            className="mt-1.5 text-center text-xs leading-5"
          >
            No NAS directory exists yet for &quot;{session?.username}&quot;.
          </Text>
          <Pressable
            onPress={handleProvisionOwnWorkspace}
            style={{ backgroundColor: colors.accent }}
            className="mt-6 rounded-2xl px-6 py-3.5"
          >
            <Text
              style={{ color: colors.accentInk }}
              className="text-xs font-bold tracking-wide"
            >
              Provision My Workspace
            </Text>
          </Pressable>
        </View>
      ) : errorMsg ? (
        <View className="flex-1 items-center justify-center px-8 pb-24">
          <Ionicons name="alert-circle-outline" size={38} color={colors.crimson} />
          <Text
            style={{ color: colors.crimson }}
            className="mt-3 text-center text-xs leading-5"
          >
            {errorMsg}
          </Text>
          <Pressable
            onPress={() => void loadDirectory(false)}
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
          data={entries}
          keyExtractor={(e) => e.name}
          contentContainerStyle={{ padding: 16, paddingBottom: fabBottom + 76 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadDirectory(true)}
              tintColor={colors.accent}
            />
          }
          ItemSeparatorComponent={() => <View className="h-2" />}
          ListEmptyComponent={
            <View className="items-center pt-24">
              <Ionicons name="folder-open-outline" size={40} color={colors.inkSubtle} />
              <Text
                style={{ color: colors.inkSubtle }}
                className="mt-3 text-xs tracking-wide"
              >
                This folder is empty
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const cleanName = item.name.replace(/\/+$/, "");
            return (
              <Pressable
                onPress={() => openEntry(item)}
                style={{
                  backgroundColor: colors.surface,
                  borderColor: colors.hairline,
                  borderWidth: 1,
                }}
                className="flex-row items-center rounded-2xl px-4 py-3.5"
              >
                <View
                  style={{
                    backgroundColor: colors.recessed,
                    borderColor: colors.hairline,
                    borderWidth: 1,
                  }}
                  className="h-10 w-10 items-center justify-center rounded-xl"
                >
                  <Ionicons
                    name={
                      item.isDirectory
                        ? "folder"
                        : isVideoFile(cleanName)
                        ? "film-outline"
                        : isPreviewable(cleanName)
                        ? "document-text-outline"
                        : "document-outline"
                    }
                    size={19}
                    color={item.isDirectory ? colors.accentWarm : colors.inkMuted}
                  />
                </View>

                <View className="ml-3.5 flex-1">
                  <Text
                    style={{ color: colors.ink }}
                    className="text-sm font-semibold"
                    numberOfLines={1}
                  >
                    {cleanName}
                  </Text>
                  <Text
                    style={{ color: colors.inkSubtle }}
                    className="mt-0.5 text-[11px]"
                  >
                    {item.isDirectory ? "Folder" : formatSize(item.size)} ·{" "}
                    {formatDate(item.lastModified)}
                  </Text>
                </View>

                {!item.isDirectory && (
                  <Pressable
                    hitSlop={10}
                    className="mr-3.5 p-1"
                    onPress={() => void handleDownload(item)}
                  >
                    <Ionicons name="download-outline" size={18} color={colors.inkMuted} />
                  </Pressable>
                )}
                <Pressable hitSlop={10} className="p-1" onPress={() => confirmDelete(item)}>
                  <Ionicons name="trash-outline" size={18} color={colors.crimson} />
                </Pressable>
              </Pressable>
            );
          }}
        />
      )}

      {/* Upload FAB (lifted above floating glass bar) */}
      {!workspaceMissing && (
        <Pressable
          onPress={() => void handleUpload()}
          style={{
            bottom: fabBottom,
            backgroundColor: colors.accent,
          }}
          className="absolute right-5 h-14 w-14 items-center justify-center rounded-full shadow-lg"
        >
          <Ionicons name="cloud-upload-outline" size={23} color={colors.accentInk} />
        </Pressable>
      )}

      {/* New Folder Modal */}
      <KeyboardModal
        visible={mkdirModalOpen}
        variant="center"
        onRequestClose={() => setMkdirModalOpen(false)}
      >
        <Text style={{ color: colors.ink }} className="text-base font-semibold">
          New Folder
        </Text>
        <Text style={{ color: colors.inkMuted }} className="mt-1 text-xs">
          Inside {scope === "shared" ? "shared" : session?.username}
          {currentRelPath ? `/${currentRelPath}` : ""}
        </Text>

        <TextInput
          value={folderName}
          onChangeText={setFolderName}
          placeholder="e.g. documents"
          placeholderTextColor={colors.inkSubtle}
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            backgroundColor: colors.recessed,
            borderColor: colors.hairlineStrong,
            borderWidth: 1,
            color: colors.ink,
          }}
          className="mt-4 rounded-xl px-4 py-3 text-sm"
        />

        <View className="mt-5 flex-row gap-3">
          <Pressable
            onPress={() => setMkdirModalOpen(false)}
            style={{ borderColor: colors.hairlineStrong, borderWidth: 1 }}
            className="flex-1 items-center rounded-xl py-3"
          >
            <Text style={{ color: colors.inkMuted }} className="text-xs font-semibold">
              Cancel
            </Text>
          </Pressable>
          <Pressable
            onPress={() => void handleCreateFolder()}
            style={{ backgroundColor: colors.accent }}
            className="flex-1 items-center rounded-xl py-3"
          >
            <Text style={{ color: colors.accentInk }} className="text-xs font-bold">
              Create
            </Text>
          </Pressable>
        </View>
      </KeyboardModal>
    </View>
  );
}
