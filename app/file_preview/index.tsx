import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import ToastBanner from "../../src/components/ToastBanner";
import { useTheme } from "../../src/context/ThemeContext";
import { type NasScope, useNasApi } from "../../src/hooks/useNasApi";
import { useToast } from "../../src/hooks/useToast";
import { isImageFile, isTextFile } from "../../src/utils";

export default function FilePreviewScreen() {
  const params = useLocalSearchParams<{ path?: string; scope?: string }>();
  const filePath = String(params.path ?? "");
  const scope: NasScope = params.scope === "shared" ? "shared" : "own";
  const fileName = filePath.split("/").pop() || "Preview";

  const { colors } = useTheme();
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
    <View style={{ backgroundColor: colors.bg }} className="flex-1">
      <Stack.Screen
        options={{
          headerShown: true,
          title: fileName,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.ink,
          headerTitleStyle: { fontWeight: "600", fontSize: 16 },
          headerRight: () => (
            <Pressable
              onPress={() => void handleDownloadAndOpen(false)}
              disabled={downloading}
              hitSlop={10}
              className="mr-2"
            >
              {downloading ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <Ionicons name="download-outline" size={20} color={colors.accent} />
              )}
            </Pressable>
          ),
        }}
      />

      <ToastBanner toast={toast} onDismiss={hide} />

      <View
        style={{ borderBottomColor: colors.hairline, borderBottomWidth: 1 }}
        className="px-4 py-2.5"
      >
        <Text
          style={{ color: colors.inkSubtle }}
          className="font-mono text-[11px]"
          numberOfLines={1}
        >
          {scope === "shared" ? "shared" : "own"} / {filePath}
        </Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="small" color={colors.accent} />
          <Text
            style={{ color: colors.inkSubtle }}
            className="mt-3 text-xs uppercase tracking-wider"
          >
            Loading preview
          </Text>
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="alert-circle-outline" size={38} color={colors.crimson} />
          <Text
            style={{ color: colors.crimson }}
            className="mt-3 text-center text-xs leading-5"
          >
            {error}
          </Text>
        </View>
      ) : isImg && imageUrl ? (
        <View className="flex-1 items-center justify-center bg-black p-4">
          <Image
            source={{ uri: imageUrl }}
            style={{ width: "100%", height: "100%" }}
            contentFit="contain"
          />
        </View>
      ) : isTxt ? (
        <ScrollView className="flex-1" contentContainerClassName="p-4">
          <View
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.hairline,
              borderWidth: 1,
            }}
            className="rounded-2xl p-4"
          >
            <Text selectable style={{ color: colors.ink }} className="font-mono text-xs leading-5">
              {textBody ?? ""}
            </Text>
          </View>
        </ScrollView>
      ) : (
        <View className="flex-1 items-center justify-center px-8">
          <View
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.hairlineStrong,
              borderWidth: 1,
            }}
            className="h-14 w-14 items-center justify-center rounded-2xl"
          >
            <Ionicons name="document-text-outline" size={26} color={colors.accentWarm} />
          </View>
          <Text
            style={{ color: colors.ink }}
            className="mt-4 text-center text-base font-semibold"
          >
            {fileName}
          </Text>
          <Text
            style={{ color: colors.inkMuted }}
            className="mt-1.5 text-center text-xs leading-5"
          >
            Open with your device&apos;s native document viewer for PDF or vector rendering.
          </Text>
          <Pressable
            onPress={() => void handleDownloadAndOpen(true)}
            disabled={downloading}
            style={{ backgroundColor: colors.accent }}
            className="mt-6 rounded-2xl px-6 py-3.5"
          >
            <Text
              style={{ color: colors.accentInk }}
              className="text-xs font-bold tracking-wide"
            >
              {downloading ? "Downloading..." : "Open Native Preview"}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
