import { useState } from "react";
import { Alert, FlatList, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MOCK_TREE } from "../../src/data/mock";
import type { FileEntry } from "../../src/types";
import { formatDate, formatSize } from "../../src/utils";

type Tree = Record<string, FileEntry[]>;

export default function Files() {
  const [tree, setTree] = useState<Tree>(MOCK_TREE);
  const [path, setPath] = useState<string[]>([]);

  const key = path.join("/");
  const entries = tree[key] ?? [];

  const removeEntry = (entry: FileEntry) => {
    const childKey = key ? `${key}/${entry.name}` : entry.name;
    setTree((prev) => {
      const next: Tree = {};
      for (const [k, v] of Object.entries(prev)) {
        if (k === childKey || k.startsWith(`${childKey}/`)) continue;
        next[k] = k === key ? v.filter((e) => e.name !== entry.name) : v;
      }
      return next;
    });
  };

  const confirmDelete = (entry: FileEntry) =>
    Alert.alert(
      `Delete ${entry.isDirectory ? "folder" : "file"}?`,
      `"${entry.name}" will be removed.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => removeEntry(entry) },
      ]
    );

  const openEntry = (entry: FileEntry) => {
    if (entry.isDirectory) return setPath([...path, entry.name]);
    // TODO: navigate to file-preview/[id] with the real /files/preview URL
    Alert.alert("Preview", `Preview for "${entry.name}" comes with the backend.`);
  };

  return (
    <View className="flex-1 bg-blue-950">
      {/* Breadcrumb */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="max-h-14 border-b border-blue-800"
        contentContainerClassName="items-center px-4"
      >
        <Pressable onPress={() => setPath([])} className="flex-row items-center py-3">
          <Ionicons name="home-outline" size={16} color="#bfdbfe" />
          <Text className="ml-1 text-sm font-semibold text-blue-200">Home</Text>
        </Pressable>
        {path.map((p, i) => (
          <Pressable
            key={`${p}-${i}`}
            onPress={() => setPath(path.slice(0, i + 1))}
            className="flex-row items-center py-3"
          >
            <Ionicons name="chevron-forward" size={14} color="#6b8bd6" />
            <Text className="text-sm font-semibold text-blue-200">{p}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <FlatList
        data={entries}
        keyExtractor={(e) => e.name}
        contentContainerClassName="p-4 pb-28"
        ItemSeparatorComponent={() => <View className="h-2.5" />}
        ListEmptyComponent={
          <View className="items-center pt-24">
            <Ionicons name="folder-open-outline" size={48} color="#3b5bb5" />
            <Text className="mt-3 text-base text-blue-400">This folder is empty</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => openEntry(item)}
            className="flex-row items-center rounded-2xl bg-blue-800 px-4 py-3"
          >
            <Ionicons
              name={item.isDirectory ? "folder" : "document-text-outline"}
              size={28}
              color={item.isDirectory ? "#fbbf24" : "#bfdbfe"}
            />
            <View className="ml-3 flex-1">
              <Text className="text-base font-semibold text-blue-100" numberOfLines={1}>
                {item.name}
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
                onPress={() =>
                  // TODO: real download via /files/download
                  Alert.alert("Download", `Downloading "${item.name}" (mock).`)
                }
              >
                <Ionicons name="download-outline" size={22} color="#bfdbfe" />
              </Pressable>
            )}
            <Pressable hitSlop={10} onPress={() => confirmDelete(item)}>
              <Ionicons name="trash-outline" size={22} color="#f87171" />
            </Pressable>
          </Pressable>
        )}
      />

      {/* Upload button */}
      <Pressable
        onPress={() =>
          // TODO: expo-document-picker + upload to /files/upload/file
          Alert.alert("Upload", "The file picker comes with the backend step.")
        }
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-blue-200"
      >
        <Ionicons name="cloud-upload-outline" size={26} color="#1e3a8a" />
      </Pressable>
    </View>
  );
}