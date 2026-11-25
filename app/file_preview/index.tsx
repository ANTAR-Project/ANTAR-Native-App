import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import ToastBanner from "../../src/components/ToastBanner";
import { type NasScope, useNasApi } from "../../src/hooks/useNasApi";
import { useToast } from "../../src/hooks/useToast";
import { isImageFile, isTextFile } from "../../src/utils";

export default function FilePreviewScreen() {
  const params = useLocalSearchParams<{ path?: string; scope?: string }>();
  const filePath = String(params.path ?? "");
  const scope: NasScope = params.scope === "shared" ? "shared" : "own";
  const fileName = filePath.split("/").pop() || "Preview";

  const { fetchPreviewText, buildPreviewUrl, downloadFileToCache } = useNasApi();
  const { toast, show, hide } = useToast();

  const [loading, setLoading] = useState(true);
  const [textBody, setTextBody] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const isImg = isImageFile(fileName);
  const isTxt = isTextFile(fileName);
  const imageUrl = isImg ? buildPreviewUrl(filePath, scope) : null;

  useEffect(() => {
    let active = true;
    (async () => {
      if (!filePath) {
        setError("Missing file path.");
        setLoading(false);
        return;
      }

      if (isImg) {
        setLoading(false);
        return;
      }

      if (isTxt) {
        setLoading(true);
        setError(null);
        try {
          const text = await fetchPreviewText(filePath, scope);
          if (active) setTextBody(text);
        } catch (err) {
          if (active) {
            setError(err instanceof Error ? err.message : "Could not load preview.");
          }
        } finally {
          if (active) setLoading(false);
        }
        return;
      }

      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [fetchPreviewText, filePath, isImg, isTxt, scope]);

  const handleDownloadAndOpen = async (openPreview: boolean) => {
    setDownloading(true);
    try {
      const localFile = await downloadFileToCache(filePath, fileName, scope);
      if (openPreview) {
        const can = await localFile.canPreview().catch(() => false);
        if (can) {
          await localFile.preview({ title: fileName });
        } else {
          show(`Downloaded "${fileName}" to cache.`, "success");
        }
      } else {
        show(`Downloaded "${fileName}" to cache.`, "success");
      }
    } catch (err) {
      show(err instanceof Error ? err.message : "Download failed.", "error");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <View className="flex-1 bg-blue-950">
      <Stack.Screen
        options={{
          headerShown: true,
          title: fileName,
          headerStyle: { backgroundColor: "#172554" },
          headerTintColor: "#bfdbfe",
          headerTitleStyle: { fontWeight: "700" },
          headerRight: () => (
            <Pressable
              onPress={() => void handleDownloadAndOpen(false)}
              disabled={downloading}
              hitSlop={10}
              className="mr-2"
            >
              {downloading ? (
                <ActivityIndicator size="small" color="#bfdbfe" />
              ) : (
                <Ionicons name="download-outline" size={22} color="#bfdbfe" />
              )}
            </Pressable>
          ),
        }}
      />

      <ToastBanner toast={toast} onDismiss={hide} />

      <View className="border-b border-blue-900 px-4 py-2">
        <Text className="text-xs text-blue-300" numberOfLines={1}>
          {scope === "shared" ? "shared" : "own"} / {filePath}
        </Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#bfdbfe" />
          <Text className="mt-3 text-sm text-blue-300">Loading preview...</Text>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="alert-circle-outline" size={48} color="#f87171" />
          <Text className="mt-3 text-center text-sm text-red-200">{error}</Text>
        </View>
      ) : isImg && imageUrl ? (
        <View className="flex-1 items-center justify-center p-4">
          <Image
            source={{ uri: imageUrl }}
            style={{ width: "100%", height: "100%" }}
            contentFit="contain"
          />
        </View>
      ) : isTxt ? (
        <ScrollView className="flex-1" contentContainerClassName="p-4">
          <View className="rounded-2xl border border-blue-800 bg-blue-900/60 p-4">
            <Text selectable className="font-mono text-xs leading-5 text-blue-100">
              {textBody ?? ""}
            </Text>
          </View>
        </ScrollView>
      ) : (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="document-text-outline" size={56} color="#93c5fd" />
          <Text className="mt-4 text-center text-base font-semibold text-blue-100">
            {fileName}
          </Text>
          <Text className="mt-1 text-center text-xs text-blue-300">
            Open with your device&apos;s native document viewer (PDF / vector preview).
          </Text>
          <Pressable
            onPress={() => void handleDownloadAndOpen(true)}
            disabled={downloading}
            className="mt-6 rounded-2xl bg-blue-200 px-6 py-3.5"
          >
            <Text className="font-bold text-blue-950">
              {downloading ? "Downloading..." : "Open Native Preview"}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
