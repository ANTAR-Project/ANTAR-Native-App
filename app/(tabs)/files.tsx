import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
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
import { ApiError } from "../../src/api/client";
import ToastBanner from "../../src/components/ToastBanner";
import { useAuth } from "../../src/context/AuthContext";
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
  const { session } = useAuth();
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
        if (err instanceof ApiError && err.status === 404 && scope === "own" && pathSegments.length === 0) {
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
      show(`Workspace "${session.username}" created.`, "success");
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
    <View className="flex-1 bg-blue-950">
      {/* Scope Switcher: Own Workspace vs Shared Space */}
      <View className="flex-row items-center gap-2 border-b border-blue-900 px-4 py-2.5">
        <Pressable
          onPress={() => switchScope("own")}
          className={`flex-1 flex-row items-center justify-center rounded-xl py-2 ${
            scope === "own" ? "bg-blue-200" : "bg-blue-900"
          }`}
        >
          <Ionicons
            name="person-circle-outline"
            size={16}
            color={scope === "own" ? "#172554" : "#93c5fd"}
          />
          <Text
            className={`ml-1.5 text-xs font-bold ${
              scope === "own" ? "text-blue-950" : "text-blue-200"
            }`}
          >
            My Workspace
          </Text>
        </Pressable>

        <Pressable
          onPress={() => switchScope("shared")}
          className={`flex-1 flex-row items-center justify-center rounded-xl py-2 ${
            scope === "shared" ? "bg-blue-200" : "bg-blue-900"
          }`}
        >
          <Ionicons
            name="people-outline"
            size={16}
            color={scope === "shared" ? "#172554" : "#93c5fd"}
          />
          <Text
            className={`ml-1.5 text-xs font-bold ${
              scope === "shared" ? "text-blue-950" : "text-blue-200"
            }`}
          >
            Shared Space
          </Text>
        </Pressable>
      </View>

      {/* Breadcrumb + Toolbar */}
      <View className="flex-row items-center border-b border-blue-900 px-4">
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
              size={15}
              color="#bfdbfe"
            />
            <Text className="ml-1 text-xs font-semibold text-blue-200">
              {scope === "shared" ? "shared" : session?.username ?? "home"}
            </Text>
          </Pressable>

          {pathSegments.map((seg, i) => (
            <Pressable
              key={`${seg}-${i}`}
              onPress={() => setPathSegments(pathSegments.slice(0, i + 1))}
              className="flex-row items-center py-3"
            >
              <Ionicons name="chevron-forward" size={14} color="#6b8bd6" />
              <Text className="text-xs font-semibold text-blue-200">{seg}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View className="ml-2 flex-row items-center gap-2">
          {scope === "shared" && caps.canClearSharedNas && (
            <Pressable
              onPress={confirmClearShared}
              hitSlop={8}
              className="rounded-lg border border-red-400/50 px-2.5 py-1.5"
            >
              <Text className="text-[11px] font-semibold text-red-300">Clear</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => setMkdirModalOpen(true)}
            hitSlop={8}
            className="flex-row items-center rounded-lg bg-blue-900 px-2.5 py-1.5"
          >
            <Ionicons name="folder-open-outline" size={14} color="#bfdbfe" />
            <Text className="ml-1 text-[11px] font-semibold text-blue-200">+ Folder</Text>
          </Pressable>
        </View>
      </View>

      {scope === "shared" && (
        <View className="border-b border-blue-900/60 bg-blue-900/40 px-4 py-2">
          <Text className="text-[11px] text-blue-300">
            Policy: Shared space allows LIST/READ for all roles; writes/deletes require
            SELF ownership ({session?.role === "OWNER" ? "Owner can clear all" : "read-only by default"}).
          </Text>
        </View>
      )}

      <ToastBanner toast={toast} onDismiss={hide} />

      {busyAction && (
        <View className="mx-4 mt-3 flex-row items-center rounded-xl bg-blue-900 px-4 py-2.5">
          <ActivityIndicator size="small" color="#bfdbfe" />
          <Text className="ml-2.5 text-xs font-medium text-blue-100">
            {busyAction}
            {uploadPct !== null ? ` (${uploadPct}%)` : ""}
          </Text>
        </View>
      )}

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#bfdbfe" />
          <Text className="mt-3 text-sm text-blue-300">Loading directory...</Text>
        </View>
      ) : workspaceMissing ? (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="server-outline" size={52} color="#60a5fa" />
          <Text className="mt-4 text-center text-lg font-bold text-blue-100">
            Workspace Not Provisioned
          </Text>
          <Text className="mt-2 text-center text-sm text-blue-300">
            No NAS workspace directory exists yet for &quot;{session?.username}&quot;.
          </Text>
          <Pressable
            onPress={handleProvisionOwnWorkspace}
            className="mt-6 rounded-2xl bg-blue-200 px-6 py-3.5"
          >
            <Text className="font-bold text-blue-950">Create My Workspace</Text>
          </Pressable>
        </View>
      ) : errorMsg ? (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="alert-circle-outline" size={48} color="#f87171" />
          <Text className="mt-3 text-center text-sm text-red-200">{errorMsg}</Text>
          <Pressable
            onPress={() => void loadDirectory(false)}
            className="mt-5 rounded-xl bg-blue-800 px-5 py-2.5"
          >
            <Text className="font-semibold text-blue-100">Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(e) => e.name}
          contentContainerClassName="p-4 pb-28"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadDirectory(true)}
              tintColor="#bfdbfe"
            />
          }
          ItemSeparatorComponent={() => <View className="h-2.5" />}
          ListEmptyComponent={
            <View className="items-center pt-20">
              <Ionicons name="folder-open-outline" size={48} color="#3b5bb5" />
              <Text className="mt-3 text-base text-blue-400">This folder is empty</Text>
            </View>
          }
          renderItem={({ item }) => {
            const cleanName = item.name.replace(/\/+$/, "");
            return (
              <Pressable
                onPress={() => openEntry(item)}
                className="flex-row items-center rounded-2xl border border-blue-800/80 bg-blue-900/70 px-4 py-3"
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
                  size={26}
                  color={item.isDirectory ? "#fbbf24" : "#bfdbfe"}
                />
                <View className="ml-3 flex-1">
                  <Text className="text-base font-semibold text-blue-100" numberOfLines={1}>
                    {cleanName}
                  </Text>
                  <Text className="mt-0.5 text-xs text-blue-300">
                    {item.isDirectory ? "Folder" : formatSize(item.size)} ·{" "}
                    {formatDate(item.lastModified)}
                  </Text>
                </View>

                {!item.isDirectory && (
                  <Pressable
                    hitSlop={10}
                    className="mr-3"
                    onPress={() => void handleDownload(item)}
                  >
                    <Ionicons name="download-outline" size={21} color="#bfdbfe" />
                  </Pressable>
                )}
                <Pressable hitSlop={10} onPress={() => confirmDelete(item)}>
                  <Ionicons name="trash-outline" size={21} color="#f87171" />
                </Pressable>
              </Pressable>
            );
          }}
        />
      )}

      {/* Upload FAB */}
      {!workspaceMissing && (
        <Pressable
          onPress={() => void handleUpload()}
          className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-blue-200 shadow-lg"
        >
          <Ionicons name="cloud-upload-outline" size={26} color="#172554" />
        </Pressable>
      )}

      {/* New Folder Modal */}
      <Modal
        visible={mkdirModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMkdirModalOpen(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/70 px-6">
          <View className="w-full max-w-md rounded-3xl border border-blue-700 bg-blue-900 p-6">
            <Text className="text-lg font-bold text-blue-100">Create Folder</Text>
            <Text className="mt-1 text-xs text-blue-300">
              Inside {scope === "shared" ? "shared" : session?.username}
              {currentRelPath ? `/${currentRelPath}` : ""}
            </Text>

            <TextInput
              value={folderName}
              onChangeText={setFolderName}
              placeholder="e.g. documents"
              placeholderTextColor="#6b8bd6"
              autoCapitalize="none"
              autoCorrect={false}
              className="mt-4 rounded-xl bg-blue-950 px-4 py-3 text-base text-blue-100"
            />

            <View className="mt-5 flex-row gap-3">
              <Pressable
                onPress={() => setMkdirModalOpen(false)}
                className="flex-1 items-center rounded-xl border border-blue-700 py-3"
              >
                <Text className="font-semibold text-blue-200">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => void handleCreateFolder()}
                className="flex-1 items-center rounded-xl bg-blue-200 py-3"
              >
                <Text className="font-bold text-blue-950">Create</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
