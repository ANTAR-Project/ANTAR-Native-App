import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ToastBanner from "../../src/components/ToastBanner";
import { useOwnerApi } from "../../src/hooks/useOwnerApi";
import { useToast } from "../../src/hooks/useToast";
import { SEEDED_POLICY_MATRIX } from "../../src/policies";
import type { UserResponse } from "../../src/types";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const ITEMS: { title: string; desc: string; icon: IconName; href: string }[] = [
  {
    title: "Users & Workspaces",
    desc: "Create Resident/Guest accounts and provision their NAS workspace directories.",
    icon: "people-outline",
    href: "/owner/workspaces",
  },
  {
    title: "Hearth Policy Matrix",
    desc: "Inspect the 69 active policy rules across OWNER, RESIDENT, GUEST, and SERVICE.",
    icon: "key-outline",
    href: "/owner/permissions",
  },
];

export default function Panel() {
  const router = useRouter();
  const { listUsers, clearShared } = useOwnerApi();
  const { toast, show, hide } = useToast();

  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);

  const loadUsers = useCallback(
    async (isPull = false) => {
      if (isPull) setRefreshing(true);
      else setLoading(true);
      try {
        const data = await listUsers();
        setUsers(data);
      } catch (err) {
        show(err instanceof Error ? err.message : "Failed to load users.", "error");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [listUsers, show]
  );

  useEffect(() => {
    void loadUsers(false);
  }, [loadUsers]);

  const residentsCount = users.filter((u) => u.role === "RESIDENT").length;
  const guestsCount = users.filter((u) => u.role === "GUEST").length;

  const confirmClearShared = () => {
    Alert.alert(
      "Clear Shared Workspace?",
      "Permanently delete all files and folders inside /shared? Only OWNER is permitted.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear Shared",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            try {
              await clearShared();
              show("Shared workspace cleared.", "success");
            } catch (err) {
              show(err instanceof Error ? err.message : "Clear failed.", "error");
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      className="flex-1 bg-blue-950"
      contentContainerClassName="p-4 pb-12"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void loadUsers(true)}
          tintColor="#bfdbfe"
        />
      }
    >
      <ToastBanner toast={toast} onDismiss={hide} />

      {/* Live Stats */}
      <View className="mt-1 flex-row gap-2.5">
        <View className="flex-1 rounded-2xl border border-blue-800 bg-blue-900/70 p-4">
          {loading ? (
            <ActivityIndicator size="small" color="#bfdbfe" />
          ) : (
            <Text className="text-2xl font-bold text-blue-100">{residentsCount}</Text>
          )}
          <Text className="mt-0.5 text-xs text-blue-300">Residents</Text>
        </View>
        <View className="flex-1 rounded-2xl border border-blue-800 bg-blue-900/70 p-4">
          {loading ? (
            <ActivityIndicator size="small" color="#bfdbfe" />
          ) : (
            <Text className="text-2xl font-bold text-blue-100">{guestsCount}</Text>
          )}
          <Text className="mt-0.5 text-xs text-blue-300">Guests</Text>
        </View>
        <View className="flex-1 rounded-2xl border border-blue-800 bg-blue-900/70 p-4">
          <Text className="text-2xl font-bold text-blue-100">
            {SEEDED_POLICY_MATRIX.length}
          </Text>
          <Text className="mt-0.5 text-xs text-blue-300">Policy Rules</Text>
        </View>
      </View>

      {/* Navigation Cards */}
      <View className="mt-6 gap-3">
        {ITEMS.map((item) => (
          <Pressable
            key={item.href}
            onPress={() => router.push(item.href as Href)}
            className="flex-row items-center rounded-2xl border-2 border-blue-800 bg-blue-900/50 p-5"
          >
            <View className="h-12 w-12 items-center justify-center rounded-xl bg-blue-950">
              <Ionicons name={item.icon} size={26} color="#bfdbfe" />
            </View>
            <View className="ml-4 flex-1">
              <Text className="text-base font-semibold text-blue-100">{item.title}</Text>
              <Text className="mt-1 text-xs leading-4 text-blue-300">{item.desc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6b8bd6" />
          </Pressable>
        ))}
      </View>

      {/* Owner-only Shared Workspace Action */}
      <Text className="mb-2 mt-8 text-xs font-semibold uppercase tracking-widest text-blue-400">
        Owner Shared Space Controls
      </Text>
      <Pressable
        disabled={busy}
        onPress={confirmClearShared}
        className="flex-row items-center rounded-2xl border border-red-400/50 bg-red-950/30 p-4"
      >
        {busy ? (
          <ActivityIndicator size="small" color="#fca5a5" />
        ) : (
          <Ionicons name="trash-outline" size={22} color="#fca5a5" />
        )}
        <View className="ml-3 flex-1">
          <Text className="text-sm font-semibold text-red-200">
            Clear Shared Workspace
          </Text>
          <Text className="mt-0.5 text-xs text-blue-300">
            DELETE /api/v1/nas/shared/clear (unconditional ALLOW for OWNER)
          </Text>
        </View>
      </Pressable>
    </ScrollView>
  );
}
