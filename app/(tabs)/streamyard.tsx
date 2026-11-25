import {  FlatList, Pressable, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { MOCK_PLAYLISTS } from "../../src/data/mock";

export default function Streamyard() {
  const router = useRouter();
  return (
    <View className="flex-1 bg-blue-950">
      <FlatList
        data={MOCK_PLAYLISTS}
        keyExtractor={(p) => p.path}
        numColumns={2}
        contentContainerClassName="p-2.5"
        ListHeaderComponent={
          <Text className="px-2 pb-2 pt-1 text-sm text-blue-400">
            Video library · {MOCK_PLAYLISTS.length} videos
          </Text>
        }
        renderItem={({ item }) => (
          <View className="w-1/2 p-1.5">
            <Pressable
              onPress={() =>
              router.push(`/stream/${encodeURIComponent(item.path)}` as Href)}
              className="overflow-hidden rounded-2xl bg-blue-800"
            >
              {/* Thumbnail placeholder (thumbnailUrl can be null) */}
              <View className="h-28 items-center justify-center bg-blue-700">
                <Ionicons name="play-circle" size={44} color="#bfdbfe" />
              </View>
              <View className="p-3">
                <Text className="text-sm font-semibold text-blue-100" numberOfLines={1}>
                  {item.path}
                </Text>
                <View className="mt-2 flex-row items-center">
                  <View className="h-2 w-2 rounded-full bg-green-400" />
                  <Text className="ml-1.5 text-xs text-blue-300">Ready to stream</Text>
                </View>
              </View>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}